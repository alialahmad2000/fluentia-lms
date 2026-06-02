import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Bug, ImagePlus, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from '../ui/FluentiaToast'
import { submitBugReport } from '../../lib/bugReport'

const MAX_BYTES = 10 * 1024 * 1024 // 10MB

// Simple, fast "report a problem" sheet. One textarea + an optional screenshot
// (paste with Ctrl/⌘+V, pick a file, or drop). RTL, mobile-first.
export default function BugReportModal({ open, onClose }) {
  const [description, setDescription] = useState('')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const fileInputRef = useRef(null)

  const reset = useCallback(() => {
    setDescription(''); setFile(null); setDone(false); setSubmitting(false)
    setPreview((p) => { if (p) URL.revokeObjectURL(p); return null })
  }, [])

  const attach = useCallback((f) => {
    if (!f) return
    if (!f.type?.startsWith('image/')) { toast({ type: 'error', title: 'الملف لازم يكون صورة' }); return }
    if (f.size > MAX_BYTES) { toast({ type: 'error', title: 'حجم الصورة كبير (الحد ١٠ ميجابايت)' }); return }
    setFile(f)
    setPreview((p) => { if (p) URL.revokeObjectURL(p); return URL.createObjectURL(f) })
  }, [])

  // Paste-an-image anywhere while the sheet is open.
  useEffect(() => {
    if (!open) return
    const onPaste = (e) => {
      const items = e.clipboardData?.items || []
      for (const it of items) {
        if (it.type?.startsWith('image/')) {
          const f = it.getAsFile()
          if (f) { attach(f); e.preventDefault(); break }
        }
      }
    }
    const onKey = (e) => { if (e.key === 'Escape' && !submitting) onClose() }
    window.addEventListener('paste', onPaste)
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('paste', onPaste); window.removeEventListener('keydown', onKey) }
  }, [open, attach, onClose, submitting])

  // Reset whenever it re-opens.
  useEffect(() => { if (open) reset() }, [open, reset])

  const canSubmit = description.trim().length >= 3 || !!file

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    try {
      const res = await submitBugReport({ description, file })
      setDone(true)
      if (res?.screenshot_tried && !res?.screenshot_attached) {
        toast({ type: 'success', title: 'وصلنا بلاغك ✅', description: 'تعذّر رفع الصورة لكن البلاغ اتسجّل.' })
      } else {
        toast({ type: 'success', title: 'وصلنا بلاغك ✅', description: 'شكراً لك — فريق الدعم بيشتغل عليه.' })
      }
      setTimeout(() => { onClose() }, 1100)
    } catch (err) {
      toast({ type: 'error', title: 'ما قدرنا نرسل البلاغ', description: err?.message || 'حاول مرة ثانية' })
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[1001] flex items-end sm:items-center justify-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ background: 'rgba(3,6,15,0.6)', backdropFilter: 'blur(4px)' }}
          onMouseDown={(e) => { if (e.target === e.currentTarget && !submitting) onClose() }}
        >
          <motion.div
            dir="rtl"
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="w-full sm:max-w-md mx-auto rounded-t-3xl sm:rounded-3xl overflow-hidden"
            style={{
              background: 'var(--ds-bg-elevated, var(--surface-raised, #11131c))',
              border: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.09))',
              boxShadow: '0 -8px 48px rgba(0,0,0,0.5)',
              maxHeight: '92vh',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(56,189,248,0.14)', color: '#38bdf8' }}>
                  <Bug size={18} />
                </div>
                <div>
                  <div style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 700, fontSize: 17, color: 'var(--text-primary,#f8fafc)' }}>
                    أبلغ عن مشكلة
                  </div>
                  <div style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 12, color: 'var(--text-tertiary,#64748b)' }}>
                    ساعدنا نطوّر المنصة — وصف بسيط وصورة إن أمكن
                  </div>
                </div>
              </div>
              <button type="button" onClick={() => !submitting && onClose()} aria-label="إغلاق"
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ color: 'var(--text-tertiary,#64748b)' }}>
                <X size={18} />
              </button>
            </div>

            {done ? (
              <div className="px-5 py-10 flex flex-col items-center text-center gap-3">
                <CheckCircle2 size={48} style={{ color: '#22c55e' }} />
                <div style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 700, fontSize: 18, color: 'var(--text-primary,#f8fafc)' }}>
                  وصلنا بلاغك، شكراً لك 💙
                </div>
              </div>
            ) : (
              <div className="px-5 pb-5 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(92vh - 80px)' }}>
                {/* Description */}
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="وش المشكلة اللي واجهتك؟ (مثال: ضغطت على كلمة في القراءة وما طلعت الترجمة)"
                  rows={4}
                  autoFocus
                  className="w-full rounded-2xl px-4 py-3 resize-none outline-none"
                  style={{
                    fontFamily: "'Tajawal',sans-serif", fontSize: 15, lineHeight: 1.7,
                    background: 'var(--surface-base, rgba(255,255,255,0.03))',
                    border: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.1))',
                    color: 'var(--text-primary,#f8fafc)',
                  }}
                />

                {/* Screenshot */}
                {!preview ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full rounded-2xl flex flex-col items-center justify-center gap-1.5 py-6 transition-colors"
                    style={{
                      border: '1.5px dashed var(--ds-border-subtle, rgba(255,255,255,0.18))',
                      background: 'transparent', color: 'var(--text-tertiary,#94a3b8)',
                      fontFamily: "'Tajawal',sans-serif",
                    }}
                  >
                    <ImagePlus size={22} />
                    <span style={{ fontSize: 13.5, fontWeight: 600 }}>أرفق صورة للمشكلة (اختياري)</span>
                    <span style={{ fontSize: 11.5 }}>الصق صورة بـ Ctrl/⌘+V أو اضغط لاختيارها</span>
                  </button>
                ) : (
                  <div className="relative rounded-2xl overflow-hidden" style={{ border: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.1))' }}>
                    <img src={preview} alt="معاينة" style={{ width: '100%', maxHeight: 220, objectFit: 'contain', background: '#000' }} />
                    <button type="button"
                      onClick={() => { setFile(null); setPreview((p) => { if (p) URL.revokeObjectURL(p); return null }) }}
                      aria-label="إزالة الصورة"
                      className="absolute top-2 left-2 w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}>
                      <X size={16} />
                    </button>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) attach(f); e.target.value = '' }} />

                {/* Submit */}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canSubmit || submitting}
                  className="w-full rounded-2xl py-3.5 flex items-center justify-center gap-2 transition-all"
                  style={{
                    fontFamily: "'Tajawal',sans-serif", fontWeight: 700, fontSize: 15.5,
                    background: canSubmit ? 'linear-gradient(180deg,#38bdf8,#0ea5e9)' : 'rgba(255,255,255,0.06)',
                    color: canSubmit ? '#06121f' : 'var(--text-tertiary,#64748b)',
                    cursor: canSubmit && !submitting ? 'pointer' : 'not-allowed',
                    boxShadow: canSubmit ? '0 8px 24px -8px rgba(14,165,233,0.6)' : 'none',
                  }}
                >
                  {submitting ? <><Loader2 size={18} className="animate-spin" /> جارٍ الإرسال…</> : 'إرسال البلاغ'}
                </button>
                <p style={{ textAlign: 'center', fontFamily: "'Tajawal',sans-serif", fontSize: 11.5, color: 'var(--text-tertiary,#64748b)' }}>
                  يوصل البلاغ لفريق الدعم فوراً مع رابط الصفحة الحالية.
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
