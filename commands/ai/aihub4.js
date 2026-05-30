import axios from 'axios'

export const name = 'aihub4'
export const alias = [
  'aihub4',
  'resume','cover','cv','bio','tiktok','caption','hashtag','meme','lyrics','trivia'
]
export const category = 'AI'
export const desc = 'AI HUB PART 4 — Real meme pictures'

// Store conversations in Map - auto clean after 30 min
const conversations = new Map()

function getBrandName(botSettings) {
  return botSettings?.brand_name || botSettings?.botname || 'Bot'
}

function getQuotedText(msg) {
  const q = msg?.message?.extendedTextMessage?.contextInfo
  return (
    q?.quotedMessage?.conversation ||
    q?.quotedMessage?.extendedTextMessage?.text ||
    q?.quotedMessage?.imageMessage?.caption ||
    null
  )
}

async function rct(sock, msg, emoji) {
  try { await sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } }) } catch {}
}

// Auto clean old conversations every 30 min
setInterval(() => {
  const now = Date.now()
  for (const [key, data] of conversations.entries()) {
    if (now - data.time > 30 * 60 * 1000) {
      conversations.delete(key)
    }
  }
}, 30 * 60 * 1000)

async function callAPI(endpoints) {
  for (const fn of endpoints) {
    try {
      const result = await fn()
      if (result && typeof result === 'string' && result.length > 5) {
        const lines = result.split('\n').filter(l => l.trim())
        return lines.slice(0, 2).join('\n')
      }
    } catch {}
  }
  return null
}

const OR_KEY = process.env.OPENROUTER_API_KEY
const OR_HEADERS = OR_KEY? { 'Authorization': `Bearer ${OR_KEY}`, 'HTTP-Referer': 'https://wa.bot' } : null

// Meme templates for random selection
const memeTemplates = [
  'Drake Hotline Bling meme format',
  'Distracted Boyfriend meme format',
  'Two Buttons meme format',
  'Change My Mind meme format',
  'Expanding Brain meme format',
  'Surprised Pikachu meme format',
  'Woman Yelling at Cat meme format'
]

// 31-37. Commands zingine zibaki vile...
async function cmd_resume(prompt, system) {
  const shortSystem = system + ' Reply in 2 lines max. Be concise.'
  const apis = [
    async () => (await axios.get(`https://text.pollinations.ai/Resume%20points%20for%3A%20${encodeURIComponent(prompt)}?system=${encodeURIComponent(shortSystem)}`)).data,
    async () => (await axios.post('https://api.together.xyz/v1/chat/completions', {model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo', messages: [{role: 'system', content: shortSystem}, {role: 'user', content: `2-line resume for: ${prompt}`}]})).data?.choices?.[0]?.message?.content,
    async () => OR_HEADERS? (await axios.post('https://openrouter.ai/api/v1/chat/completions', {model: 'openai/gpt-4o-mini', messages: [{role: 'system', content: shortSystem}, {role: 'user', content: `Resume 2 lines: ${prompt}`}]}, {headers: OR_HEADERS})).data?.choices?.[0]?.message?.content : null,
    async () => (await axios.post('https://openrouter.ai/api/v1/chat/completions', {model: 'openai/gpt-4o-mini:free', messages: [{role: 'system', content: shortSystem}, {role: 'user', content: `Resume 2 lines: ${prompt}`}]})).data?.choices?.[0]?.message?.content,
    async () => (await axios.post('https://api.groq.com/openai/v1/chat/completions', {model: 'llama-3.1-8b-instant', messages: [{role: 'system', content: shortSystem}, {role: 'user', content: `2 line resume for: ${prompt}`}]}, {headers: {'Authorization': `Bearer ${process.env.GROQ_API_KEY}`}, timeout: 20000})).data?.choices?.[0]?.message?.content
  ]
  return callAPI(apis)
}

async function cmd_cover(prompt, system) {
  const shortSystem = system + ' Reply in 2 lines max.'
  const apis = [
    async () => (await axios.get(`https://text.pollinations.ai/Cover%20letter%202%20lines%20for%3A%20${encodeURIComponent(prompt)}?system=${encodeURIComponent(shortSystem)}`)).data,
    async () => (await axios.post('https://api.together.xyz/v1/chat/completions', {model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo', messages: [{role: 'system', content: shortSystem}, {role: 'user', content: `2-line cover letter for: ${prompt}`}]})).data?.choices?.[0]?.message?.content,
    async () => OR_HEADERS? (await axios.post('https://openrouter.ai/api/v1/chat/completions', {model: 'openai/gpt-4o-mini', messages: [{role: 'system', content: shortSystem}, {role: 'user', content: `Cover letter 2 lines: ${prompt}`}]}, {headers: OR_HEADERS})).data?.choices?.[0]?.message?.content : null,
    async () => (await axios.post('https://openrouter.ai/api/v1/chat/completions', {model: 'openai/gpt-4o-mini:free', messages: [{role: 'system', content: shortSystem}, {role: 'user', content: `Cover 2 lines: ${prompt}`}]})).data?.choices?.[0]?.message?.content,
    async () => (await axios.post('https://api.groq.com/openai/v1/chat/completions', {model: 'llama-3.1-8b-instant', messages: [{role: 'system', content: shortSystem}, {role: 'user', content: `2 line cover letter: ${prompt}`}]}, {headers: {'Authorization': `Bearer ${process.env.GROQ_API_KEY}`}, timeout: 20000})).data?.choices?.[0]?.message?.content
  ]
  return callAPI(apis)
}

async function cmd_cv(prompt, system) {
  const shortSystem = system + ' Reply in 2 lines max.'
  const apis = [
    async () => (await axios.get(`https://text.pollinations.ai/CV%20points%202%20lines%20for%3A%20${encodeURIComponent(prompt)}?system=${encodeURIComponent(shortSystem)}`)).data,
    async () => (await axios.post('https://api.together.xyz/v1/chat/completions', {model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo', messages: [{role: 'system', content: shortSystem}, {role: 'user', content: `2-line CV for: ${prompt}`}]})).data?.choices?.[0]?.message?.content,
    async () => OR_HEADERS? (await axios.post('https://openrouter.ai/api/v1/chat/completions', {model: 'anthropic/claude-3-haiku', messages: [{role: 'system', content: shortSystem}, {role: 'user', content: `CV 2 lines: ${prompt}`}]}, {headers: OR_HEADERS})).data?.choices?.[0]?.message?.content : null,
    async () => (await axios.post('https://openrouter.ai/api/v1/chat/completions', {model: 'anthropic/claude-3-haiku:free', messages: [{role: 'system', content: shortSystem}, {role: 'user', content: `CV 2 lines: ${prompt}`}]})).data?.choices?.[0]?.message?.content,
    async () => (await axios.post('https://api.groq.com/openai/v1/chat/completions', {model: 'llama-3.1-8b-instant', messages: [{role: 'system', content: shortSystem}, {role: 'user', content: `2 line CV: ${prompt}`}]}, {headers: {'Authorization': `Bearer ${process.env.GROQ_API_KEY}`}, timeout: 20000})).data?.choices?.[0]?.message?.content
  ]
  return callAPI(apis)
}

async function cmd_bio(prompt, system) {
  const shortSystem = system + ' Reply in 1 line max.'
  const apis = [
    async () => (await axios.get(`https://text.pollinations.ai/1%20line%20bio%20for%3A%20${encodeURIComponent(prompt)}?system=${encodeURIComponent(shortSystem)}`)).data,
    async () => (await axios.post('https://api.together.xyz/v1/chat/completions', {model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo', messages: [{role: 'system', content: shortSystem}, {role: 'user', content: `1 line bio for: ${prompt}`}]})).data?.choices?.[0]?.message?.content,
    async () => OR_HEADERS? (await axios.post('https://openrouter.ai/api/v1/chat/completions', {model: 'openai/gpt-4o-mini', messages: [{role: 'system', content: shortSystem}, {role: 'user', content: `1 line bio: ${prompt}`}]}, {headers: OR_HEADERS})).data?.choices?.[0]?.message?.content : null,
    async () => (await axios.post('https://openrouter.ai/api/v1/chat/completions', {model: 'openai/gpt-4o-mini:free', messages: [{role: 'system', content: shortSystem}, {role: 'user', content: `1 line bio: ${prompt}`}]})).data?.choices?.[0]?.message?.content,
    async () => (await axios.post('https://api.groq.com/openai/v1/chat/completions', {model: 'llama-3.1-8b-instant', messages: [{role: 'system', content: shortSystem}, {role: 'user', content: `1 line bio for: ${prompt}`}]}, {headers: {'Authorization': `Bearer ${process.env.GROQ_API_KEY}`}, timeout: 20000})).data?.choices?.[0]?.message?.content
  ]
  return callAPI(apis)
}

async function cmd_tiktok(prompt, system) {
  const shortSystem = system + ' Reply 3 ideas, 1 line each.'
  const apis = [
    async () => (await axios.get(`https://text.pollinations.ai/3%20TikTok%20ideas%201%20line%20each%20for%3A%20${encodeURIComponent(prompt)}?system=${encodeURIComponent(shortSystem)}`)).data,
    async () => (await axios.post('https://api.together.xyz/v1/chat/completions', {model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo', messages: [{role: 'system', content: shortSystem}, {role: 'user', content: `3 TikTok ideas 1 line each for: ${prompt}`}]})).data?.choices?.[0]?.message?.content,
    async () => OR_HEADERS? (await axios.post('https://openrouter.ai/api/v1/chat/completions', {model: 'meta-llama/llama-3.1-8b-instruct', messages: [{role: 'system', content: shortSystem}, {role: 'user', content: `3 TikTok ideas 1 line each: ${prompt}`}]}, {headers: OR_HEADERS})).data?.choices?.[0]?.message?.content : null,
    async () => (await axios.post('https://openrouter.ai/api/v1/chat/completions', {model: 'meta-llama/llama-3.1-8b-instruct:free', messages: [{role: 'system', content: shortSystem}, {role: 'user', content: `3 ideas 1 line each: ${prompt}`}]})).data?.choices?.[0]?.message?.content,
    async () => (await axios.post('https://api.groq.com/openai/v1/chat/completions', {model: 'llama-3.1-8b-instant', messages: [{role: 'system', content: shortSystem}, {role: 'user', content: `3 TikTok ideas 1 line each for: ${prompt}`}]}, {headers: {'Authorization': `Bearer ${process.env.GROQ_API_KEY}`}, timeout: 20000})).data?.choices?.[0]?.message?.content
  ]
  return callAPI(apis)
}

async function cmd_caption(prompt, system) {
  const shortSystem = system + ' Reply 1 caption only, 1 line.'
  const apis = [
    async () => (await axios.get(`https://text.pollinations.ai/1%20IG%20caption%201%20line%20for%3A%20${encodeURIComponent(prompt)}?system=${encodeURIComponent(shortSystem)}`)).data,
    async () => (await axios.post('https://api.together.xyz/v1/chat/completions', {model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo', messages: [{role: 'system', content: shortSystem}, {role: 'user', content: `1 line IG caption for: ${prompt}`}]})).data?.choices?.[0]?.message?.content,
    async () => OR_HEADERS? (await axios.post('https://openrouter.ai/api/v1/chat/completions', {model: 'openai/gpt-4o-mini', messages: [{role: 'system', content: shortSystem}, {role: 'user', content: `1 line caption: ${prompt}`}]}, {headers: OR_HEADERS})).data?.choices?.[0]?.message?.content : null,
    async () => (await axios.post('https://openrouter.ai/api/v1/chat/completions', {model: 'openai/gpt-4o-mini:free', messages: [{role: 'system', content: shortSystem}, {role: 'user', content: `1 line caption: ${prompt}`}]})).data?.choices?.[0]?.message?.content,
    async () => (await axios.post('https://api.groq.com/openai/v1/chat/completions', {model: 'llama-3.1-8b-instant', messages: [{role: 'system', content: shortSystem}, {role: 'user', content: `1 line caption for: ${prompt}`}]}, {headers: {'Authorization': `Bearer ${process.env.GROQ_API_KEY}`}, timeout: 20000})).data?.choices?.[0]?.message?.content
  ]
  return callAPI(apis)
}

async function cmd_hashtag(prompt, system) {
  const shortSystem = system + ' Reply 15 hashtags only, 1 line.'
  const apis = [
    async () => (await axios.get(`https://text.pollinations.ai/15%20hashtags%201%20line%20for%3A%20${encodeURIComponent(prompt)}?system=${encodeURIComponent(shortSystem)}`)).data,
    async () => (await axios.post('https://api.together.xyz/v1/chat/completions', {model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo', messages: [{role: 'system', content: shortSystem}, {role: 'user', content: `15 hashtags 1 line for: ${prompt}`}]})).data?.choices?.[0]?.message?.content,
    async () => OR_HEADERS? (await axios.post('https://openrouter.ai/api/v1/chat/completions', {model: 'meta-llama/llama-3.1-8b-instruct', messages: [{role: 'system', content: shortSystem}, {role: 'user', content: `15 hashtags 1 line: ${prompt}`}]}, {headers: OR_HEADERS})).data?.choices?.[0]?.message?.content : null,
    async () => (await axios.post('https://openrouter.ai/api/v1/chat/completions', {model: 'meta-llama/llama-3.1-8b-instruct:free', messages: [{role: 'system', content: shortSystem}, {role: 'user', content: `15 hashtags 1 line: ${prompt}`}]})).data?.choices?.[0]?.message?.content,
    async () => (await axios.post('https://api.groq.com/openai/v1/chat/completions', {model: 'llama-3.1-8b-instant', messages: [{role: 'system', content: shortSystem}, {role: 'user', content: `15 hashtags 1 line for: ${prompt}`}]}, {headers: {'Authorization': `Bearer ${process.env.GROQ_API_KEY}`}, timeout: 20000})).data?.choices?.[0]?.message?.content
  ]
  return callAPI(apis)
}

// 38. MEME - SASA INATUMA PICHA HALISI
async function cmd_meme(prompt, system, sock, from, msg) {
  try {
    await rct(sock, msg, '🎨')

    // Kama hana topic, chagua random
    const topic = prompt || 'random funny situation'
    const template = memeTemplates[Math.floor(Math.random() * memeTemplates.length)]

    // Generate caption fupi
    const caption = await callAPI([
      async () => (await axios.get(`https://text.pollinations.ai/Funny%202%20line%20meme%20caption%20about%20${encodeURIComponent(topic)}`)).data,
      async () => (await axios.post('https://api.groq.com/openai/v1/chat/completions', {model: 'llama-3.1-8b-instant', messages: [{role: 'user', content: `2 line funny meme caption about: ${topic}`}]}, {headers: {'Authorization': `Bearer ${process.env.GROQ_API_KEY}`}, timeout: 10000})).data?.choices?.[0]?.message?.content
    ])

    const finalCaption = caption || 'Me: *exists*\nLife: Bet'

    // Generate real meme image
    const { media } = await import('../lib/media.js')
    await media.create_image({
      prompt: `${template}, meme style, bold white text with black outline, top text and bottom text, high quality, funny`,
      orientation: 'square'
    })

    // Send with caption
    await sock.sendMessage(from, {
      text: finalCaption
    }, { quoted: msg })

    await rct(sock, msg, '✅')
    return 'sent'

  } catch (e) {
    console.error('Meme gen error:', e.message)
    await rct(sock, msg, '❌')
    await sock.sendMessage(from, { text: '> Failed to generate meme' }, { quoted: msg })
    return null
  }
}

// 39-40. Zingine...
async function cmd_lyrics(prompt, system) {
  const shortSystem = system + ' Reply 4 lines of lyrics only.'
  const apis = [
    async () => (await axios.get(`https://text.pollinations.ai/4%20lines%20lyrics%20about%3A%20${encodeURIComponent(prompt)}?system=${encodeURIComponent(shortSystem)}`)).data,
    async () => (await axios.post('https://api.together.xyz/v1/chat/completions', {model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo', messages: [{role: 'system', content: shortSystem}, {role: 'user', content: `4 lines lyrics about: ${prompt}`}]})).data?.choices?.[0]?.message?.content,
    async () => OR_HEADERS? (await axios.post('https://openrouter.ai/api/v1/chat/completions', {model: 'anthropic/claude-3-haiku', messages: [{role: 'system', content: shortSystem}, {role: 'user', content: `4 lines lyrics: ${prompt}`}]}, {headers: OR_HEADERS})).data?.choices?.[0]?.message?.content : null,
    async () => (await axios.post('https://openrouter.ai/api/v1/chat/completions', {model: 'anthropic/claude-3-haiku:free', messages: [{role: 'system', content: shortSystem}, {role: 'user', content: `4 lines lyrics: ${prompt}`}]})).data?.choices?.[0]?.message?.content,
    async () => (await axios.post('https://api.groq.com/openai/v1/chat/completions', {model: 'llama-3.1-8b-instant', messages: [{role: 'system', content: shortSystem}, {role: 'user', content: `4 lines lyrics about: ${prompt}`}]}, {headers: {'Authorization': `Bearer ${process.env.GROQ_API_KEY}`}, timeout: 20000})).data?.choices?.[0]?.message?.content
  ]
  return callAPI(apis)
}

async function cmd_trivia(prompt, system) {
  const shortSystem = system + ' Reply 3 questions only, 1 line each.'
  const apis = [
    async () => (await axios.get(`https://text.pollinations.ai/3%20trivia%20questions%201%20line%20each%20about%3A%20${encodeURIComponent(prompt)}?system=${encodeURIComponent(shortSystem)}`)).data,
    async () => (await axios.post('https://api.together.xyz/v1/chat/completions', {model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo', messages: [{role: 'system', content: shortSystem}, {role: 'user', content: `3 trivia questions 1 line each about: ${prompt}`}]})).data?.choices?.[0]?.message?.content,
    async () => OR_HEADERS? (await axios.post('https://openrouter.ai/api/v1/chat/completions', {model: 'meta-llama/llama-3.1-8b-instruct', messages: [{role: 'system', content: shortSystem}, {role: 'user', content: `3 trivia 1 line each: ${prompt}`}]}, {headers: OR_HEADERS})).data?.choices?.[0]?.message?.content : null,
    async () => (await axios.post('https://openrouter.ai/api/v1/chat/completions', {model: 'meta-llama/llama-3.1-8b-instruct:free', messages: [{role: 'system', content: shortSystem}, {role: 'user', content: `3 trivia 1 line each: ${prompt}`}]})).data?.choices?.[0]?.message?.content,
    async () => (await axios.post('https://api.groq.com/openai/v1/chat/completions', {model: 'llama-3.1-8b-instant', messages: [{role: 'system', content: shortSystem}, {role: 'user', content: `3 trivia questions 1 line each about: ${prompt}`}]}, {headers: {'Authorization': `Bearer ${process.env.GROQ_API_KEY}`}, timeout: 20000})).data?.choices?.[0]?.message?.content
  ]
  return callAPI(apis)
}

export default async function executeAutonomousCommand(sock, { msg, from, sender }, botSettings) {
  try {
    const prefix = botSettings?.prefix?? botSettings?.bot_prefix?? '.'
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || msg.message?.imageMessage?.caption || ''

    if (!body ||!body.startsWith(prefix)) return

    const trimmed = body.slice(prefix.length).trim()
    const parts = trimmed.split(/\s+/)
    const cmd = parts[0]?.toLowerCase()?? ''
    const args = parts.slice(1)
    const argText = args.join(' ').trim()

    const brandName = getBrandName(botSettings)
    const quoted = getQuotedText(msg)
    const input = quoted || argText
    const userId = sender || from

    // FIX: Kama ni meme, enda direct kwenye meme command hata bila topic
    if (cmd === 'meme' || cmd === 'prediz') {
      const result = await cmd_meme(input, `You are meme generator for ${brandName}`, sock, from, msg)
      if (result === 'sent') return // Imetuma picha, toka hapa
    }

    // MENU - Ikiwa ni aihub4 tu
    if (cmd === 'aihub4') {
      await sock.sendMessage(from, { react: { text: '🎯', key: msg.key } })
      const menuText = `╭─⌈ 🎯 *AI HUB PART 4* ⌋
│ 📋 *Prefix: ${prefix}*
│ 📄 resume <info> — Resume
│ 💌 cover <job> — Cover letter
│ 📑 cv <info> — CV
│ 👤 bio <name> — Bio
│ 🎵 tiktok <niche> — TikTok ideas
│ 📸 caption <topic> — Caption
│ #️⃣ hashtag <topic> — Hashtags
│ 😂 meme <topic> — REAL MEME PIC
│ 🎤 lyrics <theme> — Lyrics
│ ❓ trivia <topic> — Quiz
╰⊷ *Powered By ${brandName}*`
      return await sock.sendMessage(from, { text: menuText }, { quoted: msg })
    }

    if (!input) {
      return sock.sendMessage(from, { text: `❌ ${prefix}${cmd} <topic>` }, { quoted: msg })
    }

    const system = `You are AI assistant for ${brandName}. User: ${msg.pushName || 'User'}. Reply in user's language. Be short.`

    await rct(sock, msg, '🧠')
    let result = null

    if (cmd === 'resume') result = await cmd_resume(input, system)
    else if (cmd === 'cover') result = await cmd_cover(input, system)
    else if (cmd === 'cv') result = await cmd_cv(input, system)
    else if (cmd === 'bio') result = await cmd_bio(input, system)
    else if (cmd === 'tiktok') result = await cmd_tiktok(input, system)
    else if (cmd === 'caption') result = await cmd_caption(input, system)
    else if (cmd === 'hashtag') result = await cmd_hashtag(input, system)
    else if (cmd === 'lyrics') result = await cmd_lyrics(input, system)
    else if (cmd === 'trivia') result = await cmd_trivia(input, system)

    if (!result) {
      await rct(sock, msg, '❌')
      return sock.sendMessage(from, { text: '> AI down' }, { quoted: msg })
    }

    await sock.sendMessage(from, { text: result }, { quoted: msg })
    await rct(sock, msg, '✅').catch(() => {})

  } catch (err) {
    console.error('[AIHUB4 ERROR]', err.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Error' }, { quoted: msg })
  }
}