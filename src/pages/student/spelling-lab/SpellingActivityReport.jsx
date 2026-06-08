import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowRight, BookOpenCheck, Target, CheckCircle2, Flame, Clock, Check, X } from 'lucide-react'
import { useAuthStore } from '../../../stores/authStore'
import { supabase } from '../../../lib/supabase'
import { toArabicNum } from '../../../lib/vocabFormat'

// ── Spelling Lab — "my activity" report ──────────────────────────────────────
// Everything the student has done since the beginning: lifetime totals, a 30-day
// practice strip, and the words she touched most recently. Powered by the
// additive spelling_lab_activity_report() RPC. Calm constellation styling.

function StatTile({ icon: Icon, label, value, gold = false }) {
  return (
    <div className="vc-card p-4 flex flex-col gap-1.5"
      style={gold ? { background: 'rgba(251,191,36,0.07)', borderColor: 'rgba(251,191,36,0.28)' } : undefined}>
      <span className="flex items-center gap-2 text-xs" style={{ color: 'var(--vc-text-dim)' }}>
        <Icon size={14} style={{ color: gold ? 'var(--vc-gold)' : 'var(--vc-indigo-bright)' }} />
        {label}
      </span>
      <span className="text-2xl font-bold tabular-nums"
        style={{ color: gold ? 'var(--vc-gold-soft)' : 'var(--vc-text)' }}>
        {value}
      </span>
    </div>
  )
}

// A lightweight 30-day practice strip — one slim bar per day, height ∝ words
// practiced. Lighter than a chart library and themes cleanly with vc tokens.
function ActivityStrip({ daily }) {
  const days = Array.isArray(daily) ? daily : []
  const max = Math.max(1, ...days.map((d) => d.practiced || 0))
  return (
    <div className="vc-card p-5" dir="rtl">
      <p className="text-sm font-medium mb-4" style={{ color: 'var(--vc-text-soft)' }}>
        نشاطكِ آخر ٣٠ يوماً
      </p>
      <div className="flex items-end justify-between gap-[3px]" style={{ height: 96 }} dir="ltr">
        {days.map((d) => {
          const h = d.practiced > 0 ? Math.max(6, Math.round((d.practiced / max) * 92)) : 3
          const on = d.practiced > 0
          return (
            <div
              key={d.day}
              title={`${d.day} — ${d.practiced} كلمة`}
              className="flex-1 rounded-t-md"
              style={{
                height: h,
                minWidth: 4,
                background: on ? 'linear-gradient(180deg, var(--vc-indigo-bright), var(--vc-indigo))' : 'var(--vc-surface-2)',
                boxShadow: on ? 'var(--vc-glow-indigo)' : 'none',
                opacity: on ? 1 : 0.6,
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

export default function SpellingActivityReport({ onBack }) {
  const profile = useAuthStore((s) => s.profile)

  const { data, isLoading } = useQuery({
    queryKey: ['spelling-activity-report', profile?.id],
    enabled: !!profile?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const { data: d, error } = await supabase.rpc('spelling_lab_activity_report')
      if (error) throw error
      return d
    },
  })

  const life = data?.lifetime || {}
  const recent = Array.isArray(data?.recent) ? data.recent : []

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
          <h1 className="text-2xl font-bold leading-tight" style={{ color: 'var(--vc-text)' }}>نشاطي في الإملاء</h1>
          <p className="text-sm" style={{ color: 'var(--vc-text-dim)' }}>كل ما تدرّبتِ عليه منذ البداية</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <div className="vc-card" style={{ height: 84 }} />
          <div className="vc-card" style={{ height: 130 }} />
        </div>
      ) : (
        <>
          {/* lifetime tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatTile icon={BookOpenCheck} label="كلمات تدرّبتِ عليها" value={toArabicNum(life.words_practiced ?? 0)} />
            <StatTile icon={Target} label="نسبة الدقّة" value={`${toArabicNum(life.accuracy_pct ?? 0)}٪`} />
            <StatTile icon={CheckCircle2} label="كلمات متقنة" value={toArabicNum(life.mastered ?? 0)} gold />
            <StatTile icon={Flame} label="أيام متتالية" value={toArabicNum(life.current_streak_days ?? 0)} />
            <StatTile icon={Flame} label="أطول سلسلة" value={toArabicNum(life.best_streak_days ?? 0)} />
            <StatTile icon={Clock} label="دقائق التدريب" value={toArabicNum(life.total_minutes ?? 0)} />
          </div>

          {/* 30-day strip */}
          <div className="mt-4">
            <ActivityStrip daily={data?.daily} />
          </div>

          {/* recent words */}
          {recent.length > 0 && (
            <section className="mt-6">
              <h2 className="text-sm font-medium mb-3" style={{ color: 'var(--vc-text-soft)' }}>آخر الكلمات</h2>
              <div className="flex flex-col gap-2">
                {recent.map((w, i) => (
                  <div key={`${w.word_en}-${i}`} className="vc-card flex items-center justify-between gap-3 px-4 py-3" dir="ltr">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                        style={{
                          background: w.last_correct ? 'rgba(251,191,36,0.14)' : 'var(--vc-surface-2)',
                          color: w.last_correct ? 'var(--vc-gold)' : 'var(--vc-text-dim)',
                        }}>
                        {w.last_correct ? <Check size={13} /> : <X size={13} />}
                      </span>
                      <span className="vc-word truncate" style={{ fontSize: 18, color: 'var(--vc-text)' }}>{w.word_en}</span>
                    </span>
                    {w.meaning_ar && (
                      <span dir="rtl" className="text-[13px] truncate" style={{ color: 'var(--vc-text-dim)', maxWidth: '45%' }}>
                        {w.meaning_ar}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {(life.total_attempts ?? 0) === 0 && (
            <p className="vc-card p-8 text-center mt-2 text-[15px]" style={{ color: 'var(--vc-text-soft)' }}>
              ابدئي أول جلسة إملاء وسيظهر تقدّمكِ هنا 🌱
            </p>
          )}
        </>
      )}
    </motion.div>
  )
}
