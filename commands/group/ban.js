// commands/group/ban.js
export const name = 'ban'
export const alias = ['tempban', 'tb']
export const category = 'Group'
export const desc = 'Toggle ban system or ban user for a duration'

export default async function banCommand(sock, { msg, from }, botSettings) {
  try {
    if (!botSettings.supabase) {
      return sock.sendMessage(from, { text: '> Database connection not ready.' }, { quoted: msg })
    }

    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const action = args[0]?.toLowerCase()
    const targetJid = 'DGIFT_DEFAULT'

    // Get current status
    const { data: settings } = await botSettings.supabase
 .from('b_settings')
 .select('ban_enabled, ban_action')
 .eq('id', targetJid)
 .maybeSingle()

    const currentValue = settings?.ban_enabled || false
    const currentAction = settings?.ban_action || 'kick'

    // Show status if no action
    if (!action) {
      await sock.sendMessage(from, { react: { text: '⛔', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ ⛔ *Ban Control* ⌋
│ Status: ${currentValue? 'ON ✅' : 'OFF ❌'}
│ Action: ${currentAction}
│ Target: Global
│
│ Usage:
│ ${botSettings.prefix}ban on
│ ${botSettings.prefix}ban off
│ ${botSettings.prefix}ban @user 5min reason
│
│ Duration format: 5s, 10min, 2h, 3d
│ Supports: s, sec, minute, min, hour, h, day, d
╰⊷ *${botSettings.botname}*`
      }, { quoted: msg })
    }

    // ON/OFF toggle logic
    if (action === 'on' || action === 'off' || action === 'enable' || action === 'disable' || action === '1' || action === '0') {
      const newValue = ['on', 'enable', '1'].includes(action)

      if (newValue === currentValue) {
        await sock.sendMessage(from, { react: { text: '⚠️', key: msg.key } })
        return await sock.sendMessage(from, { text: `> Ban system is already ${action}` }, { quoted: msg })
      }

      const { error } = await botSettings.supabase
   .from('b_settings')
   .upsert({
          id: targetJid,
          ban_enabled: newValue,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' })

      if (error) {
        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
        return await sock.sendMessage(from, { text: `> Database error: ${error.message}` }, { quoted: msg })
      }

      botSettings.ban_enabled = newValue

      await sock.sendMessage(from, { react: { text: newValue? '✅' : '❌', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ ⛔ *Settings Updated* ⌋
│ Target: Global 🌍
│ Ban System: ${newValue? 'ON ✅' : 'OFF ❌'}
│
│ ${newValue? 'Users can now be banned temporarily.' : 'Ban system is disabled.'}
╰⊷ *${botSettings.botname}*`
      }, { quoted: msg })
    }

    // Ban user logic
    if (!currentValue) {
      return sock.sendMessage(from, { text: '> Ban system is disabled. Enable it with `.ban on`' }, { quoted: msg })
    }

    const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
    if (!mentionedJid) {
      return sock.sendMessage(from, { text: '> Tag a user to ban.' }, { quoted: msg })
    }

    const durationStr = args[1]
    if (!durationStr) {
      return sock.sendMessage(from, { text: '> Specify duration. Example: 5min, 1h, 2d' }, { quoted: msg })
    }

    const reason = args.slice(2).join(' ') || 'No reason'

    const durationMs = parseDuration(durationStr)
    if (!durationMs) {
      return sock.sendMessage(from, { text: '> Invalid duration. Use: 5min, 30s, 1h, 2d' }, { quoted: msg })
    }

    const unbanAt = new Date(Date.now() + durationMs).toISOString()

    const { error } = await botSettings.supabase
 .from('banned_users')
 .upsert({
        group_id: from,
        user_id: mentionedJid,
        reason: reason,
        unban_at: unbanAt,
        created_at: new Date().toISOString()
      }, { onConflict: 'group_id,user_id' })

    if (error) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: `> Database error: ${error.message}` }, { quoted: msg })
    }

    await sock.groupParticipantsUpdate(from, [mentionedJid], 'remove').catch(() => {})

    setTimeout(async () => {
      await botSettings.supabase
   .from('banned_users')
   .delete()
   .eq('group_id', from)
   .eq('user_id', mentionedJid)
    }, durationMs)

    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })
    await sock.sendMessage(from, {
      text: `╭─⌈ ⛔ *User Banned* ⌋
│ User: @${mentionedJid.split('@')[0]}
│ Duration: ${formatDuration(durationMs)}
│ Reason: ${reason}
│ Action: ${currentAction}
│
│ User will be auto-unbanned after ${formatDuration(durationMs)}
╰⊷ *${botSettings.botname}*`,
      mentions: [mentionedJid]
    }, { quoted: msg })

  } catch (err) {
    console.error(`[BAN CMD ERROR]`, err.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Failed. Check database.' }, { quoted: msg })
  }
}

const parseDuration = (input) => {
  const match = /^(\d+)(s|sec|second|seconds|min|minute|minutes|m|h|hour|hours|d|day|days)$/.exec(input.toLowerCase())
  if (!match) return null

  const value = parseInt(match[1])
  const unit = match[2]

  const multipliers = {
    s: 1, sec: 1, second: 1, seconds: 1,
    m: 60, min: 60, minute: 60, minutes: 60,
    h: 3600, hour: 3600, hours: 3600,
    d: 86400, day: 86400, days: 86400
  }

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