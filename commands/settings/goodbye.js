// observers/goodbye.js
async function getGroupSettings(botSettings, targetId) {
  if (!botSettings?.supabase) return null

  // Jaribu kupata settings za group/groupId
  const { data: groupSettings } = await botSettings.supabase
  .from('b_settings')
  .select('*')
  .eq('id', targetId)
  .maybeSingle()

  if (groupSettings?.goodbye_enabled) return groupSettings

  // Kama hakuna, angalia global settings DGIFT_DEFAULT
  const { data: globalSettings } = await botSettings.supabase
  .from('b_settings')
  .select('*')
  .eq('id', 'DGIFT_DEFAULT')
  .maybeSingle()

  return globalSettings
}

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

export const name = 'goodbye'

export default async function goodbye(sock, event, botSettings) {
  try {
    const { id: groupId, participants, action } = event
    if (action!== 'remove' && action!== 'leave') return
    if (!botSettings.supabase) return

    // 1. CHECK SETTINGS FROM b_settings - NO HARDCODE
    const settings = await getGroupSettings(botSettings, groupId)
    if (!settings?.goodbye_enabled) return

    const template = settings.goodbye_msg || 'Kwaheri @user'
    const groupMeta = await sock.groupMetadata(groupId).catch(() => null)
    const groupName = groupMeta?.subject || 'this group'
    const brandName = await getBrandName(botSettings)
    const botName = settings.botname || brandName

    for (const userId of participants) {
      const message = template
      .replace('@user', `@${userId.split('@')[0]}`)
      .replace('{group}', groupName)
      .replace('{bot}', botName)

      // 2. BUILD GOODBYE MESSAGE WITH BOXES
      let goodbyeText = `╭─⌈ 👋 *${brandName} Goodbye* ⌋\n`
      goodbyeText += `│ Bot: ${botName}\n`
      goodbyeText += `│ Group: ${groupName}\n`
      goodbyeText += `╰⊷ ${message}`

      await sock.sendMessage(groupId, {
        text: goodbyeText,
        mentions: [userId]
      }).catch(() => {})
    }
  } catch (err) {
    console.error('[GOODBYE OBSERVER ERROR]', err.message)
  }
}