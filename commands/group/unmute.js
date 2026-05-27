// commands/group/unmute.js
export const name = 'unmute'
export const alias = ['open', 'gcmuteoff', 'unlock']
export const category = 'Group'
export const desc = 'Open group or update unmute reason. Usage: unmute reason text'

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

export default async function unmute(sock, { msg, from, args }, botSettings) {
  try {
    if (!msg.key.remoteJid.endsWith('@g.us')) {
      return await sock.sendMessage(from, {
        text: '> This command only works in groups.'
      }, { quoted: msg })
    }

    const brandName = await getBrandName(botSettings)

    // Check current group status
    const groupMeta = await sock.groupMetadata(from)
    const isClosed = groupMeta.announce === true

    // If no args, just open the group
    if (!args.length) {
      if (!isClosed) {
        return await sock.sendMessage(from, {
          text: '> Group is already open.'
        }, { quoted: msg })
      }

      await sock.groupSettingUpdate(from, 'not_announcement')
      await sock.sendMessage(from, { react: { text: '🔓', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ GROUP OPENED ⌋
│ Group is now open for everyone.
╰⊷ *Powered By ${brandName}*`
      }, { quoted: msg })
    }

    // If args provided, treat as announcement reason and open group
    const reason = args.join(' ')
    
    // Open group first
    await sock.groupSettingUpdate(from, 'not_announcement')
    
    await sock.sendMessage(from, { react: { text: '🔓', key: msg.key } })
    await sock.sendMessage(from, {
      text: `╭─⌈ GROUP OPENED ⌋
│ Reason: ${reason}
│
│ Group is now open for everyone.
╰⊷ *Powered By ${brandName}*`
    }, { quoted: msg })

  } catch (err) {
    console.error('[UNMUTE ERROR]', err)
    await sock.sendMessage(from, {
      text: '> Failed to open group. Make sure I am admin.'
    }, { quoted: msg })
  }
}