// commands/general/stats.js
import os from 'os'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function countCommands() {
  const commandsDir = path.join(__dirname, '../../commands')
  let cmdCount = 0
  const categories = new Set()

  if (!fs.existsSync(commandsDir)) return { cmdCount: 0, catCount: 0 }

  try {
    const folders = fs.readdirSync(commandsDir)
    
    for (const folder of folders) {
      const folderPath = path.join(commandsDir, folder)
      if (!fs.statSync(folderPath).isDirectory()) continue

      try {
        const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.js'))
        if (files.length > 0) {
          categories.add(folder.toUpperCase())
          cmdCount += files.length
        }
      } catch {
        continue
      }
    }
  } catch {
    return { cmdCount: 0, catCount: 0 }
  }

  return { cmdCount, catCount: categories.size }
}

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

    // Commands from filesystem
    const { cmdCount, catCount } = await countCommands()

    // System info
    const botName = botSettings?.botname || 'DGIFT BOT'
    const ownerName = botSettings?.owner_name || 'Owner'
    const brandName = botSettings?.brand_name || ownerName
    const prefix = botSettings?.prefix || '.'
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
│ Categories: ${catCount}
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