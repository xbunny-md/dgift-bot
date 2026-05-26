import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

export const name = 'tictactoe'
export const alias = ['ttt', 'tic', 'xo']
export const category = 'Game'
export const desc = 'TicTacToe game: 3x3 board. Play vs bot or friend.'

const activeGames = new Map()

const winningCombos = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6] // diags
]

async function getBrandName() {
  const { data } = await supabase
   .from('b_settings')
   .select('brand_name, botname')
   .eq('id', 'DGIFT_DEFAULT')
   .maybeSingle()

  return data?.brand_name || data?.botname || 'Bot'
}

function renderBoard(board, brandName, showNumbers = false) {
  const symbols = board.map((cell, i) => {
    if (cell === 'X') return '❌'
    if (cell === 'O') return '⭕'
    return showNumbers? `${i + 1}️⃣` : '⬜'
  })

  return `╭─⌈ 🎯 *TicTacToe* ⌋
│ ${symbols[0]} ${symbols[1]} ${symbols[2]}
│ ${symbols[3]} ${symbols[4]} ${symbols[5]}
│ ${symbols[6]} ${symbols[7]} ${symbols[8]}
╰⊷ *Powered By ${brandName}*`
}

function checkWinner(board) {
  for (const combo of winningCombos) {
    const [a, b, c] = combo
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], combo }
    }
  }
  if (!board.includes(null)) return { winner: 'draw', combo: null }
  return { winner: null, combo: null }
}

function botMove(board) {
  // 1. Win if possible
  for (let i = 0; i < 9; i++) {
    if (board[i] === null) {
      board[i] = 'O'
      if (checkWinner(board).winner === 'O') {
        board[i] = null
        return i
      }
      board[i] = null
    }
  }

  // 2. Block player win
  for (let i = 0; i < 9; i++) {
    if (board[i] === null) {
      board[i] = 'X'
      if (checkWinner(board).winner === 'X') {
        board[i] = null
        return i
      }
      board[i] = null
    }
  }

  // 3. Take center
  if (board[4] === null) return 4

  // 4. Take corners
  const corners = [0, 2, 6, 8].filter(i => board[i] === null)
  if (corners.length > 0) return corners[Math.floor(Math.random() * corners.length)]

  // 5. Take any
  const available = board.map((cell, i) => cell === null? i : null).filter(i => i!== null)
  return available[Math.floor(Math.random() * available.length)]
}

export default async function tictactoe(sock, { msg, from, sender }, botSettings) {
  try {
    const brandName = await getBrandName()

    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const action = args[0]?.toLowerCase()

    // 1. HELP
    if (!action) {
      await sock.sendMessage(from, { react: { text: '🎯', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ ⭕ *TicTacToe* ⌋
│ Classic 3x3 game
│ Get 3 in a row to win
│
│ *Commands:*
│ ${botSettings.prefix}ttt start - Play vs Bot
│ ${botSettings.prefix}ttt start @user - Play vs Friend
│ ${botSettings.prefix}ttt move <1-9> - Make move
│ ${botSettings.prefix}ttt stop - End game
│ ${botSettings.prefix}ttt board - Show board
│
│ *Board positions:*
│ 1️⃣ 2️⃣ 3️⃣
│ 4️⃣ 5️⃣ 6️⃣
│ 7️⃣ 8️⃣ 9️⃣
╰⊷ *Powered By ${brandName}*`
      }, { quoted: msg })
    }

    // 2. SHOW BOARD
    if (action === 'board') {
      const game = activeGames.get(from)
      if (!game) return await sock.sendMessage(from, { text: '> No active game. Start with `.ttt start`' }, { quoted: msg })

      return await sock.sendMessage(from, {
        text: renderBoard(game.board, brandName, true) + `\n│ Turn: ${game.turn === 'X'? '❌' : '⭕'} @${game.currentPlayer.split('@')[0]}`,
        mentions: [game.currentPlayer]
      }, { quoted: msg })
    }

    // 3. STOP GAME
    if (action === 'stop' || action === 'end') {
      const game = activeGames.get(from)
      if (!game) return await sock.sendMessage(from, { text: '> No active game.' }, { quoted: msg })

      activeGames.delete(from)
      await sock.sendMessage(from, { react: { text: '🛑', key: msg.key } })
      return await sock.sendMessage(from, { text: `> Game stopped.` }, { quoted: msg })
    }

    // 4. START GAME
    if (action === 'start') {
      if (activeGames.has(from)) return await sock.sendMessage(from, { text: '> Game already running! Use `.ttt move <1-9>`' }, { quoted: msg })

      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
      const opponent = mentioned[0] || 'bot'
      const isBot = opponent === 'bot'

      const gameData = {
        board: Array(9).fill(null),
        turn: 'X',
        playerX: sender,
        playerO: opponent,
        currentPlayer: sender,
        vsBot: isBot,
        msgKey: null
      }

      activeGames.set(from, gameData)
      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

      const sent = await sock.sendMessage(from, {
        text: renderBoard(gameData.board, brandName, true) + `\n│ You: ❌ | ${isBot? 'Bot: ⭕' : `Opponent: ⭕ @${opponent.split('@')[0]}`}\n│ Turn: ❌ @${sender.split('@')[0]}\n│ Use: ${botSettings.prefix}ttt move <1-9>`,
        mentions: isBot? [sender] : [sender, opponent]
      }, { quoted: msg })

      gameData.msgKey = sent.key
      return
    }

    // 5. MAKE MOVE
    if (action === 'move' || action === 'm') {
      const pos = parseInt(args[1]) - 1
      if (isNaN(pos) || pos < 0 || pos > 8) {
        return await sock.sendMessage(from, { text: `> Invalid position. Use 1-9` }, { quoted: msg })
      }

      const game = activeGames.get(from)
      if (!game) return await sock.sendMessage(from, { text: '> No game running. Start with `.ttt start`' }, { quoted: msg })

      if (game.currentPlayer!== sender) {
        return await sock.sendMessage(from, { text: `> Not your turn! Wait for @${game.currentPlayer.split('@')[0]}`, mentions: [game.currentPlayer] }, { quoted: msg })
      }

      if (game.board[pos]!== null) {
        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
        return await sock.sendMessage(from, { text: `> Position ${pos + 1} already taken!` }, { quoted: msg })
      }

      // Player move
      game.board[pos] = game.turn
      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

      let { winner } = checkWinner(game.board)

      // Edit board - ANIMATION
      if (game.msgKey) {
        try {
          await sock.sendMessage(from, {
            edit: game.msgKey,
            text: renderBoard(game.board, brandName) + `\n│ Move: ${game.turn === 'X'? '❌' : '⭕'} → ${pos + 1}`
          })
        } catch (e) {}
      }

      if (winner) {
        activeGames.delete(from)
        const winText = winner === 'draw'?
          `╭─⌈ 🤝 *DRAW* ⌋\n${renderBoard(game.board, brandName)}\n│ No winner this time!\n╰⊷ *Powered By ${brandName}*` :
          `╭─⌈ 🎉 *WINNER* ⌋\n${renderBoard(game.board, brandName)}\n│ Winner: ${winner === 'X'? '❌' : '⭕'} @${sender.split('@')[0]}\n╰⊷ *Powered By ${brandName}*`

        await sock.sendMessage(from, { react: { text: winner === 'draw'? '🤝' : '🎉', key: msg.key } })
        return await sock.sendMessage(from, { text: winText, mentions: [sender] }, { quoted: msg })
      }

      // Switch turn
      game.turn = game.turn === 'X'? 'O' : 'X'
      game.currentPlayer = game.turn === 'X'? game.playerX : game.playerO

      // Bot move
      if (game.vsBot && game.turn === 'O') {
        await new Promise(r => setTimeout(r, 800)) // Drama

        const botPos = botMove(game.board)
        game.board[botPos] = 'O'

        winner = checkWinner(game.board).winner

        if (game.msgKey) {
          try {
            await sock.sendMessage(from, {
              edit: game.msgKey,
              text: renderBoard(game.board, brandName) + `\n│ Bot: ⭕ → ${botPos + 1}`
            })
          } catch (e) {}
        }

        if (winner) {
          activeGames.delete(from)
          const winText = winner === 'draw'?
            `╭─⌈ 🤝 *DRAW* ⌋\n${renderBoard(game.board, brandName)}\n│ Good game!\n╰⊷ *Powered By ${brandName}*` :
            `╭─⌈ 🤖 *BOT WINS* ⌋\n${renderBoard(game.board, brandName)}\n│ Better luck next time!\n╰⊷ *Powered By ${brandName}*`

          return await sock.sendMessage(from, { text: winText }, { quoted: msg })
        }

        game.turn = 'X'
        game.currentPlayer = game.playerX
      }

      return
    }

    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    return await sock.sendMessage(from, { text: `> Invalid. Use: start, move, board, stop` }, { quoted: msg })

  } catch (err) {
    console.error('[TTT ERROR]', err.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Game error.' }, { quoted: msg })
  }
}