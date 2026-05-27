export const name = 'antileave'
export const alias = ['no-leave', 'forcejoin']
export const category = 'Group'
export const desc = 'Toggle antileave on/off for this group'

export default async function antileave(sock, { msg, from, sender }, botSettings) {
  try {
    if (!botSettings.supabase) {
      return sock.sendMessage(from, { text: '> Database connection not ready.' }, { quoted: msg })
    }

    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const action = args[0]?.toLowerCase()

    const targetJid = from // per group

    const { data: settings } = await botSettings.supabase
    .from('b_settings')
    .select('antileave_enabled')
    .eq('id', targetJid)
    .maybeSingle()

    const currentValue = settings?.antileave_enabled || false

    if (!action) {
      await sock.sendMessage(from, { react: { text: '🚪', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 🚪 *AntiLeave Control* ⌋
│ Status: ${currentValue? 'ON ✅' : 'OFF ❌'}
│
│ Usage:
│ ${botSettings.prefix}antileave on
│ ${botSettings.prefix}antileave off
╰⊷ *${botSettings.botname}*`
      }, { quoted: msg })
    }

    const newValue = ['on', 'enable', '1'].includes(action)
    if (newValue === currentValue) {
      await sock.sendMessage(from, { react: { text: '⚠️', key: msg.key } })
      return await sock.sendMessage(from, { text: `> AntiLeave is already ${action}` }, { quoted: msg })
    }

    const { error } = await botSettings.supabase
    .from('b_settings')
    .upsert(
        {
          id: targetJid,
          antileave_enabled: newValue,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'id' }
      )

    if (error) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: `> Database error: ${error.message}` }, { quoted: msg })
    }

    await sock.sendMessage(from, { react: { text: newValue? '✅' : '❌', key: msg.key } })
    await sock.sendMessage(from, {
      text: `╭─⌈ 🚪 *Settings Updated* ⌋
│ AntiLeave: ${newValue? 'ON ✅' : 'OFF ❌'}
│
│ ${newValue? 'Anyone who leaves will be re-added automatically.' : 'Users can leave freely.'}
╰⊷ *${botSettings.botname}*`
    }, { quoted: msg })

  } catch (err) {
    console.error(`[ANTILEAVE CMD ERROR]`, err.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Failed. Check database.' }, { quoted: msg })
  }
}