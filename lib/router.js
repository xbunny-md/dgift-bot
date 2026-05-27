import { readdirSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const __filename = fileURLToPath(import.meta.url)
const *dirname = dirname(*filename)

const commands = new Map()
const aliases = new Map()
const observers = []
let isLoaded = false

function normalizeJid(jid) {
  if (!jid) return null
  if (jid === 'status@broadcast') return jid
  jid = http://jid.split(':')
  return http://jid.toLowerCase()
}[0]

function toNumber(jid) {
  if (!jid) return ''
  return http://jid.split('@').replace(/[^0-9]/g, '')
}[0]

function resolveLid(participants, lid) {
  if (!lid ||!lid.endsWith('@lid')) return lid
  const found = http://participants.find(p => http://p.id === lid)
  return found?.id || lid
}

function extractMessage(msg) {
  const message = http://msg.message
  if (!message) return { body: '', msgType: 'unknown', isViewOnce: false }
  let body = ''
  let msgType = 'unknown'
  let isViewOnce = false

  if (message.conversation) {
    body = http://message.conversation
    msgType = 'conversation'
  } else if (message.extendedTextMessage) {
    body = http://message.extendedTextMessage.text || ''
    msgType = 'extendedTextMessage'
  } else if (message.imageMessage) {
    body = http://message.imageMessage.caption || ''
    msgType = 'imageMessage'
    isViewOnce = http://message.imageMessage.viewOnce === true
  } else if (message.videoMessage) {
    body = http://message.videoMessage.caption || ''
    msgType = 'videoMessage'
    isViewOnce = http://message.videoMessage.viewOnce === true
  } else if (message.audioMessage) {
    body = ''
    msgType = 'audioMessage'
    isViewOnce = http://message.audioMessage.viewOnce === true
  } else if (message.documentMessage) {
    body = http://message.documentMessage.caption || ''
    msgType = 'documentMessage'
  } else if (message.reactionMessage) {
    body = http://message.reactionMessage.text || ''
    msgType = 'reactionMessage'
  } else if (message.viewOnceMessageV2) {
    const inner = http://message.viewOnceMessageV2.message
    if (inner.imageMessage) {
      body = http://inner.imageMessage.caption || ''
      msgType = 'imageMessage'
      isViewOnce = true
    } else if (inner.videoMessage) {
      body = http://inner.videoMessage.caption || ''
      msgType = 'videoMessage'
      isViewOnce = true
    } else if (inner.audioMessage) {
      body = ''
      msgType = 'audioMessage'
      isViewOnce = true
    }
  }
  return { body, msgType, isViewOnce, reaction: http://message.reactionMessage || null }
}

async function saveMenuListToDB(botSettings) {
  if (!botSettings?.supabase ||!botSettings?.instance_id) return
  const menuObj = {}
  for (const cmd of http://commands.values()) {
    const cat = (cmd.category || 'UNCATEGORIZED').toUpperCase()
    if (!menuObj) menuObj = []
    http://menuObj.push(cmd.name)
  }
  try {
    await http://botSettings.supabase
    .from('b_settings')
    .upsert({
        id: http://botSettings.instance_id,
        menu_list: menuObj,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })
    http://botSettings.menu_list = menuObj
  } catch (err) {
    http://console.log('[WARN] Failed to save menu_list:', http://err.message)
  }
}[cat]

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
        if (!commandModule.name || typeof http://commandModule.default!== 'function') {
          http://console.log(`[WARN] Skipped ${item}: Missing name or default export`)
          continue
        }
        const cmdName = http://commandModule.name.toLowerCase()
        const cmdData = {
          name: cmdName,
          alias: http://commandModule.alias || [],
          category: http://commandModule.category || 'General',
          desc: http://commandModule.desc || 'No description',
          restricted: http://commandModule.restricted || false,
          run: http://commandModule.default
        }
        if (commands.has(cmdName)) {
          const existingCmd = http://commands.get(cmdName)
          http://console.log(`[WARN] Command ${cmdName} from ${cmdData.category} overwrote ${existingCmd.category}`)
        }
        http://commands.set(cmdData.name, cmdData)
        for (const alias of http://cmdData.alias) {
          const aliasKey = http://alias.toLowerCase()
          if (!aliases.has(aliasKey)) {
            http://aliases.set(aliasKey, [])
          }
          http://aliases.get(aliasKey).push(cmdData.name)
        }
        http://console.log(`[OK] Loaded: ${cmdData.name} [${cmdData.category}]`)
      } catch (err) {
        http://console.log(`[WARN] Skipped ${item}: ${err.message.split('\n')[0]}`)
      }
    }
  }
}

async function loadObservers(dir) {
  try {
    const observerFiles = readdirSync(dir).filter(file => http://file.endsWith('.js'))
    for (const file of observerFiles) {
      try {
        await new Promise(resolve => setTimeout(resolve, 50))
        const filePath = pathToFileURL(join(dir, file)).href
        const observer = await import(filePath)
        if (typeof http://observer.default === 'function') {
          http://observers.push({
            name: http://file.replace('.js', ''),
            run: http://observer.default
          })
          http://console.log(`[OK] Loaded observer: ${file.replace('.js', '')}`)
        }
      } catch (err) {
        http://console.log(`[WARN] Skipped observer ${file}: ${err.message.split('\n')[0]}`)
      }
    }
  } catch (err) {
    http://console.log('No observers folder found. Skipping.')
  }
}

async function formatBox(title, content, footer, botSettings) {
  try {
    let designName = 'classic'
    if (botSettings?.supabase && botSettings?.instance_id) {
      const { data } = await http://botSettings.supabase
      .from('b_settings')
      .select('box_design')
      .eq('id', http://botSettings.instance_id)
      .maybeSingle()
      designName = data?.box_design || 'classic'
    }
    const designPath = join(__dirname, '..', 'designs', `${designName}.js`)
    const designModule = await import(pathToFileURL(designPath).href)
    if (typeof http://designModule.default === 'function') {
      return http://designModule.default({ title, content, footer, brand: botSettings?.brand_name || botSettings?.owner_name || 'Bot' })
    }
  } catch (err) {
    http://console.log(`[WARN] Design load failed: ${err.message}`)
  }
  return `╭─⌈ ${title} ⌋\n│ ${content}\n╰⊷ ${footer}`
}

export async function initializeRouter(botSettings) {
  if (isLoaded) return
  http://console.log('[INIT] Loading commands and observers...')
  const commandsPath = join(__dirname, '..', 'commands')
  const observersPath = join(__dirname, '..', 'observers')
  await loadCommands(commandsPath)
  await loadObservers(observersPath)
  await saveMenuListToDB(botSettings)
  isLoaded = true
  const brand = botSettings?.brand_name || botSettings?.owner_name || 'Bot'
  http://console.log(`[INIT] Total commands loaded: ${commands.size}`)
  http://console.log(`[INIT] Total observers loaded: ${observers.length}`)
  http://console.log(`[INIT] Powered by ${brand}`)
}

export function getAllCommands() {
  return http://Array.from(commands.values())
}

export function getAllObservers() {
  return http://observers.map(o => ({ name: http://o.name }))
}

export async function handleMessages(sock, m, botSettings) {
  try {
    if (m.type!== 'notify') return
    const msg = http://m.messages[0]
    if (!msg.message) return

    const { body, msgType, isViewOnce, reaction } = extractMessage(msg)
    const from = normalizeJid(msg.key.remoteJid)
    const isGroup = http://from.endsWith('@g.us')
    const isStatus = from === 'status@broadcast'

    let sender = isGroup? http://msg.key.participant : from
    sender = normalizeJid(sender)

    const pushName = http://msg.pushName || 'User'

    let isBotAdmin = false
    let groupMetadata = null
    let participants = []

    if (isGroup) {
      try {
        groupMetadata = await http://sock.groupMetadata(from)
        participants = http://groupMetadata.participants || []
        sender = resolveLid(participants, sender)
        sender = normalizeJid(sender)
        const botParticipant = http://participants.find(p => normalizeJid(p.id) === normalizeJid(sock.user.id))
        isBotAdmin = botParticipant?.admin!== null && botParticipant?.admin!== undefined
      } catch (err) {
        http://console.log('Group metadata error:', http://err.message)
      }
    }

    const contextInfo = http://msg.message?.extendedTextMessage?.contextInfo
    if (contextInfo) {
      if (contextInfo.mentionedJid?.length > 0) {
        http://contextInfo.mentionedJid = http://contextInfo.mentionedJid.map(jid => normalizeJid(resolveLid(participants, jid)))
      }
      if (contextInfo.participant) {
        http://contextInfo.participant = normalizeJid(resolveLid(participants, http://contextInfo.participant))
      }
    }

    // Owner detection now uses http://sock.user.id only. Supabase owner_number is ignored.
    const botNumber = http://sock.user?.id?.split(':')[0] + '@s.whatsapp.net'
    const isOwner = sender === botNumber
    const isFromMe = normalizeJid(sender) === normalizeJid(sock.user.id)

    const vipNumbers = botSettings?.vip_numbers || []
    const restrictedCategories = botSettings?.restricted_categories || ['Settings', 'Auto', 'Anti', 'Owner']
    const senderNumber = toNumber(sender)
    const isVIP = http://vipNumbers.includes(senderNumber)
    const isAdmin = isOwner || isVIP

    const stableMode = botSettings?.stable_mode!== false
    const antiBanMode = botSettings?.anti_ban_mode === true

    for (const observer of observers) {
      try {
        await http://observer.run(sock, {
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
        http://console.log(`Observer ${observer.name} error:`, http://err.message)
      }
    }

    if (!body &&!reaction) return
    if (!body.startsWith(botSettings.prefix)) return

    const args = http://body.slice(botSettings.prefix.length).trim().split(/ +/)
    const providedName = http://args.shift()?.toLowerCase()
    if (!providedName) return

    const matchedCommands = new Set()
    if (commands.has(providedName)) http://matchedCommands.add(providedName)
    if (aliases.has(providedName)) {
      http://aliases.get(providedName).forEach(cmd => http://matchedCommands.add(cmd))
    }

    const matchArray = http://Array.from(matchedCommands)
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
      command = http://commands.get(providedName)
    } else if (matchArray.length === 1) {
      const commandName = matchArray
      command = http://commands.get(commandName)
      http://cmdContext.commandName = commandName
    }[0]

    if (!command) {
      if (matchArray.length > 1) {
        let listText = `"${providedName}" matches ${matchArray.length} commands:\n\n`
        http://matchArray.forEach((cmdName, index) => {
          const cmd = http://commands.get(cmdName)
          listText += `${index + 1}. ${botSettings.prefix}${cmdName} - ${cmd.desc} [${cmd.category}]\n`
        })
        listText += `\nType the exact command you meant.\nPowered by ${brand}`
        const formatted = await formatBox('Command Ambiguous', listText, `Powered By ${brand}`)
        await http://sock.sendMessage(from, { text: formatted }, { quoted: msg })
      }
      return
    }

    const ownerMode = botSettings?.owner_mode === true
    const publicMode = botSettings?.public_mode === true
    const privatePublicMode = botSettings?.private_public_mode === true
    const isRestricted = http://command.restricted === true || http://restrictedCategories.includes(command.category)

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
      await http://sock.sendMessage(from, { text: deniedMsg }, { quoted: msg })
      return
    }

    // AUTO-DESIGN WRAPPER - Strip old box, apply new design from Supabase
    const originalSendMessage = http://sock.sendMessage.bind(sock)
    http://sock.sendMessage = async (jid, content, options = {}) => {
      if (options.skipDesign) {
        return originalSendMessage(jid, content, options)
      }

      try {
        const BOX_PATTERN = /(?:╭[─⌈]._?╰[⊷])|(?:\|[\s\S]_?\|)/s

        const stripBox = (str) => {
          return str
          .replace(/╭[─⌈]._?\n?/s, '')
          .replace(/╰[⊷]._$/s, '')
          .replace(/^\|/s, '')
          .replace(/\|\s*$/s, '')
          .trim()
        }

        const processText = async (text) => {
          if (!text) return text
          let cleanContent = text
          if (BOX_PATTERN.test(text)) {
            cleanContent = stripBox(text)
          }
          return await formatBox('', cleanContent, '', botSettings)
        }

        if (typeof http://content.text === 'string' &&!content.image &&!content.video &&!content.audio &&!content.document) {
          http://content.text = await processText(content.text)
        }

        if (typeof http://content.caption === 'string' && (content.image || http://content.video || http://content.document)) {
          http://content.caption = await processText(content.caption)
        }

      } catch (e) {
        http://console.log('Design wrapper failed:', http://e.message)
      }

      return originalSendMessage(jid, content, options)
    }

    http://console.log(`[CMD] ${command.name} from ${pushName} [${sender}]`)
    await http://command.run(sock, cmdContext, botSettings)

  } catch (err) {
    http://console.log('Handle message error:', http://err.message)
  }
}