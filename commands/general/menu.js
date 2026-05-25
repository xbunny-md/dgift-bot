// commands/general/menu.js
import os from 'os'
import { getAllCommands } from '../../lib/router.js'

export const name = 'menu'
export const alias = ['help', 'list', 'commands']
export const category = 'General'
export const desc = 'Displays the complete system interface panel dynamically categorized with server statistics'

/**
 * Highly Optimized Dynamic Menu Generation Engine
 */
export default async function executeAutonomousCommand(sock, { msg, from, pushName, sender }, botSettings) {
  try {
    await sock.sendMessage(from, { react: { text: '🐇', key: msg.key } })

    const totalUptimeSeconds = process.uptime()
    const calculationHours = Math.floor(totalUptimeSeconds / 3600)
    const calculationMinutes = Math.floor((totalUptimeSeconds % 3600) / 60)
    const calculationSeconds = Math.floor(totalUptimeSeconds % 60)
    const structuredUptimeString = `${calculationHours}h ${calculationMinutes}m ${calculationSeconds}s`

    const totalSystemMemoryBytes = os.totalmem()
    const freeSystemMemoryBytes = os.freem()
    const globalMemoryUtilizationRatio = (totalSystemMemoryBytes - freeSystemMemoryBytes) / totalSystemMemoryBytes
    const dynamicRamProgressBar = '█'.repeat(Math.round(globalMemoryUtilizationRatio * 10)) + '▒'.repeat(10 - Math.round(globalMemoryUtilizationRatio * 10))
    const totalRamUtilizationPercentage = Math.round(globalMemoryUtilizationRatio * 100)

    const underlyingOperatingPlatform = os.platform() === 'linux'? '🐧 Linux' : '🪟 Windows'
    const userIdentity = pushName || sender.split('@')[0]

    // Get commands from router.js
    const allCommands = getAllCommands()
    const dynamicCommandCatalog = {}

    for (const [cmdName, cmdData] of allCommands) {
      const category = (cmdData.category || 'Uncategorized').toUpperCase()
      if (!dynamicCommandCatalog[category]) dynamicCommandCatalog[category] = []
      dynamicCommandCatalog[category].push(cmdName)
    }

    const systemPrefixToken = botSettings.prefix || '.'
    const configuredBotName = botSettings.botname || 'Bot'
    const configuredOwnerName = botSettings.owner_name || 'Owner'
    const brandName = botSettings.brand_name || configuredOwnerName

    // Database based image URL with fallback
    const primaryMenuImage = botSettings.menu_image || null
    const fallbackMenuImage = 'https://i.ibb.co/1tM9QHF9/IMG-20260525-WA0076.jpg'

    let primaryConstructedMenuBuffer =
`╭──⌈ ${configuredBotName} ⌋
│ User: ${userIdentity}
│ Owner: ${configuredOwnerName}
│ Prefix: [ ${systemPrefixToken} ]
│ Platform: ${underlyingOperatingPlatform}
│ Uptime: ${structuredUptimeString}
│ RAM: ${dynamicRamProgressBar} ${totalRamUtilizationPercentage}%
╰────────────────\n\n`

    for (const cat of Object.keys(dynamicCommandCatalog).sort()) {
      primaryConstructedMenuBuffer += `╭──⌈ ${cat} ⌋\n`
      dynamicCommandCatalog[cat].sort().forEach(cmd => {
        primaryConstructedMenuBuffer += `│ ${systemPrefixToken}${cmd}\n`
      })
      primaryConstructedMenuBuffer += `╰────────────────\n\n`
    }

    primaryConstructedMenuBuffer += `*Powered by ${brandName}*`

    // Try primary image first, fallback if it fails
    const imageUrl = primaryMenuImage || fallbackMenuImage

    try {
      await sock.sendMessage(from, {
        image: { url: imageUrl },
        caption: primaryConstructedMenuBuffer
      }, { quoted: msg })
    } catch (err) {
      console.log('Primary menu image failed, using fallback:', err.message)
      await sock.sendMessage(from, {
        image: { url: fallbackMenuImage },
        caption: primaryConstructedMenuBuffer
      }, { quoted: msg })
    }

  } catch (e) {
    console.error('Menu Error:', e.message)
    await sock.sendMessage(from, { text: 'Menu failed to load. Try again.' }, { quoted: msg })
  }
}