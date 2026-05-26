import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import pino from 'pino'
import qrcode from 'qrcode'
import fs from 'fs'
import AdmZip from 'adm-zip'
import pkg from '@whiskeysockets/baileys'
const { default: makeWASocket, DisconnectReason, fetchLatestBaileysVersion, useMultiFileAuthState, makeCacheableSignalKeyStore, Browsers } = pkg
import { createClient } from '@supabase/supabase-js'
import ws from 'ws'
import 'dotenv/config'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// ==========================================
// 0. INSTANCE ID - FORCE IT, BAN DEFAULT
// ==========================================
const INSTANCE_ID = process.env.INSTANCE_ID
if (!INSTANCE_ID || INSTANCE_ID.trim() === '' || INSTANCE_ID === 'DGIFT_DEFAULT') {
  console.error('❌ INSTANCE_ID is required. Set INSTANCE_ID in env. DGIFT_DEFAULT is banned.')
  process.exit(1)
}

const SESSION_DIR = `./session/${INSTANCE_ID}`
console.log(`✅ Running with INSTANCE_ID: ${INSTANCE_ID}`)

// ==========================================
// 🛠️ MULTI-FOLDER SELF-HEALING & CORRECTION LOGIC
// ==========================================
function fixDirectoryCaseSensitivity(dirPath) {
  if (!fs.existsSync(dirPath)) return
  try {
    const items = fs.readdirSync(dirPath)
    items.forEach(item => {
      const fullPath = join(dirPath, item)
      const lowerItem = item.toLowerCase()
      if (lowerItem === 'chache.js') {
        console.log(`⚠️ INFO: Found non-standard spelling '${item}' in directory: ${dirPath}`)
      } else if (lowerItem === 'cache.js') {
        console.log(`ℹ️ INFO: Standard 'cache.js' file verified in directory: ${dirPath}`)
      }
      if (lowerItem === 'router.js' && item !== 'router.js') {
        const correctPath = join(dirPath, 'router.js')
        fs.renameSync(fullPath, correctPath)
        console.log(`🔧 FIXED CASE: Corrected router casing reference: ${item} -> router.js`)
      }
    })
  } catch (err) {
    console.log(`⚠️ Diagnostics bypass for directory ${dirPath}: ${err.message}`)
  }
}

fixDirectoryCaseSensitivity(join(__dirname, 'lib'))
fixDirectoryCaseSensitivity(__dirname)

// ==========================================
// ☁️ SUPABASE DB LOGIC - PER INSTANCE
// ==========================================
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.log('⚠️ SUPABASE_URL or SUPABASE_KEY is missing in environment variables')
  process.exit(1)
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: ws }
})

async function ensureBotRow() {
  const { data, error } = await supabase
    .from('b_settings')
    .select('*')
    .eq('id', INSTANCE_ID)
    .single()

  if (error && error.code === 'PGRST116') {
    console.log(`⚠️ No row found for ${INSTANCE_ID}. Creating default row...`)
    const defaultRow = {
      id: INSTANCE_ID,
      botname: 'dgift-bot',
      owner_number: '',
      owner_name: '',
      prefix: '.',
      public_mode: false,
      antilink: false,
      antispam: false,
      autoread: false,
      autotyping: false,
      autoviewstatus: false,
      startup_image: 'https://i.ibb.co/1tM9QHF9/IMG-20260525-WA0076.jpg'
    }
    const { data: created, error: createErr } = await supabase
      .from('b_settings')
      .insert(defaultRow)
      .select()
      .single()
    if (createErr) throw createErr
    return created
  }
  if (error) throw error
  return data
}

export async function getBotSettings() {
  try {
    return await ensureBotRow()
  } catch (err) {
    console.log('⚠️ Database retrieval error:', err.message)
    process.exit(1)
  }
}

export function listenSettingsUpdates(callback) {
  supabase
    .channel(`b_settings_changes_${INSTANCE_ID}`)
    .on('postgres_changes', 
      { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'b_settings', 
        filter: `id=eq.${INSTANCE_ID}` 
      }, 
      (payload) => {
        console.log('🔥 Settings updated live:', payload.new)
        callback(payload.new)
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`✅ Realtime listener active for ${INSTANCE_ID}`)
      }
    })
}

// ==========================================
// 🚀 ROUTER LOADING
// ==========================================
let initializeRouter, handleMessages;
try {
  const routerModule = await import('./lib/router.js')
  initializeRouter = routerModule.initializeRouter
  handleMessages = routerModule.handleMessages
} catch (err) {
  console.log('🚨 Critical ESM Import Failure on router routing layers:', err.message)
  process.exit(1)
}

// ==========================================
// 1. GLOBAL STATE DEFINITIONS
// ==========================================
let botSettings = null
let sock = null
let qrString = ''
let isConnected = false
let reconnectAttempts = 0
let lastCredsSync = 0 
const MAX_RECONNECTS = 10

// ==========================================
// 2. EXPRESS + SOCKET.IO
// ==========================================
const app = express()
const server = createServer(app)
const io = new Server(server, { cors: { origin: "*" } })
const PORT = process.env.PORT || 3000

app.use(express.static(join(__dirname, 'public')))
app.use(express.json())

app.get('/', (req, res) => {
  res.json({
    status: 'alive',
    instance: INSTANCE_ID,
    bot: botSettings?.botname || 'dgift-bot',
    connected: isConnected,
    uptime: Math.floor(process.uptime())
  })
})

// ==========================================
// 3. SESSION PERSISTENCE PER INSTANCE
// ==========================================
async function syncSessionToCloud(force = false) {
  try {
    const now = Date.now()
    if (!force && now - lastCredsSync < 120000) return
    lastCredsSync = now
    if (!fs.existsSync(SESSION_DIR)) return

    const zip = new AdmZip()
    zip.addLocalFolder(SESSION_DIR)
    const base64 = zip.toBuffer().toString('base64')

    await supabase.from('bu_sessions').upsert({
      id: INSTANCE_ID,
      data: base64,
      updated_at: new Date().toISOString()
    })
    console.log(`☁️ Session synced for ${INSTANCE_ID}`)
  } catch (e) {
    console.log('Session sync error:', e.message)
  }
}

async function loadSessionFromCloud() {
  try {
    const { data } = await supabase
      .from('bu_sessions')
      .select('data')
      .eq('id', INSTANCE_ID)
      .single()

    if (data?.data) {
      if (fs.existsSync(SESSION_DIR)) {
        fs.rmSync(SESSION_DIR, { recursive: true, force: true })
      }
      fs.mkdirSync(SESSION_DIR, { recursive: true })
      const zipBuffer = Buffer.from(data.data, 'base64')
      new AdmZip(zipBuffer).extractAllTo(SESSION_DIR, true)
      console.log(`☁️ Session restored for ${INSTANCE_ID}`)
      return true
    }
  } catch (e) {
    console.log('No existing session in cloud')
  }
  return false
}

// ==========================================
// 4. WHATSAPP CONNECTION
// ==========================================
async function connectToWhatsApp() {
  try {
    await loadSessionFromCloud()
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR)
    const { version, isLatest } = await fetchLatestBaileysVersion()
    console.log(`Using Baileys WA v${version.join('.')}, latest: ${isLatest}`)

    sock = makeWASocket({
      version,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
      },
      browser: Browsers.ubuntu(`DGIFT BOT - ${INSTANCE_ID}`),
      syncFullHistory: false,
      markOnlineOnConnect: false,
      shouldIgnoreJid: jid => jid === 'status@broadcast' || jid.endsWith('@newsletter'),
      fireInitQueries: false, 
      generateHighQualityLinkPreview: false, 
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 0,
      keepAliveIntervalMs: 20000,
      emitOwnEvents: true,
      retryRequestDelayMs: 500,
      maxMsgRetryCount: 2,
      getMessage: async () => ({ conversation: '' })
    })

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update

      if (qr && !isConnected) {
        qrString = qr
        try {
          const qrImage = await qrcode.toDataURL(qr)
          io.emit('qr', qrImage)
          io.emit('status', 'Scan QR or use Pair Code')
        } catch (err) {
          console.log('QR error:', err.message)
        }
      }

      if (connection === 'open') {
        isConnected = true
        qrString = ''
        reconnectAttempts = 0
        io.emit('status', 'Connected')
        console.log('✅ WhatsApp connected!')

        const settingsData = await getBotSettings()
        botSettings = { ...settingsData, supabase, instance_id: INSTANCE_ID }
        console.log('🔄 Settings loaded. Prefix:', botSettings.prefix)

        await syncSessionToCloud(true) 
        await sendConfirmationMessage()
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode
        isConnected = false
        io.emit('status', 'Disconnected')
        console.log('Connection closed:', lastDisconnect?.error?.message)

        if (statusCode === DisconnectReason.loggedOut) {
          await supabase.from('bu_sessions').delete().eq('id', INSTANCE_ID)
          if (fs.existsSync(SESSION_DIR)) fs.rmSync(SESSION_DIR, { recursive: true, force: true })
          qrString = ''
          reconnectAttempts = 0
          setTimeout(() => connectToWhatsApp(), 5000)
        } else if (reconnectAttempts < MAX_RECONNECTS) {
          reconnectAttempts++
          const delay = Math.min(reconnectAttempts * 10000, 60000)
          setTimeout(() => connectToWhatsApp(), delay)
        } else {
          reconnectAttempts = 0
          setTimeout(() => connectToWhatsApp(), 300000)
        }
      }
    })

    sock.ev.on('creds.update', async () => {
      await saveCreds()
      syncSessionToCloud(false) 
    })

    sock.ev.on('messages.upsert', (m) => {
      handleMessages(sock, m, botSettings)
    })

  } catch (err) {
    console.error('Fatal connection error:', err.message)
    if (reconnectAttempts < MAX_RECONNECTS) {
      reconnectAttempts++
      setTimeout(() => connectToWhatsApp(), 15000)
    }
  }
}

// ==========================================
// 5. SOCKET.IO
// ==========================================
io.on('connection', (socket) => {
  if (qrString && !isConnected) {
    qrcode.toDataURL(qrString).then(qrImage => {
      socket.emit('qr', qrImage)
    }).catch(() => {})
  }
  socket.emit('status', isConnected ? 'Connected' : 'Waiting for connection')

  socket.on('request_pair_code', async (phoneNumber) => {
    if (!sock || isConnected) return
    try {
      const code = await sock.requestPairingCode(phoneNumber)
      socket.emit('pair_code', code)
    } catch (err) {
      socket.emit('pair_error', 'Failed to generate code. Try QR.')
    }
  })
})

// ==========================================
// 6. STARTUP MESSAGE
// ==========================================
async function sendConfirmationMessage() {
  const s = botSettings
  const imageUrl = s.startup_image || 'https://i.ibb.co/1tM9QHF9/IMG-20260525-WA0076.jpg'
  const formatBool = (val) => val ? 'On' : 'Off'
  const botPushName = sock.user?.name || sock.user?.id?.split(':')[0] || 'User'

  const caption = `╭─⌈ *${s.botname}* ⌋
│
│ Hello ${botPushName}, bot is online.
│ Instance: ${INSTANCE_ID}
│ Owner: ${s.owner_name}
│ Number: ${s.owner_number}
│ Prefix: ${s.prefix}
│
│ *SYSTEM STATUS*
│ Public Mode: On ✅
│ Anti-Link: ${formatBool(s.antilink)}
│ Anti-Spam: ${formatBool(s.antispam)}
│ Auto-Read: ${formatBool(s.autoread)}
│ Auto-Typing: ${formatBool(s.autotyping)}
│ View Status: ${formatBool(s.autoviewstatus)}
│
╰⊷ *Powered by ${s.botname}*
╰⊷ Type ${s.prefix}menu to start`

  try {
    if (s.owner_number) {
      await sock.sendMessage(`${s.owner_number}@s.whatsapp.net`, {
        image: { url: imageUrl },
        caption: caption
      })
    }
  } catch (err) {
    console.log('Failed to send startup message:', err.message)
  }
}

// ==========================================
// 7. BOT START
// ==========================================
async function startBot() {
  try {
    await initializeRouter()
    const settingsData = await getBotSettings()
    botSettings = { ...settingsData, supabase, instance_id: INSTANCE_ID }
    
    listenSettingsUpdates((newSettings) => {
      botSettings = { ...newSettings, supabase, instance_id: INSTANCE_ID }
      console.log('🔥 Live settings sync. Prefix:', newSettings.prefix)
    })

    await connectToWhatsApp()

    server.listen(PORT, () => {
      console.log(`🎁 Bot engine running on port: ${PORT}`)
      console.log(`👑 Instance: ${INSTANCE_ID}`)
    })

  } catch (err) {
    console.error('Fatal startup error:', err)
    process.exit(1)
  }
}

process.on('uncaughtException', (err) => console.error('Uncaught exception:', err.message))
process.on('unhandledRejection', (reason) => console.error('Unhandled rejection:', reason))

startBot()