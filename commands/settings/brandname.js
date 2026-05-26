// commands/settings/setbrandname.js
export const name = 'setbrandname'
export const alias = ['brandname', 'setbrand', 'brand']
export const category = 'Settings'
export const desc = 'Change brand name shown in messages'

export default async function setbrandname(sock, { msg, from, sender, isGroup, isAdmin }, botSettings) {
  try {
    if (!botSettings.supabase) {
      return sock.sendMessage(from, { text: '> Database connection not ready.' }, { quoted: msg })
    }

    const isOwner = sender === botSettings.owner_number + '@s.whatsapp.net'
    if (!isOwner) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: '> Owner only command.' }, { quoted: msg })
    }

    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const newBrand = args.join(' ').trim()

    const { data: settings } = await botSettings.supabase
     .from('b_settings')
     .select('brand_name, botname, prefix')
     .eq('id', 'DGIFT_DEFAULT')
     .maybeSingle()

    const currentBrand = settings?.brand_name || 'dgift-bot'
    const botname = settings?.botname || 'dgift-bot'
    const prefix = settings?.prefix || '.'

    if (!newBrand) {
      await sock.sendMessage(from, { react: { text: '🏷️', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 🏷️ *Brand Name Settings* ⌋
│ Current Brand: ${currentBrand}
│ Bot Name: ${botname}
│
│ Usage:
│ ${prefix}setbrandname Bunny Tech
│ ${prefix}setbrandname Dgift-MD
│
│ Note: This only changes the name shown in message footers
╰⊷ *${botname}*`
      }, { quoted: msg })
    }

    if (newBrand.length > 30) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: '> Brand name too long. Max 30 characters.' }, { quoted: msg })
    }

    if (newBrand === currentBrand) {
      await sock.sendMessage(from, { react: { text: '⚠️', key: msg.key } })
      return await sock.sendMessage(from, { text: `> Brand name is already set to "${currentBrand}"` }, { quoted: msg })
    }

    const { error } = await botSettings.supabase
     .from('b_settings')
     .update({
        brand_name: newBrand,
        updated_at: new Date().toISOString()
      })
     .eq('id', 'DGIFT_DEFAULT')

    if (error) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: `> Database error: ${error.message}` }, { quoted: msg })
    }

    // Update live memory
    botSettings.brand_name = newBrand

    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })
    await sock.sendMessage(from, {
      text: `╭─⌈ ✅ *Brand Name Updated* ⌋
│ Old: ${currentBrand}
│ New: ${newBrand}
│ Status: Applied instantly
│
│ All message footers will use the new brand name now
╰⊷ *${botname}*`
    }, { quoted: msg })

  } catch (err) {
    console.error(`[SETBRANDNAME ERROR]`, err.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Failed to update brand name.' }, { quoted: msg })
  }
}