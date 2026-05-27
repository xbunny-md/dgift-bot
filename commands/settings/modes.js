export const name = 'mode'
export const alias = ['modes', 'botmode']
export const category = 'Settings'
export const desc = 'Switch bot mode between owner, public, and private-public'

export default async function mode(sock, { msg, from }, botSettings) {
  try {
    if (!botSettings.supabase) {
      return sock.sendMessage(from, { text: '> Database connection not ready.' }, { quoted: msg })
    }

    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const action = args[0]?.toLowerCase()

    const instanceId = botSettings.instance_id || 'DGIFT_DEFAULT'

    const { data: settings } = await botSettings.supabase
     .from('b_settings')
     .select('owner_mode, public_mode, private_public_mode')
     .eq('id', instanceId)
     .maybeSingle()

    const currentOwnerMode = settings?.owner_mode || false
    const currentPublicMode = settings?.public_mode || false
    const currentPrivatePublicMode = settings?.private_public_mode || false

    if (!action) {
      await sock.sendMessage(from, { react: { text: '⚙️', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ ⚙️ *Bot Mode Control* ⌋
│ Owner Mode: ${currentOwnerMode? 'ON ✅' : 'OFF ❌'}
│ Public Mode: ${currentPublicMode? 'ON ✅' : 'OFF ❌'}
│ Private-Public Mode: ${currentPrivatePublicMode? 'ON ✅' : 'OFF ❌'}
│
│ Usage:
│ ${botSettings.prefix}mode owner
│ ${botSettings.prefix}mode public
│ ${botSettings.prefix}mode private
│
│ Owner: Only owner and VIP can use bot
│ Public: Everyone can use all commands
│ Private: Normal commands public, restricted commands for owner and VIP only
╰⊷ *${botSettings.botname}*`
      }, { quoted: msg })
    }

    let newOwnerMode = false
    let newPublicMode = false
    let newPrivatePublicMode = false
    let modeName = ''

    if (['owner', 'owneronly'].includes(action)) {
      newOwnerMode = true
      modeName = 'Owner Mode'
    } else if (['public', 'everyone'].includes(action)) {
      newPublicMode = true
      modeName = 'Public Mode'
    } else if (['private', 'privatepublic', 'hybrid'].includes(action)) {
      newPrivatePublicMode = true
      modeName = 'Private-Public Mode'
    } else {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `> Invalid mode. Use: owner, public, or private`
      }, { quoted: msg })
    }

    // Skip update if same as current
    if (
      newOwnerMode === currentOwnerMode &&
      newPublicMode === currentPublicMode &&
      newPrivatePublicMode === currentPrivatePublicMode
    ) {
      await sock.sendMessage(from, { react: { text: '⚠️', key: msg.key } })
      return await sock.sendMessage(from, { text: `> Mode is already ${modeName}` }, { quoted: msg })
    }

    const { error } = await botSettings.supabase
     .from('b_settings')
     .upsert(
        {
          id: instanceId,
          owner_mode: newOwnerMode,
          public_mode: newPublicMode,
          private_public_mode: newPrivatePublicMode,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'id' }
      )

    if (error) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: `> Database error: ${error.message}` }, { quoted: msg })
    }

    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })
    await sock.sendMessage(from, {
      text: `╭─⌈ ⚙️ *Mode Updated* ⌋
│ Active Mode: ${modeName} ✅
│
│ Owner Mode: ${newOwnerMode? 'ON' : 'OFF'}
│ Public Mode: ${newPublicMode? 'ON' : 'OFF'}
│ Private-Public Mode: ${newPrivatePublicMode? 'ON' : 'OFF'}
╰⊷ *${botSettings.botname}*`
    }, { quoted: msg })

  } catch (err) {
    console.error(`[MODE CMD ERROR]`, err.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Failed to update mode. Check database.' }, { quoted: msg })
  }
}