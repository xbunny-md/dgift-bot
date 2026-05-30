// observers/business.js
import axios from 'axios'

const businessMemory = new Map() // chatId -> { history: [], timeout: NodeJS.Timeout }
const MEMORY_TTL = 15 * 60 * 1000 // 15 min

function getMemory(chatId) {
  if (!businessMemory.has(chatId)) {
    businessMemory.set(chatId, { history: [], timeout: null })
  }
  const mem = businessMemory.get(chatId)
  if (mem.timeout) clearTimeout(mem.timeout)
  mem.timeout = setTimeout(() => {
    businessMemory.delete(chatId)
    console.log(`[BUSINESS] Memory cleared for ${chatId}`)
  }, MEMORY_TTL)
  return mem
}

async function getBusinessConfig(botSettings) {
  if (!botSettings?.supabase ||!botSettings?.instance_id) return { on: false }
  try {
    const { data } = await botSettings.supabase
    .from('b_settings')
    .select('ai_on, ai_prompt, ai_model, ai_me, chatbot_scope, allowed_groups, allowed_dms, botname, owner_name, owner_number, brand_name')
    .eq('id', botSettings.instance_id)
    .maybeSingle()

    return {
      on: data?.ai_on === true,
      prompt: data?.ai_prompt || 'You are {botname}, assistant by {owner_name}. Reply short, natural, in user language. Never say "As an AI".',
      model: data?.ai_model || 'deepseek/deepseek-chat',
      aiMe: data?.ai_me === true,
      scope: data?.chatbot_scope || 'global',
      allowedGroups: data?.allowed_groups || [],
      allowedDms: data?.allowed_dms || [],
      botname: data?.botname || 'Bot',
      owner_name: data?.owner_name || 'Owner',
      owner_number: data?.owner_number || '',
      brand_name: data?.brand_name || data?.botname || 'Bot'
    }
  } catch (e) {
    console.log('[BUSINESS] DB error:', e.message)
    return { on: false }
  }
}

function buildBusinessPrompt(template, config) {
  let prompt = template
  .replace(/{botname}/g, config.botname)
  .replace(/{owner_name}/g, config.owner_name)
  .replace(/{owner_number}/g, config.owner_number || 'Private')
  .replace(/{brand_name}/g, config.brand_name)

  // Ikiwa ai_me=true, AI inajitambulisha kama wewe
  if (config.aiMe) {
    prompt += `\nYou are ${config.owner_name}. This is your business WhatsApp number: ${config.owner_number}.
Speak as the owner. Be professional, helpful, sell the products. Always reply in user's language.`
  } else {
    prompt += `\nYou are ${config.botname}, assistant for ${config.owner_name}. Reply in user's language.`
  }

  prompt += `\nCRITICAL: Detect user's language and reply in that exact language. Follow the system prompt above strictly.`
  return prompt
}

function checkScope(scope, from, allowedGroups, allowedDms) {
  const isGroup = from.endsWith('@g.us')
  const isDm = from.endsWith('@s.whatsapp.net')
  const userNumber = from.split('@')[0]

  if (scope === 'dm_only' && isGroup) return false
  if (scope === 'group_only' && isDm) return false
  if (scope === 'special_group_only' && (!isGroup ||!allowedGroups.includes(from))) return false
  if (scope === 'special_dm_only' && (!isDm ||!allowedDms.includes(userNumber))) return false
  if (scope === 'special_dms_only' && (!isDm ||!allowedDms.includes(userNumber))) return false
  return true
}

async function downloadMedia(sock, msg) {
  try {
    const messageType = Object.keys(msg.message)[0]
    if (['imageMessage', 'videoMessage', 'stickerMessage', 'documentMessage'].includes(messageType)) {
      return { buffer: await sock.downloadMediaMessage(msg), type: messageType }
    }
    return null
  } catch {
    return null
  }
}

export default async function business(sock, { msg, from, isProtected, isFromMe }, botSettings) {
  try {
    if (isProtected || isFromMe ||!msg?.message) return
    if (!process.env.OPENROUTER_API_KEY) return

    const config = await getBusinessConfig(botSettings)
    if (!config.on) return
    if (!checkScope(config.scope, from, config.allowedGroups, config.allowedDms)) return

    const text = (
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      msg.message?.imageMessage?.caption ||
      msg.message?.videoMessage?.caption ||
      msg.message?.documentMessage?.caption || ''
    ).trim()

    if (!text &&!msg.message?.imageMessage &&!msg.message?.videoMessage &&!msg.message?.documentMessage) return
    if (text.startsWith(botSettings.prefix)) return

    const mem = getMemory(from)
    const mediaData = await downloadMedia(sock, msg)

    // Build prompt kwa instance hii - INAFUATA PROMPT YA DB
    const systemPrompt = buildBusinessPrompt(config.prompt, config)
    const messages = [{ role: 'system', content: systemPrompt },...mem.history]

    // Multimodal - picha, video, document, sticker
    if (mediaData && text) {
      const mimeType = mediaData.type === 'imageMessage'? 'image/jpeg' :
                       mediaData.type === 'videoMessage'? 'video/mp4' :
                       mediaData.type === 'documentMessage'? 'application/pdf' : 'image/webp'
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${mediaData.buffer.toString('base64')}` } }
        ]
      })
    } else if (mediaData) {
      messages.push({ role: 'user', content: [{ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${mediaData.buffer.toString('base64')}` } }] })
    } else {
      messages.push({ role: 'user', content: text })
    }

    // Call OpenRouter - MODEL YOYOTE ITAFANYA KAZI
    const res = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: config.model, // HAPA NDIO MAGIC - Model yoyote ya OpenRouter
        messages: messages,
        temperature: 0.7,
        max_tokens: 500
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://dgift-bot',
          'X-Title': `${config.botname} Business`
        },
        timeout: 30000
      }
    )

    const reply = res.data?.choices?.[0]?.message?.content?.trim() || ''
    if (!reply) return

    // Save memory - 12 messages tu
    mem.history.push({ role: 'user', content: text || `[${mediaData?.type || 'media'}]` })
    mem.history.push({ role: 'assistant', content: reply })
    if (mem.history.length > 12) mem.history = mem.history.slice(-12)

    // Jibu bila react
    await sock.sendMessage(from, { text: reply }, { quoted: msg })
    console.log(`[BUSINESS] ${from} | Model: ${config.model} | ai_me: ${config.aiMe}`)

  } catch (error) {
    console.log('[BUSINESS ERROR]', error?.response?.data?.error?.message || error.message)
  }
}