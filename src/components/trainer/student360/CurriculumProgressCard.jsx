import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useTranslation } from 'react-i18next'
import './CurriculumProgressCard.css'

function useStudentCurriculumProgress(studentId) {
  return useQuery({
    queryKey: ['student360-curriculum', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_curriculum_progress')
        .select('id, section_type, status, score, completed_at, trainer_graded_at')
        .eq('student_id', studentId)
        .order('completed_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data || []
    },
    enabled: !!studentId,
    staleTime: 60_000,
  })
}

export default function CurriculumProgressCard({ studentId }) {
  const { t } = useTranslation()
  const { data: rows, isLoading } = useStudentCurriculumProgress(studentId)

  const SECTION_LABELS = {
    writing: t('trainer.curriculum.tabs.writing'),
    speaking: t('trainer.curriculum.tabs.speaking'),
    grammar: t('trainer.curriculum.tabs.grammar'),
    vocabulary: t('trainer.curriculum.tabs.vocabulary'),
    vocabulary_exercise: t('trainer.student360.vocab_exercise', 'تمرين مفردات'),
    listening: t('trainer.curriculum.tabs.listening'),
    reading: t('trainer.curriculum.tabs.reading'),
  }

  const byType = {}
  ;(rows || []).forEach(r => {
    const t = r.section_type || 'other'
    if (!byType[t]) byType[t] = { completed: 0, total: 0, avgScore: [] }
    byType[t].total++
    if (r.status === 'completed') {
      byType[t].completed++
      if (r.score != null) byType[t].avgScore.push(r.score)
    }
  })

  return (
    <div className="cp-card">
      <h3 className="cp-title">{t('trainer.students.unit_progress_title')}</h3>

      {isLoading ? (
        <div className="cp-skeleton-list">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="cp-skeleton" />)}
        </div>
      ) : Object.keys(byType).length === 0 ? (
        <p className="cp-empty">{t('trainer.students.answers_empty')}</p>
      ) : (
        <ul className="cp-list">
          {Object.entries(byType).map(([type, stats]) => {
            const pct = stats.total ? Math.round(stats.completed / stats.total * 100) : 0
            const avg = stats.avgScore.length
              ? (stats.avgScore.reduce((a, b) => a + b, 0) / stats.avgScore.length / 10).toFixed(1)
              : null
            return (
              <li key={type} className="cp-item">
                <div className="cp-item-header">
                  <span className="cp-label">{SECTION_LABELS[type] || type}</span>
                  <span className="cp-stats">
                    {stats.completed}/{stats.total}
                    {avg && <span className="cp-avg"> · {avg}/10</span>}
                  </span>
                </div>
                <div className="cp-bar-track">
                  <div className="cp-bar-fill" style={{ width: `${pct}%` }} />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
