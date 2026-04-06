import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'

export default function ClassSummaryView({ unitId }) {
  const { studentData } = useAuthStore()
  const groupId = studentData?.group_id

  const { data: summaries = [] } = useQuery({
    queryKey: ['class-summaries-student', groupId, unitId],
    queryFn: async () => {
      const { data } = await supabase
        .from('class_summaries')
        .select('*')
        .eq('group_id', groupId)
        .eq('unit_id', unitId)
        .eq('shared_with_students', true)
        .order('class_date', { ascending: false })
        .limit(3)
      return data || []
    },
    enabled: !!groupId && !!unitId,
  })

  if (summaries.length === 0) return null

  const formatDate = (date) => {
    const d = new Date(date + 'T00:00:00')
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
    return `${days[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`
  }

  return (
    <div className="space-y-3">
      {summaries.map(s => {
        const topStudents = (s.points_summary || [])
          .filter(p => p.points > 0)
          .sort((a, b) => b.points - a.points)
          .slice(0, 3)

        return (
          <div
            key={s.id}
            className="rounded-2xl p-4 space-y-2.5"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center justify-between">
              <h4 className="text-[13px] font-bold font-['Tajawal'] flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                <span>📋</span> ملخص حصة {formatDate(s.class_date)}
              </h4>
            </div>

            <div className="flex items-center gap-3 text-[11px] font-['Tajawal']" style={{ color: 'var(--text-muted)' }}>
              {s.duration_minutes && <span>⏱ {s.duration_minutes} دقيقة</span>}
              {s.attendance_count != null && <span>✋ {s.attendance_count}/{s.total_students} حضور</span>}
            </div>

            {s.trainer_notes && (
              <div className="space-y-1">
                <p className="text-[11px] font-bold font-['Tajawal']" style={{ color: 'var(--text-secondary)' }}>📝 ملاحظة المدرب:</p>
                <p className="text-[12px] font-['Tajawal'] leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-tertiary)' }}>
                  "{s.trainer_notes}"
                </p>
              </div>
            )}

            {topStudents.length > 0 && (
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-[11px] font-bold font-['Tajawal']" style={{ color: 'var(--text-secondary)' }}>🏆 نجوم الحصة:</span>
                {topStudents.map((p, i) => (
                  <span key={i} className="text-[11px] font-['Tajawal']" style={{ color: 'var(--accent-sky)' }}>
                    {p.name} ⭐ +{p.points}
                  </span>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
