// commands/settings/autoread.js
export const name = 'autoread'
export const alias = ['autord', 'readon']
export const category = 'Settings'
export const desc = 'Toggle auto read messages on/off'

export default async function autoread(sock, { msg, from, sender, instanceId }, botSettings) {
  try {
    // Angalia kama database ipo
    if (!botSettings.supabase) {
      return sock.sendMessage(from, { text: '> Database connection not ready.' }, { quoted: msg })
    }

    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const action = args[0]?.toLowerCase()

    // FIX: Tumia instanceId moja kwa moja
    const targetJid = instanceId

    // Chukua status ya sasa
    const { data: settings, error: fetchError } = await botSettings.supabase
   .from('b_settings')
   .select('autoread')
   .eq('id', targetJid)
   .maybeSingle()

    if (fetchError) {
      console.error('[AUTOREAD FETCH ERROR]', fetchError)
      return sock.sendMessage(from, { text: '> Database fetch error.' }, { quoted: msg })
    }

    const currentValue = settings?.autoread || false

    // Onyesha status kama hakuna action
    if (!action) {
      await sock.sendMessage(from, { react: { text: '👁️', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 👁️ *AutoRead Control* ⌋
│ Status: ${currentValue? 'ON ✅' : 'OFF ❌'}
│ Instance: ${targetJid}
│
│ Usage:
│ ${botSettings.prefix}autoread on
│ ${botSettings.prefix}autoread off
│
│ Note: Bot will mark messages as read automatically
╰⊷ *${botSettings.botname}*`
      }, { quoted: msg })
    }

    const validOptions = ['on', 'off', 'enable', 'disable', '1', '0']
    if (!validOptions.includes(action)) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: `> Invalid option. Use: on/off` }, { quoted: msg })
    }

    const newValue = ['on', 'enable', '1'].includes(action)

    // Angalia kama tayari iko hivyo
    if (newValue === currentValue) {
      await sock.sendMessage(from, { react: { text: '⚠️', key: msg.key } })
      return await sock.sendMessage(from, { text: `> AutoRead is already ${action}` }, { quoted: msg })
    }

    // Sasisha database kwa instanceId
    const { error } = await botSettings.supabase
   .from('b_settings')
   .upsert(
        {
          id: targetJid,
          autoread: newValue,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'id' }
      )

    if (error) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: `> Database error: ${error.message}` }, { quoted: msg })
    }

    // Sasisha live memory
    botSettings.autoread = newValue

    await sock.sendMessage(from, { react: { text: newValue? '✅' : '❌', key: msg.key } })
    await sock.sendMessage(from, {
      text: `╭─⌈ 👁️ *Settings Updated* ⌋
│ Instance: ${targetJid}
│ AutoRead: ${newValue? 'ON ✅' : 'OFF ❌'}
│ Status: Applied instantly
│
│ ${newValue? 'All messages will be marked as read.' : 'Auto read has been disabled.'}
╰⊷ *${botSettings.botname}*`
    }, { quoted: msg })

  } catch (err) {
    console.error(`[AUTOREAD CMD ERROR]`, err.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Failed. Check database.' }, { quoted: msg })
  }
}