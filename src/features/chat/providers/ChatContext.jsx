import { createContext, useContext, useState } from 'react'

const ChatContext = createContext({
  groupId: null,
  channelSlug: 'general',
  messageId: null,
  replyTo: null,
  setReplyTo: () => {},
})

export function ChatProvider({ groupId, channelSlug, messageId, children }) {
  const [replyTo, setReplyTo] = useState(null)

  return (
    <ChatContext.Provider value={{ groupId, channelSlug, messageId, replyTo, setReplyTo }}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChatContext() {
  return useContext(ChatContext)
}

export default ChatContext
