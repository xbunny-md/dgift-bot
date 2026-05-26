// commands/settings/setprefix.js
export const name = 'setprefix'
export const alias = ['prefix', 'changeprefix']
export const category = 'Settings'
export const desc = 'Change bot prefix'

export default async function setprefix(sock, { msg, from, sender, isGroup, isAdmin }, botSettings) {
  try {
    if (!botSettings.supabase) {
      return sock.sendMessage(from, { text: '> Database connection not ready.' }, { quoted: msg })
    }

    const isOwner = sender === botSettings.owner_number + '@s.whatsapp.net'
    if (!isOwner) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: '> Owner only command.' }, { quoted: msg })
    }

    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const newPrefix = args[0]?.trim()

    const { data: settings } = await botSettings.supabase
    .from('b_settings')
    .select('prefix, botname, brand_name')
    .eq('id', 'DGIFT_DEFAULT')
    .maybeSingle()

    const currentPrefix = settings?.prefix || '.'
    const botname = settings?.botname || 'Bot'
    const brandName = settings?.brand_name || 'dgift-bot'

    if (!newPrefix) {
      await sock.sendMessage(from, { react: { text: '⚙️', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ ⚙️ *Prefix Settings* ⌋
│ Current: ${currentPrefix}
│ Bot: ${botname}
│ Brand: ${brandName}
│
│ Usage:
│ ${currentPrefix}setprefix!
│ ${currentPrefix}setprefix #
│ ${currentPrefix}setprefix /
╰⊷ *${botname}*`
      }, { quoted: msg })
    }

    if (newPrefix.length > 3) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: '> Prefix too long. Max 3 characters.' }, { quoted: msg })
    }

    if (newPrefix === currentPrefix) {
      await sock.sendMessage(from, { react: { text: '⚠️', key: msg.key } })
      return await sock.sendMessage(from, { text: `> Prefix is already set to "${currentPrefix}"` }, { quoted: msg })
    }

    const { error } = await botSettings.supabase
    .from('b_settings')
    .update({
        prefix: newPrefix,
        updated_at: new Date().toISOString()
      })
    .eq('id', 'DGIFT_DEFAULT')

    if (error) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: `> Database error: ${error.message}` }, { quoted: msg })
    }

    // Update live memory
    botSettings.prefix = newPrefix

    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })
    await sock.sendMessage(from, {
      text: `╭─⌈ ✅ *Prefix Updated* ⌋
│ Old: ${currentPrefix}
│ New: ${newPrefix}
│ Status: Applied instantly
│
│ Try: ${newPrefix}menu
╰⊷ *${botname}*`
    }, { quoted: msg })

  } catch (err) {
    console.error(`[SETPREFIX ERROR]`, err.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Failed to update prefix.' }, { quoted: msg })
  }
}