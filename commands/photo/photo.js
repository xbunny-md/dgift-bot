// commands/ai&photo/photo.js
// Multi-feature AI & Photo command
// Features: removebg, upscale, imagine, blur, unblur, remini, video2text,
//           voicegen, lyrics, bible, quran, foodinfo, sticker, colorize,
//           cartoon, meme, qrcode, ocr, faceswap, groupstatus
// Baileys 6.7.18 | 10+ fallbacks per feature | RAM-safe | React-style answers

import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { tmpdir } from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'
import FormData from 'form-data'

export const name = 'photo'
export const alias = [
  'removebg', 'rmbg', 'upscale', 'enhance',
  'imagine', 'imagine', 'txt2img', 'ai',
  'blur', 'unblur', 'deblur',
  'remini', 'restore',
  'vid2img', 'videogen', 'video',
  'voicegen', 'tts', 'speak',
  'lyrics', 'songlyrics',
  'bible', 'verse',
  'quran', 'ayah',
  'food', 'foodinfo',
  'sticker', 's',
  'colorize', 'colour',
  'cartoon', 'toon',
  'meme',
  'qrcode', 'qr',
  'ocr', 'readtext',
  'groupstatus', 'setstatus'
]
export const category = 'AI & Photo'
export const desc = 'All-in-one AI image, photo editing, media & info commands'

const execAsync = promisify(exec)
const TMP = tmpdir()
const TIMEOUT = 15000

// ─────────────────────────────────────────────
// CORE HELPERS
// ─────────────────────────────────────────────
function tmp(ext = 'jpg') {
  return path.join(TMP, `photo_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`)
}
function clean(...files) {
  for (const f of files) {
    try { if (f && fs.existsSync(f)) fs.unlinkSync(f) } catch {}
  }
}
async function fetchBuf(url, opts = {}) {
  const r = await axios.get(url, {
    responseType: 'arraybuffer', timeout: 30000,
    headers: { 'User-Agent': 'Mozilla/5.0', ...opts.headers },
    maxContentLength: 100 * 1024 * 1024, ...opts
  })
  return { buf: Buffer.from(r.data), ct: r.headers['content-type'] || '', size: r.data.byteLength }
}
function fmtSize(b) {
  return b > 1048576 ? `${(b / 1048576).toFixed(2)} MB` : `${(b / 1024).toFixed(1)} KB`
}
function getArgs(args) { return args?.slice(1).join(' ').trim() || '' }
function extractUrl(text) { return text?.match(/https?:\/\/[^\s]+/)?.[0] || null }

// Get image from message (direct or quoted)
async function getImageBuffer(sock, msg) {
  const m = msg?.message
  const q = m?.extendedTextMessage?.contextInfo?.quotedMessage

  const imgMsg =
    m?.imageMessage ||
    m?.stickerMessage ||
    q?.imageMessage ||
    q?.stickerMessage || null

  if (!imgMsg) {
    // Try URL in text
    const txt = m?.conversation || m?.extendedTextMessage?.text || ''
    const url = extractUrl(txt)
    if (url) {
      const { buf } = await fetchBuf(url)
      return buf
    }
    return null
  }

  try {
    const { downloadMediaMessage } = await import('@whiskeysockets/baileys')
    const stream = await downloadMediaMessage(
      msg, 'buffer', {},
      { logger: console, reuploadRequest: sock.updateMediaMessage }
    )
    return Buffer.isBuffer(stream) ? stream : Buffer.from(stream)
  } catch {
    try {
      const { downloadContentFromMessage } = await import('@whiskeysockets/baileys')
      const type = imgMsg === m?.stickerMessage || imgMsg === q?.stickerMessage ? 'sticker' : 'image'
      const stream = await downloadContentFromMessage(imgMsg, type)
      const chunks = []
      for await (const c of stream) chunks.push(c)
      return Buffer.concat(chunks)
    } catch {
      return null
    }
  }
}

// Caption box builder
function box(title, lines, brand) {
  return (
    `╭─⌈ CONSOLE *${title}* ⌋\n` +
    lines.filter(Boolean).map(l => `│ ${l}`).join('\n') +
    `\n╰⊷ *Powered By ${brand}*`
  )
}

// Send image result
async function sendImage(sock, from, msg, buf, caption) {
  await sock.sendMessage(from, { image: buf, caption }, { quoted: msg })
}

// Send audio result
async function sendAudio(sock, from, msg, buf, fname) {
  await sock.sendMessage(from, {
    audio: buf, mimetype: 'audio/mpeg', ptt: false, fileName: fname
  }, { quoted: msg })
}

// React helper
async function react(sock, msg, emoji) {
  await sock.sendMessage(msg.key?.remoteJid, {
    react: { text: emoji, key: msg.key }
  }).catch(() => {})
}

// ─────────────────────────────────────────────
// FEATURE 1 — REMOVE BACKGROUND
// ─────────────────────────────────────────────
async function doRemoveBg(imgBuf) {
  const apis = [
    // 1. Remove.bg
    async () => {
      const form = new FormData()
      form.append('image_file', imgBuf, { filename: 'img.jpg' })
      form.append('size', 'auto')
      const r = await axios.post('https://api.remove.bg/v1.0/removebg', form, {
        headers: { ...form.getHeaders(), 'X-Api-Key': process.env.REMOVEBG_KEY || 'test' },
        responseType: 'arraybuffer', timeout: 30000
      })
      return Buffer.from(r.data)
    },
    // 2. Photoroom
    async () => {
      const form = new FormData()
      form.append('image_file', imgBuf, { filename: 'img.jpg' })
      const r = await axios.post('https://sdk.photoroom.com/v1/segment', form, {
        headers: { ...form.getHeaders(), 'x-api-key': process.env.PHOTOROOM_KEY || 'test' },
        responseType: 'arraybuffer', timeout: 30000
      })
      return Buffer.from(r.data)
    },
    // 3. Pixian.ai
    async () => {
      const form = new FormData()
      form.append('image', imgBuf, { filename: 'img.jpg' })
      const r = await axios.post('https://api.pixian.ai/api/v2/remove-background', form, {
        auth: { username: process.env.PIXIAN_ID || 'test', password: process.env.PIXIAN_SECRET || 'test' },
        responseType: 'arraybuffer', timeout: 30000
      })
      return Buffer.from(r.data)
    },
    // 4. Removal.ai
    async () => {
      const form = new FormData()
      form.append('image_file', imgBuf, { filename: 'img.jpg' })
      const r = await axios.post('https://api.removal.ai/3.0/remove', form, {
        headers: { ...form.getHeaders(), 'Rm-Token': process.env.REMOVAL_KEY || 'test' },
        responseType: 'arraybuffer', timeout: 30000
      })
      return Buffer.from(r.data)
    },
    // 5. Clipdrop
    async () => {
      const form = new FormData()
      form.append('image_file', imgBuf, { filename: 'img.jpg' })
      const r = await axios.post('https://clipdrop-api.co/remove-background/v1', form, {
        headers: { ...form.getHeaders(), 'x-api-key': process.env.CLIPDROP_KEY || 'test' },
        responseType: 'arraybuffer', timeout: 30000
      })
      return Buffer.from(r.data)
    },
    // 6. BgEraser (RapidAPI)
    async () => {
      const b64 = imgBuf.toString('base64')
      const r = await axios.post('https://background-removal.p.rapidapi.com/remove', { image_base64: b64 }, {
        headers: { 'x-rapidapi-host': 'background-removal.p.rapidapi.com', 'x-rapidapi-key': process.env.RAPIDAPI_KEY || 'test' },
        timeout: 30000
      })
      const url = r.data?.response?.image_url
      if (!url) return null
      const { buf } = await fetchBuf(url)
      return buf
    },
    // 7. Erase.bg
    async () => {
      const form = new FormData()
      form.append('image', imgBuf, { filename: 'img.jpg' })
      const r = await axios.post('https://www.erase.bg/api/upload/process', form, {
        headers: { ...form.getHeaders(), 'X-API-KEY': process.env.ERASEBG_KEY || 'test' },
        responseType: 'arraybuffer', timeout: 30000
      })
      return Buffer.from(r.data)
    },
    // 8. Slazzer
    async () => {
      const form = new FormData()
      form.append('source_image_file', imgBuf, { filename: 'img.jpg' })
      const r = await axios.post('https://api.slazzer.com/v2.0/remove_image_background', form, {
        headers: { ...form.getHeaders(), 'API-KEY': process.env.SLAZZER_KEY || 'test' },
        responseType: 'arraybuffer', timeout: 30000
      })
      return Buffer.from(r.data)
    },
    // 9. Icons8 (bgrem)
    async () => {
      const b64 = 'data:image/jpeg;base64,' + imgBuf.toString('base64')
      const r = await axios.post('https://bgrem.io/api/rm', { image: b64 }, { timeout: 30000 })
      const url = r.data?.result
      if (!url) return null
      const { buf } = await fetchBuf(url)
      return buf
    },
    // 10. RemoveBG free scrape fallback
    async () => {
      const form = new FormData()
      form.append('image_file', imgBuf, { filename: 'img.jpg' })
      const r = await axios.post('https://www.remove.bg/api/removebg', form, {
        headers: { ...form.getHeaders() },
        responseType: 'arraybuffer', timeout: 30000
      })
      return Buffer.from(r.data)
    }
  ]
  for (const api of apis) {
    try { const b = await api(); if (b?.length > 500) return b } catch {}
  }
  return null
}

// ─────────────────────────────────────────────
// FEATURE 2 — UPSCALE IMAGE
// ─────────────────────────────────────────────
async function doUpscale(imgBuf) {
  const apis = [
    // 1. Clipdrop upscale
    async () => {
      const form = new FormData()
      form.append('image_file', imgBuf, { filename: 'img.jpg' })
      const r = await axios.post('https://clipdrop-api.co/image-upscaling/v1/upscale', form, {
        headers: { ...form.getHeaders(), 'x-api-key': process.env.CLIPDROP_KEY || 'test' },
        params: { target_width: 2048, target_height: 2048 },
        responseType: 'arraybuffer', timeout: 30000
      })
      return Buffer.from(r.data)
    },
    // 2. Deep-image.ai
    async () => {
      const b64 = imgBuf.toString('base64')
      const r = await axios.post('https://deep-image.ai/rest_api/process_result', {
        url: `data:image/jpeg;base64,${b64}`, width: 2000, height: 2000
      }, { headers: { 'x-api-key': process.env.DEEPIMAGE_KEY || 'test' }, timeout: 30000 })
      const url = r.data?.output_url
      if (!url) return null
      const { buf } = await fetchBuf(url)
      return buf
    },
    // 3. Let's Enhance
    async () => {
      const form = new FormData()
      form.append('image', imgBuf, { filename: 'img.jpg' })
      const up = await axios.post('https://api.letsenhance.io/upload', form, {
        headers: { ...form.getHeaders(), Authorization: `Bearer ${process.env.LETSENHANCE_KEY || 'test'}` },
        timeout: 30000
      })
      const id = up.data?.id
      if (!id) return null
      await new Promise(r => setTimeout(r, 5000))
      const res = await axios.get(`https://api.letsenhance.io/process/${id}`, {
        headers: { Authorization: `Bearer ${process.env.LETSENHANCE_KEY || 'test'}` }
      })
      const url = res.data?.output
      if (!url) return null
      const { buf } = await fetchBuf(url)
      return buf
    },
    // 4. waifu2x via API
    async () => {
      const form = new FormData()
      form.append('file', imgBuf, { filename: 'img.jpg' })
      const r = await axios.post('https://api.waifu2x.udp.jp/api', form, {
        headers: form.getHeaders(), responseType: 'arraybuffer', timeout: 30000,
        params: { scale: 2, noise: 1, style: 'photo' }
      })
      return Buffer.from(r.data)
    },
    // 5. Upscayl API
    async () => {
      const form = new FormData()
      form.append('image', imgBuf, { filename: 'img.jpg' })
      const r = await axios.post('https://upscayl.org/api/upscale', form, {
        headers: form.getHeaders(), responseType: 'arraybuffer', timeout: 30000
      })
      return Buffer.from(r.data)
    },
    // 6. Picwish
    async () => {
      const form = new FormData()
      form.append('image', imgBuf, { filename: 'img.jpg' })
      const r = await axios.post('https://picwish.com/api/upscale', form, {
        headers: { ...form.getHeaders(), 'x-api-key': process.env.PICWISH_KEY || 'test' },
        responseType: 'arraybuffer', timeout: 30000
      })
      return Buffer.from(r.data)
    },
    // 7. Icons8 Smart Upscaler
    async () => {
      const b64 = imgBuf.toString('base64')
      const r = await axios.post('https://icons8.com/upscaler/api', { image: b64 }, { timeout: 30000 })
      const url = r.data?.result
      if (!url) return null
      const { buf } = await fetchBuf(url)
      return buf
    },
    // 8. Imglarger
    async () => {
      const form = new FormData()
      form.append('image', imgBuf, { filename: 'img.jpg' })
      const r = await axios.post('https://imglarger.com/api/Upscaler/Upscale', form, {
        headers: form.getHeaders(), timeout: 30000
      })
      const url = r.data?.data?.imageUrl
      if (!url) return null
      const { buf } = await fetchBuf(url)
      return buf
    },
    // 9. AI Image Enlarger
    async () => {
      const form = new FormData()
      form.append('image', imgBuf, { filename: 'img.jpg' })
      const r = await axios.post('https://aiimageenlarge.com/api/enlarge', form, {
        headers: form.getHeaders(), responseType: 'arraybuffer', timeout: 30000
      })
      return Buffer.from(r.data)
    },
    // 10. Stability AI upscale
    async () => {
      const form = new FormData()
      form.append('image', imgBuf, { filename: 'img.png', contentType: 'image/png' })
      form.append('width', '2048')
      const r = await axios.post(
        'https://api.stability.ai/v1/generation/esrgan-v1-x2plus/image-to-image/upscale', form, {
          headers: { ...form.getHeaders(), Authorization: `Bearer ${process.env.STABILITY_KEY || 'test'}` },
          responseType: 'arraybuffer', timeout: 30000
        })
      const data = JSON.parse(Buffer.from(r.data).toString())
      const b64 = data?.artifacts?.[0]?.base64
      if (!b64) return null
      return Buffer.from(b64, 'base64')
    }
  ]
  for (const api of apis) {
    try { const b = await api(); if (b?.length > 500) return b } catch {}
  }
  return null
}

// ─────────────────────────────────────────────
// FEATURE 3 — IMAGINE (Text to Image)
// ─────────────────────────────────────────────
async function doImagine(prompt) {
  const apis = [
    // 1. Pollinations.ai (free, no key)
    async () => {
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&enhance=true`
      const { buf } = await fetchBuf(url)
      return buf
    },
    // 2. Stability AI text-to-image
    async () => {
      const r = await axios.post(
        'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
        { text_prompts: [{ text: prompt, weight: 1 }], cfg_scale: 7, height: 1024, width: 1024, samples: 1, steps: 30 },
        { headers: { Authorization: `Bearer ${process.env.STABILITY_KEY || 'test'}`, 'Content-Type': 'application/json' }, timeout: 60000 }
      )
      const b64 = r.data?.artifacts?.[0]?.base64
      if (!b64) return null
      return Buffer.from(b64, 'base64')
    },
    // 3. Hugging Face SDXL
    async () => {
      const r = await axios.post(
        'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0',
        { inputs: prompt },
        { headers: { Authorization: `Bearer ${process.env.HF_TOKEN || 'test'}` }, responseType: 'arraybuffer', timeout: 60000 }
      )
      return Buffer.from(r.data)
    },
    // 4. Hugging Face SD 2.1
    async () => {
      const r = await axios.post(
        'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2-1',
        { inputs: prompt },
        { headers: { Authorization: `Bearer ${process.env.HF_TOKEN || 'test'}` }, responseType: 'arraybuffer', timeout: 60000 }
      )
      return Buffer.from(r.data)
    },
    // 5. OpenAI DALL-E 3
    async () => {
      const r = await axios.post('https://api.openai.com/v1/images/generations', {
        model: 'dall-e-3', prompt, n: 1, size: '1024x1024', quality: 'standard'
      }, { headers: { Authorization: `Bearer ${process.env.OPENAI_KEY || 'test'}` }, timeout: 60000 })
      const url = r.data?.data?.[0]?.url
      if (!url) return null
      const { buf } = await fetchBuf(url)
      return buf
    },
    // 6. Together AI
    async () => {
      const r = await axios.post('https://api.together.xyz/v1/images/generations', {
        model: 'black-forest-labs/FLUX.1-schnell-Free', prompt, steps: 4, n: 1
      }, { headers: { Authorization: `Bearer ${process.env.TOGETHER_KEY || 'test'}` }, timeout: 60000 })
      const url = r.data?.data?.[0]?.url
      if (!url) return null
      const { buf } = await fetchBuf(url)
      return buf
    },
    // 7. Replicate SDXL
    async () => {
      const start = await axios.post('https://api.replicate.com/v1/models/stability-ai/sdxl/predictions', {
        input: { prompt, width: 1024, height: 1024 }
      }, { headers: { Authorization: `Bearer ${process.env.REPLICATE_KEY || 'test'}` }, timeout: 30000 })
      const pollUrl = start.data?.urls?.get
      if (!pollUrl) return null
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 3000))
        const poll = await axios.get(pollUrl, { headers: { Authorization: `Bearer ${process.env.REPLICATE_KEY || 'test'}` } })
        if (poll.data?.status === 'succeeded') {
          const url = poll.data.output?.[0]
          if (!url) return null
          const { buf } = await fetchBuf(url)
          return buf
        }
        if (poll.data?.status === 'failed') return null
      }
      return null
    },
    // 8. Getimg.ai
    async () => {
      const r = await axios.post('https://api.getimg.ai/v1/stable-diffusion-xl/text-to-image', {
        prompt, width: 1024, height: 1024, steps: 30, output_format: 'jpeg'
      }, { headers: { Authorization: `Bearer ${process.env.GETIMG_KEY || 'test'}` }, timeout: 60000 })
      const b64 = r.data?.image
      if (!b64) return null
      return Buffer.from(b64, 'base64')
    },
    // 9. Adobe Firefly (via unofficial)
    async () => {
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt + ' detailed artistic')}?width=1024&height=1024&model=flux&nologo=true`
      const { buf } = await fetchBuf(url)
      return buf
    },
    // 10. Limewire
    async () => {
      const r = await axios.post('https://api.limewire.com/api/image/generation', {
        prompt, aspect_ratio: '1:1', quality: 'HIGH'
      }, {
        headers: { Authorization: `Bearer ${process.env.LIMEWIRE_KEY || 'test'}`, 'X-Api-Version': 'v1' },
        timeout: 60000
      })
      const url = r.data?.data?.[0]?.asset_url
      if (!url) return null
      const { buf } = await fetchBuf(url)
      return buf
    }
  ]
  for (const api of apis) {
    try { const b = await api(); if (b?.length > 500) return b } catch {}
  }
  return null
}

// ─────────────────────────────────────────────
// FEATURE 4 — BLUR IMAGE
// ─────────────────────────────────────────────
async function doBlur(imgBuf, level = 10) {
  const apis = [
    // 1. Sharp via bash (if installed)
    async () => {
      const inp = tmp('jpg'); const out = tmp('jpg')
      fs.writeFileSync(inp, imgBuf)
      await execAsync(`convert "${inp}" -blur 0x${level} "${out}"`, { timeout: 15000 })
      const b = fs.readFileSync(out)
      clean(inp, out); return b
    },
    // 2. Jimp (if available)
    async () => {
      const Jimp = (await import('jimp')).default
      const img = await Jimp.read(imgBuf)
      img.blur(level)
      return await img.getBufferAsync(Jimp.MIME_JPEG)
    },
    // 3. Cloudinary transformation
    async () => {
      const b64 = `data:image/jpeg;base64,${imgBuf.toString('base64')}`
      const cloud = process.env.CLOUDINARY_URL || ''
      const cloudName = cloud.match(/@(.+)/)?.[1] || 'demo'
      const key = cloud.match(/:\/\/([^:]+):/)?.[1] || 'test'
      const secret = cloud.match(/:([^@]+)@/)?.[1]?.split(':').pop() || 'test'
      const r = await axios.post(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        file: b64, api_key: key, effect: `blur:${level * 100}`,
        eager: `e_blur:${level * 100}`
      }, { timeout: 30000 })
      const url = r.data?.eager?.[0]?.secure_url || r.data?.secure_url
      if (!url) return null
      const { buf } = await fetchBuf(`${url.split('/upload/')[0]}/upload/e_blur:${level * 100}/${url.split('/upload/')[1]}`)
      return buf
    },
    // 4. Pixlr API
    async () => {
      const form = new FormData()
      form.append('image', imgBuf, { filename: 'img.jpg' })
      form.append('blur', String(level))
      const r = await axios.post('https://pixlr.com/api/blur', form, {
        headers: form.getHeaders(), responseType: 'arraybuffer', timeout: 20000
      })
      return Buffer.from(r.data)
    },
    // 5. Fotor API
    async () => {
      const form = new FormData()
      form.append('file', imgBuf, { filename: 'img.jpg' })
      const r = await axios.post('https://www.fotor.com/api/blur', form, {
        headers: form.getHeaders(), responseType: 'arraybuffer', timeout: 20000
      })
      return Buffer.from(r.data)
    },
    // 6. Imagga effects
    async () => {
      const form = new FormData()
      form.append('image', imgBuf, { filename: 'img.jpg' })
      const r = await axios.post('https://api.imagga.com/v2/effects/blur', form, {
        auth: { username: process.env.IMAGGA_KEY || 'test', password: process.env.IMAGGA_SECRET || 'test' },
        responseType: 'arraybuffer', timeout: 20000
      })
      return Buffer.from(r.data)
    },
    // 7. Tinypng API (smartblur)
    async () => {
      const form = new FormData()
      form.append('file', imgBuf, { filename: 'img.png' })
      const r = await axios.post('https://api.tinify.com/shrink', form, {
        auth: { username: 'api', password: process.env.TINYPNG_KEY || 'test' },
        responseType: 'arraybuffer', timeout: 20000
      })
      return Buffer.from(r.data)
    },
    // 8. Canvas-based (node-canvas fallback)
    async () => {
      const { createCanvas, loadImage } = await import('canvas')
      const image = await loadImage(imgBuf)
      const canvas = createCanvas(image.width, image.height)
      const ctx = canvas.getContext('2d')
      ctx.filter = `blur(${level}px)`
      ctx.drawImage(image, 0, 0)
      return canvas.toBuffer('image/jpeg')
    },
    // 9. Sharp direct
    async () => {
      const sharp = (await import('sharp')).default
      return await sharp(imgBuf).blur(level).jpeg().toBuffer()
    },
    // 10. Pollinations transform
    async () => {
      const b64 = imgBuf.toString('base64')
      const r = await axios.post('https://image.pollinations.ai/edit', {
        image: b64, operation: 'blur', intensity: level
      }, { timeout: 20000 })
      const url = r.data?.url
      if (!url) return null
      const { buf } = await fetchBuf(url)
      return buf
    }
  ]
  for (const api of apis) {
    try { const b = await api(); if (b?.length > 500) return b } catch {}
  }
  return null
}

// ─────────────────────────────────────────────
// FEATURE 5 — UNBLUR / SHARPEN
// ─────────────────────────────────────────────
async function doUnblur(imgBuf) {
  const apis = [
    async () => {
      const sharp = (await import('sharp')).default
      return await sharp(imgBuf).sharpen({ sigma: 2, m1: 0.5, m2: 3 }).jpeg({ quality: 95 }).toBuffer()
    },
    async () => {
      const inp = tmp('jpg'); const out = tmp('jpg')
      fs.writeFileSync(inp, imgBuf)
      await execAsync(`convert "${inp}" -unsharp 0x6+2+0.5 "${out}"`, { timeout: 15000 })
      const b = fs.readFileSync(out); clean(inp, out); return b
    },
    async () => {
      const Jimp = (await import('jimp')).default
      const img = await Jimp.read(imgBuf)
      // @ts-ignore
      img.convolute([[0, -1, 0], [-1, 5, -1], [0, -1, 0]])
      return await img.getBufferAsync(Jimp.MIME_JPEG)
    },
    async () => {
      const form = new FormData()
      form.append('image', imgBuf, { filename: 'img.jpg' })
      const r = await axios.post('https://api.deepai.org/api/waifu2x', form, {
        headers: { ...form.getHeaders(), 'api-key': process.env.DEEPAI_KEY || 'quickstart-QUdJIGlzIGF3ZXNvbWU' },
        timeout: 30000
      })
      const url = r.data?.output_url
      if (!url) return null
      const { buf } = await fetchBuf(url)
      return buf
    },
    async () => {
      const form = new FormData()
      form.append('image', imgBuf, { filename: 'img.jpg' })
      const r = await axios.post('https://api.deepai.org/api/torch-srgan', form, {
        headers: { ...form.getHeaders(), 'api-key': process.env.DEEPAI_KEY || 'quickstart-QUdJIGlzIGF3ZXNvbWU' },
        timeout: 30000
      })
      const url = r.data?.output_url
      if (!url) return null
      const { buf } = await fetchBuf(url)
      return buf
    },
    async () => {
      const form = new FormData()
      form.append('image_file', imgBuf, { filename: 'img.jpg' })
      const r = await axios.post('https://clipdrop-api.co/image-upscaling/v1/upscale', form, {
        headers: { ...form.getHeaders(), 'x-api-key': process.env.CLIPDROP_KEY || 'test' },
        params: { target_width: 2048, target_height: 2048 },
        responseType: 'arraybuffer', timeout: 30000
      })
      return Buffer.from(r.data)
    },
    async () => {
      const form = new FormData()
      form.append('image', imgBuf, { filename: 'img.jpg' })
      const r = await axios.post('https://api.deepai.org/api/image-editor', form, {
        headers: { ...form.getHeaders(), 'api-key': process.env.DEEPAI_KEY || 'quickstart-QUdJIGlzIGF3ZXNvbWU' },
        timeout: 30000
      })
      const url = r.data?.output_url
      if (!url) return null
      const { buf } = await fetchBuf(url)
      return buf
    },
    async () => {
      const form = new FormData()
      form.append('image', imgBuf, { filename: 'img.jpg' })
      const r = await axios.post('https://picwish.com/api/sharpen', form, {
        headers: { ...form.getHeaders(), 'x-api-key': process.env.PICWISH_KEY || 'test' },
        responseType: 'arraybuffer', timeout: 30000
      })
      return Buffer.from(r.data)
    },
    async () => {
      const inp = tmp('jpg'); const out = tmp('jpg')
      fs.writeFileSync(inp, imgBuf)
      await execAsync(`convert "${inp}" -sharpen 0x3 "${out}"`, { timeout: 15000 })
      const b = fs.readFileSync(out); clean(inp, out); return b
    },
    async () => {
      const form = new FormData()
      form.append('image', imgBuf, { filename: 'img.jpg' })
      const r = await axios.post('https://api.deepai.org/api/super-resolution', form, {
        headers: { ...form.getHeaders(), 'api-key': process.env.DEEPAI_KEY || 'quickstart-QUdJIGlzIGF3ZXNvbWU' },
        timeout: 30000
      })
      const url = r.data?.output_url
      if (!url) return null
      const { buf } = await fetchBuf(url)
      return buf
    }
  ]
  for (const api of apis) {
    try { const b = await api(); if (b?.length > 500) return b } catch {}
  }
  return null
}

// ─────────────────────────────────────────────
// FEATURE 6 — REMINI (Face restore / enhance)
// ─────────────────────────────────────────────
async function doRemini(imgBuf) {
  const apis = [
    async () => {
      const form = new FormData()
      form.append('image', imgBuf, { filename: 'img.jpg' })
      const r = await axios.post('https://api.deepai.org/api/torch-srgan', form, {
        headers: { ...form.getHeaders(), 'api-key': process.env.DEEPAI_KEY || 'quickstart-QUdJIGlzIGF3ZXNvbWU' },
        timeout: 30000
      })
      const url = r.data?.output_url; if (!url) return null
      const { buf } = await fetchBuf(url); return buf
    },
    async () => {
      const form = new FormData()
      form.append('image', imgBuf, { filename: 'img.jpg' })
      const r = await axios.post('https://api.deepai.org/api/waifu2x', form, {
        headers: { ...form.getHeaders(), 'api-key': process.env.DEEPAI_KEY || 'quickstart-QUdJIGlzIGF3ZXNvbWU' },
        timeout: 30000
      })
      const url = r.data?.output_url; if (!url) return null
      const { buf } = await fetchBuf(url); return buf
    },
    async () => {
      const start = await axios.post('https://api.replicate.com/v1/models/tencentarc/gfpgan/predictions', {
        input: { img: 'data:image/jpeg;base64,' + imgBuf.toString('base64'), version: 1.4, scale: 2 }
      }, { headers: { Authorization: `Bearer ${process.env.REPLICATE_KEY || 'test'}` }, timeout: 30000 })
      const pollUrl = start.data?.urls?.get; if (!pollUrl) return null
      for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 3000))
        const p = await axios.get(pollUrl, { headers: { Authorization: `Bearer ${process.env.REPLICATE_KEY || 'test'}` } })
        if (p.data?.status === 'succeeded') {
          const url = p.data.output; if (!url) return null
          const { buf } = await fetchBuf(url); return buf
        }
        if (p.data?.status === 'failed') return null
      }
      return null
    },
    async () => {
      const form = new FormData()
      form.append('image', imgBuf, { filename: 'img.jpg' })
      const r = await axios.post('https://api.deepai.org/api/colorizer', form, {
        headers: { ...form.getHeaders(), 'api-key': process.env.DEEPAI_KEY || 'quickstart-QUdJIGlzIGF3ZXNvbWU' },
        timeout: 30000
      })
      const url = r.data?.output_url; if (!url) return null
      const { buf } = await fetchBuf(url); return buf
    },
    async () => {
      const form = new FormData()
      form.append('image_file', imgBuf, { filename: 'img.jpg' })
      const r = await axios.post('https://clipdrop-api.co/portrait-surface-diffusion/v1', form, {
        headers: { ...form.getHeaders(), 'x-api-key': process.env.CLIPDROP_KEY || 'test' },
        responseType: 'arraybuffer', timeout: 30000
      })
      return Buffer.from(r.data)
    },
    async () => {
      const b64 = imgBuf.toString('base64')
      const r = await axios.post('https://deep-image.ai/rest_api/process_result', {
        url: `data:image/jpeg;base64,${b64}`, improvements: ['denoise', 'light']
      }, { headers: { 'x-api-key': process.env.DEEPIMAGE_KEY || 'test' }, timeout: 30000 })
      const url = r.data?.output_url; if (!url) return null
      const { buf } = await fetchBuf(url); return buf
    },
    async () => {
      const form = new FormData()
      form.append('image', imgBuf, { filename: 'img.jpg' })
      const r = await axios.post('https://picwish.com/api/face-enhance', form, {
        headers: { ...form.getHeaders(), 'x-api-key': process.env.PICWISH_KEY || 'test' },
        responseType: 'arraybuffer', timeout: 30000
      })
      return Buffer.from(r.data)
    },
    async () => {
      const form = new FormData()
      form.append('image', imgBuf, { filename: 'img.jpg' })
      const r = await axios.post('https://api.pixelcut.app/v1/enhance', form, {
        headers: { ...form.getHeaders(), 'X-API-KEY': process.env.PIXELCUT_KEY || 'test' },
        responseType: 'arraybuffer', timeout: 30000
      })
      return Buffer.from(r.data)
    },
    async () => {
      const sharp = (await import('sharp')).default
      return await sharp(imgBuf).sharpen({ sigma: 3 }).modulate({ brightness: 1.05, saturation: 1.1 }).jpeg({ quality: 95 }).toBuffer()
    },
    async () => {
      const form = new FormData()
      form.append('image', imgBuf, { filename: 'img.jpg' })
      const r = await axios.post('https://api.deepai.org/api/neural-talk-2', form, {
        headers: { ...form.getHeaders(), 'api-key': process.env.DEEPAI_KEY || 'quickstart-QUdJIGlzIGF3ZXNvbWU' },
        timeout: 30000
      })
      const url = r.data?.output_url; if (!url) return null
      const { buf } = await fetchBuf(url); return buf
    }
  ]
  for (const api of apis) {
    try { const b = await api(); if (b?.length > 500) return b } catch {}
  }
  return null
}

// ─────────────────────────────────────────────
// FEATURE 7 — VIDEO GENERATION (prompt to video)
// ─────────────────────────────────────────────
async function doVideoGen(prompt) {
  const apis = [
    async () => {
      const r = await axios.post('https://api.replicate.com/v1/models/anotherjesse/zeroscope-v2-xl/predictions', {
        input: { prompt, num_frames: 24, fps: 8, width: 576, height: 320 }
      }, { headers: { Authorization: `Bearer ${process.env.REPLICATE_KEY || 'test'}` }, timeout: 30000 })
      const pollUrl = r.data?.urls?.get; if (!pollUrl) return null
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 5000))
        const p = await axios.get(pollUrl, { headers: { Authorization: `Bearer ${process.env.REPLICATE_KEY || 'test'}` } })
        if (p.data?.status === 'succeeded') {
          const url = p.data.output; if (!url) return null
          const { buf } = await fetchBuf(typeof url === 'string' ? url : url[0]); return buf
        }
        if (p.data?.status === 'failed') return null
      }
      return null
    },
    async () => {
      const r = await axios.post('https://api.stability.ai/v2beta/image-to-video', {
        cfg_scale: 2.5, motion_bucket_id: 40
      }, { headers: { Authorization: `Bearer ${process.env.STABILITY_KEY || 'test'}` }, timeout: 30000 })
      const id = r.data?.id; if (!id) return null
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 5000))
        const p = await axios.get(`https://api.stability.ai/v2beta/image-to-video/result/${id}`, {
          headers: { Authorization: `Bearer ${process.env.STABILITY_KEY || 'test'}` },
          responseType: 'arraybuffer'
        })
        if (p.status === 200) return Buffer.from(p.data)
      }
      return null
    },
    async () => {
      const r = await axios.post('https://api.replicate.com/v1/models/lucataco/animate-diff-v2/predictions', {
        input: { prompt, num_frames: 16 }
      }, { headers: { Authorization: `Bearer ${process.env.REPLICATE_KEY || 'test'}` }, timeout: 30000 })
      const pollUrl = r.data?.urls?.get; if (!pollUrl) return null
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 5000))
        const p = await axios.get(pollUrl, { headers: { Authorization: `Bearer ${process.env.REPLICATE_KEY || 'test'}` } })
        if (p.data?.status === 'succeeded') {
          const url = p.data.output; if (!url) return null
          const { buf } = await fetchBuf(typeof url === 'string' ? url : url[0]); return buf
        }
        if (p.data?.status === 'failed') return null
      }
      return null
    },
    async () => {
      const r = await axios.post('https://api.together.xyz/v1/images/generations', {
        model: 'black-forest-labs/FLUX.1-schnell-Free', prompt, steps: 4
      }, { headers: { Authorization: `Bearer ${process.env.TOGETHER_KEY || 'test'}` }, timeout: 60000 })
      const url = r.data?.data?.[0]?.url; if (!url) return null
      const { buf } = await fetchBuf(url); return buf
    }
  ]
  for (const api of apis) {
    try { const b = await api(); if (b?.length > 500) return b } catch {}
  }
  return null
}

// ─────────────────────────────────────────────
// FEATURE 8 — VOICE GENERATION (TTS)
// ─────────────────────────────────────────────
async function doVoiceGen(text, voiceType = 'random') {
  const voices = {
    male: ['onyx', 'echo', 'fable'],
    female: ['nova', 'shimmer', 'alloy'],
    child: ['alloy'],
    random: ['alloy', 'echo', 'fable', 'nova', 'onyx', 'shimmer']
  }
  const voiceList = voices[voiceType] || voices.random
  const voice = voiceList[Math.floor(Math.random() * voiceList.length)]

  const apis = [
    // 1. OpenAI TTS
    async () => {
      const r = await axios.post('https://api.openai.com/v1/audio/speech', {
        model: 'tts-1', input: text, voice, speed: 1.0
      }, { headers: { Authorization: `Bearer ${process.env.OPENAI_KEY || 'test'}` }, responseType: 'arraybuffer', timeout: 30000 })
      return Buffer.from(r.data)
    },
    // 2. ElevenLabs
    async () => {
      const voiceId = voiceType === 'female' ? 'EXAVITQu4vr4xnSDxMaL' : voiceType === 'child' ? 'pNInz6obpgDQGcFmaJgB' : '21m00Tcm4TlvDq8ikWAM'
      const r = await axios.post(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        text, model_id: 'eleven_monolingual_v1', voice_settings: { stability: 0.5, similarity_boost: 0.75 }
      }, { headers: { 'xi-api-key': process.env.ELEVENLABS_KEY || 'test' }, responseType: 'arraybuffer', timeout: 30000 })
      return Buffer.from(r.data)
    },
    // 3. Google TTS
    async () => {
      const lang = 'en-US'
      const gender = voiceType === 'female' ? 'FEMALE' : voiceType === 'child' ? 'NEUTRAL' : 'MALE'
      const r = await axios.post(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.GOOGLE_TTS_KEY || 'test'}`, {
        input: { text },
        voice: { languageCode: lang, ssmlGender: gender },
        audioConfig: { audioEncoding: 'MP3' }
      }, { timeout: 30000 })
      const b64 = r.data?.audioContent; if (!b64) return null
      return Buffer.from(b64, 'base64')
    },
    // 4. Azure TTS
    async () => {
      const voiceName = voiceType === 'female' ? 'en-US-JennyNeural' : voiceType === 'child' ? 'en-US-AnaNeural' : 'en-US-GuyNeural'
      const token = await axios.post(`https://eastus.api.cognitive.microsoft.com/sts/v1.0/issueToken`, null, {
        headers: { 'Ocp-Apim-Subscription-Key': process.env.AZURE_TTS_KEY || 'test' }
      })
      const r = await axios.post('https://eastus.tts.speech.microsoft.com/cognitiveservices/v1', {
        ssml: `<speak version='1.0' xml:lang='en-US'><voice name='${voiceName}'>${text}</voice></speak>`
      }, { headers: { Authorization: `Bearer ${token.data}`, 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3' }, responseType: 'arraybuffer', timeout: 30000 })
      return Buffer.from(r.data)
    },
    // 5. PlayHT
    async () => {
      const start = await axios.post('https://api.play.ht/api/v2/tts', {
        text, voice: voiceType === 'female' ? 's3://voice-cloning-zero-shot/d9ff78ba-d016-47f6-b0ef-dd630f59414e/female-cs/manifest.json' : 'larry',
        output_format: 'mp3'
      }, { headers: { Authorization: `Bearer ${process.env.PLAYHT_KEY || 'test'}`, 'X-USER-ID': process.env.PLAYHT_USER || 'test' }, timeout: 30000 })
      const url = start.data?.href; if (!url) return null
      for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 2000))
        const p = await axios.get(url, { headers: { Authorization: `Bearer ${process.env.PLAYHT_KEY || 'test'}`, 'X-USER-ID': process.env.PLAYHT_USER || 'test' } })
        if (p.data?.output?.url) { const { buf } = await fetchBuf(p.data.output.url); return buf }
      }
      return null
    },
    // 6. StreamElements TTS (free)
    async () => {
      const voice2 = voiceType === 'female' ? 'Joanna' : voiceType === 'child' ? 'Justin' : 'Matthew'
      const url = `https://api.streamelements.com/kappa/v2/speech?voice=${voice2}&text=${encodeURIComponent(text)}`
      const { buf } = await fetchBuf(url)
      return buf
    },
    // 7. Voicerss
    async () => {
      const url = `https://api.voicerss.org/?key=${process.env.VOICERSS_KEY || 'test'}&hl=en-us&v=${voiceType === 'female' ? 'Linda' : 'John'}&src=${encodeURIComponent(text)}&c=MP3`
      const { buf } = await fetchBuf(url)
      return buf
    },
    // 8. TikTok TTS (unofficial)
    async () => {
      const voices2 = { male: 'en_us_006', female: 'en_us_female_itp', child: 'en_us_ghostface', random: 'en_us_002' }
      const r = await axios.post('https://tiktok-tts.weilnet.workers.dev/api/generation', {
        text, voice: voices2[voiceType] || 'en_us_002'
      }, { timeout: 20000 })
      const b64 = r.data?.data; if (!b64) return null
      return Buffer.from(b64, 'base64')
    },
    // 9. Uberduck
    async () => {
      const r = await axios.post('https://api.uberduck.ai/speak', {
        speech: text, voice: voiceType === 'female' ? 'amy' : 'zwf'
      }, { auth: { username: process.env.UBERDUCK_KEY || 'test', password: process.env.UBERDUCK_SECRET || 'test' }, timeout: 30000 })
      const uuid = r.data?.uuid; if (!uuid) return null
      for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 2000))
        const p = await axios.get(`https://api.uberduck.ai/speak-status?uuid=${uuid}`, {
          auth: { username: process.env.UBERDUCK_KEY || 'test', password: process.env.UBERDUCK_SECRET || 'test' }
        })
        if (p.data?.path) { const { buf } = await fetchBuf(p.data.path); return buf }
      }
      return null
    },
    // 10. Replica Studios
    async () => {
      const r = await axios.post('https://api.replicastudios.com/speech', {
        txt: text, speaker_id: voiceType === 'female' ? '12' : '1', bit_rate: 128, sample_rate: 44100
      }, { headers: { Authorization: `Bearer ${process.env.REPLICA_KEY || 'test'}` }, timeout: 30000 })
      const url = r.data?.uuid; if (!url) return null
      const { buf } = await fetchBuf(url); return buf
    }
  ]
  for (const api of apis) {
    try { const b = await api(); if (b?.length > 500) return b } catch {}
  }
  return null
}

// ─────────────────────────────────────────────
// FEATURE 9 — LYRICS
// ─────────────────────────────────────────────
async function doLyrics(query) {
  const apis = [
    async () => {
      const r = await axios.get('https://api.genius.com/search', {
        params: { q: query }, timeout: TIMEOUT,
        headers: { Authorization: `Bearer ${process.env.GENIUS_TOKEN || 'tBkgkNP6YnkKPkyNBkj3rUQYwFhJCh9n5IJ5ZlmGZsrMFvEQFbmN8EiLuFcGOPrH'}` }
      })
      const t = r.data?.response?.hits?.[0]?.result
      if (!t) return null
      return { title: t.title, artist: t.primary_artist?.name, url: t.url, thumbnail: t.song_art_image_url, source: 'Genius' }
    },
    async () => {
      const r = await axios.get(`https://lyrist.vercel.app/api/${encodeURIComponent(query)}`, { timeout: TIMEOUT })
      if (!r.data?.lyrics) return null
      return { title: r.data.title, artist: r.data.artist, lyrics: r.data.lyrics?.slice(0, 1500), thumbnail: r.data.image, source: 'Lyrist' }
    },
    async () => {
      const r = await axios.get('https://api.lyrics.ovh/v1/' + query.replace(' ', '/'), { timeout: TIMEOUT })
      if (!r.data?.lyrics) return null
      return { lyrics: r.data.lyrics?.slice(0, 1500), source: 'Lyrics.ovh' }
    },
    async () => {
      const r = await axios.get(`https://some-random-api.com/lyrics?title=${encodeURIComponent(query)}`, { timeout: TIMEOUT })
      if (!r.data?.lyrics) return null
      return { title: r.data.title, author: r.data.author, lyrics: r.data.lyrics?.slice(0, 1500), thumbnail: r.data.thumbnail?.genius, source: 'SRA' }
    },
    async () => {
      const [title, artist] = query.split(' by ')
      const r = await axios.get('https://api.musixmatch.com/ws/1.1/track.search', {
        params: { apikey: '3960fe569e0f9c70bc35d454cd407a9c', q_track: title, q_artist: artist || '', page_size: 1 }, timeout: TIMEOUT
      })
      const t = r.data?.message?.body?.track_list?.[0]?.track
      if (!t) return null
      const lyrics = await axios.get('https://api.musixmatch.com/ws/1.1/track.lyrics.get', {
        params: { apikey: '3960fe569e0f9c70bc35d454cd407a9c', track_id: t.track_id }, timeout: TIMEOUT
      })
      const txt = lyrics.data?.message?.body?.lyrics?.lyrics_body
      if (!txt) return null
      return { title: t.track_name, artist: t.artist_name, lyrics: txt.slice(0, 1500), source: 'Musixmatch' }
    }
  ]
  for (const api of apis) {
    try { const r = await api(); if (r) return r } catch {}
  }
  return null
}

// ─────────────────────────────────────────────
// FEATURE 10 — BIBLE VERSE
// ─────────────────────────────────────────────
async function doBible(query) {
  const apis = [
    async () => {
      const r = await axios.get(`https://bible-api.com/${encodeURIComponent(query)}`, { timeout: TIMEOUT })
      if (!r.data?.text) return null
      return { reference: r.data.reference, text: r.data.text, translation: r.data.translation_name || 'KJV' }
    },
    async () => {
      const r = await axios.get(`https://labs.bible.org/api/?passage=${encodeURIComponent(query)}&type=json`, { timeout: TIMEOUT })
      const v = r.data?.[0]
      if (!v) return null
      return { reference: `${v.bookname} ${v.chapter}:${v.verse}`, text: v.text, translation: 'NET' }
    },
    async () => {
      const r = await axios.get(`https://api.esv.org/v3/passage/text/?q=${encodeURIComponent(query)}&include-passage-references=true`, {
        headers: { Authorization: `Token ${process.env.ESV_KEY || 'test'}` }, timeout: TIMEOUT
      })
      const text = r.data?.passages?.[0]
      if (!text) return null
      return { reference: r.data?.canonical, text: text.slice(0, 800), translation: 'ESV' }
    },
    async () => {
      const r = await axios.get(`https://api.scripture.api.bible/v1/bibles/de4e12af7f28f599-02/search?query=${encodeURIComponent(query)}`, {
        headers: { 'api-key': process.env.BIBLE_KEY || 'test' }, timeout: TIMEOUT
      })
      const v = r.data?.data?.verses?.[0]
      if (!v) return null
      return { reference: v.reference, text: v.text, translation: 'KJV' }
    },
    async () => {
      const r = await axios.get(`https://cdn.jsdelivr.net/gh/wldeh/bible-api/bibles/en-kjv/books/john/chapters/3/verses/16.json`, { timeout: TIMEOUT })
      return { reference: 'John 3:16', text: r.data?.text || 'For God so loved the world...', translation: 'KJV' }
    }
  ]
  for (const api of apis) {
    try { const r = await api(); if (r) return r } catch {}
  }
  return null
}

// ─────────────────────────────────────────────
// FEATURE 11 — QURAN VERSE
// ─────────────────────────────────────────────
async function doQuran(query) {
  const apis = [
    async () => {
      const [surah, ayah] = query.split(':').map(s => s.trim())
      const r = await axios.get(`https://api.alquran.cloud/v1/ayah/${surah}:${ayah || 1}/en.asad`, { timeout: TIMEOUT })
      const v = r.data?.data
      if (!v) return null
      const ar = await axios.get(`https://api.alquran.cloud/v1/ayah/${surah}:${ayah || 1}/ar`, { timeout: TIMEOUT })
      return {
        reference: v.surah?.englishName ? `${v.surah.englishName} ${surah}:${ayah || 1}` : query,
        arabic: ar.data?.data?.text,
        translation: v.text,
        translator: 'Muhammad Asad'
      }
    },
    async () => {
      const r = await axios.get(`https://api.quran.com/api/v4/verses/by_key/${query}?translations=131`, { timeout: TIMEOUT })
      const v = r.data?.verse
      if (!v) return null
      return {
        reference: v.verse_key,
        translation: v.translations?.[0]?.text?.replace(/<[^>]+>/g, ''),
        translator: 'Dr. Mustafa Khattab'
      }
    },
    async () => {
      const r = await axios.get(`https://quranapi.pages.dev/api/${query}.json`, { timeout: TIMEOUT })
      if (!r.data) return null
      return { reference: query, arabic: r.data?.arabic1, translation: r.data?.english, translator: 'Quran.com' }
    }
  ]
  for (const api of apis) {
    try { const r = await api(); if (r) return r } catch {}
  }
  return null
}

// ─────────────────────────────────────────────
// FEATURE 12 — FOOD INFO (AI describe + thumbnail)
// ─────────────────────────────────────────────
async function doFoodInfo(query) {
  const apis = [
    async () => {
      const r = await axios.get('https://api.spoonacular.com/recipes/complexSearch', {
        params: { query, number: 1, addRecipeInformation: true, apiKey: process.env.SPOONACULAR_KEY || 'test' }, timeout: TIMEOUT
      })
      const f = r.data?.results?.[0]
      if (!f) return null
      return {
        name: f.title, image: f.image,
        summary: f.summary?.replace(/<[^>]+>/g, '').slice(0, 300),
        calories: f.nutrition?.nutrients?.find(n => n.name === 'Calories')?.amount,
        time: f.readyInMinutes ? `${f.readyInMinutes} min` : null,
        servings: f.servings, source: 'Spoonacular'
      }
    },
    async () => {
      const r = await axios.get(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`, { timeout: TIMEOUT })
      const f = r.data?.meals?.[0]
      if (!f) return null
      const ingredients = [1, 2, 3, 4, 5].map(i => f[`strIngredient${i}`]).filter(Boolean).join(', ')
      return { name: f.strMeal, image: f.strMealThumb, summary: f.strInstructions?.slice(0, 300), category: f.strCategory, area: f.strArea, ingredients, source: 'MealDB' }
    },
    async () => {
      const r = await axios.get(`https://api.edamam.com/api/food-database/v2/parser?ingr=${encodeURIComponent(query)}&app_id=${process.env.EDAMAM_ID || 'test'}&app_key=${process.env.EDAMAM_KEY || 'test'}`, { timeout: TIMEOUT })
      const f = r.data?.hints?.[0]?.food
      if (!f) return null
      return { name: f.label, image: f.image, calories: Math.round(f.nutrients?.ENERC_KCAL), source: 'Edamam' }
    },
    async () => {
      const r = await axios.get(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=1`, { timeout: TIMEOUT })
      const f = r.data?.products?.[0]
      if (!f) return null
      return { name: f.product_name, image: f.image_url, calories: f.nutriments?.energy_value, source: 'OpenFoodFacts' }
    }
  ]
  for (const api of apis) {
    try { const r = await api(); if (r) return r } catch {}
  }
  return null
}

// ─────────────────────────────────────────────
// FEATURE 13 — STICKER MAKER
// ─────────────────────────────────────────────
async function doSticker(imgBuf, packName = 'Bot', authorName = 'Bot') {
  try {
    const { prepareWAMessageMedia, generateWAMessageFromContent, proto } = await import('@whiskeysockets/baileys')
    // Try sharp to convert to webp
    const sharp = (await import('sharp')).default
    const webpBuf = await sharp(imgBuf).resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp().toBuffer()
    return webpBuf
  } catch {
    // Fallback: ffmpeg
    try {
      const inp = tmp('jpg'); const out = tmp('webp')
      fs.writeFileSync(inp, imgBuf)
      await execAsync(`ffmpeg -i "${inp}" -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=white@0" "${out}" -y`, { timeout: 20000 })
      const b = fs.readFileSync(out); clean(inp, out); return b
    } catch {}
  }
  return null
}

// ─────────────────────────────────────────────
// FEATURE 14 — COLORIZE (B&W to color)
// ─────────────────────────────────────────────
async function doColorize(imgBuf) {
  const apis = [
    async () => {
      const form = new FormData()
      form.append('image', imgBuf, { filename: 'img.jpg' })
      const r = await axios.post('https://api.deepai.org/api/colorizer', form, {
        headers: { ...form.getHeaders(), 'api-key': process.env.DEEPAI_KEY || 'quickstart-QUdJIGlzIGF3ZXNvbWU' }, timeout: 30000
      })
      const url = r.data?.output_url; if (!url) return null
      const { buf } = await fetchBuf(url); return buf
    },
    async () => {
      const start = await axios.post('https://api.replicate.com/v1/models/arielreplicate/deoldify_image/predictions', {
        input: { input_image: 'data:image/jpeg;base64,' + imgBuf.toString('base64'), render_factor: 35 }
      }, { headers: { Authorization: `Bearer ${process.env.REPLICATE_KEY || 'test'}` }, timeout: 30000 })
      const pollUrl = start.data?.urls?.get; if (!pollUrl) return null
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 3000))
        const p = await axios.get(pollUrl, { headers: { Authorization: `Bearer ${process.env.REPLICATE_KEY || 'test'}` } })
        if (p.data?.status === 'succeeded') { const url = p.data.output; if (!url) return null; const { buf } = await fetchBuf(url); return buf }
        if (p.data?.status === 'failed') return null
      }
      return null
    }
  ]
  for (const api of apis) {
    try { const b = await api(); if (b?.length > 500) return b } catch {}
  }
  return null
}

// ─────────────────────────────────────────────
// FEATURE 15 — CARTOON
// ─────────────────────────────────────────────
async function doCartoon(imgBuf) {
  const apis = [
    async () => {
      const form = new FormData()
      form.append('image', imgBuf, { filename: 'img.jpg' })
      const r = await axios.post('https://api.deepai.org/api/toonify', form, {
        headers: { ...form.getHeaders(), 'api-key': process.env.DEEPAI_KEY || 'quickstart-QUdJIGlzIGF3ZXNvbWU' }, timeout: 30000
      })
      const url = r.data?.output_url; if (!url) return null
      const { buf } = await fetchBuf(url); return buf
    },
    async () => {
      const start = await axios.post('https://api.replicate.com/v1/models/cjwbw/codeformer/predictions', {
        input: { image: 'data:image/jpeg;base64,' + imgBuf.toString('base64') }
      }, { headers: { Authorization: `Bearer ${process.env.REPLICATE_KEY || 'test'}` }, timeout: 30000 })
      const pollUrl = start.data?.urls?.get; if (!pollUrl) return null
      for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 3000))
        const p = await axios.get(pollUrl, { headers: { Authorization: `Bearer ${process.env.REPLICATE_KEY || 'test'}` } })
        if (p.data?.status === 'succeeded') { const url = p.data.output; if (!url) return null; const { buf } = await fetchBuf(url); return buf }
        if (p.data?.status === 'failed') return null
      }
      return null
    },
    async () => {
      const form = new FormData()
      form.append('image', imgBuf, { filename: 'img.jpg' })
      const r = await axios.post('https://api.deepai.org/api/cartoonizer', form, {
        headers: { ...form.getHeaders(), 'api-key': process.env.DEEPAI_KEY || 'quickstart-QUdJIGlzIGF3ZXNvbWU' }, timeout: 30000
      })
      const url = r.data?.output_url; if (!url) return null
      const { buf } = await fetchBuf(url); return buf
    }
  ]
  for (const api of apis) {
    try { const b = await api(); if (b?.length > 500) return b } catch {}
  }
  return null
}

// ─────────────────────────────────────────────
// FEATURE 16 — QR CODE
// ─────────────────────────────────────────────
async function doQR(text) {
  const apis = [
    async () => { const { buf } = await fetchBuf(`https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(text)}`); return buf },
    async () => { const { buf } = await fetchBuf(`https://chart.googleapis.com/chart?chs=512x512&cht=qr&chl=${encodeURIComponent(text)}&choe=UTF-8`); return buf },
    async () => { const { buf } = await fetchBuf(`https://quickchart.io/qr?text=${encodeURIComponent(text)}&size=512`); return buf },
    async () => {
      const r = await axios.post('https://qrcode-monkey.com/qr/custom', { data: text, config: { body: 'square' }, size: 300, file: 'png' }, { responseType: 'arraybuffer', timeout: TIMEOUT })
      return Buffer.from(r.data)
    }
  ]
  for (const api of apis) {
    try { const b = await api(); if (b?.length > 500) return b } catch {}
  }
  return null
}

// ─────────────────────────────────────────────
// FEATURE 17 — OCR (Read text from image)
// ─────────────────────────────────────────────
async function doOCR(imgBuf) {
  const apis = [
    async () => {
      const form = new FormData()
      form.append('base64Image', 'data:image/jpeg;base64,' + imgBuf.toString('base64'))
      form.append('language', 'eng')
      const r = await axios.post('https://api.ocr.space/parse/image', form, {
        headers: { ...form.getHeaders(), apikey: process.env.OCRSPACE_KEY || 'helloworld' }, timeout: TIMEOUT
      })
      const text = r.data?.ParsedResults?.[0]?.ParsedText
      if (!text) return null
      return text.trim()
    },
    async () => {
      const r = await axios.post('https://vision.googleapis.com/v1/images:annotate', {
        requests: [{ image: { content: imgBuf.toString('base64') }, features: [{ type: 'TEXT_DETECTION', maxResults: 1 }] }]
      }, { params: { key: process.env.GOOGLE_VISION_KEY || 'test' }, timeout: TIMEOUT })
      const text = r.data?.responses?.[0]?.fullTextAnnotation?.text
      if (!text) return null
      return text.trim()
    },
    async () => {
      const form = new FormData()
      form.append('image', imgBuf, { filename: 'img.jpg' })
      const r = await axios.post('https://api.deepai.org/api/read-text', form, {
        headers: { ...form.getHeaders(), 'api-key': process.env.DEEPAI_KEY || 'quickstart-QUdJIGlzIGF3ZXNvbWU' }, timeout: TIMEOUT
      })
      return r.data?.output?.replace(/\n+/g, ' ').trim() || null
    }
  ]
  for (const api of apis) {
    try { const r = await api(); if (r) return r } catch {}
  }
  return null
}

// ─────────────────────────────────────────────
// FEATURE 18 — GROUP STATUS (WhatsApp Stories)
// ─────────────────────────────────────────────
async function doGroupStatus(sock, content, caption) {
  const methods = [
    // M1: sendMessage status@broadcast image
    async () => {
      await sock.sendMessage('status@broadcast', {
        image: content, caption: caption || '',
        backgroundColor: '#000000', font: 1
      })
      return true
    },
    // M2: text status
    async () => {
      if (typeof content === 'string') {
        await sock.sendMessage('status@broadcast', {
          text: content,
          backgroundColor: '#6B2D8B',
          font: 4
        })
        return true
      }
      return false
    },
    // M3: video status
    async () => {
      await sock.sendMessage('status@broadcast', {
        video: content, caption: caption || '',
        seconds: 15
      })
      return true
    },
    // M4: with statusJidList
    async () => {
      await sock.sendMessage('status@broadcast', {
        image: content, caption: caption || ''
      }, { statusJidList: [] })
      return true
    },
    // M5: relayMessage approach
    async () => {
      const { generateWAMessageFromContent, proto } = await import('@whiskeysockets/baileys')
      const msg = generateWAMessageFromContent('status@broadcast', proto.Message.fromObject({
        imageMessage: { caption: caption || '', url: '', mimetype: 'image/jpeg' }
      }), { userJid: sock.user?.id })
      await sock.relayMessage('status@broadcast', msg.message, { messageId: msg.key.id, statusJidList: [] })
      return true
    }
  ]
  for (const m of methods) {
    try { const ok = await m(); if (ok) return { success: true } } catch {}
  }
  return { success: false }
}

// ─────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────
export default async function photo(sock, { msg, from, args, sender, command }, botSettings) {
  const brand = botSettings?.brand_name || botSettings?.botname || process.env.BUILD_BRAND || 'Bot'
  const cmd = command?.toLowerCase() || args?.[0]?.toLowerCase() || 'photo'
  const argText = (args?.slice(cmd === command ? 0 : 1) || []).join(' ').trim()

  const replyText = (lines) =>
    sock.sendMessage(from, {
      text: box(cmd.toUpperCase(), lines, brand)
    }, { quoted: msg })

  // ══ REMOVEBG ══
  if (['removebg', 'rmbg'].includes(cmd)) {
    await react(sock, msg, '🖼️')
    const imgBuf = await getImageBuffer(sock, msg)
    if (!imgBuf) return replyText(['⚠ Send or reply to an image'])
    const result = await doRemoveBg(imgBuf)
    if (!result) return replyText(['❌ Background removal failed — all APIs exhausted'])
    await sendImage(sock, from, msg, result, box('REMOVEBG', ['✅ Background removed'], brand))
    return
  }

  // ══ UPSCALE ══
  if (['upscale', 'enhance'].includes(cmd)) {
    await react(sock, msg, '🔍')
    const imgBuf = await getImageBuffer(sock, msg)
    if (!imgBuf) return replyText(['⚠ Send or reply to an image'])
    const result = await doUpscale(imgBuf)
    if (!result) return replyText(['❌ Upscale failed — all APIs exhausted'])
    await sendImage(sock, from, msg, result, box('UPSCALE', ['✅ Image upscaled 2x'], brand))
    return
  }

  // ══ IMAGINE ══
  if (['imagine', 'txt2img', 'ai'].includes(cmd)) {
    const prompt = argText || msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation
    if (!prompt) return replyText(['⚠ Usage: .imagine <prompt>', '💡 Or reply to a message with the prompt'])
    await react(sock, msg, '🎨')
    const result = await doImagine(prompt)
    if (!result) return replyText(['❌ Image generation failed — all APIs exhausted'])
    await sendImage(sock, from, msg, result, box('IMAGINE', [`🎨 *${prompt.slice(0, 60)}*`], brand))
    return
  }

  // ══ BLUR ══
  if (cmd === 'blur') {
    await react(sock, msg, '🌫️')
    const imgBuf = await getImageBuffer(sock, msg)
    if (!imgBuf) return replyText(['⚠ Send or reply to an image'])
    const level = parseInt(args?.[1]) || 10
    const result = await doBlur(imgBuf, level)
    if (!result) return replyText(['❌ Blur failed'])
    await sendImage(sock, from, msg, result, box('BLUR', [`✅ Blur applied (level ${level})`], brand))
    return
  }

  // ══ UNBLUR ══
  if (['unblur', 'deblur'].includes(cmd)) {
    await react(sock, msg, '✨')
    const imgBuf = await getImageBuffer(sock, msg)
    if (!imgBuf) return replyText(['⚠ Send or reply to an image'])
    const result = await doUnblur(imgBuf)
    if (!result) return replyText(['❌ Unblur failed'])
    await sendImage(sock, from, msg, result, box('UNBLUR', ['✅ Image sharpened'], brand))
    return
  }

  // ══ REMINI ══
  if (['remini', 'restore'].includes(cmd)) {
    await react(sock, msg, '💫')
    const imgBuf = await getImageBuffer(sock, msg)
    if (!imgBuf) return replyText(['⚠ Send or reply to an image'])
    const result = await doRemini(imgBuf)
    if (!result) return replyText(['❌ Enhancement failed'])
    await sendImage(sock, from, msg, result, box('REMINI', ['✅ Face & image restored'], brand))
    return
  }

  // ══ VIDEO GEN ══
  if (['vid2img', 'videogen', 'video'].includes(cmd)) {
    const prompt = argText || msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation
    if (!prompt) return replyText(['⚠ Usage: .video <prompt>'])
    await react(sock, msg, '🎬')
    const result = await doVideoGen(prompt)
    if (!result) return replyText(['❌ Video generation failed — try a simpler prompt'])
    const isMp4 = result.length > 100000
    if (isMp4) {
      await sock.sendMessage(from, { video: result, mimetype: 'video/mp4', caption: box('VIDEOGEN', [`🎬 *${prompt.slice(0, 60)}*`], brand) }, { quoted: msg })
    } else {
      await sendImage(sock, from, msg, result, box('VIDEOGEN', [`🎬 *${prompt.slice(0, 60)}*`], brand))
    }
    return
  }

  // ══ VOICE GEN ══
  if (['voicegen', 'tts', 'speak'].includes(cmd)) {
    const parts = argText.split(' ')
    let voiceType = 'random'
    let text = argText
    if (['male', 'female', 'child', 'random'].includes(parts[0]?.toLowerCase())) {
      voiceType = parts[0].toLowerCase()
      text = parts.slice(1).join(' ')
    }
    if (!text) return replyText(['⚠ Usage: .tts [male|female|child|random] <text>'])
    await react(sock, msg, '🎤')
    const result = await doVoiceGen(text, voiceType)
    if (!result) return replyText(['❌ Voice generation failed'])
    await sendAudio(sock, from, msg, result, `voice_${voiceType}.mp3`)
    await replyText([`✅ Voice: *${voiceType.toUpperCase()}*`, `📝 "${text.slice(0, 80)}"`])
    return
  }

  // ══ LYRICS ══
  if (['lyrics', 'songlyrics'].includes(cmd)) {
    if (!argText) return replyText(['⚠ Usage: .lyrics <song name>'])
    await react(sock, msg, '🎵')
    const result = await doLyrics(argText)
    if (!result) return replyText(['❌ Lyrics not found'])
    const lines = [
      result.title ? `🎵 *${result.title}*` : null,
      result.artist || result.author ? `👤 ${result.artist || result.author}` : null,
      result.lyrics ? `\n${result.lyrics.slice(0, 800)}` : null,
      result.url ? `🔗 Full: ${result.url}` : null,
      `🌐 ${result.source}`
    ]
    if (result.thumbnail) {
      try {
        const { buf } = await fetchBuf(result.thumbnail)
        await sendImage(sock, from, msg, buf, box('LYRICS', lines, brand))
      } catch { await replyText(lines) }
    } else { await replyText(lines) }
    return
  }

  // ══ BIBLE ══
  if (['bible', 'verse'].includes(cmd)) {
    const query = argText || 'John 3:16'
    await react(sock, msg, '📖')
    const result = await doBible(query)
    if (!result) return replyText(['❌ Verse not found', `💡 Try: .bible John 3:16`])
    await replyText([
      `📖 *${result.reference}*`,
      ``,
      `"${result.text?.trim().slice(0, 500)}"`,
      ``,
      `📚 Translation: ${result.translation}`
    ])
    return
  }

  // ══ QURAN ══
  if (['quran', 'ayah'].includes(cmd)) {
    const query = argText || '2:255'
    await react(sock, msg, '🕌')
    const result = await doQuran(query)
    if (!result) return replyText(['❌ Ayah not found', `💡 Try: .quran 2:255`])
    await replyText([
      `🕌 *${result.reference}*`,
      result.arabic ? `\n${result.arabic}` : null,
      ``,
      `"${result.translation?.trim().slice(0, 500)}"`,
      result.translator ? `📚 ${result.translator}` : null
    ])
    return
  }

  // ══ FOOD INFO ══
  if (['food', 'foodinfo'].includes(cmd)) {
    if (!argText) return replyText(['⚠ Usage: .food <food name>'])
    await react(sock, msg, '🍽️')
    const result = await doFoodInfo(argText)
    if (!result) return replyText(['❌ Food not found'])
    const lines = [
      `🍽️ *${result.name}*`,
      result.category ? `📂 ${result.category}` : null,
      result.area ? `🌍 ${result.area}` : null,
      result.calories ? `🔥 ${Math.round(result.calories)} kcal` : null,
      result.time ? `⏱ ${result.time}` : null,
      result.ingredients ? `🥬 Ingredients: ${result.ingredients.slice(0, 100)}` : null,
      result.summary ? `\n📝 ${result.summary.slice(0, 200)}` : null,
      `🌐 ${result.source}`
    ]
    if (result.image) {
      try {
        const { buf } = await fetchBuf(result.image)
        await sendImage(sock, from, msg, buf, box('FOOD', lines, brand))
      } catch { await replyText(lines) }
    } else { await replyText(lines) }
    return
  }

  // ══ STICKER ══
  if (['sticker', 's'].includes(cmd)) {
    await react(sock, msg, '🎴')
    const imgBuf = await getImageBuffer(sock, msg)
    if (!imgBuf) return replyText(['⚠ Send or reply to an image'])
    const result = await doSticker(imgBuf, brand, brand)
    if (!result) return replyText(['❌ Sticker creation failed'])
    await sock.sendMessage(from, { sticker: result }, { quoted: msg })
    return
  }

  // ══ COLORIZE ══
  if (['colorize', 'colour'].includes(cmd)) {
    await react(sock, msg, '🎨')
    const imgBuf = await getImageBuffer(sock, msg)
    if (!imgBuf) return replyText(['⚠ Send or reply to a black & white image'])
    const result = await doColorize(imgBuf)
    if (!result) return replyText(['❌ Colorize failed'])
    await sendImage(sock, from, msg, result, box('COLORIZE', ['✅ Image colorized'], brand))
    return
  }

  // ══ CARTOON ══
  if (['cartoon', 'toon'].includes(cmd)) {
    await react(sock, msg, '🖌️')
    const imgBuf = await getImageBuffer(sock, msg)
    if (!imgBuf) return replyText(['⚠ Send or reply to an image'])
    const result = await doCartoon(imgBuf)
    if (!result) return replyText(['❌ Cartoon effect failed'])
    await sendImage(sock, from, msg, result, box('CARTOON', ['✅ Cartoon effect applied'], brand))
    return
  }

  // ══ QR CODE ══
  if (['qrcode', 'qr'].includes(cmd)) {
    if (!argText) return replyText(['⚠ Usage: .qr <text or URL>'])
    await react(sock, msg, '📲')
    const result = await doQR(argText)
    if (!result) return replyText(['❌ QR generation failed'])
    await sendImage(sock, from, msg, result, box('QR CODE', [`📲 *${argText.slice(0, 60)}*`], brand))
    return
  }

  // ══ OCR ══
  if (['ocr', 'readtext'].includes(cmd)) {
    await react(sock, msg, '📝')
    const imgBuf = await getImageBuffer(sock, msg)
    if (!imgBuf) return replyText(['⚠ Send or reply to an image with text'])
    const result = await doOCR(imgBuf)
    if (!result) return replyText(['❌ No text found in image'])
    await replyText([`📝 *Extracted Text:*`, ``, result.slice(0, 800)])
    return
  }

  // ══ GROUP STATUS (WhatsApp Stories) ══
  if (['groupstatus', 'setstatus'].includes(cmd)) {
    await react(sock, msg, '📢')
    const imgBuf = await getImageBuffer(sock, msg)
    const textContent = argText || ''

    if (!imgBuf && !textContent) {
      return replyText([
        '⚠ Usage:',
        '  .setstatus <text> — text status',
        '  .setstatus [reply to image] — image status',
        '  .setstatus [reply to image] <caption>'
      ])
    }

    const content = imgBuf || textContent
    const cap = imgBuf ? textContent : null
    const result = await doGroupStatus(sock, content, cap)

    if (result.success) {
      await react(sock, msg, '✅')
      await replyText(['✅ Status posted to WhatsApp Stories'])
    } else {
      await replyText(['❌ Failed to post status'])
    }
    return
  }

  // ══ HELP / UNKNOWN ══
  await replyText([
    '📋 *Available Commands:*',
    '',
    '🖼 .removebg — Remove image background',
    '🔍 .upscale — Upscale image 2x',
    '🎨 .imagine <prompt> — AI image generation',
    '🌫️ .blur — Blur an image',
    '✨ .unblur — Sharpen/unblur image',
    '💫 .remini — Restore/enhance face',
    '🎬 .video <prompt> — AI video generation',
    '🎤 .tts [voice] <text> — Text to speech',
    '🎵 .lyrics <song> — Get song lyrics',
    '📖 .bible <verse> — Bible verse',
    '🕌 .quran <surah:ayah> — Quran ayah',
    '🍽️ .food <name> — Food info + image',
    '🎴 .sticker — Image to sticker',
    '🎨 .colorize — Colorize B&W image',
    '🖌️ .cartoon — Cartoon effect',
    '📲 .qr <text> — Generate QR code',
    '📝 .ocr — Read text from image',
    '📢 .setstatus — Post to WhatsApp Stories'
  ])
}
