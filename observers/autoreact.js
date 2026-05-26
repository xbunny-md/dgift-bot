// observers/autoreact.js
const reactions = [
  '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔',
  '❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️',
  '✨','⭐','🌟','💫','⚡','🔥','🌈','☀️','🌙','🌍',
  '🌎','🌏','🌐','🪐','🌑','🌒','🌓','🌔','🌕','🌖',
  '🌗','🌘','🌚','🌛','🌜','🌝','🌞','🌟','🌠','☁️',
  '⛅','⛈️','🌤️','🌦️','🌧️','🌨️','🌩️','🌪️','🌫️','🌬️',
  '🌀','🌊','🌊','💧','💦','☔','☂️','🌈','🔥','💥',
  '😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇',
  '🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚',
  '😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🤩',
  '🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣',
  '😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬',
  '🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗',
  '🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯',
  '😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐',
  '👍','👎','👌','✌️','🤞','🤟','🤘','🤙','👈','👉',
  '👆','🖕','👇','☝️','✋','🤚','🖐️','🖖','👋','🤏',
  '💪','🦾','🦵','🦿','🦶','👣','👂','🦻','👃','🧠',
  '🦷','🦴','👀','👁️','👅','👄','💋','🫀','🫁','🦠'
]

export default async function autoreact(sock, { msg, from, isGroup }, botSettings) {
  try {
    if (!botSettings?.supabase) return
    if (msg.key.fromMe) return

    const targetJid = isGroup ? from : 'global'

    let settings = botSettings
    if (!settings || settings.autoreact === undefined) {
      const { data: dbSettings } = await botSettings.supabase
        .from('b_settings')
        .select('autoreact')
        .eq('id', targetJid)
        .maybeSingle()
      settings = dbSettings || botSettings

      if ((!settings || settings.autoreact === undefined) && isGroup) {
        const { data: globalSettings } = await botSettings.supabase
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