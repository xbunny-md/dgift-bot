// commands/settings/antipromote.js
export const name = 'antipromote'
export const alias = ['nopromote', 'nopromote']
export const category = 'Settings'
export const desc = 'Toggle anti promote on/off'

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

export default async function antipromote(sock, { msg, from }, botSettings) {
  try {
    if (!botSettings.supabase) {
      return sock.sendMessage(from, { text: '> Database connection not ready.' }, { quoted: msg })
    }

    const brandName = await getBrandName(botSettings)
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const action = args[0]?.toLowerCase()

    const targetJid = from

    const { data: settings } = await botSettings.supabase
.from('b_settings')
.select('anti_promote')
.eq('id', targetJid)
.maybeSingle()

    const currentValue = settings?.anti_promote || false

    if (!action) {
      await sock.sendMessage(from, { react: { text: '🚫', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 🚫 *AntiPromote Control* ⌋
│ Status: ${currentValue? 'ON ✅' : 'OFF ❌'}
│
│ Usage:
│ ${botSettings.prefix}antipromote on
│ ${botSettings.prefix}antipromote off
│
│ When ON, anyone who promotes will be demoted and warned
╰⊷ *Powered By ${brandName}*`
      }, { quoted: msg })
    }

    const newValue = ['on', 'enable', '1'].includes(action)

    const { error } = await botSettings.supabase
.from('b_settings')
.upsert({
  id: targetJid,
  anti_promote: newValue,
  updated_at: new Date().toISOString()
}, { onConflict: 'id' })

    if (error) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: `> Database error: ${error.message}` }, { quoted: msg })
    }

    await sock.sendMessage(from, { react: { text: newValue? '✅' : '❌', key: msg.key } })
    await sock.sendMessage(from, {
      text: `╭─⌈ 🚫 *Settings Updated* ⌋
│ AntiPromote: ${newValue? 'ON ✅' : 'OFF ❌'}
│
│ ${newValue? 'Promotions will be reverted. Violators will be warned.' : 'Promotions allowed.'}
╰⊷ *Powered By ${brandName}*`
    }, { quoted: msg })

  } catch (err) {
    console.error('[ANTIPROMOTE CMD ERROR]', err.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Failed. Check database.' }, { quoted: msg })
  }
}