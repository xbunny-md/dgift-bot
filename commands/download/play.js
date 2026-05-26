// commands/download/play.js
import ytdl from 'ytdl-core'
import yts from 'yt-search'
import { pipeline } from 'stream'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'

const pipelineAsync = promisify(pipeline)

export const name = 'play'
export const alias = ['song', 'ytmp3', 'ytplay']
export const category = 'Download'
export const desc = 'Download YouTube audio by link or search query'

export default async function play(sock, { msg, from, args }, botSettings) {
  const tmpDir = './tmp'
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

  try {
    const query = args.join(' ').trim()

    // Usage kama hakuna query
    if (!query) {
      await sock.sendMessage(from, { react: { text: '🎵', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 🎵 *YouTube Music Downloader* ⌋
│ Status: Ready
│
│ Usage:
│ ${botSettings.prefix}play Despacito
│ ${botSettings.prefix}play https://youtube.com/watch?v=xxx
│
│ Note: Downloads audio locally, no external API
╰⊷ *${botSettings.botname}*`
      }, { quoted: msg })
    }

    await sock.sendMessage(from, { react: { text: '⏳', key: msg.key } })

    let videoUrl = query
    let videoInfo

    // Kama sio link, tafuta kwa yt-search
    if (!ytdl.validateURL(query)) {
      const search = await yts(query)
      if (!search.videos.length) {
        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
        return await sock.sendMessage(from, { text: '> No results found for your query.' }, { quoted: msg })
      }
      videoUrl = search.videos[0].url
      videoInfo = search.videos[0]
    } else {
      const info = await ytdl.getInfo(videoUrl)
      videoInfo = {
        title: info.videoDetails.title,
        duration: info.videoDetails.lengthSeconds,
        author: info.videoDetails.author.name,
        thumbnail: info.videoDetails.thumbnails[0]?.url
      }
    }

    // Check kama video inapatikana
    if (!ytdl.validateURL(videoUrl)) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: '> Invalid YouTube URL.' }, { quoted: msg })
    }

    const title = videoInfo.title || 'YouTube Audio'
    const duration = formatDuration(videoInfo.duration || videoInfo.seconds)
    const author = videoInfo.author || 'Unknown'
    const thumbnail = videoInfo.thumbnail || videoInfo.image
    const safeTitle = title.replace(/[\\/:*?"<>|]/g, '').slice(0, 50)
    const filePath = path.join(tmpDir, `${safeTitle}_${Date.now()}.mp3`)

    // Download audio stream
    const stream = ytdl(videoUrl, {
      filter: 'audioonly',
      quality: 'highestaudio',
      highWaterMark: 1 << 25
    })

    await pipelineAsync(stream, fs.createWriteStream(filePath))

    // Check file size - WhatsApp limit 64MB
    const stats = fs.statSync(filePath)
    if (stats.size > 64 * 1024 * 1024) {
      fs.unlinkSync(filePath)
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: '> File too large. Max 64MB allowed.' }, { quoted: msg })
    }

    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

    // Tuma thumbnail kwanza
    if (thumbnail) {
      await sock.sendMessage(from, {
        image: { url: thumbnail },
        caption: `╭─⌈ 🎵 *Now Playing* ⌋
│ Title: ${title}
│ Duration: ${duration}
│ Author: ${author}
╰⊷ *${botSettings.botname}*`
      }, { quoted: msg })
    }

    // Tuma audio
    await sock.sendMessage(from, {
      audio: { url: filePath },
      mimetype: 'audio/mpeg',
      ptt: false,
      fileName: `${safeTitle}.mp3`
    }, { quoted: msg })

    // Futa file baada ya kutuma
    fs.unlinkSync(filePath)

  } catch (err) {
    console.error(`[PLAY CMD ERROR]`, err.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Failed to download. Video may be age restricted or unavailable.' }, { quoted: msg })
  }
}

function formatDuration(seconds) {
  if (!seconds) return 'Unknown'
  const sec = parseInt(seconds)
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  return h > 0 
    ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    : `${m}:${s.toString().padStart(2, '0')}`
}