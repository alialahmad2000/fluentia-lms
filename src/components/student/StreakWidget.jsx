import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useG } from '../../i18n/gender'

/* ------------------------------------------------------------------ */
/*  Milestones                                                         */
/* ------------------------------------------------------------------ */
const MILESTONES = [7, 14, 30, 60, 90]

function getMilestoneProgress(streak) {
  if (streak >= MILESTONES[MILESTONES.length - 1]) return 100
  for (let i = 0; i < MILESTONES.length; i++) {
    if (streak < MILESTONES[i]) {
      const prev = i === 0 ? 0 : MILESTONES[i - 1]
      return ((streak - prev) / (MILESTONES[i] - prev)) * 100
    }
  }
  return 100
}

function isAtMilestone(streak) {
  return MILESTONES.includes(streak)
}

function getNextMilestone(streak) {
  return MILESTONES.find((m) => m > streak) || MILESTONES[MILESTONES.length - 1]
}

/* ------------------------------------------------------------------ */
/*  Skeleton shimmer                                                    */
/* ------------------------------------------------------------------ */
function Skeleton() {
  return (
    <div
      style={{
        background: 'var(--ds-surface-1)',
        border: '1px solid var(--ds-border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-5)',
        boxShadow: 'var(--ds-shadow-sm), inset 0 1px 0 rgba(255,255,255,0.06)',
        direction: 'rtl',
        fontFamily: 'Tajawal, sans-serif',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <div style={shimmerStyle(120, 24)} />
        <div style={shimmerStyle(60, 48)} />
        <div style={shimmerStyle(100, 16)} />
        <div style={shimmerStyle('100%', 8)} />
      </div>
      <style>{shimmerKeyframes}</style>
    </div>
  )
}

function shimmerStyle(width, height) {
  return {
    width: typeof width === 'number' ? width : width,
    height,
    borderRadius: 'var(--radius-md)',
    background:
      'linear-gradient(90deg, var(--ds-surface-2) 25%, var(--ds-surface-3) 50%, var(--ds-surface-2) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
  }
}

const shimmerKeyframes = `
  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`

/* ------------------------------------------------------------------ */
/*  StreakWidget                                                        */
/* ------------------------------------------------------------------ */
export default function StreakWidget({ profileId }) {
  const g = useG()
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  const { data, isLoading, isError } = useQuery({
    queryKey: ['student-streak', profileId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_student_streak', {
        p_student_id: profileId,
      })
      if (error) throw error
      if (!isMounted.current) return null
      return data?.[0] ?? null
    },
    enabled: !!profileId,
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) return <Skeleton />
  if (isError || !data) return null

  const { current_streak, longest_streak } = data
  const streak = current_streak ?? 0
  const longest = longest_streak ?? 0
  const atMilestone = isAtMilestone(streak)
  const nextMilestone = getNextMilestone(streak)
  const progress = getMilestoneProgress(streak)
  const streakColor =
    atMilestone || streak >= nextMilestone
      ? 'var(--ds-accent-gold, var(--ds-accent-warning))'
      : 'var(--ds-accent-primary)'
  const showPulse = streak >= 3

  return (
    <div
      style={{
        background: 'var(--ds-surface-1)',
        border: '1px solid var(--ds-border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-5)',
        boxShadow: 'var(--ds-shadow-sm), inset 0 1px 0 rgba(255,255,255,0.06)',
        direction: 'rtl',
        fontFamily: 'Tajawal, sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes pulse-fire {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
        @keyframes celebrate-ring {
          0% { box-shadow: 0 0 0 0 var(--ds-accent-primary-glow); }
          70% { box-shadow: 0 0 0 12px transparent; }
          100% { box-shadow: 0 0 0 0 transparent; }
        }
        ${shimmerKeyframes}
      `}</style>

      {streak === 0 ? (
        /* ---- Zero streak encouragement ---- */
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            padding: '8px 0',
          }}
        >
          <span style={{ fontSize: 36 }}>🔥</span>
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--ds-accent-gold, var(--ds-accent-warning))',
            }}
          >
            {g('ابدأ سلسلتك اليوم 🔥', 'ابدئي سلسلتك اليوم 🔥')}
          </span>
        </div>
      ) : (
        <>
          {/* ---- Fire + number row ---- */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              marginBottom: 8,
            }}
          >
            <span
              style={{
                fontSize: 40,
                lineHeight: 1,
                display: 'inline-block',
                animation: showPulse ? 'pulse-fire 1.4s ease-in-out infinite' : 'none',
              }}
            >
              🔥
            </span>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                width: 64,
                height: 64,
                animation: atMilestone ? 'celebrate-ring 1.5s ease-out infinite' : 'none',
                background: atMilestone
                  ? 'radial-gradient(circle, var(--ds-accent-primary-glow) 0%, transparent 70%)'
                  : 'transparent',
              }}
            >
              <span
                style={{
                  fontSize: 36,
                  fontWeight: 800,
                  color: streakColor,
                  lineHeight: 1,
                }}
              >
                {streak}
              </span>
            </div>

            <span
              style={{
                fontSize: 16,
                color: 'var(--ds-text-secondary)',
                fontWeight: 500,
              }}
            >
              يوم متتالي
            </span>
          </div>

          {/* ---- Longest streak subtext ---- */}
          <div
            style={{
              fontSize: 13,
              color: 'var(--ds-text-tertiary)',
              marginBottom: 14,
            }}
          >
            أطول سلسلة: {longest}
          </div>

          {/* ---- Milestone progress bar ---- */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 11,
                color: 'var(--ds-text-tertiary)',
                marginBottom: 6,
              }}
            >
              {MILESTONES.map((m) => (
                <span
                  key={m}
                  style={{
                    color:
                      streak >= m
                        ? 'var(--ds-accent-gold, var(--ds-accent-warning))'
                        : 'var(--ds-text-tertiary)',
                    fontWeight: streak >= m ? 700 : 400,
                  }}
                >
                  {m}
                </span>
              ))}
            </div>
            <div
              style={{
                height: 6,
                borderRadius: 'var(--radius-full)',
                background: 'var(--ds-surface-3)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(progress, 100)}%`,
                  borderRadius: 'var(--radius-full)',
                  background:
                    'linear-gradient(90deg, var(--ds-accent-primary), var(--ds-accent-gold, var(--ds-accent-primary)))',
                  transition: 'width 0.6s ease',
                }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
