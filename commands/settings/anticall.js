// commands/settings/anticall.js
export const name = 'anticall'
export const alias = ['blockcall', 'nocall']
export const category = 'Settings'
export const desc = 'Toggle anti call on/off'

export default async function anticall(sock, { msg, from, sender }, botSettings) {
  try {
    if (!botSettings.supabase) {
      return sock.sendMessage(from, { text: '> Database connection not ready.' }, { quoted: msg })
    }

    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const action = args[0]?.toLowerCase()

    const targetJid = 'DGIFT_DEFAULT' // anticall is global only

    const { data: settings } = await botSettings.supabase
   .from('b_settings')
   .select('anticall')
   .eq('id', instanceId)
   .maybeSingle()

    const currentValue = settings?.anticall || false

    if (!action) {
      await sock.sendMessage(from, { react: { text: '📞', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 📞 *AntiCall Control* ⌋
│ Status: ${currentValue? 'ON ✅' : 'OFF ❌'}
│
│ Usage:
│ ${botSettings.prefix}anticall on
│ ${botSettings.prefix}anticall off
╰⊷ *${botSettings.botname}*`
      }, { quoted: msg })
    }

    const newValue = ['on', 'enable', '1'].includes(action)
    if (newValue === currentValue) {
      await sock.sendMessage(from, { react: { text: '⚠️', key: msg.key } })
      return await sock.sendMessage(from, { text: `> AntiCall is already ${action}` }, { quoted: msg })
    }

    const { error } = await botSettings.supabase
   .from('b_settings')
   .upsert(
        {
          id: targetJid,
          anticall: newValue,
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
      text: `╭─⌈ 📞 *Settings Updated* ⌋
│ AntiCall: ${newValue? 'ON ✅' : 'OFF ❌'}
│
│ ${newValue? 'All incoming calls will be rejected.' : 'Incoming calls will be allowed.'}
╰⊷ *${botSettings.botname}*`
    }, { quoted: msg })

  } catch (err) {
    console.error(`[ANTICALL CMD ERROR]`, err.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Failed. Check database.' }, { quoted: msg })
  }
}