// commands/groupstatus.js
import { downloadMediaMessage } from '@whiskeysockets/baileys'

export const name = 'groupstatus'
export const alias = ['gstatus', 'gs', 'setgstatus']
export const category = 'Group'
export const desc = 'Post a status to the group so the group gets a green ring'

async function getBrandName(botSettings) {
  if (!botSettings.supabase) return 'Bot'
  const instanceId = botSettings.instance_id || 'DGIFT_DEFAULT'
  const { data } = await botSettings.supabase
.from('b_settings')
.select('brand_name, botname')
.eq('id', instanceId)
.maybeSingle()
  return data?.brand_name || data?.botname || 'Bot'
}

function getErrorMessage(err) {
  const msg = err.message?.toLowerCase() || ''

  if (msg.includes('not-authorized') || msg.includes('forbidden')) {
    return 'I need to be an admin to post group status. Make me admin first.'
  }
  if (msg.includes('not a group')) {
    return 'This command only works in groups.'
  }
  if (msg.includes('rate-limit')) {
    return 'Too many requests. Try again in a few minutes.'
  }
  if (msg.includes('too large')) {
    return 'File is too large. Max 64MB for video, 16MB for image.'
  }

  return 'Failed to post group status. Reason: ' + err.message
}

export default async function groupstatus(sock, { msg, from, isGroup, args }, botSettings) {
  try {
    if (!isGroup) {
      return await sock.sendMessage(from, {
        text: '> This command only works in groups.'
      }, { quoted: msg })
    }

    const brandName = await getBrandName(botSettings)

    // Detect media or text
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const mediaMessage = msg.message?.imageMessage || 
                         msg.message?.videoMessage ||
                         msg.message?.extendedTextMessage ||
                         quoted?.imageMessage || 
                         quoted?.videoMessage ||
                         quoted?.extendedTextMessage

    if (!mediaMessage && !args.length) {
      return await sock.sendMessage(from, {
        text: `╭─⌈ GROUP STATUS ⌋
│ Usage:
│ ${botSettings.prefix}groupstatus Hello Group!
│ ${botSettings.prefix}groupstatus (reply to image/video/text)
│
│ This will post to group status and show green ring.
╰⊷ *Powered By ${brandName}*`
      }, { quoted: msg })
    }

    await sock.sendMessage(from, { react: { text: '⏳', key: msg.key } })

    let content
    let type

    // Handle text status
    if (args.length && !mediaMessage) {
      content = { text: args.join(' ') }
      type = 'text'
    } 
    // Handle media/text from quoted or current message
    else {
      const buffer = await downloadMediaMessage(
        { message: mediaMessage.videoMessage ? { videoMessage: mediaMessage } : 
                  mediaMessage.imageMessage ? { imageMessage: mediaMessage } : 
                  { extendedTextMessage: mediaMessage } },
        'buffer',
        {},
        { logger: console }
      )

      if (!buffer && mediaMessage.imageMessage || mediaMessage.videoMessage) {
        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
        return await sock.sendMessage(from, {
          text: '> Failed to download media.'
        }, { quoted: msg })
      }

      if (mediaMessage.imageMessage) {
        content = { 
          image: buffer, 
          caption: mediaMessage.caption || args.join(' ') 
        }
        type = 'image'
      } else if (mediaMessage.videoMessage) {
        content = { 
          video: buffer, 
          caption: mediaMessage.caption || args.join(' '),
          gifPlayback: false
        }
        type = 'video'
      } else if (mediaMessage.extendedTextMessage) {
        content = { text: mediaMessage.extendedTextMessage.text }
        type = 'text'
      }
    }

    // Post to group status
    await sock.groupStatusPost(from, content)

    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

    await sock.sendMessage(from, {
      text: `╭─⌈ GROUP STATUS POSTED ⌋
│ Type: ${type}
│ Status posted successfully.
│ Group now has green ring 💚
╰⊷ *Powered By ${brandName}*`
    }, { quoted: msg })

  } catch (err) {
    console.error('[GROUPSTATUS ERROR]', err)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    
    const errorMsg = getErrorMessage(err)
    await sock.sendMessage(from, {
      text: `╭─⌈ GROUP STATUS FAILED ⌋
│ ${errorMsg}
╰⊷ *Powered By ${brandName}*`
    }, { quoted: msg })
  }
}