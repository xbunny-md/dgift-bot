// commands/settings/autolikestatus.js
export const name = 'autolikestatus'
export const alias = ['autolike', 'likestatus', 'autols']
export const category = 'Settings'
export const desc = 'Toggle auto like status on/off'

export default async function autolikestatus(sock, { msg, from, sender, isGroup, isAdmin }, botSettings) {
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
    const action = args[0]?.toLowerCase()

    const targetJid = 'DGIFT_DEFAULT' // autolikestatus ni global tu

    const { data: settings } = await botSettings.supabase
    .from('b_settings')
    .select('autolikestatus')
    .eq('id', targetJid)
    .maybeSingle()

    const currentValue = settings?.autolikestatus || false

    if (!action) {
      await sock.sendMessage(from, { react: { text: '❤️', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ ❤️ *AutoLike Status Control* ⌋
│ Status: ${currentValue? 'ON ✅' : 'OFF ❌'}
│ Target: Global 🌍
│
│ Usage:
│ ${botSettings.prefix}autolikestatus on
│ ${botSettings.prefix}autolikestatus off
│
│ Note: Bot itapenda status zote na random emoji
╰⊷ *${botSettings.botname}*`
      }, { quoted: msg })
    }

    const newValue = ['on', 'enable', '1'].includes(action)
    if (newValue === currentValue) {
      await sock.sendMessage(from, { react: { text: '⚠️', key: msg.key } })
      return await sock.sendMessage(from, { text: `> AutoLikeStatus already ${action}` }, { quoted: msg })
    }

    const { error } = await botSettings.supabase
    .from('b_settings')
    .upsert({
        id: targetJid,
        autolikestatus: newValue,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })

    if (error) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: `> Database error: ${error.message}` }, { quoted: msg })
    }

    await sock.sendMessage(from, { react: { text: newValue? '✅' : '❌', key: msg.key } })
    await sock.sendMessage(from, {
      text: `╭─⌈ ❤️ *Settings Updated* ⌋
│ Target: Global 🌍
│ AutoLikeStatus: ${newValue? 'ON ✅' : 'OFF ❌'}
│
│ ${newValue? 'Bot itapenda status zote automatically.' : 'Auto like status imezimwa.'}
╰⊷ *${botSettings.botname}*`
    }, { quoted: msg })

  } catch (err) {
    console.error(`[AUTOLIKESTATUS CMD ERROR]`, err.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Failed. Check database.' }, { quoted: msg })
  }
}