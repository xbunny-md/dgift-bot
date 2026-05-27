// observers/antibadword.js
const localBadWords = [
  // English insults
  "fuck","shit","bitch","bastard","asshole","dick","cunt","pussy","dumbass","idiot","stupid","retard","faggot","nigger","slut","whore","hoe","motherfucker","dumb","crap","damn","hell","prick","wanker","tosser","twat","bloody","bollocks","bugger",
  "asswipe","jackass","dumbfuck","shitface","cocksucker","fuckface","shitstain","dumbshit","asshat","dipshit","dickwad","fuckwit","knobhead","bellend","git","prat","numpty","plonker","pillock","muppet",

  // Swahili insults - strong words included
  "mjinga","pumbavu","mbwa","nguruwe","chizi","kijinga","mpumbavu","mshenzi","malaya","kahaba","chawa","nyangau","jinga","shenzi","mpuuzi",
  "msenge","shoga","mashoga","mkundu","kojoa","nyamba","kuma","matako","nyama","tombwa","tombana","piga punyeto","punyeto",
  "mjinga sana","mbwa wewe","pumbavu wewe","chizi wewe","mpuuzi sana","mshenzi sana","malaya mkubwa","kahaba mkubwa","chawa mkubwa",
  "kichwa ngumu","kichwa maji","kichwa mavi","kichwa nguruwe","kichwa punda","kichwa mbwa","kichwa chizi","kichwa pumbavu","kichwa mjinga",

  // Mixed English + Swahili
  "fuck wewe","shit wewe","bitch wewe","mbwa idiot","pumbavu fuck","mjinga stupid","malaya bitch","shenzi asshole","nguruwe stupid","chizi idiot",
  "fuck off wewe","shit off","get lost idiot","go away stupid","mbwa kichwa ngumu","pumbavu kichwa maji","mjinga kichwa mavi",
  "kuma wewe","msenge wewe","tombwa wewe","mkundu wewe","malaya fuck","kahaba shit","mbwa kuma","pumbavu kuma",
  "fuck you idiot","shit you stupid","bitch you dumb","asshole you stupid","dickhead you idiot","cunt you stupid",
  "mbwa wewe idiot","nguruwe wewe stupid","chizi wewe dumb","kijinga wewe idiot","mpumbavu wewe stupid","mshenzi wewe dumb",
  "kuma idiot","msenge stupid","tombwa dumb","mkundu idiot","pumbavu kuma","mjinga msenge"
  // Note: For production, move this to /data/badwords.json and load it to reach 400+ words easily
];

async function getBadwordConfig(supabase, groupId) {
  if (!supabase) return { enabled: false, action: 'delete', dbWords: [] }

  const { data: settings } = await supabase
 .from('b_settings')
 .select('antibadword_enabled, badword_action')
 .eq('id', groupId)
 .maybeSingle()

  const { data: dbWords } = await supabase
 .from('badwords')
 .select('word')
 .eq('group_id', groupId)

  return {
    enabled: settings?.antibadword_enabled || false,
    action: settings?.badword_action || 'delete',
    dbWords: dbWords?.map(w => w.word.toLowerCase()) || []
  }
}

async function warnUser(supabase, groupId, userId) {
  if (!supabase) return 1

  const { data } = await supabase
 .from('group_warns')
 .select('count')
 .eq('group_id', groupId)
 .eq('user_id', userId)
 .maybeSingle()

  const newCount = (data?.count || 0) + 1

  await supabase
 .from('group_warns')
 .upsert({ group_id: groupId, user_id: userId, count: newCount, updated_at: new Date().toISOString() }, { onConflict: 'group_id,user_id' })

  return newCount
}

async function handlePunishment(sock, groupId, userId, isGroup, warnCount) {
  try {
    if (isGroup) {
      if (warnCount >= 10) {
        // Permanent kick
        await sock.groupParticipantsUpdate(groupId, [userId], 'remove')
      } else if (warnCount >= 5) {
        // Kick for 10 minutes then re-add
        await sock.groupParticipantsUpdate(groupId, [userId], 'remove')
        setTimeout(async () => {
          try {
            await sock.groupParticipantsUpdate(groupId, [userId], 'add')
          } catch {}
        }, 10 * 60 * 1000)
      }
    } else {
      // DM: block for 6 minutes
      await sock.updateBlockStatus(userId, 'block')
      setTimeout(async () => {
        try {
          await sock.updateBlockStatus(userId, 'unblock')
        } catch {}
      }, 6 * 60 * 1000)
    }
  } catch (err) {
    console.error('[ANTIBADWORD ACTION ERROR]', err.message)
  }
}

export const name = 'antibadword'

export default async function antibadword(sock, msg, botSettings) {
  try {
    if (!msg.message || msg.key.fromMe) return

    const from = msg.key.remoteJid
    const sender = msg.key.participant || msg.key.remoteJid
    const isGroup = from.endsWith('@g.us')

    const text = msg.message?.conversation ||
                 msg.message?.extendedTextMessage?.text ||
                 msg.message?.imageMessage?.caption ||
                 msg.message?.videoMessage?.caption || ''

    if (!text) return

    const config = await getBadwordConfig(botSettings.supabase, from)
    if (!config.enabled) return

    const allBadWords = [...localBadWords,...config.dbWords]
    const lowerText = text.toLowerCase()

    const foundBadWord = allBadWords.find(word => lowerText.includes(word.toLowerCase()))
    if (!foundBadWord) return

    // Delete the message
    try {
      await sock.sendMessage(from, { delete: msg.key })
    } catch {}

    // Increase warn count
    const warnCount = await warnUser(botSettings.supabase, from, sender)

    // Send warning message
    await sock.sendMessage(from, {
      text: `⚠️ @${sender.split('@')[0]} Do not use bad words!\nWarning ${warnCount}/5\nDetected: *${foundBadWord}*`,
      mentions: [sender]
    }, { quoted: msg })

    // Apply punishment if warn limit reached
    if (warnCount >= 5) {
      await handlePunishment(sock, from, sender, isGroup, warnCount)

      if (isGroup) {
        await sock.sendMessage(from, {
          text: warnCount >= 10
          ? `⛔ @${sender.split('@')[0]} has been removed permanently for repeated bad words.`
            : `⏱️ @${sender.split('@')[0]} has been removed for 10 minutes for bad words.`,
          mentions: [sender]
        })
      } else {
        await sock.sendMessage(from, {
          text: `🚫 You have been blocked for 6 minutes for using bad words.`
        })
      }
    }

  } catch (err) {
    console.error('[ANTIBADWORD FATAL]', err.message)
  }
}