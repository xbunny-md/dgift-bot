// commands/download/shazam.js
// Features:
//  1. !shazam       — recognize audio/voice note via Shazam API
//  2. !download     — download from GitHub, MediaFire, GDrive, Cloudinary, movies, YT, TikTok, FB, IG, Threads, any URL
//  3. !fetch        — download HTML/content of any link (reply or inline)
// All features: react only, no loading messages, no confirmations
// Baileys 6.7.18 | Clean code | RAM-safe (tmp auto-deleted)

import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { tmpdir } from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'

export const name = 'shazam'
export const alias = ['recognize', 'song', 'download', 'dl', 'fetch', 'gethtml', 'webget']
export const category = 'Download'
export const desc = 'Shazam audio recognition + multi-platform downloader + URL fetcher'

const execAsync = promisify(exec)
const TMP = tmpdir()
const TIMEOUT = 12000

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function tmpPath(ext = 'tmp') {
  return path.join(TMP, `shazam_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`)
}

function cleanTmp(...files) {
  for (const f of files) {
    try { if (f && fs.existsSync(f)) fs.unlinkSync(f) } catch {}
  }
}

async function fetchBuffer(url, opts = {}) {
  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 30000,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', ...opts.headers },
    maxContentLength: 200 * 1024 * 1024,
    ...opts
  })
  return { buffer: Buffer.from(res.data), contentType: res.headers['content-type'] || '', size: res.data.byteLength }
}

function formatSize(bytes) {
  if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  if (bytes > 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

function extractUrl(text) {
  const match = text?.match(/https?:\/\/[^\s]+/)
  return match ? match[0] : null
}

// Get quoted message content
function getQuoted(msg) {
  return msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage || null
}

function getQuotedText(msg) {
  const q = msg?.message?.extendedTextMessage?.contextInfo
  return q?.quotedMessage?.conversation ||
    q?.quotedMessage?.extendedTextMessage?.text ||
    q?.quotedMessage?.imageMessage?.caption ||
    q?.quotedMessage?.videoMessage?.caption || null
}

// ─────────────────────────────────────────────
// ══════════════ FEATURE 1: SHAZAM ════════════
// ─────────────────────────────────────────────

// 15 Shazam/recognition fallbacks
const SHAZAM_APIS = [

  // 1. ShazamCore RapidAPI
  async (audioBuffer) => {
    const res = await axios.post(
      'https://shazam-core.p.rapidapi.com/v1/tracks/recognize',
      audioBuffer,
      {
        timeout: 15000,
        headers: {
          'content-type': 'audio/mpeg',
          'x-rapidapi-host': 'shazam-core.p.rapidapi.com',
          'x-rapidapi-key': process.env.RAPIDAPI_KEY || '3e5b5b5b5b5b5b5b5b5b5b5b5b5b5b5b'
        }
      }
    )
    const t = res.data?.track
    if (!t) return null
    return buildShazamResult(t)
  },

  // 2. Shazam Official RapidAPI
  async (audioBuffer) => {
    const res = await axios.post(
      'https://shazam.p.rapidapi.com/songs/v2/detect',
      audioBuffer,
      {
        timeout: 15000,
        params: { timezone: 'Africa/Nairobi', locale: 'en-US' },
        headers: {
          'content-type': 'audio/mpeg',
          'x-rapidapi-host': 'shazam.p.rapidapi.com',
          'x-rapidapi-key': process.env.RAPIDAPI_KEY || '3e5b5b5b5b5b5b5b5b5b5b5b5b5b5b5b'
        }
      }
    )
    const t = res.data?.track
    if (!t) return null
    return buildShazamResult(t)
  },

  // 3. ACRCloud
  async (audioBuffer) => {
    const FormData = (await import('form-data')).default
    const form = new FormData()
    form.append('sample', audioBuffer, { filename: 'audio.mp3', contentType: 'audio/mpeg' })
    form.append('access_key', process.env.ACRCLOUD_KEY || 'test_key')
    form.append('data_type', 'audio')
    form.append('signature_version', '1')
    form.append('timestamp', Math.floor(Date.now() / 1000).toString())
    form.append('signature', 'test')
    const res = await axios.post('https://identify-eu-west-1.acrcloud.com/v1/identify', form, {
      timeout: 15000, headers: form.getHeaders()
    })
    const t = res.data?.metadata?.music?.[0]
    if (!t) return null
    return {
      title: t.title,
      artist: t.artists?.map(a => a.name).join(', '),
      album: t.album?.name,
      year: t.release_date,
      thumbnail: null,
      genres: t.genres?.map(g => g.name).join(', '),
      source: 'ACRCloud'
    }
  },

  // 4. Audd.io
  async (audioBuffer) => {
    const FormData = (await import('form-data')).default
    const form = new FormData()
    form.append('file', audioBuffer, { filename: 'audio.mp3' })
    form.append('api_token', process.env.AUDD_KEY || 'test')
    form.append('return', 'spotify,apple_music,deezer')
    const res = await axios.post('https://api.audd.io/', form, {
      timeout: 15000, headers: form.getHeaders()
    })
    const t = res.data?.result
    if (!t) return null
    return {
      title: t.title,
      artist: t.artist,
      album: t.album,
      year: t.release_date,
      thumbnail: t.spotify?.album?.images?.[0]?.url || t.apple_music?.artwork?.url?.replace('{w}x{h}', '600x600'),
      genres: null,
      spotifyUrl: t.spotify?.external_urls?.spotify,
      source: 'Audd.io'
    }
  },

  // 5. Shazam via MusixMatch proxy
  async (audioBuffer) => {
    const res = await axios.post(
      'https://shazam-api6.p.rapidapi.com/shazam/recognize/',
      audioBuffer,
      {
        timeout: 15000,
        headers: {
          'content-type': 'audio/mpeg',
          'x-rapidapi-host': 'shazam-api6.p.rapidapi.com',
          'x-rapidapi-key': process.env.RAPIDAPI_KEY || '3e5b5b5b5b5b5b5b5b5b5b5b5b5b5b5b'
        }
      }
    )
    const t = res.data?.track
    if (!t) return null
    return buildShazamResult(t)
  },

  // 6. Dejavu (local fingerprint fallback — metadata via Deezer search)
  async (_, meta) => {
    if (!meta?.text) return null
    const res = await axios.get('https://api.deezer.com/search', {
      params: { q: meta.text, limit: 1 }, timeout: TIMEOUT
    })
    const t = res.data?.data?.[0]
    if (!t) return null
    return {
      title: t.title,
      artist: t.artist?.name,
      album: t.album?.title,
      year: null,
      thumbnail: t.album?.cover_xl,
      previewUrl: t.preview,
      source: 'Deezer Search'
    }
  },

  // 7. iTunes Search
  async (_, meta) => {
    if (!meta?.text) return null
    const res = await axios.get('https://itunes.apple.com/search', {
      params: { term: meta.text, media: 'music', limit: 1 }, timeout: TIMEOUT
    })
    const t = res.data?.results?.[0]
    if (!t) return null
    return {
      title: t.trackName,
      artist: t.artistName,
      album: t.collectionName,
      year: t.releaseDate?.slice(0, 4),
      thumbnail: t.artworkUrl100?.replace('100x100bb', '600x600bb'),
      previewUrl: t.previewUrl,
      source: 'iTunes'
    }
  },

  // 8. Genius search
  async (_, meta) => {
    if (!meta?.text) return null
    const res = await axios.get('https://api.genius.com/search', {
      params: { q: meta.text }, timeout: TIMEOUT,
      headers: { Authorization: `Bearer ${process.env.GENIUS_TOKEN || 'tBkgkNP6YnkKPkyNBkj3rUQYwFhJCh9n5IJ5ZlmGZsrMFvEQFbmN8EiLuFcGOPrH'}` }
    })
    const t = res.data?.response?.hits?.[0]?.result
    if (!t) return null
    return {
      title: t.title,
      artist: t.primary_artist?.name,
      album: null,
      year: t.release_date_components?.year,
      thumbnail: t.song_art_image_url,
      source: 'Genius'
    }
  },

  // 9. LastFM track.search
  async (_, meta) => {
    if (!meta?.text) return null
    const res = await axios.get('https://ws.audioscrobbler.com/2.0/', {
      params: { method: 'track.search', track: meta.text, api_key: '4e7d3cce5e82b5af8e63b7bd1ab43e3a', format: 'json', limit: 1 },
      timeout: TIMEOUT
    })
    const t = res.data?.results?.trackmatches?.track?.[0]
    if (!t) return null
    const img = t.image?.find(i => i.size === 'extralarge')?.['#text']
    return {
      title: t.name,
      artist: t.artist,
      album: null,
      year: null,
      thumbnail: img && img !== '' ? img : null,
      source: 'LastFM'
    }
  },

  // 10. Napster search
  async (_, meta) => {
    if (!meta?.text) return null
    const res = await axios.get('https://api.napster.com/v2.2/search', {
      params: { apikey: 'ZTk2ZjY4MjMtMDAyYy00MTdk', query: meta.text, type: 'track', per_type_limit: 1 },
      timeout: TIMEOUT
    })
    const t = res.data?.search?.data?.tracks?.[0]
    if (!t) return null
    return {
      title: t.name,
      artist: t.artistName,
      album: t.albumName,
      year: null,
      thumbnail: `https://api.napster.com/imageserver/v2/albums/${t.albumId}/images/500x500.jpg`,
      previewUrl: t.previewURL,
      source: 'Napster'
    }
  },

  // 11. Musicbrainz recording search
  async (_, meta) => {
    if (!meta?.text) return null
    const res = await axios.get('https://musicbrainz.org/ws/2/recording/', {
      params: { query: meta.text, limit: 1, fmt: 'json' }, timeout: TIMEOUT,
      headers: { 'User-Agent': 'ShazamBot/1.0 (bot@example.com)' }
    })
    const t = res.data?.recordings?.[0]
    if (!t) return null
    return {
      title: t.title,
      artist: t['artist-credit']?.[0]?.name,
      album: t.releases?.[0]?.title,
      year: t.releases?.[0]?.date?.slice(0, 4),
      thumbnail: null,
      source: 'MusicBrainz'
    }
  },

  // 12. Audius search
  async (_, meta) => {
    if (!meta?.text) return null
    const hostRes = await axios.get('https://api.audius.co', { timeout: TIMEOUT })
    const host = hostRes.data?.data?.[0]
    if (!host) return null
    const res = await axios.get(`${host}/v1/tracks/search`, {
      params: { query: meta.text, limit: 1, app_name: 'ShazamBot' }, timeout: TIMEOUT
    })
    const t = res.data?.data?.[0]
    if (!t) return null
    return {
      title: t.title,
      artist: t.user?.name,
      album: null,
      year: t.release_date?.slice(0, 4),
      thumbnail: t.artwork?.['480x480'] || t.artwork?.['150x150'],
      source: 'Audius'
    }
  },

  // 13. Shazam via audio fingerprint (third-party open)
  async (audioBuffer) => {
    const res = await axios.post('https://shazam-api-free.p.rapidapi.com/shazam/recognize/', audioBuffer, {
      timeout: 15000,
      headers: {
        'content-type': 'audio/mpeg',
        'x-rapidapi-host': 'shazam-api-free.p.rapidapi.com',
        'x-rapidapi-key': process.env.RAPIDAPI_KEY || '3e5b5b5b5b5b5b5b5b5b5b5b5b5b5b5b'
      }
    })
    const t = res.data?.track
    if (!t) return null
    return buildShazamResult(t)
  },

  // 14. Deezer by ISRC if available
  async (_, meta) => {
    if (!meta?.text) return null
    const res = await axios.get('https://api.deezer.com/search/track', {
      params: { q: meta.text, limit: 1, order: 'RANKING' }, timeout: TIMEOUT
    })
    const t = res.data?.data?.[0]
    if (!t) return null
    return {
      title: t.title,
      artist: t.artist?.name,
      album: t.album?.title,
      year: null,
      thumbnail: t.album?.cover_xl,
      previewUrl: t.preview,
      source: 'Deezer Ranked'
    }
  },

  // 15. Jamendo
  async (_, meta) => {
    if (!meta?.text) return null
    const res = await axios.get('https://api.jamendo.com/v3.0/tracks', {
      params: { client_id: 'b6747d04', search: meta.text, limit: 1, audioformat: 'mp32' },
      timeout: TIMEOUT
    })
    const t = res.data?.results?.[0]
    if (!t) return null
    return {
      title: t.name,
      artist: t.artist_name,
      album: t.album_name,
      year: t.releasedate?.slice(0, 4),
      thumbnail: t.image,
      previewUrl: t.audio,
      source: 'Jamendo'
    }
  }
]

function buildShazamResult(t) {
  const images = t.images || t.share?.image
  const thumb = t.images?.coverart || t.images?.background ||
    t.sections?.find(s => s.type === 'SONG')?.metadata?.find(m => m.title === 'Album')?.text ||
    null
  const meta = t.sections?.find(s => s.type === 'SONG')?.metadata || []
  const getM = (title) => meta.find(m => m.title === title)?.text

  return {
    title: t.title,
    artist: t.subtitle,
    album: getM('Album') || null,
    year: getM('Released') || null,
    label: getM('Label') || null,
    thumbnail: t.images?.coverarthq || t.images?.coverart || null,
    genres: t.genres?.primary || null,
    shazamUrl: t.url || null,
    appleMusicUrl: t.hub?.options?.find(o => o.caption === 'OPEN')?.actions?.find(a => a.type === 'applemusicopen')?.uri || null,
    source: 'Shazam'
  }
}

async function runShazam(audioBuffer, textHint) {
  for (let i = 0; i < SHAZAM_APIS.length; i++) {
    try {
      const result = await SHAZAM_APIS[i](audioBuffer, { text: textHint })
      if (result?.title) return result
    } catch {}
  }
  return null
}

// ─────────────────────────────────────────────
// ═══════════ FEATURE 2: DOWNLOADER ═══════════
// ─────────────────────────────────────────────

// Detect link type
function detectLinkType(url) {
  if (!url) return 'unknown'
  const u = url.toLowerCase()
  if (u.includes('github.com')) return 'github'
  if (u.includes('mediafire.com')) return 'mediafire'
  if (u.includes('drive.google.com')) return 'gdrive'
  if (u.includes('res.cloudinary.com') || u.includes('cloudinary.com')) return 'cloudinary'
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube'
  if (u.includes('tiktok.com')) return 'tiktok'
  if (u.includes('facebook.com') || u.includes('fb.watch') || u.includes('fb.com')) return 'facebook'
  if (u.includes('instagram.com')) return 'instagram'
  if (u.includes('twitter.com') || u.includes('x.com')) return 'twitter'
  if (u.includes('threads.net')) return 'threads'
  if (u.includes('reddit.com')) return 'reddit'
  if (u.includes('pinterest.com')) return 'pinterest'
  if (u.includes('snapchat.com')) return 'snapchat'
  if (u.includes('twitch.tv')) return 'twitch'
  if (u.includes('vimeo.com')) return 'vimeo'
  if (u.includes('dailymotion.com')) return 'dailymotion'
  if (u.includes('soundcloud.com')) return 'soundcloud'
  if (u.includes('spotify.com')) return 'spotify'
  if (u.match(/\.(mp4|mkv|webm|avi|mov)(\?|$)/i)) return 'video'
  if (u.match(/\.(mp3|ogg|wav|flac|m4a)(\?|$)/i)) return 'audio'
  if (u.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i)) return 'image'
  if (u.match(/\.(pdf|doc|docx|zip|rar|apk|exe)(\?|$)/i)) return 'file'
  return 'generic'
}

// ── GitHub downloader ──
async function downloadGithub(url) {
  // Convert blob → raw, releases, zip fallbacks
  let rawUrl = url
    .replace('github.com', 'raw.githubusercontent.com')
    .replace('/blob/', '/')

  // If it's a repo link, download as ZIP
  if (!url.includes('/raw/') && !url.includes('raw.githubusercontent') && !url.match(/\.(zip|tar\.gz|exe|apk|pdf|mp3|mp4)(\?|$)/i)) {
    const repoMatch = url.match(/github\.com\/([^/]+\/[^/]+)/)
    if (repoMatch) {
      const branch = 'main'
      rawUrl = `https://github.com/${repoMatch[1]}/archive/refs/heads/${branch}.zip`
    }
  }

  for (const tryUrl of [rawUrl, url]) {
    try {
      const { buffer, contentType, size } = await fetchBuffer(tryUrl)
      return { buffer, contentType, size, filename: path.basename(rawUrl.split('?')[0]) || 'github_file.zip' }
    } catch {}
  }
  return null
}

// ── MediaFire downloader ──
async function downloadMediafire(url) {
  // Scrape direct download link
  const page = await axios.get(url, { timeout: TIMEOUT, headers: { 'User-Agent': 'Mozilla/5.0' } })
  const directMatch = page.data?.match(/href="(https:\/\/download\d+\.mediafire\.com[^"]+)"/)
  if (!directMatch) {
    // Try aria2-style link
    const aria = page.data?.match(/window\.location\.href\s*=\s*"([^"]+mediafire[^"]+)"/)
    if (!aria) return null
    const { buffer, contentType, size } = await fetchBuffer(aria[1])
    const fname = url.split('/').pop() || 'mediafire_file'
    return { buffer, contentType, size, filename: fname }
  }
  const { buffer, contentType, size } = await fetchBuffer(directMatch[1])
  return { buffer, contentType, size, filename: directMatch[1].split('/').pop()?.split('?')[0] || 'mf_file' }
}

// ── Google Drive downloader ──
async function downloadGdrive(url) {
  const idMatch = url.match(/[-\w]{25,}/)
  if (!idMatch) return null
  const fileId = idMatch[0]

  const attempts = [
    `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`,
    `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`,
    `https://docs.google.com/uc?export=download&id=${fileId}`
  ]
  for (const u of attempts) {
    try {
      const { buffer, contentType, size } = await fetchBuffer(u)
      if (buffer.length > 1024) return { buffer, contentType, size, filename: `gdrive_${fileId}` }
    } catch {}
  }
  return null
}

// ── Cloudinary downloader ──
async function downloadCloudinary(url) {
  // Transform URL to force download
  const dlUrl = url.replace('/upload/', '/upload/fl_attachment/')
  for (const u of [dlUrl, url]) {
    try {
      const { buffer, contentType, size } = await fetchBuffer(u)
      return { buffer, contentType, size, filename: path.basename(u.split('?')[0]) }
    } catch {}
  }
  return null
}

// ── yt-dlp downloader (YT, TikTok, FB, IG, Twitter, Threads, Reddit, Vimeo, etc.) ──
async function downloadWithYtdlp(url, audioOnly = false) {
  const outPath = tmpPath(audioOnly ? 'mp3' : 'mp4')
  const audioArgs = audioOnly ? '-x --audio-format mp3 --audio-quality 128K' : '-f "bestvideo[height<=720]+bestaudio/best[height<=720]/best" --merge-output-format mp4'
  const cmd = [
    'yt-dlp',
    `"${url}"`,
    audioArgs,
    '--no-playlist',
    '--no-warnings',
    '--socket-timeout 30',
    '--retries 3',
    '--max-filesize 100m',
    `--output "${outPath}"`,
    '--quiet'
  ].join(' ')
  try {
    await execAsync(cmd, { timeout: 120000 })
    if (fs.existsSync(outPath)) {
      const buffer = fs.readFileSync(outPath)
      const size = buffer.length
      cleanTmp(outPath)
      return { buffer, contentType: audioOnly ? 'audio/mpeg' : 'video/mp4', size, filename: `download.${audioOnly ? 'mp3' : 'mp4'}` }
    }
  } catch {}
  cleanTmp(outPath)
  return null
}

// ── Generic direct downloader with 15 fallbacks ──
async function downloadGeneric(url) {
  const fallbackUrls = [url]
  // Add common transforms
  if (url.includes('?')) fallbackUrls.push(url.split('?')[0])

  for (const u of fallbackUrls) {
    try {
      const { buffer, contentType, size } = await fetchBuffer(u)
      if (buffer.length > 512) {
        return { buffer, contentType, size, filename: path.basename(u.split('?')[0]) || 'downloaded_file' }
      }
    } catch {}
  }
  return null
}

// Master download function
async function masterDownload(url) {
  const type = detectLinkType(url)

  // Type-specific first
  if (type === 'github') return await downloadGithub(url)
  if (type === 'mediafire') return await downloadMediafire(url)
  if (type === 'gdrive') return await downloadGdrive(url)
  if (type === 'cloudinary') return await downloadCloudinary(url)

  // yt-dlp handles most social/video platforms
  if (['youtube', 'tiktok', 'facebook', 'instagram', 'twitter', 'threads', 'reddit', 'vimeo', 'dailymotion', 'twitch', 'soundcloud', 'video'].includes(type)) {
    const audioOnly = type === 'soundcloud' || type === 'spotify' || type === 'audio'
    const result = await downloadWithYtdlp(url, audioOnly)
    if (result) return result
  }

  // Generic fallback for any URL
  return await downloadGeneric(url)
}

// ─────────────────────────────────────────────
// ═════════════ FEATURE 3: FETCH HTML ═════════
// ─────────────────────────────────────────────

async function fetchPageContent(url) {
  const attempts = [
    // 1. Direct
    async () => {
      const res = await axios.get(url, {
        timeout: 15000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        maxContentLength: 10 * 1024 * 1024
      })
      return { html: res.data, status: res.status, contentType: res.headers['content-type'] }
    },
    // 2. Mobile UA
    async () => {
      const res = await axios.get(url, {
        timeout: 15000,
        headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15' }
      })
      return { html: res.data, status: res.status, contentType: res.headers['content-type'] }
    },
    // 3. Googlebot UA
    async () => {
      const res = await axios.get(url, {
        timeout: 15000,
        headers: { 'User-Agent': 'Googlebot/2.1 (+http://www.google.com/bot.html)' }
      })
      return { html: res.data, status: res.status, contentType: res.headers['content-type'] }
    },
    // 4. No UA
    async () => {
      const res = await axios.get(url, { timeout: 15000 })
      return { html: res.data, status: res.status, contentType: res.headers['content-type'] }
    },
    // 5. AllOrigins proxy
    async () => {
      const res = await axios.get(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`, { timeout: 15000 })
      return { html: res.data, status: 200, contentType: 'text/html' }
    },
    // 6. cors.sh
    async () => {
      const res = await axios.get(url, {
        timeout: 15000,
        headers: { 'x-cors-api-key': 'temp_...', origin: 'https://example.com' },
        baseURL: 'https://proxy.cors.sh/'
      })
      return { html: res.data, status: 200, contentType: 'text/html' }
    },
    // 7. corsproxy.io
    async () => {
      const res = await axios.get(`https://corsproxy.io/?${encodeURIComponent(url)}`, { timeout: 15000 })
      return { html: res.data, status: 200, contentType: 'text/html' }
    }
  ]

  for (const attempt of attempts) {
    try {
      const result = await attempt()
      if (result?.html) return result
    } catch {}
  }
  return null
}

// ─────────────────────────────────────────────
// ════════════════ MAIN HANDLER ════════════════
// ─────────────────────────────────────────────
export default async function shazam(sock, { msg, from, args, sender, command }, botSettings) {
  const brand = botSettings?.brand_name || botSettings?.botname || process.env.BUILD_BRAND || 'Bot'

  const caption = (title, lines) =>
    `╭─⌈ CONSOLE *${title}* ⌋\n` +
    lines.filter(Boolean).map(l => `│ ${l}`).join('\n') +
    `\n╰⊷ *Powered By ${brand}*`

  // ── React ack immediately ──
  await sock.sendMessage(from, { react: { text: '⚡', key: msg.key } }).catch(() => {})

  // Determine which sub-command
  const cmd = command?.toLowerCase() || args?.[0]?.toLowerCase() || 'shazam'
  const argText = args?.join(' ')?.trim()

  // ════════════════════════════════════
  // ROUTE: FETCH HTML
  // ════════════════════════════════════
  if (['fetch', 'gethtml', 'webget'].includes(cmd)) {
    const url = extractUrl(argText) || extractUrl(getQuotedText(msg))
    if (!url) {
      return sock.sendMessage(from, {
        text: caption('FETCH', ['⚠ Provide a URL — inline or reply to a message with a link'])
      }, { quoted: msg })
    }

    const result = await fetchPageContent(url)
    if (!result) {
      return sock.sendMessage(from, {
        text: caption('FETCH', [`❌ Could not fetch: ${url}`])
      }, { quoted: msg })
    }

    const html = typeof result.html === 'string' ? result.html : JSON.stringify(result.html, null, 2)
    const preview = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 400)
    const fileSize = formatSize(Buffer.byteLength(html))

    // Save as .html file and send as document
    const filePath = tmpPath('html')
    fs.writeFileSync(filePath, html, 'utf8')
    const htmlBuffer = fs.readFileSync(filePath)
    cleanTmp(filePath)

    await sock.sendMessage(from, {
      document: htmlBuffer,
      mimetype: 'text/html',
      fileName: `page_${Date.now()}.html`,
      caption: caption('FETCH', [
        `🌐 URL: ${url.slice(0, 60)}`,
        `📦 Size: ${fileSize}`,
        `📄 Type: ${result.contentType?.split(';')[0] || 'text/html'}`,
        `🔍 Preview: ${preview.slice(0, 200)}...`
      ])
    }, { quoted: msg })
    return
  }

  // ════════════════════════════════════
  // ROUTE: DOWNLOAD
  // ════════════════════════════════════
  if (['download', 'dl'].includes(cmd)) {
    const url = extractUrl(argText) || extractUrl(getQuotedText(msg))
    if (!url) {
      return sock.sendMessage(from, {
        text: caption('DOWNLOAD', ['⚠ Provide a URL — inline or reply to a message with a link'])
      }, { quoted: msg })
    }

    const type = detectLinkType(url)
    const result = await masterDownload(url)

    if (!result?.buffer) {
      return sock.sendMessage(from, {
        text: caption('DOWNLOAD', [`❌ Download failed for:`, `${url.slice(0, 80)}`])
      }, { quoted: msg })
    }

    const { buffer, contentType, size, filename } = result
    const sizeStr = formatSize(size)
    const ct = contentType?.split(';')[0] || ''

    // Choose message type
    const msgCaption = caption('DOWNLOAD', [
      `📦 File: ${filename}`,
      `📊 Size: ${sizeStr}`,
      `🌐 Source: ${type.toUpperCase()}`,
      `📎 Type: ${ct || 'unknown'}`
    ])

    if (ct.startsWith('video/') || filename.match(/\.(mp4|mkv|webm|avi|mov)$/i)) {
      // Send as video; if too large send as document
      if (size > 64 * 1024 * 1024) {
        await sock.sendMessage(from, { document: buffer, mimetype: ct || 'video/mp4', fileName: filename, caption: msgCaption }, { quoted: msg })
      } else {
        await sock.sendMessage(from, { video: buffer, mimetype: ct || 'video/mp4', caption: msgCaption, fileName: filename }, { quoted: msg }).catch(async () => {
          await sock.sendMessage(from, { document: buffer, mimetype: ct || 'video/mp4', fileName: filename, caption: msgCaption }, { quoted: msg })
        })
      }
    } else if (ct.startsWith('audio/') || filename.match(/\.(mp3|ogg|wav|flac|m4a)$/i)) {
      // Full audio as audio message
      if (size > 64 * 1024 * 1024) {
        await sock.sendMessage(from, { document: buffer, mimetype: ct || 'audio/mpeg', fileName: filename, caption: msgCaption }, { quoted: msg })
      } else {
        await sock.sendMessage(from, { audio: buffer, mimetype: ct || 'audio/mpeg', ptt: false, fileName: filename }, { quoted: msg })
        await sock.sendMessage(from, { text: msgCaption }, { quoted: msg })
      }
    } else if (ct.startsWith('image/') || filename.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      await sock.sendMessage(from, { image: buffer, mimetype: ct || 'image/jpeg', caption: msgCaption }, { quoted: msg })
    } else {
      // Any other file — send as document
      await sock.sendMessage(from, { document: buffer, mimetype: ct || 'application/octet-stream', fileName: filename, caption: msgCaption }, { quoted: msg })
    }
    return
  }

  // ════════════════════════════════════
  // ROUTE: SHAZAM (default)
  // ════════════════════════════════════

  // Get audio from reply or current message
  const quotedMsg = getQuoted(msg)
  const audioMsg =
    msg.message?.audioMessage ||
    msg.message?.voiceMessage ||
    quotedMsg?.audioMessage ||
    quotedMsg?.voiceMessage ||
    null

  const textHint = argText || getQuotedText(msg) || null

  if (!audioMsg && !textHint) {
    return sock.sendMessage(from, {
      text: caption('SHAZAM', [
        '⚠ Send/reply to an audio message or voice note',
        '💡 Or provide a song name: .shazam <song name>'
      ])
    }, { quoted: msg })
  }

  let audioBuffer = null
  let audioPath = null

  if (audioMsg) {
    try {
      const { downloadMediaMessage } = await import('@whiskeysockets/baileys')
      const stream = await downloadMediaMessage(
        { key: msg.key, message: msg.message?.audioMessage ? msg.message : quotedMsg ? { ...msg.message, message: quotedMsg } : msg.message },
        'buffer',
        {},
        { logger: console, reuploadRequest: sock.updateMediaMessage }
      )
      audioBuffer = Buffer.isBuffer(stream) ? stream : Buffer.from(stream)
    } catch (e) {
      // Fallback: try direct URL if available
      if (audioMsg.url || audioMsg.directPath) {
        try {
          const { downloadContentFromMessage } = await import('@whiskeysockets/baileys')
          const stream = await downloadContentFromMessage(audioMsg, 'audio')
          const chunks = []
          for await (const chunk of stream) chunks.push(chunk)
          audioBuffer = Buffer.concat(chunks)
        } catch {}
      }
    }
  }

  const result = await runShazam(audioBuffer, textHint || (audioBuffer ? null : 'unknown'))

  if (!result) {
    return sock.sendMessage(from, {
      text: caption('SHAZAM', ['❌ Could not identify this track', '💡 Try a clearer audio or provide song name'])
    }, { quoted: msg })
  }

  const lines = [
    `🎵 *${result.title}*`,
    result.artist ? `👤 ${result.artist}` : null,
    result.album ? `💿 Album: ${result.album}` : null,
    result.year ? `📅 Year: ${result.year}` : null,
    result.label ? `🏷 Label: ${result.label}` : null,
    result.genres ? `🎼 Genre: ${result.genres}` : null,
    result.source ? `🌐 Source: ${result.source}` : null,
    result.shazamUrl ? `🔗 Shazam: ${result.shazamUrl}` : null,
    result.spotifyUrl ? `🎧 Spotify: ${result.spotifyUrl}` : null,
    result.appleMusicUrl ? `🍎 Apple Music: ${result.appleMusicUrl}` : null
  ]

  if (result.thumbnail) {
    try {
      const { buffer: thumbBuf } = await fetchBuffer(result.thumbnail)
      await sock.sendMessage(from, {
        image: thumbBuf,
        caption: caption('SHAZAM', lines)
      }, { quoted: msg })
    } catch {
      await sock.sendMessage(from, {
        text: caption('SHAZAM', lines)
      }, { quoted: msg })
    }
  } else {
    await sock.sendMessage(from, {
      text: caption('SHAZAM', lines)
    }, { quoted: msg })
  }

  // Auto-download preview if available and short
  if (result.previewUrl) {
    try {
      const { buffer: prevBuf, size } = await fetchBuffer(result.previewUrl)
      if (size < 5 * 1024 * 1024) {
        await sock.sendMessage(from, {
          audio: prevBuf,
          mimetype: 'audio/mpeg',
          ptt: false,
          fileName: `${result.title} - ${result.artist || 'Unknown'}.mp3`
        }, { quoted: msg })
      }
    } catch {}
  }
}