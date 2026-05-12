// Collapses consecutive system messages.
// Rule: 2+ messages → collapsed "N رسائل نظام · عرض". 1 → single ghost line.
// tight=true: 8px padding (between real messages). false: normal spacing.
import { useState } from 'react'
import MessageBubbleSystem from '../MessageBubbleSystem'

export default function SystemMessageCluster({ messages, tight = false }) {
  const [expanded, setExpanded] = useState(false)

  if (!messages.length) return null

  const padding = tight
    ? { paddingTop: 8, paddingBottom: 8 }
    : { paddingTop: 12, paddingBottom: 12 }

  // Single system message — just the ghost line, no toggle
  if (messages.length === 1) {
    return (
      <div style={padding}>
        <MessageBubbleSystem body={messages[0].body || messages[0].content} compact />
      </div>
    )
  }

  // 2+ system messages — collapsed by default
  if (!expanded) {
    return (
      <div
        className="flex items-center justify-center"
        style={padding}
      >
        <span
          style={{
            fontFamily: 'Tajawal, sans-serif',
            fontSize: 11,
            color: 'var(--ds-text-muted)',
            opacity: 0.6,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <span style={{ fontSize: 10 }}>◌</span>
          {messages.length} رسائل نظام ·{' '}
          <button
            onClick={() => setExpanded(true)}
            style={{
              fontFamily: 'Tajawal, sans-serif',
              fontSize: 11,
              color: 'var(--ds-accent-primary)',
              opacity: 0.8,
              cursor: 'pointer',
              background: 'none',
              border: 'none',
              padding: 0,
              textDecoration: 'underline',
            }}
          >
            عرض
          </button>
        </span>
      </div>
    )
  }

  // Expanded state
  return (
    <div style={padding}>
      {messages.map((m) => (
        <MessageBubbleSystem key={m.id} body={m.body || m.content} compact />
      ))}
      <div className="flex justify-center mt-0.5">
        <button
          onClick={() => setExpanded(false)}
          style={{
            fontFamily: 'Tajawal, sans-serif',
            fontSize: 11,
            color: 'var(--ds-text-muted)',
            opacity: 0.6,
            cursor: 'pointer',
            background: 'none',
            border: 'none',
            textDecoration: 'underline',
          }}
        >
          إخفاء
        </button>
      </div>
    </div>
  )
}
