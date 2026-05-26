// observers/autogreet.js
export default async function autogreet(sock, { type, id, participants }, botSettings) {
  try {
    // Tunataka tu join events
    if (type!== 'add') return

    // Angalia kama database ipo
    if (!botSettings?.supabase) return

    // Chukua setting ya autogreet kutoka database
    const { data: settings } = await botSettings.supabase
    .from('b_settings')
    .select('autogreet, botname')
    .eq('id', 'DGIFT_DEFAULT')
    .maybeSingle()

    // Kama autogreet haiko ON, toka
    if (!settings?.autogreet) return

    const botname = settings.botname || botSettings.botname || 'DGIFT-BOT'
    const groupId = id
    const hour = new Date().getHours()

    // Chagua time period
    let period = 'night'
    if (hour >= 5 && hour < 11) period = 'morning'
    else if (hour >= 11 && hour < 14) period = 'lunch'
    else if (hour >= 14 && hour < 17) period = 'afternoon'
    else if (hour >= 17 && hour < 21) period = 'evening'
    else if (hour >= 21 || hour < 5) period = 'night'

    // 30+ messages kwa kila time period
    const messages = {
      morning: [
        `🌅 Good morning! Welcome @user to ${groupId.split('@')[0]}. Hope you have an amazing day ahead with us.`,
        `☀️ Rise and shine! Hey @user, welcome to the group. Coffee is on, let's make this morning productive.`,
        `🌞 Morning vibes only! Welcome @user. Start your day with good energy and great conversations here.`,
        `🌄 Good morning @user! Glad you joined us. May your day be filled with positivity and success.`,
        `🌤️ Morning! @user, welcome aboard. Let's make today count together in this group.`,
        `🌅 Rise up @user! Welcome to our community. Hope your morning is as bright as your presence here.`,
        `☀️ Hello @user! Good morning and welcome. Let's kickstart the day with good vibes only.`,
        `🌞 Morning greetings @user! Thanks for joining us. Make yourself at home and enjoy the chat.`,
        `🌄 Welcome @user! Good morning from everyone here. Hope you bring great energy to the group.`,
        `🌤️ Hey @user! Morning and welcome. Let's have an awesome day together in this space.`,
        `🌅 Good morning @user! Welcome to the family. Hope today treats you well.`,
        `☀️ Wake up and welcome @user! Glad you're here. Let's make this morning memorable.`,
        `🌞 Morning @user! Welcome aboard. Feel free to introduce yourself when ready.`,
        `🌄 Good morning and welcome @user! Hope your day starts as great as your entry here.`,
        `🌤️ Hey @user! Morning welcome to the group. Let's keep it positive today.`,
        `🌅 Welcome @user! Good morning. We're happy to have you with us.`,
        `☀️ Morning vibes @user! Welcome to our little corner of WhatsApp.`,
        `🌞 Hello @user! Good morning and welcome. Enjoy your stay here.`,
        `🌄 Morning @user! Welcome to the squad. Let's make today productive.`,
        `🌤️ Good morning @user! Welcome aboard. Hope you find value here.`,
        `🌅 Hey @user! Morning and welcome. Feel free to chat anytime.`,
        `☀️ Welcome @user! Morning greetings from the whole group.`,
        `🌞 Good morning @user! Glad you could join us today.`,
        `🌄 Morning welcome @user! Hope you have a fantastic day ahead.`,
        `🌤️ Hey @user! Morning and welcome to the community.`,
        `🌅 Welcome @user! Good morning. Let's have great conversations today.`,
        `☀️ Morning @user! Welcome aboard. Enjoy the vibe here.`,
        `🌞 Hello @user! Good morning and welcome to the group.`,
        `🌄 Good morning @user! Welcome to our growing family.`,
        `🌤️ Morning @user! Welcome and have an amazing day with us.`
      ],
      lunch: [
        `🍽️ Lunch time! Welcome @user to the group. Hope you're having a great midday break.`,
        `🥪 Hello @user! Welcome aboard. Enjoy your lunch and the chat here.`,
        `🍛 Midday welcome @user! Glad you joined us during lunch hour.`,
        `🍜 Hey @user! Welcome to the group. Hope lunch treats you well today.`,
        `🍱 Welcome @user! Lunch time vibes and good conversations await you here.`,
        `🍽️ Good afternoon @user! Welcome to our group. Enjoy your meal break with us.`,
        `🥗 Lunch greeting @user! Welcome aboard. Let's chat while you eat.`,
        `🍛 Hey @user! Midday welcome. Hope your lunch is as good as your entry here.`,
        `🍜 Welcome @user! Lunch time and welcome to the family.`,
        `🍱 Good afternoon @user! Welcome to the group. Enjoy your break.`,
        `🍽️ Hey @user! Lunch time welcome. Make yourself comfortable here.`,
        `🥪 Welcome @user! Midday greetings and good vibes only.`,
        `🍛 Good afternoon @user! Welcome aboard. Hope you enjoy your stay.`,
        `🍜 Lunch welcome @user! Glad you're here with us today.`,
        `🍱 Hey @user! Welcome to the group during lunch hour.`,
        `🍽️ Welcome @user! Enjoy your lunch and our conversations.`,
        `🥗 Good afternoon @user! Welcome to the community.`,
        `🍛 Hey @user! Lunch time and welcome aboard.`,
        `🍜 Welcome @user! Midday greetings from everyone here.`,
        `🍱 Good afternoon @user! Welcome to our group chat.`,
        `🍽️ Hey @user! Lunch welcome. Hope you're doing great.`,
        `🥪 Welcome @user! Lunch time vibes and welcome aboard.`,
        `🍛 Good afternoon @user! Welcome to the family.`,
        `🍜 Hey @user! Lunch greeting and welcome to the group.`,
        `🍱 Welcome @user! Enjoy your lunch break with us.`,
        `🍽️ Good afternoon @user! Welcome aboard and enjoy the chat.`,
        `🥗 Hey @user! Lunch time welcome to our community.`,
        `🍛 Welcome @user! Midday hello and welcome here.`,
        `🍜 Good afternoon @user! Welcome to the group.`,
        `🍱 Hey @user! Lunch welcome. Make yourself at home.`
      ],
      afternoon: [
        `🌤️ Good afternoon @user! Welcome to the group. Hope your day is going well so far.`,
        `☀️ Afternoon greetings @user! Glad you joined us. Let's keep the energy up.`,
        `🌅 Welcome @user! Good afternoon. Hope you're having a productive day.`,
        `🌤️ Hey @user! Afternoon welcome to our community.`,
        `☀️ Good afternoon @user! Welcome aboard. Feel free to join the chat.`,
        `🌅 Afternoon welcome @user! Hope your day continues smoothly.`,
        `🌤️ Hello @user! Welcome to the group this afternoon.`,
        `☀️ Good afternoon @user! Welcome to the family.`,
        `🌅 Hey @user! Afternoon greetings and welcome aboard.`,
        `🌤️ Welcome @user! Good afternoon. Enjoy your time here.`,
        `☀️ Afternoon welcome @user! Glad you're part of us now.`,
        `🌅 Good afternoon @user! Welcome to our group chat.`,
        `🌤️ Hey @user! Afternoon hello and welcome.`,
        `☀️ Welcome @user! Good afternoon. Hope you're doing well.`,
        `🌅 Afternoon greetings @user! Welcome aboard.`,
        `🌤️ Good afternoon @user! Welcome to the community.`,
        `☀️ Hey @user! Afternoon welcome to the group.`,
        `🌅 Welcome @user! Good afternoon and enjoy your stay.`,
        `🌤️ Afternoon welcome @user! Glad to have you here.`,
        `☀️ Good afternoon @user! Welcome aboard and chat freely.`,
        `🌅 Hey @user! Afternoon hello. Welcome to the family.`,
        `🌤️ Welcome @user! Good afternoon greetings from us all.`,
        `☀️ Afternoon welcome @user! Hope you enjoy it here.`,
        `🌅 Good afternoon @user! Welcome to our little community.`,
        `🌤️ Hey @user! Afternoon and welcome aboard.`,
        `☀️ Welcome @user! Good afternoon. Feel at home here.`,
        `🌅 Afternoon greetings @user! Welcome to the group.`,
        `🌤️ Good afternoon @user! Welcome and enjoy the chat.`,
        `☀️ Hey @user! Afternoon welcome. Glad you're here.`,
        `🌅 Welcome @user! Good afternoon and have fun here.`
      ],
      evening: [
        `🌆 Good evening @user! Welcome to the group. Hope your evening is relaxing.`,
        `🌇 Evening greetings @user! Glad you joined us. Let's wind down together.`,
        `🌃 Welcome @user! Good evening. Hope you had a great day.`,
        `🌆 Hey @user! Evening welcome to our community.`,
        `🌇 Good evening @user! Welcome aboard. Enjoy the night chat.`,
        `🌃 Evening welcome @user! Hope your day ended well.`,
        `🌆 Hello @user! Welcome to the group this evening.`,
        `🌇 Good evening @user! Welcome to the family.`,
        `🌃 Hey @user! Evening greetings and welcome aboard.`,
        `🌆 Welcome @user! Good evening. Relax and enjoy the chat.`,
        `🌇 Evening welcome @user! Glad you're part of us now.`,
        `🌃 Good evening @user! Welcome to our group chat.`,
        `🌆 Hey @user! Evening hello and welcome.`,
        `🌇 Welcome @user! Good evening. Hope you're doing well.`,
        `🌃 Evening greetings @user! Welcome aboard.`,
        `🌆 Good evening @user! Welcome to the community.`,
        `🌇 Hey @user! Evening welcome to the group.`,
        `🌃 Welcome @user! Good evening and enjoy your stay.`,
        `🌆 Evening welcome @user! Glad to have you here.`,
        `🌇 Good evening @user! Welcome aboard and chat freely.`,
        `🌃 Hey @user! Evening hello. Welcome to the family.`,
        `🌆 Welcome @user! Good evening greetings from us all.`,
        `🌇 Evening welcome @user! Hope you enjoy it here.`,
        `🌃 Good evening @user! Welcome to our little community.`,
        `🌆 Hey @user! Evening and welcome aboard.`,
        `🌇 Welcome @user! Good evening. Feel at home here.`,
        `🌃 Evening greetings @user! Welcome to the group.`,
        `🌆 Good evening @user! Welcome and enjoy the chat.`,
        `🌇 Hey @user! Evening welcome. Glad you're here.`,
        `🌃 Welcome @user! Good evening and have fun here.`
      ],
      night: [
        `🌙 Good night @user! Welcome to the group. Hope you sleep well after this.`,
        `⭐ Night greetings @user! Glad you joined us late. Welcome aboard.`,
        `🌌 Welcome @user! Good night. Hope tomorrow treats you well.`,
        `🌙 Hey @user! Night welcome to our community.`,
        `⭐ Good night @user! Welcome aboard. Rest well after chatting.`,
        `🌌 Night welcome @user! Hope your day was productive.`,
        `🌙 Hello @user! Welcome to the group this late night.`,
        `⭐ Good night @user! Welcome to the family.`,
        `🌌 Hey @user! Night greetings and welcome aboard.`,
        `🌙 Welcome @user! Good night. Chat a bit before sleeping.`,
        `⭐ Night welcome @user! Glad you're part of us now.`,
        `🌌 Good night @user! Welcome to our group chat.`,
        `🌙 Hey @user! Night hello and welcome.`,
        `⭐ Welcome @user! Good night. Hope you're doing well.`,
        `🌌 Night greetings @user! Welcome aboard.`,
        `🌙 Good night @user! Welcome to the community.`,
        `⭐ Hey @user! Night welcome to the group.`,
        `🌌 Welcome @user! Good night and enjoy your stay.`,
        `🌙 Night welcome @user! Glad to have you here.`,
        `⭐ Good night @user! Welcome aboard and chat freely.`,
        `🌌 Hey @user! Night hello. Welcome to the family.`,
        `🌙 Welcome @user! Good night greetings from us all.`,
        `⭐ Night welcome @user! Hope you enjoy it here.`,
        `🌌 Good night @user! Welcome to our little community.`,
        `🌙 Hey @user! Night and welcome aboard.`,
        `⭐ Welcome @user! Good night. Feel at home here.`,
        `🌌 Night greetings @user! Welcome to the group.`,
        `🌙 Good night @user! Welcome and enjoy the chat.`,
        `⭐ Hey @user! Night welcome. Glad you're here.`,
        `🌌 Welcome @user! Good night and have sweet dreams.`
      ]
    }

    // Chagua message random kwa time period
    const periodMessages = messages[period]
    const randomMsg = periodMessages[Math.floor(Math.random() * periodMessages.length)]

    // Tuma greetings kwa kila member aliyeingia
    for (const participant of participants) {
      const mentionText = randomMsg.replace('@user', `@${participant.split('@')[0]}`)

      await sock.sendMessage(groupId, {
        text: mentionText,
        mentions: [participant]
      }).catch(() => {})

      // Delay kidogo kati ya messages kama wengi wameingia pamoja
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    console.log(`[AUTOGREET] Greeted ${participants.length} user(s) in ${groupId} during ${period}`)

  } catch (err) {
    console.log('[AUTOGREET ERROR]', err.message)
  }
}