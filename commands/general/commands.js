import { getAllCommands } from '../../lib/router.js'

export const name = 'menu2'
export const alias = ['commands2', 'allmenu', 'menu2', 'help2']
export const category = 'General'
export const desc = 'Displays the complete system interface panel dynamically categorized with fake server statistics'

async function getBrandName(botSettings) {
  if (!botSettings?.supabase) return botSettings?.botname || 'Bot'
  const instanceId = botSettings.instance_id || 'DGIFT_DEFAULT'
  const { data } = await botSettings.supabase
   .from('b_settings')
   .select('brand_name, botname')
   .eq('id', instanceId)
   .maybeSingle()
  return data?.brand_name || data?.botname || 'Bot'
}

function generateFakeStats() {
  // Fake uptime 0-7 days
  const totalUptimeSeconds = Math.floor(Math.random() * 604800)
  const hours = Math.floor(totalUptimeSeconds / 3600)
  const minutes = Math.floor((totalUptimeSeconds % 3600) / 60)
  const seconds = totalUptimeSeconds % 60
  const uptimeString = `${hours}h ${minutes}m ${seconds}s`

  // Fake RAM 20-85%
  const ramPercent = Math.floor(Math.random() * 65) + 20
  const ramBar = '█'.repeat(Math.floor(ramPercent / 10)) + '▒'.repeat(10 - Math.floor(ramPercent / 10))

  // Fake platform
  const platforms = ['🐧 Linux', '🪟 Windows', '🍎 MacOS', '🤖 Android', '☁️ Cloud']
  const platform = platforms[Math.floor(Math.random() * platforms.length)]

  return { uptimeString, ramBar, ramPercent, platform }
}

export default async function executeAutonomousCommand(sock, { msg, from, pushName, sender }, botSettings) {
  try {
    await sock.sendMessage(from, { react: { text: '🌀', key: msg.key } })

    const instanceId = botSettings.instance_id || 'DGIFT_DEFAULT'

    // Soma menu_list kutoka Supabase
    let menuList = {}
    if (botSettings?.supabase) {
      const { data } = await botSettings.supabase
       .from('b_settings')
       .select('menu_list, menu_image_url, menu_footer')
       .eq('id', instanceId)
       .maybeSingle()
      menuList = data?.menu_list || {}
    }

    // Kama menu_list haina data, tumia getAllCommands() kama backup
    if (Object.keys(menuList).length === 0) {
      const allCommands = getAllCommands()
      for (const cmd of allCommands) {
        const category = (cmd.category || 'Uncategorized').toUpperCase()
        if (!menuList[category]) menuList[category] = []
        menuList[category].push(cmd.name)
      }
    }

    const { uptimeString, ramBar, ramPercent, platform } = generateFakeStats()
    const userIdentity = pushName || sender.split('@')[0]

    const prefix = botSettings.prefix || '!'
    const botName = botSettings.botname || 'DGIFT BOT'
    const ownerName = botSettings.owner_name || 'Owner'
    const brandName = await getBrandName(botSettings)
    const footerText = `*${botSettings.menu_footer || `Powered By ${brandName}`}*`

    let menuText = `╭──⌈ ${botName} ⌋
│ User: ${userIdentity}
│ Owner: ${ownerName}
│ Prefix: [ ${prefix} ]
│ Platform: ${platform}
│ Uptime: ${uptimeString}
│ RAM: ${ramBar} ${ramPercent}%
╰────────────────\n\n`

    for (const cat of Object.keys(menuList).sort()) {
      menuText += `╭──⌈ ${cat} ⌋\n`
      menuList[cat].sort().forEach(cmd => {
        menuText += `│ ${prefix}${cmd}\n`
      })
      menuText += `╰────────────────\n\n`
    }

    menuText += `${footerText}`

    const imageUrl =
      botSettings.menu_image_url ||
      process.env.IMAGE_URL ||
      botSettings.startup_image ||
      'https://i.ibb.co/1tM9QHF9/IMG-20260525-WA0076.jpg'

    await sock.sendMessage(from, {
      image: { url: imageUrl },
      caption: menuText
    }, { quoted: msg })

  } catch (e) {
    console.error("Menu Error:", e.message)
    await sock.sendMessage(from, { text: "Menu failed to load. Try again." }, { quoted: msg })
  }
}