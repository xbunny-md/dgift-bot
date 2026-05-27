// observers/autolikestatus.js
// BAILEYS 6.7.18 ULTRA AUTO LIKE STATUS
// FULL SELF-CONTAINED VERSION
// NO EXTERNAL CACHE FILE NEEDED
// RAM SAFE
// 💜 PRIORITY SYSTEM
// GREEN HEART REMOVED
// 15 FORCE METHODS
// AUTO CACHE CLEANER
// vvggtt LOG SYSTEM

const reactionCache = new Map()
const statusLogs = []

// =====================================
// 💜 PRIORITY EMOJIS
// =====================================

const priorityEmojis = [
  '💜','💜','💜','💜','💜',
  '💜','💜','💜','💜','💜',
  '🖤','🤍','💕','💞',
  '💓','💗','💖','💘',
  '💝','🔥','💯','✨',
  '🌟','⚡','🫶'
]

// =====================================
// MAIN EMOJIS
// =====================================

const emojis = [
  ...priorityEmojis,

  '❤️','🧡','💛',
  '💙','🖤','🤍','🤎',
  '💔','❤️‍🔥','❤️‍🩹',
  '❣️','💕','💞','💓',
  '💗','💖','💘','💝',
  '💯','🔥','💥','💢',
  '💦','💨','💫','⭐',
  '🌟','✨','⚡','☀️',
  '🌙','🌈','🌊','🌸',
  '🌺','🌻','🌹','🍀',
  '🍁','🍂','🍃','🌿',
  '🌱','🌴','🌳','🌲',
  '🎄','🎋','🎍','🎎',
  '🎏','🎐','🎑','🎀',
  '🎁','🎊','🎉','🎈',
  '🎂','🍰','🍫','🍬',
  '🍭','🍮','🍯','🍎',
  '🍏','🍐','🍊','🍋',
  '🍌','🍉','🍇','🍓',
  '🍈','🍒','🍑','🥭',
  '🍍','🥥','🥝','🍅',
  '🍆','🥑','🥦','🥬',
  '🥒','🌶️','🌽','🥕',
  '🧄','🧅','🥔','🍠',
  '🥐','🥯','🍞','🥖',
  '🥨','🧀','🥚','🍳',
  '🧈','🥞','🧇','🥓',
  '🥩','🍗','🍖','🌭',
  '🍔','🍟','🍕','🥪',
  '🥙','🧆','🌮','🌯',
  '🫔','🥗','🥘','🫕',
  '🥫','🍝','🍜','🍲',
  '🍛','🍣','🍱','🥟',
  '🦪','🍤','🍙','🍚',
  '🍘','🍥','🥠','🥮',
  '🍢','🍡','🍧','🍨',
  '🍦','🥧','🧁','🍿',
  '🍩','🍪','🌰','🥜',
  '🥛','🍼','☕','🫖',
  '🍵','🧃','🥤','🍶',
  '🍺','🍻','🥂','🍷',
  '🥃','🍸','🍹','🧉',
  '🍾','🧊','🥄','🍴',
  '🍽️','🥣','🥡','🥢',
  '🧂','👍','👏','🙌',
  '🙏','💪','👌','🤞',
  '🤟','🤘','🤙','👋',
  '🫶','✌️','🤝'
]

// =====================================
// REMOVE GREEN HEART COMPLETELY
// =====================================

const finalEmojis = emojis.filter(
  e => e !== '💚'
)

// =====================================
// CACHE CLEANER
// =====================================

setInterval(() => {

  const now = Date.now()

  // CLEAN REACTION CACHE
  for (const [key, value] of reactionCache.entries()) {

    if (now - value.timestamp > 5 * 60 * 1000) {
      reactionCache.delete(key)
    }

  }

  // CLEAN STATUS LOGS
  while (
    statusLogs.length &&
    now - statusLogs[0].timestamp > 5 * 60 * 1000
  ) {
    statusLogs.shift()
  }

  console.log(`
==============================
vvggtt CACHE AUTO CLEANED
==============================
REACTIONS : ${reactionCache.size}
LOGS      : ${statusLogs.length}
TIME      : ${new Date().toLocaleString()}
==============================
`)

}, 5 * 60 * 1000)

// =====================================
// UTILITIES
// =====================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function pickEmoji() {

  // 70% 💜 priority
  const chance = Math.random()

  if (chance <= 0.7) {
    return '💜'
  }

  return finalEmojis[
    Math.floor(Math.random() * finalEmojis.length)
  ] || '💜'
}

function formatTime() {

  return new Date().toLocaleString(
    'en-GB',
    {
      hour12: false
    }
  )
}

// =====================================
// MAIN FUNCTION
// =====================================

export default async function autolikestatus(
  sock,
  { msg, from, sender },
  botSettings
) {

  try {

    // =====================================
    // BASIC CHECKS
    // =====================================

    if (!msg) return
    if (!msg.key) return
    if (!msg.key.id) return

    // =====================================
    // STATUS CHECK
    // =====================================

    if (
      from !== 'status@broadcast'
    ) return

    // =====================================
    // DUPLICATE PROTECTION
    // =====================================

    const messageId = msg.key.id

    if (
      reactionCache.has(messageId)
    ) {
      return
    }

    // =====================================
    // DB SETTINGS
    // =====================================

    let enabled = false
    let instanceId = 'DGIFT_DEFAULT'

    try {

      instanceId =
        botSettings?.instance_id ||
        'DGIFT_DEFAULT'

      if (botSettings?.supabase) {

        const { data } =
          await botSettings.supabase
            .from('b_settings')
            .select('autolikestatus')
            .eq('id', instanceId)
            .maybeSingle()

        enabled =
          !!data?.autolikestatus

      }

    } catch (dbError) {

      console.log(
        '[AUTOLIKESTATUS DB ERROR]',
        dbError?.message
      )

      return
    }

    if (!enabled) return

    // =====================================
    // EMOJI
    // =====================================

    const emoji = pickEmoji()

    // =====================================
    // SAVE CACHE EARLY
    // =====================================

    reactionCache.set(
      messageId,
      {
        timestamp: Date.now(),
        sender
      }
    )

    // =====================================
    // AUTO READ STATUS
    // =====================================

    try {

      await sock.readMessages([
        msg.key
      ])

    } catch {}

    // =====================================
    // FORCE LIKE METHODS
    // =====================================

    let reacted = false

    const methods = [

      // METHOD 1
      async () => {
        await sock.sendMessage(
          from,
          {
            react: {
              text: emoji,
              key: msg.key
            }
          }
        )
      },

      // METHOD 2
      async () => {

        await sleep(300)

        await sock.sendMessage(
          'status@broadcast',
          {
            react: {
              text: emoji,
              key: msg.key
            }
          }
        )
      },

      // METHOD 3
      async () => {

        await sock.presenceSubscribe(
          sender
        )

        await sleep(500)

        await sock.sendMessage(
          from,
          {
            react: {
              text: emoji,
              key: msg.key
            }
          }
        )
      },

      // METHOD 4
      async () => {

        await sock.sendPresenceUpdate(
          'available',
          sender
        )

        await sleep(700)

        await sock.sendMessage(
          from,
          {
            react: {
              text: emoji,
              key: msg.key
            }
          }
        )
      },

      // METHOD 5
      async () => {

        await sleep(1000)

        await sock.sendMessage(
          from,
          {
            react: {
              key: msg.key,
              text: emoji
            }
          }
        )
      },

      // METHOD 6
      async () => {

        const cloned =
          JSON.parse(
            JSON.stringify(msg.key)
          )

        await sock.sendMessage(
          from,
          {
            react: {
              text: emoji,
              key: cloned
            }
          }
        )
      },

      // METHOD 7
      async () => {

        await sock.readMessages([
          msg.key
        ])

        await sleep(500)

        await sock.sendMessage(
          from,
          {
            react: {
              text: emoji,
              key: msg.key
            }
          }
        )
      },

      // METHOD 8
      async () => {

        await sock.sendPresenceUpdate(
          'composing',
          sender
        )

        await sleep(800)

        await sock.sendMessage(
          from,
          {
            react: {
              text: emoji,
              key: msg.key
            }
          }
        )
      },

      // METHOD 9
      async () => {

        await sleep(
          Math.floor(
            Math.random() * 2000
          )
        )

        await sock.sendMessage(
          from,
          {
            react: {
              text: emoji,
              key: msg.key
            }
          }
        )
      },

      // METHOD 10
      async () => {

        await sock.sendMessage(
          from,
          {
            react: {
              text: emoji,
              key: msg.key
            }
          },
          {
            statusJidList: [
              sender
            ]
          }
        )
      },

      // METHOD 11
      async () => {

        await sleep(1500)

        await sock.sendMessage(
          from,
          {
            react: {
              text: emoji,
              key: {
                ...msg.key
              }
            }
          }
        )
      },

      // METHOD 12
      async () => {

        await sock.sendPresenceUpdate(
          'paused',
          sender
        )

        await sleep(600)

        await sock.sendMessage(
          from,
          {
            react: {
              text: emoji,
              key: msg.key
            }
          }
        )
      },

      // METHOD 13
      async () => {

        await sleep(2000)

        await sock.sendMessage(
          from,
          {
            react: {
              text: emoji,
              key: msg.key
            }
          }
        )
      },

      // METHOD 14
      async () => {

        await sock.readMessages([
          {
            ...msg.key
          }
        ])

        await sleep(1000)

        await sock.sendMessage(
          from,
          {
            react: {
              text: emoji,
              key: msg.key
            }
          }
        )
      },

      // METHOD 15
      async () => {

        // TRY OWN STATUS SUPPORT
        await sock.sendMessage(
          from,
          {
            react: {
              text: emoji,
              key: msg.key
            }
          },
          {
            additionalAttributes: {
              retry: true
            }
          }
        )
      }

    ]

    // =====================================
    // EXECUTE METHODS
    // =====================================

    for (
      let i = 0;
      i < methods.length;
      i++
    ) {

      try {

        await methods[i]()

        reacted = true

        console.log(
          `[AUTOLIKESTATUS SUCCESS] METHOD ${
            i + 1
          }`
        )

        break

      } catch (err) {

        console.log(
          `[AUTOLIKESTATUS FAIL] METHOD ${
            i + 1
          } ->`,
          err?.message
        )

        await sleep(400)
      }
    }

    // =====================================
    // FINAL LOGS
    // =====================================

    if (reacted) {

      const logData = {
        sender:
          sender || 'unknown',
        emoji,
        time: formatTime(),
        timestamp: Date.now()
      }

      statusLogs.push(logData)

      console.log(`
==============================
vvggtt STATUS AUTO LIKE
==============================
NUMBER : ${logData.sender}
TIME   : ${logData.time}
EMOJI  : ${logData.emoji}
CACHE  : ${reactionCache.size}
STATUS : SUCCESS
==============================
`)

    }

  } catch (err) {

    console.log(
      '[AUTOLIKESTATUS FATAL ERROR]',
      err?.message || err
    )

  }
}