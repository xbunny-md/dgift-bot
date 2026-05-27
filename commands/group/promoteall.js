// commands/group/promoteall.js
export const name = 'promoteall'
export const alias = ['promote-all', 'promoteallmembers', 'masspromote']
export const category = 'Group'
export const desc = 'Promote all non-admin members to admin in the group'

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

function getErrorMessage(err) {
  const msg = err.message?.toLowerCase() || ''

  if (msg.includes('not-authorized') || msg.includes('forbidden')) {
    return 'I need to be an admin to promote members. Make me admin first.'
  }
  if (msg.includes('rate-limit')) {
    return 'Too many requests. Try again in a few minutes.'
  }
  if (msg.includes('timeout')) {
    return 'WhatsApp is temporarily unavailable. Try again later.'
  }
  if (msg.includes('forbidden')) {
    return 'I do not have permission to promote members.'
  }

  return 'Failed to promote users. Reason: ' + err.message
}

export default async function promoteall(sock, { msg, from, isGroup, groupMetadata }, botSettings) {
  try {
    if (!isGroup) {
      return await sock.sendMessage(from, {
        text: '> This command only works in groups.'
      }, { quoted: msg })
    }

    const brandName = await getBrandName(botSettings)

    // Get all non-admin members except bot
    const nonAdmins = groupMetadata.participants
      .filter(p => !p.admin && p.id !== sock.user.id)
      .map(p => p.id)

    if (nonAdmins.length === 0) {
      return await sock.sendMessage(from, {
        text: `╭─⌈ PROMOTE ALL ⌋
│ Everyone is already an admin.
╰⊷ *Powered By ${brandName}*`
      }, { quoted: msg })
    }

    await sock.sendMessage(from, {
      text: `╭─⌈ PROMOTING USERS ⌋
│ Found ${nonAdmins.length} member(s) to promote.
│ Please wait...
╰⊷ *Powered By ${brandName}*`
    }, { quoted: msg })

    let successCount = 0
    let failedCount = 0
    const failedUsers = []

    // Promote users in batches to avoid rate limit
    for (let i = 0; i < nonAdmins.length; i += 5) {
      const batch = nonAdmins.slice(i, i + 5)
      
      try {
        await sock.groupParticipantsUpdate(from, batch, 'promote')
        successCount += batch.length
      } catch (err) {
        failedCount += batch.length
        failedUsers.push(...batch)
      }

      // Delay between batches to avoid rate limit
      if (i + 5 < nonAdmins.length) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    // Send result
    let resultText = `╭─⌈ PROMOTE ALL COMPLETE ⌋
│ Successful: ${successCount}
│ Failed: ${failedCount}
│ Total: ${nonAdmins.length}`

    if (failedCount > 0) {
      resultText += `\n│ Failed users: ${failedUsers.map(u => '@' + u.split('@')[0]).join(', ')}`
    }

    resultText += `\n╰⊷ *Powered By ${brandName}*`

    await sock.sendMessage(from, {
      text: resultText,
      mentions: failedUsers.length > 0 ? failedUsers : []
    }, { quoted: msg })

  } catch (err) {
    console.error('[PROMOTEALL ERROR]', err)
    const brandName = await getBrandName(botSettings).catch(() => 'Bot')
    
    await sock.sendMessage(from, {
      text: `╭─⌈ PROMOTE ALL FAILED ⌋
│ ${getErrorMessage(err)}
╰⊷ *Powered By ${brandName}*`
    }, { quoted: msg })
  }
}