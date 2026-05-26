// commands/sticker/sticker2.js
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import { Sticker, StickerTypes } from 'wa-sticker-formatter'

export const name = 'sticker2'
export const alias = ['s2', 'stickerx', 'wm2']
export const category = 'Sticker'
export const desc = 'Advanced sticker maker with crop, text, and nobg'

async function getStickerConfig(botSettings) {
  const instanceId = botSettings.instance_id || 'DGIFT_DEFAULT'

  if (!botSettings.supabase) {
    return { 
      pack: 'Bunny MD', 
      author: 'Lupin Starnley', 
      categories: ['🤖', '🎉'] 
    }
  }

  const { data } = await botSettings.supabase
    .from('b_settings')
    .select('sticker_pack, sticker_author, sticker_category')
    .eq('id', instanceId)
    .maybeSingle()

  return {
    pack: data?.sticker_pack || 'Bunny MD',
    author: data?.sticker_author || 'Lupin Starnley',
    categories: data?.sticker_category 
      ? data.sticker_category.split(',').map(c => c.trim()).filter(Boolean)
      : ['🤖', '🎉']
  }
}

export default async function sticker2(sock, { msg, from, args }, botSettings) {
  const prefix = botSettings.prefix

  try {
    // Detect media
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const mediaMessage = msg.message?.imageMessage || 
                         msg.message?.videoMessage ||
                         quoted?.imageMessage || 
                         quoted?.videoMessage ||
                         quoted?.viewOnceMessageV2?.message?.imageMessage ||
                         quoted?.viewOnceMessageV2?.message?.videoMessage ||
                         quoted?.viewOnceMessage?.message?.imageMessage ||
                         quoted?.viewOnceMessage?.message?.videoMessage

    if (!mediaMessage) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `> ❌ Reply to image/video\n> Usage: ${prefix}sticker2 [crop|circle|nobg] [text]`
      }, { quoted: msg })
    }

    await sock.sendMessage(from, { react: { text: '⏳', key: msg.key } })

    const buffer = await downloadMediaMessage(
      { message: { [mediaMessage.videoMessage ? 'videoMessage' : 'imageMessage']: mediaMessage } },
      'buffer',
      {},
      { logger: console }
    )

    if (!buffer) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, {
        text: '> ❌ Failed to download media.'
      }, { quoted: msg })
    }

    // Parse options
    const option = args[0]?.toLowerCase()
    let stickerType = StickerTypes.FULL
    let stickerText = args.join(' ')

    if (option === 'circle') {
      stickerType = StickerTypes.CIRCLE
      stickerText = args.slice(1).join(' ')
    } else if (option === 'crop') {
      stickerType = StickerTypes.CROPPED
      stickerText = args.slice(1).join(' ')
    } else if (option === 'nobg') {
      stickerType = StickerTypes.FULL
      // Note: wa-sticker-formatter doesn't support nobg directly
      // You need @removal.ai or similar API for that
    }

    if (stickerText === 'nobg' || stickerText === 'circle' || stickerText === 'crop') {
      stickerText = ''
    }

    const { pack, author, categories } = await getStickerConfig(botSettings)

    // Create sticker
    const sticker = new Sticker(buffer, {
      pack: pack,
      author: author,
      type: stickerType,
      categories: categories,
      quality: 70,
      background: '#00000' // Transparent
    })

    const stickerBuffer = await sticker.toBuffer()

    // Send sticker
    await sock.sendMessage(from, {
      sticker: stickerBuffer
    }, { quoted: msg })

    // Send text if provided
    if (stickerText) {
      await sock.sendMessage(from, {
        text: `> Text: ${stickerText}`
      }, { quoted: msg })
    }

    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[STICKER2 ERROR]', error)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, {
      text: '> ❌ Sticker creation failed.'
    }, { quoted: msg })
  }
}