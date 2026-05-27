import { readdirSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const commands = new Map()
const aliases = new Map()
const observers = []
let isLoaded = false

function normalizeJid(jid) {
  if (!jid) return null
  if (jid === 'status@broadcast') return jid
  jid = jid.split(':')[0]
  return jid.toLowerCase()
}

function toNumber(jid) {
  if (!jid) return ''
  return jid.split('@')[0].replace(/[^0-9]/g, '')
}

function resolveLid(participants, lid) {
  if (!lid ||!lid.endsWith('@lid')) return lid
  const found = participants.find(p => p.id === lid)
  return found?.jid || lid
}

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
          console.log(`[WARN] Skipped ${item}: Missing name or default export`)
          continue
        }
        const cmdName = commandModule.name.toLowerCase()
        const cmdData = {
          name: cmdName,
          alias: commandModule.alias || [],
          category: commandModule.category || 'General',
          desc: commandModule.desc || 'No description',
          restricted: commandModule.restricted || false,
          run: commandModule.default
        }
        if (commands.has(cmdName)) {
          const existingCmd = commands.get(cmdName)
          console.log(`[WARN] Command ${cmdName} from ${cmdData.category} overwrote ${existingCmd.category}`)
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

async function loadObservers(dir) {
  try {
    const observerFiles = readdirSync(dir).filter(file => file.endsWith('.js'))
    for (const file of observerFiles) {
      try {
        await new Promise(resolve => setTimeout(resolve, 50))
        const filePath = pathToFileURL(join(dir, file)).href
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

async function formatBox(title, content, footer, botSettings) {
  try {
    const designName = botSettings?.box_design || 'classic'
    const designPath = join(__dirname, '..', 'designs', `${designName}.js`)
    const designModule = await import(pathToFileURL(designPath).href)
    if (typeof designModule.default === 'function') {
      return designModule.default({ title, content, footer, brand: botSettings?.brand_name || botSettings?.owner_name || 'Bot' })
    }
  } catch (err) {
    console.log(`[WARN] Design load failed: ${err.message}`)
  }
  return `╭─⌈ ${title} ⌋\n│ ${content}\n╰⊷ ${footer}`
}

export async function initializeRouter(botSettings) {
  if (isLoaded) return
  console.log('[INIT] Loading commands and observers...')
  const commandsPath = join(__dirname, '..', 'commands')
  const observersPath = join(__dirname, '..', 'observers')
  await loadCommands(commandsPath)
  await loadObservers(observersPath)
  isLoaded = true
  const brand = botSettings?.brand_name || botSettings?.owner_name || 'Bot'
  console.log(`[INIT] Total commands loaded: ${commands.size}`)
  console.log(`[INIT] Total observers loaded: ${observers.length}`)
  console.log(`[INIT] Powered by ${brand}`)
}

export function getAllCommands() {
  return Array.from(commands.values())
}

export function getAllObservers() {
  return observers.map(o => ({ name: o.name }))
}

export async function handleMessages(sock, m, botSettings) {
  try {
    if (m.type!== 'notify') return
    const msg = m.messages[0]
    if (!msg.message) return

    const { body, msgType, isViewOnce, reaction } = extractMessage(msg)
    const from = normalizeJid(msg.key.remoteJid)
    const isGroup = from.endsWith('@g.us')
    const isStatus = from === 'status@broadcast'

    let sender = isGroup? msg.key.participant : from
    sender = normalizeJid(sender)

    const pushName = msg.pushName || 'User'

    let isBotAdmin = false
    let groupMetadata = null
    let participants = []

    if (isGroup) {
      try {
        groupMetadata = await sock.groupMetadata(from)
        participants = groupMetadata.participants
        sender = resolveLid(participants, sender)
        sender = normalizeJid(sender)
        const botParticipant = participants.find(p => normalizeJid(p.id) === normalizeJid(sock.user.id))
        isBotAdmin = botParticipant?.admin!== null
      } catch (err) {
        console.log('Group metadata error:', err.message)
      }
    }

    const contextInfo = msg.message?.extendedTextMessage?.contextInfo
    if (contextInfo) {
      if (contextInfo.mentionedJid?.length > 0) {
        contextInfo.mentionedJid = contextInfo.mentionedJid.map(jid => normalizeJid(resolveLid(participants, jid)))
      }
      if (contextInfo.participant) {
        contextInfo.participant = normalizeJid(resolveLid(participants, contextInfo.participant))
      }
    }

    const ownerNumber = botSettings?.owner_number || ''
    const vipNumbers = botSettings?.vip_numbers || []
    const restrictedCategories = botSettings?.restricted_categories || ['Settings', 'Auto', 'Anti', 'Owner']

    const senderNumber = toNumber(sender)
    const isOwner = senderNumber === toNumber(ownerNumber)
    const isVIP = vipNumbers.includes(senderNumber)
    const isFromMe = normalizeJid(sender) === normalizeJid(sock.user.id)
    const isAdmin = isOwner || isVIP

    const stableMode = botSettings?.stable_mode!== false
    const antiBanMode = botSettings?.anti_ban_mode === true

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
          isOwner,
          isVIP,
          isFromMe,
          isBotAdmin,
          groupMetadata,
          stableMode,
          antiBanMode,
          botSettings
        }, botSettings)
      } catch (err) {
        console.log(`Observer ${observer.name} error:`, err.message)
      }
    }

    if (!body &&!reaction) return
    if (!body.startsWith(botSettings.prefix)) return

    const args = body.slice(botSettings.prefix.length).trim().split(/ +/)
    const providedName = args.shift()?.toLowerCase()
    if (!providedName) return

    const matchedCommands = new Set()
    if (commands.has(providedName)) matchedCommands.add(providedName)
    if (aliases.has(providedName)) {
      aliases.get(providedName).forEach(cmd => matchedCommands.add(cmd))
    }

    const matchArray = Array.from(matchedCommands)
    if (matchArray.length === 0) return

    const brand = botSettings?.brand_name || botSettings?.owner_name || 'Bot'
    const formatBoxFn = async (title, content, footer) => {
      return await formatBox(title, content, footer, botSettings)
    }

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
      isOwner,
      isVIP,
      isFromMe,
      isBotAdmin,
      groupMetadata,
      stableMode,
      antiBanMode,
      formatBox: formatBoxFn,
      botSettings
    }

    let command = null
    if (commands.has(providedName)) {
      command = commands.get(providedName)
    } else if (matchArray.length === 1) {
      const commandName = matchArray[0]
      command = commands.get(commandName)
      cmdContext.commandName = commandName
    }

    if (!command) {
      if (matchArray.length > 1) {
        let listText = `"${providedName}" matches ${matchArray.length} commands:\n\n`
        matchArray.forEach((cmdName, index) => {
          const cmd = commands.get(cmdName)
          listText += `${index + 1}. ${botSettings.prefix}${cmdName} - ${cmd.desc} [${cmd.category}]\n`
        })
        listText += `\nType the exact command you meant.\nPowered by ${brand}`
        const formatted = await formatBox('Command Ambiguous', listText, `Powered By ${brand}`)
        await sock.sendMessage(from, { text: formatted }, { quoted: msg })
      }
      return
    }

    const ownerMode = botSettings?.owner_mode === true
    const publicMode = botSettings?.public_mode === true
    const privatePublicMode = botSettings?.private_public_mode === true
    const isRestricted = command.restricted === true || restrictedCategories.includes(command.category)

    let allowed = false
    if (ownerMode) {
      allowed = isAdmin
    } else if (publicMode) {
      allowed = true
    } else if (privatePublicMode) {
      allowed =!isRestricted || isAdmin
    } else {
      allowed = true
    }

    if (!allowed) {
      const deniedMsg = await formatBox('Access Denied', 'You do not have permission to use this command.', `Powered By ${brand}`)
      await sock.sendMessage(from, { text: deniedMsg }, { quoted: msg })
      return
    }

    console.log(`[CMD] ${command.name} from ${pushName} [${sender}]`)
    await command.run(sock, cmdContext, botSettings)

  } catch (err) {
    console.log('Handle message error:', err.message)
  }
}