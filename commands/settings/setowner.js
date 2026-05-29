// commands/settings/setowner.js
export const name = 'setowner'
export const alias = ['owner', 'setownername', 'setownernumber']
export const category = 'Settings'
export const desc = 'Change bot owner number and name'

export default async function setowner(sock, { msg, from, sender }, botSettings) {
  try {
    // Angalia kama database ipo
    if (!botSettings.supabase ||!botSettings.instance_id) {
      return sock.sendMessage(from, { text: '> Database connection not ready.' }, { quoted: msg })
    }

    await sock.sendMessage(from, { react: { text: '👑', key: msg.key } })

    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const newNumber = args[0]?.replace(/[^0-9]/g, '')
    const newName = args.slice(1).join(' ').trim()

    const instanceId = botSettings.instance_id // KILA BOT NA DATA ZAKE - NO DEFAULT

    // Chukua settings za instance hii - KAMA INDEX.JS
    const { data: settings } = await botSettings.supabase
   .from('b_settings')
   .select('owner_number, owner_name, botname')
   .eq('id', instanceId)
   .maybeSingle()

    const currentNumber = settings?.owner_number || 'Not set'
    const currentName = settings?.owner_name || 'Not set'
    const botname = settings?.botname || 'Bot'

    // Onyesha status kama hakuna input mpya
    if (!newNumber &&!newName) {
      await sock.sendMessage(from, { react: { text: '⚙️', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 👑 *Owner Control* ⌋
│ Bot: ${botname}
│ Instance: ${instanceId}
│ Number: ${currentNumber}
│ Name: ${currentName}
│
│ Usage:
│ ${botSettings.prefix}setowner 2557xxxxxxxx Arnold
│ ${botSettings.prefix}setowner 2557xxxxxxxx
│ ${botSettings.prefix}setowner Arnold
╰⊷ *${botname}*`
      }, { quoted: msg })
    }

    const updateData = {
      id: instanceId,
      updated_at: new Date().toISOString()
    }

    if (newNumber) updateData.owner_number = newNumber
    if (newName) updateData.owner_name = newName

    // Sasisha database kwa upsert - KAMA INDEX.JS
    const { error } = await botSettings.supabase
   .from('b_settings')
   .upsert(updateData, { onConflict: 'id' })

    if (error) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: `> Database error: ${error.message}` }, { quoted: msg })
    }

    // Sasisha live memory
    if (newNumber) botSettings.owner_number = newNumber
    if (newName) botSettings.owner_name = newName

    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })
    await sock.sendMessage(from, {
      text: `╭─⌈ ✅ *Settings Updated* ⌋
│ Bot: ${botname}
│ Instance: ${instanceId}
│ Number: ${currentNumber} → ${newNumber || currentNumber}
│ Name: ${currentName} → ${newName || currentName}
│ Status: Applied instantly
│
╰⊷ *${botname}*`
    }, { quoted: msg })

  } catch (err) {
    console.error(`[SETOWNER CMD ERROR]`, err.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Failed. Check database.' }, { quoted: msg })
  }
}