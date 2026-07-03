import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDiagnosticStateV2 } from '@/hooks/ielts/useDiagnosticStateV2'
import { useStudentId } from './_helpers/resolveStudentId'
import { createDiagnosticAttempt } from './_helpers/diagnostic'
import { useG } from '@/i18n/gender'
import { Card, PrimaryButton, Icon } from './_ui/primitives'

const BASE = '/student/ielts-atelier'

// The four lean placement sections, in order — an organized, credible exam.
const SECTIONS = [
  { skill: 'reading', label: 'القراءة', detail: 'نصّ أكاديمي واحد + أسئلة متنوّعة', time: '٢٠ دقيقة' },
  { skill: 'listening', label: 'الاستماع', detail: 'مقطع صوتي + أسئلة (يُشغَّل مرّة واحدة)', time: '١٠ دقائق' },
  { skill: 'writing', label: 'الكتابة', detail: 'مهمّة كتابية قصيرة (Task 2)', time: '٢٠ دقيقة' },
  { skill: 'speaking', label: 'المحادثة', detail: 'أسئلة تُجاب صوتياً بالميكروفون', time: '٥ دقائق' },
]
const REQUIREMENTS = [
  { icon: Icon.listening, text: 'سمّاعات للاستماع' },
  { icon: Icon.mock, text: 'مكان هادئ' },
  { icon: Icon.readiness, text: 'نحو ٣٥ دقيقة متواصلة' },
]

export default function Diagnostic() {
  const navigate = useNavigate()
  const g = useG()
  const studentId = useStudentId()
  const { loading, state, attemptId, latestOverallBand } = useDiagnosticStateV2()
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState(null)

  async function handleStart() {
    if (starting) return
    if (state === 'in_progress' && attemptId) {
      navigate(`${BASE}/diagnostic/session/${attemptId}`)
      return
    }
    setStarting(true); setStartError(null)
    try {
      const id = await createDiagnosticAttempt(studentId)
      navigate(`${BASE}/diagnostic/session/${id}`)
    } catch (e) {
      setStartError('تعذّر بدء الاختبار — تأكّد من اتصالك وحاول مجدداً.')
      setStarting(false)
    }
  }

  const cta = starting ? 'جارٍ التجهيز…'
    : state === 'in_progress' ? g('تابع من حيث توقفت', 'تابعي من حيث توقفتِ')
    : state === 'completed' ? g('إعادة الاختبار', 'إعادة الاختبار')
    : g('ابدأ الاختبار', 'ابدئي الاختبار')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingTop: 2, maxWidth: 720 }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--iel-accent)', letterSpacing: '.1em', marginBottom: 8 }}>الاختبار التشخيصي</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--iel-ink)', margin: '0 0 10px', lineHeight: 1.4 }}>لنقِس مستواك بدقّة.</h1>
        <p style={{ fontSize: 15.5, color: 'var(--iel-ink-2)', lineHeight: 1.9, margin: 0, maxWidth: '48ch' }}>
          اختبار قصير في المهارات الأربع يحدّد نطاقك الحالي (Band) في كلٍّ منها، ثم يبني خطّتك نحو هدفك. أجِب بصدق — أخطاؤك هي ما يرسم الطريق.
        </p>
      </div>

      {/* Exam structure — the four sections, organized */}
      <Card style={{ padding: '8px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0 12px', borderBottom: '1px solid var(--iel-border)' }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--iel-ink)' }}>أقسام الاختبار</span>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--iel-ink-3)' }}>الإجمالي · نحو ٣٥ دقيقة</span>
        </div>
        {SECTIONS.map((s, i) => {
          const I = Icon[s.skill]
          return (
            <div key={s.skill} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '15px 0', borderTop: i === 0 ? 0 : '1px solid var(--iel-border)' }}>
              <span style={{ flex: 'none', width: 38, height: 38, borderRadius: 10, background: 'var(--iel-accent-soft)', color: 'var(--iel-accent-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontFamily: "'Tajawal', sans-serif", fontSize: 14 }}>{i + 1}</span>
              <span style={{ flex: 'none', color: 'var(--iel-ink-3)', display: 'flex' }}><I size={18} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--iel-ink)' }}>{s.label}</div>
                <div style={{ fontSize: 12.5, color: 'var(--iel-ink-3)', fontWeight: 600, marginTop: 2 }}>{s.detail}</div>
              </div>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--iel-ink-2)' }}>{s.time}</span>
            </div>
          )
        })}
      </Card>

      {/* Requirements — quiet, informative (not a gating checklist) */}
      <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', padding: '0 4px' }}>
        {REQUIREMENTS.map((r, i) => {
          const I = r.icon
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, color: 'var(--iel-ink-2)', fontWeight: 600 }}>
              <span style={{ color: 'var(--iel-accent)', display: 'flex' }}><I size={16} /></span>{r.text}
            </div>
          )
        })}
      </div>

      {/* CTA + states */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <PrimaryButton onClick={handleStart} disabled={starting} style={{ padding: '14px 26px', fontSize: 16 }}>
            {starting && <span style={{ width: 15, height: 15, borderRadius: '50%', border: '2px solid currentColor', borderTopColor: 'transparent', animation: 'iel-spin .8s linear infinite', display: 'inline-block' }} />}
            {cta} {!starting && <Icon.chevron size={17} sw={2.4} />}
          </PrimaryButton>
          {!loading && state === 'completed' && latestOverallBand != null && (
            <button onClick={() => navigate(`${BASE}/diagnostic/results`)} style={{ background: 'none', border: 0, color: 'var(--iel-accent)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: "'Tajawal', sans-serif" }}>
              {g('عرض نتيجتك السابقة', 'عرض نتيجتكِ السابقة')} (Band {Number(latestOverallBand).toFixed(1)}) ←
            </button>
          )}
        </div>
        {startError && <p style={{ fontSize: 12.5, color: 'var(--iel-bad)', margin: 0 }}>{startError}</p>}
      </div>
    </div>
  )
}
