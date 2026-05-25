// commands/anime/animeclip.js
import axios from 'axios'

export const name = 'animeclip'
export const alias = ['aclip', 'anishort', 'gif']
export const category = 'Anime'
export const desc = 'Get random anime short video clips with automatic stream validation buffers'

const TIMEOUT = 10000 // 10s for API responses

// SUPPORTED ACTIONS
const ACTIONS = ['kiss', 'hug', 'pat', 'slap', 'punch', 'kick', 'bite', 'lick', 'cuddle', 'poke', 'highfive', 'handhold', 'yeet', 'kill', 'cry', 'smile', 'wave', 'dance', 'blush', 'happy']

// 15 ANIME GIF/VIDEO APIs
const CLIP_APIS = [
  // 1. Nekos.best
  async (action) => {
    const res = await axios.get(`https://nekos.best/api/v2/${action}`, { timeout: TIMEOUT })
    const data = res.data?.results?.[0]
    return { url: data?.url, anime: data?.anime_name }
  },

  // 2. Waifu.pics
  async (action) => {
    const res = await axios.get(`https://api.waifu.pics/sfw/${action}`, { timeout: TIMEOUT })
    return { url: res.data?.url, anime: 'Random' }
  },

  // 3. Purrbot.site
  async (action) => {
    const res = await axios.get(`https://purrbot.site/api/img/sfw/${action}/gif`, { timeout: TIMEOUT })
    return { url: res.data?.link, anime: 'Purrbot' }
  },

  // 4. OtakuGifs
  async (action) => {
    const res = await axios.get(`https://api.otakugifs.xyz/gif?reaction=${action}`, { timeout: TIMEOUT })
    return { url: res.data?.url, anime: 'OtakuGifs' }
  },

  // 5. Nekos.life
  async (action) => {
    const res = await axios.get(`https://nekos.life/api/v2/img/${action}`, { timeout: TIMEOUT })
    return { url: res.data?.url, anime: 'Nekos.life' }
  },

  // 6. Waifu.im
  async (action) => {
    const res = await axios.get('https://api.waifu.im/search', {
      params: { included_tags: action, is_nsfw: false, gif: true },
      timeout: TIMEOUT
    })
    return { url: res.data?.images?.[0]?.url, anime: res.data?.images?.[0]?.source || 'Waifu.im' }
  },

  // 7. Kyoko
  async (action) => {
    const res = await axios.get(`https://kyoko.rei.my.id/api/sfw/${action}`, { timeout: TIMEOUT })
    return { url: res.data?.url, anime: 'Kyoko' }
  },

  // 8. Shiro.gg
  async (action) => {
    const res = await axios.get(`https://shiro.gg/api/images/${action}`, { timeout: TIMEOUT })
    return { url: res.data?.url, anime: 'Shiro.gg' }
  },

  // 9. Anime-API (Fallback route skipped if dead)
  async (action) => {
    return null
  },

  // 10. Kawaii API
  async (action) => {
    const res = await axios.get(`https://kawaii.red/api/gif/${action}`, { timeout: TIMEOUT })
    return { url: res.data?.response, anime: 'Kawaii.red' }
  },

  // 11. Weeb.sh
  async (action) => {
    const res = await axios.get(`https://api.weeb.sh/images/random`, {
      params: { type: action },
      headers: { 'Authorization': 'Bearer demo' },
      timeout: TIMEOUT
    })
    return { url: res.data?.url, anime: 'Weeb.sh' }
  },

  // 12. Pic.re
  async (action) => {
    const res = await axios.get(`https://pic.re/gif/${action}`, { timeout: TIMEOUT })
    return { url: res.data?.file_url, anime: 'Pic.re' }
  },

  // 13. Some Random API
  async (action) => {
    const res = await axios.get(`https://some-random-api.com/animu/${action}`, { timeout: TIMEOUT })
    return { url: res.data?.link, anime: 'Random API' }
  },

  // 14. Tenor Anime
  async (action) => {
    const res = await axios.get(`https://tenor.googleapis.com/v2/search`, {
      params: { q: `anime ${action}`, key: 'LIVDSRZULELA', limit: 20, media_filter: 'gif' },
      timeout: TIMEOUT
    })
    const gif = res.data?.results?.[Math.floor(Math.random() * res.data.results.length)]
    return { url: gif?.media_formats?.gif?.url, anime: 'Tenor' }
  },

  // 15. Giphy Anime
  async (action) => {
    const res = await axios.get(`https://api.giphy.com/v1/gifs/search`, {
      params: { q: `anime ${action}`, api_key: 'dc6zaTOxFJmzC', limit: 20 },
      timeout: TIMEOUT
    })
    const gif = res.data?.data?.[Math.floor(Math.random() * res.data.data.length)]
    return { url: gif?.images?.original?.url, anime: 'Giphy' }
  }
]

export default async function animeclip(sock, { msg, from, args }, botSettings) {
  let processingMsg = null
  try {
    let action = args[0]?.toLowerCase()
    const activePrefix = botSettings?.prefix || '.'
    const activeBrand = process.env.BUILD_BRAND || botSettings?.botname || 'Bunny Tech'
    
    if (!action) {
      return await sock.sendMessage(from, {
        text: `[SYSTEM] Usage: ${activePrefix}animeclip <action>\n\n*Available Actions:*\n${ACTIONS.join(', ')}\n\n*Example:* ${activePrefix}animeclip kiss`
      }, { quoted: msg })
    }

    // Verify parameter integrity
    if (!ACTIONS.includes(action)) {
      return await sock.sendMessage(from, {
        text: `[ERROR] Invalid action parameters: "${action}"\n\n*Available Actions:*\n${ACTIONS.join(', ')}`
      }, { quoted: msg })
    }

    // Send active execution indicator log message string
    processingMsg = await sock.sendMessage(from, {
      text: `[SYSTEM] Intersecting API pipelines for action execution: "${action}"...`
    }, { quoted: msg })

    let clipData = null

    // TRY ALL 15 APIS SILENTLY
    for (let i = 0; i < CLIP_APIS.length; i++) {
      try {
        clipData = await CLIP_APIS[i](action)
        if (clipData && clipData.url && clipData.url.startsWith('http')) break
      } catch (e) {
        continue
      }
    }

    if (!clipData || !clipData.url) {
      throw new Error('All operational asset endpoints failed to return a valid URL')
    }

    // Core Buffer Download Sequence to safeguard against "media cannot be seen" bugs
    console.log(`[DOWNLOAD] Fetching remote file into memory: ${clipData.url}`)
    const downloadBufferRes = await axios.get(clipData.url, {
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    
    const localMediaBuffer = Buffer.from(downloadBufferRes.data)

    // Formulate clean terminal caption block
    const caption = `╭─⌈ CONSOLE *ANIME CLIP* ⌋
│
│ Action: ${action.toUpperCase()}
│ Anime: ${clipData.anime || 'Unknown'}
│
╰⊷ Powered By ${activeBrand}`

    // Discharging binary payload over WhatsApp stream infrastructure
    await sock.sendMessage(from, {
      video: localMediaBuffer,
      caption: caption,
      gifPlayback: true
    }, { quoted: msg })

    // Edit the processing message tracking status string instead of deletion
    if (processingMsg) {
      await sock.sendMessage(from, { 
        text: `[SUCCESS] Graphic transaction completed for parameter context: "${action}". Buffer sent.`, 
        edit: processingMsg.key 
      }).catch(() => {})
    }

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
