// commands/general/runtime.js
export const name = 'runtime'
export const alias = ['uptime', 'run']
export const category = 'General'
export const desc = 'Check bot uptime and memory usage'

export default async function runtime(sock, { msg, from }, botSettings) {
  try {
    const startTime = Date.now()

    const loadingMsg = await sock.sendMessage(from, { text: 'Loading...' }, { quoted: msg })

    const uptimeSec = process.uptime()
    const days = Math.floor(uptimeSec / 86400)
    const hours = Math.floor((uptimeSec % 86400) / 3600)
    const minutes = Math.floor((uptimeSec % 3600) / 60)
    const seconds = Math.floor(uptimeSec % 60)

    let uptimeStr = ''
    if (days > 0) uptimeStr += `${days}d `
    uptimeStr += `${hours}h ${minutes}m ${seconds}s`

    const mem = process.memoryUsage()
    const ramUsed = (mem.heapUsed / 1024 / 1024).toFixed(1)
    const ramTotal = (mem.heapTotal / 1024 / 1024).toFixed(1)
    const botName = botSettings.botname || 'bot'
    const responseTime = Date.now() - startTime

    const output = 
`╭─⌈ ⚡ *${botName}* ⌋
│ Uptime: ${uptimeStr}
│ RAM: ${ramUsed}/${ramTotal} MB
│ Speed: ${responseTime}ms
╰⊷ *${botName}*`

    await sock.sendMessage(from, {
      text: output,
      edit: loadingMsg.key,
      react: {
        text: '⚡',
        key: loadingMsg.key
      }
    })

  } catch (error) {
    console.log('Runtime command error:', error.message)
    await sock.sendMessage(from, { text: 'Failed to get runtime info.' }, { quoted: msg })
  }
}