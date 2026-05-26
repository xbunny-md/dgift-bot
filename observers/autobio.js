// observers/autobio.js
export default async function autobio(sock, botSettings) {
  try {
    // Angalia kama database ipo
    if (!botSettings?.supabase) return

    // Chukua setting ya autobio kutoka database
    const { data: settings } = await botSettings.supabase
     .from('b_settings')
     .select('autobio')
     .eq('id', 'DGIFT_DEFAULT')
     .maybeSingle()

    // Kama autobio haiko ON, toka
    if (!settings?.autobio) return

    // Bios za English 150+ characters - zinachaguliwa random
    const bios = [
      `Welcome to ${botSettings.botname || 'DGIFT-BOT'} the most advanced WhatsApp automation bot designed to enhance your messaging experience with powerful features including anti-delete protection, auto-reply systems, status automation, smart group moderation, and seamless command handling for personal and business use.`,

      `${botSettings.botname || 'DGIFT-BOT'} is currently active and running on a high-performance Node.js backend with Supabase database integration. We provide 24/7 automation services including message recovery, auto presence management, auto-read, auto-view status, and intelligent tag control for all users worldwide.`,

      `This is ${botSettings.botname || 'DGIFT-BOT'} powered by modern JavaScript and Baileys library to deliver lightning-fast WhatsApp automation. Our bot supports multi-device sessions, media handling, custom commands, auto greetings, and advanced privacy features while maintaining stability and minimal resource consumption.`,

      `${botSettings.botname || 'DGIFT-BOT'} delivers premium WhatsApp automation with a focus on reliability, speed, and user privacy. Features include auto-like status, auto-view status, anti-tag protection, message recovery, and smart moderation tools designed to make group management effortless and efficient for everyone.`,

      `Experience next-level WhatsApp automation with ${botSettings.botname || 'DGIFT-BOT'}. We offer complete control over your chats with features like auto-reply, auto-typing presence, anti-delete recovery, auto-read messages, and custom auto-bio updates. Built for performance, security, and ease of use across all devices.`,

      `${botSettings.botname || 'DGIFT-BOT'} operates as your personal WhatsApp assistant with cutting-edge automation capabilities. From recovering deleted messages to managing large groups, we handle everything automatically while keeping your account safe and ensuring smooth performance without delays or interruptions.`,

      `Running on optimized cloud infrastructure, ${botSettings.botname || 'DGIFT-BOT'} provides instant responses and automation for thousands of users. Our system includes intelligent message filtering, auto status viewing, tag limits enforcement, and comprehensive logging to maintain transparency and control over all activities.`,

      `${botSettings.botname || 'DGIFT-BOT'} is engineered for productivity and entertainment with a clean, lightweight codebase. We support auto-reply, auto-read, auto-typing, anti-spam protection, and custom commands. Everything is designed to work seamlessly without violating WhatsApp policies or compromising your privacy.`,

      `Transform your WhatsApp experience with ${botSettings.botname || 'DGIFT-BOT'}. We automate repetitive tasks, manage group interactions, recover deleted content, and provide real-time status automation. Built with scalability in mind to handle both small personal chats and large community groups efficiently.`,

      `${botSettings.botname || 'DGIFT-BOT'} combines speed, security, and simplicity in one powerful package. Our automation suite includes anti-delete, auto-like, auto-view, anti-tag, auto-greet, and auto-bio features. All systems are monitored 24/7 to ensure maximum uptime and reliable performance for every user.`
    ]

    // Chagua bio random
    const randomBio = bios[Math.floor(Math.random() * bios.length)]

    // Update bio
    await sock.updateProfileStatus(randomBio)
    console.log(`[AUTOBIO] Bio updated successfully: ${randomBio.length} characters`)

  } catch (err) {
    console.log('[AUTOBIO ERROR]', err.message)
  }
}