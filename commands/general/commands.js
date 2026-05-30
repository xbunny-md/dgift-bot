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
  if (jid.endsWith('@lid')) {
    const num = jid.split('@')[0].replace(/[^0-9]/g, '')
    if (num) return `${num}@s.whatsapp.net`
  }
  return jid.toLowerCase()
}

function toNumber(jid) {
  if (!jid) return ''
  return jid.split('@')[0].replace(/[^0-9]/g, '')
}

function resolveLid(participants = [], jid, sock = null) {
  if (!jid) return jid
  if (!jid.endsWith('@lid')) return normalizeJid(jid)
  const lidNum = toNumber(jid)
  try {
    const found = participants.find(p => toNumber(normalizeJid(p.id)) === lidNum)
    if (found?.id) return normalizeJid(found.id)
  } catch (e) {}
  try {
    if (sock?.store?.contacts) {
      const contact = Object.values(sock.store.contacts).find(c =>
        toNumber(c.id) === lidNum || toNumber(c.lid) === lidNum
      )
      if (contact?.id) return normalizeJid(contact.id)
    }
  } catch (e) {}
  if (lidNum) return `${lidNum}@s.whatsapp.net`
  return normalizeJid(jid)
}

function getOwnerVariants(sock, botSettings) {
  const variants = new Set()
  try {
    if (sock?.user?.id) {
      variants.add(normalizeJid(sock.user.id))
      variants.add(toNumber(sock.user.id))
      variants.add(sock.user.id.split(':')[0])
    }
  } catch (e) {}
  try {
    if (sock?.authState?.creds?.me?.id) {
      variants.add(normalizeJid(sock.authState.creds.me.id))
      variants.add(toNumber(sock.authState.creds.me.id))
    }
  } catch (e) {}
  try {
    if (sock?.authState?.creds?.me?.lid) {
      variants.add(normalizeJid(sock.authState.creds.me.lid))
      variants.add(toNumber(sock.authState.creds.me.lid))
    }
  } catch (e) {}
  try {
    if (botSettings?.owner_number) {
      const num = toNumber(botSettings.owner_number)
      if (num) {
        variants.add(num)
        variants.add(`${num}@s.whatsapp.net`)
        variants.add(`${num}@lid`)
      }
    }
  } catch (e) {}
  try {
    if (process.env.OWNER_NUMBER) {
      const num = toNumber(process.env.OWNER_NUMBER)
      if (num) {
        variants.add(num)
        variants.add(`${num}@s.whatsapp.net`)
      }
    }
  } catch (e) {}
  try {
    if (botSettings?.admin_numbers && Array.isArray(botSettings.admin_numbers)) {
      botSettings.admin_numbers.forEach(n => {
        const num = toNumber(n)
        if (num) variants.add(num)
      })
    }
  } catch (e) {}
  return Array.from(variants).filter(Boolean)
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
    const inner = message.viewOnceMessageV2.message || {}
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

async function saveMenuListToDB(botSettings) {
  if (!botSettings?.supabase ||!botSettings?.instance_id) return
  const menuObj = {}
  for (const cmd of commands.values()) {
    const cat = (cmd.category || 'UNCATEGORIZED').toUpperCase()
    if (!menuObj[cat]) menuObj[cat] = []
    menuObj[cat].push(cmd.name)
  }
  try {
    await botSettings.supabase
 .from('b_settings')
 .upsert({
        id: botSettings.instance_id,
        menu_list: menuObj,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })
    botSettings.menu_list = menuObj
    console.log('[OK] Menu exported to Supabase')
  } catch (err) {
    console.log('[WARN] Failed to save menu_list:', err.message)
  }
}

function wrapSupabase(supabase, instanceId) {
  if (!supabase) return supabase
  return new Proxy(supabase, {
    get(target, prop) {
      if (prop === 'from') {
        return (table) => {
          const query = target.from(table)
          return new Proxy(query, {
            get(qTarget, qProp) {
              if (qProp === 'eq') {
                return (col, val) => {
                  if (col === 'id' && val === 'DGIFT_DEFAULT') {
                    return qTarget.eq(col, instanceId)
                  }
                  return qTarget.eq(col, val)
                }
              }
              return qTarget[qProp]
            }
          })
        }
      }
      return target[prop]
    }
  })
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
          if (!aliases.has(aliasKey)) aliases.set(aliasKey, [])
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

export async function initializeRouter(botSettings) {
  if (isLoaded) return
  console.log('[INIT] Loading commands and observers...')
  const commandsPath = join(__dirname, '..', 'commands')
  const observersPath = join(__dirname, '..', 'observers')
  await loadCommands(commandsPath)
  await loadObservers(observersPath)
  await saveMenuListToDB(botSettings)
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
    if (!msg?.message) return

    const { body, msgType, isViewOnce, reaction } = extractMessage(msg)
    const from = normalizeJid(msg.key.remoteJid)
    if (!from) return

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
        participants = groupMetadata.participants || []
        sender = resolveLid(participants, sender, sock)
        const botParticipant = participants.find(p => normalizeJid(p.id) === normalizeJid(sock.user.id))
        isBotAdmin = botParticipant?.admin!== null && botParticipant?.admin!== undefined
      } catch (err) {
        console.log('Group metadata error:', err.message)
      }
    }

    const contextInfo = msg.message?.extendedTextMessage?.contextInfo
    if (contextInfo) {
      try {
        if (contextInfo.mentionedJid?.length > 0) {
          contextInfo.mentionedJid = contextInfo.mentionedJid.map(jid => normalizeJid(resolveLid(participants, jid, sock)))
        }
        if (contextInfo.participant) {
          contextInfo.participant = normalizeJid(resolveLid(participants, contextInfo.participant, sock))
        }
      } catch (e) {}
    }

    const senderNumber = toNumber(sender)
    const vipNumbers = botSettings?.vip_numbers || []
    const isVIP = vipNumbers.includes(senderNumber)
    const isFromMe = msg.key.fromMe === true

    const ownerVariants = getOwnerVariants(sock, botSettings)
    let isOwner = false
    try {
      isOwner = ownerVariants.includes(sender) ||
                ownerVariants.includes(senderNumber) ||
                ownerVariants.includes(toNumber(sender))
    } catch (e) {}

    const isAdmin = isOwner || isVIP

    const restrictedCategories = botSettings?.restricted_categories || ['Settings', 'Auto', 'Anti', 'Owner']
    const stableMode = botSettings?.stable_mode!== false
    const antiBanMode = botSettings?.anti_ban_mode === true

    const safeSock = sock

    // FIX: Observers run for EVERYONE EVERYWHERE - DM, Self, Group, Status
    for (const observer of observers) {
      try {
        await observer.run(
          safeSock,
          {
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
          },
          botSettings
        )
      } catch (err) {
        console.log(`Observer ${observer.name} error:`, err.message)
      }
    }

    if (!body &&!reaction) return
    if (!body.startsWith(botSettings.prefix)) return

    // FIX: Allow self-messaging DM - no isFromMe return
    const args = body.slice(botSettings.prefix.length).trim().split(/ +/)
    const providedName = args.shift()?.toLowerCase()
    if (!providedName) return

    const matchedCommands = new Set()
    if (commands.has(providedName)) matchedCommands.add(providedName)
    if (aliases.has(providedName)) aliases.get(providedName).forEach(cmd => matchedCommands.add(cmd))
    const matchArray = Array.from(matchedCommands)
    if (matchArray.length === 0) return

    const wrappedSettings = {...botSettings, supabase: wrapSupabase(botSettings.supabase, botSettings.instance_id) }

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
      botSettings: wrappedSettings
    }

    let command = null
    if (commands.has(providedName)) {
      command = commands.get(providedName)
    } else if (matchArray.length === 1) {
      const commandName = matchArray[0]
      command = commands.get(commandName)
      cmdContext.commandName = commandName
    }

    if (!command) return

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
      // FIX: OWNER MODE = SILENT. NO MESSAGE AT ALL
      if (ownerMode) return
      // PUBLIC / PRIVATE MODE = ACCESS DENIED
      await sock.sendMessage(from, { text: 'Access Denied.' }, { quoted: msg })
      return
    }

    console.log(`[CMD] ${command.name} from ${pushName} [${sender}]`)

    try {
      await command.run(sock, cmdContext, wrappedSettings)
    } catch (err) {
      console.log(`Command ${command.name} error:`, err.message)
      await sock.sendMessage(from, { text: 'Command error occurred.' }, { quoted: msg })
    }

  } catch (err) {
    console.log('Handle message error:', err.message)
  }
}