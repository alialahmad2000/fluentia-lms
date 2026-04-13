import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Lightbulb, BookOpen, Loader2, Check, Volume2, Copy, Trash2, ChevronDown, Type } from 'lucide-react'
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

function computePosition(wordEl, popupEl) {
  if (!wordEl || !popupEl) return null
  const rect = typeof wordEl.getBoundingClientRect === 'function' ? wordEl.getBoundingClientRect() : null
  if (!rect) return null
  const ph = popupEl.offsetHeight || 200
  const pw = popupEl.offsetWidth || 280
  const vw = window.innerWidth
  const vh = window.innerHeight
  const gap = 10

  const spaceAbove = rect.top
  const spaceBelow = vh - rect.bottom
  const showAbove = spaceAbove > ph + gap || spaceAbove > spaceBelow

  const y = showAbove ? rect.top - ph - gap : rect.bottom + gap
  let x = rect.left + rect.width / 2 - pw / 2
  x = Math.max(8, Math.min(vw - pw - 8, x))

  return { x, y: Math.max(8, y), showAbove }
}

export default function TextSelectionTooltip({
  containerRef, studentId, unitId, readingId, onWordSaved, savedWordSet,
  pointerType = 'mouse',
  quickTranslationEnabled = true,
  detailedMenuEnabled = true,
}) {
  const [tooltip, setTooltip] = useState(null)
  const [mode, setMode] = useState('quick') // 'quick' | 'detailed'
  const [aiResult, setAiResult] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiAction, setAiAction] = useState(null)
  const [saveState, setSaveState] = useState('idle')
  const [popupPos, setPopupPos] = useState(null)
  const [copied, setCopied] = useState(false)
  const aiCache = useRef({})
  const popupRef = useRef(null)
  const pointerState = useRef({ downTime: 0, target: null })
  const longPressTimer = useRef(null)
  const isLongPress = useRef(false)

  const isTouch = pointerType === 'touch' || pointerType === 'pen'

  // Disable native text selection on container
  useEffect(() => {
    const container = containerRef?.current
    if (!container) return
    container.style.userSelect = 'none'
    container.style.webkitUserSelect = 'none'
    container.style.webkitTouchCallout = 'none'
    return () => {
      container.style.userSelect = ''
      container.style.webkitUserSelect = ''
      container.style.webkitTouchCallout = ''
    }
  }, [containerRef])

  const openTooltipForWord = useCallback((wordText, wordEl, startMode) => {
    if (!wordText || wordText.length < 1) return
    const cleanWord = wordText.replace(/[.,!?;:'"()\[\]]/g, '').trim()
    if (!cleanWord) return
    const fullText = containerRef.current?.textContent || ''
    const selIdx = fullText.indexOf(cleanWord)
    const contextSentence = selIdx >= 0 ? extractSentence(fullText, selIdx) : cleanWord
    const isSaved = savedWordSet?.has(cleanWord.toLowerCase())

    setTooltip({ text: cleanWord, wordEl, contextSentence, isSaved })
    setMode(startMode)
    setAiResult(null)
    setAiAction(null)
    setSaveState(isSaved ? 'saved' : 'idle')
  }, [containerRef, savedWordSet])

  // Pointer events — touch vs mouse
  useEffect(() => {
    const container = containerRef?.current
    if (!container) return

    const handlePointerDown = (e) => {
      const wordSpan = e.target.closest('[data-word-index]') || e.target.closest('button.text-sky-300')
      if (!wordSpan) return
      pointerState.current = { downTime: Date.now(), target: wordSpan }
      isLongPress.current = false

      if (isTouch && detailedMenuEnabled) {
        longPressTimer.current = setTimeout(() => {
          isLongPress.current = true
          if (navigator.vibrate) navigator.vibrate(10)
          const wordText = wordSpan.textContent?.trim()
          if (wordText) openTooltipForWord(wordText, wordSpan, 'detailed')
        }, 450)
      }
    }

    const handlePointerUp = (e) => {
      clearTimeout(longPressTimer.current)
      if (isLongPress.current) { isLongPress.current = false; return }

      const elapsed = Date.now() - pointerState.current.downTime
      if (elapsed > 450) return

      const wordSpan = pointerState.current.target
      if (!wordSpan) return
      const wordText = wordSpan.textContent?.trim()
      if (!wordText) return

      if (isTouch) {
        // Touch tap — quick card only (if enabled)
        if (quickTranslationEnabled) {
          // If same word is already open, dismiss
          if (tooltip?.text === wordText.replace(/[.,!?;:'"()\[\]]/g, '').trim()) {
            setTooltip(null); return
          }
          e.preventDefault()
          openTooltipForWord(wordText, wordSpan, 'quick')
        } else if (detailedMenuEnabled) {
          e.preventDefault()
          openTooltipForWord(wordText, wordSpan, 'detailed')
        }
      } else {
        // Mouse click — detailed menu
        if (detailedMenuEnabled) {
          e.preventDefault()
          openTooltipForWord(wordText, wordSpan, 'detailed')
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
  }, [containerRef, isTouch, quickTranslationEnabled, detailedMenuEnabled, openTooltipForWord, tooltip])

  // Position
  useLayoutEffect(() => {
    if (!tooltip?.wordEl || !popupRef.current) { setPopupPos(null); return }
    setPopupPos(computePosition(tooltip.wordEl, popupRef.current))
  }, [tooltip, mode, aiResult])

  // Close on tap outside
  useEffect(() => {
    if (!tooltip) return
    const handler = (e) => {
      if (popupRef.current?.contains(e.target)) return
      if (e.target.closest('[data-word-index]') || e.target.closest('button.text-sky-300')) return
      setTooltip(null)
    }
    const t = setTimeout(() => document.addEventListener('pointerdown', handler), 100)
    return () => { clearTimeout(t); document.removeEventListener('pointerdown', handler) }
  }, [tooltip])

  // Close on Escape
  useEffect(() => {
    if (!tooltip) return
    const onKey = (e) => { if (e.key === 'Escape') setTooltip(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [tooltip])

  // ─── Actions ─────────────────────────────
  const handleSaveWord = useCallback(async (e) => {
    e.preventDefault(); e.stopPropagation()
    if (!tooltip || !studentId || saveState === 'saving') return
    setSaveState('saving')
    try {
      const { error } = await supabase.from('student_saved_words').insert({
        student_id: studentId, word: tooltip.text,
        context_sentence: tooltip.contextSentence,
        source_unit_id: unitId, source: 'reading_passage', source_reference: readingId,
      })
      if (error) {
        if (error.code === '23505') { toast({ type: 'info', title: 'الكلمة محفوظة مسبقاً' }); setSaveState('saved') }
        else { console.error('Save error:', error); toast({ type: 'error', title: 'فشل حفظ الكلمة' }); setSaveState('idle') }
      } else {
        setSaveState('saved')
        onWordSaved?.(tooltip.text)
        toast({ type: 'success', title: '✓ تمت الإضافة لمفرداتك' })
        setTimeout(() => setTooltip(null), 1500)
      }
    } catch { setSaveState('idle') }
  }, [tooltip, studentId, unitId, readingId, onWordSaved, saveState])

  const handleRemoveWord = useCallback(async (e) => {
    e.preventDefault(); e.stopPropagation()
    if (!tooltip || !studentId) return
    setSaveState('removing')
    try {
      const { error } = await supabase.from('student_saved_words').delete().eq('student_id', studentId).eq('word', tooltip.text)
      if (error) { toast({ type: 'error', title: 'فشل الإزالة' }); setSaveState('saved') }
      else { setSaveState('idle'); onWordSaved?.(`__remove__${tooltip.text}`); toast({ type: 'success', title: 'تم إزالة الكلمة' }) }
    } catch { setSaveState('saved') }
  }, [tooltip, studentId, onWordSaved])

  const handleAiAction = useCallback(async (e, actionType) => {
    e.preventDefault(); e.stopPropagation()
    if (!tooltip) return
    const cacheKey = `${tooltip.text}:${actionType}`
    if (aiCache.current[cacheKey]) { setAiResult(aiCache.current[cacheKey]); setAiAction(actionType); return }
    setAiLoading(true); setAiAction(actionType)
    try {
      const resp = await fetch('/api/vocab-assist', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: tooltip.text, context_sentence: tooltip.contextSentence, action_type: actionType }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || 'Failed')
      setAiResult(data); aiCache.current[cacheKey] = data
    } catch (err) {
      console.error('AI error:', err)
      toast({ type: 'error', title: 'فشل الاتصال بالذكاء الاصطناعي' })
    } finally { setAiLoading(false) }
  }, [tooltip])

  const handleSpeak = useCallback((e) => {
    e.preventDefault(); e.stopPropagation()
    if (!tooltip) return
    const u = new SpeechSynthesisUtterance(tooltip.text)
    u.lang = 'en-US'; u.rate = 0.85
    speechSynthesis.speak(u)
  }, [tooltip])

  const handleCopy = useCallback((e) => {
    e.preventDefault(); e.stopPropagation()
    if (!tooltip) return
    navigator.clipboard.writeText(tooltip.text).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1000)
    }).catch(() => {})
  }, [tooltip])

  if (!tooltip) return null

  const isQuick = mode === 'quick'

  return createPortal(
    <AnimatePresence>
      <motion.div
        ref={popupRef}
        data-selection-tooltip
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92 }}
        transition={{ duration: 0.15 }}
        className="fixed z-[70]"
        style={{
          left: popupPos?.x ?? -9999, top: popupPos?.y ?? -9999,
          transformOrigin: popupPos?.showAbove ? 'bottom center' : 'top center',
          visibility: popupPos ? 'visible' : 'hidden',
        }}
      >
        <div
          className="rounded-xl overflow-hidden"
          style={{
            width: isQuick ? 220 : 280,
            background: 'rgba(15,23,42,0.97)', backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
          }}
        >
          {/* Arrow */}
          {popupPos && (
            <div className="absolute w-3 h-3 rotate-45" style={{
              background: 'rgba(15,23,42,0.97)', border: '1px solid rgba(255,255,255,0.1)',
              ...(popupPos.showAbove
                ? { bottom: -6, left: '50%', marginLeft: -6, borderTop: 'none', borderLeft: 'none' }
                : { top: -6, left: '50%', marginLeft: -6, borderBottom: 'none', borderRight: 'none' }),
            }} />
          )}

          {/* ── QUICK CARD MODE ── */}
          {isQuick && (
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-sky-300 font-['Inter']">{tooltip.text}</span>
                <button onClick={handleSpeak} className="w-7 h-7 rounded-full flex items-center justify-center bg-white/5 text-white/40 hover:text-white/60 hover:bg-white/10 transition-colors">
                  <Volume2 size={13} />
                </button>
              </div>
              {/* Quick meaning from hover cache if available */}
              {tooltip.isSaved && (
                <p className="text-[10px] text-amber-400 font-['Tajawal']">محفوظة في قاموسك</p>
              )}
              {/* "المزيد" chevron — expand to detailed */}
              {detailedMenuEnabled && (
                <button
                  onClick={() => setMode('detailed')}
                  className="w-full flex items-center justify-center gap-1 pt-1 text-[11px] text-white/30 hover:text-white/50 transition-colors font-['Tajawal']"
                >
                  المزيد <ChevronDown size={12} />
                </button>
              )}
            </div>
          )}

          {/* ── DETAILED MODE ── */}
          {!isQuick && (
            <>
              {/* Header */}
              <div className="px-4 pt-3 pb-2 border-b border-white/5 flex items-center justify-between">
                <p className="text-sm text-sky-400 font-bold font-['Inter'] truncate" dir="ltr">
                  {tooltip.text}
                </p>
                <div className="flex items-center gap-1">
                  {/* Copy icon (corner) */}
                  <button
                    onClick={handleCopy}
                    className="w-6 h-6 rounded flex items-center justify-center transition-colors"
                    style={{ color: copied ? '#22c55e' : 'rgba(255,255,255,0.25)' }}
                    title="انسخ"
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                  {/* Close */}
                  <button
                    onClick={() => setTooltip(null)}
                    className="w-6 h-6 rounded flex items-center justify-center text-white/25 hover:text-white/50 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Save confirmation */}
              {saveState === 'saved' && !tooltip.isSaved && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border-b border-emerald-500/20">
                    <Check size={14} className="text-emerald-400" />
                    <span className="text-xs text-emerald-400 font-['Tajawal'] font-bold">تمت الإضافة لمفرداتك ✓</span>
                  </div>
                </motion.div>
              )}

              {/* Actions */}
              <div className="py-1">
                {/* ⭐ Save / Remove */}
                {saveState === 'saved' || tooltip.isSaved ? (
                  <ActionRow icon={<Trash2 size={14} className="text-red-400" />} label="إزالة من مفرداتي" onClick={handleRemoveWord} loading={saveState === 'removing'} textColor="text-red-300" />
                ) : (
                  <ActionRow icon={<Plus size={14} className="text-emerald-400" />} label="أضف لمفرداتي" onClick={handleSaveWord} loading={saveState === 'saving'} />
                )}

                {/* 🎧 Listen */}
                <ActionRow icon={<Volume2 size={14} className="text-amber-400" />} label="استمع" onClick={handleSpeak} />

                {/* 💡 Explain in context */}
                <ActionRow icon={<Lightbulb size={14} className="text-violet-400" />} label="شرح بالسياق" onClick={(e) => handleAiAction(e, 'explain')} active={aiAction === 'explain'} />

                {/* 📚 New examples */}
                <ActionRow icon={<BookOpen size={14} className="text-rose-400" />} label="أمثلة جديدة" onClick={(e) => handleAiAction(e, 'examples')} active={aiAction === 'examples'} />

                {/* 🔤 Word family */}
                <ActionRow icon={<Type size={14} className="text-teal-400" />} label="صيغ الكلمة" onClick={(e) => handleAiAction(e, 'word_family')} active={aiAction === 'word_family'} />
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
                            <p className="text-xs text-slate-300 font-['Tajawal'] leading-relaxed" dir="rtl">{aiResult.explanation}</p>
                          )}
                          {aiResult.examples && (
                            <div className="space-y-1">
                              {aiResult.examples.map((ex, i) => (
                                <div key={i} className="flex items-start gap-2">
                                  <p className="text-xs text-slate-400 font-['Inter'] leading-relaxed flex-1" dir="ltr">
                                    {i + 1}. {ex}
                                  </p>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); const u = new SpeechSynthesisUtterance(ex); u.lang = 'en-US'; u.rate = 0.85; speechSynthesis.speak(u) }}
                                    className="w-5 h-5 rounded flex items-center justify-center text-white/20 hover:text-white/40 flex-shrink-0 mt-0.5"
                                  >
                                    <Volume2 size={10} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          {aiResult.word_forms && (
                            <div className="space-y-1">
                              {aiResult.word_forms.map((f, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs">
                                  <span className="text-white/70 font-['Inter'] font-semibold min-w-[60px]">{f.word}</span>
                                  <span className="text-white/30 font-['Inter'] text-[10px]">{f.pos}</span>
                                  <span className="text-amber-300/70 font-['Tajawal'] flex-1 text-right" dir="rtl">{f.meaning_ar}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}

function ActionRow({ icon, label, onClick, loading, active, textColor = 'text-slate-200' }) {
  return (
    <button
      onPointerDown={onClick}
      disabled={loading}
      className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-['Tajawal'] ${textColor} transition-colors ${active ? 'bg-white/5' : 'hover:bg-white/5'}`}
      dir="rtl"
    >
      {loading ? <Loader2 size={14} className="animate-spin text-emerald-400" /> : icon}
      {label}
    </button>
  )
}
