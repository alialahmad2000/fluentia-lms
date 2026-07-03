import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useStudentId } from './_helpers/resolveStudentId'
import { useLatestResult } from '@/hooks/ielts/useIELTSHub'
import { useAuthStore } from '@/stores/authStore'
import { useG } from '@/i18n/gender'
import { Card, PrimaryButton, Icon } from './_ui/primitives'

const TRAINERS = [
  { name: 'د. علي', role: 'المدرّب الرئيسي · IELTS', initial: 'ع' },
  { name: 'د. محمد', role: 'مدرّب IELTS', initial: 'م' },
]

const HELP = [
  { icon: Icon.writing, title: 'يراجع كتابتك بنفسه', text: 'كل مهمّة Task 1 و Task 2 تمرّ على عين مدرّب حقيقي — ملاحظات تتجاوز ما يراه الذكاء الاصطناعي.' },
  { icon: Icon.speaking, title: 'يستمع لمحادثتك', text: 'تسجيلاتك تُقيَّم بشرياً: النطق والطلاقة والثقة، بلغة قريبة منك.' },
  { icon: Icon.readiness, title: 'يضبط درجاتك', text: 'يعتمد أو يعدّل نطاق كل مهارة، فتكون نتائجك واقعية وقريبة من الاختبار الفعلي.' },
  { icon: Icon.plan, title: 'يتابع خطّتك', text: 'يعدّل موعد اختبارك وأولويات أسبوعك حسب تقدّمك — الخطة تعيش معك.' },
]

export default function Trainer() {
  const navigate = useNavigate()
  const g = useG()
  const studentId = useStudentId()
  const profile = useAuthStore((s) => s.profile)
  const { data: latestResult } = useLatestResult(studentId)
  const firstName = (profile?.display_name || profile?.full_name || '').split(' ')[0] || ''
  const hasReviewedWork = !!latestResult && (latestResult.writing_score != null || latestResult.speaking_score != null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingTop: 2, maxWidth: 860 }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--iel-accent)', letterSpacing: '.1em', marginBottom: 8 }}>مدرّبك</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--iel-ink)', margin: 0 }}>لست وحدك في هذه الرحلة.</h1>
        <p style={{ fontSize: 15, color: 'var(--iel-ink-2)', margin: '8px 0 0', lineHeight: 1.85, maxWidth: '50ch' }}>
          {hasReviewedWork
            ? `عملك يُراجَع بشرياً${firstName ? ` يا ${firstName}` : ''} — الذكاء الاصطناعي يسرّع تدريبك، ومدرّبك يضمن جودته.`
            : 'الذكاء الاصطناعي يسرّع تدريبك، لكن مدرّباً حقيقياً يراجع كتابتك ومحادثتك ويضبط خطّتك.'}
        </p>
      </div>

      {/* Coaches */}
      <Card style={{ padding: '22px 24px', display: 'flex', gap: 28, flexWrap: 'wrap' }}>
        {TRAINERS.map((t) => (
          <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'radial-gradient(circle at 32% 28%, color-mix(in srgb, var(--iel-accent) 55%, #fff), var(--iel-accent))', color: '#06231d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 20, fontFamily: "'Tajawal', sans-serif" }}>{t.initial}</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--iel-ink)' }}>{t.name}</div>
              <div style={{ fontSize: 12, color: 'var(--iel-ink-3)', fontWeight: 600, marginTop: 2 }}>{t.role}</div>
            </div>
          </div>
        ))}
      </Card>

      {/* How your coach helps */}
      <div>
        <div style={{ marginBottom: 14 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--iel-ink)', margin: 0 }}>كيف يساعدك مدرّبك</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 13 }}>
          {HELP.map((item) => {
            const I = item.icon
            return (
              <Card key={item.title} style={{ padding: 18 }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, marginBottom: 12, background: 'var(--iel-accent-soft)', color: 'var(--iel-accent-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><I size={19} /></div>
                <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--iel-ink)', marginBottom: 6 }}>{item.title}</div>
                <p style={{ fontSize: 12.5, color: 'var(--iel-ink-3)', lineHeight: 1.7, margin: 0, fontWeight: 500 }}>{item.text}</p>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Contact */}
      <Card style={{ padding: '24px 26px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--iel-ink)', marginBottom: 4 }}>عندك سؤال؟ مدرّبك يسمعك مباشرة.</div>
          <div style={{ fontSize: 13.5, color: 'var(--iel-ink-3)', fontWeight: 600, lineHeight: 1.7 }}>المحادثة مفتوحة — أرسل سؤالك في أي وقت وتصلك ملاحظات مدرّبك.</div>
        </div>
        <PrimaryButton onClick={() => navigate('/chat')}>مراسلة مدرّبك <Icon.chevron size={16} sw={2.4} /></PrimaryButton>
      </Card>
    </div>
  )
}
