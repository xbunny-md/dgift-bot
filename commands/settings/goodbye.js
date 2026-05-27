export const name = 'goodbye'
export const alias = ['goodby', 'bye']
export const category = 'Settings'
export const desc = 'Toggle goodbye message on/off globally and set message'

export default async function goodbye(sock, { msg, from, sender }, botSettings) {
  try {
    if (!botSettings.supabase) {
      return sock.sendMessage(from, { text: '> Database connection not ready.' }, { quoted: msg })
    }

    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const subCmd = args[0]?.toLowerCase()

    const targetJid = 'DGIFT_DEFAULT'

    const { data: settings } = await botSettings.supabase
  .from('b_settings')
  .select('goodbye_enabled, goodbye_msg')
  .eq('id', targetJid)
  .maybeSingle()

    const currentValue = settings?.goodbye_enabled || false
    const currentMsg = settings?.goodbye_msg || 'Kwaheri @user'

    // No subcommand = show status
    if (!subCmd) {
      await sock.sendMessage(from, { react: { text: '👋', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 👋 *Goodbye Control* ⌋
│ Status: ${currentValue? 'ON ✅' : 'OFF ❌'}
│ Target: Global
│
│ Current Message:
│ ${currentMsg}
│
│ Usage:
│ ${botSettings.prefix}goodbye on
│ ${botSettings.prefix}goodbye off
│ ${botSettings.prefix}goodbye set <message>
│
│ Variables: @user, {group}, {bot}
│ Note: Sends goodbye message when someone leaves
╰⊷ *${botSettings.botname}*`
      }, { quoted: msg })
    }

    // Set message
    if (subCmd === 'set') {
      const newMsg = args.slice(1).join(' ')
      if (!newMsg) {
        return sock.sendMessage(from, {
          text: `> Usage: ${botSettings.prefix}goodbye set Kwaheri @user from {group}`
        }, { quoted: msg })
      }

      const { error } = await botSettings.supabase
    .from('b_settings')
    .upsert({
          id: targetJid,
          goodbye_msg: newMsg,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' })

      if (error) {
        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
        return await sock.sendMessage(from, { text: `> Database error: ${error.message}` }, { quoted: msg })
      }

      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 👋 *Goodbye Message Updated* ⌋
│ New Message:
│ ${newMsg}
│
│ Variables: @user, {group}, {bot}
╰⊷ *${botSettings.botname}*`
      }, { quoted: msg })
    }

    // On/Off toggle
    const newValue = ['on', 'enable', '1'].includes(subCmd)
    if (!['on', 'off', 'enable', 'disable', '1', '0'].includes(subCmd)) {
      return sock.sendMessage(from, {
        text: `> Invalid option. Use on/off/set`
      }, { quoted: msg })
    }

    if (newValue === currentValue) {
      await sock.sendMessage(from, { react: { text: '⚠️', key: msg.key } })
      return await sock.sendMessage(from, { text: `> Goodbye is already ${subCmd}` }, { quoted: msg })
    }

    const { error } = await botSettings.supabase
  .from('b_settings')
  .upsert({
        id: targetJid,
        goodbye_enabled: newValue,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })

    if (error) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: `> Database error: ${error.message}` }, { quoted: msg })
    }

    botSettings.goodbye_enabled = newValue

    await sock.sendMessage(from, { react: { text: newValue? '✅' : '❌', key: msg.key } })
    await sock.sendMessage(from, {
      text: `╭─⌈ 👋 *Settings Updated* ⌋
│ Goodbye: ${newValue? 'ON ✅' : 'OFF ❌'}
│ Target: Global
│
│ ${newValue? 'Goodbye messages will be sent when users leave.' : 'Goodbye messages are now disabled.'}
╰⊷ *${botSettings.botname}*`
    }, { quoted: msg })

  } catch (err) {
    console.error(`[GOODBYE CMD ERROR]`, err.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Failed. Check database.' }, { quoted: msg })
  }
}