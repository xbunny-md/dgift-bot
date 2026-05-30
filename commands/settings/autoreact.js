export const category = 'Settings'
export const desc = 'Toggle auto reaction on/off'

export default async function autoreact(sock, { msg, from, sender, instanceId }, botSettings) {
  try {
    // Angalia kama database ipo
    if (!botSettings.supabase) {
      return sock.sendMessage(from, { text: '> Database connection not ready.' }, { quoted: msg })
    }

    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const action = args[0]?.toLowerCase()

    // Tumia instanceId moja kwa moja - DGIFT_DEFAULT IMEONDOLEWA
    const targetJid = instanceId

    // Chukua status ya sasa
    const { data: settings, error: fetchError } = await botSettings.supabase
     .from('b_settings')
     .select('autoreact')
     .eq('id', targetJid)
     .maybeSingle()

    if (fetchError) {
      console.error('[AUTOREACT FETCH ERROR]', fetchError)
      return sock.sendMessage(from, { text: '> Database fetch error.' }, { quoted: msg })
    }

    const currentValue = settings?.autoreact || false

    // Onyesha status kama hakuna action
    if (!action) {
      await sock.sendMessage(from, { react: { text: '🔥', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 🔥 *AutoReact Control* ⌋
│ Status: ${currentValue? 'ON ✅' : 'OFF ❌'}
│ Instance: ${targetJid}
│
│ Usage:
│ ${botSettings.prefix}autoreact on
│ ${botSettings.prefix}autoreact off
│
│ Note: Bot will react to messages automatically
╰⊷ *${botSettings.botname}*`
      }, { quoted: msg })
    }

    const newValue = ['on', 'enable', '1'].includes(action)

    // Angalia kama tayari iko hivyo
    if (newValue === currentValue) {
      await sock.sendMessage(from, { react: { text: '⚠️', key: msg.key } })
      return await sock.sendMessage(from, { text: `> AutoReact is already ${action}` }, { quoted: msg })
    }

    // Sasisha database kwa instanceId
    const { error } = await botSettings.supabase
     .from('b_settings')
     .upsert(
        {
          id: targetJid,
          autoreact: newValue,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'id' }
      )

    if (error) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: `> Database error: ${error.message}` }, { quoted: msg })
    }

    // Sasisha live memory kwa instance hii
    botSettings.autoreact = newValue

    await sock.sendMessage(from, { react: { text: newValue? '✅' : '❌', key: msg.key } })
    await sock.sendMessage(from, {
      text: `╭─⌈ 🔥 *Settings Updated* ⌋
│ Instance: ${targetJid}
│ AutoReact: ${newValue? 'ON ✅' : 'OFF ❌'}
│
│ ${newValue? 'Bot will now react to messages automatically.' : 'Auto reaction has been disabled.'}
╰⊷ *${botSettings.botname}*`
    }, { quoted: msg })

  } catch (err) {
    console.error(`[AUTOREACT CMD ERROR]`, err.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Failed. Check database.' }, { quoted: msg })
  }
}