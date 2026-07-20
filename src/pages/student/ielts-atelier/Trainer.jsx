import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useStudentId } from './_helpers/resolveStudentId'
import { useAuthStore } from '@/stores/authStore'
import { useG } from '@/i18n/gender'
import { Card, PrimaryButton, Icon } from './_ui/primitives'

// The student's REAL human trainer — assigned_trainer_id, else the group's trainer.
// (No PostgREST embed: the assigned_trainer_id FK was dropped, so we resolve by id.)
function useAssignedTrainer(studentId) {
  return useQuery({
    queryKey: ['ielts-assigned-trainer', studentId],
    enabled: !!studentId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data: st } = await supabase
        .from('students')
        .select('assigned_trainer_id, group_id')
        .eq('id', studentId)
        .maybeSingle()
      let trainerId = st?.assigned_trainer_id || null
      if (!trainerId && st?.group_id) {
        const { data: grp } = await supabase
          .from('groups')
          .select('trainer_id')
          .eq('id', st.group_id)
          .maybeSingle()
        trainerId = grp?.trainer_id || null
      }
      if (!trainerId) return null
      const { data: prof } = await supabase
        .from('profiles')
        .select('id, full_name, display_name')
        .eq('id', trainerId)
        .maybeSingle()
      const name = prof?.display_name || prof?.full_name || null
      return name ? { id: prof.id, name } : null
    },
  })
}

// The most recent piece of work the trainer actually reviewed (band override / note).
function useLatestTrainerReview(studentId) {
  return useQuery({
    queryKey: ['ielts-latest-trainer-review', studentId],
    enabled: !!studentId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from('ielts_submissions')
        .select('submission_type, trainer_feedback, trainer_overridden_band, trainer_reviewed_at')
        .eq('student_id', studentId)
        .not('trainer_reviewed_at', 'is', null)
        .order('trainer_reviewed_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      return data || null
    },
  })
}

const skillWordAr = (type) => (String(type || '').includes('speaking') ? 'محادثتك' : 'كتابتك')

export default function Trainer() {
  const navigate = useNavigate()
  const g = useG()
  const studentId = useStudentId()
  const profile = useAuthStore((s) => s.profile)
  const { data: trainer } = useAssignedTrainer(studentId)
  const { data: review } = useLatestTrainerReview(studentId)

  const firstName = (profile?.display_name || profile?.full_name || '').split(' ')[0] || ''
  const coachName = trainer?.name || 'فريق طلاقة'
  const coachRole = trainer ? 'مدرّبك في الآيلتس' : 'فريق الآيلتس'
  const coachInitial = (coachName || 'ط').trim().charAt(0)
  const hasReview = !!review && (review.trainer_feedback || review.trainer_overridden_band != null)

  // Honest framing: AI is the always-on coach; the human trainer watches over + steps in.
  // The single "human" card is gold-tinted so the AI-vs-human story reads at a glance.
  const HELP = [
    {
      icon: Icon.diagnostic,
      title: 'تقييم فوري بالذكاء الاصطناعي',
      text: 'كل مهمّة كتابة ومحادثة تُقيَّم فوراً بمعايير الآيلتس الأربعة، مع ملاحظات تفصيلية تساعدك على التحسّن.',
    },
    {
      icon: Icon.coach,
      gold: true,
      title: trainer ? `عين ${coachName} عند الحاجة` : 'عين بشرية عند الحاجة',
      text: 'مدرّبك يطّلع على أعمالك ويعدّل التقييم أو يضيف ملاحظة بشرية حين يلزم.',
    },
    {
      icon: Icon.readiness,
      title: 'متابعة تقدّمك',
      text: 'يتابع نطاقك وأولويات أسبوعك ويوجّهك خطوة بخطوة نحو هدفك في الاختبار.',
    },
    {
      icon: Icon.plan,
      title: 'خطّة تعيش معك',
      text: 'موعد اختبارك وأولويات أسبوعك تتعدّل مع تقدّمك — الخطة ليست ثابتة.',
    },
  ]

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 32, paddingTop: 2, maxWidth: 860 }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--iel-accent)', letterSpacing: '.1em', marginBottom: 8 }}>مدرّبك</div>
        <h1 style={{ fontSize: 27, fontWeight: 800, color: 'var(--iel-ink)', margin: 0, letterSpacing: '-0.01em' }}>لست وحدك في هذه الرحلة.</h1>
        <p style={{ fontSize: 15, color: 'var(--iel-ink-2)', margin: '10px 0 0', lineHeight: 1.85, maxWidth: '52ch' }}>
          {`الذكاء الاصطناعي يقيّم تدريبك لحظة بلحظة${firstName ? ` يا ${firstName}` : ''}، و${coachName} ${trainer ? 'يتابع تقدّمك ويتدخّل عند الحاجة' : 'يتابع تقدّمك عند الحاجة'}.`}
        </p>
        <div style={{ height: 2, width: 72, marginTop: 16, borderRadius: 2, background: 'linear-gradient(to left, var(--iel-accent), transparent 78%)' }} />
      </div>

      {/* Your real coach */}
      <Card style={{ padding: '24px 26px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            width: 60, height: 60, borderRadius: '50%',
            background: 'radial-gradient(circle at 32% 28%, color-mix(in srgb, var(--iel-accent) 55%, #fff), var(--iel-accent))',
            color: '#06231d', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 22, fontFamily: "'Tajawal', sans-serif",
            boxShadow: '0 0 0 4px color-mix(in srgb, var(--iel-accent) 15%, transparent), 0 12px 28px -10px color-mix(in srgb, var(--iel-accent) 55%, #000), inset 0 1px 0 rgba(255,255,255,.25)',
          }}>{coachInitial}</div>
          <span style={{ position: 'absolute', insetInlineEnd: 2, bottom: 2, width: 12, height: 12, borderRadius: '50%', background: 'var(--iel-good, #34d399)', border: '2px solid var(--iel-surface)' }} />
        </div>
        <div>
          <div style={{ fontSize: 15.5, fontWeight: 800, color: 'var(--iel-ink)' }}>{coachName}</div>
          <div style={{ fontSize: 13, color: 'var(--iel-ink-3)', fontWeight: 600, marginTop: 3 }}>{coachRole}</div>
        </div>
      </Card>

      {/* Latest trainer review — only when a real human review exists */}
      {hasReview && (
        <Card focus style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ color: 'var(--iel-gold-ink, var(--iel-accent-ink))', display: 'flex' }}><Icon.coach size={17} /></span>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--iel-ink)' }}>
              {`راجع ${coachName} ${skillWordAr(review.submission_type)}`}
            </div>
          </div>
          {review.trainer_overridden_band != null && (
            <div style={{ fontSize: 13, color: 'var(--iel-ink-2)', fontWeight: 700, marginBottom: review.trainer_feedback ? 8 : 0 }}>
              {`النطاق المعتمَد من مدرّبك: ${review.trainer_overridden_band}`}
            </div>
          )}
          {review.trainer_feedback && (
            <p style={{ fontSize: 13.5, color: 'var(--iel-ink-2)', lineHeight: 1.8, margin: 0, fontWeight: 500 }}>{review.trainer_feedback}</p>
          )}
        </Card>
      )}

      {/* How your coaching works */}
      <div>
        <div style={{ marginBottom: 14 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--iel-ink)', margin: 0 }}>كيف يعمل تدريبك</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
          {HELP.map((item) => {
            const I = item.icon
            return (
              <Card key={item.title} style={{ padding: 20 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, marginBottom: 13, background: item.gold ? 'var(--iel-gold-soft, var(--iel-accent-soft))' : 'var(--iel-accent-soft)', color: item.gold ? 'var(--iel-gold-ink, var(--iel-accent-ink))' : 'var(--iel-accent-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><I size={20} /></div>
                <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--iel-ink)', marginBottom: 6 }}>{item.title}</div>
                <p style={{ fontSize: 13.5, color: 'var(--iel-ink-3)', lineHeight: 1.75, margin: 0, fontWeight: 500 }}>{item.text}</p>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Contact */}
      <Card style={{ padding: '24px 26px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--iel-ink)', marginBottom: 4 }}>
            {trainer ? `عندك سؤال؟ ${coachName} يسمعك مباشرة.` : 'عندك سؤال؟ فريقنا يسمعك مباشرة.'}
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--iel-ink-3)', fontWeight: 600, lineHeight: 1.7 }}>
            {g('المحادثة مفتوحة — أرسل سؤالك في أي وقت وتصلك ملاحظات مدرّبك.', 'المحادثة مفتوحة — أرسلي سؤالك في أي وقت وتصلك ملاحظات مدرّبك.')}
          </div>
        </div>
        <PrimaryButton onClick={() => navigate('/chat')}>مراسلة مدرّبك <Icon.chevron size={16} sw={2.4} /></PrimaryButton>
      </Card>
    </div>
  )
}
