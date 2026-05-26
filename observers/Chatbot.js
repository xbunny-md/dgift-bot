// observers/chatbot.js
import axios from 'axios'

const chatMemory = new Map() // chatId -> { history: [], timeout: NodeJS.Timeout }

const MEMORY_TTL = 10 * 60 * 1000 // 10 minutes

function getMemory(chatId) {
  if (!chatMemory.has(chatId)) {
    chatMemory.set(chatId, { history: [], timeout: null })
  }
  
  const mem = chatMemory.get(chatId)
  
  // Reset timeout
  if (mem.timeout) clearTimeout(mem.timeout)
  mem.timeout = setTimeout(() => {
    chatMemory.delete(chatId)
    console.log(`[CHATBOT] Memory cleared for ${chatId}`)
  }, MEMORY_TTL)
  
  return mem
}

async function getBotConfig(botSettings) {
  const instanceId = botSettings.instance_id || 'DGIFT_DEFAULT'
  
  if (!botSettings.supabase) {
    return { botname: 'Bot', owner_name: 'Owner', owner_number: '' }
  }

  try {
    const { data } = await botSettings.supabase
      .from('b_settings')
      .select('botname, owner_name, owner_number')
      .eq('id', instanceId)
      .maybeSingle()

    return {
      botname: data?.botname || 'Bot',
      owner_name: data?.owner_name || 'Owner',
      owner_number: data?.owner_number || ''
    }
  } catch (e) {
    console.log('[CHATBOT] Failed to fetch b_settings:', e.message)
    return { botname: 'Bot', owner_name: 'Owner', owner_number: '' }
  }
}

export default async function chatbot(sock, { msg, from }, botSettings) {
  try {
    if (!msg?.message || msg.key.fromMe) return
    if (!process.env.GROQ_API_KEY) return

    const text = (
      msg.message?.conversation || 
      msg.message?.extendedTextMessage?.text || 
      msg.message?.imageMessage?.caption || 
      ''
    ).trim()

    if (!text) return

    // Get bot config from DB
    const { botname, owner_name, owner_number } = await getBotConfig(botSettings)
    
    // Check if message starts with botname
    const lowerText = text.toLowerCase()
    const lowerBotname = botname.toLowerCase()
    
    const triggered = 
      lowerText.startsWith(lowerBotname + ' ') ||
      lowerText.startsWith(lowerBotname + ',') ||
      lowerText === lowerBotname

    if (!triggered) return

    // Extract prompt after botname
    const prompt = text.slice(botname.length).replace(/^[, ]+/, '').trim()
    if (!prompt) {
      await sock.sendMessage(from, { 
        text: `Yes? Talk to me.` 
      }, { quoted: msg })
      return
    }

    // React
    await sock.sendMessage(from, { react: { text: '🧠', key: msg.key } }).catch(() => {})

    // Get memory
    const mem = getMemory(from)
    
    // Build messages with memory
    const messages = [
      {
        role: 'system',
        content: `You are ${botname}, a smart WhatsApp assistant created by ${owner_name}.
Rules:
1. Answer in the user's language. Match exactly.
2. Keep replies short, 2-3 lines max unless user asks for details.
3. Be direct, helpful, and natural.
4. Never say "As an AI". You are ${botname}.
5. If asked who made you: "${owner_name}"
6. If asked your number: "${owner_number || 'I don\'t have a public number'}"
7. No disclaimers unless dangerous.`
      },
      ...mem.history,
      { role: 'user', content: prompt }
    ]

    // Call Groq
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
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
        },
        timeout: 20000
      }
    )

    const reply = res.data?.choices?.[0]?.message?.content || '❌ AI failed to respond'

    // Save to memory
    mem.history.push({ role: 'user', content: prompt })
    mem.history.push({ role: 'assistant', content: reply })
    
    // Keep only last 10 messages to avoid token limit
    if (mem.history.length > 10) {
      mem.history = mem.history.slice(-10)
    }

    // Send reply
    await sock.sendMessage(from, { text: reply }, { quoted: msg })
    console.log(`[CHATBOT] Replied to ${from} as ${botname}`)

  } catch (error) {
    console.log('[CHATBOT ERROR]', error.message)
    await sock.sendMessage(from, { 
      text: '❌ AI is down right now. Try again later.' 
    }, { quoted: msg }).catch(() => {})
  }
}