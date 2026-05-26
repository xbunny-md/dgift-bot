// commands/download/movie.js
import ytdl from 'ytdl-core'
import yts from 'yt-search'
import fs from 'fs'
import path from 'path'
import { pipeline } from 'stream'
import { promisify } from 'util'
import { HttpsProxyAgent } from 'https-proxy-agent'

const pipelineAsync = promisify(pipeline)
const tmpDir = './tmp'
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

export const name = 'movie'
export const alias = ['mv', 'film', 'series', 'episode']
export const category = 'Download'
export const desc = 'Download movies/series episodes from YouTube or search online'

export default async function movie(sock, { msg, from, args, quoted }, botSettings) {
  try {
    const query = args.join(' ').trim()
    const quotedText = quoted?.message?.conversation || quoted?.message?.extendedTextMessage?.text || ''
    const link = query.match(/(https?:\/\/[^\s]+)/)?.[0] || quotedText.match(/(https?:\/\/[^\s]+)/)?.[0]

    if (!query &&!link) {
      await sock.sendMessage(from, { react: { text: '🎬', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 🎬 *Movie/Series Downloader* ⌋
│ Status: Ready
│
│ Usage:
│ ${botSettings.prefix}movie Spider-Man 2021
│ ${botSettings.prefix}movie https://youtube.com/watch?v=xxx
│ ${botSettings.prefix}movie [reply to link]
│
│ Note: Supports age restricted videos with proxy
╰⊷ *${botSettings.botname}*`
      }, { quoted: msg })
    }

    await sock.sendMessage(from, { react: { text: '⏳', key: msg.key } })

    let videoUrl = link
    let videoInfo

    // Proxy setup
    const proxy = botSettings.proxy || process.env.HTTP_PROXY || process.env.HTTPS_PROXY
    const agent = proxy? new HttpsProxyAgent(proxy) : undefined

    const requestOptions = {
      agent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    }

    // Cookies kwa age restricted - weka kwenye botSettings.cookies kama una
    if (botSettings.cookies) {
      requestOptions.headers['Cookie'] = botSettings.cookies
    }

    // Kama ni link ya YouTube
    if (link && ytdl.validateURL(link)) {
      try {
        const info = await ytdl.getInfo(link, { requestOptions })
        videoInfo = {
          title: info.videoDetails.title,
          duration: info.videoDetails.lengthSeconds,
          author: info.videoDetails.author.name,
          thumbnail: info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1]?.url
        }
      } catch (e) {
        throw new Error('Failed to get video info. Video may be private or region locked.')
      }
    }
    // Kama ni search query
    else {
      const search = await yts(query)
      if (!search.videos.length) {
        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
        return await sock.sendMessage(from, { text: '> No results found.' }, { quoted: msg })
      }
      videoUrl = search.videos[0].url
      videoInfo = search.videos[0]
    }

    if (!ytdl.validateURL(videoUrl)) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: '> Invalid YouTube URL.' }, { quoted: msg })
    }

    const title = videoInfo.title || 'Video'
    const duration = formatDuration(videoInfo.duration || videoInfo.seconds)
    const author = videoInfo.author || 'Unknown'
    const safeTitle = title.replace(/[\\/:*?"<>|]/g, '').slice(0, 50)
    const filePath = path.join(tmpDir, `${safeTitle}_${Date.now()}.mp4`)

    // Download video - jaribu 720p kwanza, kama kubwa shusha quality
    let format = ytdl.chooseFormat(await ytdl.getInfo(videoUrl, { requestOptions }), {
      quality: 'highest',
      filter: f => f.container === 'mp4' && f.hasVideo && f.hasAudio
    })

    const stream = ytdl.downloadFromInfo(await ytdl.getInfo(videoUrl, { requestOptions }), {
      format,
      requestOptions,
      highWaterMark: 1 << 25
    })

    await pipelineAsync(stream, fs.createWriteStream(filePath))

    const stats = fs.statSync(filePath)
    const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2)

    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

    // Tuma thumbnail
    if (videoInfo.thumbnail) {
      await sock.sendMessage(from, {
        image: { url: videoInfo.thumbnail },
        caption: `╭─⌈ 🎬 *Movie Download* ⌋
│ Title: ${title}
│ Duration: ${duration}
│ Author: ${author}
│ Size: ${fileSizeMB}MB
╰⊷ *${botSettings.botname}*`
      }, { quoted: msg })
    }

    // Kama > 64MB tuma kama document, kama < 64MB tuma kama video
    if (stats.size > 64 * 1024 * 1024) {
      await sock.sendMessage(from, {
        document: { url: filePath },
        mimetype: 'video/mp4',
        fileName: `${safeTitle}.mp4`,
        caption: `${title} - ${fileSizeMB}MB`
      }, { quoted: msg })
    } else {
      await sock.sendMessage(from, {
        video: { url: filePath },
        mimetype: 'video/mp4',
        fileName: `${safeTitle}.mp4`,
        caption: title
      }, { quoted: msg })
    }

    // Futa cache
    fs.unlinkSync(filePath)

  } catch (err) {
    console.error(`[MOVIE CMD ERROR]`, err.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: `> Failed: ${err.message}` }, { quoted: msg })
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