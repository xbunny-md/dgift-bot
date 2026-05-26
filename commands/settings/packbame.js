// commands/settings/packname.js
export const name = 'packname'
export const alias = ['setpack', 'setstickerpack', 'setpackname']
export const category = 'Settings'
export const desc = 'Set sticker pack name and author. Usage: .packname Pack Name | Author Name'

async function getBrandName(botSettings) {
  if (!botSettings.supabase) return botSettings?.brand_name || botSettings?.botname || 'Bot'
  const instanceId = botSettings.instance_id || 'DGIFT_DEFAULT'
  const { data } = await botSettings.supabase
    .from('b_settings')
    .select('brand_name, botname')
    .eq('id', instanceId)
    .maybeSingle()
  return data?.brand_name || data?.botname || 'Bot'
}

export default async function packname(sock, { msg, from, args }, botSettings) {
  try {
    const brandName = await getBrandName(botSettings)

    if (!args.length) {
      return await sock.sendMessage(from, {
        text: `╭─⌈ STICKER PACK SETTINGS ⌋
│ Usage: ${botSettings.prefix}packname Pack Name | Author Name
│
│ Example:
│ ${botSettings.prefix}packname Bunny MD | Lupin Starnley
│
│ Use | to separate pack and author
╰⊷ *Powered By ${brandName}*`
      }, { quoted: msg })
    }

    const input = args.join(' ').split('|').map(s => s.trim())
    const pack = input[0]
    const author = input[1] || 'Unknown'

    if (!pack) {
      return await sock.sendMessage(from, {
        text: '> Pack name cannot be empty.'
      }, { quoted: msg })
    }

    if (pack.length > 30) {
      return await sock.sendMessage(from, {
        text: '> Pack name too long. Max 30 characters.'
      }, { quoted: msg })
    }

    if (author.length > 30) {
      return await sock.sendMessage(from, {
        text: '> Author name too long. Max 30 characters.'
      }, { quoted: msg })
    }

    const instanceId = botSettings.instance_id || 'DGIFT_DEFAULT'

    // Update DB
    const { error } = await botSettings.supabase
      .from('b_settings')
      .update({ 
        sticker_pack: pack,
        sticker_author: author 
      })
      .eq('id', instanceId)

    if (error) throw error

    await sock.sendMessage(from, {
      text: `╭─⌈ ✅ PACK UPDATED ⌋
│ Pack: ${pack}
│ Author: ${author}
│
│ All new stickers will use this pack
╰⊷ *Powered By ${brandName}*`
    }, { quoted: msg })

  } catch (error) {
    console.error('[PACKNAME ERROR]', error)
    const brandName = await getBrandName(botSettings)
    await sock.sendMessage(from, {
      text: `╭─⌈ ❌ ERROR ⌋
│ Failed to update pack name
│ Reason: ${error.message}
╰⊷ *Powered By ${brandName}*`
    }, { quoted: msg })
  }
}