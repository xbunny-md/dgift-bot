// commands/general/menu.js
import os from 'os'
import { getAllCommands } from '../../lib/router.js'

export const name = 'menu'
export const alias = ['help', 'list', 'commands']
export const category = 'General'
export const desc = 'Show all commands and bot info'

export default async function menu(sock, { msg, from, pushName, sender }, botSettings) {
  try {
    await sock.sendMessage(from, { react: { text: '🐇', key: msg.key } })

    const uptimeSec = process.uptime()
    const hours = Math.floor(uptimeSec / 3600)
    const minutes = Math.floor((uptimeSec % 3600) / 60)
    const seconds = Math.floor(uptimeSec % 60)
    const uptimeStr = `${hours}h ${minutes}m ${seconds}s`

    const totalMem = os.totalmem()
    const freeMem = os.freem()
    const usedMemRatio = (totalMem - freeMem) / totalMem
    const ramBar = '█'.repeat(Math.round(usedMemRatio * 10)) + '▒'.repeat(10 - Math.round(usedMemRatio * 10))
    const ramPercent = Math.round(usedMemRatio * 100)

    const platform = os.platform() === 'linux'? '🐧 Linux' : '🪟 Windows'
    const user = pushName || sender.split('@')[0]

    const allCommands = getAllCommands()
    const commandsByCat = {}

    for (const [cmdName, cmdData] of allCommands) {
      const cat = (cmdData.category || 'Other').toUpperCase()
      if (!commandsByCat[cat]) commandsByCat[cat] = []
      commandsByCat[cat].push(cmdName)
    }

    const prefix = botSettings.prefix || '.'
    const botName = botSettings.botname || 'bot'
    const ownerName = botSettings.owner_name || 'Owner'
    const brandName = botSettings.brand_name || ownerName
    const menuImage = botSettings.menu_image || null

    let menuText =
`╭──⌈ ${botName} ⌋
│ User: ${user}
│ Owner: ${ownerName}
│ Prefix: ${prefix}
│ Platform: ${platform}
│ Uptime: ${uptimeStr}
│ RAM: ${ramBar} ${ramPercent}%
╰────────────────

`

    for (const cat of Object.keys(commandsByCat).sort()) {
      menuText += `╭──⌈ ${cat} ⌋\n`
      commandsByCat[cat].sort().forEach(cmd => {
        menuText += `│ ${prefix}${cmd}\n`
      })
      menuText += `╰────────────────\n\n`
    }

    menuText += `**Powered by ${brandName}**`

    if (menuImage) {
      await sock.sendMessage(from, {
        image: { url: menuImage },
        caption: menuText
      }, { quoted: msg })
    } else {
      await sock.sendMessage(from, { text: menuText }, { quoted: msg })
    }

  } catch (e) {
    console.error("Menu Error:", e.message)
    await sock.sendMessage(from, { text: "Menu failed to load. Try again." }, { quoted: msg })
  }
}