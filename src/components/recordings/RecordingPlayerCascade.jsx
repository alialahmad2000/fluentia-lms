import { useState, useRef, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { PLAYER_TIERS, getTierConfig } from '../../lib/playerTiers'
import { logFallbackEvent } from '../../lib/recordingAnalytics'
import { useAuthStore } from '../../stores/authStore'

import PremiumVideoPlayer from './PremiumVideoPlayer'
import DrivePreviewIframe from './tiers/DrivePreviewIframe'
import DriveEmbedIframe from './tiers/DriveEmbedIframe'
import DriveRawHTML5 from './tiers/DriveRawHTML5'
import GoogleDocsViewer from './tiers/GoogleDocsViewer'
import DirectLinkFallback from './DirectLinkFallback'

function detectDeviceType() {
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'desktop'
}

export default function RecordingPlayerCascade({
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
  const { user } = useAuthStore()
  const [currentTier, setCurrentTier] = useState(1)
  const [retryCount, setRetryCount] = useState(0)
  const [tierKey, setTierKey] = useState(0)
  const [showSwitchNotice, setShowSwitchNotice] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const playbackStartedRef = useRef(false)
  const failureTimerRef = useRef(null)

  // Determine starting tier from tier_test_results + smart memory
  useEffect(() => {
    let alive = true
    async function pickStartingTier() {
      try {
        const userId = user?.id
        const device = detectDeviceType()

        // Fetch tier test results for this recording
        const { data: recData } = await supabase
          .from('class_recordings')
          .select('tier_test_results')
          .eq('id', recording.id)
          .maybeSingle()

        if (!alive) return

        const workingTiers = recData?.tier_test_results?.[device] || []

        // If we have test data, start from the best known-working tier
        if (workingTiers.length > 0) {
          const startTier = workingTiers[0] // lowest working tier
          console.log(`[Cascade] Tier test data → ${device} working tiers: [${workingTiers}], starting at ${startTier}`)
          setCurrentTier(startTier)
          if (alive) setInitialized(true)
          return
        }

        // Fallback to student preference + recording stats
        if (userId) {
          const [prefRes, statsRes] = await Promise.all([
            supabase
              .from('student_player_preference')
              .select('preferred_tier')
              .eq('student_id', userId)
              .maybeSingle(),
            supabase
              .from('recording_tier_stats')
              .select('recommended_starting_tier')
              .eq('recording_id', recording.id)
              .maybeSingle(),
          ])

          if (!alive) return

          const studentTier = prefRes.data?.preferred_tier || 1
          const recordingTier = statsRes.data?.recommended_starting_tier || 1
          const startTier = Math.max(studentTier, recordingTier)

          if (startTier > 1) {
            console.log(`[Cascade] Smart memory → starting at tier ${startTier}`)
          }
          setCurrentTier(startTier)
        }
      } catch {
        // Fallback to tier 1
      }
      if (alive) setInitialized(true)
    }
    pickStartingTier()
    return () => { alive = false }
  }, [recording.id, user?.id])

  // Tier 1 auto-timeout (only for premium player)
  useEffect(() => {
    if (!initialized || currentTier !== 1) return
    playbackStartedRef.current = false

    const config = getTierConfig(1)
    failureTimerRef.current = setTimeout(() => {
      if (!playbackStartedRef.current) {
        handleTierFailure('timeout_12s')
      }
    }, config.timeoutMs)

    return () => clearTimeout(failureTimerRef.current)
  }, [initialized, currentTier, tierKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleTierFailure = useCallback(async (reason) => {
    console.log(`[Cascade] Tier ${currentTier} failed: ${reason} (retry ${retryCount})`)
    clearTimeout(failureTimerRef.current)

    const config = getTierConfig(currentTier)

    // Retry within tier
    if (retryCount < config.retries) {
      setRetryCount(prev => prev + 1)
      setTierKey(prev => prev + 1)
      return
    }

    // Log failure
    logFallbackEvent(recording?.id, currentTier, reason)

    // Update student tier1 failure count
    if (currentTier === 1 && user?.id) {
      supabase.rpc('increment_student_tier1_failures', { uid: user.id }).catch(() => {})
    }

    // Escalate to next tier, skipping dead tiers (3,4,5 have 0% success)
    let nextTier = currentTier + 1
    while (nextTier < PLAYER_TIERS.length) {
      const nextConfig = getTierConfig(nextTier)
      if (!nextConfig.deadTier) break
      console.log(`[Cascade] Skipping dead tier ${nextTier}`)
      nextTier++
    }
    if (nextTier > PLAYER_TIERS.length) {
      console.error('[Cascade] All tiers exhausted')
      return
    }

    setShowSwitchNotice(true)
    setCurrentTier(nextTier)
    setRetryCount(0)
    setTierKey(prev => prev + 1)
    setTimeout(() => setShowSwitchNotice(false), 4000)
  }, [currentTier, retryCount, recording?.id, user?.id])

  const handleTierSuccess = useCallback(async () => {
    playbackStartedRef.current = true
    clearTimeout(failureTimerRef.current)

    if (showSwitchNotice) {
      setTimeout(() => setShowSwitchNotice(false), 4000)
    }

    // Remember successful tier
    if (currentTier <= 5 && user?.id) {
      try {
        await supabase.from('student_player_preference').upsert({
          student_id: user.id,
          last_successful_tier: currentTier,
          ...(currentTier === 1 ? { consecutive_tier1_failures: 0 } : {}),
          device_type: detectDeviceType(),
          updated_at: new Date().toISOString(),
        })

        if (currentTier > 1) {
          supabase.rpc('maybe_bump_student_preferred_tier', {
            uid: user.id,
            tier: currentTier,
          }).catch(() => {})
        }
      } catch { /* silent */ }
    }
  }, [currentTier, user?.id, showSwitchNotice])

  // Called by PremiumVideoPlayer on hard error
  const handlePremiumFailure = useCallback((errorDetail) => {
    if (currentTier === 1) {
      const reason = typeof errorDetail === 'string' ? errorDetail
        : errorDetail?.message || errorDetail?.source || 'premium_player_error'
      handleTierFailure(reason)
    }
  }, [currentTier, handleTierFailure])

  const handlePlaybackStarted = useCallback(() => {
    handleTierSuccess()
  }, [handleTierSuccess])

  if (!initialized) {
    return (
      <div className="w-full bg-black rounded-2xl flex items-center justify-center" style={{ aspectRatio: '16/9' }}>
        <div className="w-6 h-6 rounded-full border-2 border-white/20 border-t-sky-400 animate-spin" />
      </div>
    )
  }

  const config = getTierConfig(currentTier)

  return (
    <div className="relative w-full">
      {/* Tier 1: Premium */}
      {currentTier === 1 && (
        <PremiumVideoPlayer
          key={`premium-${tierKey}`}
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

      {/* Tier 2: Drive Preview */}
      {currentTier === 2 && (
        <DrivePreviewIframe
          key={`preview-${tierKey}`}
          recording={recording}
          onError={(r) => handleTierFailure(r || 'drive_preview_failed')}
          onLoad={handlePlaybackStarted}
        />
      )}

      {/* Tier 3: Drive Embed */}
      {currentTier === 3 && (
        <DriveEmbedIframe
          key={`embed-${tierKey}`}
          recording={recording}
          onError={(r) => handleTierFailure(r || 'drive_embed_failed')}
          onLoad={handlePlaybackStarted}
        />
      )}

      {/* Tier 4: Raw HTML5 */}
      {currentTier === 4 && (
        <DriveRawHTML5
          key={`raw-${tierKey}`}
          recording={recording}
          onError={(r) => handleTierFailure(r || 'raw_html5_failed')}
          onLoad={handlePlaybackStarted}
        />
      )}

      {/* Tier 5: Google Docs Viewer */}
      {currentTier === 5 && (
        <GoogleDocsViewer
          key={`docs-${tierKey}`}
          recording={recording}
          onError={(r) => handleTierFailure(r || 'docs_viewer_failed')}
          onLoad={handlePlaybackStarted}
        />
      )}

      {/* Tier 6: Direct Link */}
      {currentTier === 6 && (
        <DirectLinkFallback recording={recording} />
      )}

      {/* Switch notice */}
      <AnimatePresence>
        {showSwitchNotice && currentTier >= 2 && currentTier <= 5 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-4 right-4 left-4 md:left-auto md:max-w-md bg-amber-500/90 backdrop-blur-md text-white rounded-xl px-4 py-3 flex items-center gap-2 shadow-xl"
            style={{ zIndex: 30 }}
            dir="rtl"
          >
            <RefreshCw className="w-5 h-5 flex-shrink-0 animate-spin" />
            <p className="text-sm font-['Tajawal']">
              جاري تجربة {config.displayName}...
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
