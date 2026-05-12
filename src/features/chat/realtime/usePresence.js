import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../stores/authStore'

export function usePresence(channelId) {
  const { profile } = useAuthStore()
  const [onlineUserIds, setOnlineUserIds] = useState([])

  useEffect(() => {
    if (!channelId || !profile?.id) return

    const ch = supabase.channel(`presence:chat:${channelId}`, {
      config: { presence: { key: profile.id } },
    })

    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState()
      setOnlineUserIds(Object.keys(state))
    })

    ch.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await ch.track({ userId: profile.id, at: Date.now() })
      }
    })

    return () => { supabase.removeChannel(ch) }
  }, [channelId, profile?.id])

  return { onlineUserIds }
}
