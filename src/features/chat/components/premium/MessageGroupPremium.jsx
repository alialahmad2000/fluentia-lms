// Groups consecutive messages from the same sender within 4 minutes.
// Other-user groups get a colored gutter avatar (identity at a glance, Telegram style).
import { motion } from 'framer-motion'
import { ease } from '../../lib/motion'
import MessageBubble from '../MessageBubble'
import SenderAvatar from './SenderAvatar'
import { useAuthProfile } from '../../../../stores/authStore'

export default function MessageGroupPremium({ messages, channelId, groupId, onReply, onEdit, animateIn = true }) {
  const profile = useAuthProfile()
  if (!messages.length) return null

  const first = messages[0]
  const isOwn = first.sender_id === profile?.id

  return (
    <div className="px-4" style={{ direction: 'rtl', marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        {!isOwn && (
          <div style={{ width: 34, flexShrink: 0 }}>
            <SenderAvatar sender={first.sender} senderId={first.sender_id} />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          {messages.map((msg, idx) => {
            const count = messages.length
            const position = count === 1 ? 'single' : idx === 0 ? 'first' : idx === count - 1 ? 'last' : 'middle'
            const delay = idx * 0.024
            return (
              <motion.div
                key={msg.id}
                initial={animateIn ? { opacity: 0, y: 6 } : false}
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
      </div>
    </div>
  )
}
