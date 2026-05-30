// commands/settings/antitag.js
export const name = 'antitag'
export const alias = ['antimention', 'notag']
export const category = 'Settings'
export const desc = 'Toggle anti tag on/off'

export default async function antitag(sock, { msg, from, sender }, botSettings) {
  try {
    if (!botSettings.supabase) {
      return sock.sendMessage(from, { text: '> Database connection not ready.' }, { quoted: msg })
    }

    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const action = args[0]?.toLowerCase()

    const targetJid = 'DGIFT_DEFAULT'

    const { data: settings } = await botSettings.supabase
.from('b_settings')
.select('antitag')
.eq('id', instanceId)
.maybeSingle()

    const currentValue = settings?.antitag || false

    if (!action) {
      await sock.sendMessage(from, { react: { text: '🚫', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 🚫 *AntiTag Control* ⌋
│ Status: ${currentValue? 'ON ✅' : 'OFF ❌'}
│ Target: Global 🌍
│ Limit: 10 tags per message
│
│ Usage:
│ ${botSettings.prefix}antitag on
│ ${botSettings.prefix}antitag off
│
│ Note: Messages with more than 10 tags will be deleted
╰⊷ *${botSettings.botname}*`
      }, { quoted: msg })
    }

    const newValue = ['on', 'enable', '1'].includes(action)

    if (newValue === currentValue) {
      await sock.sendMessage(from, { react: { text: '⚠️', key: msg.key } })
      return await sock.sendMessage(from, { text: `> AntiTag is already ${action}` }, { quoted: msg })
    }

    const { error } = await botSettings.supabase
.from('b_settings')
.upsert({
        id: targetJid,
        antitag: newValue,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })

    if (error) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: `> Database error: ${error.message}` }, { quoted: msg })
    }

    botSettings.antitag = newValue

    await sock.sendMessage(from, { react: { text: newValue? '✅' : '❌', key: msg.key } })
    await sock.sendMessage(from, {
      text: `╭─⌈ 🚫 *Settings Updated* ⌋
│ Target: Global 🌍
│ AntiTag: ${newValue? 'ON ✅' : 'OFF ❌'}
│ Limit: 10 tags per message
│
│ ${newValue? 'Messages with more than 10 tags will be deleted.' : 'Anti tag has been disabled.'}
╰⊷ *${botSettings.botname}*`
    }, { quoted: msg })

  } catch (err) {
    console.error(`[ANTITAG CMD ERROR]`, err.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Failed. Check database.' }, { quoted: msg })
  }
}