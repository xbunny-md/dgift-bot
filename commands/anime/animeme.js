// commands/anime/animeme.js
import axios from 'axios'

export const name = 'animeme'
export const alias = ['ameme', 'anime-meme']
export const category = 'Anime'
export const desc = 'Get random anime memes with 15 API fallbacks'

const TIMEOUT = 8000

const MEME_APIS = [
  async () => {
    const res = await axios.get('https://www.reddit.com/r/Anime_Memes/random.json', { timeout: TIMEOUT })
    const post = res.data?.[0]?.data?.children?.[0]?.data
    if (!post || post.is_video ||!post.url.startsWith('http')) return null
    return { title: post.title, image: post.url }
  },
  async () => {
    const res = await axios.get('https://www.reddit.com/r/animemes/random.json', { timeout: TIMEOUT })
    const post = res.data?.[0]?.data?.children?.[0]?.data
    if (!post || post.is_video ||!post.url.startsWith('http')) return null
    return { title: post.title, image: post.url }
  },
  async () => {
    const res = await axios.get('https://www.reddit.com/r/WholesomeAnimemes/random.json', { timeout: TIMEOUT })
    const post = res.data?.[0]?.data?.children?.[0]?.data
    if (!post || post.is_video ||!post.url.startsWith('http')) return null
    return { title: post.title, image: post.url }
  },
  async () => {
    const res = await axios.get('https://meme-api.com/gimme/animemes', { timeout: TIMEOUT })
    if (!res.data ||!res.data.url) return null
    return { title: res.data.title, image: res.data.url }
  },
  async () => {
    const res = await axios.get('https://meme-api.com/gimme/Anime_Memes', { timeout: TIMEOUT })
    if (!res.data ||!res.data.url) return null
    return { title: res.data.title, image: res.data.url }
  },
  async () => {
    const res = await axios.get('https://www.reddit.com/r/AlchemistMemes/random.json', { timeout: TIMEOUT })
    const post = res.data?.[0]?.data?.children?.[0]?.data
    if (!post || post.is_video ||!post.url.startsWith('http')) return null
    return { title: post.title, image: post.url }
  },
  async () => {
    const res = await axios.get('https://www.reddit.com/r/NarutoMemes/random.json', { timeout: TIMEOUT })
    const post = res.data?.[0]?.data?.children?.[0]?.data
    if (!post || post.is_video ||!post.url.startsWith('http')) return null
    return { title: post.title, image: post.url }
  },
  async () => {
    const res = await axios.get('https://www.reddit.com/r/OnePieceMemes/random.json', { timeout: TIMEOUT })
    const post = res.data?.[0]?.data?.children?.[0]?.data
    if (!post || post.is_video ||!post.url.startsWith('http')) return null
    return { title: post.title, image: post.url }
  },
  async () => {
    const res = await axios.get('https://www.reddit.com/r/MemesManga/random.json', { timeout: TIMEOUT })
    const post = res.data?.[0]?.data?.children?.[0]?.data
    if (!post || post.is_video ||!post.url.startsWith('http')) return null
    return { title: post.title, image: post.url }
  }
]

export default async function animeme(sock, { msg, from }, botSettings) {
  let loadingMsg = null
  try {
    await sock.sendMessage(from, { react: { text: '😂', key: msg.key } })

    loadingMsg = await sock.sendMessage(from, {
      text: `[SYSTEM] Polling matrix data streams for random graphical memes...`
    }, { quoted: msg })

    let memeData = null

    for (let i = 0; i < MEME_APIS.length; i++) {
      try {
        memeData = await MEME_APIS[i]()
        if (memeData && memeData.image && memeData.image.startsWith('http')) break
      } catch (e) {
        continue
      }
    }

    if (!memeData ||!memeData.image) {
      throw new Error('All meme sources are down')
    }

    const assetResponse = await axios.get(memeData.image, {
      responseType: 'arraybuffer',
      timeout: 12000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })

    const imageBuffer = Buffer.from(assetResponse.data)
    const brand = botSettings?.brand_name || botSettings?.botname || process.env.BUILD_BRAND || 'Bot'

    const caption = `╭─⌈ CONSOLE *ANIME MEME* ⌋
│
│ Title: ${memeData.title || 'Untitled Matrix Entry'}
│
╰⊷ *Powered By ${brand}*`

    await sock.sendMessage(from, {
      image: imageBuffer,
      caption: caption
    }, { quoted: msg })

    // Edit loading message to clean success message
    if (loadingMsg) {
      await sock.sendMessage(from, {
        text: `✅ Meme delivered successfully`,
        edit: loadingMsg.key
      }).catch(() => {})
    }

  } catch (error) {
    console.error('[ANIMEME ERROR]', error.message)

    if (loadingMsg) {
      await sock.sendMessage(from, {
        text: `[ERROR] Extraction routines failed to stabilize query layers. Command terminated.`,
        edit: loadingMsg.key
      }).catch(() => {})
    } else {
      await sock.sendMessage(from, { text: `[ERROR] Extraction routines failed.`, quoted: msg })
    }
  }
}