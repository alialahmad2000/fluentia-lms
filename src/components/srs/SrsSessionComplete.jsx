import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Flame, Sparkles, Trophy, Clock, Star } from 'lucide-react'
import { useAuthProfile } from '../../stores/authStore'
import { getWordsKnown } from '../../services/vocab'

const toArabicNum = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d])
const MILESTONES = [50, 100, 250, 500, 1000, 2000, 5000]

/**
 * Session summary — the "your sky grew" moment. Ties the session back to the
 * big picture (total words in your sky) + the next milestone, so finishing a
 * review feels like progress toward something.
 */
export default function SrsSessionComplete({
  totalReviewed = 0,
  correctCount = 0,
  xpGained = 0,
  elapsedSec = 0,
  streak = 0,
  newRecord = false,
  hasMoreCards = false,
  onClose,
  onExtra,
}) {
  const profile = useAuthProfile()
  // Fresh count so it reflects words just mastered in this session.
  const { data: wordsKnown = 0 } = useQuery({
    queryKey: ['vocab-words-known-session', profile?.id],
    queryFn: () => getWordsKnown(profile?.id),
    enabled: !!profile?.id,
    staleTime: 0,
  })

  const accuracyPct = totalReviewed > 0 ? Math.round((correctCount / totalReviewed) * 100) : 0
  const minutes = Math.floor(elapsedSec / 60)
  const seconds = elapsedSec % 60

  const nextMilestone = MILESTONES.find((m) => m > wordsKnown) ?? null
  const prevMilestone = [...MILESTONES].reverse().find((m) => m <= wordsKnown) ?? 0
  const toNext = nextMilestone ? nextMilestone - wordsKnown : 0
  const milestonePct = nextMilestone
    ? Math.min(100, Math.round(((wordsKnown - prevMilestone) / (nextMilestone - prevMilestone)) * 100))
    : 100

  const pieces = Array.from({ length: 18 })

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 py-12 text-center relative overflow-hidden" dir="rtl">
      {/* Confetti */}
      <div className="absolute inset-0 pointer-events-none">
        {pieces.map((_, i) => {
          const left = (i * 53) % 100
          const delay = (i % 5) * 0.08
          const color = ['#fbbf24', '#a78bfa', '#818cf8', '#a5b4fc'][i % 4]
          return (
            <motion.span
              key={i}
              initial={{ y: -40, opacity: 0, rotate: 0 }}
              animate={{ y: 600, opacity: [0, 1, 1, 0], rotate: 360 }}
              transition={{ duration: 1.6, delay, ease: 'easeIn' }}
              className="absolute block"
              style={{ left: `${left}%`, top: 0, width: 6, height: 10, background: color, borderRadius: 2 }}
            />
          )
        })}
      </div>

      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-20 h-20 rounded-full flex items-center justify-center mb-6 z-10"
        style={{ background: 'rgba(251,191,36,0.14)', boxShadow: '0 0 30px -6px rgba(251,191,36,0.5)' }}
      >
        <Star size={36} strokeWidth={1.5} fill="#fbbf24" style={{ color: '#fbbf24' }} />
      </motion.div>

      <motion.h2
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="text-2xl font-bold font-['Tajawal'] z-10 mb-2"
        style={{ color: 'var(--text-primary)' }}
      >
        أحسنتِ — سماؤك تتّسع
      </motion.h2>
      <motion.p
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.18 }}
        className="text-sm font-['Tajawal'] mb-6 z-10"
        style={{ color: 'var(--text-tertiary)' }}
      >
        راجعتِ {toArabicNum(totalReviewed)} كلمة بدقة {toArabicNum(accuracyPct)}٪
      </motion.p>

      {/* "Your sky" — words known + next milestone */}
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.22 }}
        className="w-full max-w-md mb-7 z-10 rounded-2xl p-5"
        style={{ background: 'rgba(129,140,248,0.08)', border: '1px solid rgba(165,180,252,0.18)' }}
      >
        <div className="flex items-center justify-center gap-2 mb-1">
          <Star size={16} fill="#fbbf24" style={{ color: '#fbbf24' }} />
          <span className="text-xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
            {toArabicNum(wordsKnown)}
          </span>
          <span className="text-sm font-['Tajawal']" style={{ color: 'var(--text-tertiary)' }}>
            نجمة في سمائك
          </span>
        </div>
        {nextMilestone ? (
          <>
            <div className="w-full h-2 rounded-full mt-3 overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <motion.div
                className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${milestonePct}%` }}
                transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                style={{ background: 'linear-gradient(90deg, #818cf8, #fbbf24)' }}
              />
            </div>
            <p className="text-xs font-['Tajawal'] mt-2" style={{ color: 'var(--text-tertiary)' }}>
              باقي {toArabicNum(toNext)} نجمة للوصول إلى {toArabicNum(nextMilestone)} ✦
            </p>
          </>
        ) : (
          <p className="text-xs font-['Tajawal'] mt-2" style={{ color: '#fcd34d' }}>
            مجرّة كاملة — أنتِ من النجوم اللامعة ✦
          </p>
        )}
      </motion.div>

      {/* Stats grid */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.28 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-md w-full mb-8 z-10"
      >
        <Stat icon={Sparkles} value={toArabicNum(totalReviewed)} label="كلمة" color="#a78bfa" />
        <Stat icon={Trophy} value={`${toArabicNum(accuracyPct)}٪`} label="دقة" color="#fbbf24" />
        <Stat
          icon={Flame}
          value={toArabicNum(streak)}
          label={newRecord ? 'يوم — رقم قياسي' : 'يوم'}
          color={newRecord ? '#fbbf24' : 'rgb(251,113,133)'}
        />
        <Stat icon={Clock} value={`${toArabicNum(minutes)}:${String(seconds).padStart(2, '0')}`} label="دقيقة" color="#818cf8" />
      </motion.div>

      {xpGained > 0 && (
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="text-sm font-semibold font-['Tajawal'] mb-6 z-10"
          style={{ color: '#fbbf24' }}
        >
          +{toArabicNum(xpGained)} XP
        </motion.div>
      )}

      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="flex flex-col sm:flex-row gap-3 w-full max-w-sm z-10"
      >
        <button onClick={onClose} className="fl-btn-primary flex-1 px-6 py-3 text-sm font-['Tajawal']">
          العودة للوحة
        </button>
        {hasMoreCards && (
          <button
            onClick={onExtra}
            className="flex-1 px-6 py-3 rounded-xl text-sm font-bold font-['Tajawal'] transition-all hover:-translate-y-0.5"
            style={{
              background: 'rgba(129,140,248,0.1)',
              color: 'var(--text-primary)',
              border: '1px solid rgba(165,180,252,0.2)',
            }}
          >
            مراجعة إضافية
          </button>
        )}
      </motion.div>
    </div>
  )
}

function Stat({ icon: Icon, value, label, color }) {
  return (
    <div
      className="p-4 rounded-xl text-center"
      style={{
        background: 'var(--surface-raised, rgba(255,255,255,0.04))',
        border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
      }}
    >
      <Icon size={18} style={{ color }} className="mx-auto mb-2" />
      <div className="text-lg font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
        {value}
      </div>
      <div className="text-xs mt-0.5 font-['Tajawal']" style={{ color: 'var(--text-tertiary)' }}>
        {label}
      </div>
    </div>
  )
}
