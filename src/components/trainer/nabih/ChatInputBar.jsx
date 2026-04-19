import { useState, useRef } from 'react'
import { Send } from 'lucide-react'
import './ChatInputBar.css'

const MAX_CHARS = 2000

export function ChatInputBar({ onSend, disabled, placeholder }) {
  const [value, setValue] = useState('')
  const textareaRef = useRef(null)

  const handleSend = () => {
    const text = value.trim()
    if (!text || disabled) return
    onSend(text)
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleChange = (e) => {
    setValue(e.target.value)
    const ta = textareaRef.current
    if (ta) {
      ta.style.height = 'auto'
      ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'
    }
  }

  const over = value.length > MAX_CHARS

  return (
    <div className="nab-input-bar">
      <textarea
        ref={textareaRef}
        className={`nab-input-bar__textarea ${over ? 'nab-input-bar__textarea--over' : ''}`}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || 'اكتب لنبيه...'}
        disabled={disabled}
        rows={1}
        maxLength={MAX_CHARS + 200}
        dir="auto"
      />
      <div className="nab-input-bar__footer">
        {value.length > 500 && (
          <span className={`nab-input-bar__counter ${over ? 'nab-input-bar__counter--over' : ''}`}>
            {value.length}/{MAX_CHARS}
          </span>
        )}
        <span className="nab-input-bar__hint">Shift+Enter للسطر الجديد</span>
        <button
          className="nab-input-bar__send"
          onClick={handleSend}
          disabled={disabled || !value.trim() || over}
          aria-label="إرسال"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  )
}
