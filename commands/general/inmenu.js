// commands/general/inmenu.js
// Special IN-MENU — Aggregates commands from photo.js, stalker.js, utility.js, ultimate.js & ALL files in commands/photo/
// Dynamic menu builder — auto-detects new files
import fs from 'fs'
import path from 'path'

export const name = 'inmenu'
export const alias = ['inmenu', 'fullmenu', 'commandlist', 'listcmd', 'menuall']
export const category = 'General'
export const desc = 'Comprehensive menu showing ALL commands from photo, stalker, utility, ultimate & more'

// ══════════════════════════════════════════════════
//  AUTO-DISCOVER COMMAND FILES
// ══════════════════════════════════════════════════
function discoverCommandFiles() {
  const files = []
  const baseDir = process.cwd()
  
  // Directories to scan
  const dirsToScan = [
    'commands/ai&photo',
    'commands/photo',
    'commands/stalker',
    'commands/utility',
    'commands/ultimate',
    'commands/general'
  ]
  
  for (const dir of dirsToScan) {
    const fullPath = path.join(baseDir, dir)
    if (fs.existsSync(fullPath)) {
      const items = fs.readdirSync(fullPath)
      for (const item of items) {
        if (item.endsWith('.js') && !item.startsWith('.')) {
          const filePath = path.join(fullPath, item)
          try {
            // Import module dynamically
            const mod = await import(`file://${filePath}`)
            if (mod.name && mod.alias && mod.category) {
              files.push({
                file: item,
                path: filePath,
                name: mod.name,
                alias: mod.alias,
                category: mod.category,
                desc: mod.desc || 'No description'
              })
            }
          } catch (err) {
            console.error(`⚠️  Failed to load ${filePath}:`, err.message)          }
        }
      }
    }
  }
  
  return files
}

// ══════════════════════════════════════════════════
//  BUILD BEAUTIFUL MENU
// ══════════════════════════════════════════════════
function buildMenu(commandFiles, prefix, brand) {
  // Group by category
  const byCategory = {}
  
  for (const file of commandFiles) {
    if (!byCategory[file.category]) {
      byCategory[file.category] = []
    }
    byCategory[file.category].push(file)
  }
  
  // Build menu
  let menu = `╭─⌈  *${brand} — COMPLETE COMMAND LIST* ⌋\n`
  menu += `│\n`
  menu += `│ 🔤 Prefix: *${prefix}*\n`
  menu += `│ 📂 Total Files: *${commandFiles.length}*\n`
  menu += `│ 📊 Categories: *${Object.keys(byCategory).length}*\n`
  menu += `│\n`
  
  let totalCommands = 0
  
  // Sort categories alphabetically
  const sortedCategories = Object.keys(byCategory).sort()
  
  for (const category of sortedCategories) {
    const files = byCategory[category]
    menu += `╰─ ${category.toUpperCase()} ⌋\n`
    
    for (const file of files) {
      const cmdCount = file.alias.length
      totalCommands += cmdCount
      
      // Emoji based on category
      const emoji = getEmojiForCategory(category)
      
      menu += `│\n`
      menu += `│ ${emoji} *${file.name}* (${cmdCount} commands)\n`
      menu += `│    ${file.desc}\n`      
      // Show first 5 commands, then "..." if more
      const commandsToShow = file.alias.slice(0, 8)
      for (const cmd of commandsToShow) {
        menu += `│    • ${prefix}${cmd}\n`
      }
      
      if (file.alias.length > 8) {
        menu += `│    • ... +${file.alias.length - 8} more\n`
      }
    }
    
    menu += `│\n`
  }
  
  // Summary
  menu += `╭─⌈ 📊 SUMMARY ⌋\n`
  menu += `│\n`
  menu += `│ 📦 Total Command Files: ${commandFiles.length}\n`
  menu += `│ 🎯 Total Commands: ${totalCommands}\n`
  menu += `│ 📂 Categories: ${sortedCategories.join(', ')}\n`
  menu += `│\n`
  menu += `│ 💡 Use: ${prefix}help <command> for details\n`
  menu += `│ 🔧 Bot is always improving!\n`
  menu += `│\n`
  menu += `╰⊷ *Powered By ${brand}*`
  
  return menu
}

function getEmojiForCategory(category) {
  const emojiMap = {
    'AI & Photo': '🎨',
    'Photo': '📸',
    'Stalker & OSINT': '🕵️',
    'All-in-One Utility': '🛠️',
    'Utility': '⚡',
    'Ultimate': '🔥',
    'General': '📋',
    'Creator Suite': '🎯',
    'Creator': '🎨',
    'default': '📦'
  }
  return emojiMap[category] || emojiMap['default']
}

// ══════════════════════════════════════════════════
//  MAIN EXPORT
// ══════════════════════════════════════════════════
export default async function inmenu(sock, ctx, botSettings) {  const { msg, from, sender } = ctx
  const prefix = botSettings?.prefix ?? botSettings?.bot_prefix ?? botSettings?.settings?.prefix ?? '.'
  const brand = botSettings?.brand_name ?? botSettings?.botname ?? process.env.BUILD_BRAND ?? 'Bot'
  
  const body =
    msg?.message?.conversation ||
    msg?.message?.extendedTextMessage?.text ||
    msg?.message?.imageMessage?.caption ||
    msg?.message?.videoMessage?.caption ||
    msg?.message?.documentMessage?.caption ||
    msg?.message?.buttonsResponseMessage?.selectedButtonId ||
    msg?.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
    msg?.message?.templateButtonReplyMessage?.selectedId ||
    ''
  
  if (!body?.startsWith(prefix)) return
  const withoutPrefix = body.slice(prefix.length).trim()
  const parts = withoutPrefix.split(/\s+/)
  const cmd = parts[0]?.toLowerCase()
  
  const CMDS = new Set(alias)
  if (!CMDS.has(cmd)) return
  
  // React with loading
  try {
    await sock.sendMessage(from, { react: { text: '📚', key: msg.key } })
  } catch {}
  
  // Discover all command files
  const commandFiles = await discoverCommandFiles()
  
  if (commandFiles.length === 0) {
    const reply = `╭─⌈ ERROR ⌋\n│\n│ ❌ No command files found!\n│\n│ 💡 Make sure files are in:\n│    • commands/ai&photo/\n│    • commands/photo/\n│    • commands/stalker/\n│    • commands/utility/\n│    • commands/ultimate/\n│\n╰⊷ *${brand}*`
    await sock.sendMessage(from, { text: reply }, { quoted: msg })
    return
  }
  
  // Build menu
  const menu = buildMenu(commandFiles, prefix, brand)
  
  // Send as text (might be long)
  try {
    await sock.sendMessage(from, { text: menu }, { quoted: msg })
  } catch (err) {
    // If too long, split into chunks
    const chunks = menu.match(/.{1,1500}/gs)
    for (const chunk of chunks) {
      await sock.sendMessage(from, { text: chunk }, { quoted: msg })
      await new Promise(r => setTimeout(r, 500))
    }  }
  
  // React with success
  try {
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })
  } catch {}
}