// commands/game/guess.js
export const name = 'guess'
export const alias = ['guessing', 'numbergame', 'gtn']
export const category = 'Game'
export const desc = 'Guess the number: 1-100. You get 7 tries.'

const activeGames = new Map()

async function getBrandName(botSettings) {
  if (!botSettings.supabase) return 'Bot'

  const { data } = await botSettings.supabase
.from('b_settings')
.select('brand_name, botname')
.eq('id', 'DGIFT_DEFAULT')
.maybeSingle()

  return data?.brand_name || data?.botname || 'Bot'
}

function renderGame(game, brandName) {
  const hints = game.history.map(h =>
    `${h.guess} → ${h.hint}`
  ).join('\n│ ')

  return `╭─⌈ 🎲 *Guess the Number* ⌋
│ Range: 1-100
│ Attempts: ${game.attempts}/${game.maxAttempts}
│ ${game.history.length > 0? 'History:\n│ ' + hints : 'No guesses yet'}
╰⊷ *Powered By ${brandName}*`
}

export default async function guess(sock, { msg, from, sender }, botSettings) {
  try {
    const brandName = await getBrandName(botSettings)
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const action = args[0]?.toLowerCase()

    // HELP
    if (!action) {
      await sock.sendMessage(from, { react: { text: '🎲', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 🎲 *Guess the Number* ⌋
│ I'm thinking of a number 1-100
│ You have 7 tries to guess it
│ I'll tell you if it's higher or lower
│
│ *Commands:*
│ ${botSettings.prefix}guess start - Start new game
│ ${botSettings.prefix}guess 42 - Make a guess
│ ${botSettings.prefix}guess stop - End game
╰⊷ *Powered By ${brandName}*`
      }, { quoted: msg })
    }

    // STOP GAME
    if (action === 'stop' || action === 'end') {
      const game = activeGames.get(from)
      if (!game) return await sock.sendMessage(from, { text: '> No active game.' }, { quoted: msg })

      activeGames.delete(from)
      await sock.sendMessage(from, { react: { text: '🛑', key: msg.key } })
      return await sock.sendMessage(from, { text: '> Game stopped.' }, { quoted: msg })
    }

    // START GAME
    if (action === 'start') {
      if (activeGames.has(from)) return await sock.sendMessage(from, { text: '> Game already running! Send a number 1-100.' }, { quoted: msg })

      const number = Math.floor(Math.random() * 100) + 1

      const gameData = {
        number: number,
        attempts: 0,
        maxAttempts: 7,
        history: [],
        msgKey: null
      }

      activeGames.set(from, gameData)
      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

      const sent = await sock.sendMessage(from, {
        text: renderGame(gameData, brandName) + `\n│ Send your first guess: ${botSettings.prefix}guess 50`
      }, { quoted: msg })

      gameData.msgKey = sent.key
      return
    }

    // MAKE GUESS
    const guess = parseInt(action)
    if (isNaN(guess) || guess < 1 || guess > 100) {
      return await sock.sendMessage(from, { text: '> Invalid. Send a number between 1-100 like `.guess 42`' }, { quoted: msg })
    }

    const game = activeGames.get(from)
    if (!game) return await sock.sendMessage(from, { text: '> No game running. Start with `.guess start`' }, { quoted: msg })

    game.attempts++

    let hint = ''
    if (guess === game.number) {
      hint = 'Correct!'
    } else if (guess < game.number) {
      hint = 'Higher'
    } else {
      hint = 'Lower'
    }

    game.history.push({ guess, hint })

    // Check win/lose
    if (guess === game.number) {
      activeGames.delete(from)
      const winText = `╭─⌈ 🎉 *YOU WON* ⌋
│ Number was: ${game.number}
│ Guessed in ${game.attempts} tries
│ ${game.attempts === 1? 'Lucky!' : game.attempts <= 3? 'Impressive!' : 'Nice job!'}
╰⊷ *Powered By ${brandName}*`

      if (game.msgKey) {
        await sock.sendMessage(from, { edit: game.msgKey, text: winText })
      }
      await sock.sendMessage(from, { react: { text: '🎉', key: msg.key } })
      return
    }

    if (game.attempts >= game.maxAttempts) {
      activeGames.delete(from)
      const loseText = `╭─⌈ 💀 *GAME OVER* ⌋
│ Number was: ${game.number}
│ You used all ${game.maxAttempts} tries
╰⊷ *Powered By ${brandName}*`

      if (game.msgKey) {
        await sock.sendMessage(from, { edit: game.msgKey, text: loseText })
      }
      await sock.sendMessage(from, { react: { text: '💀', key: msg.key } })
      return
    }

    // Continue game
    await sock.sendMessage(from, { react: { text: guess < game.number? '⬆️' : '⬇️', key: msg.key } })

    if (game.msgKey) {
      await sock.sendMessage(from, {
        edit: game.msgKey,
        text: renderGame(game, brandName) + `\n│ Last guess: ${guess} → ${hint}\n│ Try again!`
      })
    }

  } catch (err) {
    console.error('[GUESS ERROR]', err.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Game error.' }, { quoted: msg })
  }
}