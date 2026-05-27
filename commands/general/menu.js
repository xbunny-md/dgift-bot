import { getAllCommands } from '../../lib/router.js'

export const name = 'menu'
export const alias = ['help','commands']
export const category = 'General'
export const desc = 'Displays the complete system interface panel dynamically categorized with server statistics'

const REACT_EMOJIS = ['🐧','🦁','🐮','🐽','🐣','🐨','🧙🏻‍♀️','👊🏻','👐','😸','👹','🤑','💩','😴','😵‍💫','😯','😶‍🌫️','🤬']

function getRandomEmoji() {
  return REACT_EMOJIS[Math.floor(Math.random() * REACT_EMOJIS.length)]
}

function generateFakeStats() {
  // Fake uptime 0-7 days
  const uptimeSec = Math.floor(Math.random() * 604800)
  const h = Math.floor(uptimeSec / 3600)
  const m = Math.floor((uptimeSec % 3600) / 60)
  const s = uptimeSec % 60
  const uptimeString = `${h}h ${m}m ${s}s`

  // Fake RAM 15-90%
  const ramPercent = Math.floor(Math.random() * 75) + 15
  const ramBar = '█'.repeat(Math.floor(ramPercent / 10)) + '▒'.repeat(10 - Math.floor(ramPercent / 10))

  // Fake platform
  const platforms = ['🐧 Linux', '🪟 Windows', '🍎 MacOS', '🤖 Android', '☁️ Cloud']
  const platform = platforms[Math.floor(Math.random() * platforms.length)]

  return { uptimeString, ramBar, ramPercent, platform }
}

async function getMenuList(botSettings) {
  // Njia 1: Router
  try {
    const allCommands = getAllCommands()
    if (allCommands && allCommands.length > 0) {
      const catalog = {}
      for (const cmd of allCommands) {
        const cat = (cmd.category || 'Uncategorized').toUpperCase()
        if (!catalog[cat]) catalog[cat] = []
        catalog[cat].push(cmd.name)
      }
      return catalog
    }
  } catch (e) {
    console.log('Router menu_list failed, falling back to Supabase:', e.message)
  }

  // Njia 2: Supabase
  try {
    if (!botSettings?.supabase ||!botSettings?.instance_id) return {}
    const { data } = await botSettings.supabase
     .from('b_settings')
     .select('menu_list')
     .eq('id', botSettings.instance_id)
     .maybeSingle()
    return data?.menu_list || {}
  } catch (e) {
    console.log('Supabase menu_list failed:', e.message)
    return {}
  }
}

async function getMenuImage(botSettings) {
  const backup = 'https://i.ibb.co/1tM9QHF9/IMG-20260525-WA0076.jpg'

  // 1. Env
  if (process.env.MENU_IMAGE_URL) return process.env.MENU_IMAGE_URL

  // 2. Supabase
  try {
    if (botSettings?.supabase && botSettings?.instance_id) {
      const { data } = await botSettings.supabase
       .from('b_settings')
       .select('menu_image_url')
       .eq('id', botSettings.instance_id)
       .maybeSingle()
      if (data?.menu_image_url) return data.menu_image_url
    }
  } catch (e) {
    console.log('Supabase image fetch failed:', e.message)
  }

  // 3. Backup
  return backup
}

export default async function executeAutonomousCommand(sock, { msg, from, pushName, sender }, botSettings) {
  try {
    await sock.sendMessage(from, { react: { text: getRandomEmoji(), key: msg.key } })

    const { uptimeString, ramBar, ramPercent, platform } = generateFakeStats()
    const userIdentity = pushName || sender.split('@')[0]
    const prefix = botSettings.prefix || '!'
    const botName = botSettings.botname || 'DGIFT BOT'
    const ownerName = botSettings.owner_name || 'Dgift-Droid'
    const footerText = '*Powered by Dgift Tech*'

    const menuList = await getMenuList(botSettings)
    const imageUrl = await getMenuImage(botSettings)

    let menuText = `╭──⌈ ${botName} ⌋
│ User: ${userIdentity}
│ Owner: ${ownerName}
│ Prefix: [ ${prefix} ]
│ Platform: ${platform}
│ Uptime: ${uptimeString}
│ RAM: ${ramBar} ${ramPercent}%
╰────────────────\n\n`

    if (Object.keys(menuList).length > 0) {
      for (const cat of Object.keys(menuList).sort()) {
        menuText += `╭──⌈ ${cat} ⌋\n`
        menuList[cat].sort().forEach(cmd => {
          menuText += `│ ${prefix}${cmd}\n`
        })
        menuText += `╰────────────────\n\n`
      }
    } else {
      menuText += `╭──⌈ SYSTEM ⌋\n│ Menu list not available\n╰────────────────\n\n`
    }

    menuText += `${footerText}`

    await sock.sendMessage(from, {
      image: { url: imageUrl },
      caption: menuText
    }, { quoted: msg })

  } catch (e) {
    console.error("Menu Error:", e.message)
    await sock.sendMessage(from, { text: "Menu failed to load. Try again." }, { quoted: msg })
  }
}