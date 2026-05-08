import { useState, useEffect } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { useTrainerCockpit } from '@/hooks/trainer/useTrainerCockpit'
import { useStudentPulse } from '@/hooks/trainer/useStudentPulse'
import { useInterventionPreview } from '@/hooks/trainer/useInterventionPreview'
import { useGradingQueue } from '@/hooks/trainer/useGradingQueue'
import { useTrainerOnboarding, shouldShowTour } from '@/hooks/trainer/useTrainerOnboarding'
import { resolveHeroState } from '@/components/trainer/cockpit-v3/CockpitHero'
import CockpitHero from '@/components/trainer/cockpit-v3/CockpitHero'
import CockpitSkeleton from '@/components/trainer/cockpit-v3/CockpitSkeleton'
import InterventionsSection from '@/components/trainer/cockpit-v3/InterventionsSection'
import PulseSection from '@/components/trainer/cockpit-v3/PulseSection'
import GradingSection from '@/components/trainer/cockpit-v3/GradingSection'
import NabihInlineCard from '@/components/trainer/cockpit-v3/NabihInlineCard'
import TrainerTour from '@/components/trainer/onboarding/TrainerTour'
import TrainerErrorBoundary from '@/components/shared/TrainerErrorBoundary'
import '@/components/trainer/cockpit-v3/DailyBrief.css'
import { MapPin } from 'lucide-react'

function useNextClass(trainerId) {
  return useQuery({
    queryKey: ['trainer-next-class', trainerId],
    queryFn: async () => {
      if (!trainerId) return null
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase
        .from('classes')
        .select('id, date, start_time, end_time, group_id, groups(name, level)')
        .eq('trainer_id', trainerId)
        .eq('status', 'scheduled')
        .gte('date', today)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(1)
        .maybeSingle()
      if (!data) return null
      const now = new Date()
      const classStart = new Date(`${data.date}T${data.start_time}`)
      return {
        ...data,
        groupName: data.groups?.name || '',
        minutesUntil: Math.round((classStart - now) / 60000),
      }
    },
    enabled: !!trainerId,
    staleTime: 60000,
  })
}

export default function CockpitPage() {
  const { t } = useTranslation()
  const profile = useAuthStore((s) => s.profile)
  const [tourActive, setTourActive] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()

  // All hooks unconditionally at top
  const { data: cockpit, isLoading: cockpitLoading } = useTrainerCockpit()
  const { data: pulse, isLoading: pulseLoading } = useStudentPulse()
  const { data: interventions = [] } = useInterventionPreview(3)
  const { data: gradingItems = [] } = useGradingQueue(10)
  const { data: nextClass } = useNextClass(profile?.id)
  const { data: onboarding, refetch: refetchOnboarding } = useTrainerOnboarding()

  useEffect(() => {
    if (searchParams.get('tour') === '1') {
      setSearchParams({}, { replace: true })
      const t = setTimeout(() => setTourActive(true), 900)
      return () => clearTimeout(t)
    }
    if (onboarding !== undefined && shouldShowTour(onboarding)) {
      const t = setTimeout(() => setTourActive(true), 900)
      return () => clearTimeout(t)
    }
  }, [onboarding, searchParams])

  // Role gate after all hooks
  if (profile && profile.role !== 'trainer' && profile.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  // Show skeleton while profile or primary data loads
  if (!profile || (cockpitLoading && pulseLoading)) {
    return <CockpitSkeleton />
  }

  const hourNow = new Date().getHours()
  const heroState = resolveHeroState({
    nextClass: nextClass ?? null,
    hasDoneMorningRitual: !!cockpit?.todayRitual?.morning_completed_at,
    hourNow,
  })

  const students = pulse?.students || []

  return (
    <main dir="rtl">
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        maxWidth: 720, margin: '0 auto', padding: '12px 20px 0', direction: 'rtl',
      }}>
        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--tr-text-muted)' }}>
          {t('trainer.cockpit.title')}
        </span>
        <button
          onClick={() => setTourActive(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 4, background: 'none',
            border: '1px solid var(--tr-border)', borderRadius: 6, padding: '4px 10px',
            color: 'var(--tr-text-muted)', cursor: 'pointer', fontSize: '0.78rem',
          }}
          data-tour-id="cockpit-header"
        >
          <MapPin size={12} /> {t('trainer.cockpit.tour_button')}
        </button>
      </div>

      <div className="daily-brief">
        <TrainerErrorBoundary>
          <CockpitHero
            state={heroState}
            totals={cockpit?.totals ?? null}
            students={students}
            trainerName={profile?.full_name ?? ''}
            todayRitual={cockpit?.todayRitual ?? null}
          />
        </TrainerErrorBoundary>

        <TrainerErrorBoundary>
          <div data-tour-id="intervention-preview">
            <InterventionsSection items={interventions} />
          </div>
        </TrainerErrorBoundary>

        <TrainerErrorBoundary>
          <PulseSection data={pulse ?? { students: [], matrix: {}, days: [] }} />
        </TrainerErrorBoundary>

        <TrainerErrorBoundary>
          <div data-tour-id="grading-badge">
            <GradingSection items={gradingItems} />
          </div>
        </TrainerErrorBoundary>

        <TrainerErrorBoundary>
          <NabihInlineCard
            students={students}
            interventions={interventions}
            trainerName={profile?.full_name ?? ''}
          />
        </TrainerErrorBoundary>
      </div>

      <TrainerTour
        autoStart={tourActive}
        onComplete={() => { setTourActive(false); refetchOnboarding() }}
      />
    </main>
  )
}
