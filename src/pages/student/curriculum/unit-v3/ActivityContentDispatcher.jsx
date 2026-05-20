// Unit Movements V3 — ActivityContent dispatcher
//
// Maps an activity key to the same V2 tab component, wrapped in the same
// ContextRibbon V2 uses. V3 never re-implements activity rendering — it
// just delegates to the existing tabs. Keep this file in sync with V2's
// renderActivityContent switch in `../UnitContent.jsx`.
//
// Recording is intentionally NOT wrapped with ContextRibbon — V2 doesn't
// wrap it either.

import React, { Suspense } from 'react'
import lazyRetry from '../../../../utils/lazyRetry'
import ContextRibbon from '../../../../components/curriculum/ContextRibbon'
import ActivityFallbackEmpty from '../../../../components/curriculum/ActivityFallbackEmpty'
import SectionErrorBoundary from '../../../../components/SectionErrorBoundary'

const ReadingTab    = lazyRetry(() => import('../tabs/ReadingTab'))
const GrammarTab    = lazyRetry(() => import('../tabs/GrammarTab'))
const VocabularyTab = lazyRetry(() => import('../tabs/VocabularyTab'))
const ListeningTab  = lazyRetry(() => import('../tabs/ListeningTab'))
const WritingTab    = lazyRetry(() => import('../tabs/WritingTab'))
const SpeakingTab   = lazyRetry(() => import('../tabs/SpeakingTab'))
const RecordingTab  = lazyRetry(() => import('../../../../components/curriculum/RecordingTab'))

function ActivitySkeleton() {
  return (
    <div className="space-y-4 mt-4">
      <div className="h-8 w-48 rounded-lg bg-[var(--surface-raised)] animate-pulse" />
      <div className="h-32 rounded-xl bg-[var(--surface-raised)] animate-pulse" />
      <div className="h-32 rounded-xl bg-[var(--surface-raised)] animate-pulse" />
    </div>
  )
}

const ARABIC_LABELS = {
  reading: 'القراءة',
  grammar: 'القواعد',
  vocabulary: 'المفردات',
  listening: 'الاستماع',
  writing: 'الكتابة',
  speaking: 'المحادثة',
  recording: 'التسجيل',
}

function renderTabBody(activityKey, unitId) {
  switch (activityKey) {
    case 'reading':    return <ReadingTab unitId={unitId} />
    case 'grammar':    return <GrammarTab unitId={unitId} />
    case 'vocabulary': return <VocabularyTab unitId={unitId} />
    case 'listening':  return <ListeningTab unitId={unitId} />
    case 'writing':    return <WritingTab unitId={unitId} />
    case 'speaking':   return <SpeakingTab unitId={unitId} />
    case 'recording':  return <RecordingTab unitId={unitId} />
    default:           return null
  }
}

export default function ActivityContentDispatcher({ activityKey, unitId, unit }) {
  if (!activityKey) return null

  const body = renderTabBody(activityKey, unitId)
  if (!body) {
    return <ActivityFallbackEmpty reason="unknown_activity" />
  }

  // Recording is the only activity V2 doesn't wrap with ContextRibbon.
  const wrapWithRibbon = activityKey !== 'recording'

  return (
    <SectionErrorBoundary
      section={activityKey}
      sectionLabel={ARABIC_LABELS[activityKey]}
      unitId={unitId}
    >
      <Suspense fallback={<ActivitySkeleton />}>
        {wrapWithRibbon ? (
          <>
            <ContextRibbon unit={unit} activityType={activityKey} />
            {body}
          </>
        ) : (
          body
        )}
      </Suspense>
    </SectionErrorBoundary>
  )
}
