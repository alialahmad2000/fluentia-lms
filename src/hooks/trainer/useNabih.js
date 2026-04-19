import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

export function useConversations() {
  const profile = useAuthStore((s) => s.profile)
  return useQuery({
    queryKey: ['nabih', 'conversations', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_nabih_conversation_list', { p_limit: 50 })
      if (error) throw error
      return data || []
    },
    enabled: !!profile?.id,
    staleTime: 30_000,
  })
}

export function useConversationMessages(conversationId) {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: ['nabih', 'messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return []
      const { data, error } = await supabase
        .from('nabih_messages')
        .select('id, role, content, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data || []
    },
    enabled: !!conversationId,
    staleTime: 0,
  })

  useEffect(() => {
    if (!conversationId) return
    const channel = supabase
      .channel(`nabih-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'nabih_messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ['nabih', 'messages', conversationId] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [conversationId, qc])

  return query
}

export function useNewConversation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ title, firstMessage } = {}) => {
      const { data, error } = await supabase.rpc('new_nabih_conversation', {
        p_title: title || null,
        p_first_message: firstMessage || null,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['nabih', 'conversations'] })
    },
  })
}

export function useSendMessage() {
  const profile = useAuthStore((s) => s.profile)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ conversationId, message }) => {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nabih-chat`
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          user_message: message,
          trainer_id: profile.id,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(err.error || 'Failed to send message')
      }
      return res.json()
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['nabih', 'messages', vars.conversationId] })
      qc.invalidateQueries({ queryKey: ['nabih', 'conversations'] })
    },
  })
}

export function useRenameConversation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ conversationId, newTitle }) => {
      const { error } = await supabase.rpc('rename_nabih_conversation', {
        p_conversation_id: conversationId,
        p_new_title: newTitle,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['nabih', 'conversations'] }),
  })
}

export function useDeleteConversation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (conversationId) => {
      const { error } = await supabase.rpc('delete_nabih_conversation', {
        p_conversation_id: conversationId,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['nabih', 'conversations'] }),
  })
}
