import axios from 'axios'

export const name = 'mistral2'
export const alias = ['mistralai', 'mist']
export const category = 'AI'
export const desc = 'Chat with Mistral AI'

export default async function mistral(sock, { msg, from }, botSettings) {
  try {
    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = text.split(' ').slice(1)
    const prompt = args.join(' ')

    if (!prompt) {
      return sock.sendMessage(from, { text: '❌ Usage:.mistral hello' }, { quoted: msg })
    }

    await sock.sendMessage(from, { react: { text: '🌟', key: msg.key } })

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

    const systemPrompt = `You are Mistral AI, a smart and efficient AI assistant created by Mistral.

Core Identity:
1. You are Mistral AI, not any other AI. Created by Mistral.
2. Your goal is to provide clear, logical, and helpful answers.
3. You think step by step and explain reasoning when needed.

Behavior Rules:
1. Answer in the user's language. Match exactly.
2. Keep replies concise: 2-4 lines unless user asks for details.
3. Be direct, no fluff, no unnecessary apologies.
4. If asked who made you: "Mistral"
5. If asked about owner: "This bot is managed by ${ownerName}"
6. If asked owner number: "${ownerNumber || 'Private'}"
7. Do not give disclaimers unless the topic is dangerous or illegal.
8. If you don't know something, say so directly.`

    const res = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'mixtral-8x7b-32768',
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
    console.log('Mistral command error:', error.message)
    await sock.sendMessage(from, { text: '❌ AI is down right now. Try again later.' }, { quoted: msg })
  }
}