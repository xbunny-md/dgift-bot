// commands/settings/chatbot.js
export const name = 'chatbot'
export const alias = ['aichat', 'freechat', 'chaton']
export const category = 'Settings'
export const desc = 'Toggle free AI chatbot on/off for this instance'

export default async function chatbotToggle(sock, { msg, from }, botSettings) {
  try {
    // Angalia kama database ipo
    if (!botSettings.supabase) {
      return sock.sendMessage(from, { text: '> Database connection not ready.' }, { quoted: msg })
    }

    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const action = args[0]?.toLowerCase()

    const targetJid = botSettings.instance_id || 'DGIFT_DEFAULT'

    // Chukua status ya sasa
    const { data: settings } = await botSettings.supabase
     .from('b_settings')
     .select('chatbot_on')
     .eq('id', targetJid)
     .maybeSingle()

    const currentValue = settings?.chatbot_on || false

    // Onyesha status kama hakuna action
    if (!action) {
      await sock.sendMessage(from, { react: { text: '💬', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 💬 *Free Chat Control* ⌋
│ Status: ${currentValue? 'ON ✅' : 'OFF ❌'}
│ Target: ${targetJid}
│
│ Usage:
│ ${botSettings.prefix}chatbot on
│ ${botSettings.prefix}chatbot off
│
│ Note: Bot will reply to any message automatically
╰⊷ *${botSettings.botname}*`
      }, { quoted: msg })
    }

    const validOptions = ['on', 'off', 'enable', 'disable', '1', '0']
    if (!validOptions.includes(action)) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: `> Invalid option. Use: on/off` }, { quoted: msg })
    }

    const newValue = ['on', 'enable', '1'].includes(action)

    // Angalia kama tayari iko hivyo
    if (newValue === currentValue) {
      await sock.sendMessage(from, { react: { text: '⚠️', key: msg.key } })
      return await sock.sendMessage(from, { text: `> Chatbot is already ${action}` }, { quoted: msg })
    }

    // Sasisha database
    const { error } = await botSettings.supabase
     .from('b_settings')
     .upsert(
        {
          id: targetJid,
          chatbot_on: newValue,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'id' }
      )

    if (error) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: `> Database error: ${error.message}` }, { quoted: msg })
    }

    // Sasisha live memory
    botSettings.chatbot_on = newValue

    await sock.sendMessage(from, { react: { text: newValue? '✅' : '❌', key: msg.key } })
    await sock.sendMessage(from, {
      text: `╭─⌈ 💬 *Settings Updated* ⌋
│ Target: ${targetJid} 🌍
│ Free Chat: ${newValue? 'ON ✅' : 'OFF ❌'}
│ Status: Applied instantly
│
│ ${newValue? 'Bot will now reply to all messages.' : 'Free chat has been disabled.'}
╰⊷ *${botSettings.botname}*`
    }, { quoted: msg })

  } catch (err) {
    console.error(`[CHATBOT CMD ERROR]`, err.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Failed. Check database.' }, { quoted: msg })
  }
}