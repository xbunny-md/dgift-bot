// commands/tools/chunk.js
export const name = 'chunk'
export const alias = ['split', 'breaktext', 'chunktext']
export const category = 'Tools'
export const desc = 'Split long text into chunks to avoid WhatsApp limit'

const MAX_LENGTH = 4000

export default async function chunk(sock, { msg, from, args }, botSettings) {
  try {
    const brand = botSettings?.brand_name || botSettings?.botname || 'DGIFT BOT'
    
    if (!args.length) {
      return sock.sendMessage(from, {
        text: `╭─⌈ 📝 *CHUNK TOOL* ⌋
│
│ Usage: ${botSettings.prefix}chunk <text>
│ Max per chunk: ${MAX_LENGTH} chars
│
│ Example: ${botSettings.prefix}chunk Hello world...
│
╰⊷ *Powered By ${brand}*`
      }, { quoted: msg })
    }

    const text = args.join(' ')
    
    if (text.length <= MAX_LENGTH) {
      return sock.sendMessage(from, {
        text: `╭─⌈ ℹ️ *NO CHUNK NEEDED* ⌋
│
│ Text length: ${text.length}/${MAX_LENGTH}
│ Message is within limit
│
╰⊷ *Powered By ${brand}*`
      }, { quoted: msg })
    }

    await sock.sendMessage(from, { react: { text: '✂️', key: msg.key } })
    
    const loadingMsg = await sock.sendMessage(from, {
      text: `╭─⌈ ✂️ *SPLITTING TEXT* ⌋
│
│ Total length: ${text.length} chars
│ Processing...
│
╰⊷ *Powered By ${brand}*`
    }, { quoted: msg })

    // Split text into chunks
    const chunks = []
    for (let i = 0; i < text.length; i += MAX_LENGTH) {
      chunks.push(text.slice(i, i + MAX_LENGTH))
    }

    await sock.sendMessage(from, {
      text: `╭─⌈ ✅ *SPLIT COMPLETE* ⌋
│
│ Original: ${text.length} chars
│ Chunks: ${chunks.length}
│ Sending now...
│
╰⊷ *Powered By ${brand}*`,
      edit: loadingMsg.key
    })

    // Send each chunk with delay
    for (let i = 0; i < chunks.length; i++) {
      const chunkMsg = `╭─⌈ 📄 *PART ${i + 1}/${chunks.length}* ⌋
│
${chunks[i]}
│
╰⊷ *Powered By ${brand}*`
      
      await sock.sendMessage(from, { text: chunkMsg }, { quoted: msg })
      await new Promise(resolve => setTimeout(resolve, 1500)) // 1.5s delay
    }

    await sock.sendMessage(from, { react: { text: '✅', key: loadingMsg.key } }).catch(() => {})

  } catch (error) {
    console.error('[CHUNK ERROR]', error.message)
    await sock.sendMessage(from, {
      text: `╭─⌈ ❌ *ERROR* ⌋
│
│ Failed to chunk text
│ Reason: ${error.message}
│
╰⊷ *Powered By ${botSettings?.brand_name || 'DGIFT BOT'}*`
    }, { quoted: msg })
  }
}