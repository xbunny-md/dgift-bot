// commands/settings/autogreet.js
export const name = 'autogreet'
export const alias = ['autowelcome', 'welcome']
export const category = 'Settings'
export const desc = 'Toggle auto greet for new group members on/off'

export default async function autogreet(sock, { msg, from, sender }, botSettings) {
  try {
    // Check if database is ready
    if (!botSettings.supabase) {
      return sock.sendMessage(from, { text: '> Database connection not ready.' }, { quoted: msg })
    }

    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const action = args[0]?.toLowerCase()

    const targetJid = 'instanceId' // global setting

    // Get current status
    const { data: settings } = await botSettings.supabase
  .from('b_settings')
  .select('autogreet')
  .eq('id', targetJid)
  .maybeSingle()

    const currentValue = settings?.autogreet || false

    // Show status if no action provided
    if (!action) {
      await sock.sendMessage(from, { react: { text: '👋', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 👋 *AutoGreet Control* ⌋
│ Status: ${currentValue? 'ON ✅' : 'OFF ❌'}
│ Target: Global 🌍
│
│ Usage:
│ ${botSettings.prefix}autogreet on
│ ${botSettings.prefix}autogreet off
│
│ Note: Bot will greet new members based on time of day
╰⊷ *${botSettings.botname}*`
      }, { quoted: msg })
    }

    const newValue = ['on', 'enable', '1', 'true'].includes(action)

    // Check if already set
    if (newValue === currentValue) {
      await sock.sendMessage(from, { react: { text: '⚠️', key: msg.key } })
      return await sock.sendMessage(from, { text: `> AutoGreet is already ${action}` }, { quoted: msg })
    }

    // Update database
    const { error } = await botSettings.supabase
  .from('b_settings')
  .upsert({
        id: targetJid,
        autogreet: newValue,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })

    if (error) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: `> Database error: ${error.message}` }, { quoted: msg })
    }

    // Update live memory
    botSettings.autogreet = newValue

    await sock.sendMessage(from, { react: { text: newValue? '✅' : '❌', key: msg.key } })
    await sock.sendMessage(from, {
      text: `╭─⌈ 👋 *Settings Updated* ⌋
│ Target: Global 🌍
│ AutoGreet: ${newValue? 'ON ✅' : 'OFF ❌'}
│
│ ${newValue? 'Bot will now greet new members automatically.' : 'Auto greet has been disabled.'}
╰⊷ *${botSettings.botname}*`
    }, { quoted: msg })

  } catch (err) {
    console.error(`[AUTOGREET CMD ERROR]`, err.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Failed. Check database.' }, { quoted: msg })
  }
}