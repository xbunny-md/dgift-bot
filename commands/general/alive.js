// commands/general/alive.js
import axios from 'axios'

export const name = 'alive'
export const alias = ['runtime', 'status', 'botstatus']
export const category = 'General'
export const desc = 'Check if the bot application instance is online and active'

export default async function alive(sock, { msg, from }, botSettings) {
  let processingMsg = null
  try {
    // Trigger loading emoji reaction status on the incoming message
    await sock.sendMessage(from, { react: { text: '📖', key: msg.key } })

    // Open active modification text tracking line string
    processingMsg = await sock.sendMessage(from, {
      text: `[SYSTEM] Extracting system runtime parameters and cloud instance data...`
    }, { quoted: msg })

    const activeBotIdentityName = botSettings?.botname || 'dgift-bot'
    
    // Calculate accurate dynamic system uptime metrics
    const totalSeconds = process.uptime()
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = Math.floor(totalSeconds % 60)
    
    const uptimeString = `${hours}h ${minutes}m ${seconds}s`
    const platformLayer = process.env.RENDER_SERVICE_NAME ? 'Render Cloud' : 'Node.js Engine'

    // Zero-Footprint Buffer Delivery Sequence (No disk write to prevent Render storage accumulation)
    let volatileGraphicBuffer = null
    const profileImageFallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(activeBotIdentityName)}&background=random&size=512`
    
    try {
      console.log(`[RAM STREAM] Fetching system identity avatar directly to volatile heap memory`)
      const imgResponse = await axios.get(profileImageFallbackUrl, {
        responseType: 'arraybuffer',
        timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      })
      volatileGraphicBuffer = Buffer.from(imgResponse.data)
    } catch (bufErr) {
      console.log(`[BUFFER EXCEPTION] Profile graphic stream dropped: ${bufErr.message}`)
    }

    // Structure layout properties text parameters with bold markdown values applied cleanly
    const caption = `╭─⌈ ⚡ *${activeBotIdentityName.toUpperCase()} IS ALIVE* ⌋
│
│ *Status:* Operational
│ *Uptime:* ${uptimeString}
│ *Host Platform:* ${platformLayer}
│ *Response Node:* Active Connection
│
╰⊷ *Powered By ${activeBotIdentityName}*`

    // Output binary payload directly over WhatsApp socket layers
    if (volatileGraphicBuffer) {
      await sock.sendMessage(from, {
        image: volatileGraphicBuffer,
        caption: caption
      }, { quoted: msg })

      // Wipe out local reference token immediately to force rapid V8 Engine garbage collection
      volatileGraphicBuffer = null

      if (processingMsg) {
        await sock.sendMessage(from, {
          text: `[SUCCESS] Instance status telemetry broadcasted safely. Buffers flushed.`,
          edit: processingMsg.key
        }).catch(() => {})
      }
    } else {
      // Message inline edit tracking fallback if image link could not parse inside matrix
      if (processingMsg) {
        await sock.sendMessage(from, { text: caption, edit: processingMsg.key })
      } else {
        await sock.sendMessage(from, { text: caption }, { quoted: msg })
      }
    }

    // Trigger success emoji reaction status on the original user message
    await sock.sendMessage(from, { react: { text: '✨', key: msg.key } })

  } catch (error) {
    console.error('[ALIVE COMMAND SYSTEM EXCEPTION]', error.message)
    const faultLoggedStr = `[ERROR] Extraction pipelines failed to query system layers. Command terminated.`

    if (processingMsg) {
      await sock.sendMessage(from, { text: faultLoggedStr, edit: processingMsg.key }).catch(() => {})
    } else {
      await sock.sendMessage(from, { text: faultLoggedStr }, { quoted: msg })
    }

    // Trigger failure emoji reaction status
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}
