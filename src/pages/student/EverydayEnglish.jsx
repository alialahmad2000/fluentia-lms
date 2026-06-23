// إنجليزي يومي (Everyday English) — an OPTIONAL daily practice surface beside the curriculum.
// One real-life situation a day, practised as a short voiced conversation. Browse the whole
// library too. Premium, calm, encouraging — never graded into the curriculum.

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, Sparkles, Play, CheckCircle2 } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useG } from '../../i18n/gender'
import { useEverydayEnglish } from '../../hooks/useEverydayEnglish'
import EverydayConversation from '../../components/everyday/EverydayConversation'

const CATEGORIES = [
  { id: 'all', label: 'الكل', emoji: '✨' },
  { id: 'daily_life', label: 'الحياة اليومية', emoji: '🌿' },
  { id: 'work', label: 'العمل', emoji: '💼' },
  { id: 'travel', label: 'السفر', emoji: '✈️' },
  { id: 'social', label: 'اجتماعي', emoji: '🎉' },
  { id: 'shopping', label: 'تسوّق', emoji: '🛍️' },
  { id: 'phone', label: 'مكالمات', emoji: '📞' },
  { id: 'health', label: 'صحة', emoji: '🩺' },
]

export default function EverydayEnglish() {
  const g = useG()
  const profile = useAuthStore((s) => s.profile)
  const { scenarios, todayScenario, streak, completedToday, loading, refetch } = useEverydayEnglish()
  const [active, setActive] = useState(null)   // scenario being practised
  const [cat, setCat] = useState('all')

  const visible = useMemo(() => {
    const list = cat === 'all' ? scenarios : scenarios.filter((s) => s.category === cat)
    return list
  }, [scenarios, cat])

  const presentCats = useMemo(() => {
    const set = new Set(scenarios.map((s) => s.category))
    return CATEGORIES.filter((c) => c.id === 'all' || set.has(c.id))
  }, [scenarios])

  const close = () => { setActive(null); refetch() }

  return (
    <div className="min-h-dvh px-5 py-7 lg:px-10 lg:py-10" style={{ background: 'var(--ds-bg-base, #060e1c)' }}>
      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-3xl mb-8 px-6 py-7 lg:px-9 lg:py-9"
        style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.16), rgba(16,185,129,0.10) 55%, rgba(8,14,28,0.4))', border: '1px solid rgba(56,189,248,0.18)', boxShadow: '0 24px 60px -30px rgba(0,0,0,0.7)' }}>
        <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(52,211,153,0.30), transparent 70%)', filter: 'blur(20px)' }} />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={18} className="text-cyan-300" />
            <span className="text-[11px] font-bold font-['Tajawal'] tracking-wide px-2.5 py-1 rounded-full" style={{ background: 'rgba(56,189,248,0.14)', color: '#7dd3fc', border: '1px solid rgba(56,189,248,0.22)' }}>اختياري · بجانب المنهج</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-white font-['Tajawal']">إنجليزي يومي</h1>
          <p className="text-sm font-['Tajawal'] mt-2 max-w-lg leading-relaxed" style={{ color: 'rgba(248,250,252,0.7)' }}>
            موقف واقعي كل يوم — تطلب قهوة، مقابلة عمل، تسأل عن الطريق — {g('تتمرّن عليه', 'تتمرّنين عليه')} كمحادثة صوتية قصيرة. خفيف، بدون درجات، بس عشان لسانك يتعوّد على الإنجليزي اليومي. 🤍
          </p>

          {/* streak */}
          <div className="flex items-center gap-3 mt-5">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl" style={{ background: streak > 0 ? 'rgba(251,146,60,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${streak > 0 ? 'rgba(251,146,60,0.28)' : 'rgba(255,255,255,0.08)'}` }}>
              <Flame size={18} style={{ color: streak > 0 ? '#fb923c' : 'rgba(248,250,252,0.4)' }} fill={streak > 0 ? 'currentColor' : 'none'} />
              <div className="leading-tight">
                <p className="text-base font-extrabold tabular-nums text-white font-['Tajawal']">{streak}</p>
                <p className="text-[10px] font-['Tajawal']" style={{ color: 'rgba(248,250,252,0.55)' }}>{streak === 1 ? 'يوم متتالي' : 'أيام متتالية'}</p>
              </div>
            </div>
            {completedToday && (
              <span className="flex items-center gap-1.5 text-[11px] font-bold font-['Tajawal'] px-3 py-2 rounded-2xl" style={{ background: 'rgba(52,211,153,0.12)', color: '#6ee7b7', border: '1px solid rgba(52,211,153,0.25)' }}>
                <CheckCircle2 size={14} /> {g('خلّصت تمرين اليوم', 'خلّصتِ تمرين اليوم')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Today's featured ── */}
      {!loading && todayScenario && (
        <div className="mb-9">
          <p className="text-xs font-bold font-['Tajawal'] mb-3 flex items-center gap-2" style={{ color: 'rgba(248,250,252,0.55)' }}>
            <span className="w-1 h-4 rounded-full" style={{ background: 'linear-gradient(180deg,#22d3ee,#34d399)' }} /> موقف اليوم
          </p>
          <motion.button
            onClick={() => setActive(todayScenario)}
            whileHover={{ y: -3 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="w-full text-right relative overflow-hidden rounded-3xl px-6 py-6 lg:px-8 lg:py-7 group"
            style={{ background: 'linear-gradient(135deg, rgba(56,189,248,0.14), rgba(16,185,129,0.10))', border: '1px solid rgba(56,189,248,0.24)', boxShadow: '0 20px 50px -28px rgba(56,189,248,0.4)' }}
          >
            <div className="absolute -bottom-10 -left-6 text-[120px] opacity-10 pointer-events-none select-none leading-none">{todayScenario.emoji}</div>
            <div className="relative flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3 mb-1.5">
                  <span className="text-3xl">{todayScenario.emoji}</span>
                  <h2 className="text-xl font-extrabold text-white font-['Tajawal'] truncate">{todayScenario.title_ar}</h2>
                </div>
                <p dir="ltr" className="text-xs font-['Inter'] text-left mb-2" style={{ color: 'rgba(248,250,252,0.5)' }}>{todayScenario.title_en}</p>
                {todayScenario.student_role && (
                  <p className="text-[13px] font-['Tajawal'] leading-relaxed" style={{ color: 'rgba(248,250,252,0.72)' }}>🎯 {todayScenario.student_role}</p>
                )}
              </div>
              <div className="flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105" style={{ background: 'linear-gradient(135deg,#06b6d4,#10b981)', boxShadow: '0 10px 28px -8px rgba(16,185,129,0.6)' }}>
                <Play size={22} className="text-white" fill="currentColor" />
              </div>
            </div>
          </motion.button>
        </div>
      )}

      {/* ── Library ── */}
      <div>
        <p className="text-xs font-bold font-['Tajawal'] mb-3 flex items-center gap-2" style={{ color: 'rgba(248,250,252,0.55)' }}>
          <span className="w-1 h-4 rounded-full" style={{ background: 'linear-gradient(180deg,#22d3ee,#34d399)' }} /> كل المواقف
        </p>

        {/* category chips */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-2 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
          {presentCats.map((c) => (
            <button key={c.id} onClick={() => setCat(c.id)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold font-['Tajawal'] transition-colors"
              style={cat === c.id
                ? { background: 'rgba(56,189,248,0.16)', color: '#7dd3fc', border: '1px solid rgba(56,189,248,0.32)' }
                : { background: 'rgba(255,255,255,0.04)', color: 'rgba(248,250,252,0.6)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <span>{c.emoji}</span> {c.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl h-28 animate-pulse" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visible.map((s) => (
              <motion.button key={s.id} onClick={() => setActive(s)}
                whileHover={{ y: -3 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                className="text-right relative overflow-hidden rounded-2xl px-5 py-5 group"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 12px 30px -22px rgba(0,0,0,0.6)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-3xl block mb-2">{s.emoji}</span>
                    <h3 className="text-[15px] font-bold text-white font-['Tajawal'] leading-snug">{s.title_ar}</h3>
                    <p dir="ltr" className="text-[11px] font-['Inter'] text-left mt-1" style={{ color: 'rgba(248,250,252,0.45)' }}>{s.title_en}</p>
                  </div>
                  <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all opacity-70 group-hover:opacity-100 group-hover:scale-105" style={{ background: 'rgba(56,189,248,0.14)', border: '1px solid rgba(56,189,248,0.26)' }}>
                    <Play size={15} className="text-cyan-300" fill="currentColor" />
                  </div>
                </div>
              </motion.button>
            ))}
            {visible.length === 0 && (
              <p className="col-span-full text-center text-sm font-['Tajawal'] py-10" style={{ color: 'rgba(248,250,252,0.45)' }}>لا توجد مواقف في هذا التصنيف بعد.</p>
            )}
          </div>
        )}
      </div>

      {/* ── Conversation overlay ── */}
      <AnimatePresence>
        {active && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5"
            style={{ background: 'rgba(4,8,16,0.78)', backdropFilter: 'blur(8px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) close() }}>
            <motion.div initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 280, damping: 26 }}
              className="w-full max-w-lg max-h-[92dvh] overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
              <EverydayConversation scenario={active} studentId={profile?.id} onClose={close} onCompleted={refetch} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
