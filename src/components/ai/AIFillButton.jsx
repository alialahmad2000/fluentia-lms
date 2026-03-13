import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wand2, Send, Loader2, X, AlertCircle, RefreshCw } from 'lucide-react'

/**
 * AIFillButton – a glass-morphism panel that lets the user describe what they
 * want and the AI fills form fields automatically.
 *
 * Props (controlled by useAIFormFiller hook):
 * @param {boolean}   isOpen        – whether the panel is visible
 * @param {Function}  setIsOpen     – toggle panel visibility
 * @param {boolean}   isProcessing  – true while the AI request is in-flight
 * @param {Function}  onSubmit      – (message: string) => void
 * @param {Object}    result        – { filledFields, filledCount }
 * @param {string}    error         – error message (if any)
 * @param {string[]}  unfilled      – labels of fields the AI could not determine
 * @param {number}    filledCount   – shortcut: result?.filledCount
 */
export default function AIFillButton({
  isOpen,
  setIsOpen,
  isProcessing,
  onSubmit,
  result,
  error,
  unfilled = [],
  filledCount = 0,
}) {
  const [message, setMessage] = useState('')
  const textareaRef = useRef(null)
  const autoCloseTimer = useRef(null)

  // Focus textarea when panel opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 200)
    }
  }, [isOpen])

  // Auto-collapse 3 seconds after successful fill
  useEffect(() => {
    if (result && !error) {
      autoCloseTimer.current = setTimeout(() => {
        setIsOpen(false)
      }, 3000)
    }
    return () => {
      if (autoCloseTimer.current) clearTimeout(autoCloseTimer.current)
    }
  }, [result, error, setIsOpen])

  function handleSubmit() {
    const text = message.trim()
    if (!text || isProcessing) return
    onSubmit(text)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  function handleToggle() {
    setIsOpen(!isOpen)
    if (!isOpen) {
      // Reset input when opening fresh
      setMessage('')
    }
  }

  return (
    <div className="relative" dir="rtl">
      {/* ── Trigger Button ── */}
      <button
        onClick={handleToggle}
        className="
          inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
          bg-sky-500/10 text-sky-400 border border-sky-500/20
          hover:bg-sky-500/20 hover:border-sky-500/30
          backdrop-blur-md transition-all duration-200
          shadow-[0_0_15px_rgba(56,189,248,0.08)]
        "
        title="ملء ذكي بالذكاء الاصطناعي"
      >
        <Wand2 size={16} />
        <span>&#x2728; ملء ذكي</span>
      </button>

      {/* ── Slide-down Panel ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -8 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -8 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="
              absolute top-full right-0 z-50 mt-2 w-[360px]
              bg-gray-900/80 backdrop-blur-xl border border-white/10
              rounded-2xl shadow-2xl overflow-hidden
            "
          >
            <div className="p-4 space-y-3">
              {/* ── Header ── */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sky-400 text-sm font-semibold">
                  <Wand2 size={14} />
                  <span>المساعد الذكي للنماذج</span>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* ── Input Area ── */}
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="اكتب ما تريد بالعربي أو الإنجليزي..."
                  disabled={isProcessing}
                  rows={2}
                  className="
                    w-full bg-gray-800/60 border border-white/10 rounded-xl
                    text-white text-sm placeholder:text-gray-500
                    p-3 pr-3 pl-10 resize-none
                    focus:outline-none focus:border-sky-500/40 focus:ring-1 focus:ring-sky-500/20
                    disabled:opacity-50 transition-all
                  "
                />
                <button
                  onClick={handleSubmit}
                  disabled={!message.trim() || isProcessing}
                  className="
                    absolute left-2 bottom-2 p-1.5 rounded-lg
                    bg-sky-500/20 text-sky-400
                    hover:bg-sky-500/30 disabled:opacity-30
                    transition-all
                  "
                >
                  {isProcessing ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                </button>
              </div>

              {/* ── Processing State ── */}
              {isProcessing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 text-sky-400 text-xs"
                >
                  <Loader2 size={14} className="animate-spin" />
                  <span>جاري التحليل والملء...</span>
                </motion.div>
              )}

              {/* ── Success State ── */}
              {result && !error && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2"
                >
                  <div className="flex items-center gap-2 text-emerald-400 text-sm">
                    <span>&#x2705;</span>
                    <span>
                      تم ملء {filledCount || result.filledCount} حقول — راجع وعدّل ما تحتاج
                    </span>
                  </div>

                  {unfilled.length > 0 && (
                    <div className="text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">
                      <span>لم أتمكن من تحديد: </span>
                      <span className="font-medium">{unfilled.join('، ')}</span>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── Error State ── */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2"
                >
                  <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-2">
                    <AlertCircle size={14} />
                    <span className="flex-1">{error}</span>
                  </div>
                  <button
                    onClick={handleSubmit}
                    disabled={!message.trim()}
                    className="
                      flex items-center gap-1.5 text-xs text-gray-400
                      hover:text-sky-400 transition-colors
                    "
                  >
                    <RefreshCw size={12} />
                    <span>إعادة المحاولة</span>
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
