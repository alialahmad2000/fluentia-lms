import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Globe, Lightbulb, BookOpen, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from '../ui/FluentiaToast'

function extractSentence(text, selectionStart) {
  // Find sentence boundaries around selection
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

export default function TextSelectionTooltip({ containerRef, studentId, unitId, readingId, onWordSaved }) {
  const [tooltip, setTooltip] = useState(null)
  const [aiResult, setAiResult] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const aiCache = useRef({})

  const handleSelection = useCallback(() => {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      // Don't hide immediately — user might be clicking tooltip
      return
    }

    const text = selection.toString().trim()
    if (text.length < 1 || text.length > 100) return

    // Ensure selection is within our container
    if (!containerRef?.current) return
    const range = selection.getRangeAt(0)
    if (!containerRef.current.contains(range.commonAncestorContainer)) return

    const rect = range.getBoundingClientRect()
    const containerRect = containerRef.current.getBoundingClientRect()

    // Position relative to container
    const x = rect.left + rect.width / 2 - containerRect.left
    const y = rect.top - containerRect.top
    const showAbove = y > 120

    // Get surrounding text for context
    const fullText = containerRef.current.textContent || ''
    const selIdx = fullText.indexOf(text)
    const contextSentence = selIdx >= 0 ? extractSentence(fullText, selIdx) : text

    setTooltip({ text, x, y, showAbove, contextSentence, rect })
    setAiResult(null)
  }, [containerRef])

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelection)
    return () => document.removeEventListener('selectionchange', handleSelection)
  }, [handleSelection])

  // Close on click outside tooltip
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('[data-selection-tooltip]')) {
        setTimeout(() => {
          const sel = window.getSelection()
          if (!sel || sel.isCollapsed) setTooltip(null)
        }, 100)
      }
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [])

  const handleSaveWord = async () => {
    if (!tooltip || !studentId) return
    try {
      const { data, error } = await supabase
        .from('student_saved_words')
        .insert({
          student_id: studentId,
          word: tooltip.text,
          context_sentence: tooltip.contextSentence,
          source_unit_id: unitId,
          source: 'reading_passage',
          source_reference: readingId,
        })
        .select()

      if (error) {
        if (error.code === '23505') {
          toast({ type: 'info', title: 'الكلمة محفوظة مسبقا' })
        } else {
          console.error('Save word error:', error)
          toast({ type: 'error', title: 'فشل حفظ الكلمة' })
        }
      } else {
        toast({ type: 'success', title: 'تم حفظ الكلمة' })
        onWordSaved?.(tooltip.text)
      }
    } catch (err) {
      console.error('Save word error:', err)
    }
    setTooltip(null)
    window.getSelection()?.removeAllRanges()
  }

  const handleAiAction = async (actionType) => {
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
  }

  if (!tooltip) return null

  return (
    <AnimatePresence>
      <motion.div
        data-selection-tooltip
        initial={{ opacity: 0, y: tooltip.showAbove ? 4 : -4, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="absolute z-50"
        style={{
          left: Math.max(8, Math.min(tooltip.x - 130, (containerRef.current?.offsetWidth || 500) - 270)),
          [tooltip.showAbove ? 'top' : 'top']: tooltip.showAbove ? tooltip.y - 8 : tooltip.y + 30,
          transform: tooltip.showAbove ? 'translateY(-100%)' : 'none',
        }}
      >
        <div
          className="rounded-xl overflow-hidden min-w-[240px] max-w-[280px]"
          style={{
            background: 'rgba(30,41,59,0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
          }}
        >
          {/* Selected text */}
          <div className="px-4 pt-3 pb-2 border-b border-white/5">
            <p className="text-xs text-sky-400 font-bold font-['Inter'] truncate" dir="ltr">
              "{tooltip.text}"
            </p>
          </div>

          {/* Action buttons */}
          <div className="py-1.5">
            <button
              onClick={handleSaveWord}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm font-['Tajawal'] text-slate-200 hover:bg-white/5 transition-colors"
              dir="rtl"
            >
              <Plus size={14} className="text-emerald-400" />
              أضف لمفرداتي
            </button>
            <button
              onClick={() => handleAiAction('translate')}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm font-['Tajawal'] text-slate-200 hover:bg-white/5 transition-colors"
              dir="rtl"
            >
              <Globe size={14} className="text-sky-400" />
              ترجمة سريعة
            </button>
            <button
              onClick={() => handleAiAction('explain')}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm font-['Tajawal'] text-slate-200 hover:bg-white/5 transition-colors"
              dir="rtl"
            >
              <Lightbulb size={14} className="text-amber-400" />
              شرح بالسياق
            </button>
            <button
              onClick={() => handleAiAction('examples')}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm font-['Tajawal'] text-slate-200 hover:bg-white/5 transition-colors"
              dir="rtl"
            >
              <BookOpen size={14} className="text-violet-400" />
              أمثلة إضافية
            </button>
          </div>

          {/* AI Result */}
          {(aiLoading || aiResult) && (
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
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
