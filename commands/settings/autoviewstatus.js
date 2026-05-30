// commands/settings/autoviewstatus.js
export const name = 'autoviewstatus'
export const alias = ['autoview', 'viewstatus', 'autovs']
export const category = 'Settings'
export const desc = 'Toggle auto view status on/off'

export default async function autoviewstatus(sock, { msg, from, sender, instanceId }, botSettings) {
  try {
    // Angalia kama database ipo
    if (!botSettings.supabase) {
      return sock.sendMessage(from, { text: '> Database connection not ready.' }, { quoted: msg })
    }

    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const action = args[0]?.toLowerCase()

    // FIX: Tumia instanceId variable, siyo string 'instanceId'
    const targetJid = instanceId

    // Chukua status ya sasa
    const { data: settings, error: fetchError } = await botSettings.supabase
    .from('b_settings')
    .select('autoviewstatus')
    .eq('id', targetJid)
    .maybeSingle()

    if (fetchError) {
      console.error('[AUTOVIEW FETCH ERROR]', fetchError)
      return sock.sendMessage(from, { text: '> Database fetch error.' }, { quoted: msg })
    }

    const currentValue = settings?.autoviewstatus || false

    // Onyesha status kama hakuna action
    if (!action) {
      await sock.sendMessage(from, { react: { text: '👁️', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 👁️ *AutoView Status Control* ⌋
│ Status: ${currentValue? 'ON ✅' : 'OFF ❌'}
│ Instance: ${targetJid}
│
│ Usage:
│ ${botSettings.prefix}autoviewstatus on
│ ${botSettings.prefix}autoviewstatus off
│
│ Note: Bot will view all statuses automatically
╰⊷ *${botSettings.botname}*`
      }, { quoted: msg })
    }

    const newValue = ['on', 'enable', '1'].includes(action)

    // Angalia kama tayari iko hivyo
    if (newValue === currentValue) {
      await sock.sendMessage(from, { react: { text: '⚠️', key: msg.key } })
      return await sock.sendMessage(from, { text: `> AutoViewStatus is already ${action}` }, { quoted: msg })
    }

    // Sasisha database
    const { error } = await botSettings.supabase
    .from('b_settings')
    .upsert({
        id: targetJid,
        autoviewstatus: newValue,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })

    if (error) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: `> Database error: ${error.message}` }, { quoted: msg })
    }

    // Sasisha live memory
    botSettings.autoviewstatus = newValue

    await sock.sendMessage(from, { react: { text: newValue? '✅' : '❌', key: msg.key } })
    await sock.sendMessage(from, {
      text: `╭─⌈ 👁️ *Settings Updated* ⌋
│ Instance: ${targetJid}
│ AutoViewStatus: ${newValue? 'ON ✅' : 'OFF ❌'}
│
│ ${newValue? 'Bot will now view all statuses automatically.' : 'Auto view status has been disabled.'}
╰⊷ *${botSettings.botname}*`
    }, { quoted: msg })

  } catch (err) {
    console.error(`[AUTOVIEWSTATUS CMD ERROR]`, err.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Failed. Check database.' }, { quoted: msg })
  }
}