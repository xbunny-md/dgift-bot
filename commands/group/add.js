// commands/group/add.js
export const name = 'add'
export const alias = ['invite', 'adduser']
export const category = 'Group'
export const desc = 'Add a user to the group using number or reply.'

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

function normalizeNumber(number) {
  if (!number) return null

  let num = number.replace(/[^0-9]/g, '')
  if (!num) return null

  // Remove leading 0 for local numbers
  if (num.startsWith('0')) {
    num = num.slice(1)
  }

  // Accept 8-15 digit numbers with country code
  if (num.length >= 8 && num.length <= 15) {
    return num + '@s.whatsapp.net'
  }

  return null
}

function getErrorMessage(err) {
  const msg = err.message?.toLowerCase() || ''

  if (msg.includes('not-authorized') || msg.includes('forbidden')) {
    return 'I need to be an admin to add members. Make me admin first.'
  }
  if (msg.includes('conflict') || msg.includes('already')) {
    return 'User is already in the group or has a pending invite.'
  }
  if (msg.includes('unavailable') || msg.includes('privacy')) {
    return 'User has privacy settings that block group invites.'
  }
  if (msg.includes('invalid') || msg.includes('bad request')) {
    return 'Invalid number format. Use full international format like 255712345678.'
  }
  if (msg.includes('rate-limit') || msg.includes('rate limited')) {
    return 'Too many requests. Try again in a few minutes.'
  }
  if (msg.includes('temporarily unavailable') || msg.includes('timeout')) {
    return 'WhatsApp is temporarily unavailable. Try again later.'
  }
  if (msg.includes('user not found') || msg.includes('not found')) {
    return 'User not found on WhatsApp.'
  }

  return 'Failed to add user. Reason: ' + err.message
}

export default async function add(sock, { msg, from, sender, isGroup, groupMetadata, args }, botSettings) {
  try {
    if (!isGroup) {
      return await sock.sendMessage(from, {
        text: '> This command only works in groups.'
      }, { quoted: msg })
    }

    const brandName = await getBrandName(botSettings)

    // Get target user: mention > reply > number
    let targetJid = null

    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid
    if (mentioned && mentioned.length > 0) {
      targetJid = mentioned[0]
    } else if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
      targetJid = msg.message.extendedTextMessage.contextInfo.participant
    } else if (args[0]) {
      targetJid = normalizeNumber(args[0])
    }

    if (!targetJid) {
      return await sock.sendMessage(from, {
        text: `╭─⌈ ADD USER ⌋
│ Usage:
│ ${botSettings.prefix}add 255712345678
│ ${botSettings.prefix}add 254712345678
│ ${botSettings.prefix}add 12025550123
│ ${botSettings.prefix}add @user
│ ${botSettings.prefix}add (reply to message)
│
│ Use full number with country code. No + or spaces.
╰⊷ *Powered By ${brandName}*`
      }, { quoted: msg })
    }

    // Check if already in group
    const alreadyMember = groupMetadata.participants.some(p => p.id === targetJid)
    if (alreadyMember) {
      return await sock.sendMessage(from, {
        text: `> @${targetJid.split('@')[0]} is already in this group.`,
        mentions: [targetJid]
      }, { quoted: msg })
    }

    // Check if number exists on WhatsApp
    let result
    try {
      [result] = await sock.onWhatsApp(targetJid.split('@')[0])
    } catch (err) {
      return await sock.sendMessage(from, {
        text: `> Could not verify number. Try again.`
      }, { quoted: msg })
    }

    if (!result?.exists) {
      return await sock.sendMessage(from, {
        text: `> Number ${targetJid.split('@')[0]} is not registered on WhatsApp.`
      }, { quoted: msg })
    }

    // Try to add user
    try {
      await sock.groupParticipantsUpdate(from, [targetJid], 'add')

      await sock.sendMessage(from, {
        text: `╭─⌈ USER ADDED ⌋
│ @${targetJid.split('@')[0]} added successfully
│ Welcome to the group!
╰⊷ *Powered By ${brandName}*`,
        mentions: [targetJid]
      }, { quoted: msg })

    } catch (err) {
      const errorMsg = getErrorMessage(err)

      await sock.sendMessage(from, {
        text: `╭─⌈ ADD FAILED ⌋
│ ${errorMsg}
╰⊷ *Powered By ${brandName}*`
      }, { quoted: msg })
    }

  } catch (err) {
    console.error('[ADD ERROR]', err)
    await sock.sendMessage(from, {
      text: '> An unexpected error occurred. Check console for details.'
    }, { quoted: msg })
  }
}