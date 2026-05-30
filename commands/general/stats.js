export const name = 'stats'
export const alias = ['status', 'botinfo', 'info']
export const category = 'General'
export const desc = 'Show bot and system statistics'

function getBrandName(botSettings) {
  return botSettings?.brand_name || botSettings?.botname || 'Bot'
}

function generateStableStats() {
  // Fake but stable math based on current hour - same stats for 1 hour
  const seed = Math.floor(Date.now() / 3600000)
  const rand = (min, max) => {
    const x = Math.sin(seed + min + max) * 10000
    return Math.floor((x - Math.floor(x)) * (max - min)) + min
  }

  // Fake uptime 2-15 days
  const uptimeDays = rand(2, 15)
  const uptimeHours = rand(0, 23)
  const uptimeMins = rand(0, 59)
  const uptimeStr = `${uptimeDays}d ${uptimeHours}h ${uptimeMins}m`

  // Fake RAM 45-78%
  const ramPercent = rand(45, 78)
  const ramBar = '█'.repeat(Math.floor(ramPercent / 10)) + '▒'.repeat(10 - Math.floor(ramPercent / 10))
  const ramUsed = rand(512, 1800)
  const ramTotal = rand(2048, 4096)

  // Fake commands count
  const cmdCount = rand(85, 240)
  const catCount = rand(8, 15)

  // Fake platform
  const platforms = ['🐧 Linux', '☁️ Cloud', '🤖 Android']
  const platform = platforms[rand(0, 3)]

  return { uptimeStr, ramPercent, ramBar, ramUsed, ramTotal, cmdCount, catCount, platform }
}

export default async function executeAutonomousCommand(sock, { msg, from, pushName, sender }, botSettings) {
  try {
    await sock.sendMessage(from, { react: { text: '📊', key: msg.key } })

    const stats = generateStableStats()
    const brandName = getBrandName(botSettings)
    const botName = botSettings?.botname || 'Bot'
    const ownerName = botSettings?.owner_name || 'Owner'
    const prefix = botSettings?.prefix || '.'
    const nodeVer = process.version
    const userIdentity = pushName || sender.split('@')[0]

    const text = `╭─⌈ 📊 *${botName.toUpperCase()} STATS* ⌋
│ User: ${userIdentity}
│ Bot: ${botName}
│ Owner: ${ownerName}
│ Brand: ${brandName}
│ Prefix: [ ${prefix} ]
│
│ Commands: ${stats.cmdCount}
│ Categories: ${stats.catCount}
│ Platform: ${stats.platform}
│ Node: ${nodeVer}
│
│ Uptime: ${stats.uptimeStr}
│ RAM: ${stats.ramBar} ${stats.ramPercent}%
│ RAM Used: ${stats.ramUsed}/${stats.ramTotal} MB
╰⊷ *Powered By ${brandName}*`

    await sock.sendMessage(from, { text }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } }).catch(() => {})

  } catch (e) {
    console.error('Stats error:', e.message)
    await sock.sendMessage(from, { text: '> Failed to load stats' }, { quoted: msg })
  }
}