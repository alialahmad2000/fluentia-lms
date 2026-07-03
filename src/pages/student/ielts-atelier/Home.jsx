import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useStudentId } from './_helpers/resolveStudentId'
import { useLatestResult, useSkillProgress, useAdaptivePlan, useErrorBankCount } from '@/hooks/ielts/useIELTSHub'
import { useAuthStore } from '@/stores/authStore'
import { useG } from '@/i18n/gender'
import { Card, SectionHeader, Chip, BandTrack, SkillCard, TaskRow, Icon, PrimaryButton } from './_ui/primitives'

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
            <PrimaryButton onClick={() => go('diagnostic')}>{g('ابدأ الاختبار التشخيصي', 'ابدئي الاختبار التشخيصي')} <Icon.chevron size={17} sw={2.4} /></PrimaryButton>
          </div>
          <div style={{ background: 'var(--iel-surface-2)', border: '1px solid var(--iel-border)', borderRadius: 14, padding: '18px 20px' }}>
            <div style={{ fontSize: 12, color: 'var(--iel-ink-3)', fontWeight: 700, marginBottom: 6 }}>هدفك</div>
            <div className="iel-serif" style={{ fontSize: 40, fontWeight: 600, color: 'var(--iel-ink)', lineHeight: 1 }}>{target != null ? target.toFixed(1) : '7.0'}</div>
            <BandTrack current={null} target={target ?? 7} />
          </div>
        </Card>
        <div>
          <SectionHeader title="مهاراتك الأربع" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 13 }}>
            {SKILLS.map((s) => (
              <SkillCard key={s} skill={s} label={SKILL_LABEL[s]} current={null} target={target} last="لم تُقس بعد" onClick={() => go('diagnostic')} />
            ))}
          </div>
        </div>
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

      {/* Hero */}
      <Card style={{ padding: '24px 26px', display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 26, alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--iel-accent)', letterSpacing: '.1em', marginBottom: 10 }}>مستواك الحالي</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14 }}>
            <div className="iel-serif" style={{ fontSize: 50, fontWeight: 600, color: 'var(--iel-ink)', lineHeight: .9 }}>{overall.toFixed(1)}</div>
            <div style={{ fontSize: 13, color: 'var(--iel-ink-2)', fontWeight: 600, paddingBottom: 6 }}>
              النطاق العام{target != null && <><br />الهدف <b style={{ color: 'var(--iel-ink)', fontWeight: 800 }}>{target.toFixed(1)}</b> — تبقّى <b style={{ color: 'var(--iel-ink)', fontWeight: 800 }}>{Math.max(0, target - overall).toFixed(1)}</b></>}
            </div>
          </div>
          <BandTrack current={overall} target={target} />
        </div>
        <div style={{ background: 'var(--iel-surface-2)', border: '1px solid var(--iel-border)', borderRadius: 14, padding: 16, textAlign: 'center' }}>
          {days != null ? (
            <>
              <div className="iel-serif" style={{ fontSize: 42, fontWeight: 600, color: 'var(--iel-ink)', lineHeight: 1 }}>{days}</div>
              <div style={{ fontSize: 13, color: 'var(--iel-ink-2)', fontWeight: 700, marginTop: 4 }}>يوماً حتى الاختبار</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 14, color: 'var(--iel-ink-2)', fontWeight: 700, marginBottom: 10, lineHeight: 1.7 }}>حدّد موعد اختبارك<br />لنبني خطّتك الزمنية</div>
              <button onClick={() => go('journey')} style={{ background: 'var(--iel-accent-soft)', color: 'var(--iel-accent-ink)', border: 0, borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Tajawal', sans-serif" }}>تحديد الموعد</button>
            </>
          )}
        </div>
      </Card>

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
    </div>
  )
}
