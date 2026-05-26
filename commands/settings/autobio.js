// commands/settings/autobio.js
export const name = 'autobio'
export const alias = ['autob', 'autobioupdate']
export const category = 'Settings'
export const desc = 'Toggle auto bio update on/off'

export default async function autobio(sock, { msg, from, sender }, botSettings) {
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
.select('autobio')
.eq('id', targetJid)
.maybeSingle()

    const currentValue = settings?.autobio || false

    // Onyesha status kama hakuna action
    if (!action) {
      await sock.sendMessage(from, { react: { text: '📝', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 📝 *AutoBio Control* ⌋
│ Status: ${currentValue? 'ON ✅' : 'OFF ❌'}
│ Target: Global 🌍
│
│ Usage:
│ ${botSettings.prefix}autobio on
│ ${botSettings.prefix}autobio off
│
│ Note: Bot will update bio automatically with random 150+ char bios
╰⊷ *${botSettings.botname}*`
      }, { quoted: msg })
    }

    const newValue = ['on', 'enable', '1'].includes(action)

    // Angalia kama tayari iko hivyo
    if (newValue === currentValue) {
      await sock.sendMessage(from, { react: { text: '⚠️', key: msg.key } })
      return await sock.sendMessage(from, { text: `> AutoBio is already ${action}` }, { quoted: msg })
    }

    // Sasisha database
    const { error } = await botSettings.supabase
.from('b_settings')
.upsert({
        id: targetJid,
        autobio: newValue,
        updated_at: new Date().toISOString()
   }, { onConflict: 'id' })

    if (error) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: `> Database error: ${error.message}` }, { quoted: msg })
    }

    // Sasisha live memory
    botSettings.autobio = newValue

    await sock.sendMessage(from, { react: { text: newValue? '✅' : '❌', key: msg.key } })
    await sock.sendMessage(from, {
      text: `╭─⌈ 📝 *Settings Updated* ⌋
│ Target: Global 🌍
│ AutoBio: ${newValue? 'ON ✅' : 'OFF ❌'}
│
│ ${newValue? 'Bot will update bio automatically with random bios.' : 'Auto bio update has been disabled.'}
╰⊷ *${botSettings.botname}*`
    }, { quoted: msg })

  } catch (err) {
    console.error(`[AUTOBIO CMD ERROR]`, err.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Failed. Check database.' }, { quoted: msg })
  }
}