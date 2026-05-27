// commands/settings/antichangegroupname.js
export const name = 'antichangegroupname'
export const alias = ['antigroupname', 'nochangegname']
export const category = 'Settings'
export const desc = 'Toggle anti change group name on/off'

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

export default async function antichangegroupname(sock, { msg, from }, botSettings) {
  try {
    if (!botSettings.supabase) {
      return sock.sendMessage(from, { text: '> Database connection not ready.' }, { quoted: msg })
    }

    const brandName = await getBrandName(botSettings)
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const action = args[0]?.toLowerCase()

    const targetJid = from // Per group setting

    const { data: settings } = await botSettings.supabase
 .from('b_settings')
 .select('anti_change_group_name, anti_change_group_name_settings')
 .eq('id', targetJid)
 .maybeSingle()

    const currentValue = settings?.anti_change_group_name || false

    if (!action) {
      await sock.sendMessage(from, { react: { text: '📝', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 📝 *AntiChangeGroupName Control* ⌋
│ Status: ${currentValue? 'ON ✅' : 'OFF ❌'}
│
│ Usage:
│ ${botSettings.prefix}antichangegroupname on
│ ${botSettings.prefix}antichangegroupname off
│
│ Note: Will save current name and restore if changed
╰⊷ *Powered By ${brandName}*`
      }, { quoted: msg })
    }

    const newValue = ['on', 'enable', '1'].includes(action)
    if (newValue === currentValue) {
      await sock.sendMessage(from, { react: { text: '⚠️', key: msg.key } })
      return await sock.sendMessage(from, { text: `> AntiChangeGroupName is already ${action}` }, { quoted: msg })
    }

    // Kama unawasha, hifadhi jina la sasa
    let updateData = {
      id: targetJid,
      anti_change_group_name: newValue,
      updated_at: new Date().toISOString()
    }

    if (newValue) {
      const groupMeta = await sock.groupMetadata(targetJid).catch(() => null)
      if (groupMeta) {
        updateData.anti_change_group_name_settings = {
          original_name: groupMeta.subject,
          enabled_at: new Date().toISOString()
        }
      }
    }

    const { error } = await botSettings.supabase
 .from('b_settings')
 .upsert(updateData, { onConflict: 'id' })

    if (error) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: `> Database error: ${error.message}` }, { quoted: msg })
    }

    await sock.sendMessage(from, { react: { text: newValue? '✅' : '❌', key: msg.key } })
    await sock.sendMessage(from, {
      text: `╭─⌈ 📝 *Settings Updated* ⌋
│ AntiChangeGroupName: ${newValue? 'ON ✅' : 'OFF ❌'}
│
│ ${newValue? 'Group name changes will be reverted. Violators will be warned.' : 'Group name can be changed freely.'}
╰⊷ *Powered By ${brandName}*`
    }, { quoted: msg })

  } catch (err) {
    console.error(`[ANTICHANGEGROUPNAME CMD ERROR]`, err.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Failed. Check database.' }, { quoted: msg })
  }
}