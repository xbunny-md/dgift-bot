// commands/group/demoteall.js
export const name = 'demoteall'
export const alias = ['demote-all', 'demotealladmins', 'massdemote']
export const category = 'Group'
export const desc = 'Demote all admin members except owner to regular member'

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
    return 'I need to be an admin to demote members. Make me admin first.'
  }
  if (msg.includes('rate-limit')) {
    return 'Too many requests. Try again in a few minutes.'
  }
  if (msg.includes('timeout')) {
    return 'WhatsApp is temporarily unavailable. Try again later.'
  }
  if (msg.includes('forbidden')) {
    return 'I do not have permission to demote members.'
  }
  if (msg.includes('cannot demote owner')) {
    return 'Cannot demote the group owner.'
  }

  return 'Failed to demote users. Reason: ' + err.message
}

export default async function demoteall(sock, { msg, from, isGroup, groupMetadata }, botSettings) {
  try {
    if (!isGroup) {
      return await sock.sendMessage(from, {
        text: '> This command only works in groups.'
      }, { quoted: msg })
    }

    const brandName = await getBrandName(botSettings)

    // Get all admins except bot and group owner
    const admins = groupMetadata.participants
      .filter(p => p.admin && p.id !== sock.user.id && p.admin !== 'superadmin')
      .map(p => p.id)

    if (admins.length === 0) {
      return await sock.sendMessage(from, {
        text: `╭─⌈ DEMOTE ALL ⌋
│ No admins to demote.
╰⊷ *Powered By ${brandName}*`
      }, { quoted: msg })
    }

    await sock.sendMessage(from, {
      text: `╭─⌈ DEMOTING ADMINS ⌋
│ Found ${admins.length} admin(s) to demote.
│ Please wait...
╰⊷ *Powered By ${brandName}*`
    }, { quoted: msg })

    let successCount = 0
    let failedCount = 0
    const failedUsers = []

    // Demote users in batches to avoid rate limit
    for (let i = 0; i < admins.length; i += 5) {
      const batch = admins.slice(i, i + 5)
      
      try {
        await sock.groupParticipantsUpdate(from, batch, 'demote')
        successCount += batch.length
      } catch (err) {
        failedCount += batch.length
        failedUsers.push(...batch)
      }

      // Delay between batches to avoid rate limit
      if (i + 5 < admins.length) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    // Send result
    let resultText = `╭─⌈ DEMOTE ALL COMPLETE ⌋
│ Successful: ${successCount}
│ Failed: ${failedCount}
│ Total: ${admins.length}`

    if (failedCount > 0) {
      resultText += `\n│ Failed users: ${failedUsers.map(u => '@' + u.split('@')[0]).join(', ')}`
    }

    resultText += `\n╰⊷ *Powered By ${brandName}*`

    await sock.sendMessage(from, {
      text: resultText,
      mentions: failedUsers.length > 0 ? failedUsers : []
    }, { quoted: msg })

  } catch (err) {
    console.error('[DEMOTEALL ERROR]', err)
    const brandName = await getBrandName(botSettings).catch(() => 'Bot')
    
    await sock.sendMessage(from, {
      text: `╭─⌈ DEMOTE ALL FAILED ⌋
│ ${getErrorMessage(err)}
╰⊷ *Powered By ${brandName}*`
    }, { quoted: msg })
  }
}