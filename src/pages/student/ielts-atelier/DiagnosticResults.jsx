import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useDiagnosticResultV2 } from '@/hooks/ielts/useDiagnosticResultV2'
import { useAdaptivePlan } from '@/hooks/ielts/useIELTSHub'
import { useStudentId } from './_helpers/resolveStudentId'
import { useG } from '@/i18n/gender'
import { Card, PrimaryButton, Icon, SectionHeader } from './_ui/primitives'

const BASE = '/student/ielts-atelier'
const SKILLS = ['reading', 'listening', 'writing', 'speaking']
const SKILL_LABEL = { reading: 'القراءة', listening: 'الاستماع', writing: 'الكتابة', speaking: 'المحادثة' }

// Concise IELTS band meaning (Arabic).
function bandMeaning(b) {
  if (b == null) return ''
  if (b >= 8) return 'مستخدم متمكّن — تفهم وتُعبّر بدقّة وطلاقة.'
  if (b >= 7) return 'مستخدم جيّد — تتحكّم في اللغة مع أخطاء قليلة غير منهجية.'
  if (b >= 6) return 'مستخدم كفؤ — فهم جيّد رغم بعض الأخطاء وسوء الفهم أحياناً.'
  if (b >= 5) return 'مستخدم متوسّط — تتعامل مع المعنى العام رغم كثرة الأخطاء.'
  if (b >= 4) return 'مستخدم محدود — كفاءتك واضحة في المواقف المألوفة فقط.'
  return 'مستخدم محدود جداً — تحتاج لبناء الأساسيات.'
}

export default function DiagnosticResults() {
  const navigate = useNavigate()
  const g = useG()
  const studentId = useStudentId()
  const { data: result, isLoading } = useDiagnosticResultV2()
  const { data: plan } = useAdaptivePlan(studentId)
  const target = plan?.target_band != null ? Number(plan.target_band) : null

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 260 }}>
        <div style={{ width: 24, height: 24, border: '2px solid var(--iel-border)', borderTopColor: 'var(--iel-accent)', borderRadius: '50%', animation: 'iel-spin .7s linear infinite' }} />
      </div>
    )
  }

  if (!result?.hasResult) {
    return (
      <div style={{ maxWidth: 460, margin: '60px auto', textAlign: 'center' }}>
        <p style={{ fontSize: 17, fontWeight: 800, color: 'var(--iel-ink)', margin: '0 0 8px' }}>{g('لم تُكمل اختباراً تشخيصياً بعد', 'لم تُكملي اختباراً تشخيصياً بعد')}</p>
        <p style={{ fontSize: 14, color: 'var(--iel-ink-3)', margin: '0 0 22px', lineHeight: 1.8 }}>ابدأ التشخيص لتحصل على تقريرك الكامل.</p>
        <PrimaryButton onClick={() => navigate(`${BASE}/diagnostic`)}>{g('ابدأ الآن', 'ابدئي الآن')} <Icon.chevron size={16} sw={2.4} /></PrimaryButton>
      </div>
    )
  }

  const { overallBand, skills } = result
  const overall = overallBand != null ? Number(overallBand) : null
  const bands = Object.fromEntries(SKILLS.map((s) => [s, skills?.[s] != null ? Number(skills[s]) : null]))
  const rated = SKILLS.filter((s) => bands[s] != null)
  const strongest = rated.length ? rated.reduce((a, b) => (bands[a] >= bands[b] ? a : b)) : null
  const weakest = rated.length ? rated.reduce((a, b) => (bands[a] <= bands[b] ? a : b)) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingTop: 2, maxWidth: 760 }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--iel-accent)', letterSpacing: '.1em', marginBottom: 8 }}>نتيجة الاختبار التشخيصي</div>
        <h1 style={{ fontSize: 23, fontWeight: 800, color: 'var(--iel-ink)', margin: 0 }}>هذه نقطة انطلاقك — لا نهايتك.</h1>
      </div>

      {/* Overall band */}
      <Card style={{ padding: '26px 28px', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 26, alignItems: 'center' }}>
        <div style={{ textAlign: 'center', paddingInlineEnd: 26, borderInlineEnd: '1px solid var(--iel-border)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--iel-ink-3)', marginBottom: 6 }}>نطاقك العام</div>
          <div className="iel-serif" style={{ fontSize: 64, fontWeight: 600, color: 'var(--iel-ink)', lineHeight: .85 }}>{overall != null ? overall.toFixed(1) : '—'}</div>
          {target != null && <div style={{ fontSize: 12.5, color: 'var(--iel-ink-2)', fontWeight: 700, marginTop: 8 }}>الهدف {target.toFixed(1)}</div>}
        </div>
        <div>
          <p style={{ fontSize: 15.5, color: 'var(--iel-ink)', fontWeight: 700, margin: '0 0 6px', lineHeight: 1.6 }}>{bandMeaning(overall)}</p>
          <p style={{ fontSize: 13.5, color: 'var(--iel-ink-3)', margin: 0, lineHeight: 1.8 }}>
            {strongest && weakest && strongest !== weakest
              ? <>أقوى مهاراتك <b style={{ color: 'var(--iel-ink)' }}>{SKILL_LABEL[strongest]}</b>، وأكبر فرصة للنموّ في <b style={{ color: 'var(--iel-ink)' }}>{SKILL_LABEL[weakest]}</b>.</>
              : 'أداؤك متوازن عبر المهارات الأربع — بداية ممتازة.'}
          </p>
        </div>
      </Card>

      {/* Per-skill breakdown */}
      <div>
        <SectionHeader title="نتيجتك في كل مهارة" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 13 }}>
          {SKILLS.map((s) => {
            const b = bands[s]
            const isStrong = b != null && overall != null && b >= overall + 0.5
            const isWeak = b != null && overall != null && b <= overall - 0.5
            const I = Icon[s]
            return (
              <Card key={s} style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ color: 'var(--iel-ink-3)', display: 'flex' }}><I size={15} /></span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--iel-ink-2)' }}>{SKILL_LABEL[s]}</span>
                </div>
                <div className="iel-serif" style={{ fontSize: 32, fontWeight: 600, color: 'var(--iel-ink)', lineHeight: 1 }}>{b != null ? b.toFixed(1) : '—'}</div>
                <div style={{ fontSize: 11.5, fontWeight: 700, marginTop: 8, color: isStrong ? 'var(--iel-good)' : isWeak ? 'var(--iel-warn)' : 'var(--iel-ink-3)' }}>
                  {isStrong ? 'نقطة قوّة' : isWeak ? 'نقطة تركيز' : 'متوازنة'}
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Next step */}
      <Card style={{ padding: '22px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--iel-ink)', marginBottom: 4 }}>خطوتك القادمة</div>
          <div style={{ fontSize: 13.5, color: 'var(--iel-ink-3)', fontWeight: 600, lineHeight: 1.7 }}>
            {weakest ? <>سنبدأ خطّتك بالتركيز على <b style={{ color: 'var(--iel-ink)' }}>{SKILL_LABEL[weakest]}</b> — أكبر فجوة نحو هدفك.</> : 'لنبنِ خطّتك الأسبوعية نحو هدفك.'}
          </div>
        </div>
        <PrimaryButton onClick={() => navigate(`${BASE}/journey`)}>{g('اعرض خطّتي', 'اعرض خطّتي')} <Icon.chevron size={16} sw={2.4} /></PrimaryButton>
      </Card>
    </div>
  )
}
