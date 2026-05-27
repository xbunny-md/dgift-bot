// observers/antichangegroupname.js
import { GroupMetadata } from '@whiskeysockets/baileys'

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

export default async function antichangegroupname(sock, event, botSettings) {
  try {
    const { id: groupId, subject, author } = event
    if (!subject ||!author) return
    if (!botSettings?.supabase) return

    // Check kama feature iko ON
    const { data: settings } = await botSettings.supabase
 .from('b_settings')
 .select('anti_change_group_name, warn_enabled, warn_limit, warn_action')
 .eq('id', groupId)
 .maybeSingle()

    if (!settings?.anti_change_group_name) return

    const brandName = await getBrandName(botSettings)

    // Pata group metadata ya sasa
    const groupMeta = await sock.groupMetadata(groupId).catch(() => null)
    if (!groupMeta) return

    const currentName = groupMeta.subject
    const storedName = settings.anti_change_group_name_settings?.original_name

    // Kama ni mara ya kwanza, hifadhi jina la sasa
    if (!storedName) {
      await botSettings.supabase
.from('b_settings')
.update({
  anti_change_group_name_settings: { original_name: currentName, enabled_at: new Date().toISOString() }
})
.eq('id', groupId)
      return
    }

    // Kama jina limebadilika, rudisha na adhibu
    if (currentName!== storedName) {
      // Rudisha jina la zamani
      await sock.groupUpdateSubject(groupId, storedName).catch(() => {})

      // Warn mtu
      const warnCount = await addWarn(botSettings, groupId, author, 'Changed group name')

      await sock.sendMessage(groupId, {
text: `╭─⌈ 🚫 *AntiChangeGroupName* ⌋
│ User: @${author.split('@')[0]}
│ Action: Group name changed
│ Warn: ${warnCount}/${settings.warn_limit || 3}
│
│ Group name restored to original
╰⊷ *Powered By ${brandName}*`,
mentions: [author]
      }).catch(() => {})

      // Kama warn limit imezidi, fanya action
      if (warnCount >= (settings.warn_limit || 3)) {
if (settings.warn_action === 'kick') {
  await sock.groupParticipantsUpdate(groupId, [author], 'remove').catch(() => {})
} else if (settings.warn_action === 'ban') {
  await botSettings.supabase
.from('bans')
.upsert({ group_id: groupId, user_id: author, banned_at: new Date().toISOString() },
  { onConflict: 'group_id,user_id' })
  await sock.groupParticipantsUpdate(groupId, [author], 'remove').catch(() => {})
}
      }
    }

  } catch (err) {
    console.log('[ANTICHANGEGROUPNAME ERROR]', err.message)
  }
}