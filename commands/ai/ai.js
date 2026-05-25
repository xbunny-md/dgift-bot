import axios from 'axios'

export const name = 'ai'
export const category = 'AI'
export const desc = 'Chat with AI using Groq'

export default async function ai(sock, { msg, from }, botSettings) {
  try {
    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = text.split(' ').slice(1)
    const prompt = args.join(' ')

    if (!prompt) {
      return sock.sendMessage(from, { text: '❌ Usage:.ai hello' }, { quoted: msg })
    }

    await sock.sendMessage(from, { react: { text: '🧠', key: msg.key } })

    // Fetch bot info from b_settings table
    let botName = botSettings.botname || 'Bot'
    let ownerName = 'Owner'
    let ownerNumber = ''

    if (botSettings.supabase) {
      try {
        const { data } = await botSettings.supabase
         .from('b_settings')
         .select('botname, owner_name, owner_number')
         .limit(1)
         .single()

        if (data) {
          botName = data.botname || botName
          ownerName = data.owner_name || ownerName
          ownerNumber = data.owner_number || ''
        }
      } catch (e) {
        console.log('Failed to fetch b_settings:', e.message)
      }
    }

    if (!process.env.GROQ_API_KEY) {
      return sock.sendMessage(from, { text: '❌ GROQ_API_KEY not set' }, { quoted: msg })
    }

    const systemPrompt = `You are ${botName}, a smart WhatsApp assistant created by ${ownerName}.

Rules:
1. Answer in the user's language. Match exactly.
2. Keep replies short, 2-3 lines max unless user asks for details.
3. Be direct, helpful, and natural.
4. Never say "As an AI". You are ${botName}.
5. If asked who made you: "${ownerName}"
6. If asked your number: "${ownerNumber || 'I don\'t have a public number'}"
7. No disclaimers unless dangerous.`

    const res = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7
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
    await sock.sendMessage(from, { text: reply }, { quoted: msg })

  } catch (error) {
    console.log('AI command error:', error.message)
    await sock.sendMessage(from, { text: '❌ AI is down right now. Try again later.' }, { quoted: msg })
  }
}