// commands/creator/creator.js
// 70 sub-commands | sharp + ffmpeg + axios | No canvas | RAM-safe
// Prefix from Supabase | Same pattern as photo.js | Baileys 6.7.x+

import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { tmpdir } from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'
import FormData from 'form-data'
import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'crypto'

export const name = 'creator'
export const alias = [
  // Image
  'watermark','resize','rotate','flip','grayscale','invert','brightness',
  'contrast','saturation','vignette','vintage','sepia','glitch','mirror',
  'frame','circle','deepfry','jpegify','thumbnail2',
  // Video
  'trim','gif2mp4','mp42gif','videothumb','extractaudio','mute','vidspeed',
  'vidreverse',
  // Audio
  'audiotrim','audioboost','audioreverse','audiospeed','pitch','echo',
  'bass','normalize','stt',
  // Documents
  'pdf2img','pdf2txt','img2pdf','wordcount','jsonformat','csvtotext',
  // Web
  'screenshot2','shorten2','webmeta','webstatus','dnscheck','iplookup2',
  'carbon2',
  // AI
  'summarize2','rewrite2','grammar2','formal2','casual2','bullet2',
  'story2','essay2','email3','caption3','hashtags2','codegen2',
  'debugcode2','translate3',
  // Charts
  'piechart2','barchart2','linechart2','progressbar2','wordcloud2',
  // Cards / Text effects
  'neontext2','fire3','quote3','birthday2','flyer2','announcement2',
  // Security
  'encrypt2','decrypt2','hash3','randomkey2','otp2',
  // Network
  'ping3','myip2','subnet2','emailverify2',
  // Help
  'creatorhelp'
]
export const category = 'Creator'
export const desc = '70 creator tools — image, video, audio, AI, charts, security & more'

// ══════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════
const execAsync = promisify(exec)
const TMP = tmpdir()
const TOUT = 18000

const tmpF = (ext = 'jpg') =>
  path.join(TMP, `cr_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`)

function gc(...files) {
  for (const f of files) {
    try { if (f && fs.existsSync(f)) fs.unlinkSync(f) } catch {}
  }
}

async function dlBuf(url, opts = {}) {
  const r = await axios.get(url, {
    responseType: 'arraybuffer', timeout: 30000,
    headers: { 'User-Agent': 'Mozilla/5.0', ...opts.headers },
    maxContentLength: 100 * 1024 * 1024, ...opts
  })
  return { buf: Buffer.from(r.data), ct: r.headers['content-type'] || '' }
}

function extractUrl(t) { return t?.match(/https?:\/\/[^\s]+/)?.[0] ?? null }

function getQuotedText(msg) {
  const q = msg?.message?.extendedTextMessage?.contextInfo
  return q?.quotedMessage?.conversation ||
    q?.quotedMessage?.extendedTextMessage?.text || null
}

async function getMedia(sock, msg, type = 'image') {
  const m = msg?.message
  const q = m?.extendedTextMessage?.contextInfo?.quotedMessage
  const mediaMsg =
    m?.imageMessage || m?.stickerMessage || m?.videoMessage ||
    m?.audioMessage || m?.documentMessage ||
    q?.imageMessage || q?.stickerMessage || q?.videoMessage ||
    q?.audioMessage || q?.documentMessage || null

  if (!mediaMsg) {
    const txt = m?.conversation || m?.extendedTextMessage?.text || ''
    const url = extractUrl(txt)
    if (url) { const { buf, ct } = await dlBuf(url); return { buf, ct } }
    return null
  }
  try {
    const { downloadMediaMessage } = await import('@whiskeysockets/baileys')
    const src = (m?.imageMessage || m?.videoMessage || m?.audioMessage || m?.documentMessage)
      ? msg : { ...msg, message: q }
    const stream = await downloadMediaMessage(src, 'buffer', {},
      { logger: { info(){}, warn(){}, error(){}, debug(){}, child(){ return this } },
        reuploadRequest: sock.updateMediaMessage })
    return { buf: Buffer.isBuffer(stream) ? stream : Buffer.from(stream), ct: '' }
  } catch {}
  try {
    const { downloadContentFromMessage } = await import('@whiskeysockets/baileys')
    const srcMsg = m?.imageMessage || q?.imageMessage || mediaMsg
    const mType = (m?.stickerMessage || q?.stickerMessage) ? 'sticker' : type
    const stream = await downloadContentFromMessage(srcMsg, mType)
    const chunks = []; for await (const c of stream) chunks.push(c)
    return { buf: Buffer.concat(chunks), ct: '' }
  } catch {}
  return null
}

function box(title, lines, brand) {
  const clean = (Array.isArray(lines) ? lines : [lines]).filter(l => l != null && l !== '')
  return `╭─⌈ CONSOLE *${title.toUpperCase()}* ⌋\n` +
    clean.map(l => `│ ${l}`).join('\n') +
    `\n╰⊷ *Powered By ${brand}*`
}

async function rct(sock, msg, emoji) {
  try { await sock.sendMessage(msg.key?.remoteJid, { react: { text: emoji, key: msg.key } }) } catch {}
}

const sendImg = (sock, from, msg, buf, cap) =>
  sock.sendMessage(from, { image: buf, caption: cap }, { quoted: msg })
const sendVid = (sock, from, msg, buf, cap) =>
  sock.sendMessage(from, { video: buf, caption: cap, mimetype: 'video/mp4' }, { quoted: msg })
const sendAud = (sock, from, msg, buf, fname) =>
  sock.sendMessage(from, { audio: buf, mimetype: 'audio/mpeg', ptt: false, fileName: fname }, { quoted: msg })
const sendDoc = (sock, from, msg, buf, fname, mime = 'application/octet-stream') =>
  sock.sendMessage(from, { document: buf, mimetype: mime, fileName: fname }, { quoted: msg })

async function getSharp() {
  try { return (await import('sharp')).default } catch { return null }
}
async function hasFF() {
  try { await execAsync('ffmpeg -version', { timeout: 4000 }); return true } catch { return false }
}

// ══════════════════════════════════════════
// IMAGE TOOLS
// ══════════════════════════════════════════

async function doWatermark(buf, text) {
  const sharp = await getSharp(); if (!sharp) return null
  try {
    const meta = await sharp(buf).metadata()
    const w = meta.width || 800; const h = meta.height || 600
    const fs2 = Math.max(18, Math.floor(w / 22))
    const svg = Buffer.from(
      `<svg width="${w}" height="${h}">
        <text x="12" y="${h - 14}" font-size="${fs2}" font-family="Arial" font-weight="bold"
          fill="white" fill-opacity="0.65">${text.replace(/[<>&"]/g,'')}</text>
        <text x="${w*0.5}" y="${h*0.55}" font-size="${fs2*2}" font-family="Arial" font-weight="bold"
          fill="white" fill-opacity="0.10" transform="rotate(-30,${w*0.5},${h*0.55})">${text.replace(/[<>&"]/g,'')}</text>
      </svg>`
    )
    return await sharp(buf).composite([{ input: svg, blend: 'over' }]).jpeg({ quality: 90 }).toBuffer()
  } catch { return null }
}

async function sharpOp(buf, op, params = {}) {
  const sharp = await getSharp(); if (!sharp) return null
  try {
    let s = sharp(buf)
    if (op === 'resize')    s = s.resize(params.w, params.h, { fit: 'inside' })
    if (op === 'rotate')    s = s.rotate(params.deg, { background: { r:0,g:0,b:0,alpha:0 } })
    if (op === 'flip')      s = params.dir === 'v' ? s.flip() : s.flop()
    if (op === 'grayscale') s = s.grayscale()
    if (op === 'invert')    s = s.negate()
    if (op === 'brightness')s = s.modulate({ brightness: params.v })
    if (op === 'contrast')  s = s.linear(params.v, -(128*params.v)+128)
    if (op === 'saturation')s = s.modulate({ saturation: params.v })
    if (op === 'sepia')     s = s.grayscale().tint({ r:112,g:66,b:20 })
    if (op === 'vintage')   s = s.modulate({ saturation:0.7, brightness:0.95 }).tint({ r:255,g:220,b:180 })
    if (op === 'deepfry')   s = s.modulate({ saturation:5,brightness:1.3 }).sharpen({ sigma:5 })
    if (op === 'jpegify')   return await sharp(buf).jpeg({ quality:3 }).toBuffer()
    if (op === 'thumbnail') s = s.resize(params.size, params.size, { fit:'cover' })
    if (op === 'frame')     s = s.extend({ top:params.sz, bottom:params.sz, left:params.sz, right:params.sz, background: params.color || { r:255,g:255,b:255 } })
    if (op === 'circle') {
      const meta = await sharp(buf).metadata()
      const size = Math.min(meta.width||400, meta.height||400)
      const mask = Buffer.from(`<svg><circle cx="${size/2}" cy="${size/2}" r="${size/2}"/></svg>`)
      return await sharp(buf).resize(size,size,{fit:'cover'}).composite([{input:mask,blend:'dest-in'}]).png().toBuffer()
    }
    if (op === 'vignette') {
      const meta = await sharp(buf).metadata()
      const w2 = meta.width||800; const h2 = meta.height||600
      const svg = Buffer.from(`<svg width="${w2}" height="${h2}"><defs><radialGradient id="g" cx="50%" cy="50%" r="70%"><stop offset="0%" stop-color="black" stop-opacity="0"/><stop offset="100%" stop-color="black" stop-opacity="0.7"/></radialGradient></defs><rect width="${w2}" height="${h2}" fill="url(#g)"/></svg>`)
      return await sharp(buf).composite([{input:svg,blend:'multiply'}]).jpeg({quality:90}).toBuffer()
    }
    if (op === 'glitch') {
      return await sharp(buf).modulate({ saturation:2 }).sharpen({ sigma:2 }).jpeg({ quality:85 }).toBuffer()
    }
    if (op === 'mirror') {
      const meta = await sharp(buf).metadata()
      const half = Math.floor((meta.width||400)/2)
      const left = await sharp(buf).extract({ left:0, top:0, width:half, height:meta.height||400 }).toBuffer()
      const right = await sharp(left).flop().toBuffer()
      return await sharp({ create:{ width:meta.width||400, height:meta.height||400, channels:3, background:{r:0,g:0,b:0} } })
        .composite([{input:left,left:0,top:0},{input:right,left:half,top:0}]).jpeg({quality:90}).toBuffer()
    }
    return await s.jpeg({ quality: 90 }).toBuffer()
  } catch { return null }
}

// ══════════════════════════════════════════
// VIDEO TOOLS (ffmpeg)
// ══════════════════════════════════════════

async function ffmpegOp(buf, inExt, outExt, filter, timeout = 90000) {
  const inp = tmpF(inExt); const out = tmpF(outExt)
  fs.writeFileSync(inp, buf)
  try {
    await execAsync(`ffmpeg -i "${inp}" ${filter} "${out}" -y`, { timeout })
    const b = fs.readFileSync(out); gc(inp, out); return b
  } catch (e) { gc(inp, out); throw e }
}

// ══════════════════════════════════════════
// AI HELPER
// ══════════════════════════════════════════

async function aiText(prompt, sys = '') {
  const tries = [
    async () => {
      const r = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-3.5-turbo', max_tokens: 400,
        messages: [...(sys ? [{role:'system',content:sys}] : []), {role:'user',content:prompt}]
      }, { headers:{ Authorization:`Bearer ${process.env.OPENAI_KEY||''}` }, timeout:18000 })
      return r.data?.choices?.[0]?.message?.content
    },
    async () => {
      const r = await axios.post('https://api.anthropic.com/v1/messages', {
        model:'claude-haiku-20240307', max_tokens:400,
        messages:[{role:'user',content:`${sys}\n${prompt}`}]
      }, { headers:{ 'x-api-key':process.env.ANTHROPIC_KEY||'', 'anthropic-version':'2023-06-01' }, timeout:18000 })
      return r.data?.content?.[0]?.text
    },
    async () => {
      const r = await axios.post('https://api.together.xyz/v1/chat/completions', {
        model:'mistralai/Mistral-7B-Instruct-v0.2', max_tokens:300,
        messages:[{role:'user',content:`${sys}\n${prompt}`}]
      }, { headers:{ Authorization:`Bearer ${process.env.TOGETHER_KEY||''}` }, timeout:18000 })
      return r.data?.choices?.[0]?.message?.content
    },
    async () => {
      const r = await axios.post('https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2',
        { inputs: prompt, parameters:{ max_new_tokens:250 } },
        { headers:{ Authorization:`Bearer ${process.env.HF_TOKEN||''}` }, timeout:25000 }
      )
      return r.data?.[0]?.generated_text?.split(prompt)?.[1]?.trim()
    }
  ]
  for (const t of tries) {
    try { const r = await t(); if (r?.trim()) return r.trim() } catch {}
  }
  return null
}

// ══════════════════════════════════════════
// CHART HELPER
// ══════════════════════════════════════════

async function makeChart(type, labels, data, title = '') {
  const cfg = {
    type,
    data: {
      labels,
      datasets: [{
        label: title, data,
        backgroundColor: ['#7B2FBE','#FF6384','#36A2EB','#FFCE56','#4BC0C0','#FF9F40','#9966FF','#FF6B6B'],
        borderColor: '#fff', borderWidth: 2
      }]
    },
    options: {
      plugins: {
        title: { display:!!title, text:title, color:'#fff' },
        legend: { labels:{ color:'#fff' } }
      },
      scales: (type!=='pie'&&type!=='doughnut') ? {
        x:{ ticks:{color:'#ccc'}, grid:{color:'#333'} },
        y:{ ticks:{color:'#ccc'}, grid:{color:'#333'} }
      } : undefined,
      backgroundColor: '#1a1a2e'
    }
  }
  const tries = [
    async () => {
      const url = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(cfg))}&width=700&height=420&backgroundColor=%231a1a2e`
      const { buf } = await dlBuf(url); return buf
    },
    async () => {
      const r = await axios.post('https://quickchart.io/chart/create', { chart:cfg, width:700, height:420, backgroundColor:'#1a1a2e' }, { timeout:18000 })
      const url = r.data?.url; if (!url) return null
      const { buf } = await dlBuf(url); return buf
    }
  ]
  for (const t of tries) { try { const b = await t(); if (b?.length>500) return b } catch {} }
  return null
}

// ══════════════════════════════════════════
// SECURITY HELPERS
// ══════════════════════════════════════════

function encrypt(text, key) {
  try {
    const k = createHash('sha256').update(key).digest()
    const iv = randomBytes(16)
    const c = createCipheriv('aes-256-cbc', k, iv)
    return iv.toString('hex') + ':' + Buffer.concat([c.update(text,'utf8'), c.final()]).toString('hex')
  } catch { return null }
}

function decrypt(enc, key) {
  try {
    const [ivH, encH] = enc.split(':')
    const k = createHash('sha256').update(key).digest()
    const d = createDecipheriv('aes-256-cbc', k, Buffer.from(ivH,'hex'))
    return Buffer.concat([d.update(Buffer.from(encH,'hex')), d.final()]).toString('utf8')
  } catch { return null }
}

function doHash(text, algo = 'all') {
  const algos = ['md5','sha1','sha256','sha512']
  if (algo === 'all') return algos.map(a => `${a.toUpperCase()}: ${createHash(a).update(text).digest('hex')}`).join('\n')
  try { return `${algo.toUpperCase()}: ${createHash(algo).update(text).digest('hex')}` } catch { return null }
}

// ══════════════════════════════════════════
// MAIN HANDLER
// ══════════════════════════════════════════

export default async function creator(sock, ctx, botSettings) {
  const { msg, from } = ctx

  const prefix = botSettings?.prefix ?? '.'
  const brand  = botSettings?.brand_name ?? botSettings?.botname ?? 'Bot'

  const body =
    msg?.message?.conversation ||
    msg?.message?.extendedTextMessage?.text ||
    msg?.message?.imageMessage?.caption ||
    msg?.message?.videoMessage?.caption ||
    msg?.message?.buttonsResponseMessage?.selectedButtonId ||
    msg?.message?.listResponseMessage?.singleSelectReply?.selectedRowId || ''

  if (!body?.startsWith(prefix)) return

  const parts   = body.slice(prefix.length).trim().split(/\s+/)
  const cmd     = parts[0]?.toLowerCase()
  const args    = parts.slice(1)
  const argText = args.join(' ').trim()

  if (!cmd) return

  const CMDS = new Set(creator.alias || alias)
  if (!CMDS.has(cmd)) return

  const R  = (lines) => sock.sendMessage(from, { text: box(cmd, Array.isArray(lines)?lines:[lines], brand) }, { quoted: msg })
  const Er = (m)     => R([`❌ ${m}`])
  const Nd = (u)     => R([`⚠ Usage: ${prefix}${u}`, `💡 Or reply to media with the command`])

  // ─── IMAGE ───────────────────────────────

  if (cmd === 'watermark') {
    await rct(sock, msg, '🖼️')
    const media = await getMedia(sock, msg)
    if (!media?.buf) return Nd('watermark [text] — reply to image')
    const text = argText || brand
    const res = await doWatermark(media.buf, text)
    if (!res) return Er('Watermark failed — sharp required')
    return sendImg(sock, from, msg, res, box('WATERMARK', [`✅ "${text}"`], brand))
  }

  if (cmd === 'resize') {
    await rct(sock, msg, '🔧')
    const media = await getMedia(sock, msg)
    if (!media?.buf) return Nd('resize <width> <height> — reply to image')
    const [w, h] = args.map(Number)
    if (!w) return Nd('resize <width> [height]')
    const res = await sharpOp(media.buf, 'resize', { w, h: h||w })
    if (!res) return Er('Resize failed')
    return sendImg(sock, from, msg, res, box('RESIZE', [`✅ ${w}×${h||w}px`], brand))
  }

  if (cmd === 'rotate') {
    await rct(sock, msg, '🔄')
    const media = await getMedia(sock, msg)
    if (!media?.buf) return Nd('rotate <degrees> — reply to image')
    const deg = parseInt(argText) || 90
    const res = await sharpOp(media.buf, 'rotate', { deg })
    if (!res) return Er('Rotate failed')
    return sendImg(sock, from, msg, res, box('ROTATE', [`✅ ${deg}°`], brand))
  }

  if (cmd === 'flip') {
    await rct(sock, msg, '🔀')
    const media = await getMedia(sock, msg)
    if (!media?.buf) return Nd('flip [v|h] — reply to image')
    const dir = args[0]?.toLowerCase() === 'v' ? 'v' : 'h'
    const res = await sharpOp(media.buf, 'flip', { dir })
    if (!res) return Er('Flip failed')
    return sendImg(sock, from, msg, res, box('FLIP', [`✅ ${dir==='v'?'Vertical':'Horizontal'}`], brand))
  }

  if (cmd === 'grayscale') {
    await rct(sock, msg, '⬛')
    const media = await getMedia(sock, msg)
    if (!media?.buf) return Nd('grayscale — reply to image')
    const res = await sharpOp(media.buf, 'grayscale')
    if (!res) return Er('Failed')
    return sendImg(sock, from, msg, res, box('GRAYSCALE', ['✅ B&W converted'], brand))
  }

  if (cmd === 'invert') {
    await rct(sock, msg, '🔲')
    const media = await getMedia(sock, msg)
    if (!media?.buf) return Nd('invert — reply to image')
    const res = await sharpOp(media.buf, 'invert')
    if (!res) return Er('Failed')
    return sendImg(sock, from, msg, res, box('INVERT', ['✅ Colors inverted'], brand))
  }

  if (cmd === 'brightness') {
    await rct(sock, msg, '☀️')
    const media = await getMedia(sock, msg)
    if (!media?.buf) return Nd('brightness <0.1-3.0> — reply to image')
    const v = parseFloat(argText) || 1.3
    const res = await sharpOp(media.buf, 'brightness', { v })
    if (!res) return Er('Failed')
    return sendImg(sock, from, msg, res, box('BRIGHTNESS', [`✅ Level: ${v}`], brand))
  }

  if (cmd === 'contrast') {
    await rct(sock, msg, '🌓')
    const media = await getMedia(sock, msg)
    if (!media?.buf) return Nd('contrast <0.1-3.0> — reply to image')
    const v = parseFloat(argText) || 1.5
    const res = await sharpOp(media.buf, 'contrast', { v })
    if (!res) return Er('Failed')
    return sendImg(sock, from, msg, res, box('CONTRAST', [`✅ Level: ${v}`], brand))
  }

  if (cmd === 'saturation') {
    await rct(sock, msg, '🌈')
    const media = await getMedia(sock, msg)
    if (!media?.buf) return Nd('saturation <0.0-5.0> — reply to image')
    const v = parseFloat(argText) || 1.5
    const res = await sharpOp(media.buf, 'saturation', { v })
    if (!res) return Er('Failed')
    return sendImg(sock, from, msg, res, box('SATURATION', [`✅ Level: ${v}`], brand))
  }

  if (cmd === 'vignette') {
    await rct(sock, msg, '🖼️')
    const media = await getMedia(sock, msg)
    if (!media?.buf) return Nd('vignette — reply to image')
    const res = await sharpOp(media.buf, 'vignette')
    if (!res) return Er('Failed')
    return sendImg(sock, from, msg, res, box('VIGNETTE', ['✅ Applied'], brand))
  }

  if (cmd === 'vintage') {
    await rct(sock, msg, '📷')
    const media = await getMedia(sock, msg)
    if (!media?.buf) return Nd('vintage — reply to image')
    const res = await sharpOp(media.buf, 'vintage')
    if (!res) return Er('Failed')
    return sendImg(sock, from, msg, res, box('VINTAGE', ['✅ Vintage effect'], brand))
  }

  if (cmd === 'sepia') {
    await rct(sock, msg, '🟫')
    const media = await getMedia(sock, msg)
    if (!media?.buf) return Nd('sepia — reply to image')
    const res = await sharpOp(media.buf, 'sepia')
    if (!res) return Er('Failed')
    return sendImg(sock, from, msg, res, box('SEPIA', ['✅ Sepia tone'], brand))
  }

  if (cmd === 'glitch') {
    await rct(sock, msg, '📺')
    const media = await getMedia(sock, msg)
    if (!media?.buf) return Nd('glitch — reply to image')
    const res = await sharpOp(media.buf, 'glitch')
    if (!res) return Er('Failed')
    return sendImg(sock, from, msg, res, box('GLITCH', ['✅ Glitch effect'], brand))
  }

  if (cmd === 'mirror') {
    await rct(sock, msg, '🪞')
    const media = await getMedia(sock, msg)
    if (!media?.buf) return Nd('mirror — reply to image')
    const res = await sharpOp(media.buf, 'mirror')
    if (!res) return Er('Failed')
    return sendImg(sock, from, msg, res, box('MIRROR', ['✅ Mirror effect'], brand))
  }

  if (cmd === 'frame') {
    await rct(sock, msg, '🖼️')
    const media = await getMedia(sock, msg)
    if (!media?.buf) return Nd('frame [color] [size] — reply to image')
    const color = args[0] || 'white'
    const sz = parseInt(args[1]) || 20
    const colorMap = { white:{r:255,g:255,b:255}, black:{r:0,g:0,b:0}, gold:{r:255,g:215,b:0}, red:{r:255,g:0,b:0} }
    const res = await sharpOp(media.buf, 'frame', { sz, color: colorMap[color]||colorMap.white })
    if (!res) return Er('Failed')
    return sendImg(sock, from, msg, res, box('FRAME', [`✅ ${color} ${sz}px border`], brand))
  }

  if (cmd === 'circle') {
    await rct(sock, msg, '⭕')
    const media = await getMedia(sock, msg)
    if (!media?.buf) return Nd('circle — reply to image')
    const res = await sharpOp(media.buf, 'circle')
    if (!res) return Er('Failed')
    return sendImg(sock, from, msg, res, box('CIRCLE', ['✅ Circle crop'], brand))
  }

  if (cmd === 'deepfry') {
    await rct(sock, msg, '🍳')
    const media = await getMedia(sock, msg)
    if (!media?.buf) return Nd('deepfry — reply to image')
    const res = await sharpOp(media.buf, 'deepfry')
    if (!res) return Er('Failed')
    return sendImg(sock, from, msg, res, box('DEEPFRY', ['✅ Deep fried 🍳'], brand))
  }

  if (cmd === 'jpegify') {
    await rct(sock, msg, '😬')
    const media = await getMedia(sock, msg)
    if (!media?.buf) return Nd('jpegify — reply to image')
    const res = await sharpOp(media.buf, 'jpegify')
    if (!res) return Er('Failed')
    return sendImg(sock, from, msg, res, box('JPEGIFY', ['✅ Max compression 😬'], brand))
  }

  if (cmd === 'thumbnail2') {
    await rct(sock, msg, '🖼️')
    const media = await getMedia(sock, msg)
    if (!media?.buf) return Nd('thumbnail2 [size] — reply to image')
    const size = parseInt(argText) || 300
    const res = await sharpOp(media.buf, 'thumbnail', { size })
    if (!res) return Er('Failed')
    return sendImg(sock, from, msg, res, box('THUMBNAIL', [`✅ ${size}×${size}px`], brand))
  }

  // ─── VIDEO ───────────────────────────────

  if (cmd === 'trim') {
    await rct(sock, msg, '✂️')
    if (!(await hasFF())) return Er('ffmpeg not available on server')
    const media = await getMedia(sock, msg, 'video')
    if (!media?.buf) return Nd('trim <start> <end> — reply to video (seconds)')
    const [s, e] = args.map(Number)
    if (!e) return Nd('trim <start_sec> <end_sec>')
    try {
      const res = await ffmpegOp(media.buf, 'mp4', 'mp4', `-ss ${s} -to ${e} -c copy`)
      return sendVid(sock, from, msg, res, box('TRIM', [`✅ ${s}s → ${e}s`], brand))
    } catch { return Er('Trim failed') }
  }

  if (cmd === 'gif2mp4') {
    await rct(sock, msg, '🎬')
    if (!(await hasFF())) return Er('ffmpeg not available')
    const media = await getMedia(sock, msg, 'image')
    if (!media?.buf) return Nd('gif2mp4 — reply to a GIF')
    try {
      const res = await ffmpegOp(media.buf, 'gif', 'mp4', `-movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2"`)
      return sendVid(sock, from, msg, res, box('GIF2MP4', ['✅ Converted to MP4'], brand))
    } catch { return Er('GIF to MP4 failed') }
  }

  if (cmd === 'mp42gif') {
    await rct(sock, msg, '🎞️')
    if (!(await hasFF())) return Er('ffmpeg not available')
    const media = await getMedia(sock, msg, 'video')
    if (!media?.buf) return Nd('mp42gif — reply to video')
    try {
      const res = await ffmpegOp(media.buf, 'mp4', 'gif', `-vf "fps=10,scale=320:-1:flags=lanczos" -loop 0`, 120000)
      await sock.sendMessage(from, { image: res, caption: box('MP42GIF', ['✅ Video → GIF'], brand) }, { quoted: msg })
    } catch { return Er('MP4 to GIF failed') }
    return
  }

  if (cmd === 'videothumb') {
    await rct(sock, msg, '🖼️')
    if (!(await hasFF())) return Er('ffmpeg not available')
    const media = await getMedia(sock, msg, 'video')
    if (!media?.buf) return Nd('videothumb [second] — reply to video')
    const sec = parseInt(argText) || 1
    try {
      const res = await ffmpegOp(media.buf, 'mp4', 'jpg', `-ss ${sec} -vframes 1`, 30000)
      return sendImg(sock, from, msg, res, box('VIDEOTHUMB', [`✅ Frame at ${sec}s`], brand))
    } catch { return Er('Thumbnail extraction failed') }
  }

  if (cmd === 'extractaudio') {
    await rct(sock, msg, '🎵')
    if (!(await hasFF())) return Er('ffmpeg not available')
    const media = await getMedia(sock, msg, 'video')
    if (!media?.buf) return Nd('extractaudio — reply to video')
    try {
      const res = await ffmpegOp(media.buf, 'mp4', 'mp3', `-q:a 0 -map a`)
      return sendAud(sock, from, msg, res, 'audio.mp3')
    } catch { return Er('Audio extraction failed') }
  }

  if (cmd === 'mute') {
    await rct(sock, msg, '🔇')
    if (!(await hasFF())) return Er('ffmpeg not available')
    const media = await getMedia(sock, msg, 'video')
    if (!media?.buf) return Nd('mute — reply to video')
    try {
      const res = await ffmpegOp(media.buf, 'mp4', 'mp4', `-an -c:v copy`)
      return sendVid(sock, from, msg, res, box('MUTE', ['✅ Audio removed'], brand))
    } catch { return Er('Mute failed') }
  }

  if (cmd === 'vidspeed') {
    await rct(sock, msg, '⚡')
    if (!(await hasFF())) return Er('ffmpeg not available')
    const media = await getMedia(sock, msg, 'video')
    if (!media?.buf) return Nd('vidspeed <factor> — reply to video (0.5–4)')
    const f = Math.min(Math.max(parseFloat(argText)||2, 0.25), 4)
    const vpts = (1/f).toFixed(3)
    const atempo = Math.min(Math.max(f, 0.5), 2).toFixed(2)
    try {
      const res = await ffmpegOp(media.buf, 'mp4', 'mp4', `-filter_complex "[0:v]setpts=${vpts}*PTS[v];[0:a]atempo=${atempo}[a]" -map "[v]" -map "[a]"`)
      return sendVid(sock, from, msg, res, box('VIDSPEED', [`✅ Speed: ${f}x`], brand))
    } catch { return Er('Speed change failed') }
  }

  if (cmd === 'vidreverse') {
    await rct(sock, msg, '⏪')
    if (!(await hasFF())) return Er('ffmpeg not available')
    const media = await getMedia(sock, msg, 'video')
    if (!media?.buf) return Nd('vidreverse — reply to short video')
    try {
      const res = await ffmpegOp(media.buf, 'mp4', 'mp4', `-vf reverse -af areverse`, 120000)
      return sendVid(sock, from, msg, res, box('VIDREVERSE', ['✅ Video reversed'], brand))
    } catch { return Er('Reverse failed — video may be too large') }
  }

  // ─── AUDIO ───────────────────────────────

  if (cmd === 'audiotrim') {
    await rct(sock, msg, '✂️')
    if (!(await hasFF())) return Er('ffmpeg not available')
    const media = await getMedia(sock, msg, 'audio')
    if (!media?.buf) return Nd('audiotrim <start> <end> — reply to audio')
    const [s, e] = args.map(Number)
    if (!e) return Nd('audiotrim <start_sec> <end_sec>')
    try {
      const res = await ffmpegOp(media.buf, 'mp3', 'mp3', `-ss ${s} -to ${e} -c copy`, 30000)
      return sendAud(sock, from, msg, res, 'trimmed.mp3')
    } catch { return Er('Trim failed') }
  }

  if (cmd === 'audioboost') {
    await rct(sock, msg, '🔊')
    if (!(await hasFF())) return Er('ffmpeg not available')
    const media = await getMedia(sock, msg, 'audio')
    if (!media?.buf) return Nd('audioboost <level> — reply to audio (default 2)')
    const lvl = parseFloat(argText) || 2
    try {
      const res = await ffmpegOp(media.buf, 'mp3', 'mp3', `-filter:a "volume=${lvl}"`, 30000)
      return sendAud(sock, from, msg, res, 'boosted.mp3')
    } catch { return Er('Boost failed') }
  }

  if (cmd === 'audioreverse') {
    await rct(sock, msg, '⏪')
    if (!(await hasFF())) return Er('ffmpeg not available')
    const media = await getMedia(sock, msg, 'audio')
    if (!media?.buf) return Nd('audioreverse — reply to audio')
    try {
      const res = await ffmpegOp(media.buf, 'mp3', 'mp3', `-af areverse`, 60000)
      return sendAud(sock, from, msg, res, 'reversed.mp3')
    } catch { return Er('Reverse failed') }
  }

  if (cmd === 'audiospeed') {
    await rct(sock, msg, '⚡')
    if (!(await hasFF())) return Er('ffmpeg not available')
    const media = await getMedia(sock, msg, 'audio')
    if (!media?.buf) return Nd('audiospeed <factor> — reply to audio (0.5–2.0)')
    const f = Math.min(Math.max(parseFloat(argText)||1.5, 0.5), 2.0)
    try {
      const res = await ffmpegOp(media.buf, 'mp3', 'mp3', `-filter:a "atempo=${f}"`, 30000)
      return sendAud(sock, from, msg, res, 'speed.mp3')
    } catch { return Er('Failed') }
  }

  if (cmd === 'pitch') {
    await rct(sock, msg, '🎵')
    if (!(await hasFF())) return Er('ffmpeg not available')
    const media = await getMedia(sock, msg, 'audio')
    if (!media?.buf) return Nd('pitch <semitones> — reply to audio (e.g. 4 or -3)')
    const semi = parseInt(argText) || 4
    const rate = (44100 * Math.pow(2, semi/12)).toFixed(0)
    try {
      const res = await ffmpegOp(media.buf, 'mp3', 'mp3', `-filter:a "asetrate=${rate},aresample=44100"`, 30000)
      return sendAud(sock, from, msg, res, 'pitched.mp3')
    } catch { return Er('Pitch shift failed') }
  }

  if (cmd === 'echo') {
    await rct(sock, msg, '🔉')
    if (!(await hasFF())) return Er('ffmpeg not available')
    const media = await getMedia(sock, msg, 'audio')
    if (!media?.buf) return Nd('echo — reply to audio')
    try {
      const res = await ffmpegOp(media.buf, 'mp3', 'mp3', `-filter:a "aecho=0.8:0.88:60:0.4"`, 30000)
      return sendAud(sock, from, msg, res, 'echo.mp3')
    } catch { return Er('Echo failed') }
  }

  if (cmd === 'bass') {
    await rct(sock, msg, '🎸')
    if (!(await hasFF())) return Er('ffmpeg not available')
    const media = await getMedia(sock, msg, 'audio')
    if (!media?.buf) return Nd('bass — reply to audio')
    try {
      const res = await ffmpegOp(media.buf, 'mp3', 'mp3', `-filter:a "bass=g=10:f=110:w=0.3"`, 30000)
      return sendAud(sock, from, msg, res, 'bass.mp3')
    } catch { return Er('Bass boost failed') }
  }

  if (cmd === 'normalize') {
    await rct(sock, msg, '🎚️')
    if (!(await hasFF())) return Er('ffmpeg not available')
    const media = await getMedia(sock, msg, 'audio')
    if (!media?.buf) return Nd('normalize — reply to audio')
    try {
      const res = await ffmpegOp(media.buf, 'mp3', 'mp3', `-filter:a loudnorm`, 30000)
      return sendAud(sock, from, msg, res, 'normalized.mp3')
    } catch { return Er('Normalize failed') }
  }

  if (cmd === 'stt') {
    await rct(sock, msg, '📝')
    const media = await getMedia(sock, msg, 'audio')
    if (!media?.buf) return Nd('stt — reply to voice note or audio')
    const tries = [
      async () => {
        const f = new FormData()
        f.append('file', media.buf, { filename:'audio.mp3', contentType:'audio/mpeg' })
        f.append('model','whisper-1')
        const r = await axios.post('https://api.openai.com/v1/audio/transcriptions', f,
          { headers:{ ...f.getHeaders(), Authorization:`Bearer ${process.env.OPENAI_KEY||''}` }, timeout:30000 })
        return r.data?.text
      },
      async () => {
        const f = new FormData(); f.append('audio', media.buf, { filename:'audio.mp3' })
        const r = await axios.post('https://api.deepai.org/api/speech2text', f,
          { headers:{ ...f.getHeaders(), 'api-key': process.env.DEEPAI_KEY||'quickstart-QUdJIGlzIGF3ZXNvbWU' }, timeout:30000 })
        return r.data?.output
      }
    ]
    for (const t of tries) { try { const r = await t(); if (r) return R([`📝 *Transcription:*`, '', r.slice(0,800)]) } catch {} }
    return Er('Could not transcribe audio')
  }

  // ─── DOCUMENTS ───────────────────────────

  if (cmd === 'pdf2img') {
    await rct(sock, msg, '📄')
    const media = await getMedia(sock, msg, 'document')
    if (!media?.buf) return Nd('pdf2img — reply to a PDF')
    const inp = tmpF('pdf'); const out = tmpF('jpg')
    fs.writeFileSync(inp, media.buf)
    try {
      await execAsync(`convert -density 150 "${inp}[0]" -quality 90 "${out}"`, { timeout:30000 })
      const res = fs.readFileSync(out); gc(inp, out)
      return sendImg(sock, from, msg, res, box('PDF2IMG', ['✅ First page converted'], brand))
    } catch { gc(inp, out); return Er('PDF to image failed — ImageMagick required') }
  }

  if (cmd === 'pdf2txt') {
    await rct(sock, msg, '📝')
    const media = await getMedia(sock, msg, 'document')
    if (!media?.buf) return Nd('pdf2txt — reply to a PDF')
    const inp = tmpF('pdf'); fs.writeFileSync(inp, media.buf)
    const tries = [
      async () => { const {stdout} = await execAsync(`pdftotext "${inp}" -`, {timeout:15000}); return stdout },
      async () => {
        const f = new FormData(); f.append('file', media.buf, {filename:'doc.pdf'})
        const r = await axios.post('https://api.ocr.space/parse/image', f,
          { headers:{ ...f.getHeaders(), apikey: process.env.OCRSPACE_KEY||'helloworld' }, timeout:30000 })
        return r.data?.ParsedResults?.[0]?.ParsedText
      }
    ]
    gc(inp)
    for (const t of tries) { try { const r = await t(); if (r?.trim()) return R([`📝 *Extracted:*`, '', r.slice(0,1500)]) } catch {} }
    return Er('PDF text extraction failed')
  }

  if (cmd === 'img2pdf') {
    await rct(sock, msg, '📄')
    const media = await getMedia(sock, msg)
    if (!media?.buf) return Nd('img2pdf — reply to image')
    const inp = tmpF('jpg'); const out = tmpF('pdf')
    fs.writeFileSync(inp, media.buf)
    try {
      await execAsync(`convert "${inp}" "${out}"`, { timeout:20000 })
      const res = fs.readFileSync(out); gc(inp, out)
      return sendDoc(sock, from, msg, res, 'image.pdf', 'application/pdf')
    } catch { gc(inp, out); return Er('Image to PDF failed — ImageMagick required') }
  }

  if (cmd === 'wordcount') {
    const text = argText || getQuotedText(msg)
    if (!text) return Nd('wordcount <text> or reply')
    await rct(sock, msg, '📊')
    const words = text.trim().split(/\s+/).filter(Boolean).length
    const chars = text.length
    const lines = text.split('\n').length
    const sentences = text.split(/[.!?]+/).filter(Boolean).length
    return R([`📊 *Word Count*`, '', `Words: ${words}`, `Characters: ${chars}`, `Lines: ${lines}`, `Sentences: ${sentences}`])
  }

  if (cmd === 'jsonformat') {
    const text = argText || getQuotedText(msg)
    if (!text) return Nd('jsonformat <json> or reply')
    await rct(sock, msg, '📋')
    try {
      const formatted = JSON.stringify(JSON.parse(text), null, 2)
      return R([`📋 *Formatted JSON:*`, '', `\`\`\`\n${formatted.slice(0,1000)}\n\`\`\``])
    } catch { return Er('Invalid JSON') }
  }

  if (cmd === 'csvtotext') {
    const text = argText || getQuotedText(msg)
    if (!text) return Nd('csvtotext <csv>')
    await rct(sock, msg, '📊')
    const rows = text.split('\n').map(r => r.split(',').map(c => c.trim()).join(' │ '))
    return R([`📊 *CSV Table:*`, '', ...rows.slice(0,20)])
  }

  // ─── WEB TOOLS ───────────────────────────

  if (cmd === 'screenshot2') {
    const url = argText || getQuotedText(msg)
    if (!url || !url.startsWith('http')) return Nd('screenshot2 <URL>')
    await rct(sock, msg, '📸')
    const tries = [
      async () => { const {buf} = await dlBuf(`https://image.thum.io/get/width/1200/crop/768/${encodeURIComponent(url)}`); return buf },
      async () => { const {buf} = await dlBuf(`https://s0.wordpress.com/mshots/v1/${encodeURIComponent(url)}?w=1200`); return buf },
      async () => { const {buf} = await dlBuf(`https://api.screenshotmachine.com/?key=${process.env.SCREENSHOT_KEY||'test'}&url=${encodeURIComponent(url)}&dimension=1366x768&format=jpg`); return buf }
    ]
    for (const t of tries) { try { const b = await t(); if (b?.length>500) return sendImg(sock, from, msg, b, box('SCREENSHOT', [`🌐 ${url.slice(0,60)}`], brand)) } catch {} }
    return Er('Screenshot failed')
  }

  if (cmd === 'shorten2') {
    const url = argText || getQuotedText(msg)
    if (!url) return Nd('shorten2 <URL>')
    await rct(sock, msg, '🔗')
    const tries = [
      async () => { const r = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`, {timeout:TOUT}); return r.data },
      async () => { const r = await axios.get(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`, {timeout:TOUT}); return r.data },
      async () => { const r = await axios.get(`https://ulvis.net/api.php?url=${encodeURIComponent(url)}&type=json`, {timeout:TOUT}); return r.data?.data?.url }
    ]
    for (const t of tries) { try { const r = await t(); if (r?.startsWith('http')) return R([`🔗 *Short URL:*`, '', r]) } catch {} }
    return Er('URL shortening failed')
  }

  if (cmd === 'webmeta') {
    const url = argText || getQuotedText(msg)
    if (!url) return Nd('webmeta <URL>')
    await rct(sock, msg, '🌐')
    try {
      const r = await axios.get(url, { timeout:TOUT, headers:{'User-Agent':'Mozilla/5.0'} })
      const title = r.data?.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim()
      const desc  = r.data?.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i)?.[1]?.trim()
      const img   = r.data?.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i)?.[1]?.trim()
      const lines = [`🌐 *${title||'No title'}*`, desc?`📝 ${desc.slice(0,150)}`:null, `🔗 ${url.slice(0,60)}`].filter(Boolean)
      if (img) { try { const {buf} = await dlBuf(img); return sendImg(sock, from, msg, buf, box('WEBMETA', lines, brand)) } catch {} }
      return R(lines)
    } catch { return Er('Could not fetch page metadata') }
  }

  if (cmd === 'webstatus') {
    const url = argText || getQuotedText(msg)
    if (!url) return Nd('webstatus <URL>')
    await rct(sock, msg, '🌐')
    const start = Date.now()
    try {
      const r = await axios.get(url, { timeout:10000, validateStatus:()=>true })
      const ok = r.status < 400
      return R([`${ok?'✅':'❌'} *${url.slice(0,60)}*`, `Status: ${r.status}`, `Response: ${Date.now()-start}ms`])
    } catch { return R([`❌ *${url.slice(0,60)}*`, `Unreachable | ${Date.now()-start}ms`]) }
  }

  if (cmd === 'dnscheck') {
    const domain = argText || getQuotedText(msg)
    if (!domain) return Nd('dnscheck <domain>')
    await rct(sock, msg, '🌐')
    try {
      const r = await axios.get(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=A`, {timeout:TOUT})
      const recs = r.data?.Answer?.map(a=>`A: ${a.data}`).join('\n') || 'No A records found'
      return R([`🌐 *DNS: ${domain}*`, '', recs.slice(0,400)])
    } catch { return Er('DNS lookup failed') }
  }

  if (cmd === 'iplookup2') {
    const ip = argText || getQuotedText(msg)
    if (!ip) return Nd('iplookup2 <IP address>')
    await rct(sock, msg, '🌐')
    try {
      const r = await axios.get(`https://ipapi.co/${ip}/json/`, {timeout:TOUT})
      const d = r.data
      return R([`🌐 *IP: ${d.ip}*`, `🌍 ${d.city}, ${d.region}, ${d.country_name}`, `🏢 ${d.org||'Unknown ISP'}`, `🕐 ${d.timezone||''}`])
    } catch { return Er('IP lookup failed') }
  }

  if (cmd === 'carbon2') {
    const code = argText || getQuotedText(msg)
    if (!code) return Nd('carbon2 <code snippet>')
    await rct(sock, msg, '💻')
    const tries = [
      async () => { const {buf} = await dlBuf(`https://carbon.now.sh/api/carbonara?code=${encodeURIComponent(code)}&theme=dracula`); return buf },
      async () => { const {buf} = await dlBuf(`https://image.thum.io/get/width/800/https://carbon.now.sh/?code=${encodeURIComponent(code)}`); return buf }
    ]
    for (const t of tries) { try { const b = await t(); if (b?.length>500) return sendImg(sock, from, msg, b, box('CARBON', ['💻 Code screenshot'], brand)) } catch {} }
    return Er('Carbon screenshot failed')
  }

  // ─── AI TOOLS ─────────────────────────────

  const AI_CMDS = {
    summarize2: { sys:'Summarize in 3-5 bullet points. Be concise.', react:'📝', label:'Summary' },
    rewrite2:   { sys:'Rewrite differently keeping the same meaning.', react:'✏️', label:'Rewritten' },
    grammar2:   { sys:'Fix all grammar/spelling. Return ONLY corrected text.', react:'✅', label:'Grammar Fixed' },
    formal2:    { sys:'Rewrite in a formal professional tone.', react:'👔', label:'Formal' },
    casual2:    { sys:'Rewrite in a casual friendly tone.', react:'😊', label:'Casual' },
    bullet2:    { sys:'Convert to bullet points using •.', react:'📋', label:'Bullet Points' },
    story2:     { sys:'Write a short engaging story (200-300 words).', react:'📖', label:'Story' },
    essay2:     { sys:'Write a short essay (250 words) with intro, body, conclusion.', react:'📝', label:'Essay' },
    email3:     { sys:'Write a professional email. Include Subject: line.', react:'📧', label:'Email' },
    caption3:   { sys:'Write 3 engaging social media captions.', react:'📸', label:'Captions' },
    hashtags2:  { sys:'Generate 20 hashtags. Return only hashtags separated by spaces.', react:'#️⃣', label:'Hashtags' },
    codegen2:   { sys:'Write clean working code. Include comments. Specify language.', react:'💻', label:'Code' },
    debugcode2: { sys:'Debug this code. Identify bugs and provide fixed version.', react:'🐛', label:'Debug' },
  }

  if (AI_CMDS[cmd]) {
    const { sys, react, label } = AI_CMDS[cmd]
    const text = argText || getQuotedText(msg)
    if (!text) return Nd(`${cmd} <text> or reply to message`)
    await rct(sock, msg, react)
    const res = await aiText(text, sys)
    if (!res) return Er('AI request failed — check API keys')
    return R([`${react} *${label}:*`, '', res.slice(0,1000)])
  }

  if (cmd === 'translate3') {
    const langList = ['sw','en','fr','ar','es','de','pt','zh','ja','ko','ru','hi','it','am','yo','ha']
    const first = args[0]?.toLowerCase()
    let toLang = 'en', text = argText
    if (langList.includes(first)) { toLang = first; text = args.slice(1).join(' ').trim() }
    const qText = getQuotedText(msg)
    if (!text && qText) text = qText
    if (!text) return Nd('translate3 [lang] <text>')
    await rct(sock, msg, '🌐')
    const res = await aiText(text, `Translate to ${toLang}. Return ONLY the translation.`)
    if (!res) return Er('Translation failed')
    return R([`🌐 *→ ${toLang.toUpperCase()}:*`, '', res])
  }

  // ─── CHARTS ───────────────────────────────

  if (['piechart2','barchart2','linechart2'].includes(cmd)) {
    const text = argText || getQuotedText(msg)
    if (!text) return Nd(`${cmd} <Label1:Val1, Label2:Val2>`)
    await rct(sock, msg, '📊')
    const pts = text.split(',').map(p => p.trim())
    const labels = pts.map(p => p.split(':')[0]?.trim()).filter(Boolean)
    const data   = pts.map(p => parseFloat(p.split(':')[1]) || 0)
    if (labels.length < 2) return Nd(`${cmd} Label1:30, Label2:50, Label3:20`)
    const type = cmd==='piechart2' ? 'pie' : cmd==='barchart2' ? 'bar' : 'line'
    const buf = await makeChart(type, labels, data, text.slice(0,40))
    if (!buf) return Er('Chart generation failed')
    return sendImg(sock, from, msg, buf, box(cmd.toUpperCase(), [`📊 ${labels.join(', ')}`], brand))
  }

  if (cmd === 'progressbar2') {
    const text = argText || getQuotedText(msg)
    if (!text) return Nd('progressbar2 <label> <value> [max]')
    await rct(sock, msg, '📊')
    const [label, valStr, maxStr] = text.split(' ')
    const val = parseFloat(valStr) || 50
    const max = parseFloat(maxStr) || 100
    const pct = Math.min(Math.max((val/max)*100, 0), 100)
    const cfg = {
      type: 'bar',
      data: { labels:[label||'Progress'], datasets:[{ data:[pct], backgroundColor:'#7B2FBE', borderRadius:8 }] },
      options: { indexAxis:'y', scales:{ x:{min:0,max:100,ticks:{color:'#ccc'},grid:{color:'#333'}}, y:{ticks:{color:'#fff'}} },
        plugins:{ legend:{display:false}, title:{display:true,text:`${label||'Progress'}: ${pct.toFixed(1)}%`,color:'#fff'} },
        backgroundColor:'#1a1a2e' }
    }
    try {
      const url = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(cfg))}&width=700&height=200&backgroundColor=%231a1a2e`
      const { buf } = await dlBuf(url)
      return sendImg(sock, from, msg, buf, box('PROGRESS', [`📊 ${val}/${max}`], brand))
    } catch { return Er('Progress bar failed') }
  }

  if (cmd === 'wordcloud2') {
    const text = argText || getQuotedText(msg)
    if (!text) return Nd('wordcloud2 <text>')
    await rct(sock, msg, '☁️')
    try {
      const { buf } = await dlBuf(`https://quickchart.io/wordcloud?text=${encodeURIComponent(text.slice(0,400))}&width=600&height=400&backgroundColor=%231a1a2e&fontColor=%237B2FBE`)
      return sendImg(sock, from, msg, buf, box('WORDCLOUD', ['☁️ Generated'], brand))
    } catch { return Er('Word cloud failed') }
  }

  // ─── TEXT EFFECTS / CARDS ─────────────────

  const TEXT_EFFECTS = {
    neontext2: 'neon glowing text dark background digital art',
    fire3:     'fire flames text dark background',
    quote3:    'elegant quote card dark background'
  }

  if (TEXT_EFFECTS[cmd]) {
    const text = argText || getQuotedText(msg)
    if (!text) return Nd(`${cmd} <text>`)
    await rct(sock, msg, '✨')
    try {
      const { buf } = await dlBuf(`https://image.pollinations.ai/prompt/${encodeURIComponent('"'+text+'" '+TEXT_EFFECTS[cmd])}?width=800&height=400&nologo=true`)
      return sendImg(sock, from, msg, buf, box(cmd.toUpperCase(), [`✨ ${text.slice(0,50)}`], brand))
    } catch { return Er(`${cmd} effect failed`) }
  }

  if (cmd === 'birthday2') {
    const name = argText || getQuotedText(msg) || 'Friend'
    await rct(sock, msg, '🎂')
    try {
      const { buf } = await dlBuf(`https://image.pollinations.ai/prompt/${encodeURIComponent('Happy Birthday '+name+' cake balloons celebration colorful')}?width=800&height=600&nologo=true`)
      return sendImg(sock, from, msg, buf, box('BIRTHDAY', [`🎂 Happy Birthday *${name}*! 🎉`], brand))
    } catch {
      return R([`🎂 *Happy Birthday ${name}!*`, '', `🎉 Wishing you all the joy today and always!`, `🎁 May all your dreams come true! 💜`])
    }
  }

  if (cmd === 'flyer2') {
    const text = argText || getQuotedText(msg)
    if (!text) return Nd('flyer2 <event | date | location>')
    await rct(sock, msg, '📢')
    const [event, date, location] = text.split('|').map(s => s?.trim())
    const lines = [`━━━━━━━━━━━━━━`, `📢 *${event||text}*`, date?`📅 ${date}`:null, location?`📍 ${location}`:null, ``, `✨ *${brand}*`, `━━━━━━━━━━━━━━`].filter(Boolean)
    try {
      const { buf } = await dlBuf(`https://image.pollinations.ai/prompt/${encodeURIComponent('event flyer poster '+event+' professional dark')}?width=800&height=1000&nologo=true`)
      return sendImg(sock, from, msg, buf, box('FLYER', lines, brand))
    } catch { return R(lines) }
  }

  if (cmd === 'announcement2') {
    const text = argText || getQuotedText(msg)
    if (!text) return Nd('announcement2 <message>')
    await rct(sock, msg, '📢')
    return R([`📢 *ANNOUNCEMENT*`, ``, text, ``, `— *${brand}*`])
  }

  // ─── SECURITY ─────────────────────────────

  if (cmd === 'encrypt2') {
    const [key, ...rest] = args
    const text = rest.join(' ').trim() || getQuotedText(msg)
    if (!key || !text) return Nd('encrypt2 <key> <text>')
    await rct(sock, msg, '🔐')
    const enc = encrypt(text, key)
    if (!enc) return Er('Encryption failed')
    return R([`🔐 *Encrypted:*`, '', enc, '', `🔑 Key: ${key}`, `⚠️ Save your key!`])
  }

  if (cmd === 'decrypt2') {
    const [key, ...rest] = args
    const enc = rest.join(' ').trim() || getQuotedText(msg)
    if (!key || !enc) return Nd('decrypt2 <key> <encrypted>')
    await rct(sock, msg, '🔓')
    const dec = decrypt(enc, key)
    if (!dec) return Er('Decryption failed — wrong key or bad data')
    return R([`🔓 *Decrypted:*`, '', dec])
  }

  if (cmd === 'hash3') {
    const text = argText || getQuotedText(msg)
    if (!text) return Nd('hash3 <text> [md5|sha1|sha256|sha512|all]')
    await rct(sock, msg, '🔒')
    const [algo, ...rest] = args
    const algoMap = ['md5','sha1','sha256','sha512','all']
    const a = algoMap.includes(algo) ? algo : 'all'
    const t = algoMap.includes(algo) ? rest.join(' ').trim() : text
    return R([`🔒 *Hash:*`, '', doHash(t||text, a)])
  }

  if (cmd === 'randomkey2') {
    const bits = parseInt(argText) || 256
    await rct(sock, msg, '🔑')
    return R([`🔑 *Random Key (${bits}-bit):*`, '', randomBytes(Math.floor(bits/8)).toString('hex')])
  }

  if (cmd === 'otp2') {
    const digits = parseInt(argText) || 6
    await rct(sock, msg, '🔢')
    const otp = Math.floor(Math.random() * Math.pow(10, digits)).toString().padStart(digits, '0')
    const expires = new Date(Date.now() + 5*60000).toLocaleTimeString()
    return R([`🔢 *OTP Code:*`, '', `*${otp}*`, '', `⏱ Expires: ${expires}`, `⚠️ Valid 5 minutes`])
  }

  // ─── NETWORK ──────────────────────────────

  if (cmd === 'ping3') {
    const host = argText || getQuotedText(msg)
    if (!host) return Nd('ping3 <domain or URL>')
    await rct(sock, msg, '📡')
    const start = Date.now()
    try {
      await axios.get(host.startsWith('http') ? host : `https://${host}`, { timeout:8000, validateStatus:()=>true })
      return R([`✅ *${host}*`, `🟢 Online | ${Date.now()-start}ms`])
    } catch { return R([`❌ *${host}*`, `🔴 Unreachable | ${Date.now()-start}ms`]) }
  }

  if (cmd === 'myip2') {
    await rct(sock, msg, '🌐')
    const tries = [
      async () => { const r = await axios.get('https://api.ipify.org?format=json',{timeout:TOUT}); return r.data?.ip },
      async () => { const r = await axios.get('https://icanhazip.com',{timeout:TOUT}); return r.data?.trim() }
    ]
    for (const t of tries) { try { const r = await t(); if (r) return R([`🌐 *Server IP:*`, '', r]) } catch {} }
    return Er('Could not get IP')
  }

  if (cmd === 'subnet2') {
    const cidr = argText || getQuotedText(msg)
    if (!cidr || !cidr.includes('/')) return Nd('subnet2 <IP/CIDR> — e.g. 192.168.1.0/24')
    await rct(sock, msg, '🔢')
    try {
      const [ip, bitsStr] = cidr.split('/')
      const bits = parseInt(bitsStr)
      const mask = ~(0xffffffff >>> bits)
      const ipInt = ip.split('.').reduce((a,o) => (a<<8)|parseInt(o), 0)
      const network = ipInt & mask
      const broadcast = network | ~mask
      const toIP = n => [24,16,8,0].map(s=>(n>>>s)&255).join('.')
      return R([`🔢 *${cidr}*`, `Network: ${toIP(network)}`, `Broadcast: ${toIP(broadcast)}`, `Hosts: ${(broadcast-network-1).toLocaleString()}`, `Mask: ${toIP(mask)}`])
    } catch { return Er('Invalid CIDR — use format 192.168.1.0/24') }
  }

  if (cmd === 'emailverify2') {
    const email = argText || getQuotedText(msg)
    if (!email?.includes('@')) return Nd('emailverify2 <email@domain.com>')
    await rct(sock, msg, '📧')
    try {
      const domain = email.split('@')[1]
      const r = await axios.get(`https://dns.google/resolve?name=${domain}&type=MX`, {timeout:TOUT})
      const hasMX = r.data?.Answer?.length > 0
      return R([`📧 *${email}*`, '', `${hasMX?'✅':'❌'} ${hasMX?'Valid domain (MX found)':'No MX records'}`, `🌐 Domain: ${domain}`])
    } catch { return Er('Email verification failed') }
  }

  // ─── HELP ─────────────────────────────────

  if (cmd === 'creatorhelp') {
    return R([
      `📋 *CREATOR COMMANDS (${prefix})*`,
      ``,
      `🖼️ *Image (19):*`,
      `watermark resize rotate flip grayscale invert`,
      `brightness contrast saturation vignette vintage`,
      `sepia glitch mirror frame circle deepfry jpegify thumbnail2`,
      ``,
      `📹 *Video (8):*`,
      `trim gif2mp4 mp42gif videothumb extractaudio mute vidspeed vidreverse`,
      ``,
      `🎵 *Audio (9):*`,
      `audiotrim audioboost audioreverse audiospeed pitch echo bass normalize stt`,
      ``,
      `📄 *Documents (6):*`,
      `pdf2img pdf2txt img2pdf wordcount jsonformat csvtotext`,
      ``,
      `🌐 *Web (7):*`,
      `screenshot2 shorten2 webmeta webstatus dnscheck iplookup2 carbon2`,
      ``,
      `🤖 *AI (14):*`,
      `summarize2 rewrite2 grammar2 formal2 casual2 bullet2`,
      `story2 essay2 email3 caption3 hashtags2 codegen2 debugcode2 translate3`,
      ``,
      `📊 *Charts (5):*`,
      `piechart2 barchart2 linechart2 progressbar2 wordcloud2`,
      ``,
      `🎨 *Effects & Cards (7):*`,
      `neontext2 fire3 quote3 birthday2 flyer2 announcement2`,
      ``,
      `🔐 *Security (5):*`,
      `encrypt2 decrypt2 hash3 randomkey2 otp2`,
      ``,
      `📡 *Network (4):*`,
      `ping3 myip2 subnet2 emailverify2`
    ])
  }
}
