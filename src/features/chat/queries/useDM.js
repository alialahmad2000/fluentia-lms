// Direct-message data layer. DMs are stored in group_messages (dm_thread_id) so
// they reuse the whole premium chat; these hooks mirror the group equivalents.
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuthProfile, useAuthImpersonation } from '../../../stores/authStore'
import { signedVoiceUrl, signedImageUrl, signedFileUrl } from '../../../lib/chatStorage'

const PAGE_SIZE = 60

export async function getOrCreateDMThread(otherId) {
  const { data, error } = await supabase.rpc('dm_get_or_create_thread', { p_other: otherId })
  if (error) throw error
  return data // thread uuid
}

export function useDMThreads() {
  const qc = useQueryClient()
  const profile = useAuthProfile()
  const query = useQuery({
    queryKey: ['dm-threads'],
    enabled: !!profile?.id,
    staleTime: 20_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('dm_list_threads')
      if (error) throw error
      return data ?? []
    },
  })
  useEffect(() => {
    if (!profile?.id) return
    const ch = supabase
      .channel('dm-threads-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dm_threads' },
        () => qc.invalidateQueries({ queryKey: ['dm-threads'] }))
      .subscribe()
    return () => { ch.unsubscribe(); supabase.removeChannel(ch) }
  }, [profile?.id, qc])
  return query
}

export function useDMContacts() {
  const profile = useAuthProfile()
  const impersonation = useAuthImpersonation()
  // When an admin is impersonating, show the picker as that user would see it
  // (the server ignores p_as_user unless the real caller is an admin).
  const asUser = impersonation?.userId ?? null
  return useQuery({
    queryKey: ['dm-contacts', asUser ?? profile?.id],
    enabled: !!profile?.id,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('dm_list_contacts', asUser ? { p_as_user: asUser } : {})
      if (error) throw error
      return data ?? []
    },
  })
}

export function useDMThreadMeta(threadId) {
  // resolve the "other" person for the header from the threads list (cheap) or directly
  const profile = useAuthProfile()
  return useQuery({
    queryKey: ['dm-thread-meta', threadId, profile?.id],
    enabled: !!threadId && !!profile?.id,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data: t } = await supabase.from('dm_threads').select('user_lo, user_hi').eq('id', threadId).maybeSingle()
      if (!t) return null
      const otherId = t.user_lo === profile.id ? t.user_hi : t.user_lo
      const { data: p } = await supabase.from('profiles').select('id, full_name, display_name, avatar_url, role').eq('id', otherId).maybeSingle()
      return { otherId, profile: p }
    },
  })
}

export function useDMMessages(threadId) {
  const qc = useQueryClient()
  const query = useInfiniteQuery({
    queryKey: ['dm-messages', threadId],
    enabled: !!threadId,
    staleTime: 30_000,
    initialPageParam: null,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await supabase.rpc('get_dm_messages', { p_thread: threadId, p_before: pageParam ?? null, p_limit: PAGE_SIZE })
      if (error) throw error
      const rows = data ?? []
      const ids = rows.map((r) => r.id)
      let reactions = []
      if (ids.length) {
        const { data: rxn } = await supabase.from('message_reactions').select('message_id, emoji, user_id').in('message_id', ids)
        reactions = rxn ?? []
      }
      const senderIds = [...new Set(rows.map((r) => r.sender_id).filter(Boolean))]
      let senders = []
      if (senderIds.length) {
        const { data: sp } = await supabase.from('profiles').select('id, full_name, display_name, avatar_url, role').in('id', senderIds)
        senders = sp ?? []
      }
      const senderMap = Object.fromEntries(senders.map((s) => [s.id, s]))
      const rxnMap = {}
      for (const r of reactions) { (rxnMap[r.message_id] ||= []).push(r) }
      const enriched = rows.map((m) => ({ ...m, sender: senderMap[m.sender_id] ?? null, reactions: rxnMap[m.id] ?? [] }))
      return Promise.all(enriched.map(async (msg) => {
        if (msg.type === 'voice' && msg.voice_url) { try { msg._signedVoiceUrl = await signedVoiceUrl(msg.voice_url) } catch (_) {} }
        if (msg.type === 'image' && msg.image_url) { try { msg._signedImageUrl = await signedImageUrl(msg.image_url) } catch (_) {} }
        if (msg.type === 'file' && msg.file_url) { try { msg._signedFileUrl = await signedFileUrl(msg.file_url) } catch (_) {} }
        return msg
      }))
    },
    getNextPageParam: (lastPage) => (lastPage.length === PAGE_SIZE ? lastPage[lastPage.length - 1].created_at : undefined),
  })

  useEffect(() => {
    if (!threadId) return
    const ch = supabase
      .channel(`dm:msgs:${threadId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_messages', filter: `dm_thread_id=eq.${threadId}` },
        () => { qc.invalidateQueries({ queryKey: ['dm-messages', threadId] }); qc.invalidateQueries({ queryKey: ['dm-threads'] }) })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' },
        () => qc.invalidateQueries({ queryKey: ['dm-messages', threadId] }))
      .subscribe()
    return () => { ch.unsubscribe(); supabase.removeChannel(ch) }
  }, [threadId, qc])

  return query
}

export function useSendDM(threadId) {
  const qc = useQueryClient()
  const profile = useAuthProfile()
  const key = ['dm-messages', threadId]
  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await supabase
        .from('group_messages')
        .insert({ dm_thread_id: threadId, sender_id: profile.id, ...payload })
        .select().single()
      if (error) throw error
      return data
    },
    onMutate: async (payload) => {
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('fluentia:chat-send'))
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData(key)
      const optimistic = {
        id: `optimistic-${Date.now()}`, dm_thread_id: threadId, sender_id: profile.id,
        sender: { id: profile.id, full_name: profile.full_name, display_name: profile.display_name, avatar_url: profile.avatar_url, role: profile.role },
        reactions: [], created_at: new Date().toISOString(), deleted_at: null, is_pinned: false, is_edited: false, _optimistic: true, ...payload,
      }
      qc.setQueryData(key, (old) => old?.pages?.length ? { ...old, pages: [[optimistic, ...old.pages[0]], ...old.pages.slice(1)] } : old)
      return { previous }
    },
    onError: (_e, _p, ctx) => { if (ctx?.previous) qc.setQueryData(key, ctx.previous) },
    onSettled: () => { qc.invalidateQueries({ queryKey: key }); qc.invalidateQueries({ queryKey: ['dm-threads'] }) },
  })
}

// Total unread (group + DMs) for the sidebar badge.
export function useChatUnread() {
  const qc = useQueryClient()
  const profile = useAuthProfile()
  const query = useQuery({
    queryKey: ['chat-unread-badge', profile?.id],
    enabled: !!profile?.id,
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_chat_unread_badge')
      if (error) return 0
      return data ?? 0
    },
  })
  useEffect(() => {
    if (!profile?.id) return
    const invalidate = () => qc.invalidateQueries({ queryKey: ['chat-unread-badge'] })
    const ch = supabase
      .channel('chat-unread-' + Math.random().toString(36).slice(2))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_messages' }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'channel_read_cursors' }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dm_thread_reads' }, invalidate)
      .subscribe()
    return () => { ch.unsubscribe(); supabase.removeChannel(ch) }
  }, [profile?.id, qc])
  return query.data ?? 0
}

// The other DM member's last_read_at — drives ✓✓ read receipts (live).
export function useDMOtherRead(threadId) {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: ['dm-other-read', threadId],
    enabled: !!threadId,
    staleTime: 5_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('dm_other_last_read', { p_thread: threadId })
      if (error) return null
      return data ?? null
    },
  })
  useEffect(() => {
    if (!threadId) return
    const ch = supabase
      .channel(`dm:reads:${threadId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dm_thread_reads', filter: `thread_id=eq.${threadId}` },
        () => qc.invalidateQueries({ queryKey: ['dm-other-read', threadId] }))
      .subscribe()
    return () => { ch.unsubscribe(); supabase.removeChannel(ch) }
  }, [threadId, qc])
  return query.data ?? null
}

export function useDMMarkRead(threadId) {
  const profile = useAuthProfile()
  const qc = useQueryClient()
  const flushRef = useRef(null)
  return useCallback(() => {
    if (!threadId || !profile?.id) return
    if (flushRef.current) clearTimeout(flushRef.current)
    flushRef.current = setTimeout(async () => {
      await supabase.from('dm_thread_reads').upsert(
        { thread_id: threadId, user_id: profile.id, last_read_at: new Date().toISOString() },
        { onConflict: 'thread_id,user_id' })
      qc.invalidateQueries({ queryKey: ['dm-threads'] })
    }, 500)
  }, [threadId, profile?.id, qc])
}
