import { supabase } from '../../lib/supabase.js'

export const name = 'setbotname'
export const alias = ['botname', 'setname', 'changename']
export const category = 'Settings'
export const desc = 'Change bot name and brand name'

export default async function setbotname(sock, { msg, from, sender, isGroup, isAdmin }, botSettings) {
  try {
    const isOwner = sender === botSettings.owner_number + '@s.whatsapp.net'
    if (!isOwner) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: '> Owner only command.' }, { quoted: msg })
    }

    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const newName = args.join(' ')

    const { data: settings } = await supabase
     .from('b_settings')
     .select('botname, brand_name, prefix')
     .eq('id', 'DGIFT_DEFAULT')
     .maybeSingle()

    const currentName = settings?.botname || 'dgift-bot'
    const prefix = settings?.prefix || '.'

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

    if (newName.length > 30) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: '> Name too long. Max 30 characters.' }, { quoted: msg })
    }

    if (newName === currentName) {
      await sock.sendMessage(from, { react: { text: '⚠️', key: msg.key } })
      return await sock.sendMessage(from, { text: `> Bot name is already set to "${currentName}"` }, { quoted: msg })
    }

    const { error } = await supabase
     .from('b_settings')
     .update({
        botname: newName,
        brand_name: newName,
        updated_at: new Date().toISOString()
      })
     .eq('id', 'DGIFT_DEFAULT')

    if (error) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: '> Database error.' }, { quoted: msg })
    }

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