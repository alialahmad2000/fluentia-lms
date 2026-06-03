import { useMutation } from '@tanstack/react-query'
import { uploadVoice } from '../../../lib/chatStorage'
import { useSendMessage } from './useSendMessage'
import { useSendDM } from '../queries/useDM'

export function useUploadVoice(channelId, groupId, dmThreadId) {
  const isDM = !!dmThreadId
  const groupSend = useSendMessage(channelId, groupId)
  const dmSend = useSendDM(isDM ? dmThreadId : undefined)
  const sendMessage = isDM ? dmSend : groupSend
  const scope = isDM ? `dm/${dmThreadId}` : groupId

  return useMutation({
    mutationFn: async ({ blob, durationMs, waveform }) => {
      const path = await uploadVoice(blob, scope)
      return sendMessage.mutateAsync({
        type: 'voice',
        voice_url: path,
        voice_duration_ms: durationMs,
        voice_waveform: waveform,
      })
    },
  })
}
