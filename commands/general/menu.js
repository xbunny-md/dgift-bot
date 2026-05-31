// commands/general/menu.js
import { getAllCommands } from '../../lib/router.js'

export const name = 'menu'
export const alias = ['commands', 'allmenu', 'help', 'list']
export const category = 'General'
export const desc = 'Interactive menu with categories and emojis'

async function getBrandName(botSettings) {
  if (!botSettings?.supabase) return botSettings?.botname || 'Bot'
  const instanceId = botSettings.instance_id || botSettings.instanceId
  if (!instanceId) return botSettings?.botname || 'Bot'
  try {
    const { data } = await botSettings.supabase
      .from('b_settings')
      .select('brand_name, botname')
      .eq('id', instanceId)
      .maybeSingle()
    return data?.brand_name || data?.botname || botSettings?.botname || 'Bot'
  } catch (err) {
    console.log('Brand name error:', err.message)
    return botSettings?.botname || 'Bot'
  }
}

function generateFakeStats() {
  const totalUptimeSeconds = Math.floor(Math.random() * 604800)
  const hours = Math.floor(totalUptimeSeconds / 3600)
  const minutes = Math.floor((totalUptimeSeconds % 3600) / 60)
  const seconds = totalUptimeSeconds % 60
  const uptimeString = `${hours}h ${minutes}m ${seconds}s`

  const ramPercent = Math.floor(Math.random() * 65) + 20
  const ramBar = '█'.repeat(Math.floor(ramPercent / 10)) + '▒'.repeat(10 - Math.floor(ramPercent / 10))

  const platforms = ['🐧 Linux', '🪟 Windows', '🍎 MacOS', '🤖 Android', '☁️ Cloud']
  const platform = platforms[Math.floor(Math.random() * platforms.length)]

  return { uptimeString, ramBar, ramPercent, platform }
}

function getCategoryEmoji(category) {
  const emojiMap = {
    'GENERAL': '🌍',
    'SETTINGS': '⚙️',
    'DOWNLOAD': '📥',
    'AI': '🤖',
    'STICKER': '🎨',
    'GROUP': '👥',
    'OWNER': '👑',
    'TOOLS': '🔧',
    'SEARCH': '🔍',
    'FUN': '🎮',
    'CONVERT': '🔄',
    'NSFW': '🔞',
    'UNCATEGORIZED': '📁'
  }
  return emojiMap[category] || '📁'
}

export default async function menu(sock, { msg, from, pushName, sender }, botSettings) {
  try {
    await sock.sendMessage(from, { react: { text: '🌀', key: msg.key } })

    const instanceId = botSettings?.instance_id || botSettings?.instanceId

    let menuList = {}
    let menuImageUrl = botSettings?.menu_image_url || botSettings?.startup_image
    let menuFooter = botSettings?.menu_footer

    if (botSettings?.supabase && instanceId) {
      try {
        const { data } = await botSettings.supabase
          .from('b_settings')
          .select('menu_list, menu_image_url, menu_footer')
          .eq('id', instanceId)
          .maybeSingle()
        menuList = data?.menu_list || {}
        menuImageUrl = data?.menu_image_url || menuImageUrl
        menuFooter = data?.menu_footer || menuFooter
      } catch (err) {
        console.log('Menu DB error:', err.message)
      }
    }

    if (!menuList || Object.keys(menuList).length === 0) {
      const allCommands = getAllCommands()
      for (const cmd of allCommands) {
        const category = (cmd.category || 'Uncategorized').toUpperCase()
        if (!menuList[category]) menuList[category] = []
        menuList[category].push(cmd.name)
      }
    }

    const { uptimeString, ramBar, ramPercent, platform } = generateFakeStats()
    const userIdentity = pushName || sender?.split('@')[0] || 'User'

    const prefix = botSettings?.prefix || '!'
    const botName = botSettings?.botname || 'Bot'
    const ownerName = botSettings?.owner_name || 'Owner'
    const brandName = await getBrandName(botSettings)
    const footerText = menuFooter || `Powered By ${brandName}`

    const sortedCats = Object.keys(menuList).sort()

    if (botSettings) {
      botSettings.lastMenuCategories = sortedCats
      botSettings.lastMenuCommands = menuList
      botSettings.lastMenuFrom = from
      botSettings.lastMenuEmojis = {}
    }

    let menuText = `╭──⌈ ${botName} ⌋
│ User: ${userIdentity}
│ Owner: ${ownerName}
│ Prefix: [ ${prefix} ]
│ Platform: ${platform}
│ Uptime: ${uptimeString}
│ RAM: ${ramBar} ${ramPercent}%
╰────────────────\n\n*Choose a category below*\n*Reply with number 1-${sortedCats.length}*\n\n`

    sortedCats.forEach((cat, index) => {
      const emoji = getCategoryEmoji(cat)
      if (botSettings?.lastMenuEmojis) botSettings.lastMenuEmojis[cat] = emoji
      const cmdCount = menuList[cat]?.length || 0
      menuText += `${index + 1}. ${emoji} *${cat}* [${cmdCount} cmds]\n`
    })

    menuText += `\n────────────────\n*${footerText}*`

    const imageUrl = menuImageUrl || process.env.IMAGE_URL || 'https://i.ibb.co/1tM9QHF9/IMG-20260525-WA0076.jpg'

    await sock.sendMessage(from, {
      image: { url: imageUrl },
      caption: menuText
    }, { quoted: msg })

  } catch (e) {
    console.error('Menu Error:', e.message)
    try {
      await sock.sendMessage(from, { text: 'Menu failed to load. Try again.' }, { quoted: msg })
    } catch (err) {}
  }
}