import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { GlassPanel } from '../../../design-system/components'
import { motion } from 'framer-motion'
import { Lock, Hourglass, Award, Sparkles, Ban, CheckCircle2, RefreshCw } from 'lucide-react'
import { useUnitMasteryState } from './useUnitMasteryState'

// Live countdown to a future ISO timestamp
function Countdown({ endsAt, label }) {
  const [display, setDisplay] = useState('')

  useEffect(() => {
    const endMs = new Date(endsAt).getTime()
    const tick = () => {
      const diff = endMs - Date.now()
      if (diff <= 0) { setDisplay('00:00'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setDisplay(
        h > 0
          ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
          : `${m}:${String(s).padStart(2, '0')}`
      )
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [endsAt])

  return (
    <span>
      {label}{' '}
      <span className="font-mono font-bold" style={{ color: 'var(--ds-accent-primary, #38bdf8)' }}>
        {display}
      </span>
    </span>
  )
}

export default function UnitMasteryCard({ unitId, studentId }) {
  const navigate = useNavigate()
  const { assessment, state, loading } = useUnitMasteryState(unitId, studentId)

  if (loading || !assessment || !state || state.type === 'loading') return null

  const { type } = state

  // ── LOCKED (incomplete activities) ──
  if (type === 'locked') {
    const { currentPct = 0, requiredPct = 70 } = state
    return (
      <GlassPanel padding="md">
        <div className="flex items-center gap-3 mb-3">
          <Lock size={20} style={{ color: 'var(--ds-text-tertiary, #64748b)' }} />
          <p className="text-sm font-['Tajawal']" style={{ color: 'var(--ds-text-secondary, #cbd5e1)' }}>
            أكملي {requiredPct}% من أنشطة الوحدة لفتح اختبار الإتقان
          </p>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--ds-surface-1, rgba(255,255,255,0.04))' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, currentPct)}%`,
              background: 'var(--ds-accent-primary, #38bdf8)',
            }}
          />
        </div>
        <p className="text-xs mt-1.5 text-right font-['Tajawal']" style={{ color: 'var(--ds-text-tertiary, #64748b)' }}>
          {Math.round(currentPct)}% مكتمل
        </p>
      </GlassPanel>
    )
  }

  // ── READY (first attempt or cycle reset) ──
  if (type === 'ready') {
    const { attemptNumber, maxAttempts, timeLimitSeconds, totalQuestions } = state
    const timeMins = timeLimitSeconds ? Math.round(timeLimitSeconds / 60) : null
    return (
      <motion.div
        animate={{ boxShadow: ['0 0 0px rgba(251,191,36,0)', '0 0 22px rgba(251,191,36,0.12)', '0 0 0px rgba(251,191,36,0)'] }}
        transition={{ duration: 3.5, repeat: Infinity }}
      >
        <GlassPanel padding="md" hover glow>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <Sparkles size={22} style={{ color: 'var(--ds-color-gold, #fbbf24)', flexShrink: 0 }} />
              <div>
                <p className="font-semibold font-['Tajawal']" style={{ color: 'var(--ds-text-primary, #f8fafc)' }}>
                  اختبار إتقان الوحدة
                </p>
                <p className="text-xs font-['Tajawal'] mt-0.5" style={{ color: 'var(--ds-text-tertiary, #64748b)' }}>
                  {totalQuestions && `${totalQuestions} سؤال`}
                  {timeMins && ` · ${timeMins} دقيقة`}
                  {maxAttempts && ` · ${maxAttempts} محاولات متاحة`}
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate(`/student/unit-mastery/${assessment.id}`)}
              className="px-4 py-2 rounded-xl font-semibold text-sm font-['Tajawal'] flex-shrink-0"
              style={{ background: 'var(--ds-accent-primary, #38bdf8)', color: '#060e1c' }}
            >
              {attemptNumber > 1 ? `المحاولة ${attemptNumber}` : 'ابدئي الاختبار'}
            </button>
          </div>
        </GlassPanel>
      </motion.div>
    )
  }

  // ── COOLDOWN (between fails in a cycle) ──
  if (type === 'cooldown') {
    const { cooldownEndsAt, minutesLeft } = state
    return (
      <GlassPanel padding="md">
        <div className="flex items-center gap-3">
          <Hourglass size={22} style={{ color: 'var(--ds-color-amber, #f59e0b)', flexShrink: 0 }} />
          <div>
            <p className="font-medium font-['Tajawal']" style={{ color: 'var(--ds-text-primary, #f8fafc)' }}>
              حاولي مرة أخرى بعد قليل
            </p>
            <p className="text-sm font-['Tajawal']" style={{ color: 'var(--ds-text-secondary, #cbd5e1)' }}>
              <Countdown endsAt={cooldownEndsAt} label="المتبقي:" />
            </p>
          </div>
        </div>
      </GlassPanel>
    )
  }

  // ── LOCKED OUT (3 fails, < 24h since last) ──
  if (type === 'locked_out') {
    const { lockoutEndsAt, maxAttempts } = state
    return (
      <GlassPanel padding="md">
        <div className="flex items-start gap-3 mb-2">
          <Ban size={20} style={{ color: 'var(--ds-color-red, #f87171)', flexShrink: 0, marginTop: 2 }} />
          <div>
            <p className="font-semibold font-['Tajawal']" style={{ color: 'var(--ds-text-primary, #f8fafc)' }}>
              استنفدتِ محاولاتكِ الـ{maxAttempts}
            </p>
            <p className="text-sm font-['Tajawal'] mt-0.5" style={{ color: 'var(--ds-text-secondary, #cbd5e1)' }}>
              <Countdown endsAt={lockoutEndsAt} label="يُفتح الاختبار بعد:" />
            </p>
            <p className="text-xs font-['Tajawal'] mt-1.5" style={{ color: 'var(--ds-text-tertiary, #64748b)' }}>
              راجعي أنشطة الوحدة في هذه الأثناء
            </p>
          </div>
        </div>
      </GlassPanel>
    )
  }

  // ── PASSED — within retake cooling window ──
  if (type === 'passed_cooling') {
    const { score, retakeAvailableAt, daysLeft } = state
    return (
      <GlassPanel padding="md" glow>
        <div className="flex items-center gap-3 mb-2">
          <CheckCircle2 size={22} style={{ color: 'var(--ds-color-green, #4ade80)', flexShrink: 0 }} />
          <div>
            <p className="font-semibold font-['Tajawal']" style={{ color: 'var(--ds-text-primary, #f8fafc)' }}>
              نجحتِ — درجتكِ {score}%
            </p>
            <p className="text-sm font-['Tajawal'] mt-0.5" style={{ color: 'var(--ds-text-secondary, #cbd5e1)' }}>
              يمكنكِ تحسينها بمحاولة واحدة بعد {daysLeft} {daysLeft === 1 ? 'يوم' : 'أيام'}
            </p>
          </div>
        </div>
      </GlassPanel>
    )
  }

  // ── RETAKE AVAILABLE ──
  if (type === 'retake_available') {
    const { bestScore } = state
    return (
      <motion.div
        animate={{ boxShadow: ['0 0 0px rgba(74,222,128,0)', '0 0 18px rgba(74,222,128,0.1)', '0 0 0px rgba(74,222,128,0)'] }}
        transition={{ duration: 3.5, repeat: Infinity }}
      >
        <GlassPanel padding="md" hover glow>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <RefreshCw size={20} style={{ color: 'var(--ds-color-green, #4ade80)', flexShrink: 0 }} />
              <div>
                <p className="font-semibold font-['Tajawal']" style={{ color: 'var(--ds-text-primary, #f8fafc)' }}>
                  متاحة محاولة لتحسين درجتكِ ({bestScore}%)
                </p>
                <p className="text-xs font-['Tajawal'] mt-0.5" style={{ color: 'var(--ds-text-tertiary, #64748b)' }}>
                  أعلى درجة تُحفظ تلقائيًا
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate(`/student/unit-mastery/${assessment.id}`)}
              className="px-4 py-2 rounded-xl font-semibold text-sm font-['Tajawal'] flex-shrink-0"
              style={{
                background: 'rgba(74,222,128,0.12)',
                color: 'var(--ds-color-green, #4ade80)',
                border: '1px solid rgba(74,222,128,0.3)',
              }}
            >
              أعيدي الاختبار
            </button>
          </div>
        </GlassPanel>
      </motion.div>
    )
  }

  // ── COMPLETE (passed + retake used) ──
  if (type === 'complete') {
    const { bestScore } = state
    return (
      <GlassPanel padding="md" glow>
        <div className="flex items-center gap-3">
          <Award size={24} style={{ color: 'var(--ds-color-gold, #fbbf24)', flexShrink: 0 }} />
          <div>
            <p className="font-semibold font-['Tajawal']" style={{ color: 'var(--ds-text-primary, #f8fafc)' }}>
              اكتملت — أعلى درجة {bestScore}%
            </p>
            <p className="text-xs font-['Tajawal'] mt-0.5" style={{ color: 'var(--ds-text-tertiary, #64748b)' }}>
              اختبار الإتقان · مكتمل
            </p>
          </div>
        </div>
      </GlassPanel>
    )
  }

  return null
}
