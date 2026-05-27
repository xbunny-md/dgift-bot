// observers/welcome.js
async function getGroupSettings(botSettings, targetId) {
  if (!botSettings?.supabase) return null

  const { data: groupSettings } = await botSettings.supabase
  .from('b_settings')
  .select('*')
  .eq('id', targetId)
  .maybeSingle()

  if (groupSettings?.welcome_enabled) return groupSettings

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

export const name = 'welcome'

export default async function welcome(sock, event, botSettings) {
  try {
    const { id: groupId, participants, action } = event
    if (action !== 'add') return
    if (!botSettings.supabase) return

    const settings = await getGroupSettings(botSettings, groupId)
    if (!settings?.welcome_enabled) return

    const template = settings.welcome_msg || 'Karibu @user kwenye group {group}'
    const groupMeta = await sock.groupMetadata(groupId).catch(() => null)
    const groupName = groupMeta?.subject || 'this group'
    const brandName = await getBrandName(botSettings)
    const botName = settings.botname || brandName

    for (const userId of participants) {
      const message = template
      .replace('@user', `@${userId.split('@')[0]}`)
      .replace('{group}', groupName)
      .replace('{bot}', botName)

      let welcomeText = `╭─⌈ 🎉 *${brandName} Welcome* ⌋\n`
      welcomeText += `│ Bot: ${botName}\n`
      welcomeText += `│ Group: ${groupName}\n`
      welcomeText += `╰⊷ ${message}`

      await sock.sendMessage(groupId, {
        text: welcomeText,
        mentions: [userId]
      }).catch(() => {})
    }
  } catch (err) {
    console.error('[WELCOME OBSERVER ERROR]', err.message)
  }
}