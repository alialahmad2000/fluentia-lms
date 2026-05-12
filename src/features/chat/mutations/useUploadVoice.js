import { useMutation, useQueryClient } from '@tanstack/react-query'
import { uploadVoice } from '../../../lib/chatStorage'
import { useSendMessage } from './useSendMessage'

export function useUploadVoice(channelId, groupId) {
  const sendMessage = useSendMessage(channelId, groupId)

  return useMutation({
    mutationFn: async ({ blob, durationMs, waveform }) => {
      const path = await uploadVoice(blob, groupId)
      return sendMessage.mutateAsync({
        type: 'voice',
        voice_url: path,
        voice_duration_ms: durationMs,
        voice_waveform: waveform,
      })
    },
  })
}
