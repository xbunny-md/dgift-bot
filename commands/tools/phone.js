// commands/tools/phone.js
export const name = 'phone'
export const alias = ['phonedetail', 'numberinfo', 'checkphone']
export const category = 'Tools'
export const desc = 'Get details about a phone number'

export default async function phone(sock, { msg, from, args }, botSettings) {
  try {
    const brand = botSettings?.brand_name || botSettings?.botname || 'DGIFT BOT'

    if (!args[0]) {
      return sock.sendMessage(from, {
        text: `╭─⌈ 📞 *PHONE INFO* ⌋
│
│ Usage: ${botSettings.prefix}phone <number>
│ Example: ${botSettings.prefix}phone 254748548334
│ Example: ${botSettings.prefix}phone +254748548334
│
╰⊷ *Powered By ${brand}*`
      }, { quoted: msg })
    }

    await sock.sendMessage(from, { react: { text: '📞', key: msg.key } })

    const loadingMsg = await sock.sendMessage(from, {
      text: `╭─⌈ 🔍 *SCANNING NUMBER* ⌋
│
│ Processing: ${args[0]}
│
╰⊷ *Powered By ${brand}*`
    }, { quoted: msg })

    // Clean number
    let number = args[0].replace(/[^0-9]/g, '')

    // Add country code if missing
    if (!number.startsWith('1') && number.length <= 10) {
      number = '254' + number // Default TZ/KE logic
    }

    const jid = number + '@s.whatsapp.net'
    const exists = await sock.onWhatsApp(jid)

    const isOnWA = exists.length > 0
    const waJid = isOnWA? exists[0].jid : 'Not on WhatsApp'
    const waExists = isOnWA? 'Yes' : 'No'

    // Get country code
    const countryCode = number.substring(0, 3)
    const countryMap = {
      '254': 'Kenya 🇰🇪',
      '255': 'Tanzania 🇹🇿',
      '256': 'Uganda 🇺🇬',
      '234': 'Nigeria 🇳🇬',
      '1': 'USA/Canada 🇺🇸',
      '44': 'UK 🇬🇧',
      '91': 'India 🇮🇳'
    }
    const country = countryMap[countryCode] || 'Unknown'

    const result = `╭─⌈ 📞 *PHONE DETAILS* ⌋
│
│ Input: ${args[0]}
│ Formatted: +${number}
│ Country: ${country}
│ On WhatsApp: ${waExists}
│ JID: ${waJid}
│
╰⊷ *Powered By ${brand}*`

    await sock.sendMessage(from, {
      text: result,
      edit: loadingMsg.key
    })

    await sock.sendMessage(from, { react: { text: '✅', key: loadingMsg.key } }).catch(() => {})

  } catch (error) {
    console.error('[PHONE ERROR]', error.message)
    await sock.sendMessage(from, {
      text: `╭─⌈ ❌ *ERROR* ⌋
│
│ Failed to check number
│ Reason: ${error.message}
│
╰⊷ *Powered By ${botSettings?.brand_name || 'DGIFT BOT'}*`
    }, { quoted: msg })
  }
}