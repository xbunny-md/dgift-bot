// observers/ban.js
const parseDuration = (input) => {
  const match = /^(\d+)(s|m|h|d)$/.exec(input.toLowerCase())
  if (!match) return null
  const value = parseInt(match[1])
  const unit = match[2]
  const multipliers = { s: 1, m: 60, h: 3600, d: 86400 }
  return value * multipliers[unit] * 1000
}

const formatDuration = (ms) => {
  const sec = Math.floor(ms / 1000)
  const d = Math.floor(sec / 86400)
  const h = Math.floor((sec % 86400) / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

async function getGroupSettings(supabase, groupId) {
  if (!supabase) return null
  const { data: groupSettings } = await supabase
   .from('b_settings')
   .select('*')
   .eq('id', groupId)
   .maybeSingle()
  if (groupSettings?.ban_enabled) return groupSettings
  const { data: globalSettings } = await supabase
   .from('b_settings')
   .select('*')
   .eq('id', 'DGIFT_DEFAULT')
   .maybeSingle()
  return globalSettings
}

export const name = 'ban'

export default async function banObserver(sock, event, botSettings) {
  try {
    const { id: groupId, participants, action } = event
    if (action!== 'add') return
    if (!botSettings.supabase) return

    const settings = await getGroupSettings(botSettings.supabase, groupId)
    if (!settings?.ban_enabled) return

    for (const userId of participants) {
      const { data: banData } = await botSettings.supabase
       .from('banned_users')
       .select('*')
       .eq('group_id', groupId)
       .eq('user_id', userId)
       .maybeSingle()

      if (!banData) continue

      const now = Date.now()
      const unbanTime = new Date(banData.unban_at).getTime()

      if (unbanTime <= now) {
        await botSettings.supabase
         .from('banned_users')
         .delete()
         .eq('group_id', groupId)
         .eq('user_id', userId)
        continue
      }

      await sock.groupParticipantsUpdate(groupId, [userId], 'remove').catch(() => {})
    }
  } catch (err) {
    console.error('[BAN OBSERVER ERROR]', err.message)
  }
}

// Call this function to ban a user
export async function banUser(sock, groupId, userId, durationStr, reason, botSettings) {
  try {
    if (!botSettings.supabase) return { success: false, msg: 'Database not ready' }

    const durationMs = parseDuration(durationStr)
    if (!durationMs) return { success: false, msg: 'Invalid duration. Use 5min, 5000s, 78h, 2d' }

    const unbanAt = new Date(Date.now() + durationMs).toISOString()

    await botSettings.supabase
     .from('banned_users')
     .upsert({
        group_id: groupId,
        user_id: userId,
        reason: reason || 'No reason',
        unban_at: unbanAt,
        created_at: new Date().toISOString()
      }, { onConflict: 'group_id,user_id' })

    await sock.groupParticipantsUpdate(groupId, [userId], 'remove').catch(() => {})

    setTimeout(async () => {
      await botSettings.supabase
       .from('banned_users')
       .delete()
       .eq('group_id', groupId)
       .eq('user_id', userId)
    }, durationMs)

    return { success: true, msg: `Banned for ${formatDuration(durationMs)}` }
  } catch (err) {
    console.error('[BAN USER ERROR]', err.message)
    return { success: false, msg: err.message }
  }
}

// Message handler to delete messages and handle warnings
export async function checkBannedMessage(sock, msg, botSettings) {
  try {
    const from = msg.key.remoteJid
    const sender = msg.key.participant || msg.key.remoteJid
    if (!from.endsWith('@g.us') || msg.key.fromMe) return

    const { data: banData } = await botSettings.supabase
     .from('banned_users')
     .select('*')
     .eq('group_id', from)
     .eq('user_id', sender)
     .maybeSingle()

    if (!banData) return

    const now = Date.now()
    const unbanTime = new Date(banData.unban_at).getTime()

    if (unbanTime <= now) {
      await botSettings.supabase
       .from('banned_users')
       .delete()
       .eq('group_id', from)
       .eq('user_id', sender)
      return
    }

    await sock.sendMessage(from, { delete: msg.key }).catch(() => {})

    const settings = await getGroupSettings(botSettings.supabase, from)
    if (!settings?.warn_enabled) return

    const { data: warnData } = await botSettings.supabase
     .from('group_warns')
     .select('count')
     .eq('group_id', from)
     .eq('user_id', sender)
     .maybeSingle()

    const newCount = (warnData?.count || 0) + 1
    const warnLimit = settings.warn_limit || 3

    await botSettings.supabase
     .from('group_warns')
     .upsert({
        group_id: from,
        user_id: sender,
        count: newCount,
        reason: 'Banned user tried to send message',
        updated_at: new Date().toISOString()
      }, { onConflict: 'group_id,user_id' })

    if (newCount >= warnLimit) {
      const action = settings.warn_action || 'kick'
      if (action === 'kick' || action === 'ban') {
        await sock.groupParticipantsUpdate(from, [sender], 'remove').catch(() => {})
      }
    }
  } catch (err) {
    console.error('[CHECK BANNED MESSAGE ERROR]', err.message)
  }
}