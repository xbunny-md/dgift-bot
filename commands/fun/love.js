// commands/fun/ship.js
export const name = 'ship'
export const alias = ['love', 'match']
export const category = 'Fun'
export const desc = 'Ship two people and check compatibility %'

function getLoveMessage(score) {
  if (score < 20) return 'No chance at all 💔'
  if (score < 40) return 'Not looking good 😅'
  if (score < 60) return 'Could work 😏'
  if (score < 80) return 'Pretty good 🔥'
  if (score < 95) return 'Perfect Match 💕'
  return 'Soulmates 💍✨'
}

export default async function ship(sock, { msg, from, args }, botSettings) {
  try {
    const brandName = botSettings?.brand_name || botSettings?.botname || 'System'

    let person1, person2

    // Get mentioned users or use args
    const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || []

    if (mentions.length >= 2) {
      person1 = `@${mentions[0].split('@')[0]}`
      person2 = `@${mentions[1].split('@')[0]}`
    } else if (args.length >= 2) {
      person1 = args[0]
      person2 = args[1]
    } else {
      return sock.sendMessage(from, {
        text: `> ❌ Usage: ${botSettings.prefix}ship @user1 @user2\n> Example: ${botSettings.prefix}ship John Mary`
      }, { quoted: msg })
    }

    const score = Math.floor(Math.random() * 101)
    const message = getLoveMessage(score)
    const filled = Math.floor(score / 10)
    const bar = '█'.repeat(filled) + '░'.repeat(10 - filled)

    await sock.sendMessage(from, {
      text: `╭─⌈ 💕 LOVE CALCULATOR ⌋
│ ${person1} ❤️ ${person2}
│ ${bar} ${score}%
│ ${message}
│
╰⊷ *Powered By ${brandName}*`,
      mentions: mentions
    }, { quoted: msg })

  } catch (error) {
    console.error('[SHIP ERROR]', error)
    await sock.sendMessage(from, {
      text: '> ❌ Ship calculation failed.'
    }, { quoted: msg }).catch(() => {})
  }
}