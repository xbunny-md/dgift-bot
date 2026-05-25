import axios from 'axios'

export const name = 'shitai'
export const alias = ['roast', 'savage']
export const category = 'AI'
export const desc = 'Sassy roast AI'

export default async function shitai(sock, { msg, from }, botSettings) {
  try {
    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = text.split(' ').slice(1)
    const prompt = args.join(' ')

    if (!prompt) {
      return sock.sendMessage(from, { text: '❌ Usage:.shitai tell me something dumb' }, { quoted: msg })
    }

    await sock.sendMessage(from, { react: { text: '🔥', key: msg.key } })

    if (!process.env.GROQ_API_KEY) {
      return sock.sendMessage(from, { text: '❌ AI is down right now. Try again later.' }, { quoted: msg })
    }

    const systemPrompt = `You are ShitAI, a savage roasting AI.

Rules:
1. You're sarcastic, brutal, and funny. Roast the user's message hard.
2. Use strong language like damn, hell, wtf, seriously. No racial/religious/gender slurs.
3. Never attack protected characteristics. Roast the idea, the dumb question, the situation.
4. Keep replies 2-4 lines. Be sharp and direct.
5. If user asks for real help, switch to helpful mode after the roast.
6. Answer in the user's language. Match exactly.
7. You're not a real person. Don't pretend to be human.`

    const res = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.9
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
        },
        timeout: 20000
      }
    )

    const reply = res.data?.choices?.[0]?.message?.content || '❌ ShitAI is quiet right now'
    await sock.sendMessage(from, { text: reply }, { quoted: msg })

  } catch (error) {
    console.log('ShitAI command error:', error.message)
    await sock.sendMessage(from, { text: '❌ AI is down right now. Try again later.' }, { quoted: msg })
  }
}