// commands/game/scramble.js
export const name = 'scramble'
export const alias = ['scr', 'unscramble']
export const category = 'Game'
export const desc = 'Word scramble game. Unscramble the word before time runs out.'

const activeGames = new Map()

const wordList = [
  'whatsapp', 'javascript', 'database', 'server', 'client', 'command',
  'message', 'group', 'admin', 'owner', 'premium', 'supabase',
  'render', 'cloud', 'session', 'instance', 'react', 'nodejs',
  'express', 'router', 'handler', 'function', 'promise', 'async'
]

async function getBrandName(botSettings) {
  if (!botSettings.supabase) return 'Bot'
  const instanceId = botSettings.instance_id || 'DGIFT_DEFAULT'
  const { data } = await botSettings.supabase
 .from('b_settings')
 .select('brand_name, botname')
 .eq('id', instanceId)
 .maybeSingle()
  return data?.brand_name || data?.botname || 'Bot'
}

function scrambleWord(word) {
  const arr = word.split('')
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr.join('')
}

export default async function scramble(sock, { msg, from, sender }, botSettings) {
  try {
    const brandName = await getBrandName(botSettings)
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const action = args[0]?.toLowerCase()

    // HELP
    if (!action) {
      return await sock.sendMessage(from, {
        text: `╭─⌈ WORD SCRAMBLE ⌋
│ Unscramble the word before time runs out
│ You have 30 seconds per word
│
│ *Commands:*
│ ${botSettings.prefix}scramble start - Start game
│ ${botSettings.prefix}scramble answer word - Submit answer
│ ${botSettings.prefix}scramble skip - Skip current word
│ ${botSettings.prefix}scramble stop - End game
│
│ *Scoring:*
│ Correct answer: +10 points
│ Wrong answer: -2 points
╰⊷ *Powered By ${brandName}*`
      }, { quoted: msg })
    }

    // STOP
    if (action === 'stop' || action === 'end') {
      if (!activeGames.has(from)) {
        return await sock.sendMessage(from, { text: '> No active game.' }, { quoted: msg })
      }
      clearTimeout(activeGames.get(from).timer)
      activeGames.delete(from)
      return await sock.sendMessage(from, { text: '> Game stopped.' }, { quoted: msg })
    }

    // START
    if (action === 'start') {
      if (activeGames.has(from)) {
        return await sock.sendMessage(from, { text: '> Game already running! Use.scramble answer <word>' }, { quoted: msg })
      }

      const word = wordList[Math.floor(Math.random() * wordList.length)]
      const scrambled = scrambleWord(word)

      const gameData = {
        word: word,
        scrambled: scrambled,
        score: 0,
        round: 1,
        player: sender,
        timer: null
      }

      activeGames.set(from, gameData)

      const startText = `╭─⌈ ROUND 1 ⌋
│ Scrambled word: ${scrambled.toUpperCase()}
│
│ You have 30 seconds!
│ Use: ${botSettings.prefix}scramble answer <word>
╰⊷ *Powered By ${brandName}*`

      await sock.sendMessage(from, { text: startText }, { quoted: msg })

      // Set 30s timer
      gameData.timer = setTimeout(async () => {
        if (activeGames.has(from)) {
          await sock.sendMessage(from, {
            text: `╭─⌈ TIME UP ⌋
│ Word was: ${word.toUpperCase()}
│ Score: ${gameData.score}
╰⊷ *Powered By ${brandName}*`
          })
          activeGames.delete(from)
        }
      }, 30000)

      return
    }

    // ANSWER
    if (action === 'answer' && args[1]) {
      const game = activeGames.get(from)
      if (!game) {
        return await sock.sendMessage(from, { text: '> No game running. Start with `.scramble start`' }, { quoted: msg })
      }

      if (sender!== game.player) {
        return await sock.sendMessage(from, { text: '> This is not your game.' }, { quoted: msg })
      }

      const answer = args[1].toLowerCase()
      clearTimeout(game.timer)

      if (answer === game.word) {
        game.score += 10
        game.round++

        const nextWord = wordList[Math.floor(Math.random() * wordList.length)]
        const nextScrambled = scrambleWord(nextWord)

        game.word = nextWord
        game.scrambled = nextScrambled

        const nextText = `╭─⌈ CORRECT! +10 POINTS ⌋
│ Score: ${game.score}
│
│ ROUND ${game.round}
│ Scrambled word: ${nextScrambled.toUpperCase()}
│
│ You have 30 seconds!
╰⊷ *Powered By ${brandName}*`

        await sock.sendMessage(from, { text: nextText }, { quoted: msg })

        // Reset timer for next round
        game.timer = setTimeout(async () => {
          if (activeGames.has(from)) {
            await sock.sendMessage(from, {
              text: `╭─⌈ TIME UP ⌋
│ Word was: ${game.word.toUpperCase()}
│ Final Score: ${game.score}
╰⊷ *Powered By ${brandName}*`
            })
            activeGames.delete(from)
          }
        }, 30000)

        return
      } else {
        game.score = Math.max(0, game.score - 2)
        await sock.sendMessage(from, {
          text: `╭─⌈ WRONG ANSWER -2 POINTS ⌋
│ Score: ${game.score}
│ Try again! Word: ${game.scrambled.toUpperCase()}
╰⊷ *Powered By ${brandName}*`
        }, { quoted: msg })

        // Reset timer
        game.timer = setTimeout(async () => {
          if (activeGames.has(from)) {
            await sock.sendMessage(from, {
              text: `╭─⌈ TIME UP ⌋
│ Word was: ${game.word.toUpperCase()}
│ Final Score: ${game.score}
╰⊷ *Powered By ${brandName}*`
            })
            activeGames.delete(from)
          }
        }, 30000)

        return
      }
    }

    // SKIP
    if (action === 'skip') {
      const game = activeGames.get(from)
      if (!game) {
        return await sock.sendMessage(from, { text: '> No game running.' }, { quoted: msg })
      }

      clearTimeout(game.timer)
      const oldWord = game.word
      game.score = Math.max(0, game.score - 1)

      const newWord = wordList[Math.floor(Math.random() * wordList.length)]
      game.word = newWord
      game.scrambled = scrambleWord(newWord)
      game.round++

      const skipText = `╭─⌈ SKIPPED -1 POINT ⌋
│ Word was: ${oldWord.toUpperCase()}
│ Score: ${game.score}
│
│ ROUND ${game.round}
│ Scrambled word: ${game.scrambled.toUpperCase()}
╰⊷ *Powered By ${brandName}*`

      await sock.sendMessage(from, { text: skipText }, { quoted: msg })

      game.timer = setTimeout(async () => {
        if (activeGames.has(from)) {
          await sock.sendMessage(from, {
            text: `╭─⌈ TIME UP ⌋
│ Word was: ${game.word.toUpperCase()}
│ Final Score: ${game.score}
╰⊷ *Powered By ${brandName}*`
          })
          activeGames.delete(from)
        }
      }, 30000)

      return
    }

    return await sock.sendMessage(from, {
      text: `> Invalid input. Use: start, answer <word>, skip, stop`
    }, { quoted: msg })

  } catch (err) {
    console.error('[SCRAMBLE ERROR]', err.message)
    await sock.sendMessage(from, { text: '> Game error occurred.' }, { quoted: msg })
  }
}