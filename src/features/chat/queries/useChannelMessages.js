import { useInfiniteQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { signedVoiceUrl, signedImageUrl, signedFileUrl } from '../../../lib/chatStorage'

const PAGE_SIZE = 50

export function useChannelMessages(channelId) {
  return useInfiniteQuery({
    queryKey: ['channel-messages', channelId],
    enabled: !!channelId,
    staleTime: 30 * 1000,
    initialPageParam: null,
    queryFn: async ({ pageParam }) => {
      let q = supabase
        .from('group_messages')
        .select(`
          *,
          sender:profiles!sender_id(id, first_name_ar, last_name_ar, avatar_url, role),
          reactions:message_reactions(emoji, user_id),
          reply_message:group_messages!reply_to(id, body, content, type, sender:profiles!sender_id(first_name_ar))
        `)
        .eq('channel_id', channelId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE)

      if (pageParam) {
        q = q.lt('created_at', pageParam)
      }

      const { data, error } = await q
      if (error) throw error

      // Resolve signed URLs for voice/image/file messages
      const resolved = await Promise.all(
        (data ?? []).map(async (msg) => {
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
        })
      )

      return resolved
    },
    getNextPageParam: (lastPage) =>
      lastPage.length === PAGE_SIZE
        ? lastPage[lastPage.length - 1].created_at
        : undefined,
  })
}
