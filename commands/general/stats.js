// commands/general/stats.js
import os from 'os'
import { getAllCommands } from '../../lib/router.js'

export const name = 'stats'
export const alias = ['status', 'botinfo', 'info']
export const category = 'General'
export const desc = 'Show bot and system statistics'

export default async function stats(sock, { msg, from }, botSettings) {
  try {
    await sock.sendMessage(from, { react: { text: '🦺', key: msg.key } })

    const loadingMsg = await sock.sendMessage(from, { text: 'Fetching stats...' }, { quoted: msg })

    const uptimeSec = process.uptime()
    const days = Math.floor(uptimeSec / 86400)
    const hours = Math.floor((uptimeSec % 86400) / 3600)
    const minutes = Math.floor((uptimeSec % 3600) / 60)
    
    let uptimeStr = ''
    if (days > 0) uptimeStr += `${days}d `
    uptimeStr += `${hours}h ${minutes}m`

    const mem = process.memoryUsage()
    const ramUsed = (mem.heapUsed / 1024 / 1024).toFixed(1)
    const ramTotal = (mem.heapTotal / 1024 / 1024).toFixed(1)
    const sysRam = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1)
    const sysFree = (os.freem() / 1024 / 1024 / 1024).toFixed(1)

    const allCommands = getAllCommands()
    const cmdCount = Array.isArray(allCommands) ? allCommands.length : allCommands.size
    const categories = new Set()
    
    for (const cmd of allCommands) {
      const cmdData = Array.isArray(cmd) ? cmd[1] : cmd
      categories.add(cmdData.category || 'Other')
    }

    const botName = botSettings.botname || 'bot'
    const ownerName = botSettings.owner_name || 'Owner'
    const brandName = botSettings.brand_name || ownerName
    const prefix = botSettings.prefix || '.'
    const platform = os.platform() === 'linux' ? '🐧 Linux' : '🪟 Windows'
    const nodeVer = process.version

    const text = 
`╭─⌈ 📊 *${botName.toUpperCase()} STATS* ⌋
│ Bot Name: ${botName}
│ Owner: ${ownerName}
│ Brand: ${brandName}
│ Prefix: ${prefix}
│ Commands: ${cmdCount}
│ Categories: ${categories.size}
│
│ Uptime: ${uptimeStr}
│ RAM: ${ramUsed}/${ramTotal} MB
│ System RAM: ${sysFree}/${sysRam} GB
│ Platform: ${platform}
│ Node: ${nodeVer}
╰⊷ *Powered By ${brandName}*`

    await sock.sendMessage(from, {
      text: text,
      edit: loadingMsg.key,
      react: { text: '✅', key: loadingMsg.key }
    })

  } catch (e) {
    console.error('Stats error:', e.message)
    await sock.sendMessage(from, { 
      text: `> Failed to get stats.` 
    }, { quoted: msg })
  }
}