// Collapses consecutive system messages.
// Rule: 2+ messages → a quiet glass pill "N رسالة نظام · عرض". 1 → single ghost line.
// tight=true: 8px padding (between real messages). false: normal spacing.
import { useState } from 'react'
import MessageBubbleSystem from '../MessageBubbleSystem'

function sysLabel(n) {
  if (n === 2) return 'رسالتان نظام'
  if (n <= 10) return `${n} رسائل نظام`
  return `${n} رسالة نظام`
}

export default function SystemMessageCluster({ messages, tight = false }) {
  const [expanded, setExpanded] = useState(false)

  if (!messages.length) return null

  const padding = tight ? { paddingTop: 8, paddingBottom: 8 } : { paddingTop: 12, paddingBottom: 12 }

  if (messages.length === 1) {
    return (
      <div style={padding}>
        <MessageBubbleSystem body={messages[0].body || messages[0].content} compact />
      </div>
    )
  }

  if (!expanded) {
    return (
      <div className="flex items-center justify-center" style={padding}>
        <button
          onClick={() => setExpanded(true)}
          className="inline-flex items-center gap-1.5 select-none transition-[filter] hover:brightness-110"
          style={{
            fontFamily: 'Tajawal, sans-serif', fontSize: 12, color: 'var(--ds-text-tertiary)',
            padding: '5px 14px', borderRadius: 999,
            background: 'color-mix(in srgb, var(--ds-bg-elevated) 55%, transparent)',
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid var(--ds-border-subtle)', cursor: 'pointer',
          }}
        >
          {sysLabel(messages.length)}
          <span style={{ color: 'var(--ds-accent-gold)', fontWeight: 600 }}>· عرض</span>
        </button>
      </div>
    )
  }

  return (
    <div style={padding}>
      {messages.map((m) => (
        <MessageBubbleSystem key={m.id} body={m.body || m.content} compact />
      ))}
      <div className="flex justify-center mt-1.5">
        <button
          onClick={() => setExpanded(false)}
          style={{ fontFamily: 'Tajawal, sans-serif', fontSize: 12, color: 'var(--ds-accent-gold)', cursor: 'pointer', background: 'none', border: 'none' }}
        >
          إخفاء
        </button>
      </div>
    </div>
  )
}
