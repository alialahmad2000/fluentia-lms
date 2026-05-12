// Collapses consecutive system messages into a single ghost line.
// 3+ → show collapsed count with expand toggle.
import { useState } from 'react'
import MessageBubbleSystem from '../MessageBubbleSystem'

const COLLAPSE_THRESHOLD = 3

export default function SystemMessageCluster({ messages }) {
  const [expanded, setExpanded] = useState(false)

  if (!messages.length) return null

  if (messages.length < COLLAPSE_THRESHOLD || expanded) {
    return (
      <div>
        {messages.map((m) => (
          <MessageBubbleSystem key={m.id} body={m.body || m.content} compact />
        ))}
        {messages.length >= COLLAPSE_THRESHOLD && (
          <div className="flex justify-center mt-0.5 mb-1">
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
              طي
            </button>
          </div>
        )}
      </div>
    )
  }

  // Collapsed: single summary line
  return (
    <div className="flex items-center justify-center py-1">
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
