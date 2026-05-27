// observers/antidemote.js
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
    return 'I need to be an admin to promote members. Make me admin first.'
  }
  if (msg.includes('participant not found') || msg.includes('not found')) {
    return 'User is not in this group.'
  }
  if (msg.includes('cannot promote') || msg.includes('admin')) {
    return 'I cannot promote this user. Reason: ' + err.message
  }
  if (msg.includes('rate-limit')) {
    return 'Too many requests. Try again in a few minutes.'
  }
  if (msg.includes('timeout')) {
    return 'WhatsApp is temporarily unavailable. Try again later.'
  }

  return 'Failed to promote user. Reason: ' + err.message
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

export default async function antidemote(sock, event, botSettings) {
  try {
    const { id: groupId, author, participants } = event
    if (!participants?.length ||!author) return
    if (!botSettings?.supabase) return

    const { data: settings } = await botSettings.supabase
.from('b_settings')
.select('anti_demote, warn_limit, warn_action')
.eq('id', groupId)
.maybeSingle()

    if (!settings?.anti_demote) return

    const brandName = await getBrandName(botSettings)

    for (const participant of participants) {
      if (participant.action === 'demote') {
        const demotedUser = participant.id

        try {
          // Jaribu promote moja kwa moja
          await sock.groupParticipantsUpdate(groupId, [demotedUser], 'promote')
        } catch (err) {
          const errorMsg = getErrorMessage(err)
          await sock.sendMessage(groupId, {
            text: `╭─⌈ ANTIDEMOTE FAILED ⌋
│ ${errorMsg}
╰⊷ *Powered By ${brandName}*`
          }).catch(() => {})
        }

        // Warn mtu aliyefanya demote
        const warnCount = await addWarn(botSettings, groupId, author, 'Demoted admin illegally')

        await sock.sendMessage(groupId, {
text: `╭─⌈ 🚫 *AntiDemote* ⌋
│ User: @${author.split('@')[0]}
│ Action: Demoted @${demotedUser.split('@')[0]}
│ Warn: ${warnCount}/${settings.warn_limit || 3}
╰⊷ *Powered By ${brandName}*`,
mentions: [author, demotedUser]
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
    console.log('[ANTIDEMOTE ERROR]', err.message)
  }
}