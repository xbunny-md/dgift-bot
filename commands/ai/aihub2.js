import axios from 'axios'

export const name = 'aihub2'
export const alias = [
  'aihub2',
  'essay','code','math','explain','summarize','translate','homework','fix','rewrite','brain'
]
export const category = 'AI'
export const desc = 'AI HUB PART 2 — 10 commands with Map conversations'

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
      if (result && typeof result === 'string' && result.length > 5) return result
    } catch {}
  }
  return null
}

// 11. ESSAY
async function cmd_essay(prompt, system) {
  const apis = [
    async () => (await axios.get(`https://text.pollinations.ai/Write%20an%20essay%20about%3A%20${encodeURIComponent(prompt)}?system=${encodeURIComponent(system)}`)).data,
    async () => (await axios.post('https://api.together.xyz/v1/chat/completions', {model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo', messages: [{role: 'system', content: system}, {role: 'user', content: `Write detailed essay about: ${prompt}`}]})).data?.choices?.[0]?.message?.content,
    async () => (await axios.post('https://openrouter.ai/api/v1/chat/completions', {model: 'anthropic/claude-3-sonnet:free', messages: [{role: 'system', content: system}, {role: 'user', content: `Write essay about: ${prompt}`}]})).data?.choices?.[0]?.message?.content,
    async () => (await axios.post('https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-70B-Instruct', {inputs: `Write essay about: ${prompt}`})).data?.[0]?.generated_text,
    async () => (await axios.post('https://api.deepai.org/api/text-generator', new URLSearchParams({text: `Essay about: ${prompt}`}), {headers: {'api-key': 'quickstart-QUdJIGlzIGF3ZXNvbWU'}})).data?.output,
    async () => (await axios.post('https://api.groq.com/openai/v1/chat/completions', {model: 'llama-3.3-70b-versatile', messages: [{role: 'system', content: system + ' You are essay writer.'}, {role: 'user', content: `Write essay about: ${prompt}`}]}, {headers: {'Authorization': `Bearer ${process.env.GROQ_API_KEY}`}, timeout: 20000})).data?.choices?.[0]?.message?.content
  ]
  return callAPI(apis)
}

// 12. CODE
async function cmd_code(prompt, system) {
  const apis = [
    async () => (await axios.get(`https://text.pollinations.ai/Write%20code%20for%3A%20${encodeURIComponent(prompt)}?system=${encodeURIComponent(system)}&model=codellama`)).data,
    async () => (await axios.post('https://api.together.xyz/v1/chat/completions', {model: 'Qwen/Qwen2.5-Coder-32B-Instruct', messages: [{role: 'system', content: system}, {role: 'user', content: `Write code for: ${prompt}`}]})).data?.choices?.[0]?.message?.content,
    async () => (await axios.post('https://openrouter.ai/api/v1/chat/completions', {model: 'qwen/qwen-2.5-coder-32b-instruct:free', messages: [{role: 'system', content: system}, {role: 'user', content: `Write code for: ${prompt}`}]})).data?.choices?.[0]?.message?.content,
    async () => (await axios.post('https://api-inference.huggingface.co/models/Qwen/Qwen2.5-Coder-32B-Instruct', {inputs: `Write code for: ${prompt}`})).data?.[0]?.generated_text,
    async () => (await axios.post('https://api.deepai.org/api/text-generator', new URLSearchParams({text: `Code for: ${prompt}`}), {headers: {'api-key': 'quickstart-QUdJIGlzIGF3ZXNvbWU'}})).data?.output,
    async () => (await axios.post('https://api.groq.com/openai/v1/chat/completions', {model: 'llama-3.1-70b-versatile', messages: [{role: 'system', content: system + ' You are senior developer.'}, {role: 'user', content: `Write code for: ${prompt}`}]}, {headers: {'Authorization': `Bearer ${process.env.GROQ_API_KEY}`}, timeout: 20000})).data?.choices?.[0]?.message?.content
  ]
  return callAPI(apis)
}

// 13. MATH
async function cmd_math(prompt, system) {
  const apis = [
    async () => (await axios.get(`https://text.pollinations.ai/Solve%20this%20math%20problem%3A%20${encodeURIComponent(prompt)}?system=${encodeURIComponent(system)}`)).data,
    async () => (await axios.post('https://api.together.xyz/v1/chat/completions', {model: 'meta-llama/Llama-3.1-70B-Instruct-Turbo', messages: [{role: 'system', content: system}, {role: 'user', content: `Solve step by step: ${prompt}`}]})).data?.choices?.[0]?.message?.content,
    async () => (await axios.post('https://openrouter.ai/api/v1/chat/completions', {model: 'meta-llama/llama-3.1-8b-instruct:free', messages: [{role: 'system', content: system}, {role: 'user', content: `Solve: ${prompt}`}]})).data?.choices?.[0]?.message?.content,
    async () => (await axios.post('https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct', {inputs: `Solve math: ${prompt}`})).data?.[0]?.generated_text,
    async () => (await axios.post('https://api.deepai.org/api/text-generator', new URLSearchParams({text: `Solve: ${prompt}`}), {headers: {'api-key': 'quickstart-QUdJIGlzIGF3ZXNvbWU'}})).data?.output,
    async () => (await axios.post('https://api.groq.com/openai/v1/chat/completions', {model: 'llama-3.1-70b-versatile', messages: [{role: 'system', content: system}, {role: 'user', content: `Solve step by step: ${prompt}`}]}, {headers: {'Authorization': `Bearer ${process.env.GROQ_API_KEY}`}, timeout: 20000})).data?.choices?.[0]?.message?.content
  ]
  return callAPI(apis)
}

// 14. EXPLAIN
async function cmd_explain(prompt, system) {
  const apis = [
    async () => (await axios.get(`https://text.pollinations.ai/Explain%20in%20simple%20terms%3A%20${encodeURIComponent(prompt)}?system=${encodeURIComponent(system)}`)).data,
    async () => (await axios.post('https://api.together.xyz/v1/chat/completions', {model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo', messages: [{role: 'system', content: system}, {role: 'user', content: `Explain simply: ${prompt}`}]})).data?.choices?.[0]?.message?.content,
    async () => (await axios.post('https://openrouter.ai/api/v1/chat/completions', {model: 'meta-llama/llama-3.1-8b-instruct:free', messages: [{role: 'system', content: system}, {role: 'user', content: `Explain: ${prompt}`}]})).data?.choices?.[0]?.message?.content,
    async () => (await axios.post('https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct', {inputs: `Explain: ${prompt}`})).data?.[0]?.generated_text,
    async () => (await axios.post('https://api.deepai.org/api/text-generator', new URLSearchParams({text: `Explain: ${prompt}`}), {headers: {'api-key': 'quickstart-QUdJIGlzIGF3ZXNvbWU'}})).data?.output,
    async () => (await axios.post('https://api.groq.com/openai/v1/chat/completions', {model: 'llama-3.1-8b-instant', messages: [{role: 'system', content: system}, {role: 'user', content: `Explain simply: ${prompt}`}]}, {headers: {'Authorization': `Bearer ${process.env.GROQ_API_KEY}`}, timeout: 20000})).data?.choices?.[0]?.message?.content
  ]
  return callAPI(apis)
}

// 15. SUMMARIZE
async function cmd_summarize(prompt, system) {
  const apis = [
    async () => (await axios.get(`https://text.pollinations.ai/Summarize%20this%20text%3A%20${encodeURIComponent(prompt)}?system=${encodeURIComponent(system)}`)).data,
    async () => (await axios.post('https://api.together.xyz/v1/chat/completions', {model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo', messages: [{role: 'system', content: system}, {role: 'user', content: `Summarize: ${prompt}`}]})).data?.choices?.[0]?.message?.content,
    async () => (await axios.post('https://openrouter.ai/api/v1/chat/completions', {model: 'meta-llama/llama-3.1-8b-instruct:free', messages: [{role: 'system', content: system}, {role: 'user', content: `Summarize: ${prompt}`}]})).data?.choices?.[0]?.message?.content,
    async () => (await axios.post('https://api-inference.huggingface.co/models/facebook/bart-large-cnn', {inputs: prompt})).data?.[0]?.summary_text,
    async () => (await axios.post('https://api.deepai.org/api/summarization', new URLSearchParams({text: prompt}), {headers: {'api-key': 'quickstart-QUdJIGlzIGF3ZXNvbWU'}})).data?.output,
    async () => (await axios.post('https://api.groq.com/openai/v1/chat/completions', {model: 'llama-3.1-8b-instant', messages: [{role: 'system', content: system}, {role: 'user', content: `Summarize in 3 sentences: ${prompt}`}]}, {headers: {'Authorization': `Bearer ${process.env.GROQ_API_KEY}`}, timeout: 20000})).data?.choices?.[0]?.message?.content
  ]
  return callAPI(apis)
}

// 16. TRANSLATE
async function cmd_translate(prompt, system) {
  const apis = [
    async () => (await axios.get(`https://text.pollinations.ai/Translate%20this%20to%20English%3A%20${encodeURIComponent(prompt)}?system=${encodeURIComponent(system)}`)).data,
    async () => (await axios.post('https://api.together.xyz/v1/chat/completions', {model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo', messages: [{role: 'system', content: system}, {role: 'user', content: `Translate to English: ${prompt}`}]})).data?.choices?.[0]?.message?.content,
    async () => (await axios.post('https://openrouter.ai/api/v1/chat/completions', {model: 'meta-llama/llama-3.1-8b-instruct:free', messages: [{role: 'system', content: system}, {role: 'user', content: `Translate: ${prompt}`}]})).data?.choices?.[0]?.message?.content,
    async () => (await axios.post('https://api-inference.huggingface.co/models/Helsinki-NLP/opus-mt-mul-en', {inputs: prompt})).data?.[0]?.translation_text,
    async () => (await axios.post('https://api.mymemory.translated.net/get', {params: {q: prompt, langpair: 'auto|en'}})).data?.responseData?.translatedText,
    async () => (await axios.post('https://api.groq.com/openai/v1/chat/completions', {model: 'llama-3.1-8b-instant', messages: [{role: 'system', content: system}, {role: 'user', content: `Translate to English: ${prompt}`}]}, {headers: {'Authorization': `Bearer ${process.env.GROQ_API_KEY}`}, timeout: 20000})).data?.choices?.[0]?.message?.content
  ]
  return callAPI(apis)
}

// 17. HOMEWORK
async function cmd_homework(prompt, system) {
  const apis = [
    async () => (await axios.get(`https://text.pollinations.ai/Help%20with%20homework%3A%20${encodeURIComponent(prompt)}?system=${encodeURIComponent(system)}`)).data,
    async () => (await axios.post('https://api.together.xyz/v1/chat/completions', {model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo', messages: [{role: 'system', content: system}, {role: 'user', content: `Help with homework: ${prompt}`}]})).data?.choices?.[0]?.message?.content,
    async () => (await axios.post('https://openrouter.ai/api/v1/chat/completions', {model: 'anthropic/claude-3-haiku:free', messages: [{role: 'system', content: system}, {role: 'user', content: `Help with: ${prompt}`}]})).data?.choices?.[0]?.message?.content,
    async () => (await axios.post('https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct', {inputs: `Help with homework: ${prompt}`})).data?.[0]?.generated_text,
    async () => (await axios.post('https://api.deepai.org/api/text-generator', new URLSearchParams({text: `Homework help: ${prompt}`}), {headers: {'api-key': 'quickstart-QUdJIGlzIGF3ZXNvbWU'}})).data?.output,
    async () => (await axios.post('https://api.groq.com/openai/v1/chat/completions', {model: 'llama-3.1-70b-versatile', messages: [{role: 'system', content: system}, {role: 'user', content: `Help with homework: ${prompt}`}]}, {headers: {'Authorization': `Bearer ${process.env.GROQ_API_KEY}`}, timeout: 20000})).data?.choices?.[0]?.message?.content
  ]
  return callAPI(apis)
}

// 18. FIX
async function cmd_fix(prompt, system) {
  const apis = [
    async () => (await axios.get(`https://text.pollinations.ai/Fix%20this%20text%3A%20${encodeURIComponent(prompt)}?system=${encodeURIComponent(system)}`)).data,
    async () => (await axios.post('https://api.together.xyz/v1/chat/completions', {model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo', messages: [{role: 'system', content: system}, {role: 'user', content: `Fix grammar and improve: ${prompt}`}]})).data?.choices?.[0]?.message?.content,
    async () => (await axios.post('https://openrouter.ai/api/v1/chat/completions', {model: 'meta-llama/llama-3.1-8b-instruct:free', messages: [{role: 'system', content: system}, {role: 'user', content: `Fix: ${prompt}`}]})).data?.choices?.[0]?.message?.content,
    async () => (await axios.post('https://api-inference.huggingface.co/models/pszemraj/flan-t5-base-grammar', {inputs: prompt})).data?.[0]?.generated_text,
    async () => (await axios.post('https://api.deepai.org/api/text-generator', new URLSearchParams({text: `Fix grammar: ${prompt}`}), {headers: {'api-key': 'quickstart-QUdJIGlzIGF3ZXNvbWU'}})).data?.output,
    async () => (await axios.post('https://api.groq.com/openai/v1/chat/completions', {model: 'llama-3.1-8b-instant', messages: [{role: 'system', content: system}, {role: 'user', content: `Fix grammar and improve: ${prompt}`}]}, {headers: {'Authorization': `Bearer ${process.env.GROQ_API_KEY}`}, timeout: 20000})).data?.choices?.[0]?.message?.content
  ]
  return callAPI(apis)
}

// 19. REWRITE
async function cmd_rewrite(prompt, system) {
  const apis = [
    async () => (await axios.get(`https://text.pollinations.ai/Rewrite%20this%20better%3A%20${encodeURIComponent(prompt)}?system=${encodeURIComponent(system)}`)).data,
    async () => (await axios.post('https://api.together.xyz/v1/chat/completions', {model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo', messages: [{role: 'system', content: system}, {role: 'user', content: `Rewrite better: ${prompt}`}]})).data?.choices?.[0]?.message?.content,
    async () => (await axios.post('https://openrouter.ai/api/v1/chat/completions', {model: 'meta-llama/llama-3.1-8b-instruct:free', messages: [{role: 'system', content: system}, {role: 'user', content: `Paraphrase: ${prompt}`}]})).data?.choices?.[0]?.message?.content,
    async () => (await axios.post('https://api-inference.huggingface.co/models/pszemraj/led-base-book-summary', {inputs: prompt})).data?.[0]?.summary_text,
    async () => (await axios.post('https://api.deepai.org/api/text-generator', new URLSearchParams({text: `Paraphrase: ${prompt}`}), {headers: {'api-key': 'quickstart-QUdJIGlzIGF3ZXNvbWU'}})).data?.output,
    async () => (await axios.post('https://api.groq.com/openai/v1/chat/completions', {model: 'llama-3.1-8b-instant', messages: [{role: 'system', content: system}, {role: 'user', content: `Rewrite better: ${prompt}`}]}, {headers: {'Authorization': `Bearer ${process.env.GROQ_API_KEY}`}, timeout: 20000})).data?.choices?.[0]?.message?.content
  ]
  return callAPI(apis)
}

// 20. BRAIN
async function cmd_brain(prompt, system) {
  const apis = [
    async () => (await axios.get(`https://text.pollinations.ai/Brainstorm%20ideas%20for%3A%20${encodeURIComponent(prompt)}?system=${encodeURIComponent(system)}`)).data,
    async () => (await axios.post('https://api.together.xyz/v1/chat/completions', {model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo', messages: [{role: 'system', content: system}, {role: 'user', content: `Brainstorm ideas for: ${prompt}`}]})).data?.choices?.[0]?.message?.content,
    async () => (await axios.post('https://openrouter.ai/api/v1/chat/completions', {model: 'meta-llama/llama-3.1-8b-instruct:free', messages: [{role: 'system', content: system}, {role: 'user', content: `Give 5 creative ideas for: ${prompt}`}]})).data?.choices?.[0]?.message?.content,
    async () => (await axios.post('https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct', {inputs: `Brainstorm ideas for: ${prompt}`})).data?.[0]?.generated_text,
    async () => (await axios.post('https://api.deepai.org/api/text-generator', new URLSearchParams({text: `Ideas for: ${prompt}`}), {headers: {'api-key': 'quickstart-QUdJIGlzIGF3ZXNvbWU'}})).data?.output,
    async () => (await axios.post('https://api.groq.com/openai/v1/chat/completions', {model: 'llama-3.1-70b-versatile', messages: [{role: 'system', content: system}, {role: 'user', content: `Brainstorm 5 creative ideas for: ${prompt}`}]}, {headers: {'Authorization': `Bearer ${process.env.GROQ_API_KEY}`}, timeout: 20000})).data?.choices?.[0]?.message?.content
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

    // MENU - BOX kama aihub.js
    if (['aihub2'].includes(cmd)) {
      await sock.sendMessage(from, { react: { text: '📚', key: msg.key } })
      const menuText = `╭─⌈ 📚 *AI HUB PART 2* ⌋
│ 📋 *Available Commands (prefix: ${prefix})*
│ 📝 ${prefix}essay <topic> — Write essay
│ 💻 ${prefix}code <task> — Generate code
│ 🔢 ${prefix}math <problem> — Solve math
│ 💡 ${prefix}explain <topic> — Explain simply
│ 📄 ${prefix}summarize <text> — Summarize text
│ 🌐 ${prefix}translate <text> — Translate
│ 📖 ${prefix}homework <question> — HW help
│ ✏️ ${prefix}fix <text> — Fix grammar
│ 🔄 ${prefix}rewrite <text> — Paraphrase
│ 🧠 ${prefix}brain <topic> — Brainstorm ideas
╰⊷ *Powered By ${brandName}*`
      return await sock.sendMessage(from, { text: menuText }, { quoted: msg })
    }

    if (!input) {
      return sock.sendMessage(from, { text: `❌ Usage: ${prefix}${cmd} <your message>` }, { quoted: msg })
    }

    const system = `You are AI assistant for ${brandName}. User: ${msg.pushName || 'User'}. Reply in user's language. Be helpful and accurate.`

    await rct(sock, msg, '🧠')
    let result = null

    if (cmd === 'essay') result = await cmd_essay(input, system)
    else if (cmd === 'code') result = await cmd_code(input, system)
    else if (cmd === 'math') result = await cmd_math(input, system)
    else if (cmd === 'explain') result = await cmd_explain(input, system)
    else if (cmd === 'summarize') result = await cmd_summarize(input, system)
    else if (cmd === 'translate') result = await cmd_translate(input, system)
    else if (cmd === 'homework') result = await cmd_homework(input, system)
    else if (cmd === 'fix') result = await cmd_fix(input, system)
    else if (cmd === 'rewrite') result = await cmd_rewrite(input, system)
    else if (cmd === 'brain') result = await cmd_brain(input, system)

    if (!result) {
      await rct(sock, msg, '❌')
      return sock.sendMessage(from, { text: '> AI unavailable right now. Try again later.' }, { quoted: msg })
    }

    await sock.sendMessage(from, { text: result }, { quoted: msg })
    await rct(sock, msg, '✅').catch(() => {})

  } catch (err) {
    console.error('[AIHUB2 ERROR]', err.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Command error occurred.' }, { quoted: msg })
  }
}