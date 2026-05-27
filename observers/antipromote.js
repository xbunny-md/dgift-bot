// observers/antipromote.js
async function getBrandName(botSettings) {
  if (!botSettings?.supabase) return 'Bot'
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
    return 'I need to be an admin to demote members. Make me admin first.'
  }
  if (msg.includes('participant not found') || msg.includes('not found')) {
    return 'User is not in this group.'
  }
  if (msg.includes('cannot demote admin') || msg.includes('admin')) {
    return 'I cannot demote another admin. Demote them first.'
  }
  if (msg.includes('rate-limit')) {
    return 'Too many requests. Try again in a few minutes.'
  }
  if (msg.includes('timeout')) {
    return 'WhatsApp is temporarily unavailable. Try again later.'
  }

  return 'Failed to demote user. Reason: ' + err.message
}

async function getWarns(botSettings, groupId, userId) {
  const { data } = await botSettings.supabase
.from('warns')
.select('count')
.eq('group_id', groupId)
.eq('user_id', userId)
.maybeSingle()
  return data?.count || 0
}

async function addWarn(botSettings, groupId, userId, reason) {
  const current = await getWarns(botSettings, groupId, userId)
  const newCount = current + 1

  await botSettings.supabase
.from('warns')
.upsert({ group_id: groupId, user_id: userId, count: newCount, reason, updated_at: new Date().toISOString() },
  { onConflict: 'group_id,user_id' })

  return newCount
}

export default async function antipromote(sock, event, botSettings) {
  try {
    const { id: groupId, author, participants } = event
    if (!participants?.length ||!author) return
    if (!botSettings?.supabase) return

    const { data: settings } = await botSettings.supabase
.from('b_settings')
.select('anti_promote, warn_limit, warn_action')
.eq('id', groupId)
.maybeSingle()

    if (!settings?.anti_promote) return

    const brandName = await getBrandName(botSettings)

    for (const participant of participants) {
      if (participant.action === 'promote') {
        const promotedUser = participant.id

        try {
          // Jaribu demote moja kwa moja
          await sock.groupParticipantsUpdate(groupId, [promotedUser], 'demote')
        } catch (err) {
          const errorMsg = getErrorMessage(err)
          await sock.sendMessage(groupId, {
            text: `╭─⌈ ANTIPROMOTE FAILED ⌋
│ ${errorMsg}
╰⊷ *Powered By ${brandName}*`
          }).catch(() => {})
        }

        // Warn mtu aliyefanya promote
        const warnCount = await addWarn(botSettings, groupId, author, 'Promoted user illegally')

        await sock.sendMessage(groupId, {
text: `╭─⌈ 🚫 *AntiPromote* ⌋
│ User: @${author.split('@')[0]}
│ Action: Promoted @${promotedUser.split('@')[0]}
│ Warn: ${warnCount}/${settings.warn_limit || 3}
╰⊷ *Powered By ${brandName}*`,
mentions: [author, promotedUser]
        }).catch(() => {})

        // Kama warn limit imezidi, fanya action
        if (warnCount >= (settings.warn_limit || 3)) {
          try {
            await sock.groupParticipantsUpdate(groupId, [author], 'remove')
          } catch (err) {
            const errorMsg = getErrorMessage(err)
            await sock.sendMessage(groupId, {
              text: `╭─⌈ KICK FAILED ⌋
│ ${errorMsg}
╰⊷ *Powered By ${brandName}*`
            }).catch(() => {})
          }

          if (settings.warn_action === 'ban') {
            await botSettings.supabase
.from('bans')
.upsert({ group_id: groupId, user_id: author, banned_at: new Date().toISOString() },
  { onConflict: 'group_id,user_id' })
          }
        }
      }
    }

  } catch (err) {
    console.log('[ANTIPROMOTE ERROR]', err.message)
  }
}