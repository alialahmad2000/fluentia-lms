import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import { Star, Sparkles, RotateCcw, Loader2, Compass } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useVocabJourney } from '@/hooks/useVocabJourney'
import VocabShell from '@/components/vocab-cosmos/VocabShell'
import JourneyTrail from '@/components/vocab-cosmos/journey/JourneyTrail'
import NextStopCard from '@/components/vocab-cosmos/journey/NextStopCard'
import JourneyStop from '@/components/vocab-cosmos/journey/JourneyStop'
import VocabChoiceGrid from '@/components/vocab-cosmos/journey/VocabChoiceGrid'
import { toArabicNum } from '@/lib/vocabFormat'
import '@/styles/vocab-constellation.css'

export default function VocabJourney() {
  const profileId = useAuthStore((s) => s.profile?.id)
  const qc = useQueryClient()
  const { data: journey, isLoading, isError, refetch } = useVocabJourney(profileId)
  const [activeStop, setActiveStop] = useState(null)

  const regions = journey?.regions || []
  const current = journey?.current || null
  const currentRegion = useMemo(
    () => regions.find((r) => r.unit_id === current?.unit_id) || null,
    [regions, current]
  )
  // Count lit (fully-studied) CONSTELLATIONS, not whole regions — this moves the
  // moment you finish a single stop, instead of sitting at 0 until an entire region
  // (5 constellations) is done.
  const litConstellations = regions.reduce((s, r) => s + (r.constellations_done || 0), 0)

  const handleStopComplete = () => {
    setActiveStop(null)
    qc.invalidateQueries({ queryKey: ['vocab-journey', profileId] })
    qc.invalidateQueries({ queryKey: ['vocab-due-badge', profileId] })
    qc.invalidateQueries({ queryKey: ['vocab-dashboard-counts'] })
  }

  return (
    <>
      {/* keyframes used by the trail "current" pulse */}
      <style>{`@keyframes vc-pulse{0%,100%{opacity:.45;transform:scale(1)}50%{opacity:1;transform:scale(1.18)}}`}</style>

      <VocabShell>
        <div className="space-y-4">
          {/* sky summary */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="vc-card relative overflow-hidden"
            style={{ padding: 22 }}
          >
            <div className="vc-nebula vc-nebula-b" aria-hidden="true" style={{ position: 'absolute' }} />
            <div className="relative" style={{ zIndex: 1 }}>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={15} style={{ color: 'var(--vc-gold, #e9b949)' }} />
                <span
                  className="text-[13px] font-bold tracking-wide"
                  style={{ color: 'var(--vc-gold, #e9b949)', fontFamily: "'Tajawal', sans-serif" }}
                >
                  مفرداتك
                </span>
              </div>
              <h1
                className="text-[26px] font-bold leading-tight"
                style={{ color: 'var(--vc-text, #f4f5ff)', fontFamily: "'Tajawal', sans-serif" }}
              >
                سماؤك تكبر، نجمة نجمة
              </h1>

              <div className="flex items-center gap-2.5 mt-4 flex-wrap">
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-bold tabular-nums"
                  style={{
                    background: 'rgba(233,185,73,0.14)',
                    color: '#fbe6a8',
                    border: '1px solid rgba(233,185,73,0.3)',
                  }}
                >
                  <Star size={13} style={{ fill: '#fbe6a8', color: '#fbe6a8' }} />
                  {toArabicNum(journey?.words_known ?? 0)} نجمة
                </span>
                <span className="vc-pill text-[12.5px] tabular-nums">
                  {toArabicNum(litConstellations)} كوكبة مضيئة
                </span>
                {(journey?.due_count ?? 0) > 0 && (
                  <span className="vc-pill text-[12.5px] tabular-nums">
                    {toArabicNum(journey.due_count)} بانتظار المراجعة
                  </span>
                )}
              </div>
            </div>
          </motion.div>

          {/* featured journey (recommended path — one of several ways) */}
          {isLoading ? (
            <div className="vc-card flex items-center justify-center" style={{ padding: 40 }}>
              <Loader2 size={26} className="animate-spin" style={{ color: '#a5b4fc' }} />
            </div>
          ) : isError ? (
            <div className="vc-card text-center" style={{ padding: 24 }}>
              <p className="text-[14px]" style={{ color: 'var(--vc-text-dim, #c7d2fe)' }}>
                تعذّر تحميل رحلتك الآن — تقدري تختاري طريقة أخرى من الأسفل.
              </p>
              <button type="button" onClick={() => refetch()} className="vc-btn vc-btn-ghost mt-3 mx-auto flex items-center gap-2">
                <RotateCcw size={15} /> إعادة المحاولة
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 px-1 pt-1">
                <Compass size={15} style={{ color: 'var(--vc-gold, #e9b949)' }} />
                <span
                  className="text-[13px] font-bold"
                  style={{ color: 'var(--vc-text-dim, #c7d2fe)', fontFamily: "'Tajawal', sans-serif" }}
                >
                  رحلة النور — المسار الموصى به
                </span>
              </div>

              <JourneyTrail regions={regions} currentUnitId={current?.unit_id} />

              {current ? (
                <NextStopCard
                  current={current}
                  region={currentRegion}
                  dueCount={journey?.due_count ?? 0}
                  onStart={() =>
                    setActiveStop({
                      unitId: current.unit_id,
                      constellationIndex: current.constellation_index,
                      themeAr: current.theme_ar,
                    })
                  }
                />
              ) : (
                <div className="vc-card text-center relative overflow-hidden" style={{ padding: 26 }}>
                  <div
                    className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-3"
                    style={{
                      background: 'radial-gradient(circle at 35% 30%, #fde68a, #e9b949 70%)',
                      boxShadow: '0 0 32px rgba(233,185,73,0.5)',
                    }}
                  >
                    <Star size={30} strokeWidth={2} style={{ color: '#3b2f0b', fill: '#3b2f0b' }} />
                  </div>
                  <h2 className="text-[18px] font-bold" style={{ color: 'var(--vc-text, #f4f5ff)', fontFamily: "'Tajawal', sans-serif" }}>
                    كل كوكبات هذا المستوى مضيئة ✦
                  </h2>
                  <p className="text-[13px] mt-1.5" style={{ color: 'rgba(199,210,254,0.8)' }}>
                    تابعي بأي طريقة من الأسفل — مراجعة، تصفّح، أو إملاء.
                  </p>
                </div>
              )}
            </>
          )}

          {/* other ways — ALWAYS available so the journey is never the only choice */}
          <VocabChoiceGrid dueCount={journey?.due_count ?? 0} />
        </div>
      </VocabShell>

      {activeStop && (
        <JourneyStop
          profileId={profileId}
          unitId={activeStop.unitId}
          constellationIndex={activeStop.constellationIndex}
          themeAr={activeStop.themeAr}
          onClose={() => setActiveStop(null)}
          onComplete={handleStopComplete}
        />
      )}
    </>
  )
}
