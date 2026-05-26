// commands/general/menu.js
import os from 'os'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const name = 'menu'
export const alias = ['help','commands','cmds']
export const category = 'General'
export const desc = 'Displays the complete system interface panel dynamically'

async function scanCommands() {
  const commandsDir = path.join(__dirname, '../../commands')
  const catalog = {}

  if (!fs.existsSync(commandsDir)) return catalog

  try {
    const categories = fs.readdirSync(commandsDir)

    for (const cat of categories) {
      const catPath = path.join(commandsDir, cat)
      if (!fs.statSync(catPath).isDirectory()) continue

      try {
        const files = fs.readdirSync(catPath).filter(f => f.endsWith('.js'))
        if (files.length === 0) continue

        const cmdNames = []
        for (const file of files) {
          try {
            const cmdName = file.replace('.js', '')
            cmdNames.push(cmdName)
          } catch {
            continue
          }
        }

        if (cmdNames.length > 0) {
          catalog[cat.toUpperCase()] = cmdNames.sort()
        }
      } catch {
        continue
      }
    }
  } catch {
    return catalog
  }

  return catalog
}

export default async function executeAutonomousCommand(sock, { msg, from, pushName, sender }, botSettings) {
  try {
    await sock.sendMessage(from, { react: { text: '🌀', key: msg.key } })

    // System stats
    const totalSeconds = process.uptime()
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = Math.floor(totalSeconds % 60)
    const uptimeString = `${hours}h ${minutes}m ${seconds}s`

    const totalMem = os.totalmem()
    const freeMem = os.freem()
    const usedPercent = Math.round(((totalMem - freeMem) / totalMem) * 100)
    const ramBar = '█'.repeat(Math.round(usedPercent / 10)) + '▒'.repeat(10 - Math.round(usedPercent / 10))

    const platform = process.env.RENDER_SERVICE_NAME? 'Render Cloud' : os.platform()
    const user = pushName || sender.split('@')[0]

    // Scan commands from files only
    const dynamicCommandCatalog = await scanCommands()

    const prefix = botSettings?.prefix || '.'
    const botName = botSettings?.botname || 'DGIFT BOT'
    const owner = botSettings?.owner_name || 'Owner'

    // Build menu
    let menu = `╭──⌈ ${botName} ⌋
│ User: ${user}
│ Owner: ${owner}
│ Prefix: [ ${prefix} ]
│ Platform: ${platform}
│ Uptime: ${uptimeString}
│ RAM: ${ramBar} ${usedPercent}%
╰────────────────\n\n`

    const cats = Object.keys(dynamicCommandCatalog).sort()
    for (const cat of cats) {
      menu += `╭──⌈ ${cat} ⌋\n`
      dynamicCommandCatalog[cat].forEach(cmd => {
        menu += `│ ${prefix}${cmd}\n`
      })
      menu += `╰────────────────\n\n`
    }

    menu += `*Powered By ${botName}*`

    // Send with image from ENV
    const imageUrl = process.env.IMAGE_URL

    if (imageUrl) {
      try {
        await sock.sendMessage(from, {
          image: { url: imageUrl },
          caption: menu
        }, { quoted: msg })
      } catch (imgErr) {
        console.log('[MENU] Image failed:', imgErr.message)
        await sock.sendMessage(from, { text: menu }, { quoted: msg })
      }
    } else {
      await sock.sendMessage(from, { text: menu }, { quoted: msg })
    }

    await sock.sendMessage(from, { react: { text: '✨', key: msg.key } })

  } catch (error) {
    console.error('[MENU COMMAND SYSTEM EXCEPTION]', error.message)
    await sock.sendMessage(from, { text: `[ERROR] Menu generation failed.` }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}