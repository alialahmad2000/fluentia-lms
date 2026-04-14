import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

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
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 16,
        padding: 24,
        direction: 'rtl',
        fontFamily: 'Tajawal, sans-serif',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
    borderRadius: 8,
    background:
      'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
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
  const streakColor = atMilestone || streak >= nextMilestone ? '#fbbf24' : '#38bdf8'
  const showPulse = streak >= 3

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 16,
        padding: 24,
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
          0% { box-shadow: 0 0 0 0 rgba(251,191,36,0.5); }
          70% { box-shadow: 0 0 0 12px rgba(251,191,36,0); }
          100% { box-shadow: 0 0 0 0 rgba(251,191,36,0); }
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
              color: '#fbbf24',
            }}
          >
            ابدأ سلسلتك اليوم 🔥
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
                  ? 'radial-gradient(circle, rgba(251,191,36,0.12) 0%, transparent 70%)'
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
                color: 'rgba(255,255,255,0.6)',
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
              color: 'rgba(255,255,255,0.4)',
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
                color: 'rgba(255,255,255,0.35)',
                marginBottom: 6,
              }}
            >
              {MILESTONES.map((m) => (
                <span
                  key={m}
                  style={{
                    color: streak >= m ? '#fbbf24' : 'rgba(255,255,255,0.35)',
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
                borderRadius: 3,
                background: 'rgba(255,255,255,0.06)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(progress, 100)}%`,
                  borderRadius: 3,
                  background: 'linear-gradient(90deg, #38bdf8, #fbbf24)',
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
