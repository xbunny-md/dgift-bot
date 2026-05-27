export const name = 'welcome'
export const alias = ['wel', 'welcome_msg']
export const category = 'Settings'
export const desc = 'Toggle welcome message on/off globally and set message'

export default async function welcome(sock, { msg, from, sender }, botSettings) {
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
    .select('welcome_enabled, welcome_msg')
    .eq('id', targetJid)
    .maybeSingle()

    const currentValue = settings?.welcome_enabled || false
    const currentMsg = settings?.welcome_msg || 'Karibu @user kwenye group {group}'

    if (!subCmd) {
      await sock.sendMessage(from, { react: { text: '🎉', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 🎉 *Welcome Control* ⌋
│ Status: ${currentValue ? 'ON ✅' : 'OFF ❌'}
│ Target: Global
│
│ Current Message:
│ ${currentMsg}
│
│ Usage:
│ ${botSettings.prefix}welcome on
│ ${botSettings.prefix}welcome off
│ ${botSettings.prefix}welcome set <message>
│
│ Variables: @user, {group}, {bot}
│ Note: Sends welcome message when someone joins
╰⊷ *${botSettings.botname}*`
      }, { quoted: msg })
    }

    if (subCmd === 'set') {
      const newMsg = args.slice(1).join(' ')
      if (!newMsg) {
        return sock.sendMessage(from, {
          text: `> Usage: ${botSettings.prefix}welcome set Karibu @user kwenye {group}`
        }, { quoted: msg })
      }

      const { error } = await botSettings.supabase
      .from('b_settings')
      .upsert({
        id: targetJid,
        welcome_msg: newMsg,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })

      if (error) {
        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
        return await sock.sendMessage(from, { text: `> Database error: ${error.message}` }, { quoted: msg })
      }

      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 🎉 *Welcome Message Updated* ⌋
│ New Message:
│ ${newMsg}
│
│ Variables: @user, {group}, {bot}
╰⊷ *${botSettings.botname}*`
      }, { quoted: msg })
    }

    const newValue = ['on', 'enable', '1'].includes(subCmd)
    if (!['on', 'off', 'enable', 'disable', '1', '0'].includes(subCmd)) {
      return sock.sendMessage(from, {
        text: `> Invalid option. Use on/off/set`
      }, { quoted: msg })
    }

    if (newValue === currentValue) {
      await sock.sendMessage(from, { react: { text: '⚠️', key: msg.key } })
      return await sock.sendMessage(from, { text: `> Welcome is already ${subCmd}` }, { quoted: msg })
    }

    const { error } = await botSettings.supabase
    .from('b_settings')
    .upsert({
      id: targetJid,
      welcome_enabled: newValue,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' })

    if (error) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: `> Database error: ${error.message}` }, { quoted: msg })
    }

    botSettings.welcome_enabled = newValue

    await sock.sendMessage(from, { react: { text: newValue ? '✅' : '❌', key: msg.key } })
    await sock.sendMessage(from, {
      text: `╭─⌈ 🎉 *Settings Updated* ⌋
│ Welcome: ${newValue ? 'ON ✅' : 'OFF ❌'}
│ Target: Global
│
│ ${newValue ? 'Welcome messages will be sent when users join.' : 'Welcome messages are now disabled.'}
╰⊷ *${botSettings.botname}*`
    }, { quoted: msg })

  } catch (err) {
    console.error(`[WELCOME CMD ERROR]`, err.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Failed. Check database.' }, { quoted: msg })
  }
}