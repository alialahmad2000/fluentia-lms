import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import {
  useConversations,
  useConversationMessages,
  useNewConversation,
  useSendMessage,
} from '@/hooks/trainer/useNabih'
import { ConversationsSidebar } from '@/components/trainer/nabih/ConversationsSidebar'
import { MessageList } from '@/components/trainer/nabih/MessageList'
import { ChatInputBar } from '@/components/trainer/nabih/ChatInputBar'
import { SuggestedPrompts } from '@/components/trainer/nabih/SuggestedPrompts'
import './NabihPage.css'

export default function NabihPage() {
  const { conversationId } = useParams()
  const navigate = useNavigate()

  const { data: conversations = [] } = useConversations()
  const { data: messages = [], isLoading: msgsLoading } = useConversationMessages(conversationId)
  const newConv = useNewConversation()
  const sendMsg = useSendMessage()
  const [isSending, setIsSending] = useState(false)

  const handleSend = async (text) => {
    if (!text.trim() || isSending) return
    setIsSending(true)
    try {
      if (!conversationId) {
        const result = await newConv.mutateAsync({ firstMessage: text })
        const convId = result.conversation_id
        navigate(`/trainer/nabih/${convId}`)
        await sendMsg.mutateAsync({ conversationId: convId, message: text })
      } else {
        await sendMsg.mutateAsync({ conversationId, message: text })
      }
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="nab-page" dir="rtl">
      <div className="nab-layout">
        {/* Sidebar */}
        <aside className="nab-layout__sidebar">
          <ConversationsSidebar
            conversations={conversations}
            activeId={conversationId}
            onSelect={(id) => navigate(`/trainer/nabih/${id}`)}
            onNew={() => navigate('/trainer/nabih')}
          />
        </aside>

        {/* Main area */}
        <main className="nab-layout__main">
          {!conversationId ? (
            <div className="nab-welcome">
              <div className="nab-welcome__mark">
                <Sparkles size={36} />
              </div>
              <h2 className="nab-welcome__title">مرحباً، أنا نبيه</h2>
              <p className="nab-welcome__sub">
                مساعدك الشخصي. أعرف طلابك، أداءهم، وحالتهم — اسألني أي شي.
              </p>
              <SuggestedPrompts onPick={handleSend} />
            </div>
          ) : (
            <div className="nab-chat">
              <div className="nab-chat__messages">
                <MessageList
                  messages={messages}
                  loading={msgsLoading}
                  isPending={isSending}
                />
              </div>
            </div>
          )}

          <div className="nab-layout__input">
            <ChatInputBar
              onSend={handleSend}
              disabled={isSending}
              placeholder={conversationId ? 'اكتب لنبيه...' : 'ابدأ محادثة...'}
            />
          </div>
        </main>
      </div>
    </div>
  )
}
