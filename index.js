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
// 🛠️ MULTI-FOLDER SELF-HEALING & CORRECTION LOGIC
// ==========================================
function fixDirectoryCaseSensitivity(dirPath) {
  if (!fs.existsSync(dirPath)) return
  try {
    const items = fs.readdirSync(dirPath)
    items.forEach(item => {
      const fullPath = join(dirPath, item)
      const lowerItem = item.toLowerCase()

      // Handle cache.js / chache.js diagnostic reporting
      if (lowerItem === 'chache.js') {
        console.log(`⚠️ INFO: Found non-standard spelling '${item}' in directory: ${dirPath}`)
      } else if (lowerItem === 'cache.js') {
        console.log(`ℹ️ INFO: Standard 'cache.js' file verified in directory: ${dirPath}`)
      }

      // Enforce clean lower-case execution naming anomalies for core router operations
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

// Target diagnostic passes across execution targets
fixDirectoryCaseSensitivity(join(__dirname, 'lib'))
fixDirectoryCaseSensitivity(__dirname)

// ==========================================
// ☁️ INTERNAL INTEGRATED SUPABASE DB LOGIC
// ==========================================
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.log('⚠️ SUPABASE_URL or SUPABASE_KEY is missing in environment variables')
  process.exit(1)
}

// Integrated client instance leveraging absolute Node 20 WS support
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  },
  realtime: {
    transport: ws
  }
})

export async function getBotSettings() {
  try {
    const { data, error } = await supabase
      .from('b_settings')
      .select('*')
      .eq('id', 'DGIFT_DEFAULT')
      .single()

    if (error) {
      console.log('⚠️ Failed to load b_settings from database:', error.message)
      return {
        botname: 'dgift-bot',
        owner_number: '254748548334',
        owner_name: 'obashjalash-droid',
        prefix: '.',
        public_mode: false,
        antilink: false,
        antispam: false,
        autoread: false,
        autotyping: false,
        autoviewstatus: false
      }
    }
    return data
  } catch (err) {
    console.log('⚠️ Database retrieval error fallback triggered:', err.message)
    return {
      botname: 'dgift-bot',
      owner_number: '254748548334',
      owner_name: 'obashjalash-droid',
      prefix: '.',
      public_mode: false,
      antilink: false,
      antispam: false,
      autoread: false,
      autotyping: false,
      autoviewstatus: false
    }
  }
}

export function listenSettingsUpdates(callback) {
  supabase
    .channel('b_settings_changes')
    .on('postgres_changes', 
      { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'b_settings', 
        filter: 'id=eq.DGIFT_DEFAULT' 
      }, 
      (payload) => {
        console.log('🔥 Settings updated live:', payload.new)
        callback(payload.new)
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Realtime settings listener active - Powered by Dgift Bot')
      }
    })
}

// ==========================================
// 🚀 ROUTER INTERACTION RESOLUTION (DYNAMIC PATH LOADING)
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
const SESSION_DIR = './session'

// ==========================================
// 2. EXPRESS APPLICATION + SOCKET.IO ENGINE
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
    bot: botSettings?.botname || 'dgift-bot',
    owner: 'obashjalash-droid',
    connected: isConnected,
    uptime: Math.floor(process.uptime())
  })
})

// ==========================================
// 3. STORAGE PERSISTENCE LAYERS (SESSION ENCRYPTION/ZIP)
// ==========================================
async function syncSessionToCloud(force = false) {
  try {
    const now = Date.now()
    if (!force && now - lastCredsSync < 120000) return
    lastCredsSync = now

    if (!fs.existsSync(SESSION_DIR)) return

    const zip = new AdmZip()
    zip.addLocalFolder(SESSION_DIR)
    const zipBuffer = zip.toBuffer()
    const base64 = zipBuffer.toString('base64')

    await supabase.from('bu_sessions').upsert({
      id: 'full_session',
      data: base64,
      updated_at: new Date().toISOString()
    })
    console.log('☁️ Full session + cryptographic verification keys synced to Supabase')
  } catch (e) {
    console.log('Session sync error execution caught:', e.message)
  }
}

async function loadSessionFromCloud() {
  try {
    const { data } = await supabase
      .from('bu_sessions')
      .select('data')
      .eq('id', 'full_session')
      .single()

    if (data?.data) {
      if (fs.existsSync(SESSION_DIR)) {
        fs.rmSync(SESSION_DIR, { recursive: true, force: true })
      }
      fs.mkdirSync(SESSION_DIR, { recursive: true })

      const zipBuffer = Buffer.from(data.data, 'base64')
      const zip = new AdmZip(zipBuffer)
      zip.extractAllTo(SESSION_DIR, true)

      console.log('☁️ Full session + operational credentials restored from Supabase')
      return true
    }
  } catch (e) {
    console.log('No existing active operational session localized in Cloud instance')
  }
  return false
}

// ==========================================
// 4. WHATSAPP CORE NETWORK CONNECTION HANDLER
// ==========================================
async function connectToWhatsApp() {
  try {
    await loadSessionFromCloud()
    const { state, saveCreds } = await useMultiFileAuthState('./session')
    const { version, isLatest } = await fetchLatestBaileysVersion()
    console.log(`Using Baileys Framework WA v${version.join('.')}, latest status: ${isLatest}`)

    const hasSession = state.creds?.noiseKey ? true : false
    console.log(hasSession ? '🔄 Reconstituting existing state session profiles...' : '🔍 New session authorization pipeline initializing...')

    sock = makeWASocket({
      version,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
      },
      browser: Browsers.ubuntu('DGIFT BOT'),
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

    // ==========================================
    // 5. SOCKET CONNECTIVITY STATE TRANSITIONS
    // ==========================================
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update

      if (qr && !isConnected) {
        qrString = qr
        try {
          const qrImage = await qrcode.toDataURL(qr)
          io.emit('qr', qrImage)
          io.emit('status', 'Scan QR or use Pair Code')
          console.log('📱 QR Authentication string dispatched securely to /pair.html endpoint')
        } catch (err) {
          console.log('QR matrix translation process aborted:', err.message)
        }
      }

      if (connection === 'open') {
        isConnected = true
        qrString = ''
        reconnectAttempts = 0
        io.emit('status', 'Connected')
        console.log('✅ Realtime communication matrix with WhatsApp successfully stabilized!')

        const settingsData = await getBotSettings()
        botSettings = { ...settingsData, supabase } // <-- FIX HAPA
        console.log('🔄 Fresh system configs fetched successfully. Core Prefix:', botSettings.prefix)

        await syncSessionToCloud(true) 
        await sendConfirmationMessage()
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode
        isConnected = false
        io.emit('status', 'Disconnected')
        console.log('Network interface connection severed. Reason parameters:', lastDisconnect?.error?.message)

        if (statusCode === DisconnectReason.loggedOut) {
          console.log('❌ Absolute termination signature received. Purging local session matrices...')
          await supabase.from('bu_sessions').delete().eq('id', 'full_session')
          if (fs.existsSync('./session')) fs.rmSync('./session', { recursive: true, force: true })
          qrString = ''
          reconnectAttempts = 0
          setTimeout(() => connectToWhatsApp(), 5000)
        } else if (reconnectAttempts < MAX_RECONNECTS) {
          reconnectAttempts++
          const delay = Math.min(reconnectAttempts * 10000, 60000)
          console.log(`🔄 Pipeline scheduling reconnection in ${delay/1000}s... Routine checklist entry ${reconnectAttempts}/${MAX_RECONNECTS}`)
          setTimeout(() => connectToWhatsApp(), delay)
        } else {
          console.log('⚠️ Maximum reconnection thresholds breached. Dormant buffer period active for 5 minutes...')
          reconnectAttempts = 0
          setTimeout(() => connectToWhatsApp(), 300000)
        }
      }
    })

    // 6. CREDENTIAL STORAGE SYNCHRONIZATION
    sock.ev.on('creds.update', async () => {
      await saveCreds()
      syncSessionToCloud(false) 
    })

    // 7. INBOUND MESSAGE PROCESSING PIPE
    sock.ev.on('messages.upsert', (m) => {
      handleMessages(sock, m, botSettings)
    })

  } catch (err) {
    console.error('Fatal network initialization loop crash:', err.message)
    if (reconnectAttempts < MAX_RECONNECTS) {
      reconnectAttempts++
      setTimeout(() => connectToWhatsApp(), 15000)
    }
  }
}

// ==========================================
// 8. INTERACTIVE SOCKET.IO SUBSCRIPTIONS
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
      console.log('Authentication Pairing Token pushed:', code)
    } catch (err) {
      socket.emit('pair_error', 'Failed to generate code. Try QR.')
      console.log('Pairing sequence handshake error:', err.message)
    }
  })
})

// ==========================================
// 9. TELEMETRY STATUS REPORT SEND OUT
// ==========================================
async function sendConfirmationMessage() {
  const s = botSettings
  const imageUrl = 'https://i.ibb.co/1tM9QHF9/IMG-20260525-WA0076.jpg'
  const formatBool = (val) => val ? 'On' : 'Off'

  const botPushName = sock.user?.name || sock.user?.id?.split(':')[0] || 'User'

  const caption = `╭─⌈ *${s.botname}* ⌋
│
│ Hello ${botPushName}, bot is online.
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
╰⊷ *Powered by Dgift Bot*
│ Contact: 0748548334
╰⊷ Type ${s.prefix}menu to start`

  try {
    await sock.sendMessage(`${s.owner_number}@s.whatsapp.net`, {
      image: { url: imageUrl },
      caption: caption
    })
    console.log('Diagnostic telemetric report delivered cleanly to terminal operator')
  } catch (err) {
    console.log('Failed to dispatch telemetric startup manifest report:', err.message)
  }
}

// ==========================================
// 10. SYSTEM TELEMETRY EXECUTION ROOT ENTRY
// ==========================================
async function startBot() {
  try {
    await initializeRouter()
    const settingsData = await getBotSettings()
    botSettings = { ...settingsData, supabase } // <-- FIX HAPA PIA
    if (!botSettings) {
      console.error('❌ Failed to configure system application settings data arrays')
      process.exit(1)
    }
    console.log('✅ Application core state arrays mapped. Execution operational prefix:', botSettings.prefix)

    listenSettingsUpdates((newSettings) => {
      botSettings = { ...newSettings, supabase } // <-- FIX HAPA PIA
      console.log('🔥 Live database modification sync event intercepted. Active Prefix:', newSettings.prefix)
    })

    await connectToWhatsApp()

    server.listen(PORT, () => {
      console.log(`🎁 DGIFT BOT engine actively polling on local environment port: ${PORT}`)
      console.log(`👑 Registered Host Operator signature: obashjalash-droid`)
    })

  } catch (err) {
    console.error('Fatal initialization vector failure killed runtime sequence:', err)
    process.exit(1)
  }
}

// ==========================================
// 11. PERSISTENT GLOBAL UNCAUGHT EXCEPTION SAFE-GUARD
// ==========================================
process.on('uncaughtException', (err) => console.error('Intercepted global uncaught exception routine:', err.message))
process.on('unhandledRejection', (reason) => console.error('Intercepted global asynchronous unhandled rejection routine:', reason))

startBot()