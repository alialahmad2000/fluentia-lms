import { lazy, Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { useTrainerCockpit } from '@/hooks/trainer/useTrainerCockpit'
import { useStudentPulse } from '@/hooks/trainer/useStudentPulse'
import { useTrainerOnboarding, shouldShowTour } from '@/hooks/trainer/useTrainerOnboarding'
import TrainerTour from '@/components/trainer/onboarding/TrainerTour'
import './CockpitPage.css'
import './cockpit/cockpit.css'

const MorningRitualCard = lazy(() => import('./cockpit/widgets/MorningRitualCard'))
const AgendaStrip = lazy(() => import('./cockpit/widgets/AgendaStrip'))
const GroupHealthOrbs = lazy(() => import('./cockpit/widgets/GroupHealthOrbs'))
const StudentPulseMap = lazy(() => import('./cockpit/widgets/StudentPulseMap'))
const InterventionPreview = lazy(() => import('./cockpit/widgets/InterventionPreview'))
const GradingPreviewStrip = lazy(() => import('./cockpit/widgets/GradingPreviewStrip'))
const NabihBriefingCard = lazy(() => import('./cockpit/widgets/NabihBriefingCard'))
const TrainerXpTicker = lazy(() => import('./cockpit/widgets/TrainerXpTicker'))
const CompetitionMini = lazy(() => import('./cockpit/widgets/CompetitionMini'))

function WidgetSkeleton({ height = 120 }) {
  return <div className="tr-cockpit__skel" style={{ '--skel-h': `${height}px` }} aria-hidden="true" />
}

export default function CockpitPage() {
  const { data: cockpit } = useTrainerCockpit()
  const { data: pulse } = useStudentPulse()
  const { data: onboarding, refetch: refetchOnboarding } = useTrainerOnboarding()
  const [tourActive, setTourActive] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()

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

  return (
    <main className="tr-cockpit" dir="rtl">
      <header className="tr-cockpit__topbar" data-tour-id="cockpit-header">
        <div className="tr-cockpit__topbar-title">غرفة القيادة</div>
        <button
          className="tr-cockpit__tour-cta"
          onClick={() => setTourActive(true)}
          title="جولة تعريفية"
        >
          <MapPin size={13} />
          جولة تعريفية
        </button>
      </header>

      <div className="tr-cockpit__grid">

        {/* Rail Right — command + ritual */}
        <aside className="tr-cockpit__rail tr-cockpit__rail--right">
          <Suspense fallback={<WidgetSkeleton height={90} />}>
            <MorningRitualCard ritual={cockpit?.todayRitual} />
          </Suspense>
          <div data-tour-id="agenda-strip">
            <Suspense fallback={<WidgetSkeleton height={110} />}>
              <AgendaStrip />
            </Suspense>
          </div>
          <div data-tour-id="nabih-briefing">
            <Suspense fallback={<WidgetSkeleton height={140} />}>
              <NabihBriefingCard />
            </Suspense>
          </div>
        </aside>

        {/* Rail Center — main pulse */}
        <section className="tr-cockpit__rail tr-cockpit__rail--center">
          <Suspense fallback={<WidgetSkeleton height={200} />}>
            <StudentPulseMap pulse={pulse} competition={cockpit?.competition} />
          </Suspense>
          <Suspense fallback={<WidgetSkeleton height={140} />}>
            <GroupHealthOrbs />
          </Suspense>
          <Suspense fallback={<WidgetSkeleton height={80} />}>
            <GradingPreviewStrip />
          </Suspense>
        </section>

        {/* Rail Left — growth + competition */}
        <aside className="tr-cockpit__rail tr-cockpit__rail--left">
          <Suspense fallback={<WidgetSkeleton height={120} />}>
            <TrainerXpTicker totals={cockpit?.totals} />
          </Suspense>
          <Suspense fallback={<WidgetSkeleton height={160} />}>
            <CompetitionMini competition={cockpit?.competition} />
          </Suspense>
          <div data-tour-id="intervention-preview">
            <Suspense fallback={<WidgetSkeleton height={180} />}>
              <InterventionPreview />
            </Suspense>
          </div>
        </aside>

      </div>

      <TrainerTour
        autoStart={tourActive}
        onComplete={() => { setTourActive(false); refetchOnboarding() }}
      />
    </main>
  )
}
