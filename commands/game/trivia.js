// commands/game/trivia.js
export const name = 'trivia'
export const alias = ['quiz', 'triv']
export const category = 'Game'
export const desc = 'Trivia quiz game. 5 questions, 4 choices each. Play vs bot or friend.'

const activeGames = new Map()

const questions = [
  {
    q: "What does 'HTTP' stand for?",
    a: ["HyperText Transfer Protocol", "High Tech Transfer Process", "HyperText Transmission Protocol", "Hyperlink Text Protocol"],
    c: 0
  },
  {
    q: "Which language runs in a web browser?",
    a: ["Java", "C", "Python", "JavaScript"],
    c: 3
  },
  {
    q: "What year was WhatsApp founded?",
    a: ["2007", "2009", "2011", "2013"],
    c: 1
  },
  {
    q: "Which is not a programming language?",
    a: ["Python", "HTML", "C++", "Java"],
    c: 1
  },
  {
    q: "What does 'API' stand for?",
    a: ["Application Programming Interface", "Advanced Process Integration", "Automated Program Interaction", "Application Process Input"],
    c: 0
  },
  {
    q: "Which database is NoSQL?",
    a: ["MySQL", "PostgreSQL", "MongoDB", "Oracle"],
    c: 2
  },
  {
    q: "What does 'CPU' stand for?",
    a: ["Central Process Unit", "Central Processing Unit", "Computer Processing Unit", "Central Processor Unit"],
    c: 1
  },
  {
    q: "Which company owns WhatsApp?",
    a: ["Google", "Apple", "Meta", "Microsoft"],
    c: 2
  },
  {
    q: "What is 2^5?",
    a: ["16", "32", "64", "25"],
    c: 1
  },
  {
    q: "Which is a version control system?",
    a: ["Git", "Docker", "Kubernetes", "Nginx"],
    c: 0
  }
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

function shuffle(array) {
  return array.sort(() => Math.random() - 0.5)
}

export default async function trivia(sock, { msg, from, sender }, botSettings) {
  try {
    const brandName = await getBrandName(botSettings)
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const action = args[0]?.toLowerCase()

    // HELP
    if (!action) {
      return await sock.sendMessage(from, {
        text: `╭─⌈ TRIVIA QUIZ ⌋
│ 5 questions, 4 choices each
│ 10 points per correct answer
│
│ *Commands:*
│ ${botSettings.prefix}trivia start - Play vs Bot
│ ${botSettings.prefix}trivia start @user - Play vs Friend
│ ${botSettings.prefix}trivia A/B/C/D - Answer
│ ${botSettings.prefix}trivia stop - End game
│
│ *Scoring:*
│ Correct: +10 points
│ Wrong: 0 points
╰⊷ *Powered By ${brandName}*`
      }, { quoted: msg })
    }

    // STOP
    if (action === 'stop' || action === 'end') {
      if (!activeGames.has(from)) {
        return await sock.sendMessage(from, { text: '> No active game.' }, { quoted: msg })
      }
      activeGames.delete(from)
      return await sock.sendMessage(from, { text: '> Game stopped.' }, { quoted: msg })
    }

    // START
    if (action === 'start') {
      if (activeGames.has(from)) {
        return await sock.sendMessage(from, { text: '> Game already running! Answer with A, B, C, or D' }, { quoted: msg })
      }

      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
      const opponent = mentioned[0] || 'bot'
      const isBot = opponent === 'bot'

      const shuffledQuestions = shuffle(questions).slice(0, 5)

      const gameData = {
        questions: shuffledQuestions,
        currentQ: 0,
        player1: sender,
        player2: opponent,
        vsBot: isBot,
        score: { p1: 0, p2: 0 },
        currentPlayer: sender,
        waitingForAnswer: true
      }

      activeGames.set(from, gameData)

      const q = shuffledQuestions[0]
      const opts = q.a.map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt}`).join('\n')

      const startText = `╭─⌈ QUESTION 1/5 ⌋
│ ${q.q}
│
${opts}
│
│ Answer with A, B, C, or D
│ Turn: @${sender.split('@')[0]}
╰⊷ *Powered By ${brandName}*`

      return await sock.sendMessage(from, {
        text: startText,
        mentions: [sender]
      }, { quoted: msg })
    }

    // ANSWER
    if (['a', 'b', 'c', 'd'].includes(action)) {
      const game = activeGames.get(from)
      if (!game) {
        return await sock.sendMessage(from, { text: '> No game running. Start with `.trivia start`' }, { quoted: msg })
      }

      if (game.currentPlayer!== sender) {
        return await sock.sendMessage(from, {
          text: `> Not your turn! Wait for @${game.currentPlayer.split('@')[0]}`,
          mentions: [game.currentPlayer]
        }, { quoted: msg })
      }

      const choiceIndex = action.charCodeAt(0) - 97
      const currentQ = game.questions[game.currentQ]
      const isCorrect = choiceIndex === currentQ.c

      if (isCorrect) {
        if (sender === game.player1) game.score.p1 += 10
        else game.score.p2 += 10
      }

      const resultText = `╭─⌈ RESULT ⌋
│ Your answer: ${action.toUpperCase()}
│ Correct answer: ${String.fromCharCode(65 + currentQ.c)}
│ ${isCorrect? 'Correct! +10 points' : 'Wrong! 0 points'}
│
│ Score: @${game.player1.split('@')[0]} ${game.score.p1} - ${game.score.p2} @${game.player2.split('@')[0]}
╰⊷ *Powered By ${brandName}*`

      await sock.sendMessage(from, {
        text: resultText,
        mentions: [game.player1, game.player2]
      }, { quoted: msg })

      game.currentQ++

      // Game over
      if (game.currentQ >= 5) {
        let finalText = `╭─⌈ QUIZ COMPLETE ⌋
│ Final Score:
│ @${game.player1.split('@')[0]}: ${game.score.p1} points
│ @${game.player2.split('@')[0]}: ${game.score.p2} points
│
`

        if (game.score.p1 === game.score.p2) {
          finalText += `│ It's a tie!`
        } else if (game.score.p1 > game.score.p2) {
          finalText += `│ Winner: @${game.player1.split('@')[0]}!`
        } else {
          finalText += `│ Winner: @${game.player2.split('@')[0]}!`
        }

        finalText += `\n╰⊷ *Powered By ${brandName}*`
        activeGames.delete(from)
        return await sock.sendMessage(from, {
          text: finalText,
          mentions: [game.player1, game.player2]
        }, { quoted: msg })
      }

      // Next question
      const nextQ = game.questions[game.currentQ]
      const nextOpts = nextQ.a.map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt}`).join('\n')

      // Switch turn if vs friend
      if (!game.vsBot) {
        game.currentPlayer = game.currentPlayer === game.player1? game.player2 : game.player1
      }

      setTimeout(async () => {
        const nextText = `╭─⌈ QUESTION ${game.currentQ + 1}/5 ⌋
│ ${nextQ.q}
│
${nextOpts}
│
│ Answer with A, B, C, or D
│ Turn: @${game.currentPlayer.split('@')[0]}
╰⊷ *Powered By ${brandName}*`

        await sock.sendMessage(from, {
          text: nextText,
          mentions: [game.currentPlayer]
        })

        // Bot auto answer
        if (game.vsBot && game.currentPlayer === game.player2) {
          await new Promise(r => setTimeout(r, 2000))
          const botChoice = Math.random() > 0.3? currentQ.c : Math.floor(Math.random() * 4)
          const botAnswer = String.fromCharCode(97 + botChoice)

          msg.message.extendedTextMessage = { text: `${botSettings.prefix}trivia ${botAnswer}` }
          return await trivia(sock, { msg, from, sender: game.player2 }, botSettings)
        }
      }, 2000)

      return
    }

    return await sock.sendMessage(from, {
      text: `> Invalid input. Use: start, A/B/C/D, stop`
    }, { quoted: msg })

  } catch (err) {
    console.error('[TRIVIA ERROR]', err.message)
    await sock.sendMessage(from, { text: '> Game error occurred.' }, { quoted: msg })
  }
}