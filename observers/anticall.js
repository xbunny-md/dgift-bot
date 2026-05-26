import { supabase } from '../lib/supabase.js'

export default async function anticall(sock, callEvent) {
  try {
    const { from, id } = callEvent
    
    const { data: settings } = await supabase
      .from('b_settings')
      .select('anticall')
      .eq('id', 'DGIFT_DEFAULT')
      .maybeSingle()

    if (!settings?.anticall) return

    await sock.rejectCall(id, from)
    await sock.sendMessage(from, { text: 'Sorry, calls are not allowed. Contact the owner via chat.' })

  } catch (err) {
    console.log('[ANTICALL ERROR]', err.message)
  }
}