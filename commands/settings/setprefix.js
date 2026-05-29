// commands/settings/setprefix.js
export const name = 'setprefix'
export const alias = ['prefix', 'changeprefix']
export const category = 'Settings'
export const desc = 'Change bot prefix'

export default async function setprefix(sock, { msg, from, sender }, botSettings) {
  try {
    // Angalia kama database ipo
    if (!botSettings.supabase ||!botSettings.instance_id) {
      return sock.sendMessage(from, { text: '> Database connection not ready.' }, { quoted: msg })
    }

    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const newPrefix = args[0]?.trim()

    const instanceId = botSettings.instance_id // KILA BOT NA DATA ZAKE - NO DEFAULT

    // Chukua settings za instance hii - KAMA INDEX.JS
    const { data: settings } = await botSettings.supabase
   .from('b_settings')
   .select('prefix, botname')
   .eq('id', instanceId)
   .maybeSingle()

    const currentPrefix = settings?.prefix || '.'
    const botname = settings?.botname || 'Bot'

    // Onyesha status kama hakuna prefix mpya
    if (!newPrefix) {
      await sock.sendMessage(from, { react: { text: '⚙️', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ ⚙️ *Prefix Control* ⌋
│ Bot: ${botname}
│ Instance: ${instanceId}
│ Status: ${currentPrefix}
│
│ Usage:
│ ${currentPrefix}setprefix!
│ ${currentPrefix}setprefix #
│ ${currentPrefix}setprefix /
│
│ Max 3 characters
╰⊷ *${botname}*`
      }, { quoted: msg })
    }

    // Hakikisha prefix sio ndefu sana
    if (newPrefix.length > 3) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: '> Prefix too long. Max 3 characters.' }, { quoted: msg })
    }

    // Angalia kama prefix ni ileile
    if (newPrefix === currentPrefix) {
      await sock.sendMessage(from, { react: { text: '⚠️', key: msg.key } })
      return await sock.sendMessage(from, { text: `> Prefix is already set to "${currentPrefix}"` }, { quoted: msg })
    }

    // Sasisha database kwa upsert - KAMA INDEX.JS ensureBotRow
    const { error } = await botSettings.supabase
   .from('b_settings')
   .upsert({
        id: instanceId,
        prefix: newPrefix,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })

    if (error) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: `> Database error: ${error.message}` }, { quoted: msg })
    }

    // Sasisha live memory
    botSettings.prefix = newPrefix

    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })
    await sock.sendMessage(from, {
      text: `╭─⌈ ✅ *Settings Updated* ⌋
│ Bot: ${botname}
│ Instance: ${instanceId}
│ Prefix: ${currentPrefix} → ${newPrefix}
│ Status: Applied instantly
│
│ Try: ${newPrefix}menu
╰⊷ *${botname}*`
    }, { quoted: msg })

  } catch (err) {
    console.error(`[SETPREFIX CMD ERROR]`, err.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Failed. Check database.' }, { quoted: msg })
  }
}