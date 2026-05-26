// commands/tools/clearsessions.js
import fs from 'fs'
import { supabase } from '../../index.js' // tumia index.js kama ulivyosema

export const name = 'clearsessions'
export const alias = ['clearsession', 'delsession', 'resetsession']
export const category = 'Tools'
export const desc = 'Delete session folder and Supabase session data. Bot will require re-auth.'

export default async function clearsessions(sock, { msg, from, sender }, botSettings) {
  let loadingMsg = null
  try {
    const ownerJid = botSettings.owner_number + '@s.whatsapp.net'
    const isOwner = sender === ownerJid
    const brand = botSettings?.brand_name || botSettings?.botname || 'DGIFT BOT'

    if (!isOwner) {
      return sock.sendMessage(from, {
        text: `╭─⌈ 🔒 *ACCESS DENIED* ⌋
│
│ Owner only command
│
╰⊷ *Powered By ${brand}*`
      }, { quoted: msg })
    }

    await sock.sendMessage(from, { react: { text: '🗑️', key: msg.key } })

    loadingMsg = await sock.sendMessage(from, {
      text: `╭─⌈ 🧹 *CLEARING SESSION* ⌋
│
│ Deleting local session...
│ Deleting Supabase data...
│ Bot will restart for re-auth
│
╰⊷ *Powered By ${brand}*`
    }, { quoted: msg })

    // 1. Futa session folder locally
    const sessionDir = './session'
    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true })
      console.log('[CLEARSESSION] Local session folder deleted')
    }

    // 2. Futa session kwenye Supabase bu_sessions table
    const { error } = await supabase
      .from('bu_sessions')
      .delete()
      .eq('id', 'full_session')

    if (error) throw error
    console.log('[CLEARSESSION] Supabase session deleted')

    // 3. Success message
    await sock.sendMessage(from, {
      text: `╭─⌈ ✅ *SESSION CLEARED* ⌋
│
│ Local session: Deleted
│ Supabase session: Deleted
│ Status: Disconnecting in 3s...
│
│ Next: Scan QR or use Pair Code
│ to reconnect your session
│
╰⊷ *Powered By ${brand}*`,
      edit: loadingMsg.key
    })

    await sock.sendMessage(from, { react: { text: '✅', key: loadingMsg.key } }).catch(() => {})

    // 4. Disconnect ili i-trigger reconnect loop
    setTimeout(() => {
      sock.end()
    }, 3000)

  } catch (error) {
    console.error('[CLEARSESSIONS ERROR]', error.message)
    const brand = botSettings?.brand_name || botSettings?.botname || 'DGIFT BOT'

    if (loadingMsg) {
      await sock.sendMessage(from, {
        text: `╭─⌈ ❌ *ERROR* ⌋
│
│ Failed to clear sessions
│ Reason: ${error.message}
│
╰⊷ *Powered By ${brand}*`,
        edit: loadingMsg.key
      }).catch(() => {})
    } else {
      await sock.sendMessage(from, {
        text: `╭─⌈ ❌ *ERROR* ⌋
│
│ Failed to clear sessions
│ Reason: ${error.message}
│
╰⊷ *Powered By ${brand}*`
      }, { quoted: msg })
    }
  }
}