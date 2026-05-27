// commands/settings/antivoicenotes.js
export const name = 'antivoicenotes'
export const alias = ['antivn', 'novn']
export const category = 'Settings'
export const desc = 'Toggle anti voice notes on/off'

async function getBrandName(botSettings) {
  if (!botSettings?.supabase) return 'Bot'
  const instanceId = botSettings.instance_id || 'DGIFT_DEFAULT'
  const { data } = await botSettings.supabase
.from('b_settings')
.select('brand_name, botname')
.eq('id', instanceId)
.maybeSingle()
  return data?.brand_name || data?.botname || 'Bot'
}

export default async function antivoicenotes(sock, { msg, from }, botSettings) {
  try {
    if (!botSettings.supabase) {
      return sock.sendMessage(from, { text: '> Database connection not ready.' }, { quoted: msg })
    }

    const brandName = await getBrandName(botSettings)
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const action = args[0]?.toLowerCase()

    const targetJid = 'DGIFT_DEFAULT'

    const { data: settings } = await botSettings.supabase
  .from('b_settings')
  .select('anti_voice_notes')
  .eq('id', targetJid)
  .maybeSingle()

    const currentValue = settings?.anti_voice_notes || false

    if (!action) {
      await sock.sendMessage(from, { react: { text: '🎙️', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 🎙️ *AntiVoiceNotes Control* ⌋
│ Status: ${currentValue? 'ON ✅' : 'OFF ❌'}
│
│ Usage:
│ ${botSettings.prefix}antivoicenotes on
│ ${botSettings.prefix}antivoicenotes off
╰⊷ *Powered By ${brandName}*`
      }, { quoted: msg })
    }

    const newValue = ['on', 'enable', '1'].includes(action)
    if (newValue === currentValue) {
      await sock.sendMessage(from, { react: { text: '⚠️', key: msg.key } })
      return await sock.sendMessage(from, { text: `> AntiVoiceNotes is already ${action}` }, { quoted: msg })
    }

    const { error } = await botSettings.supabase
  .from('b_settings')
  .upsert({ id: targetJid, anti_voice_notes: newValue, updated_at: new Date().toISOString() },
   { onConflict: 'id' })

    if (error) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: `> Database error: ${error.message}` }, { quoted: msg })
    }

    await sock.sendMessage(from, { react: { text: newValue? '✅' : '❌', key: msg.key } })
    await sock.sendMessage(from, {
      text: `╭─⌈ 🎙️ *Settings Updated* ⌋
│ AntiVoiceNotes: ${newValue? 'ON ✅' : 'OFF ❌'}
│
│ ${newValue? 'All voice notes will be deleted.' : 'Voice notes will be allowed.'}
╰⊷ *Powered By ${brandName}*`
    }, { quoted: msg })

  } catch (err) {
    console.error(`[ANTIVOICE CMD ERROR]`, err.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Failed. Check database.' }, { quoted: msg })
  }
}