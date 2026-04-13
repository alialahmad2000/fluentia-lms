import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Globe, Lightbulb, BookOpen, Loader2, Check, Volume2, Copy, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from '../ui/FluentiaToast'

function extractSentence(text, selectionStart) {
  const before = text.substring(0, selectionStart)
  const after = text.substring(selectionStart)
  const sentStart = Math.max(
    before.lastIndexOf('.') + 1,
    before.lastIndexOf('!') + 1,
    before.lastIndexOf('?') + 1,
    0
  )
  let sentEnd = after.search(/[.!?]/)
  sentEnd = sentEnd === -1 ? text.length : selectionStart + sentEnd + 1
  return text.substring(sentStart, sentEnd).trim()
}

export default function TextSelectionTooltip({ containerRef, studentId, unitId, readingId, onWordSaved, savedWordSet }) {
  const [tooltip, setTooltip] = useState(null)       // { text, wordEl, contextSentence, isSaved }
  const [aiResult, setAiResult] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [saveState, setSaveState] = useState('idle')  // idle | saving | saved | removing
  const [popupPos, setPopupPos] = useState(null)      // { x, y, showAbove }
  const aiCache = useRef({})
  const popupRef = useRef(null)
  const pointerState = useRef({ downTime: 0, target: null, pointerId: null })
  const longPressTimer = useRef(null)
  const isLongPress = useRef(false)

  // ─── Smart Word Selection (Fix 1) ────────────────────
  // Disable native text selection on the container, handle tap vs long-press manually
  useEffect(() => {
    const container = containerRef?.current
    if (!container) return

    // Apply user-select: none to prevent native selection on tap
    container.style.userSelect = 'none'
    container.style.webkitUserSelect = 'none'
    container.style.webkitTouchCallout = 'none'

    return () => {
      container.style.userSelect = ''
      container.style.webkitUserSelect = ''
      container.style.webkitTouchCallout = ''
    }
  }, [containerRef])

  const openTooltipForWord = useCallback((wordText, wordEl) => {
    if (!wordText || wordText.length < 1) return
    const cleanWord = wordText.replace(/[.,!?;:'"()\[\]]/g, '').trim()
    if (!cleanWord) return

    // Get context sentence
    const fullText = containerRef.current?.textContent || ''
    const selIdx = fullText.indexOf(cleanWord)
    const contextSentence = selIdx >= 0 ? extractSentence(fullText, selIdx) : cleanWord

    const isSaved = savedWordSet?.has(cleanWord.toLowerCase())

    setTooltip({ text: cleanWord, wordEl, contextSentence, isSaved })
    setAiResult(null)
    setSaveState(isSaved ? 'saved' : 'idle')
  }, [containerRef, savedWordSet])

  // Handle pointer events for tap vs long-press
  useEffect(() => {
    const container = containerRef?.current
    if (!container) return

    const handlePointerDown = (e) => {
      // Find the closest word span
      const wordSpan = e.target.closest('[data-word-index]') ||
                       e.target.closest('button.text-sky-300') // curriculum vocab
      if (!wordSpan) return

      pointerState.current = { downTime: Date.now(), target: wordSpan, pointerId: e.pointerId }
      isLongPress.current = false

      // Start long-press timer — after 400ms enable native selection
      longPressTimer.current = setTimeout(() => {
        isLongPress.current = true
        // Re-enable native selection for multi-word drag
        container.style.userSelect = 'text'
        container.style.webkitUserSelect = 'text'
      }, 400)
    }

    const handlePointerUp = (e) => {
      clearTimeout(longPressTimer.current)
      const elapsed = Date.now() - pointerState.current.downTime

      if (isLongPress.current) {
        // Long-press path — read native selection
        isLongPress.current = false
        // Re-disable native selection after reading
        setTimeout(() => {
          container.style.userSelect = 'none'
          container.style.webkitUserSelect = 'none'
        }, 50)

        const selection = window.getSelection()
        if (selection && !selection.isCollapsed) {
          const text = selection.toString().trim()
          if (text.length >= 1 && text.length <= 200) {
            // Check selection is within our container
            const range = selection.getRangeAt(0)
            if (container.contains(range.commonAncestorContainer)) {
              const rangeRect = range.getBoundingClientRect()
              // Create a virtual element for positioning
              const virtualEl = { getBoundingClientRect: () => rangeRect }
              openTooltipForWord(text, virtualEl)
              selection.removeAllRanges()
              return
            }
          }
        }
        return
      }

      // Tap path — single word selection
      if (elapsed < 400 && pointerState.current.target) {
        const wordSpan = pointerState.current.target
        const wordText = wordSpan.textContent?.trim()
        if (wordText) {
          e.preventDefault()
          openTooltipForWord(wordText, wordSpan)
        }
      }
    }

    const handlePointerCancel = () => {
      clearTimeout(longPressTimer.current)
      isLongPress.current = false
    }

    container.addEventListener('pointerdown', handlePointerDown)
    container.addEventListener('pointerup', handlePointerUp)
    container.addEventListener('pointercancel', handlePointerCancel)
    return () => {
      container.removeEventListener('pointerdown', handlePointerDown)
      container.removeEventListener('pointerup', handlePointerUp)
      container.removeEventListener('pointercancel', handlePointerCancel)
      clearTimeout(longPressTimer.current)
    }
  }, [containerRef, openTooltipForWord])

  // ─── Smart Positioning (Fix 3) ──────────────────────
  useLayoutEffect(() => {
    if (!tooltip?.wordEl || !popupRef.current) {
      setPopupPos(null)
      return
    }

    const wordRect = typeof tooltip.wordEl.getBoundingClientRect === 'function'
      ? tooltip.wordEl.getBoundingClientRect()
      : null
    if (!wordRect) return

    const popupEl = popupRef.current
    const popupHeight = popupEl.offsetHeight || 200
    const popupWidth = popupEl.offsetWidth || 260
    const gap = 10
    const vw = window.innerWidth
    const vh = window.innerHeight

    // Decide above or below
    const spaceAbove = wordRect.top
    const spaceBelow = vh - wordRect.bottom
    const showAbove = spaceAbove > popupHeight + gap || spaceAbove > spaceBelow

    const y = showAbove
      ? wordRect.top - popupHeight - gap
      : wordRect.bottom + gap

    // Center horizontally on word, clamp to viewport
    let x = wordRect.left + wordRect.width / 2 - popupWidth / 2
    x = Math.max(8, Math.min(vw - popupWidth - 8, x))

    setPopupPos({ x, y: Math.max(8, y), showAbove })
  }, [tooltip])

  // Close on tap outside
  useEffect(() => {
    if (!tooltip) return
    const handler = (e) => {
      if (popupRef.current?.contains(e.target)) return
      // Don't close if tapping on a word (it'll open a new tooltip)
      if (e.target.closest('[data-word-index]')) return
      setTooltip(null)
    }
    // Delay listener to avoid closing on the same tap that opened it
    const timer = setTimeout(() => {
      document.addEventListener('pointerdown', handler)
    }, 100)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('pointerdown', handler)
    }
  }, [tooltip])

  // ─── Action Handlers (Fix 2) ────────────────────────

  // Save word — uses state, not window.getSelection()
  const handleSaveWord = useCallback(async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!tooltip || !studentId || saveState === 'saving') return
    setSaveState('saving')
    try {
      const { error } = await supabase
        .from('student_saved_words')
        .insert({
          student_id: studentId,
          word: tooltip.text,
          context_sentence: tooltip.contextSentence,
          source_unit_id: unitId,
          source: 'reading_passage',
          source_reference: readingId,
        })

      if (error) {
        if (error.code === '23505') {
          toast({ type: 'info', title: 'الكلمة محفوظة مسبقاً' })
          setSaveState('saved')
        } else {
          console.error('Save word error:', error)
          toast({ type: 'error', title: 'فشل حفظ الكلمة' })
          setSaveState('idle')
        }
      } else {
        setSaveState('saved')
        onWordSaved?.(tooltip.text)
        // Auto-close after confirmation
        setTimeout(() => setTooltip(null), 1200)
      }
    } catch (err) {
      console.error('Save word error:', err)
      setSaveState('idle')
    }
  }, [tooltip, studentId, unitId, readingId, onWordSaved, saveState])

  // Remove word from vocabulary
  const handleRemoveWord = useCallback(async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!tooltip || !studentId) return
    setSaveState('removing')
    try {
      const { error } = await supabase
        .from('student_saved_words')
        .delete()
        .eq('student_id', studentId)
        .eq('word', tooltip.text)

      if (error) {
        toast({ type: 'error', title: 'فشل الإزالة' })
        setSaveState('saved')
      } else {
        setSaveState('idle')
        // Update parent
        onWordSaved?.(`__remove__${tooltip.text}`)
        toast({ type: 'success', title: 'تم إزالة الكلمة' })
      }
    } catch {
      setSaveState('saved')
    }
  }, [tooltip, studentId, onWordSaved])

  // AI actions
  const handleAiAction = useCallback(async (e, actionType) => {
    e.preventDefault()
    e.stopPropagation()
    if (!tooltip) return
    const cacheKey = `${tooltip.text}:${actionType}`
    if (aiCache.current[cacheKey]) {
      setAiResult(aiCache.current[cacheKey])
      return
    }

    setAiLoading(true)
    try {
      const resp = await fetch('/api/vocab-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: tooltip.text,
          context_sentence: tooltip.contextSentence,
          action_type: actionType,
        }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || 'AI request failed')
      setAiResult(data)
      aiCache.current[cacheKey] = data
    } catch (err) {
      console.error('AI action error:', err)
      toast({ type: 'error', title: 'فشل الاتصال بالذكاء الاصطناعي' })
    } finally {
      setAiLoading(false)
    }
  }, [tooltip])

  // Speak word
  const handleSpeak = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!tooltip) return
    const utterance = new SpeechSynthesisUtterance(tooltip.text)
    utterance.lang = 'en-US'
    utterance.rate = 0.85
    speechSynthesis.speak(utterance)
  }, [tooltip])

  // Copy
  const handleCopy = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!tooltip) return
    navigator.clipboard.writeText(tooltip.text).then(() => {
      toast({ type: 'success', title: 'تم النسخ' })
    }).catch(() => {})
  }, [tooltip])

  if (!tooltip) return null

  return (
    <AnimatePresence>
      <motion.div
        ref={popupRef}
        data-selection-tooltip
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92 }}
        transition={{ duration: 0.15 }}
        className="fixed z-50"
        style={{
          left: popupPos?.x ?? -9999,
          top: popupPos?.y ?? -9999,
          transformOrigin: popupPos?.showAbove ? 'bottom center' : 'top center',
          visibility: popupPos ? 'visible' : 'hidden',
        }}
      >
        <div
          className="rounded-xl overflow-hidden min-w-[240px] max-w-[300px]"
          style={{
            background: 'rgba(30,41,59,0.97)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
          }}
        >
          {/* Arrow pointing to word */}
          {popupPos && (
            <div
              className="absolute w-3 h-3 rotate-45"
              style={{
                background: 'rgba(30,41,59,0.97)',
                border: '1px solid rgba(255,255,255,0.1)',
                ...(popupPos.showAbove
                  ? { bottom: -6, left: '50%', marginLeft: -6, borderTop: 'none', borderLeft: 'none' }
                  : { top: -6, left: '50%', marginLeft: -6, borderBottom: 'none', borderRight: 'none' }),
              }}
            />
          )}

          {/* Selected text */}
          <div className="px-4 pt-3 pb-2 border-b border-white/5">
            <p className="text-sm text-sky-400 font-bold font-['Inter'] truncate" dir="ltr">
              "{tooltip.text}"
            </p>
            {tooltip.isSaved && saveState !== 'idle' && (
              <p className="text-[10px] text-amber-400 font-['Tajawal'] mt-0.5">محفوظة في قاموسك</p>
            )}
          </div>

          {/* Save confirmation banner (Fix 4) */}
          {saveState === 'saved' && !tooltip.isSaved && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border-b border-emerald-500/20">
                <Check size={14} className="text-emerald-400" />
                <span className="text-xs text-emerald-400 font-['Tajawal'] font-bold">تمت الإضافة لمفرداتك ✓</span>
              </div>
            </motion.div>
          )}

          {/* Action buttons — use onPointerDown to prevent iOS selection loss (Fix 2) */}
          <div className="py-1">
            {/* Save / Remove toggle */}
            {saveState === 'saved' || tooltip.isSaved ? (
              <button
                onPointerDown={handleRemoveWord}
                disabled={saveState === 'removing'}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-['Tajawal'] text-red-300 hover:bg-red-500/5 transition-colors"
                dir="rtl"
              >
                {saveState === 'removing'
                  ? <Loader2 size={14} className="animate-spin text-red-400" />
                  : <Trash2 size={14} className="text-red-400" />}
                إزالة من مفرداتي
              </button>
            ) : (
              <button
                onPointerDown={handleSaveWord}
                disabled={saveState === 'saving'}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-['Tajawal'] text-slate-200 hover:bg-white/5 transition-colors"
                dir="rtl"
              >
                {saveState === 'saving'
                  ? <Loader2 size={14} className="animate-spin text-emerald-400" />
                  : <Plus size={14} className="text-emerald-400" />}
                أضف لمفرداتي
              </button>
            )}

            {/* Quick translate */}
            <button
              onPointerDown={(e) => handleAiAction(e, 'translate')}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-['Tajawal'] text-slate-200 hover:bg-white/5 transition-colors"
              dir="rtl"
            >
              <Globe size={14} className="text-sky-400" />
              ترجمة سريعة
            </button>

            {/* Listen */}
            <button
              onPointerDown={handleSpeak}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-['Tajawal'] text-slate-200 hover:bg-white/5 transition-colors"
              dir="rtl"
            >
              <Volume2 size={14} className="text-amber-400" />
              استمع
            </button>

            {/* Copy */}
            <button
              onPointerDown={handleCopy}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-['Tajawal'] text-slate-200 hover:bg-white/5 transition-colors"
              dir="rtl"
            >
              <Copy size={14} className="text-slate-400" />
              انسخ
            </button>

            {/* Explain with context */}
            <button
              onPointerDown={(e) => handleAiAction(e, 'explain')}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-['Tajawal'] text-slate-200 hover:bg-white/5 transition-colors"
              dir="rtl"
            >
              <Lightbulb size={14} className="text-violet-400" />
              شرح بالسياق
            </button>

            {/* More examples */}
            <button
              onPointerDown={(e) => handleAiAction(e, 'examples')}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-['Tajawal'] text-slate-200 hover:bg-white/5 transition-colors"
              dir="rtl"
            >
              <BookOpen size={14} className="text-rose-400" />
              أمثلة إضافية
            </button>
          </div>

          {/* AI Result */}
          <AnimatePresence>
            {(aiLoading || aiResult) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-4 py-3 border-t border-white/5">
                  {aiLoading ? (
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Loader2 size={14} className="animate-spin" />
                      <span className="font-['Tajawal']">جاري المعالجة...</span>
                    </div>
                  ) : aiResult && (
                    <div className="space-y-1.5">
                      {aiResult.meaning_ar && (
                        <p className="text-sm text-slate-200 font-['Tajawal']" dir="rtl">{aiResult.meaning_ar}</p>
                      )}
                      {aiResult.explanation && (
                        <p className="text-xs text-slate-300 font-['Inter'] leading-relaxed" dir="ltr">{aiResult.explanation}</p>
                      )}
                      {aiResult.examples && (
                        <div className="space-y-1">
                          {aiResult.examples.map((ex, i) => (
                            <p key={i} className="text-xs text-slate-400 font-['Inter'] leading-relaxed" dir="ltr">
                              {i + 1}. {ex}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
