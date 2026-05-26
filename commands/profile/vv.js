// commands/tools/vv.js
export const name = 'vv'
export const alias = ['viewonce', 'unlock', 'retrive', 'rvo']
export const category = 'Profile'
export const desc = 'Unlock View Once: Image, Video, Audio'

import { downloadContentFromMessage, getContentType } from "@whiskeysockets/baileys"

export default async function vv(sock, { msg, from }, botSettings) {
  const prefix = botSettings?.prefix || '.'
  const brandName = botSettings?.brand_name || botSettings?.botname || 'Bot'

  try {
    await sock.sendMessage(from, { react: { text: '👁️', key: msg.key } }).catch(() => {})

    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    if (!quoted) {
      await sock.sendMessage(from, { text: '> ❌ Reply to a View Once message' }, { quoted: msg })
      return
    }

    // Shika ViewOnce v1 na v2
    let viewOnce = quoted?.viewOnceMessageV2?.message || quoted?.viewOnceMessage?.message || quoted
    const type = getContentType(viewOnce)
    const media = viewOnce[type]

    const supportedTypes = ['imageMessage', 'videoMessage', 'audioMessage']
    if (!type ||!supportedTypes.includes(type) ||!media?.viewOnce) {
      await sock.sendMessage(from, { text: '> ❌ This is not a View Once message' }, { quoted: msg })
      return
    }

    // Download media
    let mediaType = 'image'
    if (type === 'videoMessage') mediaType = 'video'
    if (type === 'audioMessage') mediaType = 'audio'

    const stream = await downloadContentFromMessage(media, mediaType)
    let buffer = Buffer.from([])
    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk])
    }

    const caption = `╭─⌈ 👁️ *VIEW ONCE UNLOCKED* ⌋
│ Type: ${mediaType}
╰⊷ *${brandName}*`

    // Tuma kulingana na type
    if (type === 'imageMessage') {
      await sock.sendMessage(from, { image: buffer, caption }, { quoted: msg })
    } else if (type === 'videoMessage') {
      await sock.sendMessage(from, { video: buffer, caption }, { quoted: msg })
    } else if (type === 'audioMessage') {
      await sock.sendMessage(from, { audio: buffer, ptt: media.ptt || false }, { quoted: msg })
    }

    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } }).catch(() => {})

  } catch (error) {
    console.error('[VV ERROR]', error.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } }).catch(() => {})
    await sock.sendMessage(from, { text: '> ❌ Failed to unlock. Media might be expired.' }, { quoted: msg })
  }
}