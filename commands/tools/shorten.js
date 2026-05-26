// commands/tools/shorten.js
export const name = 'shorten'
export const alias = ['shorturl', 'urlshort', 'tinyurl']
export const category = 'Tools'
export const desc = 'Shorten a URL with API fallbacks. Supports custom alias.'

async function getBrandName(botSettings) {
  if (!botSettings.supabase) return 'Bot'
  const instanceId = botSettings.instance_id || 'DGIFT_DEFAULT'
  const { data } = await botSettings.supabase
.from('b_settings')
.select('brand_name, botname')
.eq('id', instanceId)
.maybeSingle()
  return data?.brand_name || data?.botname || 'Bot'
}

function isValidUrl(string) {
  try {
    new URL(string)
    return true
  } catch {
    return false
  }
}

async function tryTinyURL(url, alias = null) {
  try {
    let apiUrl = `https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`
    if (alias) apiUrl += `&alias=${encodeURIComponent(alias)}`
    
    const res = await fetch(apiUrl, { timeout: 8000 })
    if (!res.ok) return null
    
    const text = await res.text()
    if (text.startsWith('http')) return text
    return null
  } catch {
    return null
  }
}

async function tryIsGd(url, alias = null) {
  try {
    let apiUrl = `https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`
    if (alias) apiUrl += `&shorturl=${encodeURIComponent(alias)}`
    
    const res = await fetch(apiUrl, { timeout: 8000 })
    if (!res.ok) return null
    
    const text = await res.text()
    if (text.startsWith('http')) return text
    return null
  } catch {
    return null
  }
}

async function tryClckRu(url) {
  try {
    const apiUrl = `https://clck.ru/--?url=${encodeURIComponent(url)}`
    const res = await fetch(apiUrl, { timeout: 8000 })
    if (!res.ok) return null
    
    const text = await res.text()
    if (text.startsWith('http')) return text
    return null
  } catch {
    return null
  }
}

export default async function shorten(sock, { msg, from, args }, botSettings) {
  try {
    const brandName = await getBrandName(botSettings)
    const url = args[0]
    const alias = args[1]

    if (!url) {
      return await sock.sendMessage(from, {
        text: `╭─⌈ URL SHORTENER ⌋
│ Usage: ${botSettings.prefix}shorten <url> [alias]
│
│ Examples:
│ ${botSettings.prefix}shorten https://example.com/long/link
│ ${botSettings.prefix}shorten https://example.com mylink
│
│ Notes:
│ - Alias only works on TinyURL & is.gd
│ - Use letters/numbers only for alias
╰⊷ *Powered By ${brandName}*`
      }, { quoted: msg })
    }

    if (!isValidUrl(url)) {
      return await sock.sendMessage(from, {
        text: '> Invalid URL. Make sure it starts with http:// or https://'
      }, { quoted: msg })
    }

    if (alias && !/^[a-zA-Z0-9_-]+$/.test(alias)) {
      return await sock.sendMessage(from, {
        text: '> Alias can only contain letters, numbers, - and _. No spaces.'
      }, { quoted: msg })
    }

    await sock.sendMessage(from, {
      text: '> Shortening URL...'
    }, { quoted: msg })

    // Try APIs in order: TinyURL > is.gd > clck.ru
    let shortUrl = await tryTinyURL(url, alias)
    let provider = 'TinyURL'
    
    if (!shortUrl) {
      shortUrl = await tryIsGd(url, alias)
      provider = 'is.gd'
    }
    
    if (!shortUrl) {
      shortUrl = await tryClckRu(url)
      provider = 'clck.ru'
    }

    if (!shortUrl) {
      return await sock.sendMessage(from, {
        text: '> All shortener APIs failed. Try again later or use a different alias.'
      }, { quoted: msg })
    }

    await sock.sendMessage(from, {
      text: `╭─⌈ URL SHORTENED ⌋
│ Original: ${url}
│ Short: ${shortUrl}
│ Provider: ${provider}
${alias ? `│ Alias: ${alias}` : ''}
╰⊷ *Powered By ${brandName}*`
    }, { quoted: msg })

  } catch (err) {
    console.error('[SHORTEN ERROR]', err)
    await sock.sendMessage(from, {
      text: '> Failed to shorten URL. Check the link and try again.'
    }, { quoted: msg })
  }
}