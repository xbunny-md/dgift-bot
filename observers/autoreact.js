import { supabase } from '../lib/supabase.js'

const reactions = ['❤️', '🔥', '😂', '👍', '💯', '✨']

export default async function autoreact(sock, { msg, from, isGroup }, botSettings) {
  try {
    if (msg.key.fromMe) return

    const targetJid = isGroup ? from : 'global'
    
    let settings = botSettings
    if (!settings || settings.autoreact === undefined) {
      const { data: dbSettings } = await supabase
        .from('b_settings')
        .select('autoreact')
        .eq('id', targetJid)
        .maybeSingle()
      settings = dbSettings || botSettings
      
      if ((!settings || settings.autoreact === undefined) && isGroup) {
        const { data: globalSettings } = await supabase
          .from('b_settings')
          .select('autoreact')
          .eq('id', 'DGIFT_DEFAULT')
          .maybeSingle()
        settings = globalSettings
      }
    }

    if (!settings?.autoreact) return

    const reaction = reactions[Math.floor(Math.random() * reactions.length)]
    await sock.sendMessage(from, { react: { text: reaction, key: msg.key } })

  } catch (err) {
    console.log('[AUTOREACT ERROR]', err.message)
  }
}