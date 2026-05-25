// commands/general/menu.js
import os from 'os'
import { getAllCommands } from '../../lib/router.js'

export const name = 'menu'
export const alias = ['help', 'list', 'commands']
export const category = 'General'
export const desc = 'Display command list and system status'

export default async function executeAutonomousCommand(sock, { msg, from, pushName, sender }, botSettings) {
  try {
    await sock.sendMessage(from, { react: { text: '🐇', key: msg.key } }).catch(() => {})

    // System stats
    const uptime = process.uptime()
    const hours = Math.floor(uptime / 3600)
    const minutes = Math.floor((uptime % 3600) / 60)
    const seconds = Math.floor(uptime % 60)
    const uptimeStr = `${hours}h ${minutes}m ${seconds}s`

    const totalMem = os.totalmem()
    const freeMem = os.freem()
    const usedMem = totalMem - freeMem
    const memPercent = Math.round((usedMem / totalMem) * 100)
    const filled = Math.round((usedMem / totalMem) * 10)
    const ramBar = '█'.repeat(filled) + '▒'.repeat(10 - filled)

    const platform = os.platform() === 'linux'? 'Linux' : 'Windows'
    const user = pushName || sender.split('@')[0]

    // Get commands - skip broken ones
    const commandList = {}
    const allCommands = getAllCommands()

    for (const [cmdName, cmdData] of allCommands) {
      try {
        if (!cmdName ||!cmdData) continue
        const category = (cmdData.category || 'Uncategorized').toUpperCase()
        if (!commandList[category]) commandList[category] = []
        commandList[category].push(cmdName)
      } catch (e) {
        continue // skip broken command
      }
    }

    const prefix = botSettings?.prefix || '.'
    const botName = botSettings?.botname || 'Bot'
    const ownerName = botSettings?.owner_name || 'Owner'
    const brandName = botSettings?.brand_name || ownerName

    // Build menu text
    let menuText = `╭──⌈ ${botName} ⌋
│ User: ${user}
│ Owner: ${ownerName}
│ Prefix: [ ${prefix} ]
│ Platform: ${platform}
│ Uptime: ${uptimeStr}
│ RAM: ${ramBar} ${memPercent}%
╰────────────────\n\n`

    for (const cat of Object.keys(commandList).sort()) {
      menuText += `╭──⌈ ${cat} ⌋\n`
      commandList[cat].sort().forEach(cmd => {
        menuText += `│ ${prefix}${cmd}\n`
      })
      menuText += `╰────────────────\n\n`
    }

    menuText += `*Powered by ${brandName}*`

    // Force image - never fail
    const imageUrl = 'https://i.ibb.co/1tM9QHF9/IMG-20260525-WA0076.jpg'

    try {
      await sock.sendMessage(from, {
        image: { url: imageUrl },
        caption: menuText
      }, { quoted: msg })
    } catch (err) {
      console.log('Image failed, sending text only:', err.message)
      await sock.sendMessage(from, { text: menuText }, { quoted: msg })
    }

  } catch (e) {
    console.error('Menu Error:', e.message)
    await sock.sendMessage(from, {
      text: 'Menu failed to load. Try again later.'
    }, { quoted: msg }).catch(() => {})
  }
}