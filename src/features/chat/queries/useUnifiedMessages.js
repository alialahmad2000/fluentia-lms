// Fetches messages for the unified stream.
// Phase R3 will add lens filtering via server-side RPC.
// Phase R2: fetches the group's general channel (all messages, no lens).
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { signedVoiceUrl, signedImageUrl, signedFileUrl } from '../../../lib/chatStorage'

const PAGE_SIZE = 60

export function useUnifiedMessages(groupId, lens = 'all') {
  const qc = useQueryClient()

  const query = useInfiniteQuery({
    queryKey: ['unified-messages', groupId, lens],
    enabled: !!groupId,
    staleTime: 30_000,
    initialPageParam: null,
    queryFn: async ({ pageParam }) => {
      // Fetch from ALL channels in this group (unified stream)
      let q = supabase
        .from('group_messages')
        .select(`
          *,
          sender:profiles!sender_id(id, full_name, display_name, avatar_url, role),
          reactions:message_reactions(emoji, user_id),
          reply_message:group_messages!reply_to(
            id, body, content, type,
            sender:profiles!sender_id(full_name, display_name)
          )
        `)
        .eq('group_id', groupId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE)

      // Apply lens filters client-side for now (R3 replaces with RPC)
      if (pageParam) q = q.lt('created_at', pageParam)

      const { data, error } = await q
      if (error) throw error

      const rows = data ?? []

      // Lens client-side filtering
      const filtered = applyLensFilter(rows, lens)

      // Resolve signed URLs
      return Promise.all(filtered.map(async (msg) => {
        if (msg.type === 'voice' && msg.voice_url) {
          try { msg._signedVoiceUrl = await signedVoiceUrl(msg.voice_url) } catch (_) {}
        }
        if (msg.type === 'image' && msg.image_url) {
          try { msg._signedImageUrl = await signedImageUrl(msg.image_url) } catch (_) {}
        }
        if (msg.type === 'file' && msg.file_url) {
          try { msg._signedFileUrl = await signedFileUrl(msg.file_url) } catch (_) {}
        }
        return msg
      }))
    },
    getNextPageParam: (lastPage) =>
      lastPage.length === PAGE_SIZE
        ? lastPage[lastPage.length - 1].created_at
        : undefined,
  })

  // Realtime: invalidate on new messages for this group
  useEffect(() => {
    if (!groupId) return
    const ch = supabase
      .channel(`unified:group:${groupId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'group_messages',
        filter: `group_id=eq.${groupId}`,
      }, () => qc.invalidateQueries({ queryKey: ['unified-messages', groupId] }))
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'group_messages',
        filter: `group_id=eq.${groupId}`,
      }, () => qc.invalidateQueries({ queryKey: ['unified-messages', groupId] }))
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'message_reactions',
      }, () => qc.invalidateQueries({ queryKey: ['unified-messages', groupId] }))
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [groupId, qc])

  return query
}

function applyLensFilter(messages, lens) {
  switch (lens) {
    case 'voice':
      return messages.filter((m) => m.type === 'voice')
    case 'files':
      return messages.filter((m) => m.type === 'file' || m.type === 'image')
    case 'important':
      return messages.filter(
        (m) => m.type === 'announcement' || m.is_pinned ||
               (m.reactions?.length ?? 0) >= 3
      )
    case 'questions':
      return messages.filter(
        (m) => (m.body || m.content || '').includes('?') ||
               (m.body || m.content || '').includes('؟')
      )
    // 'mentions' requires auth.uid() — handled server-side in R3
    default:
      return messages
  }
}
