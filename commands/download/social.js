// CLEAN SILENT API MODE
// NO "TRYING API 1/15" MESSAGES
// ONLY REACT + DOWNLOAD
// LOW RAM RENDER FREE TIER OPTIMIZED

export default async function social(
  sock,
  { msg, from, args, quoted },
  botSettings
) {

  let filePath = null

  try {

    const query =
      args.join(' ').trim()

    const quotedText =
      quoted?.message?.conversation ||
      quoted?.message?.extendedTextMessage?.text ||
      ''

    const url =
      query.match(/https?:\/\/[^\s]+/)?.[0] ||
      quotedText.match(/https?:\/\/[^\s]+/)?.[0]

    /*
    ━━━━━━━━━━━━━━━━━━━━━━━━━━
    NO URL
    ━━━━━━━━━━━━━━━━━━━━━━━━━━
    */

    if (!url) {

      await sock.sendMessage(from, {
        react: {
          text: '📥',
          key: msg.key
        }
      })

      return sock.sendMessage(from, {
        text:
`╭─⌈ 📥 *Social Downloader* ⌋
│ Status: Ready
│
│ Supports:
│ • TikTok
│ • Instagram
│ • Facebook
│
│ Usage:
│ ${botSettings.prefix}tt link
│ ${botSettings.prefix}ig link
│ ${botSettings.prefix}fb link
│
│ Reply To Link Supported
╰⊷ *${botSettings.botname}*`
      }, { quoted: msg })

    }

    /*
    ━━━━━━━━━━━━━━━━━━━━━━━━━━
    LOADING REACT
    ━━━━━━━━━━━━━━━━━━━━━━━━━━
    */

    await sock.sendMessage(from, {
      react: {
        text: '⏳',
        key: msg.key
      }
    })

    /*
    ━━━━━━━━━━━━━━━━━━━━━━━━━━
    SILENT API SEARCH
    ━━━━━━━━━━━━━━━━━━━━━━━━━━
    */

    let media = null

    for (const api of APIS) {

      try {

        const result =
          await api(url)

        if (
          result &&
          result.url
        ) {

          media = result

          break

        }

      } catch (err) {

        console.log(
          '[API FAILED]',
          err.message
        )

      }

    }

    /*
    ━━━━━━━━━━━━━━━━━━━━━━━━━━
    FAILED
    ━━━━━━━━━━━━━━━━━━━━━━━━━━
    */

    if (!media) {

      await sock.sendMessage(from, {
        react: {
          text: '❌',
          key: msg.key
        }
      })

      return sock.sendMessage(from, {
        text:
'> Failed to download media.'
      }, { quoted: msg })

    }

    /*
    ━━━━━━━━━━━━━━━━━━━━━━━━━━
    FILE PATH
    ━━━━━━━━━━━━━━━━━━━━━━━━━━
    */

    const safeTitle =
      (media.title || 'social_video')
      .replace(/[\\/:*?"<>|]/g, '')
      .slice(0, 50)

    filePath = path.join(
      TMP_DIR,
      `${safeTitle}_${Date.now()}.mp4`
    )

    /*
    ━━━━━━━━━━━━━━━━━━━━━━━━━━
    SEND THUMBNAIL FIRST
    ━━━━━━━━━━━━━━━━━━━━━━━━━━
    */

    if (media.thumbnail) {

      try {

        await sock.sendMessage(from, {
          image: {
            url: media.thumbnail
          },
          caption:
`╭─⌈ 📥 *Downloading Media* ⌋
│ Title:
│ ${media.title || 'Unknown'}
│
│ Status:
│ Downloading...
╰⊷ *${botSettings.botname}*`
        }, { quoted: msg })

      } catch {}

    }

    /*
    ━━━━━━━━━━━━━━━━━━━━━━━━━━
    DOWNLOAD STREAM
    ━━━━━━━━━━━━━━━━━━━━━━━━━━
    */

    const response =
      await axios({
        url: media.url,
        method: 'GET',
        responseType: 'stream',
        timeout: 30000,
        headers: {
          'User-Agent':
            'Mozilla/5.0'
        }
      })

    await pipelineAsync(
      response.data,
      fs.createWriteStream(filePath)
    )

    /*
    ━━━━━━━━━━━━━━━━━━━━━━━━━━
    CHECK FILE
    ━━━━━━━━━━━━━━━━━━━━━━━━━━
    */

    if (
      !fs.existsSync(filePath)
    ) {

      throw new Error(
        'File save failed'
      )

    }

    const stats =
      fs.statSync(filePath)

    const sizeMB =
      (
        stats.size /
        1024 /
        1024
      ).toFixed(2)

    /*
    ━━━━━━━━━━━━━━━━━━━━━━━━━━
    SUCCESS REACT
    ━━━━━━━━━━━━━━━━━━━━━━━━━━
    */

    await sock.sendMessage(from, {
      react: {
        text: '✅',
        key: msg.key
      }
    })

    /*
    ━━━━━━━━━━━━━━━━━━━━━━━━━━
    SEND VIDEO
    ━━━━━━━━━━━━━━━━━━━━━━━━━━
    */

    await sock.sendMessage(from, {
      video: {
        url: filePath
      },
      mimetype:
        'video/mp4',
      fileName:
        `${safeTitle}.mp4`,
      caption:
`📥 ${media.title || 'Social Media Video'}

📦 ${sizeMB} MB`
    }, { quoted: msg })

    /*
    ━━━━━━━━━━━━━━━━━━━━━━━━━━
    CLEANUP
    ━━━━━━━━━━━━━━━━━━━━━━━━━━
    */

    try {

      fs.unlinkSync(filePath)

    } catch {}

  } catch (err) {

    console.error(
      '[SOCIAL ERROR]',
      err.message
    )

    /*
    ━━━━━━━━━━━━━━━━━━━━━━━━━━
    ERROR REACT
    ━━━━━━━━━━━━━━━━━━━━━━━━━━
    */

    try {

      await sock.sendMessage(from, {
        react: {
          text: '❌',
          key: msg.key
        }
      })

    } catch {}

    /*
    ━━━━━━━━━━━━━━━━━━━━━━━━━━
    ERROR MESSAGE
    ━━━━━━━━━━━━━━━━━━━━━━━━━━
    */

    await sock.sendMessage(from, {
      text:
`> Failed: ${err.message}`
    }, { quoted: msg })

    /*
    ━━━━━━━━━━━━━━━━━━━━━━━━━━
    AUTO CLEANUP
    ━━━━━━━━━━━━━━━━━━━━━━━━━━
    */

    try {

      if (
        filePath &&
        fs.existsSync(filePath)
      ) {

        fs.unlinkSync(filePath)

      }

    } catch {}

  }

}