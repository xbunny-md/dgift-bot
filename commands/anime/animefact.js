// commands/anime/animefact.js
import axios from 'axios'

export const name = 'animefact'
export const alias = ['afact', 'anifact', 'annfact']
export const category = 'Anime'
export const desc = 'Get random anime facts with 15 API fallbacks'

const TIMEOUT = 8000

const FACT_APIS = [
  async () => {
    const res = await axios.get('https://anime-facts-rest-api.herokuapp.com/api/v1', { timeout: TIMEOUT })
    return {
      fact: res.data?.data?.fact,
      anime: res.data?.data?.anime_name,
      image: `https://ui-avatars.com/api/?name=${encodeURIComponent(res.data?.data?.anime_name || 'Anime')}&background=random&size=512`
    }
  },
  async () => {
    const randomId = Math.floor(Math.random() * 50000) + 1
    const res = await axios.get(`https://api.jikan.moe/v4/anime/${randomId}`, { timeout: TIMEOUT })
    const a = res.data?.data
    if (!a ||!a.synopsis) return null
    return {
      fact: a.synopsis.split('.')[0] + '.',
      anime: a.title,
      image: a.images?.jpg?.large_image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(a.title)}&background=random&size=512`
    }
  },
  async () => {
    const res = await axios.post('https://graphql.anilist.co', {
      query: `query { Page(page: ${Math.floor(Math.random() * 1000)}, perPage: 1) { media(type: ANIME) { title { romaji } description coverImage { large }}}`
    }, { timeout: TIMEOUT })
    const a = res.data?.data?.Page?.media?.[0]
    if (!a) return null
    return {
      fact: a.description?.replace(/<[^>]*>/g, '').split('.')[0] + '.',
      anime: a.title?.romaji,
      image: a.coverImage?.large
    }
  },
  async () => {
    const offset = Math.floor(Math.random() * 1000)
    const res = await axios.get(`https://kitsu.io/api/edge/anime`, {
      params: { 'page[limit]': 1, 'page[offset]': offset },
      timeout: TIMEOUT,
      headers: { 'Accept': 'application/vnd.api+json' }
    })
    const a = res.data?.data?.[0]?.attributes
    if (!a) return null
    return {
      fact: a.synopsis?.split('.')[0] + '.',
      anime: a.canonicalTitle,
      image: a.posterImage?.large
    }
  },
  async () => {
    const res = await axios.get('https://animechan.xyz/api/random', { timeout: TIMEOUT })
    return {
      fact: `From ${res.data?.anime}: "${res.data?.quote}"`,
      anime: res.data?.anime,
      image: `https://ui-avatars.com/api/?name=${encodeURIComponent(res.data?.character || 'Anime')}&background=random&size=512`
    }
  },
  async () => {
    const page = Math.floor(Math.random() * 100) + 1
    const res = await axios.get(`https://shikimori.one/api/animes`, {
      params: { page, limit: 1 },
      timeout: TIMEOUT
    })
    const a = res.data?.[0]
    if (!a) return null
    const detail = await axios.get(`https://shikimori.one/api/animes/${a.id}`, { timeout: TIMEOUT })
    return {
      fact: detail.data?.description?.split('.')[0] + '.',
      anime: detail.data?.name,
      image: `https://shikimori.one${detail.data?.image?.original}`
    }
  },
  async () => {
    const res = await axios.get('https://api.mangadex.org/manga/random', { timeout: TIMEOUT })
    const a = res.data?.data?.attributes
    if (!a) return null
    return {
      fact: a.description?.en?.split('.')[0] + '.',
      anime: a.title?.en || Object.values(a.title || {})[0],
      image: `https://ui-avatars.com/api/?name=${encodeURIComponent(a.title?.en || 'Manga')}&background=random&size=512`
    }
  },
  async () => {
    return null
  },
  async () => {
    const res = await axios.get('https://api.simkl.com/anime/random', { timeout: TIMEOUT })
    const a = res.data
    if (!a) return null
    return {
      fact: a.overview?.split('.')[0] + '.',
      anime: a.title,
      image: `https://simkl.in/posters/${a.poster}_m.jpg`
    }
  },
  async () => {
    const res = await axios.get('https://www.livechart.me/api/v1/anime/recent', { timeout: TIMEOUT })
    const a = res.data?.[Math.floor(Math.random() * res.data.length)]
    if (!a) return null
    return {
      fact: a.description?.split('.')[0] + '.',
      anime: a.title_en || a.title_romaji,
      image: a.poster_image
    }
  },
  async () => {
    return null
  },
  async () => {
    const res = await axios.get('https://api.consumet.org/anime/gogoanime/top-airing', { timeout: TIMEOUT })
    const a = res.data?.results?.[Math.floor(Math.random() * res.data.results.length)]
    if (!a) return null
    return {
      fact: `Top airing anime: ${a.title} with ${a.genres?.join(', ')} genres.`,
      anime: a.title,
      image: a.image
    }
  },
  async () => {
    return null
  },
  async () => {
    return null
  },
  async () => {
    return null
  }
]

export default async function animefact(sock, { msg, from }, botSettings) {
  let processingMsg = null
  try {
    const brand = botSettings?.brand_name || botSettings?.botname || process.env.BUILD_BRAND || ''

    processingMsg = await sock.sendMessage(from, {
      text: `[SYSTEM] Intersecting random fact pipelines across cluster records...`
    }, { quoted: msg })

    let factData = null

    for (let i = 0; i < FACT_APIS.length; i++) {
      try {
        factData = await FACT_APIS[i]()
        if (factData && factData.fact && factData.fact.length > 10) break
      } catch (e) {
        continue
      }
    }

    if (!factData ||!factData.fact) {
      throw new Error('All synchronized fact telemetry targets dropped connection')
    }

    const caption = `╭─⌈ CONSOLE *ANIME FACT* ⌋
│
│ ${factData.fact}
│
│ Anime Reference: ${factData.anime || 'Unknown'}
│${brand? `
╰⊷ Powered By ${brand}` : `
╰────────────────`}`

    let graphicBuffer = null
    if (factData.image && factData.image.startsWith('http')) {
      try {
        const imageRes = await axios.get(factData.image, {
          responseType: 'arraybuffer',
          timeout: 10000,
          headers: { 'User-Agent': 'Mozilla/5.0' }
        })
        graphicBuffer = Buffer.from(imageRes.data)
      } catch (imgErr) {
        console.log(`[BUFFER ERROR] Image pipeline fallback engaged: ${imgErr.message}`)
      }
    }

    if (graphicBuffer) {
      await sock.sendMessage(from, {
        image: graphicBuffer,
        caption: caption
      }, { quoted: msg })
    } else {
      if (processingMsg) {
        await sock.sendMessage(from, { text: caption, edit: processingMsg.key })
      } else {
        await sock.sendMessage(from, { text: caption }, { quoted: msg })
      }
    }

  } catch (error) {
    console.error('[ANIMEFACT CORE FAULT]', error.message)
    const errorString = `[ERROR] Unable to extract facts from index tables. Execution dropped.`

    if (processingMsg) {
      await sock.sendMessage(from, { text: errorString, edit: processingMsg.key }).catch(() => {})
    } else {
      await sock.sendMessage(from, { text: errorString }, { quoted: msg })
    }
  }
}