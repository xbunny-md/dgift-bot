// commands/settings/resetgcname.js
export const name = 'resetgcname'
export const alias = ['resetgname', 'resetcname']
export const category = 'Settings'
export const desc = 'Reset stored group name for anti_change_group_name'

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

export default async function resetgcname(sock, { msg, from }, botSettings) {
  try {
    if (!botSettings.supabase) {
      return sock.sendMessage(from, { text: '> Database connection not ready.' }, { quoted: msg })
    }

    const brandName = await getBrandName(botSettings)
    const targetJid = from

    const { data: settings } = await botSettings.supabase
 .from('b_settings')
 .select('anti_change_group_name')
 .eq('id', targetJid)
 .maybeSingle()

    if (!settings?.anti_change_group_name) {
      await sock.sendMessage(from, { react: { text: '⚠️', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `> AntiChangeGroupName is OFF. Turn it ON first using ${botSettings.prefix}antichangegroupname on`
      }, { quoted: msg })
    }

    const groupMeta = await sock.groupMetadata(targetJid).catch(() => null)
    if (!groupMeta) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: '> Failed to get group metadata.' }, { quoted: msg })
    }

    const { error } = await botSettings.supabase
 .from('b_settings')
 .update({
   anti_change_group_name_settings: {
     original_name: groupMeta.subject,
     updated_at: new Date().toISOString()
   },
   updated_at: new Date().toISOString()
 })
 .eq('id', targetJid)

    if (error) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: `> Database error: ${error.message}` }, { quoted: msg })
    }

    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })
    await sock.sendMessage(from, {
      text: `╭─⌈ 🔄 *Group Name Reset* ⌋
│ New Original Name: ${groupMeta.subject}
│
│ AntiChangeGroupName will now protect this name
╰⊷ *Powered By ${brandName}*`
    }, { quoted: msg })

  } catch (err) {
    console.error(`[RESETGCNAME CMD ERROR]`, err.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Failed to reset group name.' }, { quoted: msg })
  }
}