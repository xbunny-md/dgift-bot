// observers/antileave.js

export const name = 'antileave'

async function getGroupSettings(sock, groupId, supabase, instanceId) {
  if (!supabase) return null
  const { data } = await supabase
   .from('b_settings')
   .select('antileave_enabled, antileave_msg, brand_name, botname')
   .eq('id', instanceId || 'DGIFT_DEFAULT')
   .maybeSingle()
  return data
}

export default async function antileave(sock, update, botSettings) {
  try {
    const { id, participants, action } = update

    // Hatutaki kitu kingine isipokuwa mtu ametoka
    if (action!== 'remove') return

    // Pata settings za group hii
    const settings = await getGroupSettings(sock, id, botSettings.supabase, botSettings.instance_id)
    if (!settings ||!settings.antileave_enabled) return

    const brandName = settings.brand_name || settings.botname || 'Bot'

    for (const participant of participants) {
      // Usirudishe bot mwenyewe
      if (participant === sock.user.id) continue

      // Usirudishe kama ni admin aliyejitoa mwenyewe - WhatsApp haitakubali
      try {
        // Jaribu kumrudisha
        await sock.groupParticipantsUpdate(id, [participant], 'add')

        // Tuma ujumbe kama kuna message
        if (settings.antileave_msg) {
          const msg = settings.antileave_msg
           .replace('@user', `@${participant.split('@')[0]}`)
           .replace('{group}', '')

          await sock.sendMessage(id, {
            text: msg,
            mentions: [participant]
          })
        }

      } catch (err) {
        console.error('[ANTILEAVE ERROR]', err.message)
        // Kama imeshindwa, achana nayo. Mara nyingi ni kwa sababu alitoka mwenyewe na sio admin
      }
    }

  } catch (err) {
    console.error('[ANTILEAVE FATAL]', err)
  }
}