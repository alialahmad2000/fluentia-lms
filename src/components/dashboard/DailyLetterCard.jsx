import { useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { useDailyLetter } from '@/hooks/useDailyLetter'
import { useAuthStudentData } from '@/stores/authStore'

/* ------------------------------------------------------------------ *
 * Daily Trainer Letter — the morning letter that opens the v2 dashboard.
 *
 * The letter body/salutation/signature are generated server-side per student
 * with the correct grammatical gender (generate-daily-letters edge function).
 * This card is a thin, gender-aware VIEW: it reads the stored letter, and while
 * it loads shows a gender-neutral optimistic placeholder so there's no flash of
 * empty space. RTL throughout.
 * ------------------------------------------------------------------ */

const GOLD = 'var(--ds-accent-primary, #e9b949)'
const INK = 'var(--ds-text-primary, #f8fafc)'
const INK_2 = 'var(--ds-text-secondary, #94a3b8)'
const INK_3 = 'var(--ds-text-tertiary, #64748b)'
const F_SALUT = "'Amiri', serif"
const F_BODY = "'Readex Pro', sans-serif"
const APPLE = [0.16, 1, 0.3, 1]

/* Intentionally NEUTRAL phrasing — works identically for both genders, so the
 * pre-load placeholder never shows wrong-gender Arabic. */
function buildOptimisticTemplate(data) {
  if (!data) return null
  const streak = Number(data?.streak?.current) || 0
  const levelName = data?.level?.current || 'مستواك'
  const pct = Number(data?.level?.percent) || 0
  const line1 =
    streak > 0
      ? `${streak} ${streak < 11 ? 'أيام' : 'يومًا'} متّصلة. ${levelName} بنسبة ${pct}٪.`
      : `${levelName} بنسبة ${pct}٪.`
  return `${line1}\n\nعملٌ هادئ، مستمرّ.`
}

/* Gendered action-button label (Phase B.4.1). */
function getActionLabel(action, gender, count) {
  const m = gender === 'male'
  switch (action) {
    case 'join_class':
      return m ? 'انضمّ للصف' : 'انضمّي للصف'
    case 'review_anki':
      return m ? `راجع ${count} كلمات` : `راجعي ${count} كلمات`
    case 'explore_unit':
      return m ? 'اكتشف وحدة جديدة' : 'اكتشفي وحدة جديدة'
    case 'start_challenge':
      return m ? 'ابدأ التحدّي' : 'ابدئي التحدّي'
    default:
      return ''
  }
}

/* Decide which 1–2 actions to surface, from the dashboard feed. */
function resolveActions(data, gender) {
  const out = []
  const ankiDue = Number(data?.anki_due) || 0
  const nextClass = data?.next_class || null
  const challenge = data?.daily_challenge || null

  if (ankiDue > 0)
    out.push({ key: 'review_anki', href: '/student/anki', label: getActionLabel('review_anki', gender, ankiDue) })
  if (nextClass?.meet_url)
    out.push({ key: 'join_class', href: nextClass.meet_url, label: getActionLabel('join_class', gender) })
  if (challenge)
    out.push({
      key: 'start_challenge',
      href: `/student/challenges${challenge.id ? `/${challenge.id}` : ''}`,
      label: getActionLabel('start_challenge', gender),
    })
  if (out.length === 0)
    out.push({ key: 'explore_unit', href: '/student/curriculum', label: getActionLabel('explore_unit', gender) })

  return out.slice(0, 2)
}

function LetterActionFooter({ data, gender, prefersReduced }) {
  const actions = resolveActions(data, gender)
  if (actions.length === 0) return null
  return (
    <div
      dir="rtl"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 24,
        paddingTop: 20,
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {actions.map((a, i) => {
        const primary = i === 0
        return (
          <motion.a
            key={a.key}
            href={a.href}
            whileHover={prefersReduced ? undefined : { scale: 1.03 }}
            whileTap={prefersReduced ? undefined : { scale: 0.97 }}
            transition={{ duration: 0.3, ease: APPLE }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '11px 22px',
              borderRadius: 999,
              fontFamily: F_BODY,
              fontWeight: 600,
              fontSize: 14,
              textDecoration: 'none',
              background: primary ? GOLD : 'rgba(255,255,255,0.04)',
              color: primary ? '#1a1206' : INK,
              border: primary ? 'none' : '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {a.label}
            <ArrowLeft size={16} strokeWidth={2.2} />
          </motion.a>
        )
      })}
    </div>
  )
}

export default function DailyLetterCard({ data, profile, isMobile }) {
  const prefersReduced = useReducedMotion()
  const studentData = useAuthStudentData()
  const { letter, isLoading } = useDailyLetter(profile?.id)

  // Gender resolution order: the stored letter (authoritative) → student row →
  // female default (majority). Drives placeholder + action labels only.
  const gender = letter?.gender || studentData?.gender || 'female'

  const optimistic = useMemo(() => buildOptimisticTemplate(data), [data])

  const showLetter = !!letter?.body_ar
  const bodyText = showLetter ? letter.body_ar : optimistic
  const paragraphs = useMemo(
    () => String(bodyText || '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean),
    [bodyText],
  )

  // Before any data at all → reserve height to keep CLS low, render nothing loud.
  if (!showLetter && !optimistic && !isLoading) return null

  const salutation =
    letter?.salutation ||
    `${profile?.display_name || profile?.full_name || 'صباح الخير'}،`
  const signature = letter?.signature || '— د. محمد'

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: APPLE }}
      style={{ maxWidth: 720, margin: '0 auto 28px' }}
    >
      <div
        dir="rtl"
        style={{
          position: 'relative',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: isMobile ? 'blur(28px) saturate(160%)' : 'blur(20px) saturate(140%)',
          WebkitBackdropFilter: isMobile ? 'blur(28px) saturate(160%)' : 'blur(20px) saturate(140%)',
          boxShadow: '0 32px 64px -24px rgba(0,0,0,0.6)',
          borderRadius: 20,
          padding: isMobile ? '28px 22px' : '44px 48px',
          // a hair of warmth at the top edge — like light on paper
          backgroundImage:
            'radial-gradient(120% 80% at 50% -10%, rgba(233,185,73,0.07), transparent 60%)',
        }}
      >
        {/* salutation — Amiri, large */}
        <h2
          style={{
            margin: 0,
            fontFamily: F_SALUT,
            fontWeight: 700,
            fontSize: isMobile ? 30 : 40,
            lineHeight: 1.3,
            color: INK,
            letterSpacing: '0.2px',
          }}
        >
          {salutation}
        </h2>

        {/* body — Readex Pro */}
        <div style={{ marginTop: isMobile ? 18 : 24 }}>
          {paragraphs.map((p, i) => (
            <p
              key={i}
              style={{
                margin: i === 0 ? 0 : '14px 0 0',
                fontFamily: F_BODY,
                fontSize: isMobile ? 17 : 19,
                lineHeight: 2,
                color: showLetter ? INK_2 : INK_3,
                opacity: showLetter ? 1 : 0.75,
              }}
            >
              {p}
            </p>
          ))}
        </div>

        {/* signature — rotated Amiri italic, like a real sign-off */}
        <div
          style={{
            marginTop: isMobile ? 22 : 30,
            display: 'flex',
            justifyContent: 'flex-start',
          }}
        >
          <span
            style={{
              fontFamily: F_SALUT,
              fontStyle: 'italic',
              fontSize: isMobile ? 19 : 22,
              color: GOLD,
              transform: 'rotate(-2deg)',
              transformOrigin: 'right center',
              opacity: 0.92,
            }}
          >
            {signature}
          </span>
        </div>

        {/* gendered action footer */}
        <LetterActionFooter data={data} gender={gender} prefersReduced={prefersReduced} />
      </div>
    </motion.div>
  )
}
