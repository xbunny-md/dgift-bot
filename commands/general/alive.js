// commands/general/alive.js
import axios from 'axios'

export const name = 'alive'
export const alias = ['runtime', 'status', 'botstatus']
export const category = 'General'
export const desc = 'Check if the bot application instance is online and active'

export default async function alive(sock, { msg, from }, botSettings) {
  try {
    await sock.sendMessage(from, { react: { text: '📖', key: msg.key } })

    const activeBotIdentityName = botSettings?.botname || 'Bot'

    // Calculate uptime
    const totalSeconds = process.uptime()
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = Math.floor(totalSeconds % 60)
    const uptimeString = `${hours}h ${minutes}m ${seconds}s`
    const platformLayer = process.env.RENDER_SERVICE_NAME ? 'Render Cloud' : 'Node.js Engine'

    // Image priority: DB startup_image → ENV → backup
    const imageUrl = botSettings?.startup_image 
      || process.env.IMAGE_URL 
      || 'https://i.ibb.co/dsp8vz8h/IMG-20260528-WA0041.jpg'

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
    } catch (imgErr) {
      console.log('[ALIVE] Image failed, sending text only:', imgErr.message)
      await sock.sendMessage(from, { text: caption }, { quoted: msg })
    }

    await sock.sendMessage(from, { react: { text: '✨', key: msg.key } })

  } catch (error) {
    console.error('[ALIVE COMMAND SYSTEM EXCEPTION]', error.message)
    await sock.sendMessage(from, { text: `[ERROR] Extraction pipelines failed to query system layers. Command terminated.` }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}