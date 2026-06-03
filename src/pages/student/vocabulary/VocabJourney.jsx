import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import { Star, Sparkles, RotateCcw, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useVocabJourney } from '@/hooks/useVocabJourney'
import VocabShell from '@/components/vocab-cosmos/VocabShell'
import JourneyTrail from '@/components/vocab-cosmos/journey/JourneyTrail'
import NextStopCard from '@/components/vocab-cosmos/journey/NextStopCard'
import JourneyStop from '@/components/vocab-cosmos/journey/JourneyStop'
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
  const litRegions = regions.filter((r) => r.status === 'complete').length

  const handleStopComplete = () => {
    setActiveStop(null)
    // refresh the path + every dependent vocab surface
    qc.invalidateQueries({ queryKey: ['vocab-journey', profileId] })
    qc.invalidateQueries({ queryKey: ['vocab-due-badge', profileId] })
    qc.invalidateQueries({ queryKey: ['vocab-dashboard-counts'] })
  }

  return (
    <>
      {/* keyframes used by the trail "current" pulse */}
      <style>{`@keyframes vc-pulse{0%,100%{opacity:.45;transform:scale(1)}50%{opacity:1;transform:scale(1.18)}}`}</style>

      <VocabShell>
        {/* sky summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="vc-card relative overflow-hidden"
          style={{ padding: 22 }}
        >
          <div className="vc-nebula vc-nebula-b" aria-hidden="true" />
          <div className="relative" style={{ zIndex: 1 }}>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={15} style={{ color: 'var(--vc-gold, #e9b949)' }} />
              <span
                className="text-[13px] font-bold tracking-wide"
                style={{ color: 'var(--vc-gold, #e9b949)', fontFamily: "'Tajawal', sans-serif" }}
              >
                رحلة النور
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
                {toArabicNum(litRegions)} كوكبة مكتملة
              </span>
              {(journey?.due_count ?? 0) > 0 && (
                <span className="vc-pill text-[12.5px] tabular-nums">
                  {toArabicNum(journey.due_count)} بانتظار المراجعة
                </span>
              )}
            </div>
          </div>
        </motion.div>

        {/* states */}
        {isLoading ? (
          <div className="vc-card flex items-center justify-center" style={{ padding: 48 }}>
            <Loader2 size={26} className="animate-spin" style={{ color: '#a5b4fc' }} />
          </div>
        ) : isError ? (
          <div className="vc-card text-center" style={{ padding: 28 }}>
            <p className="text-[15px]" style={{ color: 'var(--vc-text-dim, #c7d2fe)' }}>
              تعذّر تحميل رحلتك الآن.
            </p>
            <button type="button" onClick={() => refetch()} className="vc-btn vc-btn-ghost mt-4 mx-auto flex items-center gap-2">
              <RotateCcw size={15} /> إعادة المحاولة
            </button>
          </div>
        ) : (
          <>
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
              <div className="vc-card text-center relative overflow-hidden" style={{ padding: 30 }}>
                <div
                  className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-4"
                  style={{
                    background: 'radial-gradient(circle at 35% 30%, #fde68a, #e9b949 70%)',
                    boxShadow: '0 0 36px rgba(233,185,73,0.5)',
                  }}
                >
                  <Star size={36} strokeWidth={2} style={{ color: '#3b2f0b', fill: '#3b2f0b' }} />
                </div>
                <h2 className="text-[20px] font-bold" style={{ color: 'var(--vc-text, #f4f5ff)', fontFamily: "'Tajawal', sans-serif" }}>
                  كل كوكباتك مضيئة ✦
                </h2>
                <p className="text-[14px] mt-2" style={{ color: 'rgba(199,210,254,0.8)' }}>
                  أتممتِ رحلة هذا المستوى — ستظهر كوكبات جديدة كلما تقدّمتِ.
                </p>
              </div>
            )}
          </>
        )}
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
