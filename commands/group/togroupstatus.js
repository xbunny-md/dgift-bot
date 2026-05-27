// commands/group/togroupstatus.js

export const name = 'togroupstatus'

export const alias = [
  'togs',
  'groupstatus',
  'gstatus',
  'statusgroup',
  'poststatus'
]

export const category = 'Group'

export const desc =
  'Send text, image, video, audio, sticker or view once directly to Group Status with native WhatsApp buttons.'

// ======================================================
// SETTINGS
// ======================================================

async function getSettings(botSettings) {

  const defaults = {
    brandName: 'Bot',
    prefix: '.'
  }

  try {

    if (!botSettings?.supabase) {
      return defaults
    }

    const instanceId =
      botSettings.instance_id ||
      'DGIFT_DEFAULT'

    const { data } =
      await botSettings.supabase
        .from('b_settings')
        .select(`
          brand_name,
          botname,
          prefix
        `)
        .eq('id', instanceId)
        .maybeSingle()

    return {
      brandName:
        data?.brand_name ||
        data?.botname ||
        'Bot',

      prefix:
        data?.prefix || '.'
    }

  } catch {

    return defaults
  }
}

// ======================================================
// UTILITIES
// ======================================================

function sleep(ms) {

  return new Promise(resolve =>
    setTimeout(resolve, ms)
  )
}

function randomDelay() {

  return Math.floor(
    Math.random() * 1200
  ) + 300
}

function logSuccess(type) {

  console.log(`
===================================
GROUP STATUS SENT SUCCESSFULLY
===================================
TYPE : ${type}
TIME : ${new Date().toLocaleString()}
===================================
`)
}

// ======================================================
// WHATSAPP NATIVE BUTTONS
// ======================================================

async function sendMenuButtons(
  sock,
  from,
  msg,
  prefix,
  brandName
) {

  try {

    // ======================================================
    // REAL WHATSAPP BUTTONS
    // ======================================================

    await sock.sendMessage(
      from,
      {
        text: `
╭─⌈ ${brandName.toUpperCase()} ⌋
│ Group Status Uploaded Successfully
│
│ Use buttons below
│ to open bot menus instantly.
╰⊷ Native WhatsApp Buttons
`,

        footer: `Powered By ${brandName}`,

        buttons: [

          {
            buttonId: `${prefix}menu`,
            buttonText: {
              displayText: '📜 MENU'
            },
            type: 1
          },

          {
            buttonId: `${prefix}allmenu`,
            buttonText: {
              displayText: '⚡ ALL MENU'
            },
            type: 1
          },

          {
            buttonId: `${prefix}groupmenu`,
            buttonText: {
              displayText: '👥 GROUP MENU'
            },
            type: 1
          }

        ],

        headerType: 1,
        viewOnce: true

      },
      {
        quoted: msg
      }
    )

    // ======================================================
    // ADVANCED NATIVE FLOW BUTTONS
    // ======================================================

    await sock.sendMessage(
      from,
      {
        text: `
╭─⌈ ${brandName.toUpperCase()} PANEL ⌋
│ Advanced Interactive Menu
╰⊷ Click Any Button Below
`,

        footer: `Powered By ${brandName}`,

        interactiveButtons: [

          {
            name: 'quick_reply',

            buttonParamsJson:
              JSON.stringify({
                display_text:
                  '📜 MAIN MENU',

                id:
                  `${prefix}menu`
              })
          },

          {
            name: 'quick_reply',

            buttonParamsJson:
              JSON.stringify({
                display_text:
                  '⚡ COMMANDS',

                id:
                  `${prefix}allmenu`
              })
          },

          {
            name: 'quick_reply',

            buttonParamsJson:
              JSON.stringify({
                display_text:
                  '👥 GROUP MENU',

                id:
                  `${prefix}groupmenu`
              })
          },

          {
            name: 'quick_reply',

            buttonParamsJson:
              JSON.stringify({
                display_text:
                  '🎵 MUSIC MENU',

                id:
                  `${prefix}musicmenu`
              })
          },

          {
            name: 'quick_reply',

            buttonParamsJson:
              JSON.stringify({
                display_text:
                  '🤖 AI MENU',

                id:
                  `${prefix}aimenu`
              })
          }

        ]

      },
      {
        quoted: msg
      }
    )

    // ======================================================
    // TEMPLATE STYLE BUTTONS
    // ======================================================

    await sock.sendMessage(
      from,
      {
        text: `
╭─⌈ ${brandName.toUpperCase()} STATUS ⌋
│ Upload Completed Successfully
╰⊷ Fast Access Menu
`,

        footer:
          `Powered By ${brandName}`,

        templateButtons: [

          {
            index: 1,

            quickReplyButton: {
              displayText:
                '📜 MENU',

              id:
                `${prefix}menu`
            }
          },

          {
            index: 2,

            quickReplyButton: {
              displayText:
                '⚡ ALL MENU',

              id:
                `${prefix}allmenu`
            }
          },

          {
            index: 3,

            quickReplyButton: {
              displayText:
                '👥 GROUP MENU',

              id:
                `${prefix}groupmenu`
            }
          }

        ]

      },
      {
        quoted: msg
      }
    )

  } catch (err) {

    console.log(
      '[BUTTON ERROR]',
      err?.message
    )
  }
}

// ======================================================
// MAIN
// ======================================================

export default async function togroupstatus(
  sock,
  {
    msg,
    from,
    sender,
    isGroup,
    quoted,
    body
  },
  botSettings
) {

  try {

    // ======================================================
    // GROUP ONLY
    // ======================================================

    if (!isGroup) {

      return await sock.sendMessage(
        from,
        {
          text:
            '> This command only works in groups.'
        },
        {
          quoted: msg
        }
      )
    }

    // ======================================================
    // SETTINGS
    // ======================================================

    const settings =
      await getSettings(
        botSettings
      )

    const brandName =
      settings.brandName

    const prefix =
      settings.prefix

    // ======================================================
    // REQUIRE CONTENT
    // ======================================================

    const hasText =
      body?.trim()
        ?.split(' ')
        ?.slice(1)
        ?.join(' ')

    const hasQuoted =
      !!quoted

    if (
      !hasText &&
      !hasQuoted
    ) {

      return await sock.sendMessage(
        from,
        {
          text: `
╭─⌈ GROUP STATUS ⌋
│ Usage Examples:
│
│ ${prefix}togroupstatus Hello
│ Reply image + ${prefix}togroupstatus
│ Reply video + ${prefix}togroupstatus
│ Reply audio + ${prefix}togroupstatus
│ Reply sticker + ${prefix}togroupstatus
│ Reply view once + ${prefix}togroupstatus
│
│ Supports:
│ ✓ Text
│ ✓ Image
│ ✓ Video
│ ✓ Audio
│ ✓ Sticker
│ ✓ GIF
│ ✓ ViewOnce V1/V2
│ ✓ Document
│ ✓ Voice
│ ✓ Poll
│ ✓ Reaction
│ ✓ Contact
│ ✓ Location
│ ✓ Song
│
│ Native WhatsApp
│ Interactive Buttons Enabled.
╰⊷ Powered By ${brandName}
`
        },
        {
          quoted: msg
        }
      )
    }

    // ======================================================
    // STATUS JID
    // ======================================================

    const GROUP_STATUS_JID =
      'status@broadcast'

    // ======================================================
    // TEXT STATUS
    // ======================================================

    if (
      hasText &&
      !quoted
    ) {

      const text =
        body
          .split(' ')
          .slice(1)
          .join(' ')

      const methods = [

        async () => {

          await sock.sendMessage(
            GROUP_STATUS_JID,
            {
              text
            }
          )
        },

        async () => {

          await sleep(
            randomDelay()
          )

          await sock.sendMessage(
            GROUP_STATUS_JID,
            {
              text,
              mentions: [sender]
            }
          )
        },

        async () => {

          await sock.sendPresenceUpdate(
            'composing',
            from
          )

          await sleep(700)

          await sock.sendMessage(
            GROUP_STATUS_JID,
            {
              text
            }
          )
        }

      ]

      let sent = false

      for (
        const method
        of methods
      ) {

        try {

          await method()

          sent = true
          break

        } catch {}
      }

      if (!sent) {

        throw new Error(
          'Failed to send text status.'
        )
      }

      logSuccess('TEXT')

      // ======================================================
      // SUCCESS MESSAGE
      // ======================================================

      await sock.sendMessage(
        from,
        {
          text: `
╭─⌈ GROUP STATUS SENT ⌋
│ Type: TEXT
│ Upload Successful
│
│ Native Buttons Added Below.
╰⊷ Powered By ${brandName}
`
        },
        {
          quoted: msg
        }
      )

      // ======================================================
      // SEND BUTTONS
      // ======================================================

      await sendMenuButtons(
        sock,
        from,
        msg,
        prefix,
        brandName
      )

      return
    }

    // ======================================================
    // QUOTED MESSAGE
    // ======================================================

    if (quoted) {

      const q =
        quoted.message || {}

      const type =
        Object.keys(q)[0]

      // ======================================================
      // 15 METHODS
      // ======================================================

      const methods = [

        async () => {

          await sock.sendMessage(
            GROUP_STATUS_JID,
            quoted,
            {
              statusJidList: [from]
            }
          )
        },

        async () => {

          await sleep(
            randomDelay()
          )

          await sock.sendMessage(
            GROUP_STATUS_JID,
            {
              forward: quoted
            }
          )
        },

        async () => {

          await sock.sendPresenceUpdate(
            'composing',
            from
          )

          await sleep(800)

          await sock.sendMessage(
            GROUP_STATUS_JID,
            quoted
          )
        },

        async () => {

          await sock.sendPresenceUpdate(
            'available',
            from
          )

          await sleep(500)

          await sock.copyNForward(
            GROUP_STATUS_JID,
            quoted,
            true
          )
        },

        async () => {

          await sock.readMessages([
            quoted.key
          ])

          await sleep(400)

          await sock.copyNForward(
            GROUP_STATUS_JID,
            quoted,
            true
          )
        },

        async () => {

          await sleep(1200)

          await sock.sendMessage(
            GROUP_STATUS_JID,
            quoted
          )
        },

        async () => {

          const cloned =
            JSON.parse(
              JSON.stringify(
                quoted
              )
            )

          await sock.sendMessage(
            GROUP_STATUS_JID,
            cloned
          )
        },

        async () => {

          await sock.sendMessage(
            GROUP_STATUS_JID,
            {
              forward: quoted
            },
            {
              statusJidList: [from]
            }
          )
        },

        async () => {

          await sleep(1500)

          await sock.copyNForward(
            GROUP_STATUS_JID,
            quoted,
            false
          )
        },

        async () => {

          await sock.sendPresenceUpdate(
            'paused',
            from
          )

          await sleep(700)

          await sock.sendMessage(
            GROUP_STATUS_JID,
            quoted
          )
        },

        async () => {

          await sleep(
            Math.floor(
              Math.random() * 2500
            )
          )

          await sock.sendMessage(
            GROUP_STATUS_JID,
            quoted
          )
        },

        async () => {

          await sock.copyNForward(
            GROUP_STATUS_JID,
            quoted,
            true,
            {
              readViewOnce: true
            }
          )
        },

        async () => {

          await sleep(1800)

          await sock.sendMessage(
            GROUP_STATUS_JID,
            quoted,
            {
              additionalAttributes: {
                retry: true
              }
            }
          )
        },

        async () => {

          await sock.sendPresenceUpdate(
            'recording',
            from
          )

          await sleep(1000)

          await sock.copyNForward(
            GROUP_STATUS_JID,
            quoted,
            true
          )
        },

        async () => {

          await sock.sendMessage(
            GROUP_STATUS_JID,
            quoted,
            {
              force: true,
              ephemeralExpiration: 0
            }
          )
        }

      ]

      let success = false

      for (
        let i = 0;
        i < methods.length;
        i++
      ) {

        try {

          await methods[i]()

          success = true

          console.log(
            `[GROUP STATUS SUCCESS] METHOD ${
              i + 1
            }`
          )

          break

        } catch (err) {

          console.log(
            `[GROUP STATUS FAIL] METHOD ${
              i + 1
            } ->`,
            err?.message
          )

          await sleep(300)
        }
      }

      if (!success) {

        throw new Error(
          'All 15 methods failed.'
        )
      }

      logSuccess(type)

      // ======================================================
      // SUCCESS MESSAGE
      // ======================================================

      await sock.sendMessage(
        from,
        {
          text: `
╭─⌈ GROUP STATUS SENT ⌋
│ Type: ${type}
│ Successfully Uploaded
│
│ ✓ Text
│ ✓ Image
│ ✓ Video
│ ✓ Audio
│ ✓ Sticker
│ ✓ GIF
│ ✓ Voice
│ ✓ ViewOnce 1
│ ✓ ViewOnce 2
│ ✓ Poll
│ ✓ Document
│ ✓ Contact
│ ✓ Location
│ ✓ Song
│
│ Interactive Buttons Added.
╰⊷ Powered By ${brandName}
`
        },
        {
          quoted: msg
        }
      )

      // ======================================================
      // SEND BUTTONS
      // ======================================================

      await sendMenuButtons(
        sock,
        from,
        msg,
        prefix,
        brandName
      )

      return
    }

  } catch (err) {

    console.error(
      '[TOGROUPSTATUS ERROR]',
      err
    )

    await sock.sendMessage(
      from,
      {
        text: `
╭─⌈ GROUP STATUS FAILED ⌋
│ ${err.message}
╰⊷ Try again later.
`
      },
      {
        quoted: msg
      }
    )
  }
}