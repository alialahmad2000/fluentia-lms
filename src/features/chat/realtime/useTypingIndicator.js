import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../stores/authStore'

const TYPING_TTL_MS = 3000
const TYPING_THROTTLE_MS = 2000

export function useTypingIndicator(channelId) {
  const { profile } = useAuthStore()
  const [typers, setTypers] = useState([])
  const channelRef = useRef(null)
  const decayTimers = useRef({})
  const lastSentRef = useRef(0)

  useEffect(() => {
    if (!channelId || !profile?.id) return

    const ch = supabase.channel(`typing:${channelId}`)
    channelRef.current = ch

    ch.on('broadcast', { event: 'typing' }, ({ payload }) => {
      if (payload.userId === profile.id) return

      setTypers((prev) => {
        const without = prev.filter((t) => t.userId !== payload.userId)
        return [...without, { userId: payload.userId, name: payload.name }]
      })

      if (decayTimers.current[payload.userId]) {
        clearTimeout(decayTimers.current[payload.userId])
      }
      decayTimers.current[payload.userId] = setTimeout(() => {
        setTypers((prev) => prev.filter((t) => t.userId !== payload.userId))
      }, TYPING_TTL_MS)
    })

    ch.subscribe()
    return () => {
      supabase.removeChannel(ch)
      Object.values(decayTimers.current).forEach(clearTimeout)
      decayTimers.current = {}
      channelRef.current = null
    }
  }, [channelId, profile?.id])

  const broadcastTyping = useCallback(() => {
    if (!channelRef.current || !profile) return
    const now = Date.now()
    if (now - lastSentRef.current < TYPING_THROTTLE_MS) return
    lastSentRef.current = now

    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: profile.id, name: profile.first_name_ar },
    })
  }, [profile])

  const typingText = typers.length === 0
    ? null
    : typers.length === 1
      ? `${typers[0].name} يكتب...`
      : typers.length === 2
        ? `${typers[0].name} و ${typers[1].name} يكتبون...`
        : `${typers.length} أشخاص يكتبون...`

  return { broadcastTyping, typingText }
}
