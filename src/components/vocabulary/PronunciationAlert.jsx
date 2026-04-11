import { Volume2 } from 'lucide-react'

/**
 * Renders a pronunciation alert for a vocabulary word.
 *
 * Expects an `alert` object (the JSONB value from
 * curriculum_vocabulary.pronunciation_alert), or null if the word has no trap.
 *
 * Schema:
 *   {
 *     has_alert: true,
 *     severity: "high" | "medium" | "low",
 *     ipa: "/naɪt/",
 *     common_mispronunciation_ar: "كاي-نايت",
 *     correct_approximation_ar: "نايت",
 *     problem_letters: [0],
 *     rule_category: "silent_k_before_n",
 *     explanation_ar: "...",
 *     similar_words: ["knee", "know", "knife"],
 *     practice_tip_ar: "..."
 *   }
 *
 * Props:
 *   - alert: object | null
 *   - word: string  — the vocabulary word, used to render letter-by-letter
 *   - audioUrl?: string — if provided, shows a speaker button
 *   - compact?: boolean — slightly tighter layout for in-card embedding
 */

const SEVERITY_STYLES = {
  high: {
    container:
      'bg-amber-950/30 border-l-4 border-amber-500 rounded-r-xl rounded-l-md p-4',
    badge: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
    title: 'text-amber-200',
    icon: '⚠️',
    badgeLabel: 'انتبه',
  },
  medium: {
    container:
      'bg-yellow-950/25 border-l-4 border-yellow-500 rounded-r-xl rounded-l-md p-4',
    badge: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40',
    title: 'text-yellow-200',
    icon: '⚠',
    badgeLabel: 'انتبه قليلاً',
  },
  low: {
    container:
      'bg-slate-800/50 border-l-4 border-slate-500 rounded-r-xl rounded-l-md p-4',
    badge: 'bg-slate-500/20 text-slate-300 border border-slate-500/40',
    title: 'text-slate-200',
    icon: 'ⓘ',
    badgeLabel: 'ملاحظة',
  },
}

function WordWithProblems({ word, problemLetters }) {
  if (!word) return null
  const problems = new Set(Array.isArray(problemLetters) ? problemLetters : [])
  const chars = word.split('')
  return (
    <span dir="ltr" className="font-mono text-lg sm:text-xl tracking-wide">
      {chars.map((ch, i) =>
        problems.has(i) ? (
          <span key={i} className="text-rose-400 line-through font-bold">
            {ch}
          </span>
        ) : (
          <span key={i} className="text-slate-100">
            {ch}
          </span>
        )
      )}
    </span>
  )
}

export default function PronunciationAlert({ alert, word, audioUrl, compact = false }) {
  if (!alert || typeof alert !== 'object' || alert.has_alert === false) return null

  const severity = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.medium
  const similar = Array.isArray(alert.similar_words) ? alert.similar_words.slice(0, 4) : []

  const playAudio = (e) => {
    e?.stopPropagation()
    if (!audioUrl) return
    try {
      new Audio(audioUrl).play().catch(() => {})
    } catch {}
  }

  return (
    <div
      dir="rtl"
      className={[
        severity.container,
        'font-[Tajawal]',
        compact ? 'mt-3' : 'mt-4',
      ].join(' ')}
      role="note"
      aria-label="تنبيه نطق"
    >
      {/* Header: title + severity badge */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className={`flex items-center gap-2 font-semibold text-sm ${severity.title}`}>
          <span aria-hidden="true">{severity.icon}</span>
          <span>انتبه للنطق!</span>
        </div>
        <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${severity.badge}`}>
          {severity.badgeLabel}
        </span>
      </div>

      {/* Word + IPA row */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <WordWithProblems word={word} problemLetters={alert.problem_letters} />
        {alert.ipa && (
          <span className="font-mono text-xs sm:text-sm text-slate-400" dir="ltr">
            {alert.ipa}
          </span>
        )}
        {audioUrl && (
          <button
            type="button"
            onClick={playAudio}
            className="ms-auto w-9 h-9 rounded-full bg-sky-500/15 text-sky-300 flex items-center justify-center hover:bg-sky-500/25 transition-colors"
            aria-label="تشغيل النطق الصحيح"
          >
            <Volume2 size={16} />
          </button>
        )}
      </div>

      {/* Correct vs wrong approximation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
        {alert.correct_approximation_ar && (
          <div className="flex items-baseline gap-2 text-sm">
            <span className="text-emerald-400 text-base" aria-hidden="true">✓</span>
            <span className="text-slate-400 text-xs">الصحيح:</span>
            <span className="text-emerald-300 font-semibold text-base">
              {alert.correct_approximation_ar}
            </span>
          </div>
        )}
        {alert.common_mispronunciation_ar && (
          <div className="flex items-baseline gap-2 text-sm">
            <span className="text-rose-400 text-base" aria-hidden="true">✗</span>
            <span className="text-slate-400 text-xs">الخطأ الشائع:</span>
            <span className="text-rose-400 line-through">
              {alert.common_mispronunciation_ar}
            </span>
          </div>
        )}
      </div>

      {/* Explanation */}
      {alert.explanation_ar && (
        <div className="flex gap-2 mb-3">
          <span aria-hidden="true" className="text-amber-300 shrink-0">💡</span>
          <p className="text-sm leading-relaxed text-slate-200">{alert.explanation_ar}</p>
        </div>
      )}

      {/* Practice tip */}
      {alert.practice_tip_ar && (
        <div className="flex gap-2 mb-3">
          <span aria-hidden="true" className="text-sky-300 shrink-0">📝</span>
          <p className="text-sm leading-relaxed text-slate-300 italic">
            {alert.practice_tip_ar}
          </p>
        </div>
      )}

      {/* Similar words */}
      {similar.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400 shrink-0">🔗 كلمات مشابهة:</span>
          {similar.map((w, i) => (
            <span
              key={i}
              dir="ltr"
              className="rounded-md bg-slate-800/80 hover:bg-slate-700 transition-colors text-slate-300 text-xs px-2 py-1 font-mono"
            >
              {w}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
