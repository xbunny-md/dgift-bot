// commands/settings/resetgcpic.js
export const name = 'resetgcpic'
export const alias = ['resetpic', 'resetcgp']
export const category = 'Settings'
export const desc = 'Reset stored group picture and imgbb API'

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

export default async function resetgcpic(sock, { msg, from }, botSettings) {
  try {
    if (!botSettings.supabase) {
      return sock.sendMessage(from, { text: '> Database connection not ready.' }, { quoted: msg })
    }

    const brandName = await getBrandName(botSettings)
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const option = args[0]?.toLowerCase()

    const targetJid = from

    const { data: settings } = await botSettings.supabase
.from('b_settings')
.select('anti_change_group_picture')
.eq('id', targetJid)
.maybeSingle()

    if (!settings?.anti_change_group_picture) {
      await sock.sendMessage(from, { react: { text: '⚠️', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `> AntiChangeGroupPicture is OFF. Turn it ON first using ${botSettings.prefix}antichangegrouppicture on`
      }, { quoted: msg })
    }

    let updateData = {
      updated_at: new Date().toISOString()
    }

    if (option === 'api') {
      // Rudisha API kuwa default
      updateData.imgbb_api = null
      await sock.sendMessage(from, { react: { text: '🔄', key: msg.key } })
    } else {
      // Reset picha ya original
      const groupMeta = await sock.groupMetadata(targetJid).catch(() => null)
      const ppUrl = await sock.profilePictureUrl(targetJid, 'image').catch(() => null)

      if (!ppUrl) {
        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
        return await sock.sendMessage(from, { text: '> Group has no picture to save.' }, { quoted: msg })
      }

      updateData.group_picture_url = ppUrl
      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })
    }

    const { error } = await botSettings.supabase
.from('b_settings')
.update(updateData)
.eq('id', targetJid)

    if (error) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: `> Database error: ${error.message}` }, { quoted: msg })
    }

    await sock.sendMessage(from, {
      text: `╭─⌈ 🔄 *Reset Complete* ⌋
│ ${option === 'api'? 'Imgbb API reset to default' : 'Group picture reset to current'}
│
│ ${option === 'api'? 'Will use process.env.IMGBB_API now' : 'Observer will protect this picture'}
╰⊷ *Powered By ${brandName}*`
    }, { quoted: msg })

  } catch (err) {
    console.error(`[RESETGCPIC CMD ERROR]`, err.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Failed to reset.' }, { quoted: msg })
  }
}