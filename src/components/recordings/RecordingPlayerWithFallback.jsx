import { useState, useRef, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Info } from 'lucide-react'
import PremiumVideoPlayer from './PremiumVideoPlayer'
import DriveFallbackPlayer from './DriveFallbackPlayer'
import DirectLinkFallback from './DirectLinkFallback'
import { logFallbackEvent } from '../../lib/recordingAnalytics'

export default function RecordingPlayerWithFallback({
  recording,
  onProgress,
  onComplete,
  initialPosition = 0,
  chapters = [],
  bookmarks = [],
  onAddBookmark,
  onTogglePanel,
  showPanel = false,
  xpAwarded = false,
}) {
  const [tier, setTier] = useState(1) // 1=premium, 2=drive iframe, 3=direct link
  const [showFallbackNotice, setShowFallbackNotice] = useState(false)
  const failureTimerRef = useRef(null)
  const playbackStartedRef = useRef(false)

  // Auto-fallback after 12s of failed loading (tier 1 only)
  useEffect(() => {
    if (tier !== 1) return
    playbackStartedRef.current = false
    failureTimerRef.current = setTimeout(() => {
      if (!playbackStartedRef.current) {
        console.log('[Fallback] Tier 1 timeout — falling back to Drive iframe')
        escalateTier(2, 'timeout_12s')
      }
    }, 12000)
    return () => clearTimeout(failureTimerRef.current)
  }, [tier]) // eslint-disable-line react-hooks/exhaustive-deps

  const escalateTier = useCallback((newTier, reason) => {
    console.log(`[Fallback] Escalating to tier ${newTier}, reason: ${reason}`)
    clearTimeout(failureTimerRef.current)
    setTier(newTier)
    setShowFallbackNotice(true)
    logFallbackEvent(recording?.id, newTier, reason)
  }, [recording?.id])

  // Called by PremiumVideoPlayer when <video> errors or stream fails
  const handlePremiumFailure = useCallback((errorDetail) => {
    if (tier === 1) {
      const reason = typeof errorDetail === 'string' ? errorDetail
        : errorDetail?.message || errorDetail?.source || 'premium_player_error'
      escalateTier(2, reason)
    }
  }, [tier, escalateTier])

  // Called by DriveFallbackPlayer if iframe blocked or fails
  const handleDriveFailure = useCallback(() => {
    if (tier === 2) escalateTier(3, 'drive_iframe_blocked')
  }, [tier, escalateTier])

  // Called when playback actually starts — clears timer
  const handlePlaybackStarted = useCallback(() => {
    playbackStartedRef.current = true
    clearTimeout(failureTimerRef.current)
    if (showFallbackNotice) {
      setTimeout(() => setShowFallbackNotice(false), 4000)
    }
  }, [showFallbackNotice])

  return (
    <div className="relative w-full">
      {tier === 1 && (
        <PremiumVideoPlayer
          recording={recording}
          onProgress={onProgress}
          onComplete={onComplete}
          initialPosition={initialPosition}
          chapters={chapters}
          bookmarks={bookmarks}
          onAddBookmark={onAddBookmark}
          onTogglePanel={onTogglePanel}
          showPanel={showPanel}
          xpAwarded={xpAwarded}
          onFallback={handlePremiumFailure}
          onPlaybackStarted={handlePlaybackStarted}
        />
      )}

      {tier === 2 && (
        <DriveFallbackPlayer
          recording={recording}
          onError={handleDriveFailure}
          onLoad={handlePlaybackStarted}
        />
      )}

      {tier === 3 && (
        <DirectLinkFallback recording={recording} />
      )}

      {/* Fallback notice banner */}
      <AnimatePresence>
        {showFallbackNotice && tier === 2 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-4 right-4 left-4 md:left-auto md:max-w-md bg-amber-500/90 backdrop-blur-md text-white rounded-xl px-4 py-3 flex items-center gap-2 shadow-xl"
            style={{ zIndex: 30 }}
            dir="rtl"
          >
            <Info className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-['Tajawal']">
              تم تشغيل التسجيل بالمشغل الاحتياطي. قد لا تتوفر بعض الميزات.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
