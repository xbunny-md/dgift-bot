// observers/antistatusmention.js
export default async function antistatusmention(sock, { msg }, botSettings) {
  try {
    if (!botSettings?.supabase) return
    if (!msg.key.fromMe) return
    if (!msg.message?.extendedTextMessage?.contextInfo?.mentionedJid) return

    const { data: settings } = await botSettings.supabase
      .from('b_settings')
      .select('antistatusmention')
      .eq('id', 'DGIFT_DEFAULT')
      .maybeSingle()

    if (!settings?.antistatusmention) return

    await sock.sendMessage(msg.key.remoteJid, { delete: msg.key })

  } catch (err) {
    console.log('[ANTISTATUSMENTION ERROR]', err.message)
  }
}