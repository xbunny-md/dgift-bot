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

export default async function tagall(sock, { msg, from, sender, isGroup, groupMetadata, args }, botSettings) {
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

    const participants = groupMetadata.participants || []
    const admins = participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin')
    const members = participants.filter(p => !p.admin)

    if (participants.length === 0) {
      return await sock.sendMessage(from, { 
        text: '> No members found in this group.' 
      }, { quoted: msg })
    }

    // Combine members first then admins in one list
    const allMembers = [...members, ...admins]
    const mentions = allMembers.map(p => p.id)

    // Build tags - emoji placed after the number for admins
    let tags = ''
    allMembers.forEach(p => {
      const isAdmin = admins.some(a => a.id === p.id)
      const suffix = isAdmin ? ' 👑' : ''
      tags += `│ ╰⊷ @${p.id.split('@')[0]}${suffix}\n`
    })

    // Send with exact box format
    const text = `╭─⌈ TAG ALL ⌋
│ Called by: @${sender.split('@')[0]}
│ Total Members: ${participants.length}
│ Members: ${members.length}
│ Admins: ${admins.length}
│
│ Message: ${message}
│
│ Members & Admins:
${tags}╰⊷ *Powered By ${brandName}*`

    // Get group DP if available
    let profilePic = null
    try {
      profilePic = await sock.profilePictureUrl(from, 'image')
    } catch {}

    if (profilePic) {
      await sock.sendMessage(from, {
        image: { url: profilePic },
        caption: text,
        mentions: mentions
      }, { quoted: msg })
    } else {
      await sock.sendMessage(from, {
        text: text,
        mentions: mentions
      }, { quoted: msg })
    }

  } catch (err) {
    console.error('[TAGALL ERROR]', err.message)
    await sock.sendMessage(from, { 
      text: '> Failed to tag everyone. Try again.' 
    }, { quoted: msg })
  }
}