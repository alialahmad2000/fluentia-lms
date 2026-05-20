import { useCallback, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Quote, Sparkles, Copy, Check, Loader2 } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { toast } from '../../ui/FluentiaToast'

export function DeepMenu({ data, contextSentence, onBack }) {
  const [aiResult, setAiResult] = useState(null)
  const [aiAction, setAiAction] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const aiCache = useRef(new Map())

  const fireAi = useCallback(async (actionType) => {
    if (!data?.word) return
    const cacheKey = `${data.word.toLowerCase()}:${actionType}`
    if (aiCache.current.has(cacheKey)) {
      setAiResult(aiCache.current.get(cacheKey))
      setAiAction(actionType)
      return
    }
    setAiAction(actionType)
    setAiLoading(true)
    try {
      const { data: resp, error } = await supabase.functions.invoke('vocab-assist', {
        body: { word: data.word, context_sentence: contextSentence || null, action_type: actionType },
      })
      if (error || !resp) throw error || new Error('empty')
      aiCache.current.set(cacheKey, resp)
      setAiResult(resp)
    } catch {
      setAiResult({ error: true })
    } finally {
      setAiLoading(false)
    }
  }, [data?.word, contextSentence])

  const handleCopy = useCallback(() => {
    if (!data?.word) return
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(data.word).then(() => {
        setCopied(true)
        toast({ type: 'success', title: 'تم النسخ' })
        setTimeout(() => setCopied(false), 1200)
      }).catch(() => {})
    }
  }, [data?.word])

  const wordFamily = Array.isArray(data?.word_family) ? data.word_family : []

  return (
    <div className="p-5 space-y-4" dir="rtl">
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-['Tajawal'] transition-colors"
        style={{ color: 'var(--ds-text-secondary, var(--text-secondary))' }}
        aria-label="رجوع"
      >
        <ArrowRight size={14} />
        تفاصيل أكثر
      </button>

      {/* Example sentence */}
      {data?.example_sentence && (
        <div
          className="rounded-xl p-3"
          style={{
            background: 'var(--ds-surface-1, rgba(255,255,255,0.03))',
            borderInlineStart: '3px solid var(--ds-accent-primary, var(--accent-sky))',
          }}
        >
          <div className="flex items-start gap-2">
            <Quote size={14} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--ds-text-muted, var(--text-muted))' }} />
            <p
              className="text-sm italic leading-relaxed font-['Inter']"
              dir="ltr"
              style={{ color: 'var(--ds-text-secondary, var(--text-secondary))', unicodeBidi: 'isolate' }}
            >
              {data.example_sentence}
            </p>
          </div>
        </div>
      )}

      {/* Word family */}
      {wordFamily.length > 0 && (
        <div>
          <p className="text-xs font-['Tajawal'] mb-1.5" style={{ color: 'var(--ds-text-muted, var(--text-muted))' }}>
            عائلة الكلمة
          </p>
          <div className="flex flex-wrap gap-2">
            {wordFamily.slice(0, 6).map((m, i) => {
              const wd = m.word || m.form || ''
              const pos = m.pos || m.form_type || ''
              if (!wd) return null
              return (
                <div
                  key={`${wd}-${i}`}
                  className="px-2.5 py-1 rounded-lg"
                  style={{
                    background: 'var(--ds-surface-1, rgba(255,255,255,0.04))',
                    border: '1px solid var(--ds-card-border, rgba(255,255,255,0.08))',
                  }}
                >
                  <span
                    className="text-sm font-semibold font-['Inter']"
                    dir="ltr"
                    style={{ color: 'var(--ds-text-primary, var(--text-primary))' }}
                  >
                    {wd}
                  </span>
                  {pos && (
                    <span
                      className="block text-[10px] mt-0.5 font-['Inter']"
                      dir="ltr"
                      style={{ color: 'var(--ds-text-muted, var(--text-muted))' }}
                    >
                      {pos}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* AI actions row */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => fireAi('explain')}
          disabled={aiLoading && aiAction === 'explain'}
          className="flex items-center justify-center gap-2 h-10 rounded-xl text-xs font-['Tajawal']"
          style={{
            background: 'var(--ds-surface-1, rgba(139,92,246,0.08))',
            border: '1.5px solid var(--ds-card-border, rgba(139,92,246,0.25))',
            color: 'var(--ds-accent-violet, #a78bfa)',
          }}
        >
          {aiLoading && aiAction === 'explain' ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          اشرح في السياق
        </button>
        <button
          onClick={() => fireAi('examples')}
          disabled={aiLoading && aiAction === 'examples'}
          className="flex items-center justify-center gap-2 h-10 rounded-xl text-xs font-['Tajawal']"
          style={{
            background: 'var(--ds-surface-1, rgba(244,114,182,0.08))',
            border: '1.5px solid var(--ds-card-border, rgba(244,114,182,0.25))',
            color: 'var(--ds-accent-rose, #f472b6)',
          }}
        >
          {aiLoading && aiAction === 'examples' ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          أمثلة أكثر
        </button>
      </div>

      {/* AI result */}
      <AnimatePresence initial={false}>
        {(aiLoading || aiResult) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              className="rounded-xl p-3"
              style={{
                background: 'var(--ds-surface-1, rgba(255,255,255,0.03))',
                border: '1px solid var(--ds-card-border, rgba(255,255,255,0.08))',
              }}
            >
              {aiLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 size={12} className="animate-spin" style={{ color: 'var(--ds-text-muted, var(--text-muted))' }} />
                  <span className="text-xs font-['Tajawal']" style={{ color: 'var(--ds-text-muted, var(--text-muted))' }}>
                    جاري المعالجة...
                  </span>
                </div>
              ) : aiResult?.error ? (
                <p className="text-xs font-['Tajawal']" style={{ color: 'var(--ds-text-muted, var(--text-muted))' }}>
                  تعذّر التحميل، حاول مرة أخرى.
                </p>
              ) : Array.isArray(aiResult?.examples) ? (
                <ul className="space-y-2">
                  {aiResult.examples.map((ex, i) => (
                    <li
                      key={i}
                      className="text-sm font-['Inter'] leading-relaxed"
                      dir="ltr"
                      style={{ color: 'var(--ds-text-secondary, var(--text-secondary))', unicodeBidi: 'isolate' }}
                    >
                      {i + 1}. {ex}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="space-y-2">
                  {aiResult?.meaning_ar && (
                    <p className="text-sm font-['Tajawal']" dir="rtl" style={{ color: 'var(--ds-text-primary, var(--text-primary))' }}>
                      {aiResult.meaning_ar}
                    </p>
                  )}
                  {aiResult?.explanation && (
                    <p
                      className="text-xs font-['Inter'] italic leading-relaxed"
                      dir="ltr"
                      style={{ color: 'var(--ds-text-secondary, var(--text-secondary))', unicodeBidi: 'isolate' }}
                    >
                      {aiResult.explanation}
                    </p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer: copy */}
      <button
        onClick={handleCopy}
        className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-['Tajawal'] transition-colors"
        style={{ color: 'var(--ds-text-muted, var(--text-muted))' }}
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
        نسخ
      </button>
    </div>
  )
}
