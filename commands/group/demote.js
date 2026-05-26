// commands/group/demote.js
export const name = 'demote'
export const alias = ['dem', 'removeadmin', 'unadmin']
export const category = 'Group'
export const desc = 'Demote an admin to member using mention, reply, or number.'

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
  if (num.startsWith('0')) num = num.slice(1)
  if (num.length >= 8 && num.length <= 15) {
    return num + '@s.whatsapp.net'
  }
  return null
}

function getErrorMessage(err) {
  const msg = err.message?.toLowerCase() || ''

  if (msg.includes('not-authorized') || msg.includes('forbidden')) {
    return 'I need to be an admin to demote members. Make me admin first.'
  }
  if (msg.includes('participant not found') || msg.includes('not found')) {
    return 'User is not in this group.'
  }
  if (msg.includes('not an admin')) {
    return 'This user is not an admin.'
  }
  if (msg.includes('cannot demote owner')) {
    return 'I cannot demote the group owner.'
  }
  if (msg.includes('invalid')) {
    return 'Invalid number format. Use full international format like 255712345678.'
  }
  if (msg.includes('rate-limit')) {
    return 'Too many requests. Try again in a few minutes.'
  }
  if (msg.includes('timeout')) {
    return 'WhatsApp is temporarily unavailable. Try again later.'
  }

  return 'Failed to demote user. Reason: ' + err.message
}

export default async function demote(sock, { msg, from, sender, isGroup, groupMetadata, args }, botSettings) {
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
        text: `╭─⌈ DEMOTE USER ⌋
│ Usage:
│ ${botSettings.prefix}demote @user
│ ${botSettings.prefix}demote 255712345678
│ ${botSettings.prefix}demote (reply to message)
│
│ Admin will become a regular member.
╰⊷ *Powered By ${brandName}*`
      }, { quoted: msg })
    }

    // Prevent demoting yourself or bot
    if (targetJid === sender) {
      return await sock.sendMessage(from, {
        text: '> You cannot demote yourself.'
      }, { quoted: msg })
    }

    if (targetJid === sock.user.id) {
      return await sock.sendMessage(from, {
        text: '> I cannot demote myself.'
      }, { quoted: msg })
    }

    // Check if user is in group
    const participant = groupMetadata.participants.find(p => p.id === targetJid)
    if (!participant) {
      return await sock.sendMessage(from, {
        text: `> @${targetJid.split('@')[0]} is not in this group.`,
        mentions: [targetJid]
      }, { quoted: msg })
    }

    // Check if target is actually an admin
    if (!participant.admin) {
      return await sock.sendMessage(from, {
        text: `> @${targetJid.split('@')[0]} is not an admin.`,
        mentions: [targetJid]
      }, { quoted: msg })
    }

    // Try to demote user
    try {
      await sock.groupParticipantsUpdate(from, [targetJid], 'demote')

      await sock.sendMessage(from, {
        text: `╭─⌈ USER DEMOTED ⌋
│ @${targetJid.split('@')[0]} is now a regular member.
╰⊷ *Powered By ${brandName}*`,
        mentions: [targetJid]
      }, { quoted: msg })

    } catch (err) {
      const errorMsg = getErrorMessage(err)

      await sock.sendMessage(from, {
        text: `╭─⌈ DEMOTE FAILED ⌋
│ ${errorMsg}
╰⊷ *Powered By ${brandName}*`
      }, { quoted: msg })
    }

  } catch (err) {
    console.error('[DEMOTE ERROR]', err)
    await sock.sendMessage(from, {
      text: '> An unexpected error occurred. Check console for details.'
    }, { quoted: msg })
  }
}