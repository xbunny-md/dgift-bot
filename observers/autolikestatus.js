// observers/autolikestatus.js
const emojis = [
  '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹','❣️','💕','💞','💓','💗','💖','💘','💝',
  '💯','🔥','💥','💢','💦','💨','💫','⭐','🌟','✨','⚡','☀️','🌙','🌈','🌊','🌸','🌺','🌻','🌹',
  '🍀','🍁','🍂','🍃','🌿','🌱','🌴','🌳','🌲','🎄','🎋','🎍','🎎','🎏','🎐','🎑','🎀','🎁','🎊','🎉',
  '🎈','🎂','🍰','🍫','🍬','🍭','🍮','🍯','🍎','🍏','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🍈','🍒','🍑',
  '🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶️','🌽','🥕','🧄','🧅','🥔','🍠','🥐','🥯','🍞',
  '🥖','🥨','🧀','🥚','🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🦴','🌭','🍔','🍟','🍕','🥪','🥙','🧆',
  '🌮','🌯','🫔','🥗','🥘','🫕','🥫','🍝','🍜','🍲','🍛','🍣','🍱','🥟','🦪','🍤','🍙','🍚','🍘','🍥',
  '🥠','🥮','🍢','🍡','🍧','🍨','🍦','🥧','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪','🌰','🥜',
  '🍯','🥛','🍼','☕','🫖','🍵','🧃','🥤','🍶','🍺','🍻','🥂','🍷','🥃','🍸','🍹','🧉','🍾','🧊','🥄',
  '🍴','🍽️','🥣','🥡','🥢','🧂','👍','👏','🙌','🙏','💪','👌','🤞','🤟','🤘','🤙','👋','🫶','✌️','🤝'
]

export default async function autolikestatus(sock, { msg, from, sender }, botSettings) {
  try {
    if (!botSettings?.supabase) return
    if (from !== 'status@broadcast') return // only status
    if (msg.key.fromMe) return // skip my own status

    // Get settings
    const { data: settings } = await botSettings.supabase
      .from('b_settings')
      .select('autolikestatus, botname, brand_name')
      .eq('id', 'DGIFT_DEFAULT')
      .maybeSingle()

    if (!settings?.autolikestatus) return

    const statusId = msg.key.id
    if (!statusId) return

    // Pick random emoji
    const emoji = emojis[Math.floor(Math.random() * emojis.length)]

    // Send reaction
    await sock.sendMessage(from, {
      react: { text: emoji, key: msg.key }
    })

    console.log(`[AUTOLIKESTATUS] Liked status from ${sender} with ${emoji}`)

  } catch (err) {
    console.log('[AUTOLIKESTATUS ERROR]', err.message)
  }
}