// commands/general/owner.js
export const name = 'owner'
export const alias = ['dev', 'creator', 'contact']
export const category = 'General'
export const desc = 'Show bot owner contact'

export default async function owner(sock, { msg, from }, botSettings) {
  try {
    await sock.sendMessage(from, { react: { text: '🦺', key: msg.key } })

    const loadingMsg = await sock.sendMessage(from, { text: 'Loading owner contact...' }, { quoted: msg })

    const ownerName = botSettings.owner_name || 'Owner'
    const ownerNumber = botSettings.owner_number || ''
    const brandName = botSettings.brand_name || ownerName

    if (!ownerNumber) {
      await sock.sendMessage(from, {
        text: `╭─⌈ ⚠️ *OWNER* ⌋\n│ Owner number not set in database\n╰⊷ *Powered By ${brandName}*`,
        edit: loadingMsg.key
      })
      return
    }

    // Clean number: remove +, spaces, dashes
    const cleanNumber = ownerNumber.replace(/[^0-9]/g, '')
    const waid = cleanNumber + '@s.whatsapp.net'

    // Build vCard
    const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${ownerName}
TEL;type=CELL;type=WAID:${cleanNumber}
END:VCARD`

    const text = 
`╭─⌈ 👑 *OWNER CONTACT* ⌋
│ Name: ${ownerName}
│ Number: +${cleanNumber}
╰⊷ *Powered By ${brandName}*`

    await sock.sendMessage(from, {
      contacts: {
        displayName: ownerName,
        contacts: [{ vcard, displayName: ownerName }]
      },
      text: text,
      edit: loadingMsg.key
    })

  } catch (e) {
    console.error('Owner error:', e.message)
    await sock.sendMessage(from, { 
      text: `> Failed to load owner contact.` 
    }, { quoted: msg })
  }
}