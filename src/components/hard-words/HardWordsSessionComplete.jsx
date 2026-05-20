import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Sparkles, ArrowLeft, RotateCcw } from 'lucide-react'

const toArabicNum = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d])

function formatTime(ms) {
  const totalSec = Math.max(0, Math.round(ms / 1000))
  const mins = Math.floor(totalSec / 60)
  const secs = totalSec % 60
  if (mins === 0) return `${toArabicNum(secs)} ث`
  return `${toArabicNum(mins)} د ${toArabicNum(secs)} ث`
}

/**
 * Session-complete screen after a Hard Words drill.
 * Props:
 *   result: { mode, total, correct, wrong, promoted, elapsedMs }
 *   onBack: () => void  // back to dashboard
 *   onRestart: () => void  // start another session of the same mode
 */
export default function HardWordsSessionComplete({ result, onBack, onRestart }) {
  const { total = 0, correct = 0, wrong = 0, promoted = 0, elapsedMs = 0 } = result || {}
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0
  const subline = useMemo(() => {
    if (accuracy >= 90) return 'ممتاز جداً 🌟'
    if (accuracy >= 75) return 'جيد جداً 👏'
    return 'كل تدريب يقربك أكثر — استمر'
  }, [accuracy])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      {/* Confetti */}
      <div className="relative h-2">
        {Array.from({ length: 14 }).map((_, i) => {
          const left = `${(i / 14) * 100}%`
          const colors = ['#fbbf24', '#34d399', '#38bdf8', '#a78bfa', '#f472b6']
          return (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: [0, 1, 0], y: [-8, 12, 36] }}
              transition={{ duration: 1.4, delay: i * 0.04, ease: 'easeOut' }}
              className="absolute top-0 w-2 h-2 rounded-full"
              style={{ left, background: colors[i % colors.length] }}
            />
          )
        })}
      </div>

      {/* Hero */}
      <div className="text-center">
        <h2
          className="text-2xl md:text-3xl font-bold font-['Tajawal']"
          style={{ color: 'var(--text-primary)' }}
        >
          خلصت التدريب!
        </h2>
        <p className="text-sm mt-2 font-['Tajawal']" style={{ color: 'var(--text-secondary)' }}>
          {subline}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="عدد التدريبات" value={toArabicNum(total)} />
        <StatTile label="دقة الإجابة" value={`${toArabicNum(accuracy)}٪`} />
        <StatTile
          label="كلمات ترقّت"
          value={toArabicNum(promoted)}
          accent={promoted > 0 ? 'gold' : 'default'}
        />
        <StatTile label="مدة الجلسة" value={formatTime(elapsedMs)} />
      </div>

      {/* Promotion highlight */}
      {promoted > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="p-4 md:p-5 rounded-2xl flex items-center gap-3"
          style={{
            background:
              'linear-gradient(135deg, rgba(251,191,36,0.12), rgba(245,158,11,0.06))',
            border: '1px solid rgba(251,191,36,0.35)',
          }}
        >
          <div
            className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(251,191,36,0.2)', color: 'rgb(251,191,36)' }}
          >
            <Sparkles size={18} />
          </div>
          <div className="font-['Tajawal']">
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              {toArabicNum(promoted)} كلمة ترقّت من مجموعة الصعبة
            </p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              راح ترجع للمراجعة العادية. أحسنت!
            </p>
          </div>
        </motion.div>
      )}

      {/* Wrong count footnote (low-key) */}
      {wrong > 0 && (
        <p
          className="text-xs text-center font-['Tajawal']"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {toArabicNum(wrong)} أخطاء — كلها فرصة للتقدم
        </p>
      )}

      {/* Buttons */}
      <div className="flex flex-col md:flex-row gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-3 rounded-xl font-bold font-['Tajawal'] inline-flex items-center justify-center gap-2"
          style={{
            background: 'var(--accent-gold, #fbbf24)',
            color: '#0a1225',
          }}
        >
          العودة
          <ArrowLeft size={16} />
        </button>
        <button
          type="button"
          onClick={onRestart}
          className="flex-1 py-3 rounded-xl font-bold font-['Tajawal'] inline-flex items-center justify-center gap-2"
          style={{
            background: 'var(--surface)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
          }}
        >
          <RotateCcw size={14} />
          تدريب آخر
        </button>
        <Link
          to="/student/srs"
          className="flex-1 py-3 rounded-xl font-bold font-['Tajawal'] text-center"
          style={{
            background: 'var(--surface)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border)',
          }}
        >
          مراجعة المفردات اليومية
        </Link>
      </div>
    </motion.div>
  )
}

function StatTile({ label, value, accent = 'default' }) {
  const isGold = accent === 'gold'
  return (
    <div
      className="p-4 rounded-xl text-center"
      style={{
        background: isGold
          ? 'linear-gradient(135deg, rgba(251,191,36,0.12), rgba(251,191,36,0.04))'
          : 'var(--surface)',
        border: `1px solid ${isGold ? 'rgba(251,191,36,0.3)' : 'var(--border)'}`,
      }}
    >
      <div
        className="text-xl md:text-2xl font-bold"
        style={{ color: isGold ? 'rgb(251,191,36)' : 'var(--text-primary)' }}
      >
        {value}
      </div>
      <div
        className="text-xs mt-1 font-['Tajawal']"
        style={{ color: 'var(--text-tertiary)' }}
      >
        {label}
      </div>
    </div>
  )
}
