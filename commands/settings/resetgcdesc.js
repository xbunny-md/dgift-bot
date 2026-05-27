// commands/settings/resetgcdesc.js
export const name = 'resetgcdesc'
export const alias = ['resetgdesc', 'resetdesc']
export const category = 'Settings'
export const desc = 'Reset stored group description for anti_change_group_description'

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

export default async function resetgcdesc(sock, { msg, from }, botSettings) {
  try {
    if (!botSettings.supabase) {
      return sock.sendMessage(from, { text: '> Database connection not ready.' }, { quoted: msg })
    }

    const brandName = await getBrandName(botSettings)
    const targetJid = from

    const { data: settings } = await botSettings.supabase
 .from('b_settings')
 .select('anti_change_group_description')
 .eq('id', targetJid)
 .maybeSingle()

    if (!settings?.anti_change_group_description) {
      await sock.sendMessage(from, { react: { text: '⚠️', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `> AntiChangeGroupDescription is OFF. Turn it ON first using ${botSettings.prefix}antichangegroupdescription on`
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
   anti_change_group_description_settings: {
     original_desc: groupMeta.desc || '',
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
      text: `╭─⌈ 🔄 *Group Description Reset* ⌋
│ New Original Description: ${groupMeta.desc || '(Empty)'}
│
│ AntiChangeGroupDescription will now protect this description
╰⊷ *Powered By ${brandName}*`
    }, { quoted: msg })

  } catch (err) {
    console.error(`[RESETGCDESC CMD ERROR]`, err.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Failed to reset group description.' }, { quoted: msg })
  }
}