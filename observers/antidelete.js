// observers/antidelete.js
import { downloadMediaMessage } from '@whiskeysockets/baileys'

const messageCache = new Map()
const CACHE_LIMIT = 500
const AUTO_CLEAN_DAYS = 7

async function getGroupSettings(botSettings, targetId) {
  if (!botSettings?.supabase) return null

  // Jaribu kupata settings za group/groupId
  const { data: groupSettings } = await botSettings.supabase
  .from('b_settings')
  .select('*')
  .eq('id', targetId)
  .maybeSingle()

  if (groupSettings?.antidelete) return groupSettings

  // Kama hakuna, angalia global settings DGIFT_DEFAULT
  const { data: globalSettings } = await botSettings.supabase
  .from('b_settings')
  .select('*')
  .eq('id', 'DGIFT_DEFAULT')
  .maybeSingle()

  return globalSettings
}

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

export default async function antidelete(sock, { msg }, botSettings) {
  try {
    if (msg.key.fromMe) return

    // 1. HANDLE MESSAGE DELETE - PROTOCOL 0
    if (msg.message?.protocolMessage?.type === 0) {
      const deletedKey = msg.message.protocolMessage.key
      const deletedMsg = messageCache.get(deletedKey.id)
      if (!deletedMsg) return

      const groupJid = deletedMsg.key.remoteJid
      const isGroupMsg = groupJid.endsWith('@g.us')
      const targetJid = isGroupMsg? groupJid : 'DGIFT_DEFAULT'

      // 2. CHECK SETTINGS FROM b_settings - NO HARDCODE
      const settings = await getGroupSettings(botSettings, targetJid)
      if (!settings?.antidelete) return

      // 3. EXTRACT DATA
      const deleter = msg.key.participant || msg.key.remoteJid
      const originalSender = deletedMsg.key.participant || deletedMsg.key.remoteJid
      const deleterTag = `@${deleter.split('@')[0]}`
      const senderTag = `@${originalSender.split('@')[0]}`
      const msgType = Object.keys(deletedMsg.message)[0]

      // 4. GET CONTENT + VIEWONCE CHECK
      let content = deletedMsg.message.conversation ||
                    deletedMsg.message.extendedTextMessage?.text ||
                    deletedMsg.message.imageMessage?.caption ||
                    deletedMsg.message.videoMessage?.caption || null

      let isViewOnce = false
      let mediaMsg = deletedMsg.message[msgType]

      if (deletedMsg.message.viewOnceMessage) {
        isViewOnce = true
        const viewOnceType = Object.keys(deletedMsg.message.viewOnceMessage.message)[0]
        mediaMsg = deletedMsg.message.viewOnceMessage.message[viewOnceType]
        content = mediaMsg?.caption || '[ViewOnce Message]'
      }

      if (deletedMsg.message.viewOnceMessageV2) {
        isViewOnce = true
        const viewOnceType = Object.keys(deletedMsg.message.viewOnceMessageV2.message)[0]
        mediaMsg = deletedMsg.message.viewOnceMessageV2.message[viewOnceType]
        content = mediaMsg?.caption || '[ViewOnce V2 Message]'
      }

      // 5. SAVE TO SUPABASE
      await botSettings.supabase.from('deleted_messages').insert({
        message_id: deletedKey.id,
        group_jid: isGroupMsg? groupJid : null,
        sender_jid: originalSender,
        sender_name: deletedMsg.pushName || originalSender.split('@')[0],
        message_type: msgType,
        content: content,
        deleted_by: deleter,
        original_timestamp: new Date(deletedMsg.messageTimestamp * 1000).toISOString()
      })

      // Auto clean old records
      await botSettings.supabase
      .from('deleted_messages')
      .delete()
      .lt('deleted_at', new Date(Date.now() - AUTO_CLEAN_DAYS * 86400000).toISOString())

      // 6. BUILD RECOVERY MESSAGE
      const brandName = await getBrandName(botSettings)
      const botName = settings.botname || brandName

      let recoveryText = `╭─⌈ 🗑️ *${brandName} AntiDelete* ⌋\n`
      recoveryText += `│ Bot: ${botName}\n`
      recoveryText += `│ Deleted by: ${deleterTag}\n`
      recoveryText += `│ Sender: ${senderTag}\n`
      if (isViewOnce) recoveryText += `│ Type: ViewOnce 👁️\n`
      recoveryText += `╰⊷ *Recovered*`

      const target = isGroupMsg? groupJid : originalSender

      // 7. RESEND BASED ON TYPE
      try {
        if (msgType === 'conversation' || msgType === 'extendedTextMessage') {
          await sock.sendMessage(target, {
            text: `${recoveryText}\n\n*Message:* ${content}`,
            mentions: [originalSender, deleter]
          })

        } else if (msgType === 'imageMessage' || deletedMsg.message.viewOnceMessage || deletedMsg.message.viewOnceMessageV2) {
          const buffer = await downloadMediaMessage(deletedMsg, 'buffer', {}, {
            logger: sock.logger,
            reuploadRequest: sock.updateMediaMessage
          })
          const caption = mediaMsg?.caption || content || ''
          await sock.sendMessage(target, {
            image: buffer,
            caption: `${recoveryText}\n\n*Caption:* ${caption}`,
            mentions: [originalSender, deleter]
          })

        } else if (msgType === 'videoMessage') {
          const buffer = await downloadMediaMessage(deletedMsg, 'buffer', {}, {
            logger: sock.logger,
            reuploadRequest: sock.updateMediaMessage
          })
          const caption = mediaMsg?.caption || content || ''
          await sock.sendMessage(target, {
            video: buffer,
            caption: `${recoveryText}\n\n*Caption:* ${caption}`,
            mentions: [originalSender, deleter]
          })

        } else if (msgType === 'stickerMessage') {
          const buffer = await downloadMediaMessage(deletedMsg, 'buffer', {}, {
            logger: sock.logger,
            reuploadRequest: sock.updateMediaMessage
          })
          await sock.sendMessage(target, { sticker: buffer })
          await sock.sendMessage(target, {
            text: recoveryText,
            mentions: [originalSender, deleter]
          })

        } else if (msgType === 'audioMessage') {
          const buffer = await downloadMediaMessage(deletedMsg, 'buffer', {}, {
            logger: sock.logger,
            reuploadRequest: sock.updateMediaMessage
          })
          await sock.sendMessage(target, {
            audio: buffer,
            mimetype: deletedMsg.message.audioMessage?.mimetype || 'audio/mp4',
            ptt: deletedMsg.message.audioMessage?.ptt || false
          })
          await sock.sendMessage(target, {
            text: recoveryText,
            mentions: [originalSender, deleter]
          })

        } else if (msgType === 'documentMessage') {
          const buffer = await downloadMediaMessage(deletedMsg, 'buffer', {}, {
            logger: sock.logger,
            reuploadRequest: sock.updateMediaMessage
          })
          const fileName = deletedMsg.message.documentMessage?.fileName || 'document'
          await sock.sendMessage(target, {
            document: buffer,
            mimetype: deletedMsg.message.documentMessage?.mimetype,
            fileName: fileName,
            caption: recoveryText,
            mentions: [originalSender, deleter]
          })

        } else if (msgType === 'contactMessage') {
          const vcard = deletedMsg.message.contactMessage?.vcard
          await sock.sendMessage(target, {
            contacts: {
              displayName: deletedMsg.message.contactMessage?.displayName,
              contacts: [{ vcard }]
            }
          })
          await sock.sendMessage(target, {
            text: recoveryText,
            mentions: [originalSender, deleter]
          })

        } else if (msgType === 'locationMessage') {
          await sock.sendMessage(target, {
            location: {
              degreesLatitude: deletedMsg.message.locationMessage?.degreesLatitude,
              degreesLongitude: deletedMsg.message.locationMessage?.degreesLongitude
            }
          })
          await sock.sendMessage(target, {
            text: recoveryText,
            mentions: [originalSender, deleter]
          })

        } else if (msgType === 'pollCreationMessage') {
          const pollName = deletedMsg.message.pollCreationMessage?.name
          const options = deletedMsg.message.pollCreationMessage?.options?.map(o => o.optionName).join(', ')
          await sock.sendMessage(target, {
            text: `${recoveryText}\n\n*Poll:* ${pollName}\n*Options:* ${options}`,
            mentions: [originalSender, deleter]
          })

        } else {
          await sock.sendMessage(target, {
            text: `${recoveryText}\n\n*Type:* ${msgType} deleted`,
            mentions: [originalSender, deleter]
          })
        }

      } catch (downloadErr) {
        console.log('[ANTIDELETE DOWNLOAD ERROR]', downloadErr.message)
        await sock.sendMessage(target, {
          text: `${recoveryText}\n\n*Error:* Media could not be recovered`,
          mentions: [originalSender, deleter]
        })
      }

      messageCache.delete(deletedKey.id)
      return
    }

    // 8. CACHE ALL MESSAGES
    if (msg.key.id) {
      messageCache.set(msg.key.id, msg)
      setTimeout(() => {
        messageCache.delete(msg.key.id)
      }, 43200000) // 12 hours

      if (messageCache.size > CACHE_LIMIT) {
        const firstKey = messageCache.keys().next().value
        messageCache.delete(firstKey)
      }
    }

  } catch (err) {
    console.log('[ANTIDELETE ERROR]', err.message)
  }
}