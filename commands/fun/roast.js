// commands/fun/roast.js
export const name = 'roast'
export const alias = ['insult', 'burn', 'roastme']
export const category = 'Fun'
export const desc = 'Generate a savage but friendly roast without repeating'

const roasts = [
  'Your WiFi is faster than your brain.',
  'I’d explain it to you, but I left my crayons at home.',
  'You’re like a software update. Nobody wants you but we’re stuck with you.',
  'If brains were dynamite, you wouldn’t have enough to blow your nose.',
  'You bring everyone so much joy... when you leave the room.',
  'I’m not insulting you. I’m describing you.',
  'You’re the reason the gene pool needs a lifeguard.',
  'Your secrets are safe with me. I never listen.',
  'You’re proof that evolution can go in reverse.',
  'I’d agree with you but then we’d both be wrong.',
  'You’re like a cloud. When you disappear, it’s a beautiful day.',
  'I’m not saying you’re dumb, but you’d get lost in a phone booth.',
  'You have the charm of a wet sock.',
  'If stupidity was a job, you’d be CEO.',
  'You’re the human equivalent of a participation trophy.',
  'I’d call you a tool, but that would be an insult to tools.',
  'You’re like a broken pencil. Pointless.',
  'Your face makes my screen glitch.',
  'You’re as useful as a screen door on a submarine.',
  'I’m jealous of people who haven’t met you.',
  'You’re like a typo in the middle of a serious document.',
  'If you were any slower, you’d be going backward.',
  'You’re the reason we have warning labels.',
  'I’d say you’re average, but that’s unfair to average people.',
  'You’re like a broken record. Annoying and outdated.',
  'Your personality is like expired milk.',
  'You’re the human version of a loading screen.',
  'I’d give you a nasty look, but you’ve got one already.',
  'You’re like a pop-up ad. Nobody asked for you.',
  'If you had a brain cell, it would be lonely.',
  'You’re the reason the gene pool needs chlorine.',
  'I’m not saying you’re ugly, but you make onions cry.',
  'You’re like a broken elevator. Can’t take you anywhere.',
  'Your brain is like a browser with 50 tabs open, and all of them are frozen.',
  'You’re as sharp as a marble.',
  'I’d roast you more, but I don’t want to burn my keyboard.',
  'You’re like a parking ticket. Nobody likes seeing you.',
  'You’re the reason shampoo has instructions.',
  'If you were a vegetable, you’d be a cabbage.',
  'You’re like a flat tire. Ruining everyone’s day.',
  'Your common sense is on vacation.',
  'You’re the human equivalent of a typo.',
  'I’d explain it, but I don’t have crayons or time.',
  'You’re like a broken clock. Wrong twice a day.',
  'Your brain called in sick today.',
  'You’re as useful as a chocolate teapot.',
  'I’d be impressed if you could tie your own shoes.',
  'You’re like a spam email. Annoying and unwanted.',
  'If ignorance is bliss, you must be ecstatic.',
  'You’re the reason doors have push/pull signs.',
  'Your face is a crime against humanity.',
  'You’re like a broken remote. Can’t change anything.',
  'I’d call you a genius, but that would be a lie.',
  'You’re the human version of autocorrect gone wrong.',
  'Your personality is like a soggy cereal.',
  'You’re as bright as a burnt-out lightbulb.',
  'I’d roast you harder, but I ran out of heat.',
  'You’re like a buffering video. Frustrating.',
  'If you were a car, you’d be a bicycle.',
  'You’re the reason we can’t have nice things.',
  'Your brain is on airplane mode.',
  'You’re like a broken stapler. Can’t hold anything together.',
  'I’d say you’re unique, but that’s not a compliment.',
  'You’re the human equivalent of a 404 error.',
  'Your ideas are like sandcastles. They fall apart fast.',
  'You’re as smooth as sandpaper.',
  'I’d be shocked if you had a good idea.',
  'You’re like a broken watch. Pointless.',
  'Your charm is contagious, but in a bad way.',
  'You’re the reason we have slow motion.',
  'If you were a fruit, you’d be a lemon.',
  'You’re like a broken compass. Always lost.',
  'Your brain is a desert with no oasis.',
  'You’re as interesting as watching paint dry.',
  'I’d call you a legend, but only in a bad way.',
  'You’re the human version of a glitch.',
  'Your jokes are like expired coupons. Useless.',
  'You’re like a broken ladder. Can’t climb up.',
  'If you were a song, you’d be on repeat and skipped.',
  'You’re the reason we have mute buttons.',
  'Your brain is like a flip phone. Outdated.',
  'You’re as graceful as a falling piano.',
  'I’d roast you, but your life is roast enough.',
  'You’re like a broken promise. Disappointing.',
  'Your personality is like decaf coffee. Pointless.',
  'You’re the human equivalent of a buffering icon.',
  'If you were a tool, you’d be a blunt knife.',
  'You’re like a broken fan. No air moving.',
  'Your brain is on 1% battery.',
  'You’re as useful as a chocolate fireguard.',
  'I’d say you’re smart, but that would be a lie.',
  'You’re like a broken microphone. No one hears you.',
  'Your charm is like a flat soda. Flat.',
  'You’re the reason we have CAPTCHA.',
  'If you were a color, you’d be beige.',
  'You’re like a broken keyboard. Missing keys.',
  'Your brain is like a black hole. Nothing escapes.',
  'You’re as sharp as a bowling ball.',
  'I’d roast you, but I don’t want to waste my time.',
  'You’re like a broken zipper. Can’t hold it together.',
  'Your ideas are like wet fireworks. No spark.',
  'You’re the human version of a loading bar stuck at 99%.',
  'If you were a shoe, you’d be a left foot.',
  'You’re like a broken compass. Always pointing wrong.',
  'Your brain is like a sieve. Nothing stays in.',
  'You’re as graceful as a hippo on roller skates.',
  'I’d call you a star, but you’re more like a black hole.',
  'You’re like a broken speaker. All static.',
  'Your personality is like plain toast. Dry.',
  'You’re the reason we have slow internet.',
  'If you were a plant, you’d be a weed.',
  'You’re like a broken calculator. Can’t count right.',
  'Your brain is on dial-up speed.',
  'You’re as useful as a screen door on a submarine.',
  'I’d roast you, but you’re already well done.',
  'You’re like a broken mirror. Distorted.',
  'Your charm is like a dead battery. Nothing happens.',
  'You’re the human equivalent of a pop-up blocker.',
  'If you were a game, you’d be unplayable.',
  'You’re like a broken pen. No ink.',
  'Your brain is like a scrambled egg. Messy.',
  'You’re as sharp as a marshmallow.',
  'I’d say you’re brilliant, but that’s not true.',
  'You’re like a broken GPS. Always lost.',
  'Your jokes are like spoiled milk. Sour.',
  'You’re the reason we have spam filters.',
  'If you were a drink, you’d be flat soda.',
  'You’re like a broken fan. No breeze.',
  'Your brain is like a frozen computer. Unresponsive.',
  'You’re as graceful as a falling rock.',
  'I’d roast you, but I’d feel bad for your ego.',
  'You’re like a broken lock. Can’t secure anything.',
  'Your personality is like lukewarm water. Meh.',
  'You’re the human version of a typo in a resume.',
  'If you were a car, you’d be out of gas.',
  'You’re like a broken light switch. No power.',
  'Your brain is like a tangled headphone. Messy.',
  'You’re as useful as a screen door on a rocket.',
  'I’d call you a genius, but that would be fake news.',
  'You’re like a broken record player. Skipping.',
  'Your charm is like a dead phone. No connection.',
  'You’re the reason we have error 404.',
  'If you were a tool, you’d be a broken hammer.',
  'You’re like a broken thermostat. Always wrong temp.',
  'Your brain is like a slow turtle. Crawling.',
  'You’re as sharp as a pillow.',
  'I’d roast you, but you’re already burnt.',
  'You’re like a broken doorbell. No sound.',
  'Your ideas are like deflated balloons. No lift.',
  'You’re the human equivalent of a buffering circle.',
  'If you were a fruit, you’d be a rotten apple.',
  'You’re like a broken compass. Never on point.',
  'Your brain is like a foggy window. Blurry.',
  'You’re as graceful as a dancing elephant.',
  'I’d call you a legend, but you’re more like a myth.',
  'You’re like a broken charger. No charge.',
  'Your personality is like instant noodles. Basic.',
  'You’re the reason we have slow uploads.',
  'If you were a color, you’d be gray.',
  'You’re like a broken remote. No control.',
  'Your brain is like a cluttered desk. Chaotic.',
  'You’re as useful as a chocolate teapot.',
  'I’d roast you, but you’re already crispy.'
]

export default async function roast(sock, { msg, from, args }, botSettings) {
  try {
    const brandName = botSettings?.brand_name || botSettings?.botname || 'System'
    const sender = msg.key.participant || msg.key.remoteJid

    // Initialize user data if not exists
    if (!sock.user.data) sock.user.data = {}
    if (!sock.user.data[sender]) sock.user.data[sender] = { usedRoasts: [] }

    const userData = sock.user.data[sender]

    // Reset if all roasts have been used
    if (userData.usedRoasts.length >= roasts.length) {
      userData.usedRoasts = []
    }

    // Get available roasts that haven't been used
    const availableRoasts = roasts.filter((_, index) =>!userData.usedRoasts.includes(index))

    // Pick random roast from available ones
    const randomIndex = Math.floor(Math.random() * availableRoasts.length)
    const selectedRoast = availableRoasts[randomIndex]
    const originalIndex = roasts.indexOf(selectedRoast)

    // Save used roast index
    userData.usedRoasts.push(originalIndex)

    const target = args.length? args.join(' ') : 'you'

    await sock.sendMessage(from, {
      text: `╭─⌈ 🔥 ROAST MACHINE ⌋
│ Target: ${target}
│ Roast #${userData.usedRoasts.length}/150
│
│ ${selectedRoast}
│
│ Relax, it’s just a joke 😎
╰⊷ *Powered By ${brandName}*`
    }, { quoted: msg })

  } catch (error) {
    console.error('[ROAST ERROR]', error)
    await sock.sendMessage(from, {
      text: '> ❌ Roast machine overheated. Try again.'
    }, { quoted: msg }).catch(() => {})
  }
}