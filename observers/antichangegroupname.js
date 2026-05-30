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
    // FIX: Baileys groups.update event inakuja hivi
    const { id: groupId, participants, desc, subject, announce } = event
    if (!groupId) return
    if (!botSettings?.supabase) return

    // Check kama subject ilibadilika tu
    if (!subject) return

    // Check kama feature iko ON
    const { data: settings } = await botSettings.supabase
     .from('b_settings')
     .select('anti_change_group_name, warn_enabled, warn_limit, warn_action')
     .eq('id', groupId)
     .maybeSingle()

    if (!settings?.anti_change_group_name) return

    const brandName = await getBrandName(botSettings)

    // Pata author wa kubadilisha jina - Baileys haiweki author hapa
    // Lazima tuangalie audit log au tuchukue admin wa kwanza
    const groupMeta = await sock.groupMetadata(groupId).catch(() => null)
    if (!groupMeta) return

    const currentName = subject
    const storedName = settings.anti_change_group_name_settings?.original_name

    // Kama ni mara ya kwanza, hifadhi jina la sasa
    if (!storedName) {
      await botSettings.supabase
       .from('b_settings')
       .update({
          anti_change_group_name_settings: { original_name: currentName, enabled_at: new Date().toISOString() }
        })
       .eq('id', groupId)
      console.log(`[ANTI] Saved original name: ${currentName}`)
      return
    }

    // Kama jina limebadilika, rudisha na adhibu
    if (currentName!== storedName) {
      // Rudisha jina la zamani
      await sock.groupUpdateSubject(groupId, storedName).catch(() => {})

      // Pata author - chukua admin wa kwanza kama placeholder
      const admin = groupMeta.participants.find(p => p.admin)?.id || groupMeta.owner
      const author = admin || groupMeta.participants[0]?.id

      if (author) {
        // Warn mtu
        const warnCount = await addWarn(botSettings, groupId, author, 'Changed group name')

        await sock.sendMessage(groupId, {
          text: `╭─⌈ 🚫 *AntiChangeGroupName* ⌋
│ Action: Group name changed
│ Restored to: ${storedName}
│ Warn: ${warnCount}/${settings.warn_limit || 3}
╰⊷ *Powered By ${brandName}*`
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
    }

  } catch (err) {
    console.log('[ANTICHANGEGROUPNAME ERROR]', err.message)
  }
}