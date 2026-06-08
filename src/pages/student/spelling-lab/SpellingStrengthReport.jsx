import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowRight, TrendingDown, Minus, Award, Dumbbell, ArrowLeft } from 'lucide-react'
import { useAuthStore } from '../../../stores/authStore'
import { supabase } from '../../../lib/supabase'
import { toArabicNum } from '../../../lib/vocabFormat'

// ── Spelling Lab — strength report ───────────────────────────────────────────
// Tells the student, plainly, which words are her strongest, weakest, and in the
// middle — and lets her drill the weak ones directly. Powered by the additive
// spelling_lab_strength_report() RPC (buckets by per-word accuracy).

const BUCKETS = [
  { key: 'weakest',   label: 'أضعف كلماتكِ',   hint: 'تحتاج تركيزاً أكثر', icon: TrendingDown, tone: '#f59e0b', soft: 'rgba(245,158,11,0.12)' },
  { key: 'middle',    label: 'في المنتصف',     hint: 'قريبة من الإتقان',   icon: Minus,        tone: 'var(--vc-indigo-bright)', soft: 'rgba(129,140,248,0.12)' },
  { key: 'strongest', label: 'أقوى كلماتكِ',   hint: 'أتقنتِها 🌟',        icon: Award,        tone: 'var(--vc-gold)', soft: 'rgba(251,191,36,0.10)' },
]

function WordRow({ w, tone }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl" style={{ background: 'var(--vc-surface-2)' }} dir="ltr">
      <span className="flex items-center gap-2 min-w-0">
        <span className="vc-word truncate" style={{ fontSize: 17, color: 'var(--vc-text)' }}>{w.word_en}</span>
        {w.meaning_ar && (
          <span dir="rtl" className="text-[12px] truncate" style={{ color: 'var(--vc-text-dim)', maxWidth: 140 }}>
            {w.meaning_ar}
          </span>
        )}
      </span>
      <span className="text-[12px] font-bold tabular-nums shrink-0" style={{ color: tone }}>
        {toArabicNum(w.accuracy_pct ?? 0)}٪
      </span>
    </div>
  )
}

function BucketSection({ def, words }) {
  const Icon = def.icon
  if (!words || words.length === 0) return null
  return (
    <section className="vc-card p-5" dir="rtl">
      <div className="flex items-center gap-2.5 mb-3">
        <span className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: def.soft, color: def.tone }}>
          <Icon size={16} />
        </span>
        <div className="flex-1 min-w-0">
          <h2 className="text-[15px] font-bold leading-tight" style={{ color: 'var(--vc-text)' }}>{def.label}</h2>
          <p className="text-[11.5px]" style={{ color: 'var(--vc-text-dim)' }}>{def.hint}</p>
        </div>
        <span className="text-[12px] tabular-nums" style={{ color: 'var(--vc-text-dim)' }}>{toArabicNum(words.length)}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {words.map((w, i) => <WordRow key={`${w.word_en}-${i}`} w={w} tone={def.tone} />)}
      </div>
    </section>
  )
}

export default function SpellingStrengthReport({ onBack, onPracticeWeak }) {
  const profile = useAuthStore((s) => s.profile)

  const { data, isLoading } = useQuery({
    queryKey: ['spelling-strength-report', profile?.id],
    enabled: !!profile?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const { data: d, error } = await supabase.rpc('spelling_lab_strength_report')
      if (error) throw error
      return d
    },
  })

  const counts = data?.counts || {}
  const weakCount = counts.weakest ?? 0
  const total = counts.total ?? 0

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} dir="rtl">
      {/* header */}
      <div className="flex items-center gap-3 mb-6">
        <button type="button" onClick={onBack} aria-label="رجوع"
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'var(--vc-surface-2)', color: 'var(--vc-text-soft)' }}>
          <ArrowRight size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold leading-tight" style={{ color: 'var(--vc-text)' }}>نقاط قوّتكِ وضعفكِ</h1>
          <p className="text-sm" style={{ color: 'var(--vc-text-dim)' }}>أين أنتِ قويّة، وأين تحتاجين تدريباً</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <div className="vc-card" style={{ height: 120 }} />
          <div className="vc-card" style={{ height: 120 }} />
        </div>
      ) : total === 0 ? (
        <p className="vc-card p-8 text-center text-[15px]" style={{ color: 'var(--vc-text-soft)' }}>
          تدرّبي على بعض الكلمات أولاً، ثم سنُريكِ نقاط قوّتكِ وضعفكِ هنا.
        </p>
      ) : (
        <>
          {/* practice-weak CTA */}
          {weakCount > 0 && (
            <button type="button" onClick={onPracticeWeak}
              className="vc-btn vc-btn-gold w-full mb-5 flex items-center justify-center gap-2"
              style={{ height: 52, fontSize: 15.5, fontWeight: 700 }}>
              <Dumbbell size={18} />
              <span>تدرّبي على كلماتكِ الضعيفة ({toArabicNum(weakCount)})</span>
              <ArrowLeft size={16} />
            </button>
          )}

          <div className="space-y-4">
            {BUCKETS.map((def) => (
              <BucketSection key={def.key} def={def} words={data?.[def.key]} />
            ))}
          </div>
        </>
      )}
    </motion.div>
  )
}
