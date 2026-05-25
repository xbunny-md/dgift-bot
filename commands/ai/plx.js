import axios from 'axios'

export const name = 'perplexity'
export const alias = ['plexity', 'plx']
export const category = 'AI'
export const desc = 'Chat with Perplexity AI'

export default async function perplexity(sock, { msg, from }, botSettings) {
  try {
    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = text.split(' ').slice(1)
    const prompt = args.join(' ')

    if (!prompt) {
      return sock.sendMessage(from, { text: '❌ Usage:.perplexity what is AI?' }, { quoted: msg })
    }

    await sock.sendMessage(from, { react: { text: '🔍', key: msg.key } })

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

    const systemPrompt = `You are Perplexity AI, a research-focused AI assistant.

Core Identity:
1. You are Perplexity AI. You specialize in finding and explaining information clearly.
2. You break down complex topics into simple explanations.
3. You are factual, neutral, and helpful.

Behavior Rules:
1. Answer in the user's language. Match exactly.
2. Give clear, structured answers. Use bullets or steps when needed.
3. Keep replies 3-5 lines unless user wants deep dive.
4. Be direct and avoid filler words.
5. If asked who made you: "Perplexity"
6. If asked about owner: "This bot is managed by ${ownerName}"
7. If asked owner number: "${ownerNumber || 'Private'}"
8. If no data is available, analyze based on known facts and say so.
9. No unnecessary disclaimers.`

    const res = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5
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
    console.log('Perplexity command error:', error.message)
    await sock.sendMessage(from, { text: '❌ AI is down right now. Try again later.' }, { quoted: msg })
  }
}