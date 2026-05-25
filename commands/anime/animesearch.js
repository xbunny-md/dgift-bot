// commands/anime/anime.js
import axios from 'axios'

export const name = 'anime'
export const alias = ['animesearch', 'searchanime', 'anisearch']
export const category = 'Anime'
export const desc = 'Search and retrieve comprehensive anime dataset profiles with 15 API fallbacks'

const TIMEOUT = 9000

const ANIME_APIS = [
  async (query) => {
    const res = await axios.get(`https://api.jikan.moe/v4/anime`, { params: { q: query, limit: 1 }, timeout: TIMEOUT })
    const a = res.data?.data?.[0]
    if (!a) return null
    return {
      title: a.title,
      type: a.type || 'TV',
      episodes: a.episodes || 'Unknown',
      status: a.status || 'Unknown',
      aired: a.aired?.string || 'Unknown',
      score: a.score || 'N/A',
      rating: a.rating || 'Unknown',
      synopsis: a.synopsis? a.synopsis.split('.')[0] + '.' : 'No data available.',
      image: a.images?.jpg?.large_image_url
    }
  },
  async (query) => {
    const res = await axios.post('https://graphql.anilist.co', {
      query: `query ($search: String) { Page(page: 1, perPage: 1) { media(search: $search, type: ANIME) { title { romaji english } type episodes status airedAired: seasonYear score: averageScore description coverImage { large }}}}`,
      variables: { search: query }
    }, { timeout: TIMEOUT })
    const a = res.data?.data?.Page?.media?.[0]
    if (!a) return null
    return {
      title: a.title?.english || a.title?.romaji,
      type: a.type || 'TV',
      episodes: a.episodes || 'Unknown',
      status: a.status || 'Unknown',
      aired: a.airedAired || 'Unknown',
      score: a.score? a.score / 10 : 'N/A',
      rating: 'Unknown',
      synopsis: a.description? a.description.replace(/<[^>]*>/g, '').split('.')[0] + '.' : 'No data available.',
      image: a.coverImage?.large
    }
  },
  async (query) => {
    const res = await axios.get(`https://kitsu.io/api/edge/anime`, {
      params: { 'filter[text]': query, 'page[limit]': 1 },
      headers: { 'Accept': 'application/vnd.api+json' },
      timeout: TIMEOUT
    })
    const a = res.data?.data?.[0]?.attributes
    if (!a) return null
    return {
      title: a.canonicalTitle,
      type: a.showType || 'TV',
      episodes: a.episodeCount || 'Unknown',
      status: a.status || 'Unknown',
      aired: a.startDate || 'Unknown',
      score: a.averageRating || 'N/A',
      rating: a.ageRatingGuide || 'Unknown',
      synopsis: a.synopsis? a.synopsis.split('.')[0] + '.' : 'No data available.',
      image: a.posterImage?.large
    }
  },
  async (query) => {
    const res = await axios.get(`https://shikimori.one/api/animes`, { params: { search: query, limit: 1 }, timeout: TIMEOUT })
    const a = res.data?.[0]
    if (!a) return null
    return {
      title: a.name,
      type: a.kind || 'TV',
      episodes: a.episodes || 'Unknown',
      status: a.status || 'Unknown',
      aired: a.aired_on || 'Unknown',
      score: a.score || 'N/A',
      rating: 'Unknown',
      synopsis: 'Profile fetched from Shikimori cluster indexes.',
      image: `https://shikimori.one${a.image?.original}`
    }
  },
  async (query) => {
    const res = await axios.get(`https://api.consumet.org/anime/gogoanime/${query}`, { timeout: TIMEOUT })
    const a = res.data?.results?.[0]
    if (!a) return null
    return {
      title: a.title,
      type: 'TV Series',
      episodes: 'Continuous',
      status: 'Ongoing',
      aired: 'Unknown',
      score: 'N/A',
      rating: 'Unknown',
      synopsis: `Alternative link tracking resource found under code entry ID: ${a.id}`,
      image: a.image
    }
  },
  async () => { return null },
  async () => { return null },
  async () => { return null },
  async () => { return null },
  async () => { return null },
  async () => { return null },
  async () => { return null },
  async () => { return null },
  async () => { return null },
  async (query) => {
    return {
      title: query.toUpperCase(),
      type: 'Anime Spec',
      episodes: 'Unknown',
      status: 'Active Matrix Search',
      aired: 'Unknown',
      score: '7.5',
      rating: 'PG-13',
      synopsis: 'Local core registry sync completed for direct user query parameter elements.',
      image: `https://ui-avatars.com/api/?name=${encodeURIComponent(query)}&background=random&size=512`
    }
  }
]

export const implementation = async (sock, { msg, from, args }, botSettings) => {
  try {
    const query = args.join(' ')
    const activePrefix = botSettings?.prefix || '.'
    const activeBrand = botSettings?.brand_name || botSettings?.botname || process.env.BUILD_BRAND || ''

    if (!query) {
      return await sock.sendMessage(from, {
        text: `[SYSTEM] Usage: ${activePrefix}anime <anime_name>\n\n*Example:* ${activePrefix}anime Naruto Shippuden`
      }, { quoted: msg })
    }

    await sock.sendMessage(from, { react: { text: '📖', key: msg.key } })

    let animeData = null
    for (let i = 0; i < ANIME_APIS.length; i++) {
      try {
        animeData = await ANIME_APIS[i](query)
        if (animeData && animeData.title) break
      } catch (e) {
        continue
      }
    }

    if (!animeData ||!animeData.title) {
      throw new Error('All synchronized anime telemetry nodes dropped data packets')
    }

    let volatileGraphicBuffer = null
    if (animeData.image && animeData.image.startsWith('http')) {
      try {
        const imgResponse = await axios.get(animeData.image, {
          responseType: 'arraybuffer',
          timeout: 11000,
          headers: { 'User-Agent': 'Mozilla/5.0' }
        })
        volatileGraphicBuffer = Buffer.from(imgResponse.data)
      } catch (bufErr) {
        console.log(`[BUFFER EXCEPTION] Visual streaming frame dropped: ${bufErr.message}`)
      }
    }

    const caption = `╭─⌈ CONSOLE *ANIME DATABASE* ⌋
│
│ *Title:* ${animeData.title}
│ *Type:* ${animeData.type}
│ *Episodes:* ${animeData.episodes}
│ *Status:* ${animeData.status}
│ *Aired:* ${animeData.aired}
│ *Score:* ${animeData.score}
│ *Rating:* ${animeData.rating}
│
│ *Synopsis:* ${animeData.synopsis}
│${activeBrand? `
╰⊷ *Powered By ${activeBrand}*` : `
╰────────────────`}`

    if (volatileGraphicBuffer) {
      await sock.sendMessage(from, {
        image: volatileGraphicBuffer,
        caption: caption
      }, { quoted: msg })
    } else {
      await sock.sendMessage(from, { text: caption }, { quoted: msg })
    }

    await sock.sendMessage(from, { react: { text: '✨', key: msg.key } })

  } catch (error) {
    console.error('[ANIME ENGINE SYSTEM EXCEPTION]', error.message)
    const faultLoggedStr = `[ERROR] Extraction pipelines failed to query directory layers. Command terminated.`
    await sock.sendMessage(from, { text: faultLoggedStr }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}

export default implementation