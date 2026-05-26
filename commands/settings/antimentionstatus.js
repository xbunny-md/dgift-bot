import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

export const name = 'antistatusmention'
export const alias = ['antistatus', 'nostatusmention']
export const category = 'Settings'
export const desc = 'Toggle status mention blocker on/off'

export default async function antistatusmention(sock, { msg, from, sender, isGroup, isAdmin }, botSettings) {
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
    .select('antistatusmention')
    .eq('id', targetJid)
    .maybeSingle()

    const currentValue = settings?.antistatusmention || false

    if (!action) {
      await sock.sendMessage(from, { react: { text: '🚫', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 🚫 *AntiStatusMention* ⌋
│ Status: ${currentValue? 'ON ✅' : 'OFF ❌'}
│ Target: ${targetJid === 'DGIFT_DEFAULT'? 'Global' : 'Group'}
│
│ Usage:
│ ${botSettings.prefix}antistatusmention on global
╰⊷ *${botSettings.botname}*`
      }, { quoted: msg })
    }

    const newValue = ['on', 'enable', '1'].includes(action)
    const { error } = await supabase
    .from('b_settings')
    .upsert({
        id: targetJid,
        antistatusmention: newValue,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })

    if (error) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: `> Database error: ${error.message}` }, { quoted: msg })
    }

    await sock.sendMessage(from, { react: { text: newValue? '✅' : '❌', key: msg.key } })
    await sock.sendMessage(from, {
      text: `╭─⌈ 🚫 *Settings Updated* ⌋
│ Status: ${newValue? 'ON ✅' : 'OFF ❌'}
╰⊷ *${botSettings.botname}*`
    }, { quoted: msg })

  } catch (err) {
    console.error(`[ANTISTATUS CMD ERROR]`, err.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Failed. Check database.' }, { quoted: msg })
  }
}