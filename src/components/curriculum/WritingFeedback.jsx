import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, ChevronDown, AlertTriangle, Lightbulb } from 'lucide-react'

const ERROR_TYPE_AR = {
  grammar: 'قواعد',
  vocabulary: 'مفردات',
  spelling: 'إملاء',
  punctuation: 'ترقيم',
}

const ERROR_TYPE_COLOR = {
  grammar: 'text-red-400 bg-red-500/10 border-red-500/20',
  vocabulary: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  spelling: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  punctuation: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
}

function ScoreBar({ label, score, max = 10 }) {
  const pct = Math.min((score / max) * 100, 100)
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-[var(--text-muted)] font-['Tajawal']">{label}</span>
        <span className="text-xs font-bold text-sky-400 font-['Inter']">{score}/{max}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="h-full rounded-full bg-sky-400"
        />
      </div>
    </div>
  )
}

export default function WritingFeedback({ feedback, showEnglish = false }) {
  const [showCorrected, setShowCorrected] = useState(false)
  const f = feedback
  if (!f) return null

  // Support both old and new field names
  const overallScore = f.overall_score ?? f.fluency_score
  const errors = f.errors || f.grammar_errors || []
  const strengthsList = f.strengths_ar || (Array.isArray(f.strengths) ? f.strengths : [])
  const improvements = f.improvements_ar || f.improvement_tips || []
  const overallComment = f.overall_comment_ar || f.overall_feedback || ''
  const overallCommentEn = f.overall_comment_en || ''
  const strengthsText = typeof f.strengths === 'string' ? f.strengths : ''
  const improvementTip = f.improvement_tip || ''
  const vocabUpgrades = f.vocabulary_upgrades || []
  const modelSentences = f.model_sentences || []

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl p-5 space-y-5"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Header + overall score */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-[var(--text-primary)] font-['Tajawal']">التصحيح</h3>
        {overallScore != null && (
          <span className="text-2xl font-bold text-sky-400 font-['Inter']">{overallScore}<span className="text-sm text-sky-400/60">/10</span></span>
        )}
      </div>

      {/* Score bars — 2×2 grid */}
      {(f.grammar_score || f.vocabulary_score || f.structure_score || f.fluency_score) && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          {f.grammar_score != null && <ScoreBar label="القواعد" score={f.grammar_score} />}
          {f.vocabulary_score != null && <ScoreBar label="المفردات" score={f.vocabulary_score} />}
          {f.structure_score != null && <ScoreBar label="الهيكل" score={f.structure_score} />}
          {f.fluency_score != null && <ScoreBar label="الطلاقة" score={f.fluency_score} />}
        </div>
      )}

      {/* Overall comment */}
      {overallComment && (
        <p className="text-sm text-[var(--text-secondary)] font-['Tajawal'] leading-relaxed" dir="rtl">
          {overallComment}
        </p>
      )}
      {showEnglish && overallCommentEn && (
        <p className="text-sm text-[var(--text-muted)] font-['Inter'] leading-relaxed" dir="ltr">
          {overallCommentEn}
        </p>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-red-400" />
            <h4 className="text-xs font-bold text-red-400 font-['Tajawal']">أخطاء يجب الانتباه لها</h4>
          </div>
          <div className="space-y-1.5">
            {errors.map((e, i) => {
              const type = e.type || 'grammar'
              const colorCls = ERROR_TYPE_COLOR[type] || ERROR_TYPE_COLOR.grammar
              return (
                <div
                  key={i}
                  className="rounded-lg px-3 py-2 space-y-1"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${colorCls}`}>
                      {ERROR_TYPE_AR[type] || type}
                    </span>
                    <span className="line-through text-red-400/70 text-xs font-['Inter']" dir="ltr">
                      {e.original || e.error}
                    </span>
                    <span className="text-[var(--text-muted)] text-xs">→</span>
                    <span className="text-emerald-400 text-xs font-['Inter']" dir="ltr">
                      {e.correction}
                    </span>
                  </div>
                  {(e.explanation_ar || e.rule) && (
                    <p className="text-[11px] text-[var(--text-muted)] font-['Tajawal']" dir="rtl">
                      {e.explanation_ar || e.rule}
                    </p>
                  )}
                  {showEnglish && e.explanation_en && (
                    <p className="text-[11px] text-[var(--text-muted)] font-['Inter']" dir="ltr">
                      {e.explanation_en}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Strengths — text paragraph */}
      {strengthsText && (
        <div
          className="rounded-xl p-3.5 space-y-1"
          style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.12)' }}
        >
          <h4 className="text-xs font-bold text-emerald-400 font-['Tajawal']">نقاط القوة</h4>
          <p className="text-xs text-[var(--text-secondary)] font-['Tajawal'] leading-relaxed" dir="rtl">
            {strengthsText}
          </p>
        </div>
      )}

      {/* Strengths — list */}
      {!strengthsText && strengthsList.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-bold text-emerald-400 font-['Tajawal']">نقاط القوة</h4>
          {strengthsList.map((s, i) => (
            <p key={i} className="text-xs text-[var(--text-secondary)] font-['Tajawal'] flex items-start gap-1.5" dir="rtl">
              <CheckCircle2 size={12} className="text-emerald-400 flex-shrink-0 mt-0.5" />
              {s}
            </p>
          ))}
        </div>
      )}

      {/* Vocabulary upgrades */}
      {vocabUpgrades.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-purple-400 font-['Tajawal']">ترقية المفردات</h4>
          <div className="space-y-1.5">
            {vocabUpgrades.map((vu, i) => (
              <div
                key={i}
                className="rounded-lg px-3 py-2"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
              >
                <div className="flex items-center gap-2 text-xs" dir="ltr">
                  <span className="text-[var(--text-muted)] font-['Inter']">{vu.basic}</span>
                  <span className="text-[var(--text-muted)]">→</span>
                  <span className="text-purple-400 font-bold font-['Inter']">{vu.advanced}</span>
                </div>
                {vu.example && (
                  <p className="text-[11px] text-[var(--text-muted)] font-['Inter'] mt-1 italic" dir="ltr">
                    {vu.example}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Model sentences */}
      {modelSentences.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-sky-400 font-['Tajawal']">جمل نموذجية</h4>
          <div className="space-y-1.5">
            {modelSentences.map((s, i) => (
              <p
                key={i}
                className="text-xs text-[var(--text-secondary)] font-['Inter'] leading-relaxed italic px-3 py-2 rounded-lg"
                dir="ltr"
                style={{ background: 'rgba(56,189,248,0.04)', borderRight: '2px solid rgba(56,189,248,0.3)' }}
              >
                "{s}"
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Improvements — list */}
      {improvements.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-bold text-amber-400 font-['Tajawal']">نصائح للتطوير</h4>
          {improvements.map((tip, i) => (
            <p key={i} className="text-xs text-[var(--text-secondary)] font-['Tajawal'] flex items-start gap-1.5" dir="rtl">
              <Lightbulb size={12} className="text-amber-400 flex-shrink-0 mt-0.5" />
              {tip}
            </p>
          ))}
        </div>
      )}

      {/* Improvement tip — single actionable step */}
      {improvementTip && (
        <div
          className="rounded-xl p-3.5 space-y-1"
          style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)' }}
        >
          <h4 className="text-xs font-bold text-amber-400 font-['Tajawal']">خطوتك القادمة</h4>
          <p className="text-xs text-[var(--text-secondary)] font-['Tajawal'] leading-relaxed" dir="rtl">
            {improvementTip}
          </p>
        </div>
      )}

      {/* Corrected text (collapsible) */}
      {f.corrected_text && (
        <div>
          <button
            onClick={() => setShowCorrected(!showCorrected)}
            className="flex items-center gap-1.5 text-xs font-bold text-sky-400 hover:text-sky-300 font-['Tajawal'] transition-colors"
          >
            <ChevronDown size={14} className={`transition-transform duration-200 ${showCorrected ? 'rotate-180' : ''}`} />
            {showCorrected ? 'إخفاء النص المصحح' : 'عرض النص المصحح'}
          </button>
          <AnimatePresence>
            {showCorrected && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <p
                  className="mt-2 text-sm text-[var(--text-secondary)] font-['Inter'] leading-[1.8] p-3 rounded-lg"
                  dir="ltr"
                  style={{ background: 'rgba(255,255,255,0.02)' }}
                >
                  {f.corrected_text}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  )
}
