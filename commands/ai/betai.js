import axios from 'axios'

export const name = 'betai'
export const alias = ['bet', 'tips']
export const category = 'AI'
export const desc = 'Betting AI with live match analysis'

export default async function betai(sock, { msg, from }, botSettings) {
  try {
    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = text.split(' ').slice(1)
    const prompt = args.join(' ')

    if (!prompt) {
      return sock.sendMessage(from, { text: '❌ Usage:.betai Man City vs Arsenal' }, { quoted: msg })
    }

    await sock.sendMessage(from, { react: { text: '⚽', key: msg.key } })

    if (!process.env.GROQ_API_KEY) {
      return sock.sendMessage(from, { text: '❌ AI is down right now. Try again later.' }, { quoted: msg })
    }

    // Search live matches data
    let matchData = ''
    try {
      const searchRes = await browser.search({
        primary_query: {
          query: `${prompt} live score odds lineup`,
          language_code: 'en'
        },
        verticals: ['sports'],
        verbosity_level: 'high'
      })

      if (searchRes && searchRes.results) {
        matchData = searchRes.results.map(r => `${r.title}: ${r.snippet}`).join('\n')
      }
    } catch (e) {
      console.log('Search failed:', e.message)
    }

    const systemPrompt = `You are BetAI, a professional sports betting analyst.

Rules:
1. Use the live match data provided to give accurate analysis.
2. Give detailed breakdown: form, H2H, key players, injuries, odds analysis.
3. Give clear prediction with reasoning. Mark it as "Prediction" and "Risk Level".
4. Be direct. No fluff. 4-6 lines for quick tips, longer if user asks details.
5. Always add: "Bet responsibly. This is analysis, not financial advice."
6. Answer in the user's language. Match exactly.
7. If no live data found, say so and analyze based on recent form and stats.`

    const userPrompt = `User asked: ${prompt}

Live match data:
${matchData || 'No live data found'}

Give detailed betting analysis based on this.`

    const res = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.4
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
        },
        timeout: 25000
      }
    )

    const reply = res.data?.choices?.[0]?.message?.content || '❌ Analysis failed'
    await sock.sendMessage(from, { text: reply }, { quoted: msg })

  } catch (error) {
    console.log('BetAI command error:', error.message)
    await sock.sendMessage(from, { text: '❌ AI is down right now. Try again later.' }, { quoted: msg })
  }
}