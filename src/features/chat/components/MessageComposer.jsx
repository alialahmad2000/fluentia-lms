import { useState, useRef, useCallback } from 'react'
import { Send, Paperclip, Image, Mic } from 'lucide-react'
import { useSendMessage } from '../mutations/useSendMessage'
import { uploadChatFile, uploadChatImage } from '../../../lib/chatStorage'
import ReplyPreviewBar from './ReplyPreviewBar'
import VoiceRecorder from './VoiceRecorder'
import MentionAutocomplete from './MentionAutocomplete'
import { useTypingIndicator } from '../realtime/useTypingIndicator'

// Returns { query: string, start: number } if cursor is inside @<partial>,
// otherwise null.
function getMentionQuery(text, cursorPos) {
  const before = text.slice(0, cursorPos)
  const match = before.match(/@(\w*)$/)
  if (!match) return null
  return { query: match[1], start: match.index }
}

export default function MessageComposer({ channelId, groupId, replyTo, onClearReply, isAnnouncement }) {
  const [input, setInput] = useState('')
  const [uploading, setUploading] = useState(false)
  const [voiceMode, setVoiceMode] = useState(false)
  const [mentions, setMentions] = useState([])          // { id, first_name_ar }[]
  const [mentionQuery, setMentionQuery] = useState(null) // { query, start } | null
  const textareaRef = useRef(null)
  const fileRef = useRef(null)
  const imageRef = useRef(null)

  // All hooks declared before any conditional logic
  const sendMessage = useSendMessage(channelId, groupId)
  const { broadcastTyping, typingText } = useTypingIndicator(channelId)

  function detectMentionContext() {
    const ta = textareaRef.current
    if (!ta) return
    const ctx = getMentionQuery(ta.value, ta.selectionStart)
    setMentionQuery(ctx)
  }

  function handleInput(e) {
    setInput(e.target.value)
    autoResize()
    broadcastTyping()
    detectMentionContext()
  }

  function handleSelect(e) {
    detectMentionContext()
  }

  function autoResize() {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 144)}px`
  }

  function handleMentionSelect(member) {
    const ta = textareaRef.current
    if (!ta || !mentionQuery) return

    const before = input.slice(0, mentionQuery.start)
    const after = input.slice(ta.selectionStart)
    const name = member.first_name_ar ?? ''
    const newText = `${before}@${name} ${after}`
    setInput(newText)
    setMentionQuery(null)
    setMentions((prev) => {
      if (prev.find((m) => m.id === member.id)) return prev
      return [...prev, { id: member.id, name }]
    })
    // Re-focus textarea
    setTimeout(() => {
      if (ta) {
        const pos = before.length + name.length + 2
        ta.focus()
        ta.setSelectionRange(pos, pos)
      }
    }, 0)
  }

  async function handleSend() {
    const text = input.trim()
    if (!text) return
    setInput('')
    setMentions([])
    setMentionQuery(null)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    await sendMessage.mutateAsync({
      type: isAnnouncement ? 'announcement' : 'text',
      body: text,
      content: text,
      reply_to: replyTo?.id ?? null,
      mentions: mentions.map((m) => m.id),
    })
    onClearReply?.()
  }

  function handleKeyDown(e) {
    // While mention autocomplete is open: arrow keys / enter / escape handled by component
    if (mentionQuery !== null) return
    if (e.key === 'Enter' && !e.shiftKey && window.innerWidth > 768) {
      e.preventDefault()
      handleSend()
    }
  }

  async function handleImagePick(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const path = await uploadChatImage(file, groupId)
      const img = new window.Image()
      img.src = URL.createObjectURL(file)
      await new Promise((res) => { img.onload = res })
      await sendMessage.mutateAsync({
        type: 'image',
        image_url: path,
        image_width: img.naturalWidth,
        image_height: img.naturalHeight,
      })
    } catch (err) {
      console.error('Image upload failed:', err)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleFilePick(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const path = await uploadChatFile(file, groupId)
      await sendMessage.mutateAsync({
        type: 'file',
        file_url: path,
        file_name: file.name,
        file_size: file.size,
        file_mime: file.type,
      })
    } catch (err) {
      console.error('File upload failed:', err)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const canSend = input.trim().length > 0 && !sendMessage.isPending && !uploading

  return (
    <div
      className="border-t border-[var(--border)] bg-[var(--bg-card)] relative"
      style={{ direction: 'rtl' }}
    >
      <ReplyPreviewBar replyTo={replyTo} onCancel={onClearReply} />

      {typingText && (
        <div className="px-4 py-1 text-xs text-[var(--text-muted)] italic" style={{ fontFamily: 'Tajawal, sans-serif' }}>
          {typingText}
        </div>
      )}

      {isAnnouncement && (
        <div className="px-4 py-1 text-xs text-amber-400 bg-amber-400/5 border-b border-[var(--border)]" style={{ fontFamily: 'Tajawal, sans-serif' }}>
          ✦ أنت تكتب في قناة الإعلانات
        </div>
      )}

      {/* Mention autocomplete — rendered inside the composer container for correct positioning */}
      {mentionQuery !== null && (
        <MentionAutocomplete
          groupId={groupId}
          filter={mentionQuery.query}
          onSelect={handleMentionSelect}
          onDismiss={() => setMentionQuery(null)}
        />
      )}

      <div className="flex items-end gap-2 p-3">
        <input ref={imageRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={handleImagePick} />
        <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip" className="hidden" onChange={handleFilePick} />

        {voiceMode && (
          <VoiceRecorder channelId={channelId} groupId={groupId} onDone={() => setVoiceMode(false)} />
        )}

        {!voiceMode && (
          <>
            <div className="flex gap-1 pb-1">
              <button
                onClick={() => imageRef.current?.click()}
                className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] rounded-lg transition-colors"
                style={{ minWidth: 36, minHeight: 36 }}
                disabled={uploading}
                title="إرسال صورة"
              >
                <Image size={18} />
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] rounded-lg transition-colors"
                style={{ minWidth: 36, minHeight: 36 }}
                disabled={uploading}
                title="إرسال ملف"
              >
                <Paperclip size={18} />
              </button>
            </div>

            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              onSelect={handleSelect}
              onClick={handleSelect}
              placeholder="اكتب رسالة... اكتب @ لذكر شخص"
              className="flex-1 resize-none bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-sky-500/50 transition-colors"
              style={{ fontFamily: 'Tajawal, sans-serif', direction: 'auto', minHeight: 44, maxHeight: 144 }}
              rows={1}
            />

            {input.trim() ? (
              <button
                onClick={handleSend}
                disabled={!canSend}
                className={`p-2 rounded-xl transition-all shrink-0 pb-1 ${
                  canSend
                    ? 'bg-sky-500 text-white hover:bg-sky-400 shadow-lg shadow-sky-500/20'
                    : 'bg-[var(--surface)] text-[var(--text-muted)] cursor-not-allowed'
                }`}
                style={{ minWidth: 44, minHeight: 44 }}
              >
                <Send size={18} />
              </button>
            ) : (
              <button
                onClick={() => setVoiceMode(true)}
                className="p-2 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-colors shrink-0 pb-1"
                style={{ minWidth: 44, minHeight: 44 }}
                title="رسالة صوتية"
              >
                <Mic size={18} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
