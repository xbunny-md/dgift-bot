import fs from 'fs'
import path from 'path'
import axios from 'axios'
import { pipeline } from 'stream'
import { promisify } from 'util'

const pipelineAsync = promisify(pipeline)
const TMP_DIR = './tmp'

if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true })
}

async function getBrandName(botSettings) {
  if (!botSettings?.supabase) return botSettings?.botname || 'Bot'
  const instanceId = botSettings.instance_id || 'DGIFT_DEFAULT'
  try {
    const { data } = await botSettings.supabase
     .from('b_settings')
     .select('brand_name, botname')
     .eq('id', instanceId)
     .maybeSingle()
    return data?.brand_name || data?.botname || 'Bot'
  } catch {
    return botSettings.botname || 'Bot'
  }
}

const APIS = [
  async (url) => {
    if (!url.includes('tiktok.com')) return null
    try {
      const { data } = await axios.get(`https://api.tikwm.com/video/?url=${encodeURIComponent(url)}`, { timeout: 12000 })
      if (data?.data?.play) {
        return {
          url: data.data.play,
          title: data.data.title || 'TikTok Video',
          thumbnail: data.data.cover
        }
      }
    } catch {}
    return null
  },
  async (url) => {
    if (!url.includes('tiktok.com')) return null
    try {
      const { data } = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`, { timeout: 12000 })
      if (data?.data?.play) {
        return {
          url: data.data.play,
          title: data.data.title || 'TikTok Video',
          thumbnail: data.data.cover
        }
      }
    } catch {}
    return null
  },
  async (url) => {
    if (!url.includes('instagram.com')) return null
    try {
      const { data } = await axios.get(`https://api.saveig.app/info?url=${encodeURIComponent(url)}`, { timeout: 12000 })
      if (data?.data?.url) {
        return {
          url: data.data.url,
          title: data.data.title || 'Instagram Video',
          thumbnail: data.data.thumbnail
        }
      }
    } catch {}
    return null
  },
  async (url) => {
    if (!url.includes('instagram.com')) return null
    try {
      const { data } = await axios.get(`https://api.instagramdownloader.app/download?url=${encodeURIComponent(url)}`, { timeout: 12000 })
      if (data?.url) {
        return {
          url: data.url,
          title: data.title || 'Instagram Video',
          thumbnail: data.thumbnail
        }
      }
    } catch {}
    return null
  },
  async (url) => {
    if (!url.includes('facebook.com')) return null
    try {
      const { data } = await axios.get(`https://api.fbdown.net/download?url=${encodeURIComponent(url)}`, { timeout: 12000 })
      if (data?.download?.hd) {
        return {
          url: data.download.hd,
          title: data.title || 'Facebook Video',
          thumbnail: data.thumbnail
        }
      }
    } catch {}
    return null
  },
  async (url) => {
    if (!url.includes('facebook.com')) return null
    try {
      const { data } = await axios.get(`https://api.fdownloader.app/download?url=${encodeURIComponent(url)}`, { timeout: 12000 })
      if (data?.url) {
        return {
          url: data.url,
          title: data.title || 'Facebook Video',
          thumbnail: data.thumbnail
        }
      }
    } catch {}
    return null
  }
]

export const name = 'social'
export const alias = ['tt', 'ig', 'fb', 'dl', 'download']
export const category = 'Downloader'
export const desc = 'Download TikTok Instagram Facebook videos'

export default async function executeAutonomousCommand(sock, { msg, from, args }, botSettings) {
  let filePath = null
  const brandName = await getBrandName(botSettings)
  const prefix = botSettings.prefix || '.'

  try {
    const query = args.join(' ').trim()
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || ''
    const url = query.match(/https?:\/\/[^\s]+/)?.[0] || quotedText.match(/https?:\/\/[^\s]+/)?.[0]

    if (!url) {
      await sock.sendMessage(from, { react: { text: '📥', key: msg.key } })
      return sock.sendMessage(from, {
        text: `╭─⌈ 📥 Social Downloader ⌋
│ Supports: TikTok | Instagram | Facebook
│ Usage: ${prefix}tt link
│ ${prefix}ig link
│ ${prefix}fb link
│ Reply to link also works
╰⊷ Powered by ${brandName}`
      }, { quoted: msg })
    }

    await sock.sendMessage(from, { react: { text: '⏳', key: msg.key } })

    let media = null
    for (const api of APIS) {
      try {
        const result = await api(url)
        if (result?.url) {
          media = result
          break
        }
      } catch {}
    }

    if (!media) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return sock.sendMessage(from, { text: '> Failed to download media' }, { quoted: msg })
    }

    const safeTitle = (media.title || 'social_video').replace(/[\\/:*?"<>|]/g, '').slice(0, 50)
    filePath = path.join(TMP_DIR, `${safeTitle}_${Date.now()}.mp4`)

    const response = await axios({
      url: media.url,
      method: 'GET',
      responseType: 'stream',
      timeout: 30000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })

    await pipelineAsync(response.data, fs.createWriteStream(filePath))

    if (!fs.existsSync(filePath)) {
      throw new Error('File save failed')
    }

    const stats = fs.statSync(filePath)
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2)

    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

    await sock.sendMessage(from, {
      video: { url: filePath },
      mimetype: 'video/mp4',
      fileName: `${safeTitle}.mp4`,
      caption: `📥 ${media.title || 'Video'}\n📦 ${sizeMB} MB\nPowered by ${brandName}`
    }, { quoted: msg })

    try { fs.unlinkSync(filePath) } catch {}

  } catch (err) {
    try {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    } catch {}
    await sock.sendMessage(from, { text: '> Download failed' }, { quoted: msg })
    try {
      if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath)
    } catch {}
  }
}