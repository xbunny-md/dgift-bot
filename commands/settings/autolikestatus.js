// commands/settings/autolikestatus.js
export const name = 'autolikestatus'
export const alias = ['autolike', 'likestatus', 'autols']
export const category = 'Settings'
export const desc = 'Toggle auto like status on/off'

export default async function autolikestatus(sock, { msg, from, sender }, botSettings) {
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
 .select('autolikestatus')
 .eq('id', targetJid)
 .maybeSingle()

    const currentValue = settings?.autolikestatus || false

    // Onyesha status kama hakuna action
    if (!action) {
      await sock.sendMessage(from, { react: { text: '❤️', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ ❤️ *AutoLike Status Control* ⌋
│ Status: ${currentValue? 'ON ✅' : 'OFF ❌'}
│ Target: Global 🌍
│
│ Usage:
│ ${botSettings.prefix}autolikestatus on
│ ${botSettings.prefix}autolikestatus off
│
│ Note: Bot will like all statuses with random emojis
╰⊷ *${botSettings.botname}*`
      }, { quoted: msg })
    }

    const newValue = ['on', 'enable', '1'].includes(action)

    // Angalia kama tayari iko hivyo
    if (newValue === currentValue) {
      await sock.sendMessage(from, { react: { text: '⚠️', key: msg.key } })
      return await sock.sendMessage(from, { text: `> AutoLikeStatus is already ${action}` }, { quoted: msg })
    }

    // Sasisha database
    const { error } = await botSettings.supabase
 .from('b_settings')
 .upsert({
        id: targetJid,
        autolikestatus: newValue,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })

    if (error) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: `> Database error: ${error.message}` }, { quoted: msg })
    }

    // Sasisha live memory
    botSettings.autolikestatus = newValue

    await sock.sendMessage(from, { react: { text: newValue? '✅' : '❌', key: msg.key } })
    await sock.sendMessage(from, {
      text: `╭─⌈ ❤️ *Settings Updated* ⌋
│ Target: Global 🌍
│ AutoLikeStatus: ${newValue? 'ON ✅' : 'OFF ❌'}
│
│ ${newValue? 'Bot will now like all statuses automatically.' : 'Auto like status has been disabled.'}
╰⊷ *${botSettings.botname}*`
    }, { quoted: msg })

  } catch (err) {
    console.error(`[AUTOLIKESTATUS CMD ERROR]`, err.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Failed. Check database.' }, { quoted: msg })
  }
}