// Groups consecutive messages from the same sender within 4 minutes.
// Computes bubble position (single/first/middle/last) for tail radius.
import { motion } from 'framer-motion'
import { ease } from '../../lib/motion'
import MessageBubble from '../MessageBubble'
import { useAuthStore } from '../../../../stores/authStore'

export default function MessageGroupPremium({
  messages,
  channelId,
  groupId,
  onReply,
  onEdit,
}) {
  const { profile } = useAuthStore()
  if (!messages.length) return null

  const first = messages[0]
  const isOwn = first.sender_id === profile?.id

  return (
    <div
      className="px-4"
      style={{ direction: 'rtl', marginBottom: 16 }}
    >
      {messages.map((msg, idx) => {
        const count = messages.length
        const position = count === 1
          ? 'single'
          : idx === 0
            ? 'first'
            : idx === count - 1
              ? 'last'
              : 'middle'

        // 24ms stagger on initial mount; realtime messages get no stagger
        const delay = idx * 0.024

        return (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease, delay }}
          >
            <MessageBubble
              message={msg}
              isGrouped={idx > 0}
              position={position}
              channelId={channelId || msg.channel_id}
              groupId={groupId}
              onReply={onReply}
              onEdit={onEdit}
            />
          </motion.div>
        )
      })}
    </div>
  )
}
