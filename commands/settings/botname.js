// commands/settings/setbotname.js
export const name = 'setbotname'
export const alias = ['botname', 'setname', 'changename']
export const category = 'Settings'
export const desc = 'Change bot name and brand name'

export default async function setbotname(sock, { msg, from, sender }, botSettings) {
  try {
    // Angalia kama database ipo
    if (!botSettings.supabase) {
      return sock.sendMessage(from, { text: '> Database connection not ready.' }, { quoted: msg })
    }

    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const newName = args.join(' ').trim()

    // Chukua settings za sasa
    const { data: settings } = await botSettings.supabase
   .from('b_settings')
   .select('botname, brand_name, prefix')
   .eq('id', 'DGIFT_DEFAULT')
   .maybeSingle()

    const currentName = settings?.botname || 'dgift-bot'
    const prefix = settings?.prefix || '.'

    // Onyesha status kama hakuna jina jipya
    if (!newName) {
      await sock.sendMessage(from, { react: { text: '🤖', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 🤖 *Bot Name Settings* ⌋
│ Current: ${currentName}
│ Brand: ${settings?.brand_name || currentName}
│
│ Usage:
│ ${prefix}setbotname Dgift-Bot
│ ${prefix}setbotname Bunny Tech
│
│ Note: Both bot name and brand name will be updated
╰⊷ *${currentName}*`
      }, { quoted: msg })
    }

    // Hakikisha jina sio refu sana
    if (newName.length > 30) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: '> Name too long. Max 30 characters.' }, { quoted: msg })
    }

    // Angalia kama jina ni lilelile
    if (newName === currentName) {
      await sock.sendMessage(from, { react: { text: '⚠️', key: msg.key } })
      return await sock.sendMessage(from, { text: `> Bot name is already set to "${currentName}"` }, { quoted: msg })
    }

    // Sasisha database
    const { error } = await botSettings.supabase
   .from('b_settings')
   .update({
        botname: newName,
        brand_name: newName,
        updated_at: new Date().toISOString()
      })
   .eq('id', 'DGIFT_DEFAULT')

    if (error) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: `> Database error: ${error.message}` }, { quoted: msg })
    }

    // Sasisha live memory pia
    botSettings.botname = newName
    botSettings.brand_name = newName

    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })
    await sock.sendMessage(from, {
      text: `╭─⌈ ✅ *Bot Name Updated* ⌋
│ Old: ${currentName}
│ New: ${newName}
│ Brand: ${newName}
│ Status: Applied instantly
│
│ All messages will use the new name now
╰⊷ *${newName}*`
    }, { quoted: msg })

  } catch (err) {
    console.error(`[SETBOTNAME ERROR]`, err.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Failed to update bot name.' }, { quoted: msg })
  }
}