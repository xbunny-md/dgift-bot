// commands/general/ping.js
export const name = 'ping'
export const alias = ['p', 'speed', 'latency']
export const category = 'General'
export const desc = 'Check bot response speed and latency'

export default async function ping(sock, { msg, from }, botSettings) {
  try {
    const startTime = Date.now()

    const sentMsg = await sock.sendMessage(from, { text: 'Pinging...' }, { quoted: msg })

    const serverLatencyMs = Date.now() - startTime
    const activeBotIdentityName = botSettings.botname || 'dgift-bot'

    const dynamicPingPayload = 
`╭─⌈ ⚡ *${activeBotIdentityName}* ⌋
│ ${serverLatencyMs}ms [█████████▒]
╰⊷ *${activeBotIdentityName}*`

    await sock.sendMessage(from, {
      text: dynamicPingPayload,
      edit: sentMsg.key,
      react: {
        text: '🦸',
        key: sentMsg.key
      }
    })

  } catch (error) {
    console.log('Ping command error:', error.message)
    await sock.sendMessage(from, { text: 'Failed to check ping.' }, { quoted: msg })
  }
}