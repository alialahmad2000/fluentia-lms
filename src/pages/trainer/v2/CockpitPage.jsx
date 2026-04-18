import { lazy, Suspense } from 'react'
import { useTrainerCockpit } from '@/hooks/trainer/useTrainerCockpit'
import { useStudentPulse } from '@/hooks/trainer/useStudentPulse'
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

  return (
    <main className="tr-cockpit" dir="rtl">
      <div className="tr-cockpit__grid">

        {/* Rail Right — command + ritual */}
        <aside className="tr-cockpit__rail tr-cockpit__rail--right">
          <Suspense fallback={<WidgetSkeleton height={90} />}>
            <MorningRitualCard ritual={cockpit?.todayRitual} />
          </Suspense>
          <Suspense fallback={<WidgetSkeleton height={110} />}>
            <AgendaStrip />
          </Suspense>
          <Suspense fallback={<WidgetSkeleton height={140} />}>
            <NabihBriefingCard />
          </Suspense>
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
          <Suspense fallback={<WidgetSkeleton height={180} />}>
            <InterventionPreview />
          </Suspense>
        </aside>

      </div>
    </main>
  )
}
