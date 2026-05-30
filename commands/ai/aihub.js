import axios from 'axios'

export const name = 'aihub'
export const alias = [
  'aihub','ai','help',
  'gpt','claude','gemini','llama','mistral','deepseek','qwen','phi3'
]
export const category = 'AI'
export const desc = 'AI HUB PART 1 — 10 commands with Map conversations'

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

// 1. GPT - 5 fallbacks + Groq
async function cmd_gpt(prompt, system) {
  const apis = [
    async () => (await axios.get(`https://text.pollinations.ai/${encodeURIComponent(prompt)}?system=${encodeURIComponent(system)}&model=llama`)).data,
    async () => (await axios.post('https://api.together.xyz/v1/chat/completions', {model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo', messages: [{role: 'system', content: system}, {role: 'user', content: prompt}]})).data?.choices?.[0]?.message?.content,
    async () => (await axios.post('https://openrouter.ai/api/v1/chat/completions', {model: 'meta-llama/llama-3.1-8b-instruct:free', messages: [{role: 'system', content: system}, {role: 'user', content: prompt}]}, {headers: {'HTTP-Referer': 'https://wa.bot'}})).data?.choices?.[0]?.message?.content,
    async () => (await axios.post('https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct', {inputs: `${system}\nUser: ${prompt}`, parameters: {max_new_tokens: 500}})).data?.[0]?.generated_text,
    async () => (await axios.post('https://api.deepai.org/api/text-generator', new URLSearchParams({text: `${system}\nUser: ${prompt}`}), {headers: {'api-key': 'quickstart-QUdJIGlzIGF3ZXNvbWU'}})).data?.output,
    async () => (await axios.post('https://api.groq.com/openai/v1/chat/completions', {model: 'llama-3.3-70b-versatile', messages: [{role: 'system', content: system}, {role: 'user', content: prompt}]}, {headers: {'Authorization': `Bearer ${process.env.GROQ_API_KEY}`}, timeout: 20000})).data?.choices?.[0]?.message?.content
  ]
  return callAPI(apis)
}

// 2. CLAUDE
async function cmd_claude(prompt, system) {
  const apis = [
    async () => (await axios.get(`https://text.pollinations.ai/${encodeURIComponent(prompt)}?system=${encodeURIComponent(system)}&model=claude`)).data,
    async () => (await axios.post('https://api.together.xyz/v1/chat/completions', {model: 'NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO', messages: [{role: 'system', content: system}, {role: 'user', content: prompt}]})).data?.choices?.[0]?.message?.content,
    async () => (await axios.post('https://openrouter.ai/api/v1/chat/completions', {model: 'anthropic/claude-3-haiku:free', messages: [{role: 'system', content: system}, {role: 'user', content: prompt}]})).data?.choices?.[0]?.message?.content,
    async () => (await axios.post('https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1', {inputs: `${system}\nUser: ${prompt}`})).data?.[0]?.generated_text,
    async () => (await axios.post('https://api.deepai.org/api/text-generator', new URLSearchParams({text: prompt}), {headers: {'api-key': 'quickstart-QUdJIGlzIGF3ZXNvbWU'}})).data?.output,
    async () => (await axios.post('https://api.groq.com/openai/v1/chat/completions', {model: 'llama-3.1-70b-versatile', messages: [{role: 'system', content: system + ' You are Claude.'}, {role: 'user', content: prompt}]}, {headers: {'Authorization': `Bearer ${process.env.GROQ_API_KEY}`}, timeout: 20000})).data?.choices?.[0]?.message?.content
  ]
  return callAPI(apis)
}

// 3. GEMINI
async function cmd_gemini(prompt, system) {
  const apis = [
    async () => (await axios.get(`https://text.pollinations.ai/${encodeURIComponent(prompt)}?system=${encodeURIComponent(system)}&model=gemini`)).data,
    async () => (await axios.post('https://api.together.xyz/v1/chat/completions', {model: 'google/gemma-2-9b-it', messages: [{role: 'system', content: system}, {role: 'user', content: prompt}]})).data?.choices?.[0]?.message?.content,
    async () => (await axios.post('https://openrouter.ai/api/v1/chat/completions', {model: 'google/gemini-flash-1.5-8b:free', messages: [{role: 'system', content: system}, {role: 'user', content: prompt}]})).data?.choices?.[0]?.message?.content,
    async () => (await axios.post('https://api-inference.huggingface.co/models/google/gemma-2-2b-it', {inputs: `${system}\nUser: ${prompt}`})).data?.[0]?.generated_text,
    async () => (await axios.post('https://api.deepai.org/api/text-generator', new URLSearchParams({text: prompt}), {headers: {'api-key': 'quickstart-QUdJIGlzIGF3ZXNvbWU'}})).data?.output,
    async () => (await axios.post('https://api.groq.com/openai/v1/chat/completions', {model: 'gemma2-9b-it', messages: [{role: 'system', content: system}, {role: 'user', content: prompt}]}, {headers: {'Authorization': `Bearer ${process.env.GROQ_API_KEY}`}, timeout: 20000})).data?.choices?.[0]?.message?.content
  ]
  return callAPI(apis)
}

// 4. LLAMA
async function cmd_llama(prompt, system) {
  const apis = [
    async () => (await axios.get(`https://text.pollinations.ai/${encodeURIComponent(prompt)}?system=${encodeURIComponent(system)}&model=llama`)).data,
    async () => (await axios.post('https://api.together.xyz/v1/chat/completions', {model: 'meta-llama/Llama-3.2-3B-Instruct-Turbo', messages: [{role: 'system', content: system}, {role: 'user', content: prompt}]})).data?.choices?.[0]?.message?.content,
    async () => (await axios.post('https://openrouter.ai/api/v1/chat/completions', {model: 'meta-llama/llama-3.2-3b-instruct:free', messages: [{role: 'system', content: system}, {role: 'user', content: prompt}]})).data?.choices?.[0]?.message?.content,
    async () => (await axios.post('https://api-inference.huggingface.co/models/meta-llama/Llama-3.2-3B-Instruct', {inputs: `${system}\nUser: ${prompt}`})).data?.[0]?.generated_text,
    async () => (await axios.post('https://api.deepai.org/api/text-generator', new URLSearchParams({text: prompt}), {headers: {'api-key': 'quickstart-QUdJIGlzIGF3ZXNvbWU'}})).data?.output,
    async () => (await axios.post('https://api.groq.com/openai/v1/chat/completions', {model: 'llama-3.1-8b-instant', messages: [{role: 'system', content: system}, {role: 'user', content: prompt}]}, {headers: {'Authorization': `Bearer ${process.env.GROQ_API_KEY}`}, timeout: 20000})).data?.choices?.[0]?.message?.content
  ]
  return callAPI(apis)
}

// 5. MISTRAL
async function cmd_mistral(prompt, system) {
  const apis = [
    async () => (await axios.get(`https://text.pollinations.ai/${encodeURIComponent(prompt)}?system=${encodeURIComponent(system)}&model=mistral`)).data,
    async () => (await axios.post('https://api.together.xyz/v1/chat/completions', {model: 'mistralai/Mistral-7B-Instruct-v0.3', messages: [{role: 'system', content: system}, {role: 'user', content: prompt}]})).data?.choices?.[0]?.message?.content,
    async () => (await axios.post('https://openrouter.ai/api/v1/chat/completions', {model: 'mistralai/mistral-7b-instruct:free', messages: [{role: 'system', content: system}, {role: 'user', content: prompt}]})).data?.choices?.[0]?.message?.content,
    async () => (await axios.post('https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3', {inputs: `${system}\nUser: ${prompt}`})).data?.[0]?.generated_text,
    async () => (await axios.post('https://api.deepai.org/api/text-generator', new URLSearchParams({text: prompt}), {headers: {'api-key': 'quickstart-QUdJIGlzIGF3ZXNvbWU'}})).data?.output,
    async () => (await axios.post('https://api.groq.com/openai/v1/chat/completions', {model: 'mistral-saba-24b', messages: [{role: 'system', content: system}, {role: 'user', content: prompt}]}, {headers: {'Authorization': `Bearer ${process.env.GROQ_API_KEY}`}, timeout: 20000})).data?.choices?.[0]?.message?.content
  ]
  return callAPI(apis)
}

// 6. DEEPSEEK
async function cmd_deepseek(prompt, system) {
  const apis = [
    async () => (await axios.get(`https://text.pollinations.ai/${encodeURIComponent(prompt)}?system=${encodeURIComponent(system)}&model=deepseek`)).data,
    async () => (await axios.post('https://api.together.xyz/v1/chat/completions', {model: 'deepseek-ai/DeepSeek-V3', messages: [{role: 'system', content: system}, {role: 'user', content: prompt}]})).data?.choices?.[0]?.message?.content,
    async () => (await axios.post('https://openrouter.ai/api/v1/chat/completions', {model: 'deepseek/deepseek-chat:free', messages: [{role: 'system', content: system}, {role: 'user', content: prompt}]})).data?.choices?.[0]?.message?.content,
    async () => (await axios.post('https://api-inference.huggingface.co/models/deepseek-ai/DeepSeek-V3-Base', {inputs: `${system}\nUser: ${prompt}`})).data?.[0]?.generated_text,
    async () => (await axios.post('https://api.deepai.org/api/text-generator', new URLSearchParams({text: prompt}), {headers: {'api-key': 'quickstart-QUdJIGlzIGF3ZXNvbWU'}})).data?.output,
    async () => (await axios.post('https://api.groq.com/openai/v1/chat/completions', {model: 'deepseek-r1-distill-llama-70b', messages: [{role: 'system', content: system}, {role: 'user', content: prompt}]}, {headers: {'Authorization': `Bearer ${process.env.GROQ_API_KEY}`}, timeout: 20000})).data?.choices?.[0]?.message?.content
  ]
  return callAPI(apis)
}

// 7. QWEN
async function cmd_qwen(prompt, system) {
  const apis = [
    async () => (await axios.get(`https://text.pollinations.ai/${encodeURIComponent(prompt)}?system=${encodeURIComponent(system)}&model=qwen`)).data,
    async () => (await axios.post('https://api.together.xyz/v1/chat/completions', {model: 'Qwen/Qwen2.5-72B-Instruct-Turbo', messages: [{role: 'system', content: system}, {role: 'user', content: prompt}]})).data?.choices?.[0]?.message?.content,
    async () => (await axios.post('https://openrouter.ai/api/v1/chat/completions', {model: 'qwen/qwen-2.5-72b-instruct:free', messages: [{role: 'system', content: system}, {role: 'user', content: prompt}]})).data?.choices?.[0]?.message?.content,
    async () => (await axios.post('https://api-inference.huggingface.co/models/Qwen/Qwen2.5-72B-Instruct', {inputs: `${system}\nUser: ${prompt}`})).data?.[0]?.generated_text,
    async () => (await axios.post('https://api.deepai.org/api/text-generator', new URLSearchParams({text: prompt}), {headers: {'api-key': 'quickstart-QUdJIGlzIGF3ZXNvbWU'}})).data?.output,
    async () => (await axios.post('https://api.groq.com/openai/v1/chat/completions', {model: 'qwen-2.5-32b', messages: [{role: 'system', content: system}, {role: 'user', content: prompt}]}, {headers: {'Authorization': `Bearer ${process.env.GROQ_API_KEY}`}, timeout: 20000})).data?.choices?.[0]?.message?.content
  ]
  return callAPI(apis)
}

// 8. PHI3
async function cmd_phi3(prompt, system) {
  const apis = [
    async () => (await axios.get(`https://text.pollinations.ai/${encodeURIComponent(prompt)}?system=${encodeURIComponent(system)}&model=phi3`)).data,
    async () => (await axios.post('https://api.together.xyz/v1/chat/completions', {model: 'microsoft/Phi-3-mini-4k-instruct', messages: [{role: 'system', content: system}, {role: 'user', content: prompt}]})).data?.choices?.[0]?.message?.content,
    async () => (await axios.post('https://openrouter.ai/api/v1/chat/completions', {model: 'microsoft/phi-3-mini-128k-instruct:free', messages: [{role: 'system', content: system}, {role: 'user', content: prompt}]})).data?.choices?.[0]?.message?.content,
    async () => (await axios.post('https://api-inference.huggingface.co/models/microsoft/Phi-3-mini-4k-instruct', {inputs: `${system}\nUser: ${prompt}`})).data?.[0]?.generated_text,
    async () => (await axios.post('https://api.deepai.org/api/text-generator', new URLSearchParams({text: prompt}), {headers: {'api-key': 'quickstart-QUdJIGlzIGF3ZXNvbWU'}})).data?.output,
    async () => (await axios.post('https://api.groq.com/openai/v1/chat/completions', {model: 'phi3-medium-4k-instruct', messages: [{role: 'system', content: system}, {role: 'user', content: prompt}]}, {headers: {'Authorization': `Bearer ${process.env.GROQ_API_KEY}`}, timeout: 20000})).data?.choices?.[0]?.message?.content
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

    // MENU - BOX kama 7photo yako
    if (['aihub','ai','help'].includes(cmd)) {
      await sock.sendMessage(from, { react: { text: '🤖', key: msg.key } })
      const menuText = `╭─⌈ 🤖 *AI HUB* ⌋
│ 📋 *Available Commands (prefix: ${prefix})*
│ 🤖 ${prefix}gpt <text> — GPT-4 style AI
│ 🎭 ${prefix}claude <text> — Claude style AI
│ ✨ ${prefix}gemini <text> — Gemini style AI
│ 🦙 ${prefix}llama <text> — Llama AI
│ 🌪️ ${prefix}mistral <text> — Mistral AI
│ 🔍 ${prefix}deepseek <text> — Deep reasoning
│ 🐼 ${prefix}qwen <text> — Qwen AI
│ 📱 ${prefix}phi3 <text> — Microsoft Phi-3
╰⊷ *Powered By ${brandName}*`
      return await sock.sendMessage(from, { text: menuText }, { quoted: msg })
    }

    if (!input) {
      return sock.sendMessage(from, { text: `❌ Usage: ${prefix}${cmd} <your message>` }, { quoted: msg })
    }

    const system = `You are AI assistant for ${brandName}. User: ${msg.pushName || 'User'}. Reply in user's language. Keep 2-3 paragraphs max. Be helpful.`

    await rct(sock, msg, '🧠')
    let result = null

    if (cmd === 'gpt') result = await cmd_gpt(input, system)
    else if (cmd === 'claude') result = await cmd_claude(input, system)
    else if (cmd === 'gemini') result = await cmd_gemini(input, system)
    else if (cmd === 'llama') result = await cmd_llama(input, system)
    else if (cmd === 'mistral') result = await cmd_mistral(input, system)
    else if (cmd === 'deepseek') result = await cmd_deepseek(input, system)
    else if (cmd === 'qwen') result = await cmd_qwen(input, system)
    else if (cmd === 'phi3') result = await cmd_phi3(input, system)

    if (!result) {
      await rct(sock, msg, '❌')
      return sock.sendMessage(from, { text: '> AI unavailable right now. Try again later.' }, { quoted: msg })
    }

    await sock.sendMessage(from, { text: result }, { quoted: msg })
    await rct(sock, msg, '✅').catch(() => {})

  } catch (err) {
    console.error('[AIHUB ERROR]', err.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Command error occurred.' }, { quoted: msg })
  }
}