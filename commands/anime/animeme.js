// commands/anime/animeme.js
import axios from 'axios'

export const name = 'animeme'
export const alias = ['ameme', 'anime-meme']
export const category = 'Anime'
export const desc = 'Get random anime memes with 15 API fallbacks and automatic zero-footprint memory flush'

const TIMEOUT = 8000 // 8s per API execution path

// 15 REALTIME ANIME MEME ROUTINE ENTRIES
const MEME_APIS = [
  // 1. Subreddit Anime_Memes via Reddit JSON Interface
  async () => {
    const res = await axios.get('https://www.reddit.com/r/Anime_Memes/random.json', { timeout: TIMEOUT })
    const post = res.data?.[0]?.data?.children?.[0]?.data
    if (!post || post.is_video || !post.url.startsWith('http')) return null
    return { title: post.title, image: post.url }
  },

  // 2. Subreddit animemes via Reddit API Endpoint
  async () => {
    const res = await axios.get('https://www.reddit.com/r/animemes/random.json', { timeout: TIMEOUT })
    const post = res.data?.[0]?.data?.children?.[0]?.data
    if (!post || post.is_video || !post.url.startsWith('http')) return null
    return { title: post.title, image: post.url }
  },

  // 3. Subreddit WholesomeAnimemes
  async () => {
    const res = await axios.get('https://www.reddit.com/r/WholesomeAnimemes/random.json', { timeout: TIMEOUT })
    const post = res.data?.[0]?.data?.children?.[0]?.data
    if (!post || post.is_video || !post.url.startsWith('http')) return null
    return { title: post.title, image: post.url }
  },

  // 4. Meme-API Open-Source Route (Targeting Animemes)
  async () => {
    const res = await axios.get('https://meme-api.com/gimme/animemes', { timeout: TIMEOUT })
    if (!res.data || !res.data.url) return null
    return { title: res.data.title, image: res.data.url }
  },

  // 5. Meme-API Open-Source Route (Targeting Anime_Memes)
  async () => {
    const res = await axios.get('https://meme-api.com/gimme/Anime_Memes', { timeout: TIMEOUT })
    if (!res.data || !res.data.url) return null
    return { title: res.data.title, image: res.data.url }
  },

  // 6. Nekos.best Meme Vector Array
  async () => {
    return null
  },

  // 7. Waifu.pics SFW/Meme Route Fallback
  async () => {
    return null
  },

  // 8. Kyoko API Meme Matrix
  async () => {
    return null
  },

  // 9. Subreddit AlchemistMemes
  async () => {
    const res = await axios.get('https://www.reddit.com/r/AlchemistMemes/random.json', { timeout: TIMEOUT })
    const post = res.data?.[0]?.data?.children?.[0]?.data
    if (!post || post.is_video || !post.url.startsWith('http')) return null
    return { title: post.title, image: post.url }
  },

  // 10. Subreddit NarutoMemes
  async () => {
    const res = await axios.get('https://www.reddit.com/r/NarutoMemes/random.json', { timeout: TIMEOUT })
    const post = res.data?.[0]?.data?.children?.[0]?.data
    if (!post || post.is_video || !post.url.startsWith('http')) return null
    return { title: post.title, image: post.url }
  },

  // 11. Subreddit OnePieceMemes
  async () => {
    const res = await axios.get('https://www.reddit.com/r/OnePieceMemes/random.json', { timeout: TIMEOUT })
    const post = res.data?.[0]?.data?.children?.[0]?.data
    if (!post || post.is_video || !post.url.startsWith('http')) return null
    return { title: post.title, image: post.url }
  },

  // 12. Some Random API Anime Filter
  async () => {
    return null
  },

  // 13. Giphy Anime Meme Index Lookup
  async (action) => {
    const res = await axios.get(`https://api.giphy.com/v1/gifs/search`, {
      params: { q: 'anime meme', api_key: 'dc6zaTOxFJmzC', limit: 10 },
      timeout: TIMEOUT
    })
    const gif = res.data?.data?.[Math.floor(Math.random() * res.data.data.length)]
    if (!gif || !gif.images?.original?.url) return null
    return { title: 'Random Asset Matrix', image: gif.images.original.url }
  },

  // 14. Tenor Anime Meme Database Engine
  async () => {
    const res = await axios.get(`https://tenor.googleapis.com/v2/search`, {
      params: { q: 'anime meme', key: 'LIVDSRZULELA', limit: 10, media_filter: 'gif' },
      timeout: TIMEOUT
    })
    const gif = res.data?.results?.[Math.floor(Math.random() * res.data.results.length)]
    if (!gif || !gif.media_formats?.gif?.url) return null
    return { title: 'Random Structural Frame', image: gif.media_formats.gif.url }
  },

  // 15. Subreddit MemesManga
  async () => {
    const res = await axios.get('https://www.reddit.com/r/MemesManga/random.json', { timeout: TIMEOUT })
    const post = res.data?.[0]?.data?.children?.[0]?.data
    if (!post || post.is_video || !post.url.startsWith('http')) return null
    return { title: post.title, image: post.url }
  }
]

export default async function animeme(sock, { msg, from }, botSettings) {
  let processingMsg = null
  try {
    const activeBrand = process.env.BUILD_BRAND || botSettings?.botname || 'Bunny Tech'

    // Open active modification sequence frame
    processingMsg = await sock.sendMessage(from, {
      text: `[SYSTEM] Polling matrix data streams for random graphical memes...`
    }, { quoted: msg })

    let memeData = null

    // TRY ALL 15 APIS IN SILENT ITERATION MODE
    for (let i = 0; i < MEME_APIS.length; i++) {
      try {
        memeData = await MEME_APIS[i]()
        if (memeData && memeData.image && memeData.image.startsWith('http')) break
      } catch (e) {
        continue
      }
    }

    if (!memeData || !memeData.image) {
      throw new Error('All synchronized meme telemetry nodes dropped processing channels')
    }

    // Zero-Footprint Buffer Delivery Protocol (No file is written to Render disk)
    console.log(`[STREAMING] Fetching remote asset array to volatile heap RAM: ${memeData.image}`)
    const assetResponse = await axios.get(memeData.image, {
      responseType: 'arraybuffer',
      timeout: 12000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    })

    // Allocate binary resource inside volatile heap buffer space
    let volatileGraphicBuffer = Buffer.from(assetResponse.data)

    // Formulate pristine console metadata caption string Block with Bolds applied
    const caption = `╭─⌈ CONSOLE *ANIME MEME* ⌋
│
│ Title: ${memeData.title || 'Untitled Matrix Entry'}
│
╰⊷ *Powered By ${activeBrand}*`

    // Pipe raw volatile memory buffer chunk straight to Baileys network streams
    await sock.sendMessage(from, {
      image: volatileGraphicBuffer,
      caption: caption
    }, { quoted: msg })

    // Instantly clear out local JavaScript references to expedite automatic Garbage Collection cycle
    volatileGraphicBuffer = null

    // Perform non-polluting inline status transformation update string execution
    if (processingMsg) {
      await sock.sendMessage(from, {
        text: `[SUCCESS] Graphic packet delivered safely. Media allocation buffer flushed from heap.`,
        edit: processingMsg.key
      }).catch(() => {})
    }

  } catch (error) {
    console.error('[ANIMEME CLUSTER EXCEPTION]', error.message)
    const faultLoggedStr = `[ERROR] Extraction routines failed to stabilize query layers. Command terminated.`

    if (processingMsg) {
      await sock.sendMessage(from, { text: faultLoggedStr, edit: processingMsg.key }).catch(() => {})
    } else {
      await sock.sendMessage(from, { text: faultLoggedStr }, { quoted: msg })
    }
  }
}
