// commands/group/getdesc.js
export const name = 'getdesc'
export const alias = ['gdesc', 'groupdesc', 'desc']
export const category = 'Group'
export const desc = 'Get the current group description.'

async function getBrandName(botSettings) {
  if (!botSettings.supabase) return 'Bot'
  const instanceId = botSettings.instance_id || 'DGIFT_DEFAULT'
  const { data } = await botSettings.supabase
  .from('b_settings')
  .select('brand_name, botname')
  .eq('id', instanceId)
  .maybeSingle()
  return data?.brand_name || data?.botname || 'Bot'
}

export default async function getdesc(sock, { msg, from, isGroup, groupMetadata }, botSettings) {
  try {
    if (!isGroup) {
      return await sock.sendMessage(from, {
        text: '> This command only works in groups.'
      }, { quoted: msg })
    }

    const brandName = await getBrandName(botSettings)
    const description = groupMetadata.desc

    if (!description) {
      return await sock.sendMessage(from, {
        text: `╭─⌈ GROUP DESCRIPTION ⌋
│ This group has no description set.
╰⊷ *Powered By ${brandName}*`
      }, { quoted: msg })
    }

    await sock.sendMessage(from, {
      text: `╭─⌈ GROUP DESCRIPTION ⌋
│ ${description}
╰⊷ *Powered By ${brandName}*`
    }, { quoted: msg })

  } catch (err) {
    console.error('[GETDESC ERROR]', err.message)
    await sock.sendMessage(from, {
      text: '> Failed to get group description.'
    }, { quoted: msg })
  }
}