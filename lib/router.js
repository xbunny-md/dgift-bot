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

// ==========================================
// BASIC HELPERS
// ==========================================

function normalizeJid(jid = '') {
  try {
    if (!jid) return null

    if (jid === 'status@broadcast') return jid

    jid = jid.split(':')[0]

    if (jid.endsWith('@lid')) {
      const num = jid.replace(/[^0-9]/g, '')
      if (num) return `${num}@s.whatsapp.net`
    }

    return jid.toLowerCase()
  } catch {
    return null
  }
}

function toNumber(jid = '') {
  try {
    return jid.replace(/[^0-9]/g, '')
  } catch {
    return ''
  }
}

function safeArray(arr) {
  return Array.isArray(arr) ? arr : []
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ==========================================
// OWNER DETECTION
// ==========================================

function getOwnerNumbers(botSettings = {}, sock = null) {
  const set = new Set()

  try {
    const owner = toNumber(botSettings?.owner_number || '')
    if (owner) set.add(owner)
  } catch {}

  try {
    const envOwner = toNumber(process.env.OWNER_NUMBER || '')
    if (envOwner) set.add(envOwner)
  } catch {}

  try {
    safeArray(botSettings?.admin_numbers).forEach(v => {
      const n = toNumber(v)
      if (n) set.add(n)
    })
  } catch {}

  try {
    if (sock?.user?.id) {
      const botNum = toNumber(sock.user.id)
      if (botNum) set.add(botNum)
    }
  } catch {}

  try {
    if (sock?.authState?.creds?.me?.id) {
      const meNum = toNumber(sock.authState.creds.me.id)
      if (meNum) set.add(meNum)
    }
  } catch {}

  return [...set]
}

function isOwnerCheck(sender, sock, botSettings, fromMe = false) {
  try {
    if (fromMe) return true

    const senderNum = toNumber(sender)

    if (!senderNum) return false

    const ownerNumbers = getOwnerNumbers(botSettings, sock)

    return ownerNumbers.includes(senderNum)
  } catch {
    return false
  }
}

// ==========================================
// LID RESOLUTION
// ==========================================

function resolveParticipant(participants = [], jid = '', sock = null) {
  try {
    if (!jid) return jid

    if (!jid.endsWith('@lid')) {
      return normalizeJid(jid)
    }

    const lidNum = toNumber(jid)

    const found = participants.find(p => {
      const id = normalizeJid(p.id || '')
      return toNumber(id) === lidNum
    })

    if (found?.id) {
      return normalizeJid(found.id)
    }

    try {
      const contacts = sock?.store?.contacts || {}

      const matched = Object.values(contacts).find(c => {
        return (
          toNumber(c?.id || '') === lidNum ||
          toNumber(c?.lid || '') === lidNum
        )
      })

      if (matched?.id) {
        return normalizeJid(matched.id)
      }
    } catch {}

    return `${lidNum}@s.whatsapp.net`
  } catch {
    return normalizeJid(jid)
  }
}

// ==========================================
// MESSAGE EXTRACTION
// ==========================================

function extractMessage(msg = {}) {
  try {
    const message = msg.message || {}

    let body = ''
    let msgType = 'unknown'
    let isViewOnce = false
    let reaction = null

    if (message.conversation) {
      body = message.conversation
      msgType = 'conversation'
    }

    else if (message.extendedTextMessage) {
      body = message.extendedTextMessage.text || ''
      msgType = 'extendedTextMessage'
    }

    else if (message.imageMessage) {
      body = message.imageMessage.caption || ''
      msgType = 'imageMessage'
      isViewOnce = message.imageMessage.viewOnce === true
    }

    else if (message.videoMessage) {
      body = message.videoMessage.caption || ''
      msgType = 'videoMessage'
      isViewOnce = message.videoMessage.viewOnce === true
    }

    else if (message.documentMessage) {
      body = message.documentMessage.caption || ''
      msgType = 'documentMessage'
    }

    else if (message.audioMessage) {
      body = ''
      msgType = 'audioMessage'
      isViewOnce = message.audioMessage.viewOnce === true
    }

    else if (message.reactionMessage) {
      reaction = message.reactionMessage
      body = reaction.text || ''
      msgType = 'reactionMessage'
    }

    else if (message.viewOnceMessageV2) {
      const inner = message.viewOnceMessageV2.message || {}

      if (inner.imageMessage) {
        body = inner.imageMessage.caption || ''
        msgType = 'imageMessage'
        isViewOnce = true
      }

      else if (inner.videoMessage) {
        body = inner.videoMessage.caption || ''
        msgType = 'videoMessage'
        isViewOnce = true
      }
    }

    return {
      body,
      msgType,
      isViewOnce,
      reaction
    }
  } catch {
    return {
      body: '',
      msgType: 'unknown',
      isViewOnce: false,
      reaction: null
    }
  }
}

// ==========================================
// SAVE MENU
// ==========================================

async function saveMenuListToDB(botSettings) {
  try {
    if (!botSettings?.supabase || !botSettings?.instance_id) return

    const menu = {}

    for (const cmd of commands.values()) {
      const cat = (cmd.category || 'GENERAL').toUpperCase()

      if (!menu[cat]) menu[cat] = []

      menu[cat].push(cmd.name)
    }

    await botSettings.supabase
      .from('b_settings')
      .upsert({
        id: botSettings.instance_id,
        menu_list: menu,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })

    botSettings.menu_list = menu

  } catch (err) {
    console.log('[MENU SAVE ERROR]', err.message)
  }
}

// ==========================================
// LOAD COMMANDS
// ==========================================

async function loadCommands(dir) {
  const items = readdirSync(dir)

  for (const item of items) {
    const fullPath = join(dir, item)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      await loadCommands(fullPath)
      continue
    }

    if (!item.endsWith('.js')) continue

    try {
      await delay(30)

      const file = pathToFileURL(fullPath).href
      const module = await import(file)

      if (!module.name || typeof module.default !== 'function') {
        console.log(`[SKIP] ${item} missing exports`)
        continue
      }

      const cmdName = module.name.toLowerCase()

      const cmdData = {
        name: cmdName,
        alias: safeArray(module.alias),
        category: module.category || 'General',
        desc: module.desc || 'No description',
        restricted: module.restricted === true,
        run: module.default
      }

      // OVERWRITE OLD COMMAND
      if (commands.has(cmdName)) {
        console.log(`[OVERWRITE] ${cmdName}`)
      }

      commands.set(cmdName, cmdData)

      // REMOVE OLD ALIASES
      for (const [key, vals] of aliases.entries()) {
        aliases.set(
          key,
          vals.filter(v => v !== cmdName)
        )
      }

      // ADD NEW ALIASES
      for (const alias of cmdData.alias) {
        const a = alias.toLowerCase()

        if (!aliases.has(a)) {
          aliases.set(a, [])
        }

        const arr = aliases.get(a)

        if (!arr.includes(cmdName)) {
          arr.push(cmdName)
        }
      }

      console.log(`[OK] ${cmdName} loaded`)

    } catch (err) {
      console.log(`[FAILED] ${item}: ${err.message}`)
    }
  }
}

// ==========================================
// LOAD OBSERVERS
// ==========================================

async function loadObservers(dir) {
  try {
    const files = readdirSync(dir).filter(v => v.endsWith('.js'))

    for (const file of files) {
      try {
        await delay(30)

        const imported = await import(
          pathToFileURL(join(dir, file)).href
        )

        if (typeof imported.default !== 'function') continue

        observers.push({
          name: file.replace('.js', ''),
          run: imported.default
        })

        console.log(`[OK] Observer: ${file}`)

      } catch (err) {
        console.log(`[OBSERVER ERROR] ${file}: ${err.message}`)
      }
    }
  } catch {
    console.log('[INFO] No observers folder')
  }
}

// ==========================================
// INITIALIZE
// ==========================================

export async function initializeRouter(botSettings = {}) {
  try {
    if (isLoaded) return

    console.log('[INIT] Router loading...')

    await loadCommands(join(__dirname, '..', 'commands'))
    await loadObservers(join(__dirname, '..', 'observers'))

    await saveMenuListToDB(botSettings)

    isLoaded = true

    console.log(`[READY] Commands: ${commands.size}`)
    console.log(`[READY] Observers: ${observers.length}`)

  } catch (err) {
    console.log('[INIT ERROR]', err.message)
  }
}

// ==========================================
// EXPORTS
// ==========================================

export function getAllCommands() {
  return [...commands.values()]
}

export function getAllObservers() {
  return observers.map(v => ({
    name: v.name
  }))
}

// ==========================================
// MAIN HANDLER
// ==========================================

export async function handleMessages(sock, m, botSettings = {}) {
  try {

    // ==========================================
    // VALIDATION
    // ==========================================

    if (!m || m.type !== 'notify') return

    const msg = m.messages?.[0]

    if (!msg?.message) return

    // ==========================================
    // IMPORTANT PROTECTIONS
    // ==========================================

    // NEVER PROCESS SELF GENERATED LOOP MESSAGES
    if (
      msg.key?.id?.startsWith('BAE5') &&
      msg.key?.fromMe
    ) {
      return
    }

    // NEVER PROCESS PROTOCOL MESSAGES
    if (msg.message?.protocolMessage) return

    // NEVER DELETE OWN MESSAGES
    if (msg.message?.protocolMessage?.type === 0) return

    const from = normalizeJid(msg.key.remoteJid)

    if (!from) return

    const isGroup = from.endsWith('@g.us')
    const isStatus = from === 'status@broadcast'

    let sender = isGroup
      ? msg.key.participant
      : from

    sender = normalizeJid(sender)

    const pushName = msg.pushName || 'User'

    // ==========================================
    // EXTRACT
    // ==========================================

    const {
      body,
      msgType,
      isViewOnce,
      reaction
    } = extractMessage(msg)

    // ==========================================
    // GROUP DATA
    // ==========================================

    let participants = []
    let groupMetadata = null
    let isBotAdmin = false

    if (isGroup) {
      try {
        groupMetadata = await sock.groupMetadata(from)

        participants = groupMetadata.participants || []

        sender = resolveParticipant(
          participants,
          sender,
          sock
        )

        const botId = normalizeJid(sock.user?.id)

        const botData = participants.find(
          p => normalizeJid(p.id) === botId
        )

        isBotAdmin = !!botData?.admin

      } catch (err) {
        console.log('[GROUP ERROR]', err.message)
      }
    }

    // ==========================================
    // OWNER CHECK
    // ==========================================

    const isFromMe = msg.key.fromMe === true

    const isOwner = isOwnerCheck(
      sender,
      sock,
      botSettings,
      isFromMe
    )

    const vipNumbers = safeArray(botSettings?.vip_numbers)

    const senderNumber = toNumber(sender)

    const isVIP = vipNumbers.includes(senderNumber)

    const isAdmin = isOwner || isVIP

    // ==========================================
    // PROTECTED USERS
    // ==========================================

    const protectedNumbers = new Set([
      ...getOwnerNumbers(botSettings, sock),
      ...vipNumbers
    ])

    const isProtected = (
      protectedNumbers.has(senderNumber) ||
      isOwner ||
      isVIP ||
      isFromMe
    )

    // ==========================================
    // OBSERVERS
    // ==========================================

    // OBSERVERS NOW RUN IN DM + GROUP
    // NO BLOCKING IMPORTANT OBSERVERS

    for (const observer of observers) {
      try {
        await observer.run(
          sock,
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
            participants,
            botSettings,
            isProtected,
            protectedNumbers: [...protectedNumbers]
          },
          botSettings
        )
      } catch (err) {
        console.log(`[OBSERVER ${observer.name}]`, err.message)
      }
    }

    // ==========================================
    // COMMAND CHECK
    // ==========================================

    if (!body) return

    const prefix = botSettings?.prefix || '.'

    if (!body.startsWith(prefix)) return

    const args = body
      .slice(prefix.length)
      .trim()
      .split(/ +/)

    const providedName = args.shift()?.toLowerCase()

    if (!providedName) return

    // ==========================================
    // MATCH COMMANDS
    // ==========================================

    let command = null

    if (commands.has(providedName)) {
      command = commands.get(providedName)
    }

    else if (aliases.has(providedName)) {
      const first = aliases.get(providedName)?.[0]

      if (first) {
        command = commands.get(first)
      }
    }

    if (!command) return

    // ==========================================
    // ACCESS MODES
    // ==========================================

    const restrictedCategories =
      botSettings?.restricted_categories ||
      ['Owner', 'Settings', 'Anti', 'Auto']

    const ownerMode = botSettings?.owner_mode === true
    const publicMode = botSettings?.public_mode === true
    const privatePublicMode =
      botSettings?.private_public_mode === true

    const isRestricted =
      command.restricted === true ||
      restrictedCategories.includes(command.category)

    let allowed = true

    if (ownerMode) {
      allowed = isOwner || isVIP
    }

    else if (privatePublicMode) {
      allowed = !isRestricted || isOwner || isVIP
    }

    else if (publicMode) {
      allowed = true
    }

    // ==========================================
    // SILENT BLOCK
    // ==========================================

    // NO ACCESS DENIED MESSAGE
    // JUST SILENT RETURN

    if (!allowed) return

    // ==========================================
    // CONTEXT
    // ==========================================

    const ctx = {
      msg,
      from,
      sender,
      args,
      body,
      pushName,
      msgType,
      isViewOnce,
      reaction,
      isGroup,
      isStatus,
      isAdmin,
      isOwner,
      isVIP,
      isFromMe,
      isBotAdmin,
      groupMetadata,
      participants,
      commandName: command.name,
      botSettings,
      isProtected,
      protectedNumbers: [...protectedNumbers]
    }

    console.log(
      `[CMD] ${command.name} | ${pushName} | ${sender}`
    )

    // ==========================================
    // RUN COMMAND
    // ==========================================

    try {
      await command.run(sock, ctx, botSettings)
    } catch (err) {
      console.log(
        `[COMMAND ERROR] ${command.name}:`,
        err.message
      )

      // SILENT FAIL
    }

  } catch (err) {
    console.log('[HANDLE ERROR]', err.message)
  }
}