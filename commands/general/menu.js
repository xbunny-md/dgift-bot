// commands/general/menu.js

import os from 'os'
import { getAllCommands } from '../../handler/router.js'

export const name = 'menu'
export const alias = ['help', 'commands', 'cmds']
export const category = 'General'
export const desc = 'Display all bot commands'

export default async function menu(
  sock,
  { msg, from, pushName },
  botSettings
) {

  try {

    /*
    ━━━━━━━━━━━━━━━━━━━━━━━━━━
    REACT
    ━━━━━━━━━━━━━━━━━━━━━━━━━━
    */

    await sock.sendMessage(from, {
      react: {
        text: '📖',
        key: msg.key
      }
    })

    /*
    ━━━━━━━━━━━━━━━━━━━━━━━━━━
    BASIC INFO
    ━━━━━━━━━━━━━━━━━━━━━━━━━━
    */

    const botName =
      botSettings?.botname ||
      'BOT'

    const owner =
      botSettings?.owner_name ||
      'UNKNOWN'

    const prefix =
      botSettings?.prefix ||
      '.'

    const user =
      pushName || 'User'

    /*
    ━━━━━━━━━━━━━━━━━━━━━━━━━━
    PLATFORM
    ━━━━━━━━━━━━━━━━━━━━━━━━━━
    */

    const platform =
      process.env.RENDER_SERVICE_NAME
        ? 'Render Cloud'
        : os.platform()

    /*
    ━━━━━━━━━━━━━━━━━━━━━━━━━━
    UPTIME
    ━━━━━━━━━━━━━━━━━━━━━━━━━━
    */

    const totalSeconds =
      process.uptime()

    const hours =
      Math.floor(totalSeconds / 3600)

    const minutes =
      Math.floor(
        (totalSeconds % 3600) / 60
      )

    const seconds =
      Math.floor(
        totalSeconds % 60
      )

    const uptimeString =
      `${hours}h ${minutes}m ${seconds}s`

    /*
    ━━━━━━━━━━━━━━━━━━━━━━━━━━
    RAM
    ━━━━━━━━━━━━━━━━━━━━━━━━━━
    */

    const usedRAM =
      process.memoryUsage()
        .heapUsed

    const totalRAM =
      os.totalmem()

    const usedPercent =
      (
        (usedRAM / totalRAM) * 100
      ).toFixed(1)

    /*
    ━━━━━━━━━━━━━━━━━━━━━━━━━━
    RAM BAR
    ━━━━━━━━━━━━━━━━━━━━━━━━━━
    */

    const filled =
      Math.round(
        usedPercent / 10
      )

    const empty =
      10 - filled

    const ramBar =
      '█'.repeat(filled) +
      '░'.repeat(empty)

    /*
    ━━━━━━━━━━━━━━━━━━━━━━━━━━
    COMMANDS
    ━━━━━━━━━━━━━━━━━━━━━━━━━━
    */

    const commands =
      getAllCommands()

    const dynamicCommandCatalog = {}

    for (const cmd of commands.values()) {

      const category =
        cmd.category || 'General'

      if (
        !dynamicCommandCatalog[
          category
        ]
      ) {

        dynamicCommandCatalog[
          category
        ] = []

      }

      dynamicCommandCatalog[
        category
      ].push(cmd.name)

    }

    /*
    ━━━━━━━━━━━━━━━━━━━━━━━━━━
    BUILD MENU
    ━━━━━━━━━━━━━━━━━━━━━━━━━━
    */

    let menu =
`╭──⌈ ${botName} ⌋
│ User: ${user}
│ Owner: ${owner}
│ Prefix: [ ${prefix} ]
│ Platform: ${platform}
│ Uptime: ${uptimeString}
│ RAM: ${ramBar} ${usedPercent}%
╰────────────────\n\n`

    const cats =
      Object.keys(
        dynamicCommandCatalog
      ).sort()

    for (const cat of cats) {

      menu +=
`╭──⌈ ${cat} ⌋\n`

      dynamicCommandCatalog[
        cat
      ].forEach(cmd => {

        menu +=
`│ ${prefix}${cmd}\n`

      })

      menu +=
`╰────────────────\n\n`

    }

    menu +=
`*Powered By ${botName}*`

    /*
    ━━━━━━━━━━━━━━━━━━━━━━━━━━
    IMAGE
    ━━━━━━━━━━━━━━━━━━━━━━━━━━
    */

    const imageUrl =
      process.env.IMAGE_URL ||
      'https://i.ibb.co/1tM9QHF9/IMG-20260525-WA0076.jpg'

    /*
    ━━━━━━━━━━━━━━━━━━━━━━━━━━
    SEND MENU
    ━━━━━━━━━━━━━━━━━━━━━━━━━━
    */

    try {

      await sock.sendMessage(from, {
        image: {
          url: imageUrl
        },
        caption: menu
      }, { quoted: msg })

    } catch (imgErr) {

      console.log(
        '[MENU IMAGE ERROR]',
        imgErr.message
      )

      await sock.sendMessage(from, {
        text: menu
      }, { quoted: msg })

    }

    /*
    ━━━━━━━━━━━━━━━━━━━━━━━━━━
    SUCCESS REACT
    ━━━━━━━━━━━━━━━━━━━━━━━━━━
    */

    await sock.sendMessage(from, {
      react: {
        text: '✨',
        key: msg.key
      }
    })

  } catch (err) {

    console.error(
      '[MENU ERROR]',
      err.message
    )

    /*
    ━━━━━━━━━━━━━━━━━━━━━━━━━━
    ERROR REACT
    ━━━━━━━━━━━━━━━━━━━━━━━━━━
    */

    try {

      await sock.sendMessage(from, {
        react: {
          text: '❌',
          key: msg.key
        }
      })

    } catch {}

    /*
    ━━━━━━━━━━━━━━━━━━━━━━━━━━
    ERROR MESSAGE
    ━━━━━━━━━━━━━━━━━━━━━━━━━━
    */

    await sock.sendMessage(from, {
      text:
`[ERROR]
Failed to load menu system.`
    }, { quoted: msg })

  }

}