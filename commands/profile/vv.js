export const name = 'reveal'
export const alias = ['vv', 'viewonce', 'unviewonce']
export const category = 'Tools'
export const desc = 'Reveal viewonce messages of any type'

export default async function reveal(sock, { msg, from }, botSettings) {
  const brandName = botSettings?.brand_name || botSettings?.botname || 'Bot'

  try {
    await sock.sendMessage(from, { react: { text: '👀', key: msg.key } }).catch(() => {})

    const quoted = msg.message?.extendedTextMessage?.contextInfo
    if (!quoted ||!quoted.quotedMessage) {
      return await sock.sendMessage(from, {
        text: '> Reply to a viewonce message to reveal it'
      }, { quoted: msg })
    }

    let quotedMsg = quoted.quotedMessage
    let messageKey = quoted.stanzaId? { remoteJid: from, id: quoted.stanzaId, fromMe: quoted.participant? quoted.participant.includes(sock.user.id.split(':')[0]) : false } : null

    // Force load original message if wrapper is stripped
    let actualMsg = null

    // Check direct viewonce first
    if (quotedMsg.viewOnceMessage?.message) {
      actualMsg = quotedMsg.viewOnceMessage.message
    } else if (quotedMsg.viewOnceMessageV2?.message) {
      actualMsg = quotedMsg.viewOnceMessageV2.message
    } else if (quotedMsg.viewOnceMessageV2Extension?.message) {
      actualMsg = quotedMsg.viewOnceMessageV2Extension.message
    }

    // If not found, try loading from server - this works for your own messages
    if (!actualMsg && messageKey) {
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
        console.log('[REVEAL] Load message failed:', e.message)
      }
    }

    if (!actualMsg) {
      return await sock.sendMessage(from, {
        text: '> That message is not a viewonce or it has expired'
      }, { quoted: msg })
    }

    const msgType = Object.keys(actualMsg)[0]
    const mediaMsg = actualMsg[msgType]

    // Download media
    const stream = await sock.downloadMediaMessage({ message: actualMsg })
    if (!stream) throw new Error('DOWNLOAD_FAILED')

    const chunks = []
    for await (const chunk of stream) chunks.push(chunk)
    const buffer = Buffer.concat(chunks)

    if (!buffer || buffer.length === 0) {
      throw new Error('DOWNLOAD_FAILED')
    }

    let sendOptions = {}
    let caption = `╭─⌈ 👀 *VIEWONCE REVEALED* ⌋
╰⊷ *${brandName}*`

    if (msgType === 'imageMessage') {
      sendOptions = {
        image: buffer,
        caption: mediaMsg.caption || caption
      }
    } else if (msgType === 'videoMessage') {
      sendOptions = {
        video: buffer,
        caption: mediaMsg.caption || caption,
        gifPlayback: mediaMsg.gifPlayback || false
      }
    } else if (msgType === 'audioMessage') {
      sendOptions = {
        audio: buffer,
        mimetype: mediaMsg.mimetype || 'audio/mp4',
        ptt: mediaMsg.ptt || false
      }
    } else if (msgType === 'documentMessage') {
      sendOptions = {
        document: buffer,
        mimetype: mediaMsg.mimetype,
        fileName: mediaMsg.fileName || 'file',
        caption: mediaMsg.caption || ''
      }
    } else {
      throw new Error('UNSUPPORTED_TYPE')
    }

    await sock.sendMessage(from, sendOptions, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } }).catch(() => {})

  } catch (error) {
    console.error('[REVEAL ERROR]', error.message)
    let errorMsg = '> Failed to reveal viewonce'
    if (error.message === 'DOWNLOAD_FAILED') {
      errorMsg = '> Failed to download media. It may be expired'
    } else if (error.message === 'UNSUPPORTED_TYPE') {
      errorMsg = '> This media type is not supported'
    }
    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg }).catch(() => {})
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } }).catch(() => {})
  }
}