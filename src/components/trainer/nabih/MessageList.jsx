import { useEffect, useRef } from 'react'
import { Sparkles } from 'lucide-react'
import './MessageList.css'

function renderMarkdown(text) {
  return text
    .split('\n')
    .map((line, i) => {
      const bold = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      const italic = bold.replace(/\*(.+?)\*/g, '<em>$1</em>')
      if (line.startsWith('- ') || line.startsWith('• ')) {
        return <li key={i} dangerouslySetInnerHTML={{ __html: italic.slice(2) }} />
      }
      if (!line.trim()) return <br key={i} />
      return <p key={i} dangerouslySetInnerHTML={{ __html: italic }} />
    })
}

function Bubble({ msg }) {
  const isTrainer = msg.role === 'trainer'
  return (
    <div className={`nab-bubble ${isTrainer ? 'nab-bubble--trainer' : 'nab-bubble--nabih'}`}>
      {!isTrainer && (
        <div className="nab-bubble__avatar" aria-hidden="true">
          <Sparkles size={14} />
        </div>
      )}
      <div className={`nab-bubble__body ${isTrainer ? 'nab-bubble__body--trainer' : 'nab-bubble__body--nabih'}`}>
        <div className="nab-bubble__content">
          {renderMarkdown(msg.content)}
        </div>
        <div className="nab-bubble__time">
          {new Date(msg.created_at).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="nab-bubble nab-bubble--nabih">
      <div className="nab-bubble__avatar" aria-hidden="true">
        <Sparkles size={14} />
      </div>
      <div className="nab-typing" aria-label="نبيه يفكّر">
        <span />
        <span />
        <span />
      </div>
    </div>
  )
}

export function MessageList({ messages = [], loading, isPending }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, isPending])

  if (loading && messages.length === 0) {
    return (
      <div className="nab-msg-list nab-msg-list--loading">
        <div className="nab-skeleton" style={{ width: '60%', height: '2.5rem' }} />
        <div className="nab-skeleton" style={{ width: '80%', height: '4rem', alignSelf: 'flex-end' }} />
      </div>
    )
  }

  return (
    <div className="nab-msg-list">
      {messages.map((msg) => (
        <Bubble key={msg.id} msg={msg} />
      ))}
      {isPending && <TypingIndicator />}
      <div ref={bottomRef} />
    </div>
  )
}
