// Premium composer — no channel selector, sends to group's general channel
import { useState, useRef } from 'react'
import { Send, Paperclip, Image, Mic, Megaphone, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSendMessage } from '../../mutations/useSendMessage'
import { uploadChatFile, uploadChatImage } from '../../../../lib/chatStorage'
import VoiceRecorder from '../VoiceRecorder'
import MentionAutocomplete from '../MentionAutocomplete'
import { useGroupAnnouncementChannel } from '../../queries/useGroupGeneralChannel'
import { useTypingIndicator } from '../../realtime/useTypingIndicator'
import { useAuthStore } from '../../../../stores/authStore'
import { popIn } from '../../lib/motion'

const glass = {
  background: 'color-mix(in srgb, var(--ds-bg-elevated) 85%, transparent)',
  backdropFilter: 'blur(24px) saturate(140%)',
  WebkitBackdropFilter: 'blur(24px) saturate(140%)',
  borderTop: '1px solid var(--ds-border-subtle)',
  boxShadow: 'inset 0 1px 0 0 color-mix(in srgb, white 5%, transparent)',
}

export default function PremiumComposer({
  groupId,
  generalChannelId,
  isTrainer,
  replyTo,
  onClearReply,
}) {
  const { profile } = useAuthStore()
  const [input, setInput] = useState('')
  const [uploading, setUploading] = useState(false)
  const [voiceMode, setVoiceMode] = useState(false)
  const [mentions, setMentions] = useState([])
  const [mentionQuery, setMentionQuery] = useState(null)
  const [announcementOpen, setAnnouncementOpen] = useState(false)
  const textareaRef = useRef(null)
  const fileRef = useRef(null)
  const imageRef = useRef(null)

  // All hooks at top
  const sendMessage = useSendMessage(generalChannelId, groupId)
  const { broadcastTyping, typingText } = useTypingIndicator(generalChannelId)
  const { data: announcementChannel } = useGroupAnnouncementChannel(groupId)

  function detectMentionContext() {
    const ta = textareaRef.current
    if (!ta) return
    const before = ta.value.slice(0, ta.selectionStart)
    const match = before.match(/@(\w*)$/)
    setMentionQuery(match ? { query: match[1], start: match.index } : null)
  }

  function handleInput(e) {
    setInput(e.target.value)
    autoResize()
    broadcastTyping()
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
    const name = member.full_name || member.display_name || ''
    setInput(`${before}@${name} ${after}`)
    setMentionQuery(null)
    setMentions((prev) => prev.find((m) => m.id === member.id) ? prev : [...prev, { id: member.id }])
    setTimeout(() => { ta.focus(); const p = before.length + name.length + 2; ta.setSelectionRange(p, p) }, 0)
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || !generalChannelId) return
    setInput(''); setMentions([]); setMentionQuery(null)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    await sendMessage.mutateAsync({
      type: 'text', body: text, content: text,
      reply_to: replyTo?.id ?? null,
      mentions: mentions.map((m) => m.id),
    })
    onClearReply?.()
  }

  function handleKeyDown(e) {
    if (mentionQuery !== null) return
    if (e.key === 'Enter' && !e.shiftKey && window.innerWidth > 768) {
      e.preventDefault(); handleSend()
    }
  }

  async function handleImagePick(e) {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    try {
      const path = await uploadChatImage(file, groupId)
      const img = new window.Image(); img.src = URL.createObjectURL(file)
      await new Promise((res) => { img.onload = res })
      await sendMessage.mutateAsync({ type: 'image', image_url: path, image_width: img.naturalWidth, image_height: img.naturalHeight })
    } catch (err) { console.error(err) } finally { setUploading(false); e.target.value = '' }
  }

  async function handleFilePick(e) {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    try {
      const path = await uploadChatFile(file, groupId)
      await sendMessage.mutateAsync({ type: 'file', file_url: path, file_name: file.name, file_size: file.size, file_mime: file.type })
    } catch (err) { console.error(err) } finally { setUploading(false); e.target.value = '' }
  }

  const canSend = !!input.trim() && !!generalChannelId && !sendMessage.isPending && !uploading

  if (!generalChannelId) return null

  return (
    <div style={{ ...glass, direction: 'rtl', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Typing indicator */}
      {typingText && (
        <p className="px-5 pt-1.5 text-xs italic" style={{ fontFamily: 'Tajawal', color: 'var(--ds-text-muted)' }}>
          {typingText}
        </p>
      )}

      {/* Reply strip */}
      {replyTo && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--ds-border-subtle)]">
          <div className="flex-1 min-w-0 border-r-2 pr-2" style={{ borderColor: 'var(--ds-accent-primary)', paddingInlineStart: 8 }}>
            <p className="text-[11px] truncate" style={{ color: 'var(--ds-accent-primary)', fontFamily: 'Tajawal' }}>
              {replyTo.sender?.display_name || replyTo.sender?.full_name}
            </p>
            <p className="text-xs truncate" style={{ color: 'var(--ds-text-muted)', fontFamily: 'Tajawal' }}>
              {replyTo.body || replyTo.content || '🎙️'}
            </p>
          </div>
          <button onClick={onClearReply} className="p-1" style={{ color: 'var(--ds-text-muted)' }}><X size={14} /></button>
        </div>
      )}

      {/* Mention autocomplete */}
      <div className="relative">
        {mentionQuery !== null && (
          <MentionAutocomplete groupId={groupId} filter={mentionQuery.query} onSelect={handleMentionSelect} onDismiss={() => setMentionQuery(null)} />
        )}
      </div>

      {/* Composer row */}
      <div className="flex items-end gap-2 px-3 py-2.5">
        <input ref={imageRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={handleImagePick} />
        <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip" className="hidden" onChange={handleFilePick} />

        {voiceMode ? (
          <VoiceRecorder channelId={generalChannelId} groupId={groupId} onDone={() => setVoiceMode(false)} />
        ) : (
          <>
            {/* Action icon buttons — 40px circular hit areas */}
            <div className="flex gap-0.5 pb-0.5">
              {[
                { ref: imageRef, icon: <Image size={20} />, label: 'صورة' },
                { ref: fileRef,  icon: <Paperclip size={20} />, label: 'ملف' },
              ].map(({ ref, icon, label }) => (
                <button
                  key={label}
                  onClick={() => ref.current?.click()}
                  disabled={uploading}
                  title={label}
                  className="rounded-full transition-all"
                  style={{
                    width: 40, height: 40,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--ds-text-secondary)',
                    border: '1px solid transparent',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--ds-surface-1)'
                    e.currentTarget.style.borderColor = 'var(--ds-border-subtle)'
                    e.currentTarget.style.color = 'var(--ds-text-primary)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.borderColor = 'transparent'
                    e.currentTarget.style.color = 'var(--ds-text-secondary)'
                  }}
                >
                  {icon}
                </button>
              ))}
            </div>

            {/* Textarea — rounded glass panel, 20px radius, focus ring */}
            <div
              className="flex-1 flex items-end gap-2 px-4 py-2"
              style={{
                background: 'var(--ds-surface-1)',
                border: '1.5px solid var(--ds-border-subtle)',
                borderRadius: 20,
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              onFocusCapture={(e) => {
                e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--ds-accent-primary) 40%, transparent)'
                e.currentTarget.style.boxShadow = '0 0 0 2px color-mix(in srgb, var(--ds-accent-primary) 12%, transparent)'
              }}
              onBlurCapture={(e) => {
                e.currentTarget.style.borderColor = 'var(--ds-border-subtle)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                onSelect={detectMentionContext}
                onClick={detectMentionContext}
                placeholder="اكتب رسالة... اكتب @ لذكر شخص"
                rows={1}
                className="flex-1 resize-none bg-transparent outline-none text-sm"
                style={{
                  fontFamily: 'Tajawal, sans-serif',
                  color: 'var(--ds-text-primary)',
                  lineHeight: 1.7,
                  direction: 'auto',
                  minHeight: 28,
                  maxHeight: 144,
                }}
              />
            </div>

            {/* Send (gold circle) / Mic button */}
            {input.trim() ? (
              <motion.button
                {...popIn}
                onClick={handleSend}
                disabled={!canSend}
                whileTap={{ scale: 0.90 }}
                className="shrink-0 rounded-full flex items-center justify-center pb-0.5"
                style={{
                  width: 40, height: 40,
                  background: canSend
                    ? 'linear-gradient(135deg, var(--ds-accent-primary) 0%, color-mix(in srgb, var(--ds-accent-primary) 70%, black) 100%)'
                    : 'var(--ds-surface-1)',
                  color: canSend ? 'white' : 'var(--ds-text-muted)',
                  opacity: canSend ? 1 : 0.4,
                  boxShadow: canSend ? '0 4px 12px -4px color-mix(in srgb, var(--ds-accent-primary) 45%, transparent)' : 'none',
                }}
              >
                <Send size={17} />
              </motion.button>
            ) : (
              <motion.button
                onClick={() => setVoiceMode(true)}
                whileHover={{ scale: 1.05 }}
                className="shrink-0 rounded-full flex items-center justify-center"
                style={{
                  width: 40, height: 40,
                  color: 'var(--ds-text-secondary)',
                }}
              >
                <Mic size={20} />
              </motion.button>
            )}
          </>
        )}
      </div>

      {/* Announcement FAB (trainer/admin only) */}
      {isTrainer && (
        <>
          <AnnouncementSheet
            open={announcementOpen}
            onClose={() => setAnnouncementOpen(false)}
            groupId={groupId}
            channelId={announcementChannel?.id}
          />
          <motion.button
            onClick={() => setAnnouncementOpen(true)}
            whileTap={{ scale: 0.92 }}
            transition={{ duration: 0.08 }}
            className="fixed bottom-24 left-4 z-30 flex items-center justify-center fab-pulse"
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #fbbf24 0%, color-mix(in srgb, #fbbf24 70%, black) 100%)',
              border: '1px solid color-mix(in srgb, #fbbf24 50%, white)',
              color: 'rgba(255,255,255,0.95)',
            }}
            title="إعلان جديد"
          >
            <Megaphone size={22} style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }} />
          </motion.button>
        </>
      )}
    </div>
  )
}

function AnnouncementSheet({ open, onClose, groupId, channelId }) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const sendMessage = useSendMessage(channelId, groupId)

  async function handlePost() {
    if (!text.trim() || !channelId) return
    setSending(true)
    try {
      await sendMessage.mutateAsync({ type: 'announcement', body: text.trim(), content: text.trim() })
      setText('')
      onClose()
    } catch (err) { console.error(err) } finally { setSending(false) }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl p-5"
            style={{
              background: 'color-mix(in srgb, var(--ds-bg-elevated) 95%, transparent)',
              backdropFilter: 'blur(24px)',
              borderTop: '1px solid color-mix(in srgb, var(--ds-accent-gold) 20%, transparent)',
              direction: 'rtl',
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Megaphone size={18} style={{ color: 'var(--ds-accent-gold)' }} />
              <h3 className="font-bold flex-1 text-right" style={{ fontFamily: 'Tajawal', fontSize: 16, color: 'var(--ds-text-primary)' }}>
                إعلان جديد
              </h3>
              <button onClick={onClose} style={{ color: 'var(--ds-text-muted)' }}><X size={18} /></button>
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="اكتب إعلانك هنا..."
              rows={4}
              className="w-full resize-none rounded-2xl px-4 py-3 text-sm outline-none"
              style={{
                fontFamily: 'Tajawal, sans-serif',
                background: 'var(--ds-surface-1)',
                border: '1px solid var(--ds-border-subtle)',
                color: 'var(--ds-text-primary)',
                lineHeight: 1.7,
                direction: 'auto',
              }}
            />

            <button
              onClick={handlePost}
              disabled={!text.trim() || sending || !channelId}
              className="mt-3 w-full py-3 rounded-2xl font-bold text-sm transition-all disabled:opacity-40"
              style={{
                background: 'var(--ds-accent-gold)',
                color: 'var(--ds-bg-base)',
                fontFamily: 'Tajawal, sans-serif',
              }}
            >
              {sending ? 'جاري الإرسال...' : 'نشر للجميع'}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
