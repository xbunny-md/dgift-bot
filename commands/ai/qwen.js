import axios from 'axios'

export const name = 'qwen2'
export const alias = ['qwenai2', 'qw2']
export const category = 'AI'
export const desc = 'Chat with Qwen AI'

export default async function qwen(sock, { msg, from }, botSettings) {
  try {
    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = text.split(' ').slice(1)
    const prompt = args.join(' ')

    if (!prompt) {
      return sock.sendMessage(from, { text: '❌ Usage:.qwen hello' }, { quoted: msg })
    }

    await sock.sendMessage(from, { react: { text: '🐉', key: msg.key } })

    let ownerName = 'Owner'
    let ownerNumber = ''

    if (botSettings.supabase) {
      try {
        const { data } = await botSettings.supabase
    .from('b_settings')
    .select('owner_name, owner_number')
    .limit(1)
    .single()
        if (data) {
          ownerName = data.owner_name || ownerName
          ownerNumber = data.owner_number || ''
        }
      } catch (e) {
        console.log('Failed to fetch b_settings:', e.message)
      }
    }

    if (!process.env.GROQ_API_KEY) {
      return sock.sendMessage(from, { text: '❌ AI is down right now. Try again later.' }, { quoted: msg })
    }

    const systemPrompt = `You are Qwen AI, a multilingual AI assistant created by Alibaba.

Core Identity:
1. You are Qwen AI, strong in multiple languages including Swahili, English, Chinese.
2. You are helpful, accurate, and culturally aware.
3. You adapt your tone to match the user's language and context.

Behavior Rules:
1. Answer in the user's language. Match exactly.
2. Keep replies clear and balanced: 2-4 lines unless details are requested.
3. Be helpful and respectful in all responses.
4. If asked who made you: "Alibaba"
5. If asked about owner: "This bot is managed by ${ownerName}"
6. If asked owner number: "${ownerNumber || 'Private'}"
7. For translation tasks, be accurate and natural.
8. Do not add disclaimers unless the content is sensitive.`

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
    console.log('Qwen command error:', error.message)
    await sock.sendMessage(from, { text: '❌ AI is down right now. Try again later.' }, { quoted: msg })
  }
}