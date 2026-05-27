import { readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export const name = 'design'
export const alias = ['theme', 'box']
export const category = 'Settings'
export const desc = 'Change message box design'

async function getBrandName(botSettings) {
  if (!botSettings?.supabase) return botSettings?.botname || 'Bot'
  const instanceId = botSettings.instance_id || 'DGIFT_DEFAULT'
  const { data } = await botSettings.supabase
  .from('b_settings')
  .select('brand_name, botname')
  .eq('id', instanceId)
  .maybeSingle()
  return data?.brand_name || data?.botname || 'Bot'
}

function getAvailableDesigns() {
  try {
    const designsPath = join(__dirname, '..', '..', 'designs')
    const files = readdirSync(designsPath)
    return files
    .filter(file => file.endsWith('.js'))
    .map(file => file.replace('.js', ''))
  } catch (err) {
    return ['classic']
  }
}

export default async function design(sock, { msg, from, isOwner, isVIP, formatBox }, botSettings) {
  try {
    if (!botSettings.supabase) {
      return sock.sendMessage(from, { text: '> Database connection not ready.' }, { quoted: msg })
    }

    if (!isOwner &&!isVIP) {
      return sock.sendMessage(from, { text: '> Only owner and VIP can change design.' }, { quoted: msg })
    }

    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const action = args[0]?.toLowerCase()
    const instanceId = botSettings.instance_id || 'DGIFT_DEFAULT'

    const { data: settings } = await botSettings.supabase
    .from('b_settings')
    .select('box_design')
    .eq('id', instanceId)
    .maybeSingle()

    const currentDesign = settings?.box_design || 'classic'
    const availableDesigns = getAvailableDesigns()

    if (!action) {
      let listText = `Current Design: ${currentDesign}\n\nAvailable Designs:\n`
      availableDesigns.forEach((design, index) => {
        listText += `${index + 1}. ${design}${design === currentDesign? ' [Active]' : ''}\n`
      })
      listText += `\nUsage:\n${botSettings.prefix}design set <name>\n${botSettings.prefix}design reset`

      const formatted = await formatBox('Design Control', listText, botSettings.botname)
      await sock.sendMessage(from, { react: { text: '🎨', key: msg.key } })
      return await sock.sendMessage(from, { text: formatted }, { quoted: msg })
    }

    if (action === 'reset') {
      const { error } = await botSettings.supabase
      .from('b_settings')
      .update({ box_design: 'classic', updated_at: new Date().toISOString() })
      .eq('id', instanceId)

      if (error) {
        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
        return await sock.sendMessage(from, { text: `> Database error: ${error.message}` }, { quoted: msg })
      }

      // Update memory so next message uses new design
      botSettings.box_design = 'classic'

      const content = 'Design reset to: classic'
      const formatted = await formatBox('Design Reset', content, botSettings.botname)
      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })
      return await sock.sendMessage(from, { text: formatted }, { quoted: msg })
    }

    if (action === 'set') {
      const designName = args[1]?.toLowerCase()

      if (!designName) {
        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
        return await sock.sendMessage(from, { text: `> Usage: ${botSettings.prefix}design set <name>` }, { quoted: msg })
      }

      if (!availableDesigns.includes(designName)) {
        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
        return await sock.sendMessage(from, {
          text: `> Design '${designName}' not found.\nAvailable: ${availableDesigns.join(', ')}`
        }, { quoted: msg })
      }

      const { error } = await botSettings.supabase
      .from('b_settings')
      .update({ box_design: designName, updated_at: new Date().toISOString() })
      .eq('id', instanceId)

      if (error) {
        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
        return await sock.sendMessage(from, { text: `> Database error: ${error.message}` }, { quoted: msg })
      }

      // Update memory so confirmation uses new design immediately
      botSettings.box_design = designName

      const content = `Design changed to: ${designName}\n\nAll messages will now use the new design`
      const formatted = await formatBox('Design Updated', content, botSettings.botname)
      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })
      return await sock.sendMessage(from, { text: formatted }, { quoted: msg })
    }

    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: `> Invalid action. Use: set, reset` }, { quoted: msg })

  } catch (err) {
    console.error(`[DESIGN CMD ERROR]`, err.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Failed to update design. Check database.' }, { quoted: msg })
  }
}