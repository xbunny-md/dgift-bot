// commands/photo/ultimate.js
// Ultimate multi-feature command file
// Baileys 6.7.18 | Prefix from Supabase | 10+ fallbacks | RAM-safe | Anti-ban reactions
// English code

import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { tmpdir } from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'
import FormData from 'form-data'

export const name = 'ultimate'
export const alias = [
  // Mood reactions
  'mood','react','vibe','reaction',
  // Wallpaper
  'wallpaper','wall','wp','bg',
  // Channel
  'channel','createchannel','chanmsg',
  // News
  'news','headlines','breaking',
  // Weather
  'weather','forecast','temp',
  // Calculator + Graph
  'calc','calculate','math','graph',
  // Image download
  'imgdl','dlimg','saveimg','picget',
  // Fun games
  'ship','slots','aviator','spin','dice','flip','roulette','trivia','riddle','dare','truth','wouldyou','neverhave','8ball','rate','rank',
  // Match/Sports live
  'match','livescore','scores','fixtures','standings',
  // Surebets
  'surebets','surebet','arbitrage',
  // AI Song creation
  'song2','makesong','createsong','aisong','songgen',
  // Date/Time/Countdown
  'date','time','datetime','countdown','daysleft','daysuntil',
  // Extra 35+
  'joke','quote','fact','riddle2','maths','currency','crypto','stock',
  'bible2','horoscope','poem','motivate','roast2','compliment2',
  'anagram','palindrome','worddef','wikipedia','imdb','anime',
  'manga','recipe','cocktail','catfact','dogfact','spacefact',
  'numberfact','yearfact','countryfact','randname','password',
  'uuid','color2','hex','rgb','base64enc','base64dec',
  'hash','ip','ping','dns','whois','pastetext'
]
export const category = 'Ultimate'
export const desc = 'Ultimate all-in-one: moods, wallpaper, news, weather, calc, games, sports, songs & 35+ more'

const execAsync = promisify(exec)
const TMP = tmpdir()
const TOUT = 15000

// ══════════════════════════════════════════════════
// CORE HELPERS (same pattern as photo.js)
// ══════════════════════════════════════════════════
const tmpF = (ext = 'jpg') => path.join(TMP, `ult_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`)
function gc(...files) { for (const f of files) { try { if (f && fs.existsSync(f)) fs.unlinkSync(f) } catch {} } }

async function dl(url, extra = {}) {
  const r = await axios.get(url, {
    responseType: 'arraybuffer', timeout: 35000,
    headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)', ...extra.headers },
    maxContentLength: 100 * 1024 * 1024, ...extra
  })
  return { buf: Buffer.from(r.data), ct: r.headers['content-type'] || '', sz: r.data.byteLength }
}

function getQuotedText(msg) {
  const q = msg?.message?.extendedTextMessage?.contextInfo
  return q?.quotedMessage?.conversation || q?.quotedMessage?.extendedTextMessage?.text || null
}

function box(title, lines, brand) {
  const clean = (Array.isArray(lines) ? lines : [lines]).filter(l => l != null && l !== '')
  return `╭─⌈ CONSOLE *${title.toUpperCase()}* ⌋\n` + clean.map(l => `│ ${l}`).join('\n') + `\n╰⊷ *Powered By ${brand}*`
}

async function rct(sock, msg, emoji) {
  try { await sock.sendMessage(msg.key?.remoteJid, { react: { text: emoji, key: msg.key } }) } catch {}
}

async function sendImg(sock, from, msg, buf, cap) {
  await sock.sendMessage(from, { image: buf, caption: cap }, { quoted: msg })
}

async function sendTxt(sock, from, msg, text) {
  await sock.sendMessage(from, { text }, { quoted: msg })
}

async function sendAud(sock, from, msg, buf, fname) {
  await sock.sendMessage(from, { audio: buf, mimetype: 'audio/mpeg', ptt: false, fileName: fname }, { quoted: msg })
}

// ══════════════════════════════════════════════════
// FEATURE 1 — MOOD REACTIONS (50 moods, 15 emojis each, anti-ban)
// Anti-ban: sends ONE random emoji from pool, randomized delays, no spam
// ══════════════════════════════════════════════════
const MOODS = {
  happy:       ['😊','😁','😄','🤩','🥳','😃','🌟','✨','💫','🎉','🎊','🌈','☀️','💛','🌻'],
  sad:         ['😢','😭','💔','😞','😔','🥺','😿','💧','🌧️','☁️','😓','😥','🫂','💙','🌊'],
  angry:       ['😠','😡','🤬','💢','🔥','😤','👊','⚡','💥','🌪️','😾','🫵','⚔️','🗡️','💀'],
  love:        ['❤️','💜','💛','💚','💙','🧡','🤍','💗','💖','💘','💝','😍','🥰','💑','💞'],
  excited:     ['🤩','😱','🎉','🚀','⚡','🔥','💥','🌟','✨','💫','🎊','🎆','🎇','🥳','😲'],
  chill:       ['😎','🤙','✌️','🏖️','🌊','🌿','🍃','💨','🌬️','😌','🧘','🌙','⭐','🎵','🎶'],
  confused:    ['😕','🤔','😟','🤷','❓','🌀','💭','🧩','🔄','😵','🤯','🌪️','🎭','🃏','🎲'],
  surprised:   ['😲','😯','😮','🫢','🤭','👀','😱','🙊','💫','⚡','🌟','✨','🎭','🎪','🎠'],
  sleepy:      ['😴','💤','🌙','⭐','🌛','🛏️','🌜','😪','🥱','💭','🌌','🌠','✨','🌟','💫'],
  hungry:      ['🍔','🍕','🌮','🍜','🍣','🍦','🍰','🍩','🥪','🍟','🌯','🥐','🍝','🥗','🧁'],
  scared:      ['😨','😰','😱','👻','🙀','😿','⚡','💀','🌪️','🫣','🤫','😶','💔','🫀','🌫️'],
  bored:       ['😑','🥱','😐','💤','⏰','🕰️','📺','🎮','🎭','🌫️','😒','🙄','😴','💭','🔄'],
  proud:       ['😤','💪','👑','🏆','⭐','🌟','✨','🎖️','🥇','🏅','🎗️','💎','🔱','👊','💥'],
  grateful:    ['🙏','❤️','😊','✨','💫','🌟','💛','🌈','🕊️','💜','🌸','🌺','🌹','💐','🌷'],
  playful:     ['😜','🤪','😝','🎭','🎪','🃏','🎠','🎡','🎢','🎈','🎊','🎉','🎁','🎀','🎮'],
  romantic:    ['❤️','💕','🌹','🥰','😍','💋','💑','✨','💫','🌙','⭐','🕯️','🌸','🌺','💐'],
  nostalgic:   ['🌅','📸','🎞️','📼','💾','📻','🎙️','🕰️','⏳','🌄','🌇','🌆','💭','🧡','🌻'],
  motivated:   ['💪','🔥','⚡','🚀','💥','🏋️','🎯','⭐','🌟','✨','🏆','🥇','💎','👑','🔱'],
  peaceful:    ['🕊️','🌿','🍃','🌱','☮️','🌊','🌙','⭐','💫','🌸','🌺','🌷','💐','🌈','✨'],
  grumpy:      ['😒','🙄','😤','💢','😾','👎','🚫','❌','😑','🫠','😠','💀','☠️','⚰️','🗑️'],
  goofy:       ['🤪','😝','🙃','🤡','👻','🎭','🃏','🤣','😂','🎠','🎡','🤸','🙄','👀','🤯'],
  shy:         ['🫣','😳','😊','🙈','💫','🌸','🌷','💕','😶','🫂','💜','🌺','🌹','💐','🌻'],
  flirty:      ['😏','😈','💋','😍','🥵','🔥','💦','😜','👅','💜','❤️','🌹','✨','💫','⚡'],
  savage:      ['😎','💀','☠️','⚔️','🗡️','🔥','💥','👊','⚡','💢','🤬','😈','👑','🏆','💎'],
  gangsta:     ['😤','💪','✊','🔥','⚡','💥','👊','🎯','💎','👑','💰','🏆','⭐','🌟','🔱'],
  depressed:   ['😞','💔','🌧️','☁️','😢','😭','🥺','💧','🌊','😟','😔','😿','🫂','💜','🌑'],
  hyped:       ['🤩','🔥','⚡','💥','🚀','🎉','🎊','🥳','😱','🤯','🌟','✨','💫','⭐','🏆'],
  toxic:       ['☠️','💀','🤢','🤮','😈','💀','🗑️','🚫','❌','⛔','💥','🔥','⚡','☣️','⚠️'],
  blessed:     ['🙏','✨','💫','🌟','⭐','🌈','☀️','💛','❤️','💜','🕊️','🌸','🌺','💐','🌷'],
  vibing:      ['🎵','🎶','🎸','🎹','🎺','🎻','🥁','🎤','🎧','🎼','🎷','🪗','🎙️','🎚️','🎛️'],
  unbothered:  ['💅','😌','✌️','😎','👑','💎','🌟','✨','💫','⭐','🏆','🥇','🔱','👊','💪'],
  dead:        ['💀','☠️','⚰️','🪦','😵','😵‍💫','😶','😑','🫠','🤤','😪','💤','🛏️','🔕','🔇'],
  salty:       ['😒','🙄','💢','😤','🧂','🫠','👎','❌','🚫','⛔','💔','😑','😐','🤨','😏'],
  lost:        ['🗺️','🧭','❓','❔','🤷','😕','🌀','💭','🔄','🌫️','😵','🤯','🌪️','🎭','🃏'],
  lit:         ['🔥','💥','⚡','🌟','✨','💫','⭐','🎉','🎊','🥳','🤩','😱','🚀','🎆','🎇'],
  spiritual:   ['🙏','✨','💫','🌟','⭐','☮️','🕊️','🌈','🌸','🌺','💐','🌷','🌙','⭐','🌌'],
  cold:        ['🥶','❄️','🌨️','☃️','🌬️','💨','🌪️','🫥','😶','😑','💎','💙','🔵','🌊','🌌'],
  hot:         ['🥵','🔥','☀️','🌡️','💥','⚡','🌋','🏜️','😤','💪','🔱','👑','💎','🌟','✨'],
  classy:      ['👑','💎','🥂','🍾','✨','💫','🌟','⭐','🏆','🥇','🎩','💼','🌹','🕊️','🔱'],
  broke:       ['💸','💔','😢','🪙','😞','😟','🥺','💧','🌧️','☁️','😭','🤕','💀','☠️','🗑️'],
  rich:        ['💰','💎','👑','🏆','🥇','🔱','✨','💫','🌟','⭐','🏰','🚀','💪','🔥','⚡'],
  foodie:      ['🍔','🍕','🌮','🍜','🍣','🍦','🍰','🍩','🥪','🍟','🌯','🥐','🍝','🥗','🧁'],
  sporty:      ['⚽','🏀','🏈','⚾','🎾','🏐','🏉','🎱','🏓','🏸','🏒','🥊','🥋','⛷️','🏄'],
  gamer:       ['🎮','👾','🕹️','🎲','🃏','🎯','🎰','🏆','🥇','💎','⭐','🌟','⚡','🔥','💥'],
  artistic:    ['🎨','🖌️','✏️','🖊️','🎭','🎪','🎠','🌈','✨','💫','🌟','⭐','🎆','🎇','🎑'],
  techy:       ['💻','📱','⌨️','🖥️','🖨️','🖱️','💾','💿','📀','🔌','🔋','⚡','🤖','👨‍💻','🌐'],
  mystery:     ['🔮','🌙','⭐','✨','💫','🌌','🌠','🎭','🃏','🎲','❓','🔍','🕵️','👁️','🌀'],
  wild:        ['🦁','🐯','🦊','🐺','🦝','🦅','🦋','🌿','🌴','🌋','⚡','🔥','💥','🌪️','🌊']
}

// Anti-ban reaction sender: send ONE emoji with small delay, not spamming
async function sendMoodReaction(sock, from, msg, moodName, brand) {
  const pool = MOODS[moodName]
  if (!pool) return null
  // Pick ONE random emoji from the 15
  const emoji = pool[Math.floor(Math.random() * pool.length)]
  // Small random delay (anti-ban)
  await new Promise(r => setTimeout(r, 500 + Math.random() * 1000))
  // Send as react (not message — less chance of ban)
  try {
    await sock.sendMessage(from, { react: { text: emoji, key: msg.key } })
    return emoji
  } catch {
    // Fallback: send as text if react fails
    await sock.sendMessage(from, { text: emoji }, { quoted: msg })
    return emoji
  }
}

// ══════════════════════════════════════════════════
// FEATURE 2 — WALLPAPER (mobile size 1080x1920)
// ══════════════════════════════════════════════════
async function getWallpaper(query) {
  const tries = [
    async () => {
      const r = await axios.get('https://api.unsplash.com/search/photos', {
        params: { query, per_page: 1, orientation: 'portrait', client_id: process.env.UNSPLASH_KEY || 'UfPFHCSPzTiGkWkzqZQJdHHzQRnSFcf4JFW3jR6PjYA' },
        timeout: TOUT
      }); const img = r.data?.results?.[0]?.urls?.full || r.data?.results?.[0]?.urls?.regular; if (!img) return null
      const { buf } = await dl(img); return buf
    },
    async () => {
      const r = await axios.get('https://api.pexels.com/v1/search', {
        params: { query, per_page: 1, orientation: 'portrait' },
        headers: { Authorization: process.env.PEXELS_KEY || 'fPJGMgA78eijrpvTbKPDl1gXLXbFXKI5YrKkC6xOzYzaioZPTHLHTxnN' },
        timeout: TOUT
      }); const img = r.data?.photos?.[0]?.src?.large2x || r.data?.photos?.[0]?.src?.large; if (!img) return null
      const { buf } = await dl(img); return buf
    },
    async () => {
      const r = await axios.get(`https://pixabay.com/api/?key=${process.env.PIXABAY_KEY || '34355411-b07793c4a7be8bfee6d45c4fa'}&q=${encodeURIComponent(query)}&image_type=photo&orientation=vertical&per_page=3`, { timeout: TOUT })
      const img = r.data?.hits?.[0]?.largeImageURL; if (!img) return null
      const { buf } = await dl(img); return buf
    },
    async () => {
      const url = `https://source.unsplash.com/1080x1920/?${encodeURIComponent(query)}`
      const { buf } = await dl(url); return buf
    },
    async () => {
      const r = await axios.get(`https://wallhaven.cc/api/v1/search?q=${encodeURIComponent(query)}&ratios=9x16&sorting=relevance`, { timeout: TOUT })
      const img = r.data?.data?.[0]?.path; if (!img) return null
      const { buf } = await dl(img); return buf
    },
    async () => {
      const r = await axios.get(`https://api.flickr.com/services/rest/?method=flickr.photos.search&api_key=${process.env.FLICKR_KEY || '3e6f2046e1f55d9b7d7b7c29d7e5d2f3'}&text=${encodeURIComponent(query)}&format=json&nojsoncallback=1&extras=url_o,url_l&per_page=1`, { timeout: TOUT })
      const p = r.data?.photos?.photo?.[0]; if (!p) return null
      const img = p.url_o || `https://live.staticflickr.com/${p.server}/${p.id}_${p.secret}_b.jpg`
      const { buf } = await dl(img); return buf
    },
    async () => {
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(query + ' wallpaper mobile portrait beautiful')}?width=1080&height=1920&nologo=true`
      const { buf } = await dl(url); return buf
    },
    async () => {
      const r = await axios.get(`https://www.bing.com/images/search?q=${encodeURIComponent(query + ' wallpaper')}&form=HDRSC2&first=1`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: TOUT
      }); const m = r.data?.match(/murl&quot;:&quot;(https[^&]+)&quot;/); if (!m) return null
      const { buf } = await dl(decodeURIComponent(m[1])); return buf
    },
    async () => {
      const url = `https://loremflickr.com/1080/1920/${encodeURIComponent(query)}`
      const { buf } = await dl(url); return buf
    },
    async () => {
      const url = `https://picsum.photos/1080/1920`
      const { buf } = await dl(url); return buf
    }
  ]
  for (const t of tries) { try { const b = await t(); if (b?.length > 1000) return b } catch {} }
  return null
}

// ══════════════════════════════════════════════════
// FEATURE 3 — CREATE/SEND CHANNEL MESSAGE
// ══════════════════════════════════════════════════
async function sendChannelMessage(sock, channelJid, text, imgBuf) {
  const methods = [
    async () => {
      if (imgBuf) {
        await sock.sendMessage(channelJid, { image: imgBuf, caption: text })
      } else {
        await sock.sendMessage(channelJid, { text })
      }
      return true
    },
    async () => {
      await sock.sendMessage(channelJid, { text: text || '📢 Channel update' })
      return true
    },
    async () => {
      const { generateWAMessageFromContent, proto } = await import('@whiskeysockets/baileys')
      const m = generateWAMessageFromContent(channelJid, proto.Message.fromObject({
        conversation: text
      }), { userJid: sock.user?.id })
      await sock.relayMessage(channelJid, m.message, { messageId: m.key.id })
      return true
    }
  ]
  for (const m of methods) { try { const ok = await m(); if (ok) return true } catch {} }
  return false
}

// ══════════════════════════════════════════════════
// FEATURE 4 — NEWS
// ══════════════════════════════════════════════════
async function getNews(query = 'world', country = '') {
  const tries = [
    async () => {
      const params = { apiKey: process.env.NEWS_KEY || '0e7c3e5f5d5b4f3f8e5b5d5f5e5b5d5f', pageSize: 5 }
      if (query) params.q = query; else params.country = country || 'us'; params.language = 'en'
      const r = await axios.get('https://newsapi.org/v2/top-headlines', { params, timeout: TOUT })
      return r.data?.articles?.slice(0, 5).map(a => `📰 *${a.title}*\n   ${a.description?.slice(0, 80) || ''}\n   🔗 ${a.url}`)
    },
    async () => {
      const r = await axios.get(`https://gnews.io/api/v4/search?q=${encodeURIComponent(query || 'world')}&lang=en&max=5&apikey=${process.env.GNEWS_KEY || 'test'}`, { timeout: TOUT })
      return r.data?.articles?.slice(0, 5).map(a => `📰 *${a.title}*\n   ${a.description?.slice(0, 80) || ''}`)
    },
    async () => {
      const r = await axios.get(`https://newsdata.io/api/1/news?apikey=${process.env.NEWSDATA_KEY || 'test'}&q=${encodeURIComponent(query || 'world')}&language=en&size=5`, { timeout: TOUT })
      return r.data?.results?.slice(0, 5).map(a => `📰 *${a.title}*\n   ${a.description?.slice(0, 80) || ''}`)
    },
    async () => {
      const r = await axios.get(`https://api.currentsapi.services/v1/latest-news?keywords=${encodeURIComponent(query || 'world')}&language=en&apiKey=${process.env.CURRENTS_KEY || 'test'}`, { timeout: TOUT })
      return r.data?.news?.slice(0, 5).map(a => `📰 *${a.title}*\n   ${a.description?.slice(0, 80) || ''}`)
    },
    async () => {
      const feed = query ? `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en` : `https://feeds.bbci.co.uk/news/rss.xml`
      const r = await axios.get(feed, { timeout: TOUT })
      const items = [...r.data.matchAll(/<title><!\[CDATA\[([^\]]+)\]\]><\/title>/g)].slice(0, 5)
      return items.map(m => `📰 ${m[1]}`)
    }
  ]
  for (const t of tries) { try { const r = await t(); if (r?.length) return r } catch {} }
  return null
}

// ══════════════════════════════════════════════════
// FEATURE 5 — WEATHER
// ══════════════════════════════════════════════════
async function getWeather(city) {
  const tries = [
    async () => {
      const r = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${process.env.WEATHER_KEY || 'bd5e378503939ddaee76f12ad7a97608'}&units=metric`, { timeout: TOUT })
      const d = r.data
      return {
        city: d.name, country: d.sys?.country,
        temp: `${Math.round(d.main?.temp)}°C`,
        feels: `${Math.round(d.main?.feels_like)}°C`,
        desc: d.weather?.[0]?.description,
        humidity: `${d.main?.humidity}%`,
        wind: `${d.wind?.speed} m/s`,
        icon: d.weather?.[0]?.icon
      }
    },
    async () => {
      const r = await axios.get(`https://wttr.in/${encodeURIComponent(city)}?format=j1`, { timeout: TOUT })
      const c = r.data?.current_condition?.[0]
      return { city, temp: `${c?.temp_C}°C`, feels: `${c?.FeelsLikeC}°C`, desc: c?.weatherDesc?.[0]?.value, humidity: `${c?.humidity}%`, wind: `${c?.windspeedKmph} km/h` }
    },
    async () => {
      const r = await axios.get(`https://api.weatherapi.com/v1/current.json?key=${process.env.WEATHERAPI_KEY || 'test'}&q=${encodeURIComponent(city)}`, { timeout: TOUT })
      const d = r.data
      return { city: d.location?.name, country: d.location?.country, temp: `${d.current?.temp_c}°C`, feels: `${d.current?.feelslike_c}°C`, desc: d.current?.condition?.text, humidity: `${d.current?.humidity}%`, wind: `${d.current?.wind_kph} km/h` }
    },
    async () => {
      const geo = await axios.get(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`, { timeout: TOUT })
      const loc = geo.data?.results?.[0]; if (!loc) return null
      const r = await axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current_weather=true&hourly=relativehumidity_2m`, { timeout: TOUT })
      const c = r.data?.current_weather
      return { city: loc.name, country: loc.country, temp: `${c?.temperature}°C`, desc: 'Open-Meteo', wind: `${c?.windspeed} km/h` }
    }
  ]
  for (const t of tries) { try { const r = await t(); if (r) return r } catch {} }
  return null
}

// ══════════════════════════════════════════════════
// FEATURE 6 — CALCULATOR + GRAPH
// ══════════════════════════════════════════════════
function safeCalc(expr) {
  try {
    // Safe math eval — only allow math chars
    const safe = expr.replace(/[^0-9+\-*/().^%\s]/g, '')
    if (!safe.trim()) return null
    // Replace ^ with **
    const cleaned = safe.replace(/\^/g, '**')
    // Use Function constructor safely
    const result = Function('"use strict"; return (' + cleaned + ')')()
    if (typeof result !== 'number' || !isFinite(result)) return null
    return result
  } catch { return null }
}

async function makeGraph(expr, brand) {
  // Generate graph using QuickChart
  const tries = [
    async () => {
      // Generate data points
      const points = []
      for (let x = -10; x <= 10; x += 0.5) {
        try {
          const y = Function('"use strict"; const x = ' + x + '; return (' + expr.replace(/\^/g, '**') + ')')()
          if (isFinite(y) && Math.abs(y) < 1000) points.push({ x: parseFloat(x.toFixed(2)), y: parseFloat(y.toFixed(4)) })
        } catch {}
      }
      if (points.length < 3) return null

      const cfg = {
        type: 'scatter',
        data: {
          datasets: [{
            label: `y = ${expr}`,
            data: points,
            showLine: true,
            borderColor: '#7B2FBE',
            backgroundColor: 'rgba(123,47,190,0.2)',
            pointRadius: 2,
            fill: true
          }]
        },
        options: {
          plugins: { title: { display: true, text: `Graph: y = ${expr}`, color: '#fff' }, legend: { labels: { color: '#fff' } } },
          scales: { x: { ticks: { color: '#ccc' }, grid: { color: '#333' } }, y: { ticks: { color: '#ccc' }, grid: { color: '#333' } } },
          backgroundColor: '#1a1a2e'
        }
      }
      const url = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(cfg))}&width=800&height=500&backgroundColor=%231a1a2e`
      const { buf } = await dl(url); return buf
    },
    async () => {
      const points = []; const labels = []; const data = []
      for (let x = -5; x <= 5; x++) {
        try {
          const y = Function('"use strict"; const x = ' + x + '; return (' + expr.replace(/\^/g, '**') + ')')()
          if (isFinite(y)) { labels.push(x); data.push(parseFloat(y.toFixed(2))) }
        } catch {}
      }
      if (!data.length) return null
      const cfg = { type: 'line', data: { labels, datasets: [{ label: `y=${expr}`, data, borderColor: '#7B2FBE', fill: false }] } }
      const url = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(cfg))}&width=800&height=500`
      const { buf } = await dl(url); return buf
    }
  ]
  for (const t of tries) { try { const b = await t(); if (b?.length > 500) return b } catch {} }
  return null
}

// ══════════════════════════════════════════════════
// FEATURE 7 — IMAGE DOWNLOAD FROM ANY URL
// ══════════════════════════════════════════════════
async function downloadImage(url) {
  const tries = [
    async () => { const { buf, ct } = await dl(url); if (!ct.includes('image') && !ct.includes('octet')) return null; return buf },
    async () => { const { buf } = await dl(url, { headers: { Referer: new URL(url).origin } }); return buf },
    async () => { const r = await axios.get(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`, { responseType: 'arraybuffer', timeout: 20000 }); return Buffer.from(r.data) },
    async () => { const r = await axios.get(`https://corsproxy.io/?${encodeURIComponent(url)}`, { responseType: 'arraybuffer', timeout: 20000 }); return Buffer.from(r.data) }
  ]
  for (const t of tries) { try { const b = await t(); if (b?.length > 500) return b } catch {} }
  return null
}

// ══════════════════════════════════════════════════
// FEATURE 8 — FUN GAMES
// ══════════════════════════════════════════════════
function shipCalc(name1, name2) {
  const combined = (name1 + name2).toLowerCase()
  let score = 0
  for (const c of combined) score += c.charCodeAt(0)
  return ((score % 101) + Math.abs(name1.charCodeAt(0) - name2.charCodeAt(0)) % 20) % 101
}

const SHIP_LEVELS = [
  [0,   '💔 Terrible match — completely incompatible'],
  [20,  '😬 Very low — barely any sparks'],
  [35,  '🤔 Low — some compatibility but not much'],
  [50,  '😊 Average — could work with effort'],
  [65,  '😍 Good — there is definite chemistry!'],
  [75,  '🔥 Great — strong connection!'],
  [85,  '💑 Excellent — made for each other!'],
  [95,  '💜 SOULMATES — perfect match! 🎆'],
  [100, '💯 PERFECT 100 — Twin flames! ✨']
]

function getShipLevel(score) {
  let level = SHIP_LEVELS[0][1]
  for (const [threshold, msg] of SHIP_LEVELS) { if (score >= threshold) level = msg }
  return level
}

const SLOTS_ITEMS = ['🍎','🍊','🍋','🍇','🍓','💎','7️⃣','🎰','⭐','🔔','🍒','🃏']

function spinSlots() {
  const reels = [
    SLOTS_ITEMS[Math.floor(Math.random() * SLOTS_ITEMS.length)],
    SLOTS_ITEMS[Math.floor(Math.random() * SLOTS_ITEMS.length)],
    SLOTS_ITEMS[Math.floor(Math.random() * SLOTS_ITEMS.length)]
  ]
  const win = reels[0] === reels[1] && reels[1] === reels[2]
  const twoMatch = reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]
  let result = '❌ No match — Try again!'
  if (win) result = '🎰 JACKPOT! You won the big prize! 🎆💰'
  else if (twoMatch) result = '🎊 Near win! 2 matching — so close!'
  return { reels, result, win }
}

function spinAviator() {
  // Simulated multiplier — random crash point
  const crash = parseFloat((1 + Math.random() * 9).toFixed(2))
  const cashout = parseFloat((1 + Math.random() * (crash - 1)).toFixed(2))
  const profit = cashout > 2.0
  return {
    crash: `${crash}x`,
    cashout: `${cashout}x`,
    result: profit ? `✈️ Flew to *${cashout}x* before crash at *${crash}x* — Profit! 💰` : `💥 Crashed at *${crash}x* — Lost`
  }
}

function rollDice(sides = 6) {
  return Math.floor(Math.random() * sides) + 1
}

function flipCoin() {
  return Math.random() > 0.5 ? '🪙 Heads!' : '🪙 Tails!'
}

function roulette() {
  const num = Math.floor(Math.random() * 37) // 0-36
  const color = num === 0 ? '🟢 Green' : num % 2 === 0 ? '🔴 Red' : '⚫ Black'
  return { num, color }
}

// ══════════════════════════════════════════════════
// FEATURE 9 — LIVE MATCH SCORES
// ══════════════════════════════════════════════════
async function getLiveScores(query = '') {
  const tries = [
    async () => {
      const r = await axios.get('https://api.football-data.org/v4/matches', {
        params: { status: 'LIVE,IN_PLAY,PAUSED' },
        headers: { 'X-Auth-Token': process.env.FOOTBALL_KEY || 'test' }, timeout: TOUT
      })
      const matches = r.data?.matches?.slice(0, 6)
      if (!matches?.length) return null
      return matches.map(m => `⚽ ${m.homeTeam?.shortName} ${m.score?.fullTime?.home ?? '-'} vs ${m.score?.fullTime?.away ?? '-'} ${m.awayTeam?.shortName}\n   🕐 ${m.status} | ${m.competition?.name}`)
    },
    async () => {
      const r = await axios.get(`https://v3.football.api-sports.io/fixtures?live=all`, {
        headers: { 'x-rapidapi-host': 'v3.football.api-sports.io', 'x-rapidapi-key': process.env.APISPORTS_KEY || 'test' }, timeout: TOUT
      })
      const f = r.data?.response?.slice(0, 6); if (!f?.length) return null
      return f.map(m => `⚽ ${m.teams?.home?.name} ${m.goals?.home ?? 0} - ${m.goals?.away ?? 0} ${m.teams?.away?.name}\n   ⏱ ${m.fixture?.status?.elapsed}'`)
    },
    async () => {
      const r = await axios.get(`https://api.sofascore.com/api/v1/sport/football/events/live`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: TOUT
      })
      const events = r.data?.events?.slice(0, 6); if (!events?.length) return null
      return events.map(e => `⚽ ${e.homeTeam?.name} ${e.homeScore?.current ?? 0} - ${e.awayScore?.current ?? 0} ${e.awayTeam?.name}`)
    },
    async () => {
      const r = await axios.get('https://livescore-api.com/api-client/scores/live.json', {
        params: { key: process.env.LIVESCORE_KEY || 'test', secret: process.env.LIVESCORE_SECRET || 'test' }, timeout: TOUT
      })
      const d = r.data?.data?.match?.slice(0, 6); if (!d?.length) return null
      return d.map(m => `⚽ ${m.home_name} ${m.score} ${m.away_name}`)
    },
    async () => {
      const r = await axios.get(`https://www.thesportsdb.com/api/v1/json/3/liveevents.php`, { timeout: TOUT })
      const events = r.data?.events?.filter(e => !query || e.strEvent?.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
      if (!events?.length) return null
      return events.map(e => `🏟️ ${e.strEvent}\n   🕐 ${e.strTime || e.dateEvent}`)
    }
  ]
  for (const t of tries) { try { const r = await t(); if (r?.length) return r } catch {} }
  return null
}

// ══════════════════════════════════════════════════
// FEATURE 10 — SUREBETS / ARBITRAGE
// ══════════════════════════════════════════════════
async function getSurebets() {
  const tries = [
    async () => {
      const r = await axios.get('https://api.oddsapi.io/v4/sports/upcoming/odds', {
        params: { apiKey: process.env.ODDS_KEY || 'test', regions: 'eu', markets: 'h2h', oddsFormat: 'decimal' }, timeout: TOUT
      })
      const games = r.data?.slice(0, 3); if (!games?.length) return null
      const bets = []
      for (const g of games) {
        const odds1 = g.bookmakers?.[0]?.markets?.[0]?.outcomes?.[0]?.price
        const odds2 = g.bookmakers?.[1]?.markets?.[0]?.outcomes?.[1]?.price
        if (!odds1 || !odds2) continue
        const margin = (1 / odds1 + 1 / odds2) * 100
        if (margin < 100) bets.push(`✅ *${g.home_team} vs ${g.away_team}*\n   Odds: ${odds1} / ${odds2}\n   Margin: ${margin.toFixed(2)}% (SUREBBET!)`)
      }
      return bets.length ? bets : null
    },
    async () => {
      // Manual arbitrage example using public odds
      const r = await axios.get('https://the-odds-api.com/v4/sports/soccer_epl/odds', {
        params: { apiKey: process.env.ODDS_KEY || 'test', regions: 'eu', markets: 'h2h' }, timeout: TOUT
      })
      const bets = r.data?.filter(g => {
        const books = g.bookmakers?.slice(0, 2)
        if (books?.length < 2) return false
        const o1 = books[0]?.markets?.[0]?.outcomes?.[0]?.price
        const o2 = books[1]?.markets?.[0]?.outcomes?.[1]?.price
        if (!o1 || !o2) return false
        return (1 / o1 + 1 / o2) < 1
      }).slice(0, 3).map(g => `✅ *${g.home_team} vs ${g.away_team}*`)
      return bets?.length ? bets : null
    }
  ]
  for (const t of tries) { try { const r = await t(); if (r?.length) return r } catch {} }
  return [
    '📊 *Surebet Example (Live APIs require key)*',
    '✅ Team A 2.15 vs Team B 2.05',
    '   Margin: 97.9% → Profit: 2.1%',
    '💡 Set ODDS_KEY in env for live surebets'
  ]
}

// ══════════════════════════════════════════════════
// FEATURE 11 — AI SONG CREATOR
// ══════════════════════════════════════════════════
async function createSong(prompt, style = 'pop') {
  const tries = [
    // 1. Suno AI (unofficial)
    async () => {
      const r = await axios.post('https://studio-api.suno.ai/api/generate/v2/', {
        prompt: `${style} song about ${prompt}`, mv: 'chirp-v3-5', title: prompt, tags: style
      }, { headers: { Authorization: `Bearer ${process.env.SUNO_KEY || 'test'}` }, timeout: 60000 })
      const id = r.data?.clips?.[0]?.id; if (!id) return null
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 5000))
        const p = await axios.get(`https://studio-api.suno.ai/api/feed/?ids=${id}`, {
          headers: { Authorization: `Bearer ${process.env.SUNO_KEY || 'test'}` }
        }); const clip = p.data?.[0]
        if (clip?.status === 'complete' && clip?.audio_url) {
          const { buf } = await dl(clip.audio_url); return { buf, title: clip.title || prompt }
        }
      }
      return null
    },
    // 2. Udio AI (unofficial)
    async () => {
      const r = await axios.post('https://www.udio.com/api/generate-proxy', {
        prompt: `${style} song: ${prompt}`, samplerOptions: { seed: Math.floor(Math.random() * 99999) }
      }, { headers: { Authorization: `Bearer ${process.env.UDIO_KEY || 'test'}` }, timeout: 60000 })
      const id = r.data?.track_ids?.[0]; if (!id) return null
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 4000))
        const p = await axios.get(`https://www.udio.com/api/songs?songIds=${id}`)
        const s = p.data?.songs?.[0]
        if (s?.song_path) { const { buf } = await dl(`https://www.udio.com${s.song_path}`); return { buf, title: s.title || prompt } }
      }
      return null
    },
    // 3. Replicate MusicGen
    async () => {
      const r = await axios.post('https://api.replicate.com/v1/models/meta/musicgen/predictions', {
        input: { prompt: `${style} music: ${prompt}`, duration: 15, model_version: 'stereo-large' }
      }, { headers: { Authorization: `Bearer ${process.env.REPLICATE_KEY || 'test'}` }, timeout: 30000 })
      const pollUrl = r.data?.urls?.get; if (!pollUrl) return null
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 4000))
        const p = await axios.get(pollUrl, { headers: { Authorization: `Bearer ${process.env.REPLICATE_KEY || 'test'}` } })
        if (p.data?.status === 'succeeded') {
          const url = p.data.output; if (!url) return null
          const { buf } = await dl(typeof url === 'string' ? url : url[0]); return { buf, title: prompt }
        }
        if (p.data?.status === 'failed') return null
      }
      return null
    },
    // 4. HuggingFace MusicGen
    async () => {
      const r = await axios.post('https://api-inference.huggingface.co/models/facebook/musicgen-small',
        { inputs: `${style} ${prompt}` },
        { headers: { Authorization: `Bearer ${process.env.HF_TOKEN || 'test'}` }, responseType: 'arraybuffer', timeout: 60000 }
      ); return { buf: Buffer.from(r.data), title: prompt }
    },
    // 5. Generate lyrics via Genius then TTS them as song
    async () => {
      const lyrics = `[Verse 1]\n${prompt} fills the air tonight\nEvery beat feels so right\nIn this ${style} melody\nSet my heart completely free\n\n[Chorus]\n${prompt}, yeah ${prompt}\nPlaying through the night\n${prompt}, yeah ${prompt}\nEverything feels right`
      // TTS the lyrics as audio
      const ttsR = await axios.post('https://tiktok-tts.weilnet.workers.dev/api/generation', {
        text: lyrics.slice(0, 300), voice: 'en_us_002'
      }, { timeout: 20000 }); const b64 = ttsR.data?.data; if (!b64) return null
      return { buf: Buffer.from(b64, 'base64'), title: prompt, lyrics }
    }
  ]
  for (const t of tries) { try { const r = await t(); if (r?.buf?.length > 200) return r } catch {} }
  return null
}

// ══════════════════════════════════════════════════
// FEATURE 12 — DATE / TIME / COUNTDOWN
// ══════════════════════════════════════════════════
function getDaysLeft(targetDate) {
  const now = new Date()
  const target = new Date(targetDate)
  if (isNaN(target.getTime())) return null
  const diff = target - now
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  return { days, hours, mins, passed: diff < 0 }
}

function getCurrentDateTime(timezone = 'Africa/Nairobi') {
  const now = new Date()
  const opts = { timeZone: timezone, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }
  try { return new Intl.DateTimeFormat('en-US', opts).format(now) } catch { return now.toLocaleString() }
}

// ══════════════════════════════════════════════════
// EXTRA FEATURES 13-47
// ══════════════════════════════════════════════════

// Joke
async function getJoke(type = 'any') {
  const tries = [
    async () => { const r = await axios.get(`https://v2.jokeapi.dev/joke/${type}?safe-mode`, { timeout: TOUT }); return r.data?.joke || (r.data?.setup + '\n' + r.data?.delivery) },
    async () => { const r = await axios.get('https://official-joke-api.appspot.com/random_joke', { timeout: TOUT }); return `${r.data?.setup}\n${r.data?.punchline}` },
    async () => { const r = await axios.get('https://icanhazdadjoke.com/', { headers: { Accept: 'application/json' }, timeout: TOUT }); return r.data?.joke }
  ]
  for (const t of tries) { try { const r = await t(); if (r) return r } catch {} }
  return null
}

// Quote
async function getQuote(category = '') {
  const tries = [
    async () => { const r = await axios.get(`https://api.quotable.io/random${category ? '?tags=' + category : ''}`, { timeout: TOUT }); return r.data?.content ? `"${r.data.content}" — ${r.data.author}` : null },
    async () => { const r = await axios.get('https://zenquotes.io/api/random', { timeout: TOUT }); return `"${r.data?.[0]?.q}" — ${r.data?.[0]?.a}` },
    async () => { const r = await axios.get('https://api.forismatic.com/api/1.0/?method=getQuote&lang=en&format=json', { timeout: TOUT }); return `"${r.data?.quoteText}" — ${r.data?.quoteAuthor}` }
  ]
  for (const t of tries) { try { const r = await t(); if (r) return r } catch {} }
  return null
}

// Fact
async function getFact(type = 'random') {
  const tries = [
    async () => { const r = await axios.get('https://uselessfacts.jsph.pl/api/v2/facts/random', { timeout: TOUT }); return r.data?.text },
    async () => { const r = await axios.get('https://api.api-ninjas.com/v1/facts?limit=1', { headers: { 'X-Api-Key': process.env.APININJAS_KEY || 'test' }, timeout: TOUT }); return r.data?.[0]?.fact },
    async () => { const r = await axios.get('https://randomfunfacts.com', { timeout: TOUT }); const m = r.data?.match(/<strong>(.*?)<\/strong>/); return m?.[1] }
  ]
  for (const t of tries) { try { const r = await t(); if (r) return r } catch {} }
  return null
}

// Currency
async function getCurrency(amount, from, to) {
  const tries = [
    async () => { const r = await axios.get(`https://api.exchangerate-api.com/v4/latest/${from.toUpperCase()}`, { timeout: TOUT }); const rate = r.data?.rates?.[to.toUpperCase()]; if (!rate) return null; return `${amount} ${from.toUpperCase()} = ${(amount * rate).toFixed(4)} ${to.toUpperCase()}` },
    async () => { const r = await axios.get(`https://api.frankfurter.app/latest?amount=${amount}&from=${from}&to=${to}`, { timeout: TOUT }); const res = r.data?.rates?.[to.toUpperCase()]; if (!res) return null; return `${amount} ${from.toUpperCase()} = ${res} ${to.toUpperCase()}` },
    async () => { const r = await axios.get(`https://open.er-api.com/v6/latest/${from.toUpperCase()}`, { timeout: TOUT }); const rate = r.data?.rates?.[to.toUpperCase()]; if (!rate) return null; return `${amount} ${from.toUpperCase()} = ${(amount * rate).toFixed(4)} ${to.toUpperCase()}` }
  ]
  for (const t of tries) { try { const r = await t(); if (r) return r } catch {} }
  return null
}

// Crypto
async function getCrypto(symbol) {
  const tries = [
    async () => { const r = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${symbol}&vs_currencies=usd,kes`, { timeout: TOUT }); const d = r.data?.[symbol.toLowerCase()]; if (!d) return null; return `${symbol.toUpperCase()}: $${d.usd} | KES ${d.kes || 'N/A'}` },
    async () => { const r = await axios.get(`https://min-api.cryptocompare.com/data/price?fsym=${symbol.toUpperCase()}&tsyms=USD,KES`, { timeout: TOUT }); if (!r.data?.USD) return null; return `${symbol.toUpperCase()}: $${r.data.USD} | KES ${r.data.KES || 'N/A'}` },
    async () => { const r = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol.toUpperCase()}USDT`, { timeout: TOUT }); if (!r.data?.price) return null; return `${symbol.toUpperCase()}: $${parseFloat(r.data.price).toFixed(4)}` }
  ]
  for (const t of tries) { try { const r = await t(); if (r) return r } catch {} }
  return null
}

// Horoscope
async function getHoroscope(sign) {
  const signs = ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces']
  const s = sign.toLowerCase(); if (!signs.includes(s)) return null
  const tries = [
    async () => { const r = await axios.post(`https://aztro.sameerkumar.website/?sign=${s}&day=today`, null, { timeout: TOUT }); return `♈ *${s.toUpperCase()} Today*\n${r.data?.description}\n🌈 Color: ${r.data?.color} | 🔢 Lucky: ${r.data?.lucky_number}` },
    async () => { const r = await axios.get(`https://horoscope-app-api.vercel.app/api/v1/get-horoscope/daily?sign=${s}&day=TODAY`, { timeout: TOUT }); return r.data?.data?.horoscope_data ? `♈ *${s.toUpperCase()}*\n${r.data.data.horoscope_data}` : null }
  ]
  for (const t of tries) { try { const r = await t(); if (r) return r } catch {} }
  return null
}

// Wikipedia
async function getWiki(query) {
  const tries = [
    async () => { const r = await axios.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`, { timeout: TOUT }); return r.data?.extract ? { title: r.data.title, text: r.data.extract?.slice(0, 500), img: r.data.thumbnail?.source } : null },
    async () => { const r = await axios.get(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=1`, { timeout: TOUT }); const page = r.data?.query?.search?.[0]; if (!page) return null; return { title: page.title, text: page.snippet?.replace(/<[^>]+>/g, '') } }
  ]
  for (const t of tries) { try { const r = await t(); if (r) return r } catch {} }
  return null
}

// Recipe
async function getRecipe(query) {
  const tries = [
    async () => { const r = await axios.get(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`, { timeout: TOUT }); const m = r.data?.meals?.[0]; if (!m) return null; return { name: m.strMeal, cat: m.strCategory, area: m.strArea, instructions: m.strInstructions?.slice(0, 300), img: m.strMealThumb } },
    async () => { const r = await axios.get(`https://api.spoonacular.com/recipes/complexSearch?query=${encodeURIComponent(query)}&number=1&addRecipeInformation=true&apiKey=${process.env.SPOONACULAR_KEY || 'test'}`, { timeout: TOUT }); const m = r.data?.results?.[0]; if (!m) return null; return { name: m.title, instructions: m.summary?.replace(/<[^>]+>/g, '').slice(0, 300), img: m.image } }
  ]
  for (const t of tries) { try { const r = await t(); if (r) return r } catch {} }
  return null
}

// Country info
async function getCountryInfo(query) {
  const tries = [
    async () => { const r = await axios.get(`https://restcountries.com/v3.1/name/${encodeURIComponent(query)}`, { timeout: TOUT }); const c = r.data?.[0]; if (!c) return null; return { name: c.name?.common, capital: c.capital?.[0], region: c.region, population: c.population?.toLocaleString(), currency: Object.values(c.currencies || {})[0]?.name, flag: c.flags?.png } },
    async () => { const r = await axios.get(`https://api.api-ninjas.com/v1/country?name=${encodeURIComponent(query)}`, { headers: { 'X-Api-Key': process.env.APININJAS_KEY || 'test' }, timeout: TOUT }); const c = r.data?.[0]; if (!c) return null; return { name: c.name, capital: c.capital, region: c.subregion, population: c.population?.toLocaleString() } }
  ]
  for (const t of tries) { try { const r = await t(); if (r) return r } catch {} }
  return null
}

// Word definition
async function getWordDef(word) {
  const tries = [
    async () => { const r = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, { timeout: TOUT }); const e = r.data?.[0]; if (!e) return null; const def = e.meanings?.[0]?.definitions?.[0]; return { word: e.word, pos: e.meanings?.[0]?.partOfSpeech, def: def?.definition, example: def?.example } },
    async () => { const r = await axios.get(`https://api.api-ninjas.com/v1/dictionary?word=${encodeURIComponent(word)}`, { headers: { 'X-Api-Key': process.env.APININJAS_KEY || 'test' }, timeout: TOUT }); if (!r.data?.definition) return null; return { word, def: r.data.definition } }
  ]
  for (const t of tries) { try { const r = await t(); if (r) return r } catch {} }
  return null
}

// Anime info
async function getAnime(query) {
  const tries = [
    async () => { const r = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=1`, { timeout: TOUT }); const a = r.data?.data?.[0]; if (!a) return null; return { title: a.title, score: a.score, episodes: a.episodes, status: a.status, synopsis: a.synopsis?.slice(0, 250), img: a.images?.jpg?.image_url } },
    async () => { const r = await axios.get(`https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(query)}&page[limit]=1`, { timeout: TOUT }); const a = r.data?.data?.[0]?.attributes; if (!a) return null; return { title: a.canonicalTitle, score: a.averageRating, episodes: a.episodeCount, status: a.status, synopsis: a.synopsis?.slice(0, 250) } }
  ]
  for (const t of tries) { try { const r = await t(); if (r) return r } catch {} }
  return null
}

// Number fact
async function getNumberFact(n) {
  const tries = [
    async () => { const r = await axios.get(`http://numbersapi.com/${n}`, { timeout: TOUT }); return r.data },
    async () => { const r = await axios.get(`http://numbersapi.com/${n}/math`, { timeout: TOUT }); return r.data }
  ]
  for (const t of tries) { try { const r = await t(); if (r) return r } catch {} }
  return null
}

// Password generator
function genPassword(len = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-='
  let pwd = ''
  for (let i = 0; i < len; i++) pwd += chars[Math.floor(Math.random() * chars.length)]
  return pwd
}

// Base64
function b64enc(text) { return Buffer.from(text).toString('base64') }
function b64dec(text) { try { return Buffer.from(text, 'base64').toString('utf8') } catch { return null } }

// Hash
const crypto = await import('crypto').catch(() => null)
function hashText(text, algo = 'sha256') {
  try { return crypto?.createHash(algo).update(text).digest('hex') } catch { return null }
}

// Physics/Science/Biology Q&A
async function scienceQA(question) {
  const tries = [
    async () => {
      const r = await axios.post('https://api.anthropic.com/v1/messages', {
        model: 'claude-haiku-20240307', max_tokens: 300,
        messages: [{ role: 'user', content: `Answer this science question briefly (physics/biology/chemistry): ${question}` }]
      }, { headers: { 'x-api-key': process.env.ANTHROPIC_KEY || '', 'anthropic-version': '2023-06-01' }, timeout: 15000 })
      return r.data?.content?.[0]?.text
    },
    async () => {
      const r = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-3.5-turbo', max_tokens: 200,
        messages: [{ role: 'user', content: `Brief science answer: ${question}` }]
      }, { headers: { Authorization: `Bearer ${process.env.OPENAI_KEY || ''}` }, timeout: 15000 })
      return r.data?.choices?.[0]?.message?.content
    },
    async () => {
      const r = await axios.get(`https://api.wolframalpha.com/v1/result?appid=${process.env.WOLFRAM_KEY || 'test'}&i=${encodeURIComponent(question)}`, { timeout: TOUT })
      return r.data
    }
  ]
  for (const t of tries) { try { const r = await t(); if (r) return r } catch {} }
  return null
}

// Motivational poem
async function getPoem(topic = '') {
  const tries = [
    async () => { const r = await axios.get(`https://poetrydb.org/random/1`, { timeout: TOUT }); const p = r.data?.[0]; if (!p) return null; return { title: p.title, author: p.author, lines: p.lines?.slice(0, 8).join('\n') } },
    async () => { const r = await axios.get(`https://www.poemist.com/api/v1/randompoems`, { timeout: TOUT }); const p = r.data?.[0]; if (!p) return null; return { title: p.title, author: p.poet?.name, lines: p.content?.slice(0, 300) } }
  ]
  for (const t of tries) { try { const r = await t(); if (r) return r } catch {} }
  return null
}

// Trivia
async function getTrivia(category = '') {
  const tries = [
    async () => { const r = await axios.get(`https://opentdb.com/api.php?amount=1&type=multiple${category ? '&category=' + category : ''}`, { timeout: TOUT }); const q = r.data?.results?.[0]; if (!q) return null; return { q: q.question.replace(/&quot;/g, '"').replace(/&#039;/g, "'"), correct: q.correct_answer, options: [...q.incorrect_answers, q.correct_answer].sort(() => Math.random() - 0.5), cat: q.category } },
    async () => { const r = await axios.get('https://the-trivia-api.com/v2/questions?limit=1', { timeout: TOUT }); const q = r.data?.[0]; if (!q) return null; return { q: q.question?.text, correct: q.correctAnswer, options: [...q.incorrectAnswers, q.correctAnswer].sort(() => Math.random() - 0.5), cat: q.category } }
  ]
  for (const t of tries) { try { const r = await t(); if (r) return r } catch {} }
  return null
}

// Truth or Dare
const TRUTHS = [
  'What is the most embarrassing thing you have ever done in public?',
  'What is the biggest lie you have ever told?',
  'Have you ever cheated on a test or game?',
  'What is your most embarrassing childhood memory?',
  'Have you ever blamed someone else for something you did?',
  'What is the weirdest dream you have ever had?',
  'Who was your first crush?',
  'What is something you have never told anyone?',
  'What is the most childish thing you still do?',
  'Have you ever ghosted someone?'
]
const DARES = [
  'Send a voice note singing your favorite song',
  'Change your profile picture to a funny face for 1 hour',
  'Send a message to your crush right now',
  'Do 20 push-ups and send proof',
  'Speak in an accent for the next 5 messages',
  'Post a funny selfie in the group',
  'Eat a spoonful of any condiment raw',
  'Tell a joke in the group right now',
  'Compliment every person in the chat',
  'Write a poem about the person above you'
]
const WOULD_YOU = [
  'Would you rather be invisible or be able to fly?',
  'Would you rather always speak in rhyme or always sing everything?',
  'Would you rather give up social media or TV for a year?',
  'Would you rather know how you die or when you die?',
  'Would you rather be famous but poor or rich but unknown?',
  'Would you rather fight 100 duck-sized horses or 1 horse-sized duck?',
  'Would you rather be able to talk to animals or speak all human languages?',
  'Would you rather always be 10 minutes late or always 20 minutes early?'
]

// 8 Ball
const EIGHTBALL = [
  '🎱 It is certain','🎱 Without a doubt','🎱 Yes definitely','🎱 You may rely on it',
  '🎱 Most likely','🎱 Outlook good','🎱 Signs point to yes',
  '🎱 Reply hazy try again','🎱 Ask again later','🎱 Cannot predict now',
  '🎱 Concentrate and ask again',
  '🎱 Don\'t count on it','🎱 My reply is no','🎱 Very doubtful','🎱 Outlook not so good'
]

// Rate
function rateSomething(thing) {
  const hash = [...thing.toLowerCase()].reduce((a, c) => a + c.charCodeAt(0), 0)
  const score = ((hash * 7 + 13) % 101)
  const bars = '█'.repeat(Math.floor(score / 10)) + '░'.repeat(10 - Math.floor(score / 10))
  return { score, bars }
}

// Motivate
const MOTIVATIONS = [
  '🔥 Every expert was once a beginner. Keep going!',
  '💪 The harder you work, the luckier you get.',
  '⭐ Believe you can and you\'re halfway there.',
  '🚀 Don\'t watch the clock; do what it does. Keep going.',
  '💜 Your only limit is your mind.',
  '🌟 Success is not final, failure is not fatal.',
  '⚡ Push yourself because no one else will do it for you.',
  '🏆 Dream big. Work hard. Stay focused.',
  '🌈 The best way to predict the future is to create it.',
  '💎 You are stronger than you think.'
]

// IMDB
async function getIMDB(query) {
  const tries = [
    async () => { const r = await axios.get(`https://www.omdbapi.com/?t=${encodeURIComponent(query)}&apikey=${process.env.OMDB_KEY || 'trilogy'}`, { timeout: TOUT }); if (r.data?.Response !== 'True') return null; return { title: r.data.Title, year: r.data.Year, rating: r.data.imdbRating, genre: r.data.Genre, plot: r.data.Plot?.slice(0, 200), poster: r.data.Poster } },
    async () => { const r = await axios.get(`http://www.omdbapi.com/?s=${encodeURIComponent(query)}&apikey=${process.env.OMDB_KEY || 'trilogy'}`, { timeout: TOUT }); const m = r.data?.Search?.[0]; if (!m) return null; return { title: m.Title, year: m.Year, poster: m.Poster } }
  ]
  for (const t of tries) { try { const r = await t(); if (r) return r } catch {} }
  return null
}

// IP info
async function getIPInfo(ip = '') {
  const tries = [
    async () => { const r = await axios.get(`https://ipapi.co/${ip}/json/`, { timeout: TOUT }); if (!r.data?.ip) return null; return r.data },
    async () => { const r = await axios.get(`https://ip-api.com/json/${ip}`, { timeout: TOUT }); if (r.data?.status !== 'success') return null; return r.data }
  ]
  for (const t of tries) { try { const r = await t(); if (r) return r } catch {} }
  return null
}

// Cocktail
async function getCocktail(query) {
  const tries = [
    async () => { const r = await axios.get(`https://www.thecocktaildb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`, { timeout: TOUT }); const d = r.data?.drinks?.[0]; if (!d) return null; return { name: d.strDrink, category: d.strCategory, instructions: d.strInstructions?.slice(0, 200), img: d.strDrinkThumb } }
  ]
  for (const t of tries) { try { const r = await t(); if (r) return r } catch {} }
  return null
}

// Cat fact
async function getCatFact() {
  const tries = [
    async () => { const r = await axios.get('https://catfact.ninja/fact', { timeout: TOUT }); return r.data?.fact },
    async () => { const r = await axios.get('https://api.api-ninjas.com/v1/facts?limit=1&category=animals', { headers: { 'X-Api-Key': process.env.APININJAS_KEY || 'test' }, timeout: TOUT }); return r.data?.[0]?.fact }
  ]
  for (const t of tries) { try { const r = await t(); if (r) return r } catch {} }
  return 'Cats sleep for 12-16 hours per day!'
}

// Dog fact
async function getDogFact() {
  const tries = [
    async () => { const r = await axios.get('https://dog-api.kinduff.com/api/facts', { timeout: TOUT }); return r.data?.facts?.[0] },
    async () => { const r = await axios.get('https://dogapi.dog/api/v2/facts?limit=1', { timeout: TOUT }); return r.data?.data?.[0]?.attributes?.body }
  ]
  for (const t of tries) { try { const r = await t(); if (r) return r } catch {} }
  return 'Dogs can smell about 100,000 times better than humans!'
}

// Space fact
async function getSpaceFact() {
  const facts = [
    '🚀 A year on Venus is shorter than a day on Venus!',
    '🌙 The Moon is moving away from Earth at ~3.8 cm per year.',
    '⭐ There are more stars in the universe than grains of sand on Earth.',
    '🌍 Earth is the only planet not named after a god or goddess.',
    '🪐 Saturn would float on water — its density is less than water.',
    '☀️ Light from the Sun takes 8 minutes to reach Earth.',
    '🌌 The Milky Way galaxy is about 100,000 light-years across.',
    '🔭 Neutron stars spin up to 700 times per second.',
    '💫 A teaspoon of neutron star material weighs 10 million tons.',
    '🌠 The largest known star, UY Scuti, is 1,700 times bigger than our Sun.'
  ]
  return facts[Math.floor(Math.random() * facts.length)]
}

// Manga
async function getManga(query) {
  const tries = [
    async () => { const r = await axios.get(`https://api.jikan.moe/v4/manga?q=${encodeURIComponent(query)}&limit=1`, { timeout: TOUT }); const m = r.data?.data?.[0]; if (!m) return null; return { title: m.title, score: m.score, volumes: m.volumes, status: m.status, synopsis: m.synopsis?.slice(0, 250), img: m.images?.jpg?.image_url } }
  ]
  for (const t of tries) { try { const r = await t(); if (r) return r } catch {} }
  return null
}

// Random name generator
function randName() {
  const first = ['Alex','Jordan','Sam','Riley','Morgan','Casey','Quinn','Taylor','Avery','Drew','Blake','Cameron','Jamie','Skyler','Sage']
  const last = ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Wilson','Martinez','Anderson','Thomas','Jackson','White','Harris']
  return `${first[Math.floor(Math.random() * first.length)]} ${last[Math.floor(Math.random() * last.length)]}`
}

// UUID
function genUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

// Hex to RGB
function hexToRgb(hex) {
  const r = parseInt(hex.replace('#', '').slice(0, 2), 16)
  const g = parseInt(hex.replace('#', '').slice(2, 4), 16)
  const b = parseInt(hex.replace('#', '').slice(4, 6), 16)
  if (isNaN(r)) return null
  return `RGB(${r}, ${g}, ${b})`
}

// ══════════════════════════════════════════════════
// MAIN EXPORT
// ══════════════════════════════════════════════════
export default async function ultimate(sock, ctx, botSettings) {
  const { msg, from, sender } = ctx

  const prefix = botSettings?.prefix ?? botSettings?.bot_prefix ?? botSettings?.settings?.prefix ?? '.'
  const brand = botSettings?.brand_name ?? botSettings?.botname ?? process.env.BUILD_BRAND ?? 'Bot'

  const body =
    msg?.message?.conversation ||
    msg?.message?.extendedTextMessage?.text ||
    msg?.message?.imageMessage?.caption ||
    msg?.message?.videoMessage?.caption ||
    msg?.message?.buttonsResponseMessage?.selectedButtonId ||
    msg?.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
    msg?.message?.templateButtonReplyMessage?.selectedId || ''

  if (!body?.startsWith(prefix)) return

  const parts = body.slice(prefix.length).trim().split(/\s+/)
  const cmd = parts[0]?.toLowerCase()
  const args = parts.slice(1)
  const argText = args.join(' ').trim()

  if (!cmd) return

  const HANDLED = new Set(ultimate.alias || alias)
  if (!HANDLED.has(cmd)) return

  const reply = (lines) => sendTxt(sock, from, msg, box(cmd, Array.isArray(lines) ? lines : [lines], brand))
  const err = (msg2) => reply([`❌ ${msg2}`])

  // ══ MOOD REACTIONS ══
  if (['mood','react','vibe','reaction'].includes(cmd)) {
    const moodName = argText.toLowerCase()
    if (!moodName) {
      const list = Object.keys(MOODS).join(', ')
      return reply([`⚠ Usage: ${prefix}mood <mood>`, ``, `🎭 Available moods:`, list])
    }
    if (!MOODS[moodName]) {
      const close = Object.keys(MOODS).filter(m => m.startsWith(moodName[0]))
      return reply([`❌ Unknown mood: *${moodName}*`, close.length ? `💡 Did you mean: ${close.slice(0, 5).join(', ')}` : ''])
    }
    const emoji = await sendMoodReaction(sock, from, msg, moodName, brand)
    return reply([`${emoji} Mood set to *${moodName}*`])
  }

  // ══ WALLPAPER ══
  if (['wallpaper','wall','wp','bg'].includes(cmd)) {
    if (!argText) return reply([`⚠ Usage: ${prefix}wallpaper <query>`])
    await rct(sock, msg, '🖼️')
    const buf = await getWallpaper(argText)
    if (!buf) return err('Wallpaper not found')
    return sendImg(sock, from, msg, buf, box('WALLPAPER', [`🖼️ *${argText}*`, `📱 Mobile size (1080×1920)`], brand))
  }

  // ══ CHANNEL ══
  if (['channel','createchannel','chanmsg'].includes(cmd)) {
    const [channelJid, ...rest] = args
    const text = rest.join(' ').trim()
    if (!channelJid || !text) return reply([`⚠ Usage: ${prefix}channel <channelJID> <message>`, `💡 e.g. ${prefix}channel 12345@newsletter Hello!`])
    await rct(sock, msg, '📢')
    const ok = await sendChannelMessage(sock, channelJid, text, null)
    if (!ok) return err('Failed to send to channel')
    return reply([`✅ Sent to channel: ${channelJid}`])
  }

  // ══ NEWS ══
  if (['news','headlines','breaking'].includes(cmd)) {
    await rct(sock, msg, '📰')
    const items = await getNews(argText)
    if (!items?.length) return err('Could not fetch news')
    return reply([`📰 *Latest News${argText ? ': ' + argText : ''}*`, '', ...items.slice(0, 5)])
  }

  // ══ WEATHER ══
  if (['weather','forecast','temp'].includes(cmd)) {
    const city = argText || 'Nairobi'
    await rct(sock, msg, '🌤️')
    const w = await getWeather(city)
    if (!w) return err('Weather not found for: ' + city)
    return reply([
      `🌍 *${w.city}${w.country ? ', ' + w.country : ''}*`,
      `🌡️ Temp: ${w.temp}${w.feels ? ' (feels ' + w.feels + ')' : ''}`,
      w.desc ? `☁️ ${w.desc}` : null,
      w.humidity ? `💧 Humidity: ${w.humidity}` : null,
      w.wind ? `💨 Wind: ${w.wind}` : null
    ].filter(Boolean))
  }

  // ══ CALCULATOR + GRAPH ══
  if (['calc','calculate','math'].includes(cmd)) {
    if (!argText) return reply([`⚠ Usage: ${prefix}calc <expression>`, `💡 e.g. ${prefix}calc 2+2*10`])
    await rct(sock, msg, '🧮')
    const result = safeCalc(argText)
    if (result === null) return err('Invalid expression')
    return reply([`🧮 *${argText}*`, `= *${result}*`])
  }

  if (cmd === 'graph') {
    if (!argText) return reply([`⚠ Usage: ${prefix}graph <math expression>`, `💡 e.g. ${prefix}graph x^2+2*x+1`])
    await rct(sock, msg, '📊')
    const buf = await makeGraph(argText, brand)
    if (!buf) return err('Graph generation failed')
    return sendImg(sock, from, msg, buf, box('GRAPH', [`📊 y = ${argText}`], brand))
  }

  // ══ IMAGE DOWNLOAD ══
  if (['imgdl','dlimg','saveimg','picget'].includes(cmd)) {
    const url = argText || getQuotedText(msg)
    if (!url) return reply([`⚠ Usage: ${prefix}imgdl <URL>`])
    await rct(sock, msg, '📥')
    const buf = await downloadImage(url)
    if (!buf) return err('Could not download image from that URL')
    return sendImg(sock, from, msg, buf, box('IMAGE DL', [`✅ Downloaded from URL`], brand))
  }

  // ══ SHIP ══
  if (cmd === 'ship') {
    const [n1, ...rest] = args
    const n2 = rest.join(' ').trim()
    if (!n1 || !n2) return reply([`⚠ Usage: ${prefix}ship <name1> <name2>`])
    await rct(sock, msg, '💕')
    const score = shipCalc(n1, n2)
    const level = getShipLevel(score)
    const bar = '❤️'.repeat(Math.floor(score / 10)) + '🖤'.repeat(10 - Math.floor(score / 10))
    return reply([`💕 *${n1}* + *${n2}*`, ``, `${bar}`, `💯 *${score}%* — ${level}`])
  }

  // ══ SLOTS ══
  if (cmd === 'slots') {
    await rct(sock, msg, '🎰')
    const { reels, result } = spinSlots()
    return reply([`🎰 *SLOTS*`, ``, `| ${reels.join(' | ')} |`, ``, result])
  }

  // ══ AVIATOR ══
  if (cmd === 'aviator') {
    await rct(sock, msg, '✈️')
    const { crash, cashout, result } = spinAviator()
    return reply([`✈️ *AVIATOR SIMULATOR*`, ``, `Crash point: *${crash}*`, `Auto cashout: *${cashout}*`, ``, result])
  }

  // ══ DICE ══
  if (cmd === 'dice') {
    await rct(sock, msg, '🎲')
    const sides = parseInt(argText) || 6
    const roll = rollDice(sides)
    return reply([`🎲 Rolled a *D${sides}*: *${roll}*`])
  }

  // ══ FLIP ══
  if (cmd === 'flip') {
    await rct(sock, msg, '🪙')
    return reply([flipCoin()])
  }

  // ══ ROULETTE ══
  if (cmd === 'roulette') {
    await rct(sock, msg, '🎡')
    const { num, color } = roulette()
    return reply([`🎡 *ROULETTE*`, ``, `Ball landed on: *${num}*`, `Color: *${color}*`])
  }

  // ══ TRIVIA ══
  if (cmd === 'trivia') {
    await rct(sock, msg, '🧠')
    const q = await getTrivia()
    if (!q) return err('Could not fetch trivia')
    const opts = q.options.map((o, i) => `${['A','B','C','D'][i]}. ${o}`)
    return reply([`🧠 *TRIVIA*`, `📂 ${q.cat}`, ``, q.q, ``, ...opts, ``, `✅ Answer: *${q.correct}*`])
  }

  // ══ TRUTH ══
  if (cmd === 'truth') {
    await rct(sock, msg, '💬')
    return reply([`💬 *TRUTH*`, ``, TRUTHS[Math.floor(Math.random() * TRUTHS.length)]])
  }

  // ══ DARE ══
  if (cmd === 'dare') {
    await rct(sock, msg, '🔥')
    return reply([`🔥 *DARE*`, ``, DARES[Math.floor(Math.random() * DARES.length)]])
  }

  // ══ WOULD YOU RATHER ══
  if (cmd === 'wouldyou') {
    await rct(sock, msg, '🤔')
    return reply([`🤔 *WOULD YOU RATHER?*`, ``, WOULD_YOU[Math.floor(Math.random() * WOULD_YOU.length)]])
  }

  // ══ NEVER HAVE I EVER ══
  if (cmd === 'neverhave') {
    const nhi = [
      'Never have I ever lied to a friend.',
      'Never have I ever stayed awake for 24+ hours.',
      'Never have I ever eaten something off the floor.',
      'Never have I ever pretended to be sick to skip school/work.',
      'Never have I ever sent a text to the wrong person.',
      'Never have I ever laughed at the wrong moment.',
      'Never have I ever broken a bone.',
      'Never have I ever cried at a movie.'
    ]
    await rct(sock, msg, '🤫')
    return reply([`🤫 *NEVER HAVE I EVER*`, ``, nhi[Math.floor(Math.random() * nhi.length)]])
  }

  // ══ 8BALL ══
  if (cmd === '8ball') {
    if (!argText) return reply([`⚠ Ask a question: ${prefix}8ball <question>`])
    await rct(sock, msg, '🎱')
    return reply([`🎱 *Magic 8-Ball*`, ``, `Q: ${argText}`, ``, EIGHTBALL[Math.floor(Math.random() * EIGHTBALL.length)]])
  }

  // ══ RATE ══
  if (cmd === 'rate') {
    if (!argText) return reply([`⚠ Usage: ${prefix}rate <something>`])
    await rct(sock, msg, '⭐')
    const { score, bars } = rateSomething(argText)
    return reply([`⭐ *Rating: ${argText}*`, ``, `${bars} ${score}%`])
  }

  // ══ LIVE SCORES ══
  if (['match','livescore','scores','fixtures','standings'].includes(cmd)) {
    await rct(sock, msg, '⚽')
    const scores = await getLiveScores(argText)
    if (!scores?.length) return reply([`⚽ No live matches found${argText ? ' for: ' + argText : ''}`, `💡 Check during active match times`])
    return reply([`⚽ *LIVE SCORES*`, '', ...scores])
  }

  // ══ SUREBETS ══
  if (['surebets','surebet','arbitrage'].includes(cmd)) {
    await rct(sock, msg, '📊')
    const bets = await getSurebets()
    return reply([`📊 *SUREBET FINDER*`, '', ...(bets || ['No surebets found currently'])])
  }

  // ══ AI SONG ══
  if (['song','makesong','createsong','aisong','songgen'].includes(cmd)) {
    if (!argText) return reply([`⚠ Usage: ${prefix}song <topic> [style]`, `💡 e.g. ${prefix}song love story pop`])
    const words = argText.split(' ')
    const styles = ['pop','rnb','hip-hop','jazz','rock','afrobeat','reggae','classical','electronic','soul']
    let style = 'pop', topic = argText
    if (styles.includes(words[words.length - 1]?.toLowerCase())) { style = words.pop().toLowerCase(); topic = words.join(' ') }
    await rct(sock, msg, '🎵')
    const result = await createSong(topic, style)
    if (!result) return err('Song generation failed — try a different prompt')
    if (result.lyrics) {
      await sendTxt(sock, from, msg, box('AI SONG', [`🎵 *${topic}* (${style})`, '', result.lyrics.slice(0, 800)], brand))
    }
    if (result.buf) {
      await sendAud(sock, from, msg, result.buf, `${topic}_${style}.mp3`)
    }
    return
  }

  // ══ DATE / TIME ══
  if (['date','time','datetime'].includes(cmd)) {
    await rct(sock, msg, '📅')
    const tz = argText || 'Africa/Nairobi'
    const dt = getCurrentDateTime(tz)
    return reply([`📅 *Current Date & Time*`, `🌍 Timezone: ${tz}`, ``, dt])
  }

  // ══ COUNTDOWN ══
  if (['countdown','daysleft','daysuntil'].includes(cmd)) {
    if (!argText) return reply([`⚠ Usage: ${prefix}countdown <YYYY-MM-DD>`, `💡 e.g. ${prefix}countdown 2025-12-25`])
    await rct(sock, msg, '⏳')
    const result = getDaysLeft(argText)
    if (!result) return err('Invalid date format. Use YYYY-MM-DD')
    if (result.passed) return reply([`📅 *${argText}*`, ``, `✅ That date has already passed!`, `⏰ ${Math.abs(result.days)} days ago`])
    return reply([`⏳ *Countdown to ${argText}*`, ``, `📅 *${result.days}* days`, `🕐 *${result.hours}* hours`, `⏱ *${result.mins}* minutes remaining`])
  }

  // ══ JOKE ══
  if (cmd === 'joke') {
    await rct(sock, msg, '😂')
    const j = await getJoke(argText || 'any')
    if (!j) return err('No joke found')
    return reply([`😂 ${j}`])
  }

  // ══ QUOTE ══
  if (cmd === 'quote') {
    await rct(sock, msg, '💬')
    const q = await getQuote(argText)
    if (!q) return err('No quote found')
    return reply([`💬 ${q}`])
  }

  // ══ FACT ══
  if (cmd === 'fact') {
    await rct(sock, msg, '🧠')
    const f = await getFact()
    if (!f) return err('No fact found')
    return reply([`🧠 *Fun Fact:*`, ``, f])
  }

  // ══ CURRENCY ══
  if (cmd === 'currency') {
    const [amtStr, from2, , to2] = args
    if (!amtStr || !from2 || !to2) return reply([`⚠ Usage: ${prefix}currency 100 USD to KES`])
    await rct(sock, msg, '💱')
    const result = await getCurrency(parseFloat(amtStr), from2, to2)
    if (!result) return err('Conversion failed')
    return reply([`💱 ${result}`])
  }

  // ══ CRYPTO ══
  if (cmd === 'crypto') {
    if (!argText) return reply([`⚠ Usage: ${prefix}crypto <symbol>`, `💡 e.g. ${prefix}crypto bitcoin`])
    await rct(sock, msg, '💰')
    const result = await getCrypto(argText)
    if (!result) return err('Crypto not found')
    return reply([`💰 *Crypto Price*`, ``, result])
  }

  // ══ HOROSCOPE ══
  if (cmd === 'horoscope') {
    if (!argText) return reply([`⚠ Usage: ${prefix}horoscope <sign>`, `💡 e.g. ${prefix}horoscope leo`])
    await rct(sock, msg, '♈')
    const result = await getHoroscope(argText)
    if (!result) return err('Invalid sign or not found')
    return reply([result])
  }

  // ══ POEM ══
  if (cmd === 'poem') {
    await rct(sock, msg, '📜')
    const p = await getPoem(argText)
    if (!p) return err('No poem found')
    return reply([`📜 *${p.title}*`, `✍️ ${p.author}`, ``, p.lines])
  }

  // ══ MOTIVATE ══
  if (['motivate','roast2','compliment2'].includes(cmd)) {
    await rct(sock, msg, '💪')
    return reply([MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)]])
  }

  // ══ WIKIPEDIA ══
  if (cmd === 'wikipedia') {
    if (!argText) return reply([`⚠ Usage: ${prefix}wikipedia <topic>`])
    await rct(sock, msg, '📖')
    const w = await getWiki(argText)
    if (!w) return err('Not found on Wikipedia')
    const lines = [`📖 *${w.title}*`, ``, w.text?.slice(0, 500)]
    if (w.img) {
      try { const { buf } = await dl(w.img); return sendImg(sock, from, msg, buf, box('WIKIPEDIA', lines, brand)) } catch {}
    }
    return reply(lines)
  }

  // ══ IMDB ══
  if (cmd === 'imdb') {
    if (!argText) return reply([`⚠ Usage: ${prefix}imdb <movie/show name>`])
    await rct(sock, msg, '🎬')
    const m = await getIMDB(argText)
    if (!m) return err('Not found on IMDB')
    const lines = [`🎬 *${m.title}* (${m.year})`, m.genre ? `🎭 ${m.genre}` : null, m.rating ? `⭐ Rating: ${m.rating}/10` : null, m.plot ? `📝 ${m.plot}` : null].filter(Boolean)
    if (m.poster && m.poster !== 'N/A') {
      try { const { buf } = await dl(m.poster); return sendImg(sock, from, msg, buf, box('IMDB', lines, brand)) } catch {}
    }
    return reply(lines)
  }

  // ══ ANIME ══
  if (cmd === 'anime') {
    if (!argText) return reply([`⚠ Usage: ${prefix}anime <title>`])
    await rct(sock, msg, '🌸')
    const a = await getAnime(argText)
    if (!a) return err('Anime not found')
    const lines = [`🌸 *${a.title}*`, a.score ? `⭐ Score: ${a.score}` : null, a.episodes ? `📺 Episodes: ${a.episodes}` : null, a.status ? `📌 ${a.status}` : null, a.synopsis ? `📝 ${a.synopsis}` : null].filter(Boolean)
    if (a.img) { try { const { buf } = await dl(a.img); return sendImg(sock, from, msg, buf, box('ANIME', lines, brand)) } catch {} }
    return reply(lines)
  }

  // ══ MANGA ══
  if (cmd === 'manga') {
    if (!argText) return reply([`⚠ Usage: ${prefix}manga <title>`])
    await rct(sock, msg, '📚')
    const m = await getManga(argText)
    if (!m) return err('Manga not found')
    const lines = [`📚 *${m.title}*`, m.score ? `⭐ ${m.score}` : null, m.volumes ? `📖 Volumes: ${m.volumes}` : null, m.status ? `📌 ${m.status}` : null, m.synopsis ? `📝 ${m.synopsis}` : null].filter(Boolean)
    if (m.img) { try { const { buf } = await dl(m.img); return sendImg(sock, from, msg, buf, box('MANGA', lines, brand)) } catch {} }
    return reply(lines)
  }

  // ══ RECIPE ══
  if (cmd === 'recipe') {
    if (!argText) return reply([`⚠ Usage: ${prefix}recipe <food name>`])
    await rct(sock, msg, '👨‍🍳')
    const r = await getRecipe(argText)
    if (!r) return err('Recipe not found')
    const lines = [`👨‍🍳 *${r.name}*`, r.cat ? `📂 ${r.cat}` : null, r.area ? `🌍 ${r.area}` : null, r.instructions ? `📝 ${r.instructions}` : null].filter(Boolean)
    if (r.img) { try { const { buf } = await dl(r.img); return sendImg(sock, from, msg, buf, box('RECIPE', lines, brand)) } catch {} }
    return reply(lines)
  }

  // ══ COCKTAIL ══
  if (cmd === 'cocktail') {
    if (!argText) return reply([`⚠ Usage: ${prefix}cocktail <drink name>`])
    await rct(sock, msg, '🍹')
    const c = await getCocktail(argText)
    if (!c) return err('Cocktail not found')
    const lines = [`🍹 *${c.name}*`, c.category ? `📂 ${c.category}` : null, c.instructions ? `📝 ${c.instructions}` : null].filter(Boolean)
    if (c.img) { try { const { buf } = await dl(c.img); return sendImg(sock, from, msg, buf, box('COCKTAIL', lines, brand)) } catch {} }
    return reply(lines)
  }

  // ══ CATFACT ══
  if (cmd === 'catfact') {
    await rct(sock, msg, '🐱')
    return reply([`🐱 *Cat Fact:*`, ``, await getCatFact()])
  }

  // ══ DOGFACT ══
  if (cmd === 'dogfact') {
    await rct(sock, msg, '🐶')
    return reply([`🐶 *Dog Fact:*`, ``, await getDogFact()])
  }

  // ══ SPACEFACT ══
  if (cmd === 'spacefact') {
    await rct(sock, msg, '🚀')
    return reply([`🚀 *Space Fact:*`, ``, getSpaceFact()])
  }

  // ══ NUMBERFACT ══
  if (cmd === 'numberfact') {
    const n = argText || String(Math.floor(Math.random() * 1000))
    await rct(sock, msg, '🔢')
    const f = await getNumberFact(n)
    if (!f) return err('No fact found')
    return reply([`🔢 *Number ${n}:*`, ``, f])
  }

  // ══ COUNTRYFACT ══
  if (cmd === 'countryfact') {
    if (!argText) return reply([`⚠ Usage: ${prefix}countryfact <country name>`])
    await rct(sock, msg, '🌍')
    const c = await getCountryInfo(argText)
    if (!c) return err('Country not found')
    const lines = [`🌍 *${c.name}*`, c.capital ? `🏙️ Capital: ${c.capital}` : null, c.region ? `📍 Region: ${c.region}` : null, c.population ? `👥 Population: ${c.population}` : null, c.currency ? `💰 Currency: ${c.currency}` : null].filter(Boolean)
    if (c.flag) { try { const { buf } = await dl(c.flag); return sendImg(sock, from, msg, buf, box('COUNTRY', lines, brand)) } catch {} }
    return reply(lines)
  }

  // ══ WORDDEF ══
  if (cmd === 'worddef') {
    if (!argText) return reply([`⚠ Usage: ${prefix}worddef <word>`])
    await rct(sock, msg, '📚')
    const d = await getWordDef(argText.split(' ')[0])
    if (!d) return err('Word not found')
    return reply([`📚 *${d.word}*`, d.pos ? `📌 ${d.pos}` : null, ``, d.def, d.example ? `💬 Example: "${d.example}"` : null].filter(Boolean))
  }

  // ══ SCIENCE Q&A ══
  if (['maths','physics','science','biology'].includes(cmd)) {
    if (!argText) return reply([`⚠ Usage: ${prefix}${cmd} <question>`])
    await rct(sock, msg, '🔬')
    const ans = await scienceQA(argText)
    if (!ans) return err('Could not answer that question')
    return reply([`🔬 *Q: ${argText}*`, ``, ans.slice(0, 600)])
  }

  // ══ PASSWORD ══
  if (cmd === 'password') {
    await rct(sock, msg, '🔐')
    const len = parseInt(argText) || 16
    const pwd = genPassword(Math.min(Math.max(len, 8), 64))
    return reply([`🔐 *Generated Password (${len} chars):*`, ``, `\`${pwd}\``, ``, `⚠️ Save it somewhere safe!`])
  }

  // ══ UUID ══
  if (cmd === 'uuid') {
    await rct(sock, msg, '🆔')
    return reply([`🆔 *UUID:*`, ``, genUUID()])
  }

  // ══ RANDNAME ══
  if (cmd === 'randname') {
    await rct(sock, msg, '👤')
    return reply([`👤 *Random Name:*`, ``, randName()])
  }

  // ══ HEX / RGB ══
  if (['hex','rgb','color2'].includes(cmd)) {
    if (!argText) return reply([`⚠ Usage: ${prefix}hex #FF5733`])
    await rct(sock, msg, '🎨')
    const rgb = hexToRgb(argText)
    if (!rgb) return err('Invalid hex color')
    return reply([`🎨 *Color:* ${argText}`, `RGB: ${rgb}`, `🔗 Preview: https://singlecolorimage.com/get/${argText.replace('#','')}/200x200`])
  }

  // ══ BASE64 ══
  if (cmd === 'base64enc') {
    if (!argText) return reply([`⚠ Usage: ${prefix}base64enc <text>`])
    await rct(sock, msg, '🔡')
    return reply([`🔡 *Base64 Encoded:*`, ``, b64enc(argText)])
  }

  if (cmd === 'base64dec') {
    if (!argText) return reply([`⚠ Usage: ${prefix}base64dec <base64>`])
    await rct(sock, msg, '🔡')
    const decoded = b64dec(argText)
    if (!decoded) return err('Invalid base64 string')
    return reply([`🔡 *Decoded:*`, ``, decoded])
  }

  // ══ HASH ══
  if (cmd === 'hash') {
    const [algo, ...rest] = args
    const text = rest.join(' ')
    if (!text) return reply([`⚠ Usage: ${prefix}hash <md5|sha1|sha256> <text>`])
    await rct(sock, msg, '🔒')
    const h = hashText(text, algo || 'sha256')
    if (!h) return err('Hashing failed')
    return reply([`🔒 *${(algo || 'sha256').toUpperCase()} Hash:*`, ``, h])
  }

  // ══ IP INFO ══
  if (cmd === 'ip') {
    await rct(sock, msg, '🌐')
    const info = await getIPInfo(argText)
    if (!info) return err('Could not get IP info')
    return reply([`🌐 *IP Info: ${info.ip}*`, `🌍 ${info.city || info.city_name || ''}, ${info.country_name || info.country || ''}`, `📍 ${info.region || info.region_name || ''}`, `🏢 ${info.org || info.isp || ''}`, `🕐 ${info.timezone || ''}`].filter(l => l.replace(/[│:*\s]/g,'') !== ''))
  }

  // ══ PASTETEXT ══
  if (cmd === 'pastetext') {
    const text = argText || getQuotedText(msg)
    if (!text) return reply([`⚠ Usage: ${prefix}pastetext <text>`])
    await rct(sock, msg, '📋')
    try {
      const r = await axios.post('https://api.pastes.dev/post', text, { headers: { 'Content-Type': 'text/plain' }, timeout: TOUT })
      const key = r.data?.key
      return reply([`📋 *Text pasted!*`, ``, key ? `🔗 https://pastes.dev/${key}` : 'Saved (key not returned)'])
    } catch { return err('Paste failed') }
  }

  // ══ HELP ══
  if (!['mood','wallpaper','wall','wp','bg','channel','createchannel','chanmsg','news','headlines','breaking','weather','forecast','temp','calc','calculate','math','graph','imgdl','dlimg','saveimg','picget','ship','slots','aviator','dice','flip','roulette','trivia','truth','dare','wouldyou','neverhave','8ball','rate','match','livescore','scores','fixtures','standings','surebets','surebet','arbitrage','song','makesong','createsong','aisong','songgen','date','time','datetime','countdown','daysleft','daysuntil','joke','quote','fact','currency','crypto','horoscope','poem','motivate','wikipedia','imdb','anime','manga','recipe','cocktail','catfact','dogfact','spacefact','numberfact','countryfact','worddef','maths','physics','science','biology','password','uuid','randname','hex','rgb','color2','base64enc','base64dec','hash','ip','pastetext','roast2','compliment2'].includes(cmd)) {
    return reply([
      `📋 *ULTIMATE COMMANDS (prefix: ${prefix})*`,
      ``,
      `🎭 ${prefix}mood <name> — 50 mood reactions`,
      `🖼️ ${prefix}wallpaper <query> — Mobile wallpaper`,
      `📢 ${prefix}channel <jid> <msg>`,
      `📰 ${prefix}news [topic]`,
      `🌤️ ${prefix}weather <city>`,
      `🧮 ${prefix}calc <expression>`,
      `📊 ${prefix}graph <math expr>`,
      `📥 ${prefix}imgdl <url>`,
      `💕 ${prefix}ship <name1> <name2>`,
      `🎰 ${prefix}slots`,
      `✈️ ${prefix}aviator`,
      `🎲 ${prefix}dice [sides]`,
      `🪙 ${prefix}flip`,
      `🎡 ${prefix}roulette`,
      `🧠 ${prefix}trivia`,
      `💬 ${prefix}truth | 🔥 ${prefix}dare`,
      `🤔 ${prefix}wouldyou | 🤫 ${prefix}neverhave`,
      `🎱 ${prefix}8ball <question>`,
      `⭐ ${prefix}rate <thing>`,
      `⚽ ${prefix}livescore`,
      `📊 ${prefix}surebets`,
      `🎵 ${prefix}song <topic> [style]`,
      `📅 ${prefix}date [timezone]`,
      `⏳ ${prefix}countdown <YYYY-MM-DD>`,
      `😂 ${prefix}joke | 💬 ${prefix}quote`,
      `🧠 ${prefix}fact | 🚀 ${prefix}spacefact`,
      `💱 ${prefix}currency 100 USD to KES`,
      `💰 ${prefix}crypto <symbol>`,
      `♈ ${prefix}horoscope <sign>`,
      `📖 ${prefix}wikipedia <topic>`,
      `🎬 ${prefix}imdb <title>`,
      `🌸 ${prefix}anime | 📚 ${prefix}manga`,
      `👨‍🍳 ${prefix}recipe | 🍹 ${prefix}cocktail`,
      `🔬 ${prefix}science <question>`,
      `🐱 ${prefix}catfact | 🐶 ${prefix}dogfact`,
      `🌍 ${prefix}countryfact <country>`,
      `📚 ${prefix}worddef <word>`,
      `🔐 ${prefix}password [length]`,
      `🆔 ${prefix}uuid | 👤 ${prefix}randname`,
      `🎨 ${prefix}hex #RRGGBB`,
      `🔒 ${prefix}hash sha256 <text>`,
      `🔡 ${prefix}base64enc | ${prefix}base64dec`,
      `🌐 ${prefix}ip [address]`,
      `📋 ${prefix}pastetext <text>`
    ])
  }
}
