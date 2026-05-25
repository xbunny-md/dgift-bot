// commands/anime/animeclip.js
import axios from 'axios'

export const name = 'animeclip'
export const alias = ['aclip', 'anishort', 'gif']
export const category = 'Anime'
export const desc = 'Get random anime short video clips with automatic stream validation buffers'

const TIMEOUT = 10000 // 10s for API responses

const ACTIONS = ['kiss', 'hug', 'pat', 'slap', 'punch', 'kick', 'bite', 'lick', 'cuddle', 'poke', 'highfive', 'handhold', 'yeet', 'kill', 'cry', 'smile', 'wave', 'dance', 'blush', 'happy']

const CLIP_APIS = [
  async (action) => {
    const res = await axios.get(`https://nekos.best/api/v2/${action}`, { timeout: TIMEOUT })
    const data = res.data?.results?.[0]
    return { url: data?.url, anime: data?.anime_name }
  },
  async (action) => {
    const res = await axios.get(`https://api.waifu.pics/sfw/${action}`, { timeout: TIMEOUT })
    return { url: res.data?.url, anime: 'Random' }
  },
  async (action) => {
    const res = await axios.get(`https://purrbot.site/api/img/sfw/${action}/gif`, { timeout: TIMEOUT })
    return { url: res.data?.link, anime: 'Purrbot' }
  },
  async (action) => {
    const res = await axios.get(`https://api.otakugifs.xyz/gif?reaction=${action}`, { timeout: TIMEOUT })
    return { url: res.data?.url, anime: 'OtakuGifs' }
  },
  async (action) => {
    const res = await axios.get(`https://nekos.life/api/v2/img/${action}`, { timeout: TIMEOUT })
    return { url: res.data?.url, anime: 'Nekos.life' }
  },
  async (action) => {
    const res = await axios.get('https://api.waifu.im/search', {
      params: { included_tags: action, is_nsfw: false, gif: true },
      timeout: TIMEOUT
    })
    return { url: res.data?.images?.[0]?.url, anime: res.data?.images?.[0]?.source || 'Waifu.im' }
  },
  async (action) => {
    const res = await axios.get(`https://kyoko.rei.my.id/api/sfw/${action}`, { timeout: TIMEOUT })
    return { url: res.data?.url, anime: 'Kyoko' }
  },
  async (action) => {
    const res = await axios.get(`https://shiro.gg/api/images/${action}`, { timeout: TIMEOUT })
    return { url: res.data?.url, anime: 'Shiro.gg' }
  },
  async (action) => {
    return null
  },
  async (action) => {
    const res = await axios.get(`https://kawaii.red/api/gif/${action}`, { timeout: TIMEOUT })
    return { url: res.data?.response, anime: 'Kawaii.red' }
  },
  async (action) => {
    const res = await axios.get(`https://api.weeb.sh/images/random`, {
      params: { type: action },
      headers: { 'Authorization': 'Bearer demo' },
      timeout: TIMEOUT
    })
    return { url: res.data?.url, anime: 'Weeb.sh' }
  },
  async (action) => {
    const res = await axios.get(`https://pic.re/gif/${action}`, { timeout: TIMEOUT })
    return { url: res.data?.file_url, anime: 'Pic.re' }
  },
  async (action) => {
    const res = await axios.get(`https://some-random-api.com/animu/${action}`, { timeout: TIMEOUT })
    return { url: res.data?.link, anime: 'Random API' }
  },
  async (action) => {
    const res = await axios.get(`https://tenor.googleapis.com/v2/search`, {
      params: { q: `anime ${action}`, key: 'LIVDSRZULELA', limit: 20, media_filter: 'gif' },
      timeout: TIMEOUT
    })
    const gif = res.data?.results?.[Math.floor(Math.random() * res.data.results.length)]
    return { url: gif?.media_formats?.gif?.url, anime: 'Tenor' }
  },
  async (action) => {
    const res = await axios.get(`https://api.giphy.com/v1/gifs/search`, {
      params: { q: `anime ${action}`, api_key: 'dc6zaTOxFJmzC', limit: 20 },
      timeout: TIMEOUT
    })
    const gif = res.data?.data?.[Math.floor(Math.random() * res.data.length)]
    return { url: gif?.images?.original?.url, anime: 'Giphy' }
  }
]

export default async function animeclip(sock, { msg, from, args }, botSettings) {
  let processingMsg = null
  try {
    let action = args[0]?.toLowerCase()
    const activePrefix = botSettings?.prefix || '.'
    const activeBrand = botSettings?.brand_name || botSettings?.botname || ''

    if (!action) {
      return await sock.sendMessage(from, {
        text: `[SYSTEM] Usage: ${activePrefix}animeclip <action>\n\n*Available Actions:*\n${ACTIONS.join(', ')}\n\n*Example:* ${activePrefix}animeclip kiss`
      }, { quoted: msg })
    }

    if (!ACTIONS.includes(action)) {
      return await sock.sendMessage(from, {
        text: `[ERROR] Invalid action parameters: "${action}"\n\n*Available Actions:*\n${ACTIONS.join(', ')}`
      }, { quoted: msg })
    }

    processingMsg = await sock.sendMessage(from, {
      text: `[SYSTEM] Intersecting API pipelines for action execution: "${action}"...`
    }, { quoted: msg })

    let clipData = null

    for (let i = 0; i < CLIP_APIS.length; i++) {
      try {
        clipData = await CLIP_APIS[i](action)
        if (clipData && clipData.url && clipData.url.startsWith('http')) break
      } catch (e) {
        continue
      }
    }

    if (!clipData ||!clipData.url) {
      throw new Error('All operational asset endpoints failed to return a valid URL')
    }

    const downloadBufferRes = await axios.get(clipData.url, {
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })

    const localMediaBuffer = Buffer.from(downloadBufferRes.data)

    const caption = `╭─⌈ CONSOLE *ANIME CLIP* ⌋
│
│ Action: ${action.toUpperCase()}
│ Anime: ${clipData.anime || 'Unknown'}
│${activeBrand? `
╰⊷ Powered By ${activeBrand}` : `
╰────────────────`}`

    await sock.sendMessage(from, {
      video: localMediaBuffer,
      caption: caption,
      gifPlayback: true
    }, { quoted: msg })

    // Loading message inabaki kama ilivyo, hakuna edit ya success
    // Edit imeondolewa kabisa

  } catch (error) {
    console.error('[ANIMECLIP EXCEPTION CAUGHT]', error.message)
    const errorTextStr = `[ERROR] Unable to compile media streams for: "${args[0]}". Exception logged.`

    if (processingMsg) {
      await sock.sendMessage(from, { text: errorTextStr, edit: processingMsg.key }).catch(() => {})
    } else {
      await sock.sendMessage(from, { text: errorTextStr }, { quoted: msg })
    }
  }
}