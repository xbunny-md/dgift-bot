// commands/download/play.js
import axios from 'axios'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import { tmpdir } from 'os'

export const name = 'musics'
export const alias = ['musix']
export const category = 'Download'
export const desc = 'Search & download music with 30+ API fallbacks — sends thumbnail preview then audio'

const execAsync = promisify(exec)
const TIMEOUT = 10000
const TMP = tmpdir()

// ─────────────────────────────────────────────
//  HELPER: clean temp files to spare RAM
// ─────────────────────────────────────────────
function cleanTmp(...files) {
  for (const f of files) {
    try { if (f && fs.existsSync(f)) fs.unlinkSync(f) } catch {}
  }
}

// ─────────────────────────────────────────────
//  HELPER: download buffer with low memory
// ─────────────────────────────────────────────
async function fetchBuffer(url, extra = {}) {
  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 20000,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MusicBot/1.0)' },
    ...extra
  })
  return Buffer.from(res.data)
}

// ─────────────────────────────────────────────
//  HELPER: try yt-dlp if installed (low-mem mode)
// ─────────────────────────────────────────────
async function ytdlpDownload(query) {
  const outPath = path.join(TMP, `play_${Date.now()}.mp3`)
  const searchQuery = `ytsearch1:${query}`
  const cmd = [
    'yt-dlp',
    `"${searchQuery}"`,
    '-x', '--audio-format mp3',
    '--audio-quality 96K',           // low bitrate → small RAM
    '--no-playlist',
    '--no-warnings',
    '--socket-timeout 20',
    '--retries 2',
    `--output "${outPath}"`,
    '--print-json',
    '--quiet'
  ].join(' ')

  try {
    const { stdout } = await execAsync(cmd, { timeout: 60000 })
    const info = JSON.parse(stdout.trim().split('\n')[0])
    if (!fs.existsSync(outPath)) return null
    return {
      title: info.title || query,
      artist: info.uploader || info.channel || 'Unknown',
      duration: info.duration_string || '??',
      thumbnail: info.thumbnail || null,
      filePath: outPath,
      source: 'yt-dlp'
    }
  } catch {
    cleanTmp(outPath)
    return null
  }
}

// ─────────────────────────────────────────────
//  30+ SEARCH APIS — returns { title, artist, duration, thumbnail, audioUrl, source }
// ─────────────────────────────────────────────
const SEARCH_APIS = [

  // ── 1. iTunes Search ──
  async (q) => {
    const res = await axios.get('https://itunes.apple.com/search', {
      params: { term: q, media: 'music', limit: 1 },
      timeout: TIMEOUT
    })
    const t = res.data?.results?.[0]
    if (!t) return null
    return {
      title: t.trackName,
      artist: t.artistName,
      duration: `${Math.floor(t.trackTimeMillis / 60000)}:${String(Math.floor((t.trackTimeMillis % 60000) / 1000)).padStart(2, '0')}`,
      thumbnail: t.artworkUrl100?.replace('100x100bb', '600x600bb'),
      audioUrl: t.previewUrl,
      source: 'iTunes'
    }
  },

  // ── 2. Deezer Search ──
  async (q) => {
    const res = await axios.get('https://api.deezer.com/search', {
      params: { q, limit: 1 },
      timeout: TIMEOUT
    })
    const t = res.data?.data?.[0]
    if (!t) return null
    return {
      title: t.title,
      artist: t.artist?.name,
      duration: `${Math.floor(t.duration / 60)}:${String(t.duration % 60).padStart(2, '0')}`,
      thumbnail: t.album?.cover_xl || t.album?.cover_big,
      audioUrl: t.preview,
      source: 'Deezer'
    }
  },

  // ── 3. Jamendo ──
  async (q) => {
    const res = await axios.get('https://api.jamendo.com/v3.0/tracks', {
      params: { client_id: 'b6747d04', search: q, limit: 1, format: 'json', audioformat: 'mp32' },
      timeout: TIMEOUT
    })
    const t = res.data?.results?.[0]
    if (!t || !t.audio) return null
    return {
      title: t.name,
      artist: t.artist_name,
      duration: `${Math.floor(t.duration / 60)}:${String(t.duration % 60).padStart(2, '0')}`,
      thumbnail: t.image,
      audioUrl: t.audio,
      source: 'Jamendo'
    }
  },

  // ── 4. Free Music Archive ──
  async (q) => {
    const res = await axios.get('https://freemusicarchive.org/api/get/tracks.json', {
      params: { api_key: 'null', search: q, limit: 1 },
      timeout: TIMEOUT
    })
    const t = res.data?.dataset?.[0]
    if (!t || !t.track_file) return null
    return {
      title: t.track_title,
      artist: t.artist_name,
      duration: '??',
      thumbnail: t.track_image_file || null,
      audioUrl: t.track_file,
      source: 'FMA'
    }
  },

  // ── 5. SoundCloud oEmbed (title/thumb only, fallback audio) ──
  async (q) => {
    const res = await axios.get(`https://soundcloud.com/search/sounds?q=${encodeURIComponent(q)}`, {
      timeout: TIMEOUT,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    const match = res.data?.match(/\"permalink_url\":\"(https:\/\/soundcloud\.com\/[^"]+)\"/)
    if (!match) return null
    const oembed = await axios.get('https://soundcloud.com/oembed', {
      params: { url: match[1], format: 'json' }, timeout: TIMEOUT
    })
    if (!oembed.data?.title) return null
    return {
      title: oembed.data.title,
      artist: oembed.data.author_name,
      duration: '??',
      thumbnail: oembed.data.thumbnail_url,
      audioUrl: null,      // SoundCloud no direct stream; title/thumb only
      source: 'SoundCloud'
    }
  },

  // ── 6. Napster (Rhapsody) ──
  async (q) => {
    const res = await axios.get('https://api.napster.com/v2.2/search', {
      params: { apikey: 'ZTk2ZjY4MjMtMDAyYy00MTdk', query: q, type: 'track', per_type_limit: 1 },
      timeout: TIMEOUT
    })
    const t = res.data?.search?.data?.tracks?.[0]
    if (!t) return null
    const dur = t.playbackSeconds
    return {
      title: t.name,
      artist: t.artistName,
      duration: `${Math.floor(dur / 60)}:${String(dur % 60).padStart(2, '0')}`,
      thumbnail: `https://api.napster.com/imageserver/v2/albums/${t.albumId}/images/500x500.jpg`,
      audioUrl: t.previewURL,
      source: 'Napster'
    }
  },

  // ── 7. Musixmatch (metadata + thumb) ──
  async (q) => {
    const res = await axios.get('https://api.musixmatch.com/ws/1.1/track.search', {
      params: { apikey: '3960fe569e0f9c70bc35d454cd407a9c', q, page_size: 1, s_track_rating: 'desc' },
      timeout: TIMEOUT
    })
    const t = res.data?.message?.body?.track_list?.[0]?.track
    if (!t) return null
    return {
      title: t.track_name,
      artist: t.artist_name,
      duration: '??',
      thumbnail: t.album_coverart_500x500 || t.album_coverart_350x350 || null,
      audioUrl: null,
      source: 'Musixmatch'
    }
  },

  // ── 8. LastFM ──
  async (q) => {
    const res = await axios.get('https://ws.audioscrobbler.com/2.0/', {
      params: { method: 'track.search', track: q, api_key: '4e7d3cce5e82b5af8e63b7bd1ab43e3a', format: 'json', limit: 1 },
      timeout: TIMEOUT
    })
    const t = res.data?.results?.trackmatches?.track?.[0]
    if (!t) return null
    const img = t.image?.find(i => i.size === 'extralarge')?.['#text'] || null
    return {
      title: t.name,
      artist: t.artist,
      duration: '??',
      thumbnail: img && img !== '' ? img : null,
      audioUrl: null,
      source: 'LastFM'
    }
  },

  // ── 9. MusicBrainz ──
  async (q) => {
    const res = await axios.get('https://musicbrainz.org/ws/2/recording/', {
      params: { query: q, limit: 1, fmt: 'json' },
      timeout: TIMEOUT,
      headers: { 'User-Agent': 'MusicBot/1.0 (contact@bot.com)' }
    })
    const t = res.data?.recordings?.[0]
    if (!t) return null
    const dur = t.length ? Math.floor(t.length / 1000) : 0
    return {
      title: t.title,
      artist: t['artist-credit']?.[0]?.name || 'Unknown',
      duration: dur ? `${Math.floor(dur / 60)}:${String(dur % 60).padStart(2, '0')}` : '??',
      thumbnail: null,
      audioUrl: null,
      source: 'MusicBrainz'
    }
  },

  // ── 10. Spotify oEmbed (no auth — thumb only) ──
  async (q) => {
    const search = await axios.get(`https://open.spotify.com/search/${encodeURIComponent(q)}`, {
      timeout: TIMEOUT, headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    const match = search.data?.match(/\"\/track\/([a-zA-Z0-9]+)\"/)
    if (!match) return null
    const oembed = await axios.get(`https://open.spotify.com/oembed?url=https://open.spotify.com/track/${match[1]}`, { timeout: TIMEOUT })
    if (!oembed.data?.title) return null
    return {
      title: oembed.data.title,
      artist: oembed.data.provider_name,
      duration: '??',
      thumbnail: oembed.data.thumbnail_url,
      audioUrl: null,
      source: 'Spotify'
    }
  },

  // ── 11. YTMF (YT Music frontend scrape) ──
  async (q) => {
    const res = await axios.post('https://music.youtube.com/youtubei/v1/search?alt=json', {
      context: { client: { clientName: 'WEB_REMIX', clientVersion: '1.20230501.01.00' } },
      query: q
    }, { timeout: TIMEOUT, headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' } })
    const items = res.data?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents
    const shelf = items?.find(s => s.musicShelfRenderer)?.musicShelfRenderer?.contents?.[0]?.musicResponsiveListItemRenderer
    if (!shelf) return null
    const title = shelf.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text
    const artist = shelf.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text
    const thumb = shelf.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.pop()?.url
    const videoId = shelf.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId
    return {
      title: title || q,
      artist: artist || 'Unknown',
      duration: '??',
      thumbnail: thumb || null,
      audioUrl: videoId ? `https://www.youtube.com/watch?v=${videoId}` : null,
      source: 'YTMusic',
      isYtUrl: true,
      videoId
    }
  },

  // ── 12. Audius ──
  async (q) => {
    const hostRes = await axios.get('https://api.audius.co', { timeout: TIMEOUT })
    const host = hostRes.data?.data?.[0]
    if (!host) return null
    const res = await axios.get(`${host}/v1/tracks/search`, {
      params: { query: q, limit: 1, app_name: 'MusicBot' }, timeout: TIMEOUT
    })
    const t = res.data?.data?.[0]
    if (!t) return null
    const dur = t.duration
    return {
      title: t.title,
      artist: t.user?.name,
      duration: `${Math.floor(dur / 60)}:${String(dur % 60).padStart(2, '0')}`,
      thumbnail: t.artwork?.['480x480'] || t.artwork?.['150x150'] || null,
      audioUrl: `${host}/v1/tracks/${t.id}/stream?app_name=MusicBot`,
      source: 'Audius'
    }
  },

  // ── 13. OpenWhyd (scrape) ──
  async (q) => {
    const res = await axios.get(`https://openwhyd.org/search?q=${encodeURIComponent(q)}&format=json`, { timeout: TIMEOUT })
    const t = res.data?.tracks?.[0]
    if (!t) return null
    return {
      title: t.name,
      artist: t.uNm || 'Unknown',
      duration: '??',
      thumbnail: t.img || null,
      audioUrl: t.eId?.startsWith('/yt/') ? `https://www.youtube.com/watch?v=${t.eId.replace('/yt/', '')}` : null,
      source: 'OpenWhyd',
      isYtUrl: true
    }
  },

  // ── 14. Bandcamp search scrape ──
  async (q) => {
    const res = await axios.get(`https://bandcamp.com/search?q=${encodeURIComponent(q)}&item_type=t`, {
      timeout: TIMEOUT, headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    const titleMatch = res.data?.match(/class="heading">\s*<a[^>]+>([^<]+)<\/a>/)
    const artistMatch = res.data?.match(/class="subhead">\s*by ([^<]+)</)
    const imgMatch = res.data?.match(/class="art">\s*<img[^>]+src="([^"]+)"/)
    const linkMatch = res.data?.match(/class="heading">\s*<a href="([^"]+)"/)
    if (!titleMatch) return null
    return {
      title: titleMatch[1].trim(),
      artist: artistMatch?.[1]?.trim() || 'Unknown',
      duration: '??',
      thumbnail: imgMatch?.[1] || null,
      audioUrl: linkMatch?.[1] || null,
      source: 'Bandcamp'
    }
  },

  // ── 15. ccMixter ──
  async (q) => {
    const res = await axios.get('https://ccmixter.org/api/query', {
      params: { search: q, limit: 1, format: 'json' }, timeout: TIMEOUT
    })
    const t = res.data?.[0]
    if (!t) return null
    return {
      title: t.upload_name,
      artist: t.user_real_name || t.user_name,
      duration: '??',
      thumbnail: t.upload_extra?.artwork_url || null,
      audioUrl: t.files?.[0]?.download_url || null,
      source: 'ccMixter'
    }
  },

  // ── 16. Mixcloud oembed ──
  async (q) => {
    const search = await axios.get(`https://api.mixcloud.com/search/?q=${encodeURIComponent(q)}&type=cloudcast&limit=1`, { timeout: TIMEOUT })
    const t = search.data?.data?.[0]
    if (!t) return null
    return {
      title: t.name,
      artist: t.user?.name,
      duration: `${Math.floor((t.audio_length || 0) / 60)}:${String((t.audio_length || 0) % 60).padStart(2, '0')}`,
      thumbnail: t.pictures?.extra_large || t.pictures?.large || null,
      audioUrl: null,
      source: 'Mixcloud'
    }
  },

  // ── 17. Jiosaavn (India) ──
  async (q) => {
    const res = await axios.get('https://www.jiosaavn.com/api.php', {
      params: { __call: 'autocomplete.get', _format: 'json', _marker: '0', cc: 'in', includeMetaTags: '1', query: q },
      timeout: TIMEOUT, headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    const t = res.data?.songs?.data?.[0]
    if (!t) return null
    return {
      title: t.title,
      artist: t.more_info?.music || t.description,
      duration: '??',
      thumbnail: t.image?.replace('50x50', '500x500') || null,
      audioUrl: null,
      source: 'JioSaavn'
    }
  },

  // ── 18. Gaana (India) ──
  async (q) => {
    const res = await axios.get(`https://gaana.com/api/search/`, {
      params: { type: 'track', keyword: q }, timeout: TIMEOUT,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    const t = res.data?.tracks?.data?.[0]
    if (!t) return null
    return {
      title: t.title,
      artist: t.singer,
      duration: '??',
      thumbnail: t.atw || null,
      audioUrl: t.path || null,
      source: 'Gaana'
    }
  },

  // ── 19. Genius (lyrics/metadata) ──
  async (q) => {
    const res = await axios.get('https://api.genius.com/search', {
      params: { q }, timeout: TIMEOUT,
      headers: { Authorization: 'Bearer tBkgkNP6YnkKPkyNBkj3rUQYwFhJCh9n5IJ5ZlmGZsrMFvEQFbmN8EiLuFcGOPrH' }
    })
    const t = res.data?.response?.hits?.[0]?.result
    if (!t) return null
    return {
      title: t.title,
      artist: t.primary_artist?.name,
      duration: '??',
      thumbnail: t.song_art_image_thumbnail_url || t.header_image_thumbnail_url || null,
      audioUrl: null,
      source: 'Genius'
    }
  },

  // ── 20. Soundiiz (fallback metadata) ──
  async (q) => {
    const res = await axios.get(`https://soundiiz.com/api/search?query=${encodeURIComponent(q)}&platform=spotify&type=track&limit=1`, {
      timeout: TIMEOUT, headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    const t = res.data?.items?.[0]
    if (!t) return null
    return {
      title: t.title,
      artist: t.artist,
      duration: '??',
      thumbnail: t.image || null,
      audioUrl: null,
      source: 'Soundiiz'
    }
  },

  // ── 21. Deezer Chart fallback (popular) ──
  async (q) => {
    const res = await axios.get('https://api.deezer.com/search/track', {
      params: { q, limit: 1, order: 'RANKING' }, timeout: TIMEOUT
    })
    const t = res.data?.data?.[0]
    if (!t) return null
    return {
      title: t.title,
      artist: t.artist?.name,
      duration: `${Math.floor(t.duration / 60)}:${String(t.duration % 60).padStart(2, '0')}`,
      thumbnail: t.album?.cover_xl,
      audioUrl: t.preview,
      source: 'Deezer Chart'
    }
  },

  // ── 22. iTunes Top Songs ──
  async (q) => {
    const res = await axios.get('https://itunes.apple.com/search', {
      params: { term: q, media: 'music', entity: 'musicTrack', limit: 1, sort: 'popular' },
      timeout: TIMEOUT
    })
    const t = res.data?.results?.[0]
    if (!t?.previewUrl) return null
    return {
      title: t.trackName,
      artist: t.artistName,
      duration: `${Math.floor(t.trackTimeMillis / 60000)}:${String(Math.floor((t.trackTimeMillis % 60000) / 1000)).padStart(2, '0')}`,
      thumbnail: t.artworkUrl100?.replace('100x100bb', '600x600bb'),
      audioUrl: t.previewUrl,
      source: 'iTunes Popular'
    }
  },

  // ── 23. Jamendo Trending ──
  async (q) => {
    const res = await axios.get('https://api.jamendo.com/v3.0/tracks', {
      params: { client_id: 'b6747d04', search: q, limit: 1, order: 'popularity_total', audioformat: 'mp32' },
      timeout: TIMEOUT
    })
    const t = res.data?.results?.[0]
    if (!t?.audio) return null
    return {
      title: t.name,
      artist: t.artist_name,
      duration: `${Math.floor(t.duration / 60)}:${String(t.duration % 60).padStart(2, '0')}`,
      thumbnail: t.image,
      audioUrl: t.audio,
      source: 'Jamendo Trending'
    }
  },

  // ── 24. Audius Trending ──
  async (q) => {
    const hostRes = await axios.get('https://api.audius.co', { timeout: TIMEOUT })
    const host = hostRes.data?.data?.[0]
    if (!host) return null
    const res = await axios.get(`${host}/v1/tracks/trending`, {
      params: { limit: 5, app_name: 'MusicBot' }, timeout: TIMEOUT
    })
    const tracks = res.data?.data || []
    const t = tracks.find(tr => tr.title?.toLowerCase().includes(q.toLowerCase()) || tr.user?.name?.toLowerCase().includes(q.toLowerCase())) || tracks[0]
    if (!t) return null
    return {
      title: t.title,
      artist: t.user?.name,
      duration: `${Math.floor(t.duration / 60)}:${String(t.duration % 60).padStart(2, '0')}`,
      thumbnail: t.artwork?.['480x480'] || null,
      audioUrl: `${host}/v1/tracks/${t.id}/stream?app_name=MusicBot`,
      source: 'Audius Trending'
    }
  },

  // ── 25. Invidious (YT frontend) ──
  async (q) => {
    const instances = ['https://invidious.io', 'https://y.com.sb', 'https://invidious.fdn.fr']
    for (const base of instances) {
      try {
        const res = await axios.get(`${base}/api/v1/search`, {
          params: { q, type: 'video', sort_by: 'relevance' }, timeout: TIMEOUT
        })
        const t = res.data?.[0]
        if (!t?.videoId) continue
        const thumb = `https://i.ytimg.com/vi/${t.videoId}/maxresdefault.jpg`
        return {
          title: t.title,
          artist: t.author,
          duration: `${Math.floor(t.lengthSeconds / 60)}:${String(t.lengthSeconds % 60).padStart(2, '0')}`,
          thumbnail: thumb,
          audioUrl: `https://www.youtube.com/watch?v=${t.videoId}`,
          source: 'Invidious',
          isYtUrl: true,
          videoId: t.videoId
        }
      } catch {}
    }
    return null
  },

  // ── 26. Piped (YT frontend) ──
  async (q) => {
    const pipedInstances = ['https://pipedapi.kavin.rocks', 'https://piped.privacy.com.de/api', 'https://api.piped.yt']
    for (const base of pipedInstances) {
      try {
        const res = await axios.get(`${base}/search`, {
          params: { q, filter: 'music_songs' }, timeout: TIMEOUT
        })
        const t = res.data?.items?.[0]
        if (!t?.url) continue
        const vid = t.url.replace('/watch?v=', '')
        return {
          title: t.title,
          artist: t.uploaderName,
          duration: `${Math.floor(t.duration / 60)}:${String(t.duration % 60).padStart(2, '0')}`,
          thumbnail: t.thumbnail || `https://i.ytimg.com/vi/${vid}/maxresdefault.jpg`,
          audioUrl: `https://www.youtube.com/watch?v=${vid}`,
          source: 'Piped',
          isYtUrl: true,
          videoId: vid
        }
      } catch {}
    }
    return null
  },

  // ── 27. YouTube Data API v3 (no key – scrape) ──
  async (q) => {
    const res = await axios.get(`https://www.youtube.com/results?search_query=${encodeURIComponent(q + ' audio')}`, {
      timeout: TIMEOUT, headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    const match = res.data?.match(/"videoId":"([a-zA-Z0-9_-]{11})"/)
    const titleMatch = res.data?.match(/"title":{"runs":\[{"text":"([^"]+)"/)
    const authorMatch = res.data?.match(/"ownerText":{"runs":\[{"text":"([^"]+)"/)
    if (!match) return null
    const vid = match[1]
    return {
      title: titleMatch?.[1] || q,
      artist: authorMatch?.[1] || 'YouTube',
      duration: '??',
      thumbnail: `https://i.ytimg.com/vi/${vid}/maxresdefault.jpg`,
      audioUrl: `https://www.youtube.com/watch?v=${vid}`,
      source: 'YouTube',
      isYtUrl: true,
      videoId: vid
    }
  },

  // ── 28. yts.mx / YTS Mirror (audio fallback) ──
  async (q) => {
    const res = await axios.get('https://yts.mx/api/v2/list_movies.json', {
      params: { query_term: q, limit: 1 }, timeout: TIMEOUT
    })
    const t = res.data?.data?.movies?.[0]
    if (!t) return null
    return {
      title: t.title,
      artist: 'Soundtrack',
      duration: `${t.runtime || 0} min`,
      thumbnail: t.large_cover_image || t.medium_cover_image || null,
      audioUrl: null,
      source: 'YTS'
    }
  },

  // ── 29. Archive.org Audio Search ──
  async (q) => {
    const res = await axios.get('https://archive.org/advancedsearch.php', {
      params: {
        q: `${q} AND mediatype:audio`,
        fl: 'identifier,title,creator,downloads',
        output: 'json', rows: 1, page: 1
      }, timeout: TIMEOUT
    })
    const t = res.data?.response?.docs?.[0]
    if (!t?.identifier) return null
    const meta = await axios.get(`https://archive.org/metadata/${t.identifier}`, { timeout: TIMEOUT })
    const file = meta.data?.files?.find(f => f.name?.endsWith('.mp3'))
    return {
      title: t.title || q,
      artist: t.creator || 'Archive',
      duration: '??',
      thumbnail: `https://archive.org/services/img/${t.identifier}`,
      audioUrl: file ? `https://archive.org/download/${t.identifier}/${file.name}` : null,
      source: 'Archive.org'
    }
  },

  // ── 30. Bensound (royalty-free) ──
  async (q) => {
    const genres = ['corporate', 'relaxing', 'dance', 'happy', 'jazz', 'acoustic', 'romantic', 'ukulele']
    const genre = genres.find(g => q.toLowerCase().includes(g)) || genres[0]
    return {
      title: `${genre.charAt(0).toUpperCase() + genre.slice(1)} Track`,
      artist: 'Bensound',
      duration: '??',
      thumbnail: `https://www.bensound.com/bensound-img/${genre}.jpg`,
      audioUrl: `https://www.bensound.com/bensound-music/bensound-${genre}.mp3`,
      source: 'Bensound'
    }
  },

  // ── 31. Pixabay Music ──
  async (q) => {
    const res = await axios.get('https://pixabay.com/api/videos/', {
      params: { key: '34355411-b07793c4a7be8bfee6d45c4fa', q, video_type: 'music', per_page: 1 },
      timeout: TIMEOUT
    })
    const t = res.data?.hits?.[0]
    if (!t) return null
    return {
      title: t.tags || q,
      artist: t.user,
      duration: `${Math.floor(t.duration / 60)}:${String(t.duration % 60).padStart(2, '0')}`,
      thumbnail: t.videos?.medium?.thumbnail || null,
      audioUrl: null,
      source: 'Pixabay'
    }
  },

  // ── 32. Freesound ──
  async (q) => {
    const res = await axios.get('https://freesound.org/apiv2/search/text/', {
      params: { query: q, filter: 'type:mp3', fields: 'id,name,username,previews,images,duration', token: 'fFNXCiTxSmGDlXhRLfFiPUMEqWvlCv9vy8tOjLdq' },
      timeout: TIMEOUT
    })
    const t = res.data?.results?.[0]
    if (!t) return null
    return {
      title: t.name,
      artist: t.username,
      duration: `${Math.floor(t.duration / 60)}:${String(t.duration % 60).padStart(2, '0')}`,
      thumbnail: t.images?.spectral_m || null,
      audioUrl: t.previews?.['preview-hq-mp3'] || t.previews?.['preview-lq-mp3'] || null,
      source: 'Freesound'
    }
  },

  // ── 33. Musopen (classical) ──
  async (q) => {
    const res = await axios.get('https://api.musopen.org/recordings', {
      params: { title: q }, timeout: TIMEOUT,
      headers: { Authorization: 'Basic ' + Buffer.from('musopen:musopen').toString('base64') }
    })
    const t = res.data?.[0]
    if (!t) return null
    return {
      title: t.recording?.title || q,
      artist: t.artist?.name || 'Unknown',
      duration: '??',
      thumbnail: null,
      audioUrl: t.url || null,
      source: 'Musopen'
    }
  }
]

// ─────────────────────────────────────────────
//  AUDIO DOWNLOADER — tries yt-dlp then direct
// ─────────────────────────────────────────────
async function downloadAudio(trackInfo, query) {
  // 1. Try yt-dlp with videoId or YT URL
  if (trackInfo?.videoId || trackInfo?.isYtUrl) {
    const url = trackInfo.videoId
      ? `https://www.youtube.com/watch?v=${trackInfo.videoId}`
      : trackInfo.audioUrl
    try {
      const outPath = path.join(TMP, `play_${Date.now()}.mp3`)
      const cmd = [
        'yt-dlp',
        `"${url}"`,
        '-x', '--audio-format mp3',
        '--audio-quality 96K',
        '--no-playlist',
        '--no-warnings',
        '--socket-timeout 20',
        '--retries 2',
        `--output "${outPath}"`,
        '--quiet'
      ].join(' ')
      await execAsync(cmd, { timeout: 60000 })
      if (fs.existsSync(outPath)) return outPath
    } catch {}
  }

  // 2. Generic yt-dlp search (last resort)
  const ytResult = await ytdlpDownload(query)
  if (ytResult?.filePath) return ytResult.filePath

  // 3. Direct download for direct audioUrl
  if (trackInfo?.audioUrl && !trackInfo.isYtUrl) {
    const outPath = path.join(TMP, `play_${Date.now()}.mp3`)
    const buf = await fetchBuffer(trackInfo.audioUrl)
    fs.writeFileSync(outPath, buf)
    return outPath
  }

  return null
}

// ─────────────────────────────────────────────
//  MAIN COMMAND
// ─────────────────────────────────────────────
export default async function play(sock, { msg, from, args }, botSettings) {
  const query = args?.join(' ')?.trim()
  const brand = botSettings?.brand_name || botSettings?.botname || process.env.BUILD_BRAND || 'Bot'
  let loadingMsg = null
  let thumbMsg = null
  let audioPath = null

  if (!query) {
    return sock.sendMessage(from, {
      text: `╭─⌈ CONSOLE *PLAY* ⌋\n│\n│ ⚠ Usage: .play <song name>\n│\n╰⊷ *Powered By ${brand}*`
    }, { quoted: msg })
  }

  try {
    await sock.sendMessage(from, { react: { text: '🎵', key: msg.key } })

    // ── STATUS 1: Searching ──
    loadingMsg = await sock.sendMessage(from, {
      text: `╭─⌈ CONSOLE *PLAY* ⌋\n│\n│ 🔍 Scanning audio matrix for:\n│ *${query}*\n│\n╰⊷ *Powered By ${brand}*`
    }, { quoted: msg })

    // ── RUN SEARCH APIS (first valid win) ──
    let trackInfo = null
    for (let i = 0; i < SEARCH_APIS.length; i++) {
      try {
        const result = await SEARCH_APIS[i](query)
        if (result?.title) {
          trackInfo = result
          break
        }
      } catch {}
    }

    // Fallback minimal info if all fail
    if (!trackInfo) {
      trackInfo = { title: query, artist: 'Unknown', duration: '??', thumbnail: null, audioUrl: null, source: 'Fallback' }
    }

    // ── STATUS 2: Show thumbnail ──
    if (loadingMsg) {
      await sock.sendMessage(from, {
        text: `╭─⌈ CONSOLE *PLAY* ⌋\n│\n│ ✅ Track found via *${trackInfo.source}*\n│ 📤 Sending preview...\n│\n╰⊷ *Powered By ${brand}*`,
        edit: loadingMsg.key
      }).catch(() => {})
    }

    const thumbCaption = `╭─⌈ CONSOLE *PLAY* ⌋\n│\n│ 🎵 *${trackInfo.title}*\n│ 👤 ${trackInfo.artist || 'Unknown'}\n│ ⏱ ${trackInfo.duration || '??'}\n│ 🌐 Source: ${trackInfo.source}\n│\n╰⊷ *Powered By ${brand}*`

    if (trackInfo.thumbnail) {
      try {
        const thumbBuf = await fetchBuffer(trackInfo.thumbnail)
        thumbMsg = await sock.sendMessage(from, {
          image: thumbBuf,
          caption: thumbCaption
        }, { quoted: msg })
      } catch {
        thumbMsg = await sock.sendMessage(from, { text: thumbCaption }, { quoted: msg })
      }
    } else {
      thumbMsg = await sock.sendMessage(from, { text: thumbCaption }, { quoted: msg })
    }

    // ── STATUS 3: Downloading ──
    loadingMsg = await sock.sendMessage(from, {
      text: `╭─⌈ CONSOLE *PLAY* ⌋\n│\n│ ⬇ Downloading audio stream...\n│ *${trackInfo.title}*\n│\n╰⊷ *Powered By ${brand}*`
    }, { quoted: thumbMsg || msg })

    audioPath = await downloadAudio(trackInfo, query)

    if (!audioPath || !fs.existsSync(audioPath)) {
      throw new Error('Audio extraction failed across all pipelines')
    }

    const stats = fs.statSync(audioPath)
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2)

    // ── EDIT loading → done ──
    if (loadingMsg) {
      await sock.sendMessage(from, {
        text: `╭─⌈ CONSOLE *PLAY* ⌋\n│\n│ ✅ Download complete (${sizeMB} MB)\n│ 📤 Transmitting audio...\n│\n╰⊷ *Powered By ${brand}*`,
        edit: loadingMsg.key
      }).catch(() => {})
    }

    // ── SEND AUDIO ──
    const audioBuffer = fs.readFileSync(audioPath)

    await sock.sendMessage(from, {
      audio: audioBuffer,
      mimetype: 'audio/mpeg',
      ptt: false,
      fileName: `${trackInfo.title} - ${trackInfo.artist || 'Unknown'}.mp3`
    }, { quoted: thumbMsg || msg })

    // ── FINAL STATUS ──
    if (loadingMsg) {
      await sock.sendMessage(from, {
        text: `╭─⌈ CONSOLE *PLAY* ⌋\n│\n│ ✅ *Transmission Complete*\n│ 🎵 ${trackInfo.title}\n│ 👤 ${trackInfo.artist || 'Unknown'}\n│ 📦 ${sizeMB} MB\n│\n╰⊷ *Powered By ${brand}*`,
        edit: loadingMsg.key
      }).catch(() => {})
    }

  } catch (error) {
    console.error('[PLAY ERROR]', error.message)

    if (loadingMsg) {
      await sock.sendMessage(from, {
        text: `╭─⌈ CONSOLE *PLAY* ⌋\n│\n│ ❌ Matrix extraction failed.\n│ Query: *${query}*\n│ Error: ${error.message?.slice(0, 80)}\n│\n╰⊷ *Powered By ${brand}*`,
        edit: loadingMsg.key
      }).catch(() => {})
    } else {
      await sock.sendMessage(from, {
        text: `[ERROR] Audio pipeline destabilized. Command terminated.`
      }, { quoted: msg })
    }
  } finally {
    // ── CLEAN TMP → free RAM ──
    cleanTmp(audioPath)
  }
}
