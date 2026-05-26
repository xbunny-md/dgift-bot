// commands/general/stats.js
import os from 'os'
import { getAllCommands } from '../../lib/router.js'

export const name = 'stats'
export const alias = ['status', 'botinfo', 'info']
export const category = 'General'
export const desc = 'Show bot and system statistics'

export default async function stats(sock, { msg, from, pushName, sender }, botSettings) {
  try {
    await sock.sendMessage(from, { react: { text: '🦺', key: msg.key } })

    const loadingMsg = await sock.sendMessage(from, { text: '> Fetching stats...' }, { quoted: msg })

    // Uptime
    const uptimeSec = process.uptime()
    const days = Math.floor(uptimeSec / 86400)
    const hours = Math.floor((uptimeSec % 86400) / 3600)
    const minutes = Math.floor((uptimeSec % 3600) / 60)
    const uptimeStr = `${days > 0 ? days + 'd ' : ''}${hours}h ${minutes}m`

    // RAM - Process vs System
    const mem = process.memoryUsage()
    const ramUsed = (mem.heapUsed / 1024 / 1024).toFixed(1)
    const ramTotal = (mem.heapTotal / 1024 / 1024).toFixed(1)
    
    const sysTotal = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1)
    const sysFree = (os.freem() / 1024 / 1024 / 1024).toFixed(1)
    const sysUsedPercent = Math.round(((os.totalmem() - os.freem()) / os.totalmem()) * 100)
    const ramBar = '█'.repeat(Math.round((sysUsedPercent / 100) * 10)) + '▒'.repeat(10 - Math.round((sysUsedPercent / 100) * 10))

    // Commands from router
    const allCommands = getAllCommands()
    const cmdCount = allCommands.size
    const categories = new Set()
    
    for (const [cmdName, cmdData] of allCommands) {
      categories.add(cmdData.category || 'Other')
    }

    // System info
    const botName = botSettings.botname || 'DGIFT BOT'
    const ownerName = botSettings.owner_name || 'Owner'
    const brandName = botSettings.brand_name || ownerName
    const prefix = botSettings.prefix || '.'
    const platform = os.platform() === 'linux' ? '🐧 Linux' : os.platform() === 'win32' ? '🪟 Windows' : '🍎 MacOS'
    const nodeVer = process.version
    const userIdentity = pushName || sender.split('@')[0]

    const text = 
`╭─⌈ 📊 *${botName.toUpperCase()} STATS* ⌋
│ User: ${userIdentity}
│ Bot: ${botName}
│ Owner: ${ownerName}
│ Brand: ${brandName}
│ Prefix: [ ${prefix} ]
│
│ Commands: ${cmdCount}
│ Categories: ${categories.size}
│ Platform: ${platform}
│ Node: ${nodeVer}
│
│ Uptime: ${uptimeStr}
│ RAM Proc: ${ramUsed}/${ramTotal} MB
│ RAM Sys: ${ramBar} ${sysUsedPercent}%
│ RAM Free: ${sysFree}/${sysTotal} GB
╰⊷ *Powered By ${brandName}*`

    await sock.sendMessage(from, {
      text: text,
      edit: loadingMsg.key
    })

    await sock.sendMessage(from, { react: { text: '✅', key: loadingMsg.key } }).catch(() => {})

  } catch (e) {
    console.error('Stats error:', e.message)
    await sock.sendMessage(from, { 
      text: '> ❌ Failed to get stats.' 
    }, { quoted: msg })
  }
}