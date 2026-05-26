// observers/autoread.js
export default async function autoread(sock, { msg, from, isGroup }, botSettings) {
  try {
    if (!botSettings?.supabase) return
    if (msg.key.fromMe) return
    if (!msg.key.id) return

    const targetJid = isGroup ? from : 'global'

    // 1. GET SETTINGS FROM b_settings - NO HARDCODE
    let settings = botSettings

    if (!settings || settings.autoread === undefined) {
      const { data: dbSettings } = await botSettings.supabase
        .from('b_settings')
        .select('autoread')
        .eq('id', targetJid)
        .maybeSingle()

      settings = dbSettings || botSettings

      // Fallback to global if group not set
      if ((!settings || settings.autoread === undefined) && isGroup) {
        const { data: globalSettings } = await botSettings.supabase
          .from('b_settings')
          .select('autoread')
          .eq('id', 'DGIFT_DEFAULT')
          .maybeSingle()
        settings = globalSettings
      }
    }

    // 2. CHECK IF AUTO READ IS ON
    if (!settings?.autoread) return

    // 3. MARK MESSAGE AS READ
    await sock.readMessages([msg.key])

    // Optional: mark as seen/presence
    await sock.sendPresenceUpdate('available', from)

  } catch (err) {
    console.log('[AUTOREAD ERROR]', err.message)
  }
}