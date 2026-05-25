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

// 1. LOAD COMMANDS RECURSIVE - DUPLICATE CHECK + OVERWRITE
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

        if (!commandModule.name || typeof commandModule.default !== 'function') {
          console.log(`[WARN] Skipped ${item}: Missing 'name' or default export`)
          continue
        }

        const cmdName = commandModule.name.toLowerCase()
        const cmdCategory = commandModule.category || 'General'

        const cmdData = {
          name: cmdName,
          alias: commandModule.alias || [],
          category: cmdCategory,
          desc: commandModule.desc || 'No description',
          run: commandModule.default
        }

        if (commands.has(cmdName)) {
          const existingCmd = commands.get(cmdName)
          console.log(`[WARN] Command '${cmdName}' from [${cmdCategory}] overwrote [${existingCmd.category}]`)
        }

        commands.set(cmdData.name, cmdData)

        for (const alias of cmdData.alias) {
          const aliasKey = alias.toLowerCase()
          if (!aliases.has(aliasKey)) {
            aliases.set(aliasKey, [])
          }
          aliases.get(aliasKey).push(cmdData.name)
        }

        console.log(`[OK] Loaded: ${cmdData.name} [${cmdData.category}]`)
      } catch (err) {
        console.log(`[WARN] Skipped ${item}: ${err.message.split('\n')[0]}`)
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
          console.log(`[OK] Loaded observer: ${file.replace('.js', '')}`)
        }
      } catch (err) {
        console.log(`[WARN] Skipped observer ${file}: ${err.message.split('\n')[0]}`)
      }
    }
  } catch (err) {
    console.log('No observers folder found. Skipping.')
  }
}

// 3. INIT
export async function initializeRouter(botSettings) {
  if (isLoaded) return
  console.log('[INIT] Loading commands and observers...')
  const commandsPath = join(__dirname, '..', 'commands')
  await loadCommands(commandsPath)
  await loadObservers()
  isLoaded = true
  const brand = botSettings?.brand_name || botSettings?.owner_name || 'Bot'
  console.log(`[INIT] Total commands loaded: ${commands.size}`)
  console.log(`[INIT] Powered by ${brand}`)
}

// 4. EXPORT COMMANDS
export function getAllCommands() {
  return commands
}

// 5. LID TO JID RESOLVER
function resolveLid(participants, lid) {
  if (!lid || !lid.endsWith('@lid')) return lid
  const found = participants.find(p => p.id === lid)
  return found?.jid || lid
}

// 6. EXTRACT MESSAGE TYPE AND CONTENT
function extractMessage(msg) {
  const message = msg.message
  if (!message) return { body: '', msgType: 'unknown', isViewOnce: false }

  let body = ''
  let msgType = 'unknown'
  let isViewOnce = false

  if (message.conversation) {
    body = message.conversation
    msgType = 'conversation'
  } else if (message.extendedTextMessage) {
    body = message.extendedTextMessage.text || ''
    msgType = 'extendedTextMessage'
  } else if (message.imageMessage) {
    body = message.imageMessage.caption || ''
    msgType = 'imageMessage'
    isViewOnce = message.imageMessage.viewOnce === true
  } else if (message.videoMessage) {
    body = message.videoMessage.caption || ''
    msgType = 'videoMessage'
    isViewOnce = message.videoMessage.viewOnce === true
  } else if (message.audioMessage) {
    body = ''
    msgType = 'audioMessage'
    isViewOnce = message.audioMessage.viewOnce === true
  } else if (message.documentMessage) {
    body = message.documentMessage.caption || ''
    msgType = 'documentMessage'
  } else if (message.reactionMessage) {
    body = message.reactionMessage.text || ''
    msgType = 'reactionMessage'
  } else if (message.viewOnceMessageV2) {
    const inner = message.viewOnceMessageV2.message
    if (inner.imageMessage) {
      body = inner.imageMessage.caption || ''
      msgType = 'imageMessage'
      isViewOnce = true
    } else if (inner.videoMessage) {
      body = inner.videoMessage.caption || ''
      msgType = 'videoMessage'
      isViewOnce = true
    } else if (inner.audioMessage) {
      body = ''
      msgType = 'audioMessage'
      isViewOnce = true
    }
  }

  return { body, msgType, isViewOnce, reaction: message.reactionMessage || null }
}

// 7. MAIN HANDLER
export async function handleMessages(sock, m, botSettings) {
  try {
    if (m.type !== 'notify') return
    const msg = m.messages[0]
    if (!msg.message) return

    const { body, msgType, isViewOnce, reaction } = extractMessage(msg)

    const from = msg.key.remoteJid
    const isGroup = from.endsWith('@g.us')
    const isStatus = from === 'status@broadcast'
    let sender = isGroup ? msg.key.participant : from
    const pushName = msg.pushName || 'User'

    // Admin check
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

        isAdmin = userParticipant?.admin !== null
        isBotAdmin = botParticipant?.admin !== null
        sender = resolveLid(participants, sender)
      } catch (err) {
        console.log('Group metadata error:', err.message)
      }
    }

    // Resolve mentions & reply LIDs
    const contextInfo = msg.message?.extendedTextMessage?.contextInfo
    if (contextInfo) {
      if (contextInfo.mentionedJid?.length > 0) {
        contextInfo.mentionedJid = contextInfo.mentionedJid.map(jid => resolveLid(participants, jid))
      }
      if (contextInfo.participant) {
        contextInfo.participant = resolveLid(participants, contextInfo.participant)
      }
    }

    // RUN OBSERVERS - full access including reactions and viewonce
    for (const observer of observers) {
      try {
        await observer.run(sock, {
          msg,
          from,
          sender,
          body,
          msgType,
          isViewOnce,
          reaction,
          isGroup,
          isStatus,
          pushName,
          isAdmin,
          isBotAdmin,
          groupMetadata
        }, botSettings)
      } catch (err) {
        console.log(`Observer ${observer.name} error:`, err.message)
      }
    }

    // Skip if no body and no reaction
    if (!body && !reaction) return
    if (!body.startsWith(botSettings.prefix)) return

    // GET COMMAND
    const args = body.slice(botSettings.prefix.length).trim().split(/ +/)
    const providedName = args.shift()?.toLowerCase()
    if (!providedName) return

    // COLLECT MATCHES
    const matchedCommands = new Set()
    if (commands.has(providedName)) matchedCommands.add(providedName)
    if (aliases.has(providedName)) {
      aliases.get(providedName).forEach(cmd => matchedCommands.add(cmd))
    }

    const matchArray = Array.from(matchedCommands)
    if (matchArray.length === 0) return

    const brand = botSettings?.brand_name || botSettings?.owner_name || 'Bot'
    const cmdContext = {
      msg,
      from,
      sender,
      args,
      isGroup,
      isStatus,
      pushName,
      body,
      msgType,
      isViewOnce,
      reaction,
      commandName: providedName,
      isAdmin,
      isBotAdmin,
      groupMetadata
    }

    // EXACT MATCH
    if (commands.has(providedName)) {
      const command = commands.get(providedName)
      console.log(`[CMD] ${providedName} from ${pushName} [${sender}]`)
      await command.run(sock, cmdContext, botSettings)
      return
    }

    // MULTIPLE MATCHES
    if (matchArray.length > 1) {
      let listText = `🤔 "${providedName}" matches ${matchArray.length} commands:\n\n`
      matchArray.forEach((cmdName, index) => {
        const cmd = commands.get(cmdName)
        listText += `${index + 1}. *${botSettings.prefix}${cmdName}* - ${cmd.desc} [${cmd.category}]\n`
      })
      listText += `\nType the exact command you meant 👇\n*Powered by ${brand}*`
      await sock.sendMessage(from, { text: listText }, { quoted: msg })
      return
    }

    // SINGLE ALIAS MATCH
    if (matchArray.length === 1) {
      const commandName = matchArray[0]
      const command = commands.get(commandName)
      cmdContext.commandName = commandName
      console.log(`[CMD] ${commandName} via alias ${providedName} from ${pushName}`)
      await command.run(sock, cmdContext, botSettings)
      return
    }

  } catch (err) {
    console.log('Handle message error:', err.message)
  }
}