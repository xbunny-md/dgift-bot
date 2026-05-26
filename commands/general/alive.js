// commands/general/alive.js
import axios from 'axios'

export const name = 'alive'
export const alias = ['runtime', 'status', 'botstatus']
export const category = 'General'
export const desc = 'Check if the bot application instance is online and active'

export default async function alive(sock, { msg, from }, botSettings) {
  let processingMsg = null
  try {
    await sock.sendMessage(from, { react: { text: '📖', key: msg.key } })

    processingMsg = await sock.sendMessage(from, {
      text: `[SYSTEM] Extracting system runtime parameters and cloud instance data...`
    }, { quoted: msg })

    const activeBotIdentityName = botSettings?.botname || 'Bot'

    // Calculate uptime
    const totalSeconds = process.uptime()
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = Math.floor(totalSeconds % 60)
    const uptimeString = `${hours}h ${minutes}m ${seconds}s`
    const platformLayer = process.env.RENDER_SERVICE_NAME ? 'Render Cloud' : 'Node.js Engine'

    // Image from ENV
    const imageUrl = process.env.IMAGE_URL || 'https://i.ibb.co/1tM9QHF9/IMG-20260525-WA0076.jpg'

    const caption = `╭─⌈ ⚡ *${activeBotIdentityName.toUpperCase()} IS ALIVE* ⌋
│
│ *Status:* Operational
│ *Uptime:* ${uptimeString}
│ *Host Platform:* ${platformLayer}
│ *Response Node:* Active Connection
│
╰⊷ *Powered By ${activeBotIdentityName}*`

    // Try to send with image
    try {
      await sock.sendMessage(from, {
        image: { url: imageUrl },
        caption: caption
      }, { quoted: msg })

      if (processingMsg) {
        await sock.sendMessage(from, {
          text: `[SUCCESS] Instance status telemetry broadcasted safely.`,
          edit: processingMsg.key
        }).catch(() => {})
      }
    } catch (imgErr) {
      console.log('[ALIVE] Image failed, sending text only:', imgErr.message)

      if (processingMsg) {
        await sock.sendMessage(from, { text: caption, edit: processingMsg.key })
      } else {
        await sock.sendMessage(from, { text: caption }, { quoted: msg })
      }
    }

    await sock.sendMessage(from, { react: { text: '✨', key: msg.key } })

  } catch (error) {
    console.error('[ALIVE COMMAND SYSTEM EXCEPTION]', error.message)
    const faultLoggedStr = `[ERROR] Extraction pipelines failed to query system layers. Command terminated.`

    if (processingMsg) {
      await sock.sendMessage(from, { text: faultLoggedStr, edit: processingMsg.key }).catch(() => {})
    } else {
      await sock.sendMessage(from, { text: faultLoggedStr }, { quoted: msg })
    }

    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}