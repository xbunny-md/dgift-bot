import { supabase } from '../../lib/supabase.js'

export const name = 'autotyping'
export const alias = ['autotype', 'typingon']
export const category = 'Settings'
export const desc = 'Toggle auto typing presence on/off'

export default async function autotyping(sock, { msg, from, sender, isGroup, isAdmin }, botSettings) {
  try {
    const isOwner = sender === botSettings.owner_number + '@s.whatsapp.net'
    if (!isOwner && (!isGroup ||!isAdmin)) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: '> Admin only command.' }, { quoted: msg })
    }

    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const action = args[0]?.toLowerCase()
    const mode = args[1]?.toLowerCase()

    const targetJid = mode === 'group' && isGroup? from : 'DGIFT_DEFAULT'
    const { data: settings } = await supabase
     .from('b_settings')
     .select('autopresencecomposing')
     .eq('id', targetJid)
     .maybeSingle()

    const currentValue = settings?.autopresencecomposing || false

    if (!action) {
      await sock.sendMessage(from, { react: { text: '⌨️', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ ⌨️ *AutoTyping Control* ⌋
│ Status: ${currentValue? 'ON ✅' : 'OFF ❌'}
│ Target: ${targetJid === 'DGIFT_DEFAULT'? 'Global' : 'Group'}
│
│ Usage:
│ ${botSettings.prefix}autotyping on global
│ ${botSettings.prefix}autotyping off group
╰⊷ *${botSettings.botname}*`
      }, { quoted: msg })
    }

    const newValue = ['on', 'enable', '1'].includes(action)
    const { error } = await supabase
     .from('b_settings')
     .upsert({ id: targetJid, autopresencecomposing: newValue, updated_at: new Date().toISOString() }, { onConflict: 'id' })

    if (error) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: '> Database error.' }, { quoted: msg })
    }

    await sock.sendMessage(from, { react: { text: newValue? '✅' : '❌', key: msg.key } })
    await sock.sendMessage(from, {
      text: `╭─⌈ ⌨️ *Settings Updated* ⌋
│ Target: ${targetJid === 'DGIFT_DEFAULT'? 'Global 🌍' : 'Group'}
│ AutoTyping: ${newValue? 'ON ✅' : 'OFF ❌'}
╰⊷ *${botSettings.botname}*`
    }, { quoted: msg })

  } catch (err) {
    console.error(`[AUTOTYPING CMD ERROR]`, err.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Failed. Check database.' }, { quoted: msg })
  }
}