// commands/tools/systeminfo.js
import os from 'os'
import { getAllCommands } from '../../lib/router.js'
import { performance } from 'perf_hooks'

export const name = 'systeminfo'
export const alias = ['sysinfo', 'sys', 'hostinfo', 'runtime']
export const category = 'Tools'
export const desc = 'Show detailed system, hosting and runtime statistics'

export default async function systeminfo(sock, { msg, from, pushName, sender }, botSettings) {
  try {
    await sock.sendMessage(from, { react: { text: '⚙️', key: msg.key } })

    const loadingMsg = await sock.sendMessage(from, { text: '> Scanning system...' }, { quoted: msg })

    const startPing = performance.now()
    await sock.sendPresenceUpdate('composing', from)
    const ping = Math.round(performance.now() - startPing)

    // Uptime
    const uptimeSec = process.uptime()
    const days = Math.floor(uptimeSec / 86400)
    const hours = Math.floor((uptimeSec % 86400) / 3600)
    const minutes = Math.floor((uptimeSec % 3600) / 60)
    const seconds = Math.floor(uptimeSec % 60)
    const uptimeStr = `${days > 0? days + 'd ' : ''}${hours}h ${minutes}m ${seconds}s`

    // Memory
    const mem = process.memoryUsage()
    const procMemUsed = (mem.heapUsed / 1024 / 1024).toFixed(1)
    const procMemTotal = (mem.heapTotal / 1024 / 1024).toFixed(1)
    const procMemExternal = (mem.external / 1024 / 1024).toFixed(1)

    const sysTotal = os.totalmem()
    const sysFree = os.freem()
    const sysUsed = sysTotal - sysFree
    const sysUsedPercent = Math.round((sysUsed / sysTotal) * 100)
    const sysTotalGB = (sysTotal / 1024 / 1024 / 1024).toFixed(1)
    const sysFreeGB = (sysFree / 1024 / 1024 / 1024).toFixed(1)
    const sysUsedGB = (sysUsed / 1024 / 1024 / 1024).toFixed(1)
    const ramBar = '█'.repeat(Math.round((sysUsedPercent / 100) * 10)) + '▒'.repeat(10 - Math.round((sysUsedPercent / 100) * 10))

    // CPU
    const cpus = os.cpus()
    const cpuModel = cpus[0]?.model || 'Unknown'
    const cpuCores = cpus.length
    const loadAvg = os.loadavg().map(x => x.toFixed(2)).join(', ')

    // Platform & Hosting Detection
    const platform = os.platform()
    const platformEmoji = platform === 'linux'? '🐧' : platform === 'win32'? '🪟' : '🍎'
    const platformName = platform === 'linux'? 'Linux' : platform === 'win32'? 'Windows' : 'MacOS'

    const arch = os.arch()
    const hostname = os.hostname()

    let hosting = 'Unknown'
    if (process.env.RENDER) hosting = 'Render'
    else if (process.env.RAILWAY_ENVIRONMENT) hosting = 'Railway'
    else if (process.env.DYNO) hosting = 'Heroku'
    else if (process.env.VERCEL) hosting = 'Vercel'
    else if (process.env.KUBERNETES_SERVICE_HOST) hosting = 'Kubernetes'
    else if (process.env.HOSTINGER) hosting = 'Hostinger'
    else if (hostname.includes('railway')) hosting = 'Railway'
    else if (hostname.includes('render')) hosting = 'Render'
    else if (platform === 'linux' &&!process.env.PWD?.includes('/home')) hosting = 'VPS/Linux Server'

    // Commands Stats
    const allCommands = getAllCommands()
    const cmdCount = allCommands.size
    const categories = new Set()
    for (const [cmdName, cmdData] of allCommands) {
      categories.add(cmdData.category || 'Other')
    }

    // Node & Bot Info
    const nodeVer = process.version
    const botName = botSettings.botname || 'DGIFT BOT'
    const brandName = botSettings.brand_name || botSettings.owner_name || 'DGIFT'
    const prefix = botSettings.prefix || '.'
    const userIdentity = pushName || sender.split('@')[0]

    // Process Info
    const pid = process.pid
    const nodeEnv = process.env.NODE_ENV || 'production'

    const text =
`╭─⌈ 🖥️ *SYSTEM INFO* ⌋
│ User: ${userIdentity}
│ Bot: ${botName}
│ Brand: ${brandName}
│ Prefix: [ ${prefix} ]
│
│╭─⌈ 🌐 *HOSTING* ⌋
│ Platform: ${platformEmoji} ${platformName} ${arch}
│ Hosting: ${hosting}
│ Hostname: ${hostname}
│ Ping: ${ping}ms
│╰─────────────────
│
│╭─⌈ ⏱️ *RUNTIME* ⌋
│ Uptime: ${uptimeStr}
│ Node: ${nodeVer}
│ Env: ${nodeEnv}
│ PID: ${pid}
│╰─────────────────
│
│╭─⌈ 💾 *MEMORY* ⌋
│ Process: ${procMemUsed}/${procMemTotal} MB
│ External: ${procMemExternal} MB
│ System: ${ramBar} ${sysUsedPercent}%
│ Used: ${sysUsedGB}GB / ${sysTotalGB}GB
│ Free: ${sysFreeGB}GB
│╰─────────────────
│
│╭─⌈ 🧠 *CPU* ⌋
│ Model: ${cpuModel}
│ Cores: ${cpuCores}
│ Load Avg: ${loadAvg}
│╰─────────────────
│
│╭─⌈ 📦 *BOT STATS* ⌋
│ Commands: ${cmdCount}
│ Categories: ${categories.size}
│╰─────────────────
╰⊷ *Powered By ${brandName}*`

    await sock.sendMessage(from, {
      text: text,
      edit: loadingMsg.key
    })

    await sock.sendMessage(from, { react: { text: '✅', key: loadingMsg.key } }).catch(() => {})

  } catch (e) {
    console.error('[SYSTEMINFO ERROR]', e.message)
    await sock.sendMessage(from, {
      text: '> ❌ Failed to get system info.'
    }, { quoted: msg })
  }
}