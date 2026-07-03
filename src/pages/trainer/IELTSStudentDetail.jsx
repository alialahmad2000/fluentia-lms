import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import StudentIELTSTab from './StudentIELTSTab'

function useStudentName(studentId) {
  return useQuery({
    queryKey: ['trainer-ielts-student-name', studentId],
    enabled: !!studentId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, display_name')
        .eq('id', studentId)
        .maybeSingle()
      if (error) throw error
      return data?.display_name || data?.full_name || 'طالب'
    },
  })
}

export default function IELTSStudentDetail() {
  const { studentId } = useParams()
  const { data: name } = useStudentName(studentId)

  return (
    <div style={{ padding: '24px', maxWidth: 1000, margin: '0 auto' }} dir="rtl">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <Link
          to="/trainer/ielts"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 10, textDecoration: 'none',
            background: 'var(--ds-surface-1, rgba(255,255,255,0.05))',
            border: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.08))',
            color: 'var(--ds-text-secondary, var(--text-secondary))',
            fontSize: 13, fontFamily: "'Tajawal', sans-serif",
          }}
        >
          <ArrowRight size={15} />
          طلاب IELTS
        </Link>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.08em', color: 'var(--ds-accent-primary, var(--accent-gold, #e9b949))', fontWeight: 700 }}>
            متابعة IELTS
          </div>
          <h1 style={{ margin: '2px 0 0', fontSize: 22, fontWeight: 800, color: 'var(--ds-text-primary, var(--text-primary))', fontFamily: "'Tajawal', sans-serif" }}>
            {name || 'طالب'}
          </h1>
        </div>
      </div>

      <StudentIELTSTab studentId={studentId} />
    </div>
  )
}
