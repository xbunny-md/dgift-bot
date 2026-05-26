// observers/autopresencecomposing.js
export default async function autopresencecomposing(sock, { msg, from, isGroup }, botSettings) {
  try {
    if (!botSettings?.supabase) return
    if (msg.key.fromMe) return

    const targetJid = isGroup ? from : 'global'

    let settings = botSettings
    if (!settings || settings.autopresencecomposing === undefined) {
      const { data: dbSettings } = await botSettings.supabase
        .from('b_settings')
        .select('autopresencecomposing')
        .eq('id', targetJid)
        .maybeSingle()
      settings = dbSettings || botSettings

      if ((!settings || settings.autopresencecomposing === undefined) && isGroup) {
        const { data: globalSettings } = await botSettings.supabase
          .from('b_settings')
          .select('autopresencecomposing')
          .eq('id', 'DGIFT_DEFAULT')
          .maybeSingle()
        settings = globalSettings
      }
    }

    if (!settings?.autopresencecomposing) return

    await sock.sendPresenceUpdate('composing', from)
    setTimeout(() => sock.sendPresenceUpdate('paused', from), 3000)

  } catch (err) {
    console.log('[AUTOPRESENCE ERROR]', err.message)
  }
}