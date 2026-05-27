// observers/antichangegrouppicture.js
import axios from 'axios'
import { downloadContentFromMessage } from '@whiskeysockets/baileys'

async function getBrandName(botSettings) {
  if (!botSettings?.supabase) return 'Bot'
  const instanceId = botSettings.instance_id || 'DGIFT_DEFAULT'
  const { data } = await botSettings.supabase
.from('b_settings')
.select('brand_name, botname')
.eq('id', instanceId)
.maybeSingle()
  return data?.brand_name || data?.botname || 'Bot'
}

async function getWarns(botSettings, groupId, userId) {
  const { data } = await botSettings.supabase
.from('warns')
.select('count')
.eq('group_id', groupId)
.eq('user_id', userId)
.maybeSingle()
  return data?.count || 0
}

async function addWarn(botSettings, groupId, userId, reason) {
  const current = await getWarns(botSettings, groupId, userId)
  const newCount = current + 1

  await botSettings.supabase
.from('warns')
.upsert({ group_id: groupId, user_id: userId, count: newCount, reason, updated_at: new Date().toISOString() },
  { onConflict: 'group_id,user_id' })

  return newCount
}

async function uploadToImgbb(buffer, apiKey) {
  const base64 = buffer.toString('base64')
  const res = await axios.post(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
    image: base64
  })
  return res.data.url
}

async function setGroupPicture(sock, groupId, imageUrl) {
  const response = await axios.get(imageUrl, { responseType: 'arraybuffer' })
  const buffer = Buffer.from(response.data)
  await sock.updateProfilePicture(groupId, buffer)
}

export default async function antichangegrouppicture(sock, event, botSettings) {
  try {
    const { id: groupId, author } = event
    if (!author) return
    if (!botSettings?.supabase) return

    const { data: settings } = await botSettings.supabase
.from('b_settings')
.select('anti_change_group_picture, group_picture_url, imgbb_api, warn_enabled, warn_limit, warn_action')
.eq('id', groupId)
.maybeSingle()

    if (!settings?.anti_change_group_picture) return

    const brandName = await getBrandName(botSettings)
    const imgbbKey = process.env.IMGBB_API || settings.imgbb_api || 'Your_imgbb_api'

    if (imgbbKey === 'Your_imgbb_api') {
      console.log('[ANTICHANGEGROUPPIC] No Imgbb API key set')
      return
    }

    // Mara ya kwanza kuwasha, hifadhi picha ya sasa
    if (!settings.group_picture_url) {
      try {
        const ppUrl = await sock.profilePictureUrl(groupId, 'image').catch(() => null)
        if (!ppUrl) return

        const res = await axios.get(ppUrl, { responseType: 'arraybuffer' })
        const buffer = Buffer.from(res.data)
        const uploadedUrl = await uploadToImgbb(buffer, imgbbKey)

        await botSettings.supabase
.from('b_settings')
.update({ group_picture_url: uploadedUrl })
.eq('id', groupId)
      } catch (err) {
        console.log('[ANTICHANGEGROUPPIC SAVE ERROR]', err.message)
      }
      return
    }

    // Kama picha imebadilika, rudisha na adhibu
    try {
      const currentPic = await sock.profilePictureUrl(groupId, 'image').catch(() => null)

      // Compare URLs - kama ni tofauti, rudisha
      if (currentPic && currentPic!== settings.group_picture_url) {
        await setGroupPicture(sock, groupId, settings.group_picture_url)

        const warnCount = await addWarn(botSettings, groupId, author, 'Changed group picture')

        await sock.sendMessage(groupId, {
text: `╭─⌈ 🖼️ *AntiChangeGroupPicture* ⌋
│ User: @${author.split('@')[0]}
│ Action: Group picture changed
│ Warn: ${warnCount}/${settings.warn_limit || 3}
│
│ Group picture restored to original
╰⊷ *Powered By ${brandName}*`,
mentions: [author]
        }).catch(() => {})

        if (warnCount >= (settings.warn_limit || 3)) {
if (settings.warn_action === 'kick') {
  await sock.groupParticipantsUpdate(groupId, [author], 'remove').catch(() => {})
} else if (settings.warn_action === 'ban') {
  await botSettings.supabase
.from('bans')
.upsert({ group_id: groupId, user_id: author, banned_at: new Date().toISOString() },
  { onConflict: 'group_id,user_id' })
  await sock.groupParticipantsUpdate(groupId, [author], 'remove').catch(() => {})
}
        }
      }
    } catch (err) {
      console.log('[ANTICHANGEGROUPPIC REVERT ERROR]', err.message)
    }

  } catch (err) {
    console.log('[ANTICHANGEGROUPPIC ERROR]', err.message)
  }
}