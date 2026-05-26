// commands/fun/age.js
export const name = 'age'
export const alias = ['agecalc', 'birthday']
export const category = 'Fun'
export const desc = 'Calculate age with stats, zodiac, and life facts'

const zodiacSigns = [
  { sign: 'Capricorn', date: [12, 22], emoji: '🐐' },
  { sign: 'Aquarius', date: [1, 20], emoji: '🏺' },
  { sign: 'Pisces', date: [2, 19], emoji: '🐟' },
  { sign: 'Aries', date: [3, 21], emoji: '🐏' },
  { sign: 'Taurus', date: [4, 20], emoji: '🐂' },
  { sign: 'Gemini', date: [5, 21], emoji: '👥' },
  { sign: 'Cancer', date: [6, 21], emoji: '🦀' },
  { sign: 'Leo', date: [7, 23], emoji: '🦁' },
  { sign: 'Virgo', date: [8, 23], emoji: '👩' },
  { sign: 'Libra', date: [9, 23], emoji: '⚖️' },
  { sign: 'Scorpio', date: [10, 23], emoji: '🦂' },
  { sign: 'Sagittarius', date: [11, 22], emoji: '🏹' },
  { sign: 'Capricorn', date: [12, 22], emoji: '🐐' }
]

function getZodiac(month, day) {
  for (let i = 0; i < zodiacSigns.length; i++) {
    if (month === zodiacSigns[i].date[0] && day >= zodiacSigns[i].date[1]) {
      return zodiacSigns[i]
    }
    if (month === zodiacSigns[i + 1]?.date[0] && day < zodiacSigns[i + 1].date[1]) {
      return zodiacSigns[i]
    }
  }
  return zodiacSigns[0]
}

function formatNumber(num) {
  return num.toLocaleString('en-US')
}

export default async function age(sock, { msg, from, args }, botSettings) {
  try {
    const brandName = botSettings?.brand_name || botSettings?.botname || 'System'

    if (!args.length ||!args[0].match(/^\d{4}-\d{2}-\d{2}$/)) {
      return sock.sendMessage(from, {
        text: `> ❌ Usage: ${botSettings.prefix}age YYYY-MM-DD\n> Example: ${botSettings.prefix}age 2005-08-15`
      }, { quoted: msg })
    }

    const birthDate = new Date(args[0])
    const now = new Date()

    if (isNaN(birthDate) || birthDate > now) {
      return sock.sendMessage(from, {
        text: '> ❌ Invalid date. Use format YYYY-MM-DD and make sure it is not in the future.'
      }, { quoted: msg })
    }

    // Calculate time differences
    const diffMs = now - birthDate
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHour = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHour / 24)

    const years = now.getFullYear() - birthDate.getFullYear()
    const months = years * 12 + (now.getMonth() - birthDate.getMonth())

    // Next birthday calculation
    const nextBirthday = new Date(now.getFullYear(), birthDate.getMonth(), birthDate.getDate())
    if (nextBirthday < now) nextBirthday.setFullYear(now.getFullYear() + 1)
    const daysToBirthday = Math.ceil((nextBirthday - now) / (1000 * 60 * 60 * 24))

    // Life stats - approximations
    const heartbeats = diffMin * 72 // avg 72 beats per minute
    const litersWater = Math.floor(diffDay * 2.5) // 2.5L per day
    const steps = diffDay * 7000 // avg 7000 steps per day
    const meals = diffDay * 3 // avg 3 meals per day
    const yearsLeftTo80 = Math.max(0, 80 - years)

    // Zodiac
    const zodiac = getZodiac(birthDate.getMonth() + 1, birthDate.getDate())

    await sock.sendMessage(from, {
      text: `╭─⌈ 🎂 AGE CALCULATOR ⌋
│ Born: ${args[0]}
│ Age: ${years} years, ${months % 12} months, ${diffDay % 365} days
│
│ ⏱️ Time Lived:
│ • ${formatNumber(diffSec)} seconds
│ • ${formatNumber(diffMin)} minutes
│ • ${formatNumber(diffHour)} hours
│ • ${formatNumber(diffDay)} days
│
│ 🌟 Zodiac: ${zodiac.sign} ${zodiac.emoji}
│ 🎉 Next Birthday: in ${daysToBirthday} days
│ 💚 Years left to 80: ${yearsLeftTo80} years
│
│ 📊 Life Stats (Approximated):
│ • Heartbeats: ${formatNumber(heartbeats)}
│ • Water Drank: ${formatNumber(litersWater)} liters
│ • Steps Walked: ${formatNumber(steps)}
│ • Meals Eaten: ${formatNumber(meals)}
│
╰⊷ *Powered By ${brandName}*`
    }, { quoted: msg })

  } catch (error) {
    console.error('[AGE ERROR]', error)
    await sock.sendMessage(from, {
      text: '> ❌ Failed to calculate age. Check your date format.'
    }, { quoted: msg }).catch(() => {})
  }
}