import { useState, useRef, useCallback } from 'react'
import { Send, Paperclip, Image, Mic, X } from 'lucide-react'
import { useSendMessage } from '../mutations/useSendMessage'
import { useUploadVoice } from '../mutations/useUploadVoice'
import { uploadChatFile, uploadChatImage } from '../../../lib/chatStorage'
import ReplyPreviewBar from './ReplyPreviewBar'
import { useTypingIndicator } from '../realtime/useTypingIndicator'

export default function MessageComposer({ channelId, groupId, replyTo, onClearReply, isAnnouncement }) {
  const [input, setInput] = useState('')
  const [uploading, setUploading] = useState(false)
  const textareaRef = useRef(null)
  const fileRef = useRef(null)
  const imageRef = useRef(null)

  const sendMessage = useSendMessage(channelId, groupId)
  const uploadVoice = useUploadVoice(channelId, groupId)
  const { broadcastTyping, typingText } = useTypingIndicator(channelId)

  function handleInput(e) {
    setInput(e.target.value)
    autoResize()
    broadcastTyping()
  }

  function autoResize() {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 144)}px`
  }

  async function handleSend() {
    const text = input.trim()
    if (!text) return
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    await sendMessage.mutateAsync({
      type: isAnnouncement ? 'announcement' : 'text',
      body: text,
      content: text,
      reply_to: replyTo?.id ?? null,
      mentions: [],
    })
    onClearReply?.()
  }

  function handleKeyDown(e) {
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
      className="border-t border-[var(--border)] bg-[var(--bg-card)]"
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

      <div className="flex items-end gap-2 p-3">
        {/* File pickers (hidden) */}
        <input ref={imageRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={handleImagePick} />
        <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip" className="hidden" onChange={handleFilePick} />

        {/* Attach + image buttons */}
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

        {/* Text area */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="اكتب رسالة..."
          className="flex-1 resize-none bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-sky-500/50 transition-colors"
          style={{ fontFamily: 'Tajawal, sans-serif', direction: 'auto', minHeight: 44, maxHeight: 144 }}
          rows={1}
        />

        {/* Send button */}
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
      </div>
    </div>
  )
}
