// commands/group/setgcpp.js
export const name = 'setgcpp'
export const alias = ['setgcppic', 'changegcpp', 'setgcpic']
export const category = 'Group'
export const desc = 'Change the group profile picture. Reply to an image.'

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
    return 'I need to be an admin to change the group picture.'
  }
  if (msg.includes('rate-limit')) {
    return 'Too many changes. Wait a few minutes before trying again.'
  }
  if (msg.includes('file too large')) {
    return 'Image is too large. Use an image under 5MB.'
  }
  if (msg.includes('invalid')) {
    return 'Invalid image. Send a JPG or PNG under 5MB.'
  }
  if (msg.includes('timeout')) {
    return 'WhatsApp is temporarily unavailable. Try again later.'
  }

  return 'Failed to change group picture. Reason: ' + err.message
}

export default async function setgcpp(sock, { msg, from, sender, isGroup, groupMetadata }, botSettings) {
  try {
    if (!isGroup) {
      return await sock.sendMessage(from, {
        text: '> This command only works in groups.'
      }, { quoted: msg })
    }

    const brandName = await getBrandName(botSettings)

    // Check if replying to an image
    const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const imageMsg = msg.message?.imageMessage || quotedMsg?.imageMessage

    if (!imageMsg) {
      return await sock.sendMessage(from, {
        text: `╭─⌈ CHANGE GROUP PIC ⌋
│ Reply to an image with ${botSettings.prefix}setgcpp
│ Image must be JPG/PNG under 5MB.
╰⊷ *Powered By ${brandName}*`
      }, { quoted: msg })
    }

    // Download image
    let buffer
    try {
      buffer = await sock.downloadMediaMessage({
        message: imageMsg,
        key: quotedMsg? msg.message.extendedTextMessage.contextInfo.stanzaId : msg.key
      })
    } catch (err) {
      return await sock.sendMessage(from, {
        text: '> Failed to download image. Try sending it again.'
      }, { quoted: msg })
    }

    if (!buffer) {
      return await sock.sendMessage(from, {
        text: '> Could not get image buffer.'
      }, { quoted: msg })
    }

    try {
      await sock.updateProfilePicture(from, buffer)

      await sock.sendMessage(from, {
        text: `╭─⌈ GROUP PIC UPDATED ⌋
│ Group picture changed successfully
│ Changed by: @${sender.split('@')[0]}
╰⊷ *Powered By ${brandName}*`,
        mentions: [sender]
      }, { quoted: msg })

    } catch (err) {
      const errorMsg = getErrorMessage(err)

      await sock.sendMessage(from, {
        text: `╭─⌈ UPDATE FAILED ⌋
│ ${errorMsg}
╰⊷ *Powered By ${brandName}*`
      }, { quoted: msg })
    }

  } catch (err) {
    console.error('[SETGCPP ERROR]', err)
    await sock.sendMessage(from, {
      text: '> An unexpected error occurred.'
    }, { quoted: msg })
  }
}