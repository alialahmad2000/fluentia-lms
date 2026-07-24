import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowLeft, Compass } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useEffectiveStudentId } from '@/stores/authStore'
import { useG } from '@/i18n/gender'

// Self-gating: renders nothing once the student has answered. Sits above the
// hero on the dashboard because the answer shapes everything below it.
export default function IntakePromptCard() {
  const studentId = useEffectiveStudentId()
  const g = useG()

  const { data, isLoading } = useQuery({
    queryKey: ['student', 'intake', studentId],
    enabled: !!studentId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_intake').select('student_id').eq('student_id', studentId).maybeSingle()
      if (error) throw error
      return data
    },
  })

  if (isLoading || data) return null

  return (
    <Link
      to="/student/intake"
      className="block rounded-2xl px-5 py-5 border transition-transform duration-150 ease-out hover:-translate-y-[2px]"
      style={{
        background: 'linear-gradient(150deg, rgba(127,212,193,0.13), rgba(127,212,193,0.05))',
        borderColor: 'rgba(127,212,193,0.28)',
        boxShadow: '0 14px 34px -22px rgba(127,212,193,0.55)',
      }}
    >
      <div className="flex items-center gap-4">
        <span className="w-11 h-11 rounded-xl grid place-items-center shrink-0"
          style={{ background: 'rgba(127,212,193,0.16)', color: '#7fd4c1', border: '1px solid rgba(127,212,193,0.3)' }}>
          <Compass size={20} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[15.5px] font-bold" style={{ color: 'var(--text-primary,#f8fafc)' }}>
            {g('خمس أسئلة، ويصير حسابك على مقاسك', 'خمس أسئلة، ويصير حسابك على مقاسكِ')}
          </div>
          <div className="text-[13px] mt-1" style={{ color: 'var(--text-secondary,#cbd5e1)' }}>
            {g('احكِ لنا لماذا تحتاج الإنجليزية — ود. علي يشكّل مسارك على أساسها.',
               'احكي لنا لماذا تحتاجين الإنجليزية — ود. علي يشكّل مسارك على أساسها.')}
          </div>
        </div>
        <ArrowLeft size={18} className="shrink-0" style={{ color: '#7fd4c1' }} />
      </div>
    </Link>
  )
}
