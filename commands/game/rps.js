// commands/game/rps.js
export const name = 'rps'
export const alias = ['rockpaper', 'rpsgame', 'rpsvs']
export const category = 'Game'
export const desc = 'Rock Paper Scissors: best of 3 or 5 rounds.'

const activeGames = new Map()

const choices = {
  rock: '🪨',
  paper: '📄',
  scissors: '✂️'
}

async function getBrandName(botSettings) {
  if (!botSettings.supabase) return 'Bot'

  const { data } = await botSettings.supabase
.from('b_settings')
.select('brand_name, botname')
.eq('id', 'DGIFT_DEFAULT')
.maybeSingle()

  return data?.brand_name || data?.botname || 'Bot'
}

function getWinner(p1, p2) {
  if (p1 === p2) return 'draw'
  if (
    (p1 === 'rock' && p2 === 'scissors') ||
    (p1 === 'paper' && p2 === 'rock') ||
    (p1 === 'scissors' && p2 === 'paper')
  ) return 'p1'
  return 'p2'
}

function botChoice() {
  const keys = Object.keys(choices)
  return keys[Math.floor(Math.random() * 3)]
}

function renderScore(game, brandName) {
  const p1Name = game.vsBot? 'You' : `@${game.player1.split('@')[0]}`
  const p2Name = game.vsBot? 'Bot' : `@${game.player2.split('@')[0]}`

  return `╭─⌈ ✂️ *Rock Paper Scissors* ⌋
│ ${p1Name}: ${game.score.p1} | ${p2Name}: ${game.score.p2}
│ Round ${game.round}/${game.maxRounds}
│ Status: ${game.state}
╰⊷ *Powered By ${brandName}*`
}

export default async function rps(sock, { msg, from, sender }, botSettings) {
  try {
    const brandName = await getBrandName(botSettings)
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const action = args[0]?.toLowerCase()

    // HELP
    if (!action) {
      await sock.sendMessage(from, { react: { text: '✂️', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ ✂️ *Rock Paper Scissors* ⌋
│ Best of 3 or 5 rounds
│ Rock beats Scissors
│ Paper beats Rock
│ Scissors beats Paper
│
│ *Commands:*
│ ${botSettings.prefix}rps start - Play vs Bot
│ ${botSettings.prefix}rps start @user - Play vs Friend
│ ${botSettings.prefix}rps start @user 5 - Best of 5
│ ${botSettings.prefix}rps rock/paper/scissors - Make move
│ ${botSettings.prefix}rps stop - End game
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
      if (activeGames.has(from)) return await sock.sendMessage(from, { text: '> Game already running! Use rock, paper, or scissors.' }, { quoted: msg })

      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
      const opponent = mentioned[0] || 'bot'
      const isBot = opponent === 'bot'
      const rounds = parseInt(args[1]) === 5? 5 : 3

      const gameData = {
        player1: sender,
        player2: opponent,
        vsBot: isBot,
        maxRounds: rounds,
        round: 1,
        state: 'waiting',
        score: { p1: 0, p2: 0 },
        moves: {},
        msgKey: null
      }

      activeGames.set(from, gameData)
      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

      const sent = await sock.sendMessage(from, {
        text: renderScore(gameData, brandName) +
              `\n│ Send: rock, paper, or scissors\n│ ${isBot? 'Playing vs Bot' : `Playing vs @${opponent.split('@')[0]}`}`,
        mentions: isBot? [sender] : [sender, opponent]
      }, { quoted: msg })

      gameData.msgKey = sent.key
      return
    }

    // MAKE MOVE
    if (['rock', 'paper', 'scissors', 'r', 'p', 's'].includes(action)) {
      const game = activeGames.get(from)
      if (!game) return await sock.sendMessage(from, { text: '> No game running. Start with `.rps start`' }, { quoted: msg })

      const move = action === 'r'? 'rock' : action === 'p'? 'paper' : action === 's'? 'scissors' : action

      // Record move
      if (sender === game.player1) {
        if (game.moves.p1) return await sock.sendMessage(from, { text: '> You already chose. Wait for opponent.' }, { quoted: msg })
        game.moves.p1 = move
      } else if (sender === game.player2 &&!game.vsBot) {
        if (game.moves.p2) return await sock.sendMessage(from, { text: '> You already chose. Wait for opponent.' }, { quoted: msg })
        game.moves.p2 = move
      } else if (sender!== game.player1) {
        return await sock.sendMessage(from, { text: '> You are not in this game.' }, { quoted: msg })
      }

      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

      // Bot auto-move
      if (game.vsBot &&!game.moves.p2) {
        game.moves.p2 = botChoice()
        await new Promise(r => setTimeout(r, 600))
      }

      // Check if both moved
      if (!game.moves.p1 ||!game.moves.p2) {
        if (game.msgKey) {
          try {
            await sock.sendMessage(from, {
              edit: game.msgKey,
              text: renderScore(game, brandName) + `\n│ Waiting for other player...`
            })
          } catch (e) {}
        }
        return
      }

      // Resolve round
      const result = getWinner(game.moves.p1, game.moves.p2)

      if (result === 'p1') game.score.p1++
      else if (result === 'p2') game.score.p2++

      const resultText = result === 'draw'
       ? `It's a draw! Both chose ${choices[game.moves.p1]}`
        : result === 'p1'
       ? `${choices[game.moves.p1]} beats ${choices[game.moves.p2]}. ${game.vsBot? 'You' : '@' + game.player1.split('@')[0]} wins!`
        : `${choices[game.moves.p2]} beats ${choices[game.moves.p1]}. ${game.vsBot? 'Bot' : '@' + game.player2.split('@')[0]} wins!`

      // Check if game over
      const winScore = Math.ceil(game.maxRounds / 2)
      if (game.score.p1 >= winScore || game.score.p2 >= winScore || game.round >= game.maxRounds) {
        activeGames.delete(from)

        let winnerText = 'Game Over!'
        if (game.score.p1 > game.score.p2) winnerText = game.vsBot? 'You win!' : `@${game.player1.split('@')[0]} wins!`
        else if (game.score.p2 > game.score.p1) winnerText = game.vsBot? 'Bot wins!' : `@${game.player2.split('@')[0]} wins!`
        else winnerText = 'It\'s a tie!'

        const finalText = `╭─⌈ 🏆 *FINAL RESULT* ⌋
│ ${resultText}
│ ${winnerText}
│ Final Score: ${game.score.p1} - ${game.score.p2}
╰⊷ *Powered By ${brandName}*`

        if (game.msgKey) {
          await sock.sendMessage(from, { edit: game.msgKey, text: finalText, mentions: [game.player1, game.player2].filter(Boolean) })
        } else {
          await sock.sendMessage(from, { text: finalText, mentions: [game.player1, game.player2].filter(Boolean) })
        }

        await sock.sendMessage(from, { react: { text: '🏆', key: msg.key } })
        return
      }

      // Next round
      game.round++
      game.moves = {}
      game.state = 'waiting'

      if (game.msgKey) {
        await sock.sendMessage(from, {
          edit: game.msgKey,
          text: renderScore(game, brandName) + `\n│ ${resultText}\n│ Next round! Send rock, paper, or scissors.`,
          mentions: [game.player1, game.player2].filter(Boolean)
        })
      }
      return
    }

    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    return await sock.sendMessage(from, { text: '> Invalid. Use: start, rock, paper, scissors, stop' }, { quoted: msg })

  } catch (err) {
    console.error('[RPS ERROR]', err.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Game error.' }, { quoted: msg })
  }
}