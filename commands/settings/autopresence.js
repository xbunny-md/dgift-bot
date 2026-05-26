// commands/settings/autotyping.js
export const name = 'autotyping'
export const alias = ['autotype', 'typingon']
export const category = 'Settings'
export const desc = 'Toggle auto typing presence on/off'

export default async function autotyping(sock, { msg, from, sender }, botSettings) {
  try {
    // Angalia kama database ipo
    if (!botSettings.supabase) {
      return sock.sendMessage(from, { text: '> Database connection not ready.' }, { quoted: msg })
    }

    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const action = args[0]?.toLowerCase()

    const targetJid = 'DGIFT_DEFAULT' // global setting tu

    // Chukua status ya sasa
    const { data: settings } = await botSettings.supabase
.from('b_settings')
.select('autopresencecomposing')
.eq('id', targetJid)
.maybeSingle()

    const currentValue = settings?.autopresencecomposing || false

    // Onyesha status kama hakuna action
    if (!action) {
      await sock.sendMessage(from, { react: { text: '⌨️', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ ⌨️ *AutoTyping Control* ⌋
│ Status: ${currentValue? 'ON ✅' : 'OFF ❌'}
│ Target: Global
│
│ Usage:
│ ${botSettings.prefix}autotyping on
│ ${botSettings.prefix}autotyping off
│
│ Note: Bot will show typing indicator automatically
╰⊷ *${botSettings.botname}*`
      }, { quoted: msg })
    }

    const newValue = ['on', 'enable', '1'].includes(action)

    // Angalia kama tayari iko hivyo
    if (newValue === currentValue) {
      await sock.sendMessage(from, { react: { text: '⚠️', key: msg.key } })
      return await sock.sendMessage(from, { text: `> AutoTyping is already ${action}` }, { quoted: msg })
    }

    // Sasisha database
    const { error } = await botSettings.supabase
.from('b_settings')
.upsert(
    {
        id: targetJid,
        autopresencecomposing: newValue,
        updated_at: new Date().toISOString()
    },
    { onConflict: 'id' }
  )

    if (error) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: `> Database error: ${error.message}` }, { quoted: msg })
    }

    // Sasisha live memory
    botSettings.autopresencecomposing = newValue

    await sock.sendMessage(from, { react: { text: newValue? '✅' : '❌', key: msg.key } })
    await sock.sendMessage(from, {
      text: `╭─⌈ ⌨️ *Settings Updated* ⌋
│ Target: Global 🌍
│ AutoTyping: ${newValue? 'ON ✅' : 'OFF ❌'}
│
│ ${newValue? 'Bot will now show typing indicator.' : 'Auto typing has been disabled.'}
╰⊷ *${botSettings.botname}*`
    }, { quoted: msg })

  } catch (err) {
    console.error(`[AUTOTYPING CMD ERROR]`, err.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Failed. Check database connection.' }, { quoted: msg })
  }
}