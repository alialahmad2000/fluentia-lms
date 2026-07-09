import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStudentId } from './_helpers/resolveStudentId'
import { useLatestResult, useSkillProgress, useAdaptivePlan, useErrorBankCount } from '@/hooks/ielts/useIELTSHub'
import { useAuthStore } from '@/stores/authStore'
import { useG } from '@/i18n/gender'
import { Card, SectionHeader, Chip, BandTrack, BandGauge, SkillCard, TaskRow, Icon, PrimaryButton } from './_ui/primitives'
import GoalModal from './_ui/GoalModal'

const BASE = '/student/ielts-atelier'
const SKILLS = ['reading', 'listening', 'writing', 'speaking']
const SKILL_LABEL = { reading: 'القراءة', listening: 'الاستماع', writing: 'الكتابة', speaking: 'المحادثة' }

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

  const go = (p) => navigate(p ? `${BASE}/${p}` : BASE)

  // ── Empty / onboarding state ──────────────────────────────────────────────
  if (!hasResult) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22, paddingTop: 6 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--iel-ink)', margin: 0 }}>
          {name ? `مرحباً ${name}` : 'مرحباً بك'} <span style={{ color: 'var(--iel-ink-3)', fontWeight: 600 }}>— لنبدأ رحلتك في الآيلتس</span>
        </h1>
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
  const nextSteps = []
  if (weakest) nextSteps.push({ tag: SKILL_LABEL[weakest], title: `تدرّب على ${SKILL_LABEL[weakest]}`, sub: 'أكبر فجوة نحو هدفك — جلسة مستهدفة', to: weakest })
  if (errCount > 0) nextSteps.push({ tag: 'مراجعة', title: `راجع ${errCount} خطأً مستحقّاً`, sub: 'بنك الأخطاء — مراجعة متباعدة', to: 'errors' })
  nextSteps.push({ tag: 'محاكاة', title: 'محاكاة كاملة تحت ظروف الاختبار', sub: 'أربعة أقسام — قياس شامل لجاهزيتك', to: 'mock' })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingTop: 2 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 21, fontWeight: 800, color: 'var(--iel-ink)', margin: 0 }}>
          {name ? `مرحباً ${name}` : 'مرحباً'} <span style={{ color: 'var(--iel-ink-3)', fontWeight: 600 }}>— لنقترب خطوة اليوم</span>
        </h1>
        <div style={{ display: 'flex', gap: 10 }}>
          {days != null
            ? <Chip><span style={{ color: 'var(--iel-ink-3)', fontWeight: 600 }}>الاختبار بعد</span> {days} يوماً</Chip>
            : <Chip muted>لم تُحدَّد موعد الاختبار</Chip>}
          {target != null && <Chip dot>الهدف Band {target.toFixed(1)}</Chip>}
        </div>
      </div>

      {/* Hero — cinematic showpiece: band gauge + trajectory + countdown */}
      <div className="iel-hero">
        <div className="iel-hero-glow" aria-hidden />
        <div className="iel-hero-gauge">
          <BandGauge current={overall} target={target} />
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
              <div className="iel-serif" style={{ fontSize: 44, fontWeight: 600, color: 'var(--iel-ink)', lineHeight: 1 }}>{days}</div>
              <div style={{ fontSize: 12.5, color: 'var(--iel-ink-2)', fontWeight: 700, marginTop: 5 }}>يوماً حتى الاختبار</div>
              {target != null && <div style={{ fontSize: 11.5, color: 'var(--iel-ink-3)', fontWeight: 700, marginTop: 10 }}>الهدف · Band {target.toFixed(1)}</div>}
            </>
          ) : (
            <>
              <div style={{ fontSize: 13.5, color: 'var(--iel-ink-2)', fontWeight: 700, marginBottom: 12, lineHeight: 1.7 }}>حدّد موعد اختبارك<br />لنبني خطّتك الزمنية</div>
              <button onClick={() => setShowGoal(true)} style={{ background: 'var(--iel-accent-soft)', color: 'var(--iel-accent-ink)', border: 0, borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Tajawal', sans-serif" }}>تحديد الموعد</button>
            </>
          )}
        </div>
      </div>

      {/* Skills */}
      <div>
        <SectionHeader title="مهاراتك الأربع" actionLabel="التفاصيل" onAction={() => go(weakest || 'reading')} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 13 }}>
          {SKILLS.map((s) => (
            <SkillCard key={s} skill={s} label={SKILL_LABEL[s]} current={skillBands[s]} target={target} focus={s === weakest && rated.length > 1} last={skillBands[s] != null ? undefined : 'لم تُقس بعد'} onClick={() => go(s)} />
          ))}
        </div>
      </div>

      {/* Next steps */}
      <Card style={{ padding: '20px 22px' }}>
        <SectionHeader title="خطوتك القادمة" actionLabel="الخطة الكاملة" onAction={() => go('journey')} />
        {nextSteps.map((t, i) => (
          <TaskRow key={i} first={i === 0} tag={t.tag} title={t.title} sub={t.sub} onClick={() => go(t.to)} />
        ))}
      </Card>

      <GoalModal open={showGoal} onClose={() => setShowGoal(false)} studentId={studentId} initial={plan} />
    </div>
  )
}
