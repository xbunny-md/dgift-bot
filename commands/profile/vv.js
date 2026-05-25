// commands/tools/reveal.js
export const name = 'reveal'
export const alias = ['vv', 'viewonce', 'unviewonce']
export const category = 'Tools'
export const desc = 'Reveal viewonce messages of any type'

export default async function reveal(sock, { msg, from }, botSettings) {
  const brandName = botSettings?.brand_name || botSettings?.botname || 'Bot'

  try {
    await sock.sendMessage(from, { react: { text: '👀', key: msg.key } }).catch(() => {})

    const quoted = msg.message?.extendedTextMessage?.contextInfo
    const quotedMsg = quoted?.quotedMessage

    if (!quotedMsg) {
      return await sock.sendMessage(from, {
        text: '> Reply to a viewonce message to reveal it'
      }, { quoted: msg })
    }

    // Check if it's viewonce
    const isViewOnce = quotedMsg.viewOnceMessage?.message ||
                       quotedMsg.viewOnceMessageV2?.message ||
                       quotedMsg.viewOnceMessageV2Extension?.message

    if (!isViewOnce) {
      return await sock.sendMessage(from, {
        text: '> That message is not a viewonce'
      }, { quoted: msg })
    }

    const actualMsg = isViewOnce
    const msgType = Object.keys(actualMsg)[0]
    const mediaMsg = actualMsg[msgType]

    // Download media
    const stream = await sock.downloadMediaMessage({ message: actualMsg })
    const chunks = []
    for await (const chunk of stream) chunks.push(chunk)
    const buffer = Buffer.concat(chunks)

    if (!buffer || buffer.length === 0) {
      throw new Error('DOWNLOAD_FAILED')
    }

    let sendOptions = {}
    let caption = `╭─⌈ 👀 *VIEWONCE REVEALED* ⌋
╰⊷ *${brandName}*`

    // Send based on type
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
      errorMsg = '> Failed to download media'
    } else if (error.message === 'UNSUPPORTED_TYPE') {
      errorMsg = '> This media type is not supported'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg }).catch(() => {})
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } }).catch(() => {})
  }
}