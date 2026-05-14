import { useState, useEffect, useCallback } from 'react'
import { X, Sparkles, RotateCcw, RefreshCw } from 'lucide-react'
import DOMPurify from 'dompurify'
import { supabase } from '../../lib/supabase'
import { NajdiExplanationView } from './NajdiExplanationView'

export default function ExplainModal({ open, onClose, payload }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  const fetchExplanation = useCallback(async (forceRegen = false) => {
    if (!payload) return
    setLoading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const res = await supabase.functions.invoke('explain-grammar-answer', {
        body: { ...payload, force_regenerate: forceRegen },
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (res.error) throw new Error(res.error.message || 'Function error')
      const data = res.data
      if (data?.error) throw new Error(data.error)

      setResult(data)
    } catch (e) {
      setError(e.message?.includes('Edge Function') ? 'تعذّر الاتصال بالخدمة، حاولي مرة أخرى' : (e.message || 'حدث خطأ'))
    } finally {
      setLoading(false)
    }
  }, [payload])

  useEffect(() => {
    if (open && payload) {
      setResult(null)
      setError(null)
      fetchExplanation()
    }
  }, [open, payload, fetchExplanation])

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  // Determine which format the result is in
  const isNewFormat = result && !!result.explanation_md
  const isOldFormat = result && !result.explanation_md && !!result.explanation_html

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'var(--modal-backdrop)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl p-6 space-y-5"
        style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-xl)' }}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={18} style={{ color: 'var(--accent-sky)' }} />
            <h3 className="text-base font-bold font-['Tajawal']" style={{ color: 'var(--text-primary)' }}>اشرح لي</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--glass-card-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <X size={18} />
          </button>
        </div>

        {/* Question context */}
        {payload && (
          <div className="space-y-2 text-sm">
            <div className="rounded-lg p-3" style={{ background: 'var(--glass-card)', border: '1px solid var(--border-subtle)' }}>
              <p className="text-xs font-bold font-['Tajawal'] mb-1.5" style={{ color: 'var(--text-tertiary)' }}>السؤال</p>
              <p className="font-['Inter'] font-medium" dir="ltr" style={{ color: 'var(--text-primary)' }}>{payload.questionText}</p>
            </div>

            <div className="flex gap-3 text-xs">
              <div className="flex-1 rounded-lg p-2.5" style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)' }}>
                <span className="font-['Tajawal']" style={{ color: 'var(--text-tertiary)' }}>إجابتك: </span>
                <span className="font-['Inter'] font-semibold" dir="ltr" style={{ color: payload.isCorrect ? 'var(--success)' : 'var(--danger)' }}>
                  {payload.studentAnswer || '—'}
                </span>
              </div>
              <div className="flex-1 rounded-lg p-2.5" style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)' }}>
                <span className="font-['Tajawal']" style={{ color: 'var(--text-tertiary)' }}>الصحيح: </span>
                <span className="font-['Inter'] font-semibold" dir="ltr" style={{ color: 'var(--success)' }}>{payload.correctAnswer}</span>
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-3 py-4">
            <div className="flex items-center gap-2 justify-center">
              <div className="w-4 h-4 rounded-full animate-spin" style={{ border: '2px solid var(--border-default)', borderTopColor: 'var(--accent-sky)' }} />
              <span className="text-sm font-['Tajawal']" style={{ color: 'var(--text-tertiary)' }}>تُحضَّر الشرح...</span>
            </div>
            <div className="space-y-2">
              <div className="h-4 rounded" style={{ background: 'var(--skeleton-from)', width: '80%' }} />
              <div className="h-4 rounded" style={{ background: 'var(--skeleton-from)', width: '60%' }} />
              <div className="h-4 rounded" style={{ background: 'var(--skeleton-from)', width: '70%' }} />
            </div>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="rounded-xl p-4 text-center space-y-3" style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)' }}>
            <p className="text-sm font-['Tajawal']" style={{ color: 'var(--danger)' }}>{error}</p>
            <button
              onClick={() => fetchExplanation()}
              className="grammar-option px-4 py-2 inline-flex text-sm font-['Tajawal'] font-bold"
              style={{ color: 'var(--accent-sky)', borderColor: 'var(--info-border)' }}
            >
              <RotateCcw size={14} />
              إعادة المحاولة
            </button>
          </div>
        )}

        {/* Result — new Markdown format */}
        {isNewFormat && !loading && (
          <div className="space-y-3">
            <NajdiExplanationView markdown={result.explanation_md} />
          </div>
        )}

        {/* Result — old HTML format (backward compat) */}
        {isOldFormat && !loading && (
          <div className="space-y-4">
            {result.tldr_ar && (
              <div className="rounded-xl p-4" style={{ background: 'var(--info-bg)', border: '1px solid var(--info-border)' }}>
                <p className="text-xs font-bold font-['Tajawal'] mb-1" style={{ color: 'var(--accent-sky)' }}>بسرعة</p>
                <p className="text-sm font-['Tajawal'] font-medium" style={{ color: 'var(--text-primary)' }}>{result.tldr_ar}</p>
              </div>
            )}
            <div className="space-y-2">
              <p className="text-xs font-bold font-['Tajawal']" style={{ color: 'var(--text-tertiary)' }}>الشرح الكامل</p>
              <div
                className="grammar-explain-content text-sm font-['Tajawal'] leading-relaxed"
                style={{ color: 'var(--text-primary)' }}
                dir="rtl"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(result.explanation_html, {
                  ALLOWED_TAGS: ['p', 'strong', 'em', 'code', 'ul', 'ol', 'li', 'br', 'span'],
                  ALLOWED_ATTR: ['dir', 'class'],
                }) }}
              />
            </div>
            {/* Lazy upgrade button */}
            <div className="flex justify-center pt-1">
              <button
                onClick={() => fetchExplanation(true)}
                className="inline-flex items-center gap-2 text-xs font-['Tajawal'] px-3 py-2 rounded-lg transition-colors"
                style={{ color: 'var(--text-tertiary)', border: '1px solid var(--border-subtle)' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent-sky)'; e.currentTarget.style.borderColor = 'var(--info-border)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.borderColor = 'var(--border-subtle)' }}
              >
                <RefreshCw size={12} />
                أعد التحميل بتنسيق محسّن
              </button>
            </div>
          </div>
        )}

        {/* Empty result fallback */}
        {result && !isNewFormat && !isOldFormat && !loading && (
          <p className="text-sm font-['Tajawal'] text-center" style={{ color: 'var(--text-tertiary)' }}>
            لم يتمكن المُعلم من تقديم شرح لهذا السؤال.
          </p>
        )}

        {/* Footer */}
        <div className="flex justify-center pt-2">
          <button
            onClick={onClose}
            className="grammar-option px-6 py-2.5 font-['Tajawal'] font-bold text-sm"
            style={{ color: 'var(--accent-sky)', borderColor: 'var(--info-border)' }}
          >
            فهمت، شكراً
          </button>
        </div>
      </div>
    </div>
  )
}
