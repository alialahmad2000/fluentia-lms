import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Headphones, Clock, VolumeX, Heart, Check, ArrowLeft } from 'lucide-react'

import { useDiagnosticStateV2 } from '@/hooks/ielts/useDiagnosticStateV2'
import { useStudentId } from './_helpers/resolveStudentId'
import { createDiagnosticAttempt } from './_helpers/diagnostic'
import { useG } from '@/i18n/gender'

// ── The Threshold ──────────────────────────────────────────────────────────
// A cinematic dawn: the learner stands at the edge of her IELTS journey. Warm,
// immersive, aspirational — a deliberate departure from a clinical test intake.

const CHECKLIST = [
  { id: 'headphones', icon: Headphones, label: 'السمّاعات موصولة وواضحة' },
  { id: 'time',       icon: Clock,      label: 'لديّ ٣٥ دقيقة متواصلة دون مقاطعة' },
  { id: 'quiet',      icon: VolumeX,    label: 'المكان هادئ', mirror: true },
  { id: 'ready',      icon: Heart,      label: 'أنا مرتاحة، تنفّست، ومستعدّة' },
]

const C = {
  cream: '#f8f1e8', dim: '#dcccba', faint: '#a4917f',
  gold: '#ffd27a', amber: '#f6b45a', rose: '#e97b74',
  arab: "'Tajawal', 'Readex Pro', sans-serif",
  serif: "'Amiri', 'Scheherazade New', Georgia, serif",
}

function DawnAtmosphere() {
  return (
    <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <div className="dawn-sky" style={{
        position: 'absolute', inset: 0,
        background:
          'radial-gradient(120% 82% at 50% 106%, rgba(246,180,90,.55) 0%, rgba(233,123,116,.30) 24%, rgba(30,19,48,0) 56%),' +
          'radial-gradient(92% 54% at 50% 116%, rgba(255,210,122,.48) 0%, rgba(255,210,122,0) 46%),' +
          'radial-gradient(86% 60% at 50% 70%, rgba(246,180,90,.16) 0%, transparent 60%),' +
          'radial-gradient(48% 66% at 50% 44%, rgba(255,210,122,.09) 0%, transparent 72%)',
      }} />
      <div className="dawn-breathe" style={{
        position: 'absolute', inset: 0, transformOrigin: '50% 92%',
        background:
          'radial-gradient(90% 48% at 50% 108%, rgba(255,214,132,.26), transparent 55%),' +
          'radial-gradient(70% 42% at 50% 68%, rgba(246,180,90,.08), transparent 62%)',
      }} />
      <div style={{
        position: 'absolute', left: '-12%', right: '-12%', bottom: '34%', height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(255,210,122,.5) 44%, rgba(255,228,168,.85) 50%, rgba(255,210,122,.5) 56%, transparent)',
        filter: 'blur(.3px)', boxShadow: '0 0 46px 7px rgba(246,180,90,.20)',
      }} />
      <div className="dawn-dust" style={{
        position: 'absolute', inset: 0, opacity: .5,
        backgroundImage:
          'radial-gradient(1.2px 1.2px at 20% 26%, rgba(248,241,232,.5), transparent),' +
          'radial-gradient(1px 1px at 72% 16%, rgba(248,241,232,.34), transparent),' +
          'radial-gradient(1px 1px at 42% 22%, rgba(248,241,232,.3), transparent),' +
          'radial-gradient(1px 1px at 86% 34%, rgba(248,241,232,.22), transparent),' +
          'radial-gradient(1.1px 1.1px at 12% 12%, rgba(248,241,232,.3), transparent)',
      }} />
      <div style={{
        position: 'absolute', inset: 0, mixBlendMode: 'overlay', opacity: .05,
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
      }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(122% 92% at 50% 38%, transparent 54%, rgba(6,4,10,.45) 100%)' }} />
    </div>
  )
}

export default function Diagnostic() {
  const navigate = useNavigate()
  const g = useG()
  const studentId = useStudentId()
  const { loading, state, attemptId, latestOverallBand } = useDiagnosticStateV2()

  const [checked, setChecked] = useState({ headphones: false, time: false, quiet: false, ready: false })
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState(null)

  const allChecked = Object.values(checked).every(Boolean)
  const toggle = (id) => setChecked((p) => ({ ...p, [id]: !p[id] }))

  async function handleStart() {
    if (starting) return
    if (state === 'in_progress' && attemptId) {
      navigate(`/student/ielts-atelier/diagnostic/session/${attemptId}`)
      return
    }
    setStarting(true); setStartError(null)
    try {
      const id = await createDiagnosticAttempt(studentId)
      navigate(`/student/ielts-atelier/diagnostic/session/${id}`)
    } catch (e) {
      setStartError('تعذّر بدء التشخيص — تأكدي من اتصالك وحاولي مرة أخرى.')
      setStarting(false)
    }
  }

  const readyLabel = g('أنا مرتاح، تنفّست، ومستعد', 'أنا مرتاحة، تنفّست، ومستعدّة')
  const ctaLabel = starting
    ? 'جاري التجهيز…'
    : state === 'in_progress'
    ? g('تابع من حيث توقفت', 'تابعي من حيث توقفتِ')
    : g('أنا جاهز، لنبدأ رحلتي', 'أنا جاهزة، لنبدأ رحلتي')

  const rise = (delay) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] },
  })

  return (
    <div dir="rtl" style={{ position: 'relative', minHeight: 'calc(100dvh - 120px)', color: C.cream }}>
      <style>{`
        @keyframes dawn-breathe { 0%,100%{opacity:.85;transform:scale(1)} 50%{opacity:1;transform:scale(1.035)} }
        @keyframes dawn-drift { from{transform:translateY(0)} to{transform:translateY(-16px)} }
        @keyframes dawn-sweep { 0%,58%{transform:translateX(-130%)} 100%{transform:translateX(130%)} }
        .dawn-breathe{ animation:dawn-breathe 17s ease-in-out infinite; will-change:opacity,transform }
        .dawn-dust{ animation:dawn-drift 26s linear infinite }
        .ielts-cta .sweep::before{ content:""; position:absolute; inset:-40%; transform:translateX(-130%);
          background:linear-gradient(115deg, transparent 38%, rgba(255,255,255,.5) 50%, transparent 62%);
          animation:dawn-sweep 5s ease-in-out infinite }
        @media (prefers-reduced-motion: reduce){ .dawn-breathe,.dawn-dust,.ielts-cta .sweep::before{ animation:none } }
      `}</style>

      <DawnAtmosphere />

      <div style={{
        position: 'relative', zIndex: 1, maxWidth: 600, margin: '0 auto',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        minHeight: 'calc(100dvh - 120px)', gap: 32,
        paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
      }}>
        {/* Eyebrow */}
        <motion.div {...rise(0)} style={{ display: 'flex', alignItems: 'center', gap: 12, color: C.gold, fontSize: 12, fontWeight: 600, letterSpacing: '.26em' }}>
          <span style={{ fontFamily: C.serif, letterSpacing: '.2em', fontSize: 13.5, opacity: .92 }}>IELTS</span>
          <span>· طلاقة</span>
          <span style={{ width: 30, height: 1, background: 'linear-gradient(-90deg, #ffd27a, transparent)' }} />
        </motion.div>

        {/* Lede */}
        <motion.div {...rise(0.12)}>
          <h1 style={{ fontFamily: C.serif, fontWeight: 400, lineHeight: 1.44, fontSize: 'clamp(30px,7.4vw,46px)', margin: 0, textWrap: 'balance', textShadow: '0 1px 44px rgba(246,180,90,.2)' }}>
            لحظةٌ واحدة،<br />ثمّ نعرف <span style={{ color: C.gold }}>أين تقف{g('', 'ين')}</span>.
          </h1>
          <p style={{ marginTop: 16, fontSize: 16.5, lineHeight: 1.85, color: C.cream, opacity: .9, maxWidth: '40ch', fontFamily: C.arab }}>
            اليوم ليس اختباراً — اليوم نرسم خريطتك نحو هدفك.
          </p>
        </motion.div>

        {/* Coach — a warm light, whispering */}
        <motion.div {...rise(0.12)} style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div style={{
            flex: 'none', width: 58, height: 58, borderRadius: '50%',
            background: 'radial-gradient(circle at 32% 26%, #ffe4ad, #e97b74 60%, #7a2f4e)',
            boxShadow: '0 0 0 1px rgba(255,210,122,.42), 0 0 44px rgba(233,123,116,.42), 0 8px 26px rgba(122,47,78,.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: C.serif, fontSize: 22, color: '#3a1220', fontWeight: 700,
          }}>ع</div>
          <div style={{ borderInlineStart: '1px solid rgba(246,180,90,.28)', paddingInlineStart: 15, fontFamily: C.serif, fontSize: 16, lineHeight: 2, color: C.dim }}>
            <span style={{ display: 'block', color: C.gold, fontSize: 12, fontWeight: 600, letterSpacing: '.05em', marginBottom: 7, fontFamily: C.arab }}>د. علي الأحمد — مدرّب IELTS</span>
            سنقضي هذه الدقائق معاً: <b style={{ color: C.cream, fontWeight: 700, fontFamily: C.arab }}>استماع، قراءة، كتابة، محادثة.</b> {g('لا تقلق من الأخطاء', 'لا تقلقي من الأخطاء')} — هي ما يرسم لنا الطريق. {g('بعد الانتهاء، ستحصل على خريطتك الكاملة.', 'بعد الانتهاء، ستحصلين على خريطتك الكاملة.')}
          </div>
        </motion.div>

        {/* Checklist — tap to confirm; the doorway ignites when all four are lit */}
        <motion.div {...rise(0.22)} style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          <div style={{ fontSize: 12.5, color: C.faint, letterSpacing: '.12em' }}>قبل أن نبدأ — {g('تأكد من هذه الأربع', 'تأكّدي من هذه الأربع')}</div>
          {CHECKLIST.map(({ id, icon: Icon, label, mirror }) => {
            const on = checked[id]
            return (
              <motion.button key={id} onClick={() => toggle(id)} whileTap={{ scale: 0.99 }} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderRadius: 15, cursor: 'pointer', textAlign: 'right',
                border: `1px solid ${on ? 'rgba(246,180,90,.44)' : 'rgba(248,241,232,.1)'}`,
                background: on ? 'linear-gradient(180deg, rgba(246,180,90,.11), rgba(233,123,116,.05))' : 'linear-gradient(180deg, rgba(248,241,232,.04), rgba(248,241,232,.014))',
                backdropFilter: 'blur(7px)', WebkitBackdropFilter: 'blur(7px)', transition: 'border-color .25s, background .25s',
              }}>
                <span style={{
                  flex: 'none', width: 24, height: 24, borderRadius: '50%',
                  border: `1.5px solid ${on ? C.gold : 'rgba(248,241,232,.28)'}`,
                  background: on ? 'radial-gradient(circle at 35% 30%, #ffe4ad, #f6b45a)' : 'transparent',
                  boxShadow: on ? '0 0 18px rgba(246,180,90,.55)' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .25s',
                }}>
                  {on && <Check size={13} strokeWidth={3} color="#3a1220" />}
                </span>
                <span style={{ flex: 1, fontSize: 15, fontWeight: on ? 600 : 500, color: on ? C.cream : C.dim, fontFamily: C.arab, transition: 'color .25s' }}>
                  {id === 'ready' ? readyLabel : label}
                </span>
                <span style={{ flex: 'none', color: on ? C.amber : C.faint, transform: mirror ? 'scaleX(-1)' : 'none', transition: 'color .25s' }}>
                  <Icon size={18} strokeWidth={1.6} />
                </span>
              </motion.button>
            )
          })}
        </motion.div>

        {/* CTA — light spilling through the lit doorway */}
        <motion.div {...rise(0.32)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, paddingTop: 4 }}>
          <button
            className="ielts-cta"
            onClick={allChecked && !starting ? handleStart : undefined}
            disabled={!allChecked || starting}
            style={{
              position: 'relative', overflow: 'hidden', width: '100%', maxWidth: 460, padding: 20, borderRadius: 18, border: 0,
              fontFamily: C.arab, fontSize: 17.5, fontWeight: 700, letterSpacing: '.01em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              cursor: allChecked && !starting ? 'pointer' : 'not-allowed',
              color: allChecked ? '#2a160a' : 'rgba(248,241,232,.5)',
              background: allChecked
                ? 'linear-gradient(180deg,#ffe0a0,#f6b45a 54%,#ec9a52)'
                : 'linear-gradient(180deg, rgba(248,241,232,.06), rgba(248,241,232,.02))',
              boxShadow: allChecked
                ? '0 -24px 66px -14px rgba(255,214,132,.5), 0 12px 36px -6px rgba(246,180,90,.55), 0 0 0 1px rgba(255,228,168,.55) inset, 0 2px 0 rgba(255,255,255,.42) inset'
                : '0 0 0 1px rgba(248,241,232,.08) inset',
              transition: 'background .3s, box-shadow .3s, color .3s',
            }}
          >
            {starting && <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid currentColor', borderTopColor: 'transparent', animation: 'spin 1s linear infinite', display: 'inline-block' }} />}
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            {ctaLabel}
            {allChecked && !starting && <span className="sweep" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />}
          </button>

          {startError ? (
            <p style={{ fontSize: 12.5, color: '#f6a6a0', textAlign: 'center', margin: 0, fontFamily: C.arab }}>{startError}</p>
          ) : (
            <p style={{ fontSize: 12.5, color: C.dim, textAlign: 'center', margin: 0, fontFamily: C.arab, textShadow: '0 1px 12px rgba(6,4,10,.6)' }}>
              قراءة · استماع · كتابة · محادثة — <b style={{ color: C.cream, fontWeight: 600 }}>نحو ٣٥ دقيقة، بلا ضغط</b>
            </p>
          )}
        </motion.div>

        {/* Resume / already-taken */}
        {!loading && state === 'completed' && latestOverallBand != null && (
          <motion.div {...rise(0.42)} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
            padding: '14px 18px', borderRadius: 14, border: '1px solid rgba(248,241,232,.1)',
            background: 'linear-gradient(180deg, rgba(248,241,232,.04), rgba(248,241,232,.012))', backdropFilter: 'blur(7px)',
          }}>
            <span style={{ fontSize: 13, color: C.dim, fontFamily: C.arab }}>آخر نتيجة: Band {Number(latestOverallBand).toFixed(1)}</span>
            <Link to="/student/ielts-atelier/diagnostic/results" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700, color: C.gold, textDecoration: 'none', fontFamily: C.arab }}>
              {g('شاهد نتيجتك', 'شاهدي نتيجتكِ')} <ArrowLeft size={13} />
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  )
}
