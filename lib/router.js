// lib/router.js
import { readdirSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const commands = new Map()
const aliases = new Map()
const observers = []
let isLoaded = false

// 1. LOAD COMMANDS RECURSIVE - DUPLICATE CHECK + ERROR HANDLING
async function loadCommands(dir) {
  const items = readdirSync(dir)

  for (const item of items) {
    const fullPath = join(dir, item)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      await loadCommands(fullPath)
    } else if (item.endsWith('.js')) {
      try {
        await new Promise(resolve => setTimeout(resolve, 50))
        const filePath = pathToFileURL(fullPath).href
        const commandModule = await import(filePath)

        if (!commandModule.name || typeof commandModule.default!== 'function') {
          console.log(`⚠️ Skipped ${item}: Missing 'name' or default export`)
          continue
        }

        const cmdName = commandModule.name.toLowerCase()
        const cmdCategory = commandModule.category || 'General'

        // ✅ DUPLICATE COMMAND CHECK - PREVENTS OVERWRITE
        if (commands.has(cmdName)) {
          const existingCmd = commands.get(cmdName)
          console.log(`⚠️ Duplicate command '${cmdName}' found in [${cmdCategory}]. Keeping first from [${existingCmd.category}]. Skipping.`)
          continue
        }

        const cmdData = {
          name: cmdName,
          alias: commandModule.alias || [],
          category: cmdCategory,
          desc: commandModule.desc || 'No description',
          run: commandModule.default
        }

        commands.set(cmdData.name, cmdData)

        // Store aliases: alias -> array of command names
        for (const alias of cmdData.alias) {
          const aliasKey = alias.toLowerCase()
          if (!aliases.has(aliasKey)) {
            aliases.set(aliasKey, [])
          }
          aliases.get(aliasKey).push(cmdData.name)
        }

        console.log(`✅ Loaded: ${cmdData.name} [${cmdData.category}]`)
      } catch (err) {
        console.log(`⚠️ Skipped ${item}: ${err.message.split('\n')[0]}`)
      }
    }
  }
}

// 2. LOAD OBSERVERS
async function loadObservers() {
  const observersPath = join(__dirname, '..', 'observers')
  try {
    const observerFiles = readdirSync(observersPath).filter(file => file.endsWith('.js'))
    for (const file of observerFiles) {
      try {
        await new Promise(resolve => setTimeout(resolve, 50))
        const filePath = pathToFileURL(join(observersPath, file)).href
        const observer = await import(filePath)
        if (typeof observer.default === 'function') {
          observers.push({
            name: file.replace('.js', ''),
            run: observer.default
          })
          console.log(`✅ Loaded observer: ${file.replace('.js', '')}`)
        }
      } catch (err) {
        console.log(`⚠️ Skipped observer ${file}: ${err.message.split('\n')[0]}`)
      }
    }
  } catch (err) {
    console.log('No observers folder found. Skipping.')
  }
}

// 3. INIT - Powered by Dgift Bot
export async function initializeRouter() {
  if (isLoaded) return
  console.log('🔄 Loading commands and observers...')
  const commandsPath = join(__dirname, '..', 'commands')
  await loadCommands(commandsPath)
  await loadObservers()
  isLoaded = true
  console.log(`🚀 Total commands loaded: ${commands.size}`)
  console.log(`🎁 Powered by Dgift Bot`)
}

// 4. EXPORT COMMANDS
export function getAllCommands() {
  return commands
}

// 5. LID TO JID RESOLVER - CONVERTS LID TO REAL JID
function resolveLid(participants, lid) {
  if (!lid ||!lid.endsWith('@lid')) return lid
  const found = participants.find(p => p.id === lid)
  return found?.jid || lid // If not found, return LID itself
}

// 6. MAIN HANDLER - ADMIN CHECK + LID RESOLVER + FULL OBSERVER PERMISSIONS
export async function handleMessages(sock, m, botSettings) {
  try {
    if (m.type!== 'notify') return
    const msg = m.messages[0]
    if (!msg.message) return

    // Prevent infinite loop: ignore commands from bot itself
    if (msg.key.fromMe) {
      const body = msg.message.conversation ||
                   msg.message.extendedTextMessage?.text ||
                   msg.message.imageMessage?.caption ||
                   msg.message.videoMessage?.caption || ''
      if (body.startsWith(botSettings.prefix)) return
    }

    const from = msg.key.remoteJid
    const isGroup = from.endsWith('@g.us')
    const isStatus = from === 'status@broadcast'
    let sender = isGroup? msg.key.participant : from
    const pushName = msg.pushName || 'User'

    // ✅ ADMIN CHECK + GROUP METADATA - FIX FOR TAGALL
    let isAdmin = false
    let isBotAdmin = false
    let groupMetadata = null
    let participants = []

    if (isGroup) {
      try {
        groupMetadata = await sock.groupMetadata(from)
        participants = groupMetadata.participants
        const userParticipant = participants.find(p => p.id === sender)
        const botParticipant = participants.find(p => p.id === sock.user.id)

        isAdmin = userParticipant?.admin!== null
        isBotAdmin = botParticipant?.admin!== null

        // ✅ RESOLVE SENDER LID TO JID - FIX FOR GETPP, KICK, PROMOTE
        sender = resolveLid(participants, sender)
      } catch (err) {
        console.log('Group metadata error:', err.message)
      }
    }

    const body = msg.message.conversation ||
                 msg.message.extendedTextMessage?.text ||
                 msg.message.imageMessage?.caption ||
                 msg.message.videoMessage?.caption || ''

    // ✅ RESOLVE MENTIONS & REPLY LIDS - HELPS 50+ COMMANDS
    const contextInfo = msg.message?.extendedTextMessage?.contextInfo
    if (contextInfo) {
      // Resolve mentioned JIDs - getpp @user, kick @user
      if (contextInfo.mentionedJid && contextInfo.mentionedJid.length > 0) {
        contextInfo.mentionedJid = contextInfo.mentionedJid.map(jid => resolveLid(participants, jid))
      }
      // Resolve replied participant - getpp when replying
      if (contextInfo.participant) {
        contextInfo.participant = resolveLid(participants, contextInfo.participant)
      }
    }

    // ✅ RUN OBSERVERS - FULL PERMISSIONS: antidelete, autoview, autoreact, antilink, antispam, antitag, antitoxic, anticall, antiedit, goodbye, welcome, autogreet
    for (const observer of observers) {
      try {
        await observer.run(sock, {
          msg, // msg now has mentionedJid and participant converted to JID
          from,
          sender, // Now real JID not LID
          body,
          isGroup,
          isStatus, // For autoview status
          pushName,
          isAdmin, // For antilink, antispam
          isBotAdmin, // For antidelete, kick
          groupMetadata // For all group data
        }, botSettings)
      } catch (err) {
        console.log(`Observer ${observer.name} error:`, err.message)
      }
    }

    // CHECK PREFIX
    if (!body.startsWith(botSettings.prefix)) return

    // GET COMMAND
    const args = body.slice(botSettings.prefix.length).trim().split(/ +/)
    const providedName = args.shift().toLowerCase()

    if (!providedName) return

    // NEW LOGIC: COLLECT ALL MATCHES
    const matchedCommands = new Set()

    // 1. Check if it's an exact command name - HIGHEST PRIORITY
    if (commands.has(providedName)) {
      matchedCommands.add(providedName)
    }

    // 2. Check if it's an alias of other commands
    if (aliases.has(providedName)) {
      const aliasCommands = aliases.get(providedName)
      aliasCommands.forEach(cmd => matchedCommands.add(cmd))
    }

    const matchArray = Array.from(matchedCommands)

    // NO MATCH FOUND
    if (matchArray.length === 0) return

    // EXACT MATCH EXISTS = RUN IT DIRECTLY
    if (commands.has(providedName)) {
      const command = commands.get(providedName)
      console.log(`Command: ${providedName} from ${pushName} [${sender}]`)
      // ✅ SENDING isAdmin and isBotAdmin - FIX FOR TAGALL, REVOKE, HIDETAG
      await command.run(sock, {
        msg,
        from,
        sender,
        args,
        isGroup,
        isStatus,
        pushName,
        body,
        commandName: providedName,
        isAdmin,
        isBotAdmin,
        groupMetadata
      }, botSettings)
      return
    }

    // MULTIPLE MATCHES BUT NO EXACT MATCH = ASK USER
    if (matchArray.length > 1) {
      let listText = `🤔 *"${providedName}"* is used by ${matchArray.length} commands:\n\n`

      matchArray.forEach((cmdName, index) => {
        const cmd = commands.get(cmdName)
        listText += `${index + 1}. *${botSettings.prefix}${cmdName}* - ${cmd.desc} [${cmd.category}]\n`
      })

      listText += `\nPlease type the exact command you meant 👇\n\n`
      listText += `*Powered by Dgift Bot*`

      await sock.sendMessage(from, { text: listText }, { quoted: msg })
      return
    }

    // ONLY ONE MATCH AND IT'S FROM ALIAS = RUN IT
    if (matchArray.length === 1) {
      const commandName = matchArray[0]
      const command = commands.get(commandName)
      console.log(`Command: ${commandName} from ${pushName} [${sender}] via alias: ${providedName}`)
      await command.run(sock, {
        msg,
        from,
        sender,
        args,
        isGroup,
        isStatus,
        pushName,
        body,
        commandName,
        isAdmin,
        isBotAdmin,
        groupMetadata
      }, botSettings)
      return
    }

  } catch (err) {
    console.log('Handle message error:', err.message)
  }
}