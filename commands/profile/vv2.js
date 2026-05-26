import { downloadMediaMessage } from '@whiskeysockets/baileys'

export const name = 'vv2'
export const alias = ['vvv2', 'unviewonce2']
export const category = 'Profile'
export const desc = 'Silent reveal viewonce to bot DM'

export default async function vv2(sock, { msg, from, sender }, botSettings) {
  const ownerJid = botSettings.owner_number + '@s.whatsapp.net'
  const brandName = botSettings?.brand_name || botSettings?.botname || 'Bot'

  try {
    // React tick immediately
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } }).catch(() => {})

    const quoted = msg.message?.extendedTextMessage?.contextInfo
    if (!quoted ||!quoted.quotedMessage) {
      await sock.sendMessage(ownerJid, {
        text: `*VV2 Error*\n\nUser: ${sender}\nChat: ${from}\nReason: No quoted message`
      }).catch(() => {})
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } }).catch(() => {})
      return
    }

    let quotedMsg = quoted.quotedMessage
    let actualMsg = null

    // Detect viewonce
    if (quotedMsg.viewOnceMessage?.message) {
      actualMsg = quotedMsg.viewOnceMessage.message
    } else if (quotedMsg.viewOnceMessageV2?.message) {
      actualMsg = quotedMsg.viewOnceMessageV2.message
    } else if (quotedMsg.viewOnceMessageV2Extension?.message) {
      actualMsg = quotedMsg.viewOnceMessageV2Extension.message
    }

    // Try loading original message if stripped
    if (!actualMsg && quoted.stanzaId) {
      try {
        const loadedMsg = await sock.loadMessage(from, quoted.stanzaId)
        if (loadedMsg?.message) {
          if (loadedMsg.message.viewOnceMessage?.message) {
            actualMsg = loadedMsg.message.viewOnceMessage.message
          } else if (loadedMsg.message.viewOnceMessageV2?.message) {
            actualMsg = loadedMsg.message.viewOnceMessageV2.message
          } else if (loadedMsg.message.viewOnceMessageV2Extension?.message) {
            actualMsg = loadedMsg.message.viewOnceMessageV2Extension.message
          }
        }
      } catch (e) {
        console.log('[VV2] Load message failed:', e.message)
      }
    }

    if (!actualMsg) {
      await sock.sendMessage(ownerJid, {
        text: `*VV2 Error*\n\nUser: ${sender}\nChat: ${from}\nReason: Not a viewonce or expired`
      }).catch(() => {})
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } }).catch(() => {})
      return
    }

    const msgType = Object.keys(actualMsg)[0]
    const mediaMsg = actualMsg[msgType]

    // Download media
    const buffer = await downloadMediaMessage(
      { message: actualMsg },
      'buffer',
      {},
      { logger: console, reuploadRequest: sock.updateMediaMessage }
    )

    if (!buffer || buffer.length === 0) throw new Error('DOWNLOAD_FAILED')

    let sendOptions = {}
    let caption = `╭─⌈ 👀 *VIEWONCE REVEALED* ⌋
│ From: ${sender.split('@')[0]}
│ Chat: ${from}
╰⊷ *${brandName}*`

    if (msgType === 'imageMessage') {
      sendOptions = { image: buffer, caption: mediaMsg.caption || caption }
    } else if (msgType === 'videoMessage') {
      sendOptions = { video: buffer, caption: mediaMsg.caption || caption, gifPlayback: mediaMsg.gifPlayback || false }
    } else if (msgType === 'audioMessage') {
      sendOptions = { audio: buffer, mimetype: mediaMsg.mimetype || 'audio/mp4', ptt: mediaMsg.ptt || false }
    } else if (msgType === 'documentMessage') {
      sendOptions = { document: buffer, mimetype: mediaMsg.mimetype, fileName: mediaMsg.fileName || 'file', caption: mediaMsg.caption || '' }
    } else {
      throw new Error('UNSUPPORTED_TYPE')
    }

    // Send to bot owner's DM only
    await sock.sendMessage(ownerJid, sendOptions)

  } catch (error) {
    console.error('[VV2 ERROR]', error.message)

    // Send error to bot DM only
    await sock.sendMessage(ownerJid, {
      text: `*VV2 Error*\n\nUser: ${sender}\nChat: ${from}\nError: ${error.message}`
    }).catch(() => {})

    // React error only, no message
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } }).catch(() => {})
  }
}