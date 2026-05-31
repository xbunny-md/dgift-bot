import axios from 'axios'

const businessMemory = new Map()
const MEMORY_TTL = 15 * 60 * 1000 // 15 min

function getMemory(chatId) {
  if (!businessMemory.has(chatId)) {
    businessMemory.set(chatId, { history: [], timeout: null })
  }
  const mem = businessMemory.get(chatId)
  if (mem.timeout) clearTimeout(mem.timeout)
  mem.timeout = setTimeout(() => {
    businessMemory.delete(chatId)
    console.log(`[ADSBROKER] Memory cleared for ${chatId}`)
  }, MEMORY_TTL)
  return mem
}

async function getBusinessConfig(botSettings) {
  // GLOBAL - no scope check, always on if AI_ON=true
  const aiEnabled = botSettings?.ai_on?? process.env.AI_ON === 'true'?? true

  return {
    on: aiEnabled,
    botname: botSettings?.botname || 'Ads Blog Broker',
    owner_name: botSettings?.owner_name || 'Mosess Help Limited',
    owner_number: botSettings?.owner_number || 'Private',
    brand_name: botSettings?.brand_name || 'Ads Blog Broker'
  }
}

async function callGroq(messages, groqKey) {
  try {
    const res = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: messages,
        temperature: 0.7,
        max_tokens: 500
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`
        },
        timeout: 25000
      }
    )
    return res.data?.choices?.[0]?.message?.content?.trim() || ''
  } catch (e) {
    console.log('[GROQ ERROR]', e.response?.data?.error?.message || e.message)
    return ''
  }
}

export default async function adsbroker(sock, { msg, from, pushName }, botSettings) {
  try {
    // GLOBAL - works DM, Group, Self DM. No fromMe check, no scope check
    if (!msg?.message) return

    const config = await getBusinessConfig(botSettings)
    if (!config.on) return

    const text = (
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      msg.message?.imageMessage?.caption ||
      msg.message?.videoMessage?.caption ||
      msg.message?.documentMessage?.caption || ''
    ).trim()

    if (!text) return
    if (text.startsWith(botSettings?.prefix)) return

    const mem = getMemory(from)

    // SPECIAL PROMPT - ADS BLOG BROKER
    const systemPrompt = `You are Ads Blog Broker, a professional assistant for Ads Blog Broker platform created by ${config.owner_name}.

PLATFORM DETAILS:
1. You earn money by WATCHING videos inside the app. No link sharing required. No referrals needed.
2. The business is registered with the government under Mosess Help Limited Company.
3. Daily video range: 2500 to 3000 videos available per day.
4. Average workload: About 30 videos per day.
5. Example earnings: 2000 TSH per 30 videos watched daily.
6. Registration fee: 14,500 TSH one-time payment to activate account.
7. Cashout: Withdraw money directly through the app to mobile money. Available in ALL counties in the country.
8. The app is active on all social media platforms: TikTok, Facebook, Instagram, etc.

YOUR RULES:
1. CRITICAL: Detect user's language and reply in that EXACT language. Swahili if Swahili, English if English.
2. Keep replies short, direct, 3-4 lines max unless user asks for details.
3. Explain like you understand affiliate marketing but this is different - users only WATCH videos.
4. Never say "As an AI". You are Ads Blog Broker assistant.
5. If asked who created you: "${config.owner_name}"
6. If asked about links: "No link sharing needed. You only watch videos inside the app and earn money."
7. If asked about cashout: "Withdraw directly from the app to your mobile money. Works in all counties."
8. If asked about registration: "One-time fee of 14,500 TSH to activate your account."
9. Be professional, helpful, and sell the opportunity clearly.
10. No disclaimers unless the question is dangerous.

User name: ${pushName || 'User'}`

    const messages = [
      { role: 'system', content: systemPrompt },
     ...mem.history,
      { role: 'user', content: text }
    ]

    let reply = ''
    let usedModel = ''

    // 1. Try OpenRouter first if key exists
    if (process.env.OPENROUTER_API_KEY) {
      try {
        const res = await axios.post(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            model: 'deepseek/deepseek-chat',
            messages: messages,
            temperature: 0.7,
            max_tokens: 500
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
              'HTTP-Referer': 'https://ads-blog-broker',
              'X-Title': `${config.botname} Assistant`
            },
            timeout: 30000
          }
        )
        reply = res.data?.choices?.[0]?.message?.content?.trim() || ''
        usedModel = 'deepseek/deepseek-chat'
        console.log(`[ADSBROKER] OpenRouter OK | ${usedModel}`)
      } catch (err) {
        console.log('[ADSBROKER] OpenRouter failed:', err.response?.data?.error?.message || err.message)
      }
    }

    // 2. Fallback to Groq if OpenRouter fails
    if (!reply && process.env.GROQ_API_KEY) {
      console.log('[ADSBROKER] Falling back to Groq...')
      reply = await callGroq(messages, process.env.GROQ_API_KEY)
      usedModel = 'groq/llama-3.3-70b-versatile'
    }

    if (!reply) {
      console.log('[ADSBROKER] Both OpenRouter and Groq failed')
      await sock.sendMessage(from, {
        text: 'Service temporarily unavailable. Please try again later.'
      }, { quoted: msg }).catch(() => {})
      return
    }

    // Save memory - keep last 12 messages
    mem.history.push({ role: 'user', content: text })
    mem.history.push({ role: 'assistant', content: reply })
    if (mem.history.length > 12) mem.history = mem.history.slice(-12)

    // NO REACT - direct answer only
    await sock.sendMessage(from, { text: reply }, { quoted: msg })
    console.log(`[ADSBROKER] ${from} | Model: ${usedModel} | GLOBAL`)

  } catch (error) {
    console.log('[ADSBROKER ERROR]', error?.response?.data?.error?.message || error.message)
  }
}