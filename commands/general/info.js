// commands/general/info.js
export const name = 'info'
export const alias = ['about', 'botinfo']
export const category = 'General'
export const desc = 'Show bot information'

export default async function info(sock, { msg, from }, botSettings) {
  try {
    await sock.sendMessage(from, { react: { text: '🦺', key: msg.key } })

    const loadingMsg = await sock.sendMessage(from, { text: 'Loading info...' }, { quoted: msg })

    const botName = botSettings.botname || 'bot'
    const ownerName = botSettings.owner_name || 'Owner'
    const brandName = botSettings.brand_name || ownerName
    const prefix = botSettings.prefix || '.'
    const description = botSettings.description || 'WhatsApp Bot'
    const menuImage = botSettings.startup_image || null

    const text = 
`╭─⌈ ℹ️ *${botName.toUpperCase()} INFO* ⌋
│ Name: ${botName}
│ Owner: ${ownerName}
│ Brand: ${brandName}
│ Prefix: ${prefix}
│ Desc: ${description}
╰⊷ *Powered By ${brandName}*`

    if (menuImage) {
      // Edit loading msg kwanza
      await sock.sendMessage(from, {
        text: '✅ Done',
        edit: loadingMsg.key
      })
      
      // Kisha tuma picha
      await sock.sendMessage(from, {
        image: { url: menuImage },
        caption: text
      }, { quoted: msg })
      
    } else {
      // Kama hakuna picha, edit tu
      await sock.sendMessage(from, {
        text: text,
        edit: loadingMsg.key,
        react: { text: '✅', key: loadingMsg.key }
      })
    }

  } catch (e) {
    console.error('Info error:', e.message)
    await sock.sendMessage(from, { 
      text: `> Info failed to load.` 
    }, { quoted: msg })
  }
}