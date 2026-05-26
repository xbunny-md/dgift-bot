// commands/group/hidetag.js
export const name = 'hidetag'
export const alias = ['ht', 'hiddentag']
export const category = 'Group'
export const desc = 'Hidden tag all group members. Works without admin rights.'

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

export default async function hidetag(sock, { msg, from, sender, isGroup, groupMetadata, args }, botSettings) {
  try {
    if (!isGroup) {
      return await sock.sendMessage(from, {
        text: '> This command only works in groups.'
      }, { quoted: msg })
    }

    const brandName = await getBrandName(botSettings)

    // Message priority: quoted > args > default
    let message = args.join(' ').trim()
    const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    if (quotedMsg) {
      message = quotedMsg.conversation || quotedMsg.extendedTextMessage?.text || quotedMsg.imageMessage?.caption || quotedMsg.videoMessage?.caption || message
    }
    if (!message) message = 'Attention everyone!'

    // Split members and admins, admins go last
    const participants = groupMetadata.participants || []
    const admins = participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin')
    const members = participants.filter(p =>!p.admin)
    const orderedMembers = [...members,...admins].map(p => p.id)

    if (orderedMembers.length === 0) {
      return await sock.sendMessage(from, {
        text: '> No members found in this group.'
      }, { quoted: msg })
    }

    // Get group DP
    let profilePic = null
    try {
      profilePic = await sock.profilePictureUrl(from, 'image')
    } catch {}

    // Send hidden tag with group DP if available
    if (profilePic) {
      await sock.sendMessage(from, {
        image: { url: profilePic },
        caption: message,
        mentions: orderedMembers
      }, { quoted: msg })
    } else {
      await sock.sendMessage(from, {
        text: message,
        mentions: orderedMembers
      }, { quoted: msg })
    }

    // Optional: send small footer so people know who called it
    await sock.sendMessage(from, {
      text: `Hidden tag by @${sender.split('@')[0]} • Powered By ${brandName}`,
      mentions: [sender]
    })

  } catch (err) {
    console.error('[HIDETAG ERROR]', err.message)
    await sock.sendMessage(from, {
      text: '> Failed to send hidden tag. Try again.'
    }, { quoted: msg })
  }
}