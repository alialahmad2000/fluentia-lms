// Full implementation in Phase F — this stub shows a coming-soon shell
import { useParams } from 'react-router-dom'
import { MessageSquare } from 'lucide-react'
import ChatContext from '../providers/ChatContext'

export default function GroupChatPage() {
  const { groupId, channelSlug = 'general', messageId } = useParams()

  return (
    <ChatContext.Provider value={{ groupId, channelSlug, messageId }}>
      <div className="flex h-[calc(100dvh-80px)] bg-[var(--bg-page)]">
        {/* Phase F will render ChannelSidebar + MessageList here */}
        <div className="flex-1 flex items-center justify-center flex-col gap-4 text-[var(--text-muted)]">
          <MessageSquare size={48} className="opacity-30" />
          <p className="text-lg font-medium" style={{ fontFamily: 'Tajawal, sans-serif' }}>
            جاري تحميل المحادثة...
          </p>
          <p className="text-sm opacity-60">
            {channelSlug} / {groupId}
          </p>
        </div>
      </div>
    </ChatContext.Provider>
  )
}
