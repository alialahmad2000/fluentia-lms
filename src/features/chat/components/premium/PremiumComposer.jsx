// Premium composer — sends to the group's general channel. No floating FAB:
// the announcement action lives inline (trainer/admin), so nothing is anchored
// to the viewport and nothing can overlap the sidebar or mobile nav.
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Send, Paperclip, Image, Mic, Megaphone, X, Pencil } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSendMessage } from '../../mutations/useSendMessage'
import { useSendDM } from '../../queries/useDM'
import { useEditMessage } from '../../mutations/useEditMessage'
import { uploadChatFile, uploadChatImage } from '../../../../lib/chatStorage'
import { toast } from '../../../../components/ui/FluentiaToast'
import { supabase } from '../../../../lib/supabase'
import { invokeWithRetry } from '../../../../lib/invokeWithRetry'
import VoiceRecorder from '../VoiceRecorder'
import MentionPicker from './MentionPicker'
import SenderAvatar from './SenderAvatar'
import { senderColor } from '../../lib/senderColors'
import { useGroupAnnouncementChannel } from '../../queries/useGroupGeneralChannel'
import { useTypingIndicator } from '../../realtime/useTypingIndicator'
import { useAuthProfile } from '../../../../stores/authStore'
import { popIn } from '../../lib/motion'

const glass = {
  background: 'color-mix(in srgb, var(--ds-bg-elevated) 72%, transparent)',
  backdropFilter: 'blur(28px) saturate(150%)',
  WebkitBackdropFilter: 'blur(28px) saturate(150%)',
  borderTop: '1px solid color-mix(in srgb, var(--ds-accent-gold) 10%, var(--ds-border-subtle))',
  boxShadow: '0 -10px 30px -18px rgba(0,0,0,0.5), inset 0 1px 0 0 color-mix(in srgb, white 6%, transparent)',
}

export default function PremiumComposer({
  groupId,
  generalChannelId,
  isTrainer,
  replyTo,
  onClearReply,
  editing,
  onClearEdit,
  dmThreadId,
}) {
  const isDM = !!dmThreadId
  const draftKey = `fluentia:draft:${isDM ? 'dm:' + dmThreadId : 'group:' + groupId}`
  const profile = useAuthProfile()
  const [input, setInput] = useState('')
  const [uploading, setUploading] = useState(false)
  const [voiceMode, setVoiceMode] = useState(false)
  const [mentions, setMentions] = useState([])
  const [mentionQuery, setMentionQuery] = useState(null)
  const [announcementOpen, setAnnouncementOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const textareaRef = useRef(null)
  const fileRef = useRef(null)
  const imageRef = useRef(null)
  const editingIdRef = useRef(null)

  const groupSend = useSendMessage(generalChannelId, groupId)
  const dmSend = useSendDM(isDM ? dmThreadId : undefined)
  const sendMessage = isDM ? dmSend : groupSend
  const editMessage = useEditMessage(generalChannelId)
  const { broadcastTyping, typers } = useTypingIndicator(isDM ? `dm:${dmThreadId}` : generalChannelId)
  const { data: announcementChannel } = useGroupAnnouncementChannel(isDM ? undefined : groupId)

  // Prefill once when entering edit mode
  useEffect(() => {
    if (editing && editing.id !== editingIdRef.current) {
      editingIdRef.current = editing.id
      setInput(editing.body || editing.content || '')
      setTimeout(() => { textareaRef.current?.focus(); autoResize() }, 0)
    }
    if (!editing) editingIdRef.current = null
  }, [editing])

  // Auto-saved drafts — restore on conversation change, persist as you type (never while editing)
  useEffect(() => {
    if (editing) return
    try { const d = localStorage.getItem(draftKey); setInput(d || ''); if (d) setTimeout(autoResize, 0) } catch { /* ignore */ }
  }, [draftKey]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (editing) return
    try { if (input.trim()) localStorage.setItem(draftKey, input); else localStorage.removeItem(draftKey) } catch { /* ignore */ }
  }, [input, draftKey, editing])

  function detectMentionContext() {
    const ta = textareaRef.current
    if (!ta || isDM) return            // DMs are 1:1 — no @mentions
    const before = ta.value.slice(0, ta.selectionStart)
    const match = before.match(/@([\p{L}\p{M}]*)$/u)   // Arabic-aware @ trigger
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
    const max = Math.min(160, Math.round((window.innerHeight || 700) * 0.32))
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, max)}px`
  }

  function handleMentionSelect(member) {
    const ta = textareaRef.current
    if (!ta || !mentionQuery) return
    const before = input.slice(0, mentionQuery.start)
    const after = input.slice(ta.selectionStart)
    // NBSP-join the name so a multi-word mention chips as ONE unit; trailing space ends it
    const name = (member.full_name || member.display_name || '').trim().replace(/\s+/g, String.fromCharCode(160))
    setInput(`${before}@${name} ${after}`)
    setMentionQuery(null)
    setMentions((prev) => prev.find((m) => m.id === member.id) ? prev : [...prev, { id: member.id }])
    setTimeout(() => { ta.focus(); const p = before.length + name.length + 2; ta.setSelectionRange(p, p) }, 0)
  }

  function resetComposer() {
    setInput(''); setMentions([]); setMentionQuery(null)
    try { localStorage.removeItem(draftKey) } catch { /* ignore */ }
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || (isDM ? !dmThreadId : !generalChannelId)) return

    if (editing) {
      const target = editing
      resetComposer()
      onClearEdit?.()
      try {
        await editMessage.mutateAsync({ messageId: target.id, body: text, createdAt: target.created_at })
      } catch (err) { console.error(err); toast({ type: 'error', title: 'تعذّر تعديل الرسالة' }) }
      return
    }

    resetComposer()
    const sent = await sendMessage.mutateAsync({
      type: 'text', body: text, content: text,
      reply_to: replyTo?.id ?? null,
      mentions: mentions.map((m) => m.id),
    })
    onClearReply?.()
    const url = text.match(/https?:\/\/[^\s<]+/)?.[0]
    if (url && sent?.id) unfurlLink(sent.id, url)
  }

  // Best-effort link preview: fetch OG data after send + patch the message (realtime refreshes the bubble).
  async function unfurlLink(messageId, url) {
    try {
      const { data, error } = await invokeWithRetry('link-preview', { body: { url } })
      if (error || !data || (!data.title && !data.image)) return
      await supabase.from('group_messages').update({
        link_url: data.url || url, link_title: data.title || null, link_description: data.description || null,
        link_image_url: data.image || null, link_domain: data.domain || null,
      }).eq('id', messageId)
    } catch { /* best-effort */ }
  }

  function handleKeyDown(e) {
    if (mentionQuery !== null) return
    if (e.key === 'Escape' && editing) { resetComposer(); onClearEdit?.(); return }
    if (e.key === 'Enter' && !e.shiftKey && window.innerWidth > 768) {
      e.preventDefault(); handleSend()
    }
  }

  async function handleImagePick(e) {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    try {
      const path = await uploadChatImage(file, isDM ? `dm/${dmThreadId}` : groupId)
      const img = new window.Image(); img.src = URL.createObjectURL(file)
      await new Promise((res) => { img.onload = res })
      await sendMessage.mutateAsync({ type: 'image', image_url: path, image_width: img.naturalWidth, image_height: img.naturalHeight })
    } catch (err) { console.error(err); toast({ type: 'error', title: 'تعذّر رفع الصورة', description: 'تحقّقي من الاتصال وحاولي مجددًا' }) } finally { setUploading(false); e.target.value = '' }
  }

  async function handleFilePick(e) {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    try {
      const path = await uploadChatFile(file, isDM ? `dm/${dmThreadId}` : groupId)
      await sendMessage.mutateAsync({ type: 'file', file_url: path, file_name: file.name, file_size: file.size, file_mime: file.type })
    } catch (err) { console.error(err); toast({ type: 'error', title: 'تعذّر رفع الملف', description: 'تحقّقي من الاتصال وحاولي مجددًا' }) } finally { setUploading(false); e.target.value = '' }
  }

  const canSend = !!input.trim() && (isDM ? !!dmThreadId : !!generalChannelId) && !sendMessage.isPending && !editMessage.isPending && !uploading
  const isLoading = isDM ? !dmThreadId : !generalChannelId

  return (
    <div style={{ ...glass, direction: 'rtl' }}>
      {/* Typing bubble — typer's avatar + animated colored dots */}
      <AnimatePresence>
        {typers && typers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
            className="flex items-center gap-2 px-4 pt-2.5" style={{ direction: 'rtl' }}
          >
            <SenderAvatar sender={{ full_name: typers[0].name, avatar_url: typers[0].avatar }} senderId={typers[0].userId} size={26} />
            <div className="flex items-center gap-1 px-3 py-2"
              style={{ background: 'color-mix(in srgb, var(--ds-bg-elevated) 76%, transparent)', border: '1px solid var(--ds-border-subtle)', borderRadius: '14px 14px 14px 5px' }}>
              {[0, 1, 2].map((i) => (
                <span key={i} className="chat-typing-dot w-1.5 h-1.5 rounded-full"
                  style={{ background: senderColor(typers[0].userId).base, animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
            {typers.length > 1 && <span className="text-[11px]" style={{ fontFamily: 'Tajawal', color: 'var(--ds-text-muted)' }}>+{typers.length - 1}</span>}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit banner */}
      {editing && (
        <div className="flex items-center gap-2 px-4 py-2 border-b" style={{ borderColor: 'var(--ds-border-subtle)' }}>
          <Pencil size={14} style={{ color: 'var(--ds-accent-gold)' }} />
          <div className="flex-1 min-w-0">
            <p className="text-[11px]" style={{ color: 'var(--ds-accent-gold)', fontFamily: 'Tajawal' }}>تعديل الرسالة</p>
            <p className="text-xs truncate" style={{ color: 'var(--ds-text-muted)', fontFamily: 'Tajawal' }}>
              {editing.body || editing.content}
            </p>
          </div>
          <button onClick={() => { resetComposer(); onClearEdit?.() }} className="p-1" style={{ color: 'var(--ds-text-muted)' }} aria-label="إلغاء التعديل"><X size={14} /></button>
        </div>
      )}

      {/* Reply strip */}
      {!editing && replyTo && (
        <div className="flex items-center gap-2 px-4 py-2 border-b" style={{ borderColor: 'var(--ds-border-subtle)' }}>
          <div className="flex-1 min-w-0" style={{ borderInlineStart: `2.5px solid ${senderColor(replyTo.sender_id).base}`, paddingInlineStart: 8 }}>
            <p className="text-[11px] truncate" style={{ color: senderColor(replyTo.sender_id).base, fontFamily: 'Tajawal' }}>
              رد على {replyTo.sender?.display_name || replyTo.sender?.full_name || ''}
            </p>
            <p className="text-xs truncate" style={{ color: 'var(--ds-text-muted)', fontFamily: 'Tajawal' }}>
              {replyTo.body || replyTo.content || '🎙️'}
            </p>
          </div>
          <button onClick={onClearReply} className="p-1" style={{ color: 'var(--ds-text-muted)' }} aria-label="إلغاء الرد"><X size={14} /></button>
        </div>
      )}

      {/* Mention picker */}
      <div className="relative">
        {mentionQuery !== null && (
          <MentionPicker groupId={groupId} filter={mentionQuery.query} onSelect={handleMentionSelect} onDismiss={() => setMentionQuery(null)} />
        )}
      </div>

      {/* Loading — channel not resolved yet */}
      {isLoading && (
        <div className="flex items-center justify-center px-4 py-3" style={{ minHeight: 56 }}>
          <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'color-mix(in srgb, var(--ds-accent-primary) 40%, transparent)', borderTopColor: 'transparent' }} />
        </div>
      )}

      {!isLoading && (
        <div className="flex items-end gap-1.5 px-3 py-2.5">
          <input ref={imageRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={handleImagePick} />
          <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip" className="hidden" onChange={handleFilePick} />

          {voiceMode ? (
            <VoiceRecorder channelId={generalChannelId} groupId={groupId} dmThreadId={dmThreadId} onDone={() => setVoiceMode(false)} />
          ) : (
            <>
              {/* Attachments + announcement */}
              <div className="flex gap-0.5 pb-0.5">
                <ActionIcon label="صورة" onClick={() => imageRef.current?.click()} disabled={uploading}><Image size={20} /></ActionIcon>
                <ActionIcon label="ملف" onClick={() => fileRef.current?.click()} disabled={uploading}><Paperclip size={20} /></ActionIcon>
                {isTrainer && !isDM && (
                  <ActionIcon label="إعلان للجميع" gold onClick={() => setAnnouncementOpen(true)}>
                    <Megaphone size={20} />
                  </ActionIcon>
                )}
              </div>

              {/* Textarea */}
              <div
                className="flex-1 flex items-end gap-2 px-4 py-2"
                style={{
                  background: 'var(--ds-surface-1)',
                  border: focused
                    ? '1.5px solid color-mix(in srgb, var(--ds-accent-gold) 45%, transparent)'
                    : '1.5px solid var(--ds-border-subtle)',
                  borderRadius: 22,
                  boxShadow: focused ? '0 0 0 3px color-mix(in srgb, var(--ds-accent-gold) 14%, transparent)' : 'none',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
              >
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleInput}
                  onKeyDown={handleKeyDown}
                  onSelect={detectMentionContext}
                  onClick={detectMentionContext}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder="اكتب رسالة… اكتب @ لذكر شخص"
                  rows={1}
                  className="flex-1 resize-none bg-transparent outline-none"
                  style={{ fontFamily: 'Tajawal, sans-serif', fontSize: 16, color: 'var(--ds-text-primary)', lineHeight: 1.6, direction: 'auto', minHeight: 28, maxHeight: 160 }}
                />
              </div>

              {/* Send (gold) or Mic */}
              {input.trim() ? (
                <motion.button
                  {...popIn}
                  onClick={handleSend}
                  disabled={!canSend}
                  whileTap={{ scale: 0.9 }}
                  className="shrink-0 rounded-full flex items-center justify-center pb-0.5"
                  style={{
                    width: 42, height: 42,
                    background: canSend
                      ? 'linear-gradient(135deg, var(--ds-accent-gold) 0%, color-mix(in srgb, var(--ds-accent-gold) 68%, #7a4f00) 100%)'
                      : 'var(--ds-surface-1)',
                    color: canSend ? '#1a1205' : 'var(--ds-text-muted)',
                    opacity: canSend ? 1 : 0.45,
                    border: canSend ? '1px solid color-mix(in srgb, var(--ds-accent-gold) 55%, white)' : '1px solid transparent',
                    boxShadow: canSend ? '0 6px 16px -5px color-mix(in srgb, var(--ds-accent-gold) 55%, transparent)' : 'none',
                  }}
                  aria-label={editing ? 'حفظ التعديل' : 'إرسال'}
                >
                  <Send size={18} />
                </motion.button>
              ) : (
                <motion.button
                  onClick={() => setVoiceMode(true)}
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                  className="shrink-0 rounded-full flex items-center justify-center"
                  style={{ width: 42, height: 42, color: 'var(--ds-text-secondary)' }}
                  aria-label="تسجيل صوتي"
                >
                  <Mic size={20} />
                </motion.button>
              )}
            </>
          )}
        </div>
      )}

      {/* Announcement sheet (trainer/admin, groups only) */}
      {isTrainer && !isDM && (
        <AnnouncementSheet
          open={announcementOpen}
          onClose={() => setAnnouncementOpen(false)}
          groupId={groupId}
          channelId={announcementChannel?.id}
        />
      )}
    </div>
  )
}

function ActionIcon({ children, label, onClick, disabled, gold }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="rounded-full transition-all flex items-center justify-center"
      style={{ width: 40, height: 40, color: gold ? 'var(--ds-accent-gold)' : 'var(--ds-text-secondary)', border: '1px solid transparent' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = gold ? 'color-mix(in srgb, var(--ds-accent-gold) 12%, transparent)' : 'var(--ds-surface-1)'
        e.currentTarget.style.borderColor = gold ? 'color-mix(in srgb, var(--ds-accent-gold) 30%, transparent)' : 'var(--ds-border-subtle)'
      }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent' }}
    >
      {children}
    </button>
  )
}

function AnnouncementSheet({ open, onClose, groupId, channelId }) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const sendMessage = useSendMessage(channelId, groupId)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  async function handlePost() {
    if (!text.trim() || !channelId) return
    setSending(true)
    try {
      await sendMessage.mutateAsync({ type: 'announcement', body: text.trim(), content: text.trim() })
      setText('')
      onClose()
    } catch (err) { console.error(err) } finally { setSending(false) }
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/55" style={{ zIndex: 70 }} onClick={onClose} />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 rounded-t-3xl p-5"
            style={{
              zIndex: 71,
              background: 'color-mix(in srgb, var(--ds-bg-elevated) 96%, transparent)',
              backdropFilter: 'blur(24px)',
              borderTop: '1px solid color-mix(in srgb, var(--ds-accent-gold) 22%, transparent)',
              direction: 'rtl',
              paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Megaphone size={18} style={{ color: 'var(--ds-accent-gold)' }} />
              <h3 className="font-bold flex-1 text-right" style={{ fontFamily: 'Tajawal', fontSize: 16, color: 'var(--ds-text-primary)' }}>إعلان جديد</h3>
              <button onClick={onClose} style={{ color: 'var(--ds-text-muted)' }} aria-label="إغلاق"><X size={18} /></button>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="اكتب إعلانك هنا…"
              rows={4}
              autoFocus
              className="w-full resize-none rounded-2xl px-4 py-3 text-sm outline-none"
              style={{ fontFamily: 'Tajawal, sans-serif', background: 'var(--ds-surface-1)', border: '1px solid var(--ds-border-subtle)', color: 'var(--ds-text-primary)', lineHeight: 1.7, direction: 'auto' }}
            />
            <button
              onClick={handlePost}
              disabled={!text.trim() || sending || !channelId}
              className="mt-3 w-full py-3 rounded-2xl font-bold text-sm transition-all disabled:opacity-40"
              style={{ background: 'var(--ds-accent-gold)', color: '#1a1205', fontFamily: 'Tajawal, sans-serif' }}
            >
              {sending ? 'جاري الإرسال…' : 'نشر للجميع'}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
