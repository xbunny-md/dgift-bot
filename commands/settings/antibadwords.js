export const name = 'antibadword'
export const alias = ['badwordfilter', 'antislur']
export const category = 'Settings'
export const desc = 'Toggle antibadword on/off'

export default async function antibadword(sock, { msg, from, sender }, botSettings) {
  try {
    // Check if database is ready
    if (!botSettings.supabase) {
      return sock.sendMessage(from, { text: '> Database connection not ready.' }, { quoted: msg })
    }

    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const action = args[0]?.toLowerCase()

    const targetJid = from // per group setting

    // Get current status
    const { data: settings } = await botSettings.supabase
   .from('b_settings')
   .select('antibadword_enabled')
   .eq('id', instanceId)
   .maybeSingle()

    const currentValue = settings?.antibadword_enabled || false

    // Show status if no action provided
    if (!action) {
      await sock.sendMessage(from, { react: { text: '🤬', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 🤬 *AntiBadword Control* ⌋
│ Status: ${currentValue? 'ON ✅' : 'OFF ❌'}
│
│ Usage:
│ ${botSettings.prefix}antibadword on
│ ${botSettings.prefix}antibadword off
│
│ Note: Messages with bad words will be deleted
╰⊷ *${botSettings.botname}*`
      }, { quoted: msg })
    }

    const newValue = ['on', 'enable', '1'].includes(action)

    // Check if already set
    if (newValue === currentValue) {
      await sock.sendMessage(from, { react: { text: '⚠️', key: msg.key } })
      return await sock.sendMessage(from, { text: `> AntiBadword is already ${action}` }, { quoted: msg })
    }

    // Update database
    const { error } = await botSettings.supabase
   .from('b_settings')
   .upsert({
        id: targetJid,
        antibadword_enabled: newValue,
        updated_at: new Date().toISOString()
    }, { onConflict: 'id' })

    if (error) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: `> Database error: ${error.message}` }, { quoted: msg })
    }

    await sock.sendMessage(from, { react: { text: newValue? '✅' : '❌', key: msg.key } })
    await sock.sendMessage(from, {
      text: `╭─⌈ 🤬 *Settings Updated* ⌋
│ AntiBadword: ${newValue? 'ON ✅' : 'OFF ❌'}
│
│ ${newValue? 'Messages with bad words will be deleted and user warned.' : 'Bad word filter is disabled.'}
╰⊷ *${botSettings.botname}*`
    }, { quoted: msg })

  } catch (err) {
    console.error(`[ANTIBADWORD CMD ERROR]`, err.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Failed. Check database.' }, { quoted: msg })
  }
}