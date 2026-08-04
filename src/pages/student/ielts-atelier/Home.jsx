import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStudentId } from './_helpers/resolveStudentId'
import { useLatestResult, useSkillProgress, useAdaptivePlan, useErrorBankCount } from '@/hooks/ielts/useIELTSHub'
import { generatePlan } from '@/lib/ielts/plan-generator'
import { useAuthStore } from '@/stores/authStore'
import { useG } from '@/i18n/gender'
import { Card, SectionHeader, BandTrack, BandGauge, SkillCard, Icon, PrimaryButton } from './_ui/primitives'
import CoachDirective from './_ui/CoachDirective'
import JourneyStations from './_ui/JourneyStations'
import CoachHelps from './_ui/CoachHelps'
import GoalModal from './_ui/GoalModal'

const BASE = '/student/ielts-atelier'
const SKILLS = ['reading', 'listening', 'writing', 'speaking']
const SKILL_LABEL = { reading: 'القراءة', listening: 'الاستماع', writing: 'الكتابة', speaking: 'المحادثة' }
const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

function daysUntil(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d)) return null
  return Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86400000))
}

export default function Home() {
  const navigate = useNavigate()
  const g = useG()
  const studentId = useStudentId()
  const profile = useAuthStore((s) => s.profile)
  const { data: result } = useLatestResult(studentId)
  const { data: skillsData } = useSkillProgress(studentId)
  const { data: plan } = useAdaptivePlan(studentId)
  const { data: errCount } = useErrorBankCount(studentId)
  const [showGoal, setShowGoal] = useState(false)

  const name = (profile?.display_name || profile?.full_name || '').split(' ')[0] || ''
  const overall = result?.overall_band != null ? Number(result.overall_band) : null
  const target = plan?.target_band != null ? Number(plan.target_band) : null
  const examDate = plan?.target_exam_date || plan?.exam_date || null
  const days = daysUntil(examDate)
  const hasResult = overall != null

  const bandOf = (s) => {
    const r = result?.[`${s}_score`]
    if (r != null) return Number(r)
    const b = skillsData?.[s]?.band
    return b != null ? Number(b) : null
  }
  const skillBands = Object.fromEntries(SKILLS.map((s) => [s, bandOf(s)]))
  const rated = SKILLS.filter((s) => skillBands[s] != null)
  const weakest = rated.length ? rated.reduce((a, b) => (skillBands[a] <= skillBands[b] ? a : b)) : null
  const weakestBand = weakest ? skillBands[weakest] : null

  // The guide's brain: the single "do this now" directive + today's balanced rotation.
  const guidePlan = useMemo(() => {
    try {
      return generatePlan({
        studentId: studentId || 'x',
        currentBand: overall,
        targetBand: target ?? 7,
        examDate,
        weakAreas: weakest ? [{ skill: weakest, band: weakestBand }] : [],
        errorSummary: { total: errCount || 0, due: errCount || 0, hotspots: [] },
        hasDiagnostic: hasResult,
      })
    } catch { return null }
  }, [studentId, overall, target, examDate, weakest, weakestBand, errCount, hasResult])
  const todayTasks = guidePlan?.weekly_schedule?.[DAY_KEYS[new Date().getDay()]] || []

  const go = (p) => navigate(p ? `${BASE}/${p}` : BASE)

  // ── Empty / onboarding state ──────────────────────────────────────────────
  if (!hasResult) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22, paddingTop: 6 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--iel-ink)', margin: 0 }}>
          {name ? `مرحباً ${name}` : 'مرحباً بك'} <span style={{ color: 'var(--iel-ink-3)', fontWeight: 600 }}>— هذا حسابك للآيلتس، وهذي رحلتك</span>
        </h1>
        <Card style={{ padding: '16px 20px' }}>
          <JourneyStations hasResult={false} daysLeft={days} onOpen={() => go('journey')} />
        </Card>
        <Card style={{ padding: '30px', display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 28, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--iel-accent)', letterSpacing: '.1em', marginBottom: 12 }}>الخطوة الأولى</div>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: 'var(--iel-ink)', margin: '0 0 12px', lineHeight: 1.4 }}>لنقِس مستواك بدقّة.</h2>
            <p style={{ fontSize: 15.5, color: 'var(--iel-ink-2)', lineHeight: 1.9, margin: '0 0 22px', maxWidth: '42ch' }}>
              اختبار تشخيصي قصير يقيس مهاراتك الأربع، ثم يرسم خطّتك نحو هدفك — نحو ٣٥ دقيقة، بلا ضغط.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <PrimaryButton onClick={() => go('diagnostic')}>{g('ابدأ الاختبار التشخيصي', 'ابدئي الاختبار التشخيصي')} <Icon.chevron size={17} sw={2.4} /></PrimaryButton>
              <button onClick={() => setShowGoal(true)} style={{ background: 'none', border: 0, color: 'var(--iel-accent)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: "'Tajawal', sans-serif" }}>حدّد هدفك ومعادك أولاً</button>
            </div>
          </div>
          <button onClick={() => setShowGoal(true)} style={{ cursor: 'pointer', background: 'var(--iel-surface-2)', border: '1px solid var(--iel-border)', borderRadius: 16, padding: '16px 12px', fontFamily: "'Tajawal', sans-serif", backdropFilter: 'blur(8px)' }}>
            <div style={{ fontSize: 12, color: 'var(--iel-ink-3)', fontWeight: 700, marginBottom: 4, textAlign: 'center' }}>هدفك</div>
            <BandGauge current={null} target={target ?? 7} size={176} label="لم يُقس بعد" />
          </button>
        </Card>
        <CoachHelps />
        <div>
          <SectionHeader title="مهاراتك الأربع" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 13 }}>
            {SKILLS.map((s) => (
              <SkillCard key={s} skill={s} label={SKILL_LABEL[s]} current={null} target={target} last="لم تُقس بعد" onClick={() => go('diagnostic')} />
            ))}
          </div>
        </div>
        <GoalModal open={showGoal} onClose={() => setShowGoal(false)} studentId={studentId} initial={plan} />
      </div>
    )
  }

  // ── Full overview ─────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingTop: 2 }}>
      {/* Cinematic editorial masthead — speaks to her by name */}
      <div className="iel-mast">
        <div className="eyebrow"><span className="spark" />رحلتك نحو الآيلتس</div>
        <h1>
          {name ? `أهلاً، ${name} — ` : 'أهلاً بك — '}
          {target != null
            ? <>هدفك <span className="band">Band {target.toFixed(1)}</span> في المتناول.</>
            : 'لنقترب خطوة اليوم.'}
        </h1>
        <p className="sub">كل جلسة قصيرة تقرّبك خطوة. هذه لوحتك — نطاقك الحالي، أقرب خطوة، والأيام حتى الاختبار.</p>
      </div>

      {/* Coach Directive — the one thing to do right now */}
      <CoachDirective action={guidePlan?.next_recommended_action} todayTasks={todayTasks} weakest={weakest} onGo={go} />

      {/* Hero — cinematic showpiece: band gauge + trajectory + countdown */}
      <div className="iel-hero">
        <div className="iel-hero-glow" aria-hidden />
        <div className="iel-hero-gauge">
          <BandGauge current={overall} target={target} size={224} />
        </div>
        <div className="iel-hero-body">
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--iel-accent)', letterSpacing: '.1em', marginBottom: 8 }}>مستواك الحالي</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--iel-ink)', margin: '0 0 6px', lineHeight: 1.35 }}>
            {target != null && target - overall > 0
              ? <>تبقّى <span style={{ color: 'var(--iel-gold-ink, var(--iel-gold))' }}>{Math.max(0, target - overall).toFixed(1)}</span> نطاق للوصول إلى هدفك</>
              : target != null ? 'بلغت هدفك — لنثبّت مستواك' : 'رحلتك نحو الآيلتس مستمرة'}
          </h2>
          <p style={{ fontSize: 13.5, color: 'var(--iel-ink-2)', margin: '0 0 16px', lineHeight: 1.8, maxWidth: '44ch' }}>
            {weakest ? <>أكبر فرصة للتقدّم اليوم في <b style={{ color: 'var(--iel-ink)' }}>{SKILL_LABEL[weakest]}</b> — جلسة قصيرة مستهدفة تقرّبك خطوة.</> : 'واصل التدريب المنتظم، ودع النطاق يرتفع.'}
          </p>
          <BandTrack current={overall} target={target} />
          <div style={{ marginTop: 18 }}>
            <PrimaryButton onClick={() => go(weakest || 'reading')}>{g('ابدأ جلسة اليوم', 'ابدئي جلسة اليوم')} <Icon.chevron size={17} sw={2.4} /></PrimaryButton>
          </div>
        </div>
        <div className="iel-hero-count">
          {days != null ? (
            <>
              <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '.1em', color: 'var(--iel-ink-3)', textTransform: 'uppercase' }}>حتى الاختبار</div>
              <div className="big" style={{ margin: '8px 0 2px' }}>{days}</div>
              <div style={{ fontSize: 12.5, color: 'var(--iel-ink-2)', fontWeight: 700 }}>يوماً</div>
              {target != null && <><div className="div" /><div style={{ fontSize: 12.5, color: 'var(--iel-gold-ink)', fontWeight: 800 }}>الهدف · Band {target.toFixed(1)}</div></>}
            </>
          ) : (
            <>
              <div style={{ fontSize: 13.5, color: 'var(--iel-ink-2)', fontWeight: 700, marginBottom: 12, lineHeight: 1.7 }}>حدّد موعد اختبارك<br />لنبني خطّتك الزمنية</div>
              <button onClick={() => setShowGoal(true)} style={{ background: 'var(--iel-accent-soft)', color: 'var(--iel-accent-ink)', border: 0, borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Tajawal', sans-serif" }}>تحديد الموعد</button>
            </>
          )}
        </div>
      </div>

      {/* Journey — you are here */}
      <div>
        <div className="iel-slabel"><span className="t">رحلتك</span><span className="en">Your journey</span><span className="rule" /><button className="act" onClick={() => go('journey')}>الخطة الكاملة ←</button></div>
        <Card style={{ padding: '18px 22px' }}>
          <JourneyStations hasResult={hasResult} daysLeft={days} onOpen={() => go('journey')} />
        </Card>
      </div>

      {/* Skills */}
      <div>
        <div className="iel-slabel"><span className="t">مهاراتك الأربع</span><span className="en">Four skills</span><span className="rule" /><button className="act" onClick={() => go(weakest || 'reading')}>التفاصيل ←</button></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 13 }}>
          {SKILLS.map((s) => (
            <SkillCard key={s} skill={s} label={SKILL_LABEL[s]} current={skillBands[s]} target={target} focus={s === weakest && rated.length > 1} last={skillBands[s] != null ? undefined : 'لم تُقس بعد'} onClick={() => go(s)} />
          ))}
        </div>
      </div>

      <GoalModal open={showGoal} onClose={() => setShowGoal(false)} studentId={studentId} initial={plan} />
    </div>
  )
}
