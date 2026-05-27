// observers/goodbye.js
export const name = 'goodbye'

export default async function goodbye(sock, event, botSettings) {
  try {
    const { id: groupId, participants, action } = event
    if (action!== 'remove' && action!== 'leave') return
    if (!botSettings.supabase) return

    // Check if goodbye is enabled for this group
    const { data: settings } = await botSettings.supabase
     .from('b_settings')
     .select('goodbye_enabled, goodbye_msg')
     .eq('id', groupId)
     .maybeSingle()

    if (!settings?.goodbye_enabled) return

    const template = settings.goodbye_msg || 'Goodbye @user'
    const groupMeta = await sock.groupMetadata(groupId).catch(() => null)
    const groupName = groupMeta?.subject || 'this group'

    for (const userId of participants) {
      const message = template
       .replace('@user', `@${userId.split('@')[0]}`)
       .replace('{group}', groupName)

      await sock.sendMessage(groupId, {
        text: message,
        mentions: [userId]
      }).catch(() => {})
    }
  } catch (err) {
    console.error('[GOODBYE OBSERVER ERROR]', err.message)
  }
}