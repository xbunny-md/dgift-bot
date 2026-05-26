// commands/download/Instagram.js
import axios from 'axios'

export const name = 'instagram'
export const alias = ['ig', 'igdl', 'insta']
export const category = 'Download'
export const desc = 'Download Instagram video/photo/reel from link or replied message'

export default async function instagram(sock, { msg, from, args, quoted }, botSettings) {
  try {
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const cmdArgs = body.trim().split(' ').slice(1)

    let igUrl = cmdArgs[0]

    // Kama hakuna link kwa args, angalia quoted message
    if (!igUrl && quoted) {
      const quotedText = quoted.message?.conversation ||
                         quoted.message?.extendedTextMessage?.text ||
                         quoted.message?.imageMessage?.caption ||
                         quoted.message?.videoMessage?.caption || ''
      const urlMatch = quotedText.match(/(https?:\/\/[^\s]+)/)
      if (urlMatch) igUrl = urlMatch[0]
    }

    // Validate URL
    if (!igUrl || (!igUrl.includes('instagram.com') &&!igUrl.includes('instagr.am'))) {
      await sock.sendMessage(from, { react: { text: '📷', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 📷 *Instagram Downloader* ⌋
│ Status: Ready
│
│ Usage:
│ ${botSettings.prefix}ig https://instagram.com/reel/xxx
│ ${botSettings.prefix}ig [reply to IG link]
│
│ Supports: Reels, Posts, IGTV
╰⊷ *${botSettings.botname}*`
      }, { quoted: msg })
    }

    await sock.sendMessage(from, { react: { text: '⏳', key: msg.key } })

    // Convert to embed URL
    const postId = igUrl.split('/').filter(Boolean).pop().split('?')[0]
    const embedUrl = `https://www.instagram.com/p/${postId}/embed/`

    // Fetch embed HTML
    const { data: html } = await axios.get(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 20000
    })

    // Extract media URLs from JSON in HTML
    const jsonMatch = html.match(/<script type="text\/javascript">window\._sharedData = (.*);<\/script>/)
    if (!jsonMatch) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: '> Failed to extract media. Post may be private or deleted.' }, { quoted: msg })
    }

    const sharedData = JSON.parse(jsonMatch[1])
    const media = sharedData.entry_data.PostPage?.[0]?.graphql?.shortcode_media

    if (!media) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: '> No media found. Post may be private.' }, { quoted: msg })
    }

    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

    const username = media.owner?.username || 'Unknown'
    const caption = `╭─⌈ 📷 *Instagram Download* ⌋
│ Username: @${username}
╰⊷ *${botSettings.botname}*`

    // Handle carousel
    if (media.edge_sidecar_to_children) {
      const edges = media.edge_sidecar_to_children.edges
      for (let i = 0; i < edges.length; i++) {
        const node = edges[i].node
        const isVideo = node.is_video
        const url = isVideo? node.video_url : node.display_url

        if (isVideo) {
          await sock.sendMessage(from, {
            video: { url },
            caption: i === 0? caption : '',
            quoted: i === 0? msg : undefined
          })
        } else {
          await sock.sendMessage(from, {
            image: { url },
            caption: i === 0? caption : '',
            quoted: i === 0? msg : undefined
          })
        }
        await new Promise(r => setTimeout(r, 1200))
      }
    }
    // Single media
    else {
      const isVideo = media.is_video
      const url = isVideo? media.video_url : media.display_url

      if (isVideo) {
        await sock.sendMessage(from, {
          video: { url },
          caption,
          quoted: msg
        })
      } else {
        await sock.sendMessage(from, {
          image: { url },
          caption,
          quoted: msg
        })
      }
    }

  } catch (err) {
    console.error(`[INSTAGRAM CMD ERROR]`, err.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Failed to download. Try again or post may be private.' }, { quoted: msg })
  }
}