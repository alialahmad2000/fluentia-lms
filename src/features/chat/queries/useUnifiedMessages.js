// Fetches messages for the unified stream.
// Phase R3 will add lens filtering via server-side RPC.
// Phase R2: fetches the group's general channel (all messages, no lens).
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query'
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
      // Server-side RPC with lens filter (replaces per-channel query)
      const { data, error } = await supabase.rpc('get_group_messages', {
        p_group_id: groupId,
        p_lens:     lens,
        p_before:   pageParam ?? null,
        p_limit:    PAGE_SIZE,
      })
      if (error) throw error

      const rows = data ?? []

      // Enrich with related data (sender, reactions, reply preview)
      // RPC returns raw group_messages rows — join client-side for now
      const ids = rows.map((r) => r.id)
      let reactions = []
      if (ids.length) {
        const { data: rxn } = await supabase
          .from('message_reactions').select('message_id, emoji, user_id').in('message_id', ids)
        reactions = rxn ?? []
      }
      const senderIds = [...new Set(rows.map((r) => r.sender_id).filter(Boolean))]
      let senders = []
      if (senderIds.length) {
        const { data: sp } = await supabase
          .from('profiles').select('id, full_name, display_name, avatar_url, role').in('id', senderIds)
        senders = sp ?? []
      }
      const senderMap = Object.fromEntries(senders.map((s) => [s.id, s]))
      const rxnMap = {}
      for (const r of reactions) {
        rxnMap[r.message_id] = rxnMap[r.message_id] ?? []
        rxnMap[r.message_id].push(r)
      }

      const enriched = rows.map((m) => ({
        ...m,
        sender:    senderMap[m.sender_id] ?? null,
        reactions: rxnMap[m.id] ?? [],
      }))

      const filtered = enriched

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

export function useGroupLensCounts(groupId) {
  return useQuery({
    queryKey: ['group-lens-counts', groupId],
    enabled: !!groupId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_group_lens_counts', { p_group_id: groupId })
      if (error) throw error
      return data?.[0] ?? {}
    },
  })
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
