import { supabase } from '../../lib/supabase.js'

export const name = 'autoreact'
export const alias = ['reacton', 'autorc']
export const category = 'Settings'
export const desc = 'Toggle auto reaction on/off'

export default async function autoreact(sock, { msg, from, sender, isGroup, isAdmin }, botSettings) {
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
     .select('autoreact')
     .eq('id', targetJid)
     .maybeSingle()

    const currentValue = settings?.autoreact || false

    if (!action) {
      await sock.sendMessage(from, { react: { text: '🔥', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 🔥 *AutoReact Control* ⌋
│ Status: ${currentValue? 'ON ✅' : 'OFF ❌'}
│ Target: ${targetJid === 'DGIFT_DEFAULT'? 'Global' : 'Group'}
│
│ Usage:
│ ${botSettings.prefix}autoreact on global
│ ${botSettings.prefix}autoreact off group
╰⊷ *${botSettings.botname}*`
      }, { quoted: msg })
    }

    const newValue = ['on', 'enable', '1'].includes(action)
    if (newValue === currentValue) {
      await sock.sendMessage(from, { react: { text: '⚠️', key: msg.key } })
      return await sock.sendMessage(from, { text: `> AutoReact already ${action}` }, { quoted: msg })
    }

    const { error } = await supabase
     .from('b_settings')
     .upsert({ id: targetJid, autoreact: newValue, updated_at: new Date().toISOString() }, { onConflict: 'id' })

    if (error) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: '> Database error.' }, { quoted: msg })
    }

    await sock.sendMessage(from, { react: { text: newValue? '✅' : '❌', key: msg.key } })
    await sock.sendMessage(from, {
      text: `╭─⌈ 🔥 *Settings Updated* ⌋
│ Target: ${targetJid === 'DGIFT_DEFAULT'? 'Global 🌍' : 'Group'}
│ AutoReact: ${newValue? 'ON ✅' : 'OFF ❌'}
╰⊷ *${botSettings.botname}*`
    }, { quoted: msg })

  } catch (err) {
    console.error(`[AUTOREACT CMD ERROR]`, err.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Failed. Check database.' }, { quoted: msg })
  }
}