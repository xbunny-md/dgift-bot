// commands/general/runtime.js
import axios from 'axios'

export const name = 'runtime'
export const alias = ['uptime', 'run', 'uptime-status']
export const category = 'General'
export const desc = 'Display detailed server instance runtime metrics and memory allocation telemetry'

export default async function runtime(sock, { msg, from }, botSettings) {
  let processingMsg = null
  try {
    // Trigger loading emoji reaction status on the incoming message
    await sock.sendMessage(from, { react: { text: '📖', key: msg.key } })

    // Open active modification text tracking line string
    processingMsg = await sock.sendMessage(from, {
      text: `[SYSTEM] Polling core infrastructure for resource allocation and platform telemetry...`
    }, { quoted: msg })

    const activeBotIdentityName = botSettings?.botname || 'dgift-bot'

    // Calculate dynamic system uptime metrics (Days, Hours, Minutes, Seconds)
    const uptimeInSeconds = process.uptime()
    const days = Math.floor(uptimeInSeconds / 86400)
    const hours = Math.floor((uptimeInSeconds % 86400) / 3600)
    const minutes = Math.floor((uptimeInSeconds % 3600) / 60)
    const seconds = Math.floor(uptimeInSeconds % 60)

    let preciseUptimeStr = ''
    if (days > 0) preciseUptimeStr += `${days}d `
    preciseUptimeStr += `${hours}h ${minutes}m ${seconds}s`

    // Extract volatile container memory usage footprints (V8 Heap Management)
    const memoryUsageData = process.memoryUsage()
    const ramConsumedMb = (memoryUsageData.heapUsed / 1024 / 1024).toFixed(2)
    const ramAllocatedMb = (memoryUsageData.heapTotal / 1024 / 1024).toFixed(2)

    const nodeVersion = process.version
    const cloudEnvironment = process.env.RENDER_SERVICE_NAME ? 'Render Cloud' : 'Isolated Node Layer'

    // Zero-Footprint Buffer Delivery Protocol (No file is written to Render disk storage)
    let volatileGraphicBuffer = null
    const telemetryAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent('Runtime+Metrics')}&background=random&size=512`

    try {
      console.log(`[RAM STREAM] Fetching telemetry avatar directly into volatile heap memory allocation block`)
      const imgResponse = await axios.get(telemetryAvatarUrl, {
        responseType: 'arraybuffer',
        timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      })
      volatileGraphicBuffer = Buffer.from(imgResponse.data)
    } catch (bufErr) {
      console.log(`[BUFFER EXCEPTION] Visual telemetry stream channel dropped: ${bufErr.message}`)
    }

    // Structure layout properties text parameters with bold markdown values applied cleanly
    const caption = `╭─⌈ ⚡ *${activeBotIdentityName.toUpperCase()} RUNTIME* ⌋
│
│ *System Uptime:* ${preciseUptimeStr}
│ *RAM Footprint:* ${ramConsumedMb} MB / ${ramAllocatedMb} MB
│ *Engine Core:* Node.js ${nodeVersion}
│ *Host Cluster:* ${cloudEnvironment}
│
╰⊷ *Powered By ${activeBotIdentityName}*`

    // Output binary graphic buffer payload directly over WhatsApp socket networks
    if (volatileGraphicBuffer) {
      await sock.sendMessage(from, {
        image: volatileGraphicBuffer,
        caption: caption
      }, { quoted: msg })

      // Wipe out local variable token reference immediately to trigger automatic Garbage Collection
      volatileGraphicBuffer = null

      if (processingMsg) {
        await sock.sendMessage(from, {
          text: `[SUCCESS] Runtime metrics transmitted successfully. Volatile allocation buffers flushed.`,
          edit: processingMsg.key
        }).catch(() => {})
      }
    } else {
      // Message inline edit tracking fallback if image link could not parse inside matrix
      if (processingMsg) {
        await sock.sendMessage(from, { text: caption, edit: processingMsg.key })
      } else {
        await sock.sendMessage(from, { text: caption }, { quoted: msg })
      }
    }

    // Trigger success emoji reaction status on the original user message
    await sock.sendMessage(from, { react: { text: '✨', key: msg.key } })

  } catch (error) {
    console.error('[RUNTIME METRICS SYSTEM FAULT]', error.message)
    const faultLoggedStr = `[ERROR] Extraction pipelines failed to query instance data. Command terminated.`

    if (processingMsg) {
      await sock.sendMessage(from, { text: faultLoggedStr, edit: processingMsg.key }).catch(() => {})
    } else {
      await sock.sendMessage(from, { text: faultLoggedStr }, { quoted: msg })
    }

    // Trigger failure emoji reaction status
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}
