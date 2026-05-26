// commands/group/tagall.js
export const name = 'tagall'
export const alias = ['everyone', 'all', 'mentionall']
export const category = 'Group'
export const desc = 'Tag all group members. Works without admin rights.'

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

export default async function tagall(sock, { msg, from, sender, isGroup, groupMetadata, args, pushName }, botSettings) {
  try {
    if (!isGroup) {
      return await sock.sendMessage(from, { 
        text: '> This command only works in groups.' 
      }, { quoted: msg })
    }

    const brandName = await getBrandName(botSettings)
    
    // Get message text: reply > args > default
    let message = args.join(' ').trim()
    const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    if (quotedMsg) {
      message = quotedMsg.conversation || quotedMsg.extendedTextMessage?.text || quotedMsg.imageMessage?.caption || quotedMsg.videoMessage?.caption || message
    }
    if (!message) message = 'Attention everyone!'

    // Split members and admins
    const participants = groupMetadata.participants || []
    const admins = participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin')
    const members = participants.filter(p => !p.admin)

    if (participants.length === 0) {
      return await sock.sendMessage(from, { 
        text: '> No members found in this group.' 
      }, { quoted: msg })
    }

    // Reorder: members first, admins last
    const orderedMembers = [...members, ...admins].map(p => p.id)
    const adminIds = admins.map(p => p.id)

    // Get group DP
    let profilePic
    try {
      profilePic = await sock.profilePictureUrl(from, 'image')
    } catch {
      profilePic = null
    }

    // Build message
    let text = `╭─⌈ TAG ALL ⌋\n`
    text += `│ Called by: @${sender.split('@')[0]}\n`
    text += `│ Total: ${participants.length} | Members: ${members.length} | Admins: ${admins.length}\n`
    text += `│\n`
    text += `│ Message: ${message}\n`
    text += `│\n`
    
    // Show members section
    if (members.length > 0) {
      text += `│ ── Members ──\n│`
      members.forEach((p, i) => {
        text += ` @${p.id.split('@')[0]}`
        if ((i + 1) % 5 === 0) text += `\n│`
      })
      text += `\n│\n`
    }

    // Show admins section at the end
    if (admins.length > 0) {
      text += `│ ── Admins ──\n│`
      admins.forEach((p, i) => {
        text += ` @${p.id.split('@')[0]}`
        if ((i + 1) % 5 === 0) text += `\n│`
      })
      text += `\n`
    }
    
    text += `╰⊷ *Powered By ${brandName}*`

    // Send with group DP if available
    const sendOptions = {
      text: text,
      mentions: orderedMembers
    }

    if (profilePic) {
      await sock.sendMessage(from, {
        image: { url: profilePic },
        caption: text,
        mentions: orderedMembers
      }, { quoted: msg })
    } else {
      await sock.sendMessage(from, sendOptions, { quoted: msg })
    }

  } catch (err) {
    console.error('[TAGALL ERROR]', err.message)
    await sock.sendMessage(from, { 
      text: '> Failed to tag everyone. Try again.' 
    }, { quoted: msg })
  }
}