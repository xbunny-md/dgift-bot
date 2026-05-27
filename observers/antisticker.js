// observers/antisticker.js
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

export default async function antisticker(sock, { msg, from, sender }, botSettings) {
  try {
    if (msg.key.fromMe) return
    if (!botSettings?.supabase) return

    const { data: settings } = await botSettings.supabase
  .from('b_settings')
  .select('anti_sticker')
  .eq('id', 'DGIFT_DEFAULT')
  .maybeSingle()

    if (!settings?.anti_sticker) return

    const msgType = Object.keys(msg.message || {})[0]
    if (msgType === 'stickerMessage') {
      const brandName = await getBrandName(botSettings)

      await sock.sendMessage(from, { delete: msg.key }).catch(() => {})

      await sock.sendMessage(from, {
        text: `╭─⌈ 🚫 *AntiSticker Activated* ⌋
│ Action: Message deleted
│
│ Reason: Stickers are not allowed in this group
╰⊷ *Powered By ${brandName}*`,
        mentions: [sender]
      }).catch(() => {})

      console.log(`[ANTISTICKER] Deleted sticker from ${sender} in ${from}`)
    }

  } catch (err) {
    console.log('[ANTISTICKER ERROR]', err.message)
  }
}