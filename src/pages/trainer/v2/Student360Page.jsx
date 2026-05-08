import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import {
  useStudent360Overview,
  useStudentTimeline,
  useStudentInsight,
} from '@/hooks/trainer/useStudent360'
import Hero360Card from '@/components/trainer/student360/Hero360Card'
import AIInsightCard from '@/components/trainer/student360/AIInsightCard'
import SkillsRadar from '@/components/trainer/student360/SkillsRadar'
import ActivityTimeline from '@/components/trainer/student360/ActivityTimeline'
import CurriculumProgressCard from '@/components/trainer/student360/CurriculumProgressCard'
import InterventionsHistoryCard from '@/components/trainer/student360/InterventionsHistoryCard'
import TrainerNotesPanel from '@/components/trainer/student360/TrainerNotesPanel'
import QuickActionsBar from '@/components/trainer/student360/QuickActionsBar'
import './Student360Page.css'

export default function Student360Page() {
  const { t } = useTranslation()
  const { studentId } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [forceRefresh, setForceRefresh] = useState(false)

  const { data: overview, isLoading: ovLoading } = useStudent360Overview(studentId)
  const { data: timeline, isLoading: tlLoading } = useStudentTimeline(studentId)
  const {
    data: insight,
    isLoading: insightLoading,
    isFetching: insightFetching,
    refetch: refetchInsight,
  } = useStudentInsight(studentId, forceRefresh)

  function handleInsightRefresh() {
    setForceRefresh(true)
    setTimeout(() => {
      qc.invalidateQueries({ queryKey: ['student360-insight', studentId] })
      refetchInsight()
    }, 50)
  }

  const student = overview?.student
  const metrics = overview?.metrics

  return (
    <div className="s360-page" dir="rtl">
      <div className="s360-topbar">
        <button className="s360-back-btn" onClick={() => navigate(-1)}>
          {t('common.back_button')}
        </button>
        <h2 className="s360-topbar-title">{t('trainer.students.student360_title')}</h2>
      </div>

      <div className="s360-layout">
        {/* Right column — main */}
        <div className="s360-main">
          <Hero360Card overview={overview} loading={ovLoading} />

          <QuickActionsBar
            student={student}
            onInsightRefresh={handleInsightRefresh}
            insightRefreshing={insightFetching}
          />

          <AIInsightCard
            insight={insight}
            loading={insightLoading}
            onRefresh={handleInsightRefresh}
            refreshing={insightFetching}
          />

          <ActivityTimeline events={timeline} loading={tlLoading} />
        </div>

        {/* Left column — sidebar */}
        <div className="s360-sidebar">
          <SkillsRadar metrics={metrics} loading={ovLoading} />
          <CurriculumProgressCard studentId={studentId} />
          <InterventionsHistoryCard studentId={studentId} />
          <TrainerNotesPanel studentId={studentId} />
        </div>
      </div>
    </div>
  )
}
