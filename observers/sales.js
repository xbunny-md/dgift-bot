// observers/sales.js
export default async function sales(sock, { msg, from, isProtected, isFromMe }, botSettings) {
  try {
    if (isProtected || isFromMe ||!msg?.message) return

    const text = (
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      ''
    ).trim()

    const lowerText = text.toLowerCase()
    const trigger = "hello dgift shops, i want to buy a bot activation key"

    // 1. Trigger ya kwanza
    if (lowerText === trigger) {
      await sock.sendMessage(from, { react: { text: '🛒', key: msg.key } }).catch(() => {})

      const reply = `╭─⌈ *DGIFT SHOPS - BOT ACTIVATION* ⌋
│
│ Hello! Welcome to DGIFT Shops 🤖
│ Thank you for choosing us. Here are our plans:
│
├─ *🇹🇿 TANZANIA - TZS*
│ • *Premium Key* - 5,000 TZS
│ → Stable key, stays online 24/7
│ → Priority support & bug fixes
│ → Free updates & new features
│ → Direct contact for any issues
│
│ • *Standard Key* - 3,500 TZS
│ → Stable connection
│ → Regular updates
│ → Email support
│
│ • *Basic Key* - 2,000 TZS
│ → Basic features
│ → Community support
│
├─ *🇰🇪 KENYA - KES*
│ • *Premium Key* - 700 KES
│ → Ultra stable, never sleeps
│ → Fast support, priority fixes
│ → Lifetime updates included
│
│ • *Standard Key* - 500 KES
│ → Reliable connection
│ → Regular updates
│
│ • *Basic Key* - 300 KES
│ → Core features unlocked
│ → Community help
│
├─ *🌍 AFRICA - USD*
│ • *Premium Key* - 3 USD
│ → Premium stability, 24/7 online
│ → 1-on-1 support, I fix your issues personally
│ → Early access to new features
│ → Direct line to the developer
│
│ • *Standard Key* - 2 USD
│ → Solid performance
│ → Regular updates & support
│
│ • *Basic Key* - 1 USD
│ → Essential features
│ → Community support
│
├─ *HOW TO BUY*
│ 1. Choose your plan
│ 2. Reply with: "I choose Premium" / "Standard" / "Basic"
│ 3. I'll send payment details instantly
│
│ ⚡ Keys activated instantly after payment
│ 🔒 100% safe, trusted by hundreds
│
╰⊷ Reply with your chosen plan to continue`

      await sock.sendMessage(from, { text: reply }, { quoted: msg })
      return
    }

    // 2. Check kama amechagua plan
    const planMatch = lowerText.match(/i choose (premium|standard|basic)/)
    if (!planMatch) return

    const chosenPlan = planMatch[1]
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } }).catch(() => {})

    let country = 'Africa'
    let currency = 'USD'
    let price = '3'
    let pitch = ''

    if (lowerText.includes('tz') || lowerText.includes('tanzania')) {
      country = 'Tanzania'
      currency = 'TZS'
      price = chosenPlan === 'premium'? '5,000' : chosenPlan === 'standard'? '3,500' : '2,000'
      pitch = chosenPlan === 'premium'
       ? 'Umefanya chaguo la busara! Premium Key inakupa utulivu wa hali ya juu, bot haitalala kamwe. Mimi mwenyewe nitakuwa hapo kukusolve shida yoyote, hata saa 2 usiku. Updates zote mpya unapata bure, na feature unayoihitaji nakuwekea haraka.'
        : chosenPlan === 'standard'
       ? 'Chaguo poa sana! Standard Key inakupa utendaji imara na updates za mara kwa mara. Support ya email ipo, na bot yako itafanya kazi vizuri bila stress.'
        : 'Karibu sana! Basic Key inakupa features muhimu kwa bei nafuu. Inafaa kwa kuanza, na unaweza upgrade wakati wowote.'

    } else if (lowerText.includes('ke') || lowerText.includes('kenya')) {
      country = 'Kenya'
      currency = 'KES'
      price = chosenPlan === 'premium'? '700' : chosenPlan === 'standard'? '500' : '300'
      pitch = chosenPlan === 'premium'
       ? 'Smart choice! Premium Key ni moto, bot yako itakuwa online 24/7 bila kupumzika. Nikikupata na shida, natafuta solution papo hapo. No downtime, no excuses.'
        : chosenPlan === 'standard'
       ? 'Good pick! Standard Key inakupa stability na updates za kila wakati. Perfect kwa biashara yako.'
        : 'Welcome aboard! Basic Key inakupa kuanza poa na features muhimu. Upgrade anytime unapohitaji zaidi.'

    } else {
      country = 'Africa'
      currency = 'USD'
      price = chosenPlan === 'premium'? '3' : chosenPlan === 'standard'? '2' : '1'
      pitch = chosenPlan === 'premium'
       ? 'Excellent decision! Premium Key gives you rock-solid stability and 24/7 uptime. I personally handle any issues you face and push updates instantly. You get priority support and early access to new features.'
        : chosenPlan === 'standard'
       ? 'Great choice! Standard Key provides reliable performance and regular updates. Perfect balance of price and power.'
        : 'Welcome! Basic Key gives you the essentials to get started. You can upgrade anytime as you grow.'
    }

    const finalReply = `╭─⌈ *ORDER CONFIRMED* ⌋
│
│ 🔥 You chose: *${chosenPlan.toUpperCase()} KEY*
│ 🌍 Region: *${country}*
│ 💰 Amount: *${price} ${currency}*
│
│ ${pitch}
│
├─ *NEXT STEP*
│ Await service, it will be here soon ⏳
│ I'm preparing your payment details right now.
│ You'll get them in the next message.
│
│ Once paid, your key is activated instantly!
│
╰⊷ Thank you for trusting DGIFT SHOPS 🙏`

    await sock.sendMessage(from, { text: finalReply }, { quoted: msg })

  } catch (error) {
    console.log('[SALES OBSERVER ERROR]', error.message)
  }
}