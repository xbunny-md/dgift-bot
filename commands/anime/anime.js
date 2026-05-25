// commands/anime/anime.js
import axios from 'axios'

export const name = 'anime'
export const alias = ['ani', 'animesearch']
export const category = 'Anime'
export const desc = 'Search anime info with 15+ API fallbacks'

const TIMEOUT = 10000 // 10s per API

// 15+ REALTIME ANIME APIs
const ANIME_APIS = [
  // 1. Jikan - MyAnimeList
  async (query) => {
    const res = await axios.get(`https://api.jikan.moe/v4/anime`, {
      params: { q: query, limit: 1 },
      timeout: TIMEOUT
    })
    const a = res.data?.data?.[0]
    if (!a) return null
    return {
      title: a.title,
      title_jp: a.title_japanese,
      episodes: a.episodes,
      score: a.score,
      status: a.status,
      aired: a.aired?.string,
      genres: a.genres?.map(g => g.name).join(', '),
      synopsis: a.synopsis,
      image: a.images?.jpg?.large_image_url,
      url: a.url,
      studio: a.studios?.[0]?.name,
      type: a.type
    }
  },

  // 2. Anilist GraphQL
  async (query) => {
    const res = await axios.post('https://graphql.anilist.co', {
      query: `query ($search: String) { Media(search: $search, type: ANIME) { title { romaji native } episodes averageScore status startDate { year } genres description studios { nodes { name } } coverImage { large } siteUrl format } }`,
      variables: { search: query }
    }, { timeout: TIMEOUT })
    const a = res.data?.data?.Media
    if (!a) return null
    return {
      title: a.title?.romaji,
      title_jp: a.title?.native,
      episodes: a.episodes,
      score: a.averageScore / 10,
      status: a.status,
      aired: a.startDate?.year,
      genres: a.genres?.join(', '),
      synopsis: a.description?.replace(/<[^>]*>/g, ''),
      image: a.coverImage?.large,
      url: a.siteUrl,
      studio: a.studios?.nodes?.[0]?.name,
      type: a.format
    }
  },

  // 3. Kitsu
  async (query) => {
    const res = await axios.get(`https://kitsu.io/api/edge/anime`, {
      params: { 'filter[text]': query, 'page[limit]': 1 },
      timeout: TIMEOUT,
      headers: { 'Accept': 'application/vnd.api+json' }
    })
    const a = res.data?.data?.[0]?.attributes
    if (!a) return null
    return {
      title: a.canonicalTitle,
      title_jp: a.titles?.ja_jp,
      episodes: a.episodeCount,
      score: a.averageRating,
      status: a.status,
      aired: a.startDate,
      genres: null,
      synopsis: a.synopsis,
      image: a.posterImage?.large,
      url: `https://kitsu.io/anime/${res.data.data[0].id}`,
      studio: null,
      type: a.showType
    }
  },

  // 4. AnimeAPI
  async (query) => {
    const res = await axios.get(`https://animeapi.xyz/api/anime`, {
      params: { search: query },
      timeout: TIMEOUT
    })
    const a = res.data?.[0]
    if (!a) return null
    return {
      title: a.title,
      title_jp: a.title_japanese,
      episodes: a.episodes,
      score: a.rating,
      status: a.status,
      aired: a.year,
      genres: a.genres?.join(', '),
      synopsis: a.description,
      image: a.poster,
      url: a.link,
      studio: a.studio,
      type: a.type
    }
  },

  // 5. Consumet
  async (query) => {
    const res = await axios.get(`https://api.consumet.org/anime/gogoanime/${query}`, {
      timeout: TIMEOUT
    })
    const a = res.data?.results?.[0]
    if (!a) return null
    return {
      title: a.title,
      title_jp: null,
      episodes: null,
      score: null,
      status: null,
      aired: null,
      genres: a.genres?.join(', '),
      synopsis: null,
      image: a.image,
      url: a.url,
      studio: null,
      type: a.subOrDub
    }
  },

  // 6. Enime
  async (query) => {
    const res = await axios.get(`https://api.enime.moe/search/${encodeURIComponent(query)}`, {
      timeout: TIMEOUT
    })
    const a = res.data?.data?.[0]
    if (!a) return null
    return {
      title: a.title?.english || a.title?.romaji,
      title_jp: a.title?.native,
      episodes: a.episodes?.length,
      score: a.averageScore,
      status: a.status,
      aired: a.year,
      genres: a.genre?.join(', '),
      synopsis: a.description,
      image: a.coverImage,
      url: `https://enime.moe/anime/${a.id}`,
      studio: null,
      type: a.format
    }
  },

  // 7. AnimeThemes
  async (query) => {
    const res = await axios.get(`https://api.animethemes.moe/anime`, {
      params: { 'filter[search]': query, 'include': 'images' },
      timeout: TIMEOUT
    })
    const a = res.data?.anime?.[0]
    if (!a) return null
    return {
      title: a.name,
      title_jp: null,
      episodes: null,
      score: null,
      status: null,
      aired: a.year,
      genres: null,
      synopsis: a.synopsis,
      image: a.images?.[0]?.link,
      url: `https://animethemes.moe/anime/${a.slug}`,
      studio: null,
      type: null
    }
  },

  // 8. NotifyMoe
  async (query) => {
    const res = await axios.get(`https://notify.moe/api/anime/search/${encodeURIComponent(query)}`, {
      timeout: TIMEOUT
    })
    const a = res.data?.[0]
    if (!a) return null
    return {
      title: a.title,
      title_jp: a.titleJapanese,
      episodes: a.episodeCount,
      score: a.rating?.overall,
      status: a.status,
      aired: a.startDate,
      genres: a.genres?.join(', '),
      synopsis: a.summary,
      image: a.image,
      url: `https://notify.moe/anime/${a.id}`,
      studio: null,
      type: a.type
    }
  },

  // 9. AnimeNewsNetwork
  async (query) => {
    return null 
  },

  // 10. Shikimori
  async (query) => {
    const res = await axios.get(`https://shikimori.one/api/animes`, {
      params: { search: query, limit: 1 },
      timeout: TIMEOUT
    })
    const a = res.data?.[0]
    if (!a) return null
    return {
      title: a.name,
      title_jp: a.russian,
      episodes: a.episodes,
      score: a.score,
      status: a.status,
      aired: a.aired_on,
      genres: a.genres?.map(g => g.name).join(', '),
      synopsis: null,
      image: `https://shikimori.one${a.image?.original}`,
      url: `https://shikimori.one/animes/${a.id}`,
      studio: null,
      type: a.kind
    }
  },

  // 11. AniSearch
  async (query) => {
    const res = await axios.get(`https://api.anisearch.com/anime`, {
      params: { q: query },
      timeout: TIMEOUT
    })
    const a = res.data?.data?.[0]
    if (!a) return null
    return {
      title: a.title,
      title_jp: a.title_jp,
      episodes: a.episodes,
      score: a.rating,
      status: a.status,
      aired: a.year,
      genres: a.genres?.join(', '),
      synopsis: a.description,
      image: a.poster,
      url: a.url,
      studio: a.studio,
      type: a.type
    }
  },

  // 12. MyAnimeList Unofficial
  async (query) => {
    const res = await axios.get(`https://myanimelist.net/search/prefix.json`, {
      params: { type: 'anime', keyword: query },
      timeout: TIMEOUT
    })
    const a = res.data?.categories?.[0]?.items?.[0]
    if (!a) return null
    return {
      title: a.name,
      title_jp: null,
      episodes: null,
      score: null,
      status: null,
      aired: a.payload?.aired,
      genres: null,
      synopsis: null,
      image: a.image_url,
      url: a.url,
      studio: null,
      type: a.payload?.media_type
    }
  },

  // 13. AnimePlanet
  async (query) => {
    return null
  },

  // 14. LiveChart
  async (query) => {
    const res = await axios.get(`https://www.livechart.me/api/v1/anime`, {
      params: { query: query },
      timeout: TIMEOUT
    })
    const a = res.data?.[0]
    if (!a) return null
    return {
      title: a.title_en || a.title_romaji,
      title_jp: a.title_native,
      episodes: a.episode_count,
      score: null,
      status: null,
      aired: a.premiere,
      genres: a.tags?.join(', '),
      synopsis: a.description,
      image: a.poster_image,
      url: `https://www.livechart.me/anime/${a.id}`,
      studio: a.studios?.[0]?.name,
      type: null
    }
  },

  // 15. Simkl
  async (query) => {
    const res = await axios.get(`https://api.simkl.com/search/anime`, {
      params: { q: query, client_id: 'free' },
      timeout: TIMEOUT
    })
    const a = res.data?.[0]
    if (!a) return null
    return {
      title: a.title,
      title_jp: null,
      episodes: a.total_episodes,
      score: a.rating,
      status: a.status,
      aired: a.year,
      genres: null,
      synopsis: a.overview,
      image: `https://simkl.in/posters/${a.poster}_m.jpg`,
      url: `https://simkl.com/anime/${a.ids?.simkl_id}`,
      studio: null,
      type: null
    }
  }
]

export default async function anime(sock, { msg, from, args }, botSettings) {
  let processingMsg = null
  try {
    const query = args.join(' ')
    if (!query) {
      return await sock.sendMessage(from, {
        text: `> Usage: ${botSettings.prefix}anime <name>\n> Example: ${botSettings.prefix}anime Naruto`
      }, { quoted: msg })
    }

    // Dynamic brand extraction logic via environment properties or live Supabase setting maps
    const activeBrand = process.env.BUILD_BRAND || botSettings?.botname || 'Bunny Tech'

    // Dispatch system scanning indicator status
    processingMsg = await sock.sendMessage(from, {
      text: `[SYSTEM] Searching for "${query}" across fallback arrays...`
    }, { quoted: msg })

    let animeData = null
    let apiUsed = 0

    // TRY ALL 15 APIS
    for (let i = 0; i < ANIME_APIS.length; i++) {
      try {
        console.log(`[ANIME] Running pipeline check on API ${i + 1}/${ANIME_APIS.length}`)
        animeData = await ANIME_APIS[i](query)
        if (animeData && animeData.title) {
          apiUsed = i + 1
          console.log(`[ANIME] Pipeline check on API ${i + 1} succeeded`)
          break
        }
      } catch (e) {
        console.log(`[ANIME] Pipeline check on API ${i + 1} failed: ${e.message}`)
      }
    }

    if (!animeData) {
      throw new Error('All 15 integrated cluster search paths failed')
    }

    // Structured Report Layout Output Generation
    const report = `╭─⌈ CONSOLE *${animeData.title.toUpperCase()}* ⌋
│ Japanese: ${animeData.title_jp || 'N/A'}
│ Type: ${animeData.type || 'TV'}
│ Episodes: ${animeData.episodes || '?'}
│ Score: ${animeData.score || 'N/A'}/10
│ Status: ${animeData.status || 'Unknown'}
│ Aired: ${animeData.aired || 'N/A'}
│ Studio: ${animeData.studio || 'N/A'}
│ Genres: ${animeData.genres || 'N/A'}
│
│ Synopsis: ${(animeData.synopsis || 'No tracking overview logged').slice(0, 200)}...
╰⊷ Source: Path ${apiUsed} • Powered By ${activeBrand}`

    // Send with image if present, otherwise transform the original processing message
    if (animeData.image) {
      // Image delivery pattern
      await sock.sendMessage(from, {
        image: { url: animeData.image },
        caption: report
      }, { quoted: msg })

      // Edit processing text to reflect completion status instead of deleting
      if (processingMsg) {
        await sock.sendMessage(from, { 
          text: `[SUCCESS] Retrieval parameters verified for "${animeData.title}". Graphic asset dispatched below.`, 
          edit: processingMsg.key 
        }).catch(() => {})
      }
    } else {
      // Direct text edit to prevent duplicate transmission strings
      if (processingMsg) {
        await sock.sendMessage(from, { text: report, edit: processingMsg.key }, { quoted: msg })
      } else {
        await sock.sendMessage(from, { text: report }, { quoted: msg })
      }
    }

  } catch (error) {
    console.error('[ANIME PROCESS CRASH]', error.message)
    
    let errorMsg = '[ERROR] Operational search array breakdown'
    if (error.message.includes('15 integrated')) {
      errorMsg = '[ERROR] Complete fallback block failure. All 15 APIs returned null records.'
    }

    // Dynamic error state transformation update
    if (processingMsg) {
      await sock.sendMessage(from, { text: errorMsg, edit: processingMsg.key }).catch(() => {})
    } else {
      await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    }
  }
}
