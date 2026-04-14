import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, Trophy, Eye, EyeOff, Settings, X } from 'lucide-react'
import AnimatedNumber from '../../ui/AnimatedNumber'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../stores/authStore'
import { useLevelActivityFeed } from '../../../hooks/dashboard/useLevelActivityFeed'
import { useLevelTopMovers } from '../../../hooks/dashboard/useLevelTopMovers'
import { initialsFromDisplayName } from '../../../utils/names'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
const RANK_MEDALS = ['🥇', '🥈', '🥉']
const FALLBACK_COLORS = [
  'bg-sky-500', 'bg-emerald-500', 'bg-violet-500',
  'bg-amber-500', 'bg-rose-500', 'bg-indigo-500',
  'bg-teal-500', 'bg-orange-500',
]

const EVENT_ICONS = {
  achievement: '📖',
  word_added: '📖',
  xp_earned: '⭐',
  section_completed: '✅',
  unit_completed: '✅',
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function hashId(id) {
  if (!id) return 0
  const str = String(id)
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function getAvatarColor(id, rank) {
  if (rank !== undefined && rank < 3) return FALLBACK_COLORS[rank]
  return FALLBACK_COLORS[hashId(id) % FALLBACK_COLORS.length]
}

function AvatarCircle({ url, name, id, size = 40, rank, isCaller }) {
  const sizeClass = size === 40 ? 'w-10 h-10' : 'w-8 h-8'
  const textClass = size === 40 ? 'text-xs' : 'text-[10px]'
  const initials = initialsFromDisplayName(name)

  return (
    <div
      className={`${sizeClass} rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center font-bold text-white ${
        !url ? getAvatarColor(id, rank) : ''
      } ${isCaller ? 'ring-2 ring-sky-400 shadow-lg shadow-sky-500/20' : ''}`}
    >
      {url ? (
        <img
          src={url}
          alt={name || ''}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <span className={textClass}>{initials}</span>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Skeleton loaders                                                   */
/* ------------------------------------------------------------------ */
function SkeletonCard() {
  return (
    <div className="rounded-xl p-3 animate-pulse" style={{ background: 'var(--glass-card)' }}>
      <div className="flex flex-col items-center gap-2">
        <div className="w-10 h-10 rounded-full bg-white/10" />
        <div className="w-16 h-3 rounded bg-white/10" />
        <div className="w-12 h-3 rounded bg-white/10" />
      </div>
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-3 animate-pulse">
      <div className="w-8 h-8 rounded-full bg-white/10 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="w-24 h-3 rounded bg-white/10" />
        <div className="w-40 h-3 rounded bg-white/8" />
      </div>
      <div className="w-10 h-3 rounded bg-white/10" />
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <div className="space-y-1">
        {[0, 1, 2, 3].map((i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Privacy Modal                                                      */
/* ------------------------------------------------------------------ */
function PrivacyModal({ studentId, onClose }) {
  const [showInLeaderboard, setShowInLeaderboard] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data, error } = await supabase
        .from('students')
        .select('show_in_leaderboard')
        .eq('id', studentId)
        .single()
      if (!cancelled) {
        if (!error && data) setShowInLeaderboard(data.show_in_leaderboard ?? true)
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [studentId])

  async function handleToggle() {
    const newValue = !showInLeaderboard
    setSaving(true)
    setShowInLeaderboard(newValue)
    await supabase
      .from('students')
      .update({ show_in_leaderboard: newValue })
      .eq('id', studentId)
    setSaving(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-sm rounded-2xl p-6 relative"
        style={{
          background: 'var(--glass-card)',
          border: '1px solid var(--border-default)',
        }}
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-1 rounded-lg hover:bg-white/10 transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-2 mb-3">
          <Settings size={18} style={{ color: 'var(--text-secondary)' }} />
          <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
            إعدادات الظهور للزملاء
          </h3>
        </div>

        <p className="text-sm mb-5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          إذا أوقفت هذا الخيار، لن يظهر اسمك ونشاطك للطلاب الآخرين في نفس مستواك.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-4">
            <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {showInLeaderboard ? (
                <span className="flex items-center gap-2">
                  <Eye size={16} style={{ color: 'var(--accent-emerald)' }} />
                  ظاهر للزملاء
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <EyeOff size={16} style={{ color: 'var(--text-tertiary)' }} />
                  مخفي عن الزملاء
                </span>
              )}
            </span>

            <button
              onClick={handleToggle}
              disabled={saving}
              className="relative w-12 h-7 rounded-full transition-colors duration-200 flex-shrink-0"
              style={{
                background: showInLeaderboard ? 'var(--accent-emerald)' : 'rgba(255,255,255,0.15)',
              }}
            >
              <motion.div
                className="absolute top-1 w-5 h-5 rounded-full bg-white shadow-md"
                animate={{ left: showInLeaderboard ? '2px' : '26px' }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Top Mover Card                                                     */
/* ------------------------------------------------------------------ */
function MoverCard({ mover, rank }) {
  const isCaller = mover.is_caller === true

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.08, duration: 0.3 }}
      className={`relative rounded-xl p-3 text-center transition-all ${
        isCaller ? 'ring-2 ring-sky-400 shadow-lg shadow-sky-500/20' : ''
      }`}
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid var(--border-default)',
      }}
    >
      {/* Rank badge */}
      <span className="absolute top-2 right-2 text-base leading-none">
        {RANK_MEDALS[rank] || ''}
      </span>

      <div className="flex flex-col items-center gap-1.5 pt-1">
        <AvatarCircle
          url={mover.avatar_url}
          name={mover.display_name}
          id={mover.student_id}
          size={40}
          rank={rank}
          isCaller={false}
        />
        <span
          className="text-sm font-bold line-clamp-2 leading-tight w-full"
          style={{ color: 'var(--text-primary)' }}
        >
          {mover.display_name}
        </span>
        <span
          className="text-xs font-semibold"
          style={{
            color: 'var(--accent-sky)',
            textShadow: '0 0 12px rgba(56,189,248,0.3)',
          }}
        >
          <AnimatedNumber value={mover.xp_in_period} /> XP
        </span>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Feed Item                                                          */
/* ------------------------------------------------------------------ */
function FeedItem({ item, isNew }) {
  const icon = EVENT_ICONS[item.event_type] || '⭐'
  const text = item.event_text_ar || item.event_title || ''

  return (
    <motion.div
      initial={isNew ? { opacity: 0, height: 0, y: -8 } : { opacity: 1, height: 'auto', y: 0 }}
      animate={{ opacity: 1, height: 'auto', y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="flex items-start gap-3 py-3"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
    >
      {/* Avatar (right side in RTL) */}
      <AvatarCircle
        url={item.actor_avatar_url}
        name={item.actor_name}
        id={item.actor_id}
        size={32}
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
          {item.actor_name}
        </span>
        <p className="text-sm mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {text}
        </p>
        <span className="text-xs mt-1 block" style={{ color: 'var(--text-tertiary)' }}>
          {item.relative_time_ar}
        </span>
      </div>

      {/* Event icon + XP */}
      <div className="flex-shrink-0 flex items-center gap-1 pt-0.5">
        <span className="text-base">{icon}</span>
        {item.event_type === 'xp_earned' && item.xp_amount > 0 && (
          <span
            className="text-xs font-bold"
            style={{ color: 'var(--accent-gold)' }}
          >
            +{item.xp_amount}
          </span>
        )}
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
export default function LiveLevelActivityFeed({ studentId }) {
  const { studentData } = useAuthStore()
  const academicLevel = studentData?.academic_level

  const {
    data: feedData,
    isLoading: feedLoading,
    error: feedError,
  } = useLevelActivityFeed(studentId)

  const {
    data: moversData,
    isLoading: moversLoading,
    error: moversError,
  } = useLevelTopMovers(studentId)

  const [moversPeriod, setMoversPeriod] = useState('today')
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [borderFlash, setBorderFlash] = useState(false)
  const prevFeedLengthRef = useRef(0)
  const [seenIds, setSeenIds] = useState(new Set())

  // Track feed IDs we've already rendered to animate new ones
  useEffect(() => {
    if (feedData && feedData.length > 0) {
      // On first load, mark all as seen (no animation)
      if (prevFeedLengthRef.current === 0) {
        setSeenIds(new Set(feedData.map((f) => f.feed_id)))
      }
      prevFeedLengthRef.current = feedData.length
    }
  }, []) // only on mount

  // Flash border when new realtime data arrives
  useEffect(() => {
    if (!feedData || feedData.length === 0) return
    const currentIds = new Set(feedData.map((f) => f.feed_id))
    const hasNew = feedData.some((f) => !seenIds.has(f.feed_id))

    if (hasNew && seenIds.size > 0) {
      setBorderFlash(true)
      const timeout = setTimeout(() => setBorderFlash(false), 1000)

      // Update seen IDs
      setSeenIds(currentIds)
      return () => clearTimeout(timeout)
    }

    if (seenIds.size === 0 && feedData.length > 0) {
      setSeenIds(currentIds)
    }
  }, [feedData])

  const isLoading = feedLoading || moversLoading
  const hasError = feedError || moversError

  const currentMovers = moversData?.[moversPeriod] || []
  const topThree = currentMovers.slice(0, 3)

  // Find caller position for motivational text
  const callerEntry = currentMovers.find((m) => m.is_caller)
  const callerRank = callerEntry
    ? currentMovers.indexOf(callerEntry) + 1
    : null

  function getMotivationalText() {
    if (!currentMovers || currentMovers.length === 0) return null
    if (callerEntry && callerRank && callerRank <= 3) {
      return '👑 أنت من نجوم الأسبوع!'
    }
    if (callerEntry && callerEntry.xp_in_period > 0) {
      return `أنت في المرتبة ${callerRank} بـ ${callerEntry.xp_in_period} XP — يلا اطلع! 💪`
    }
    if (callerEntry && callerEntry.xp_in_period === 0) {
      return 'ابدأ نشاط واحد وادخل قائمة الأكثر نشاطاً 💪'
    }
    // caller not found in data at all
    return 'ابدأ نشاط واحد وادخل قائمة الأكثر نشاطاً 💪'
  }

  const hasMovers = topThree.length > 0
  const hasFeed = feedData && feedData.length > 0

  return (
    <>
      <div
        dir="rtl"
        className={`fl-card-static p-6 relative transition-all duration-300 ${
          borderFlash ? 'ring-2 ring-emerald-400/50' : ''
        }`}
      >
        {/* Live indicator */}
        <div className="absolute top-4 left-4 flex items-center gap-1.5">
          <span className="relative flex h-2.5 w-2.5">
            <span
              className="absolute inset-0 rounded-full animate-ping opacity-60"
              style={{ background: 'var(--accent-emerald)' }}
            />
            <span
              className="relative inline-flex h-2.5 w-2.5 rounded-full"
              style={{ background: 'var(--accent-emerald)' }}
            />
          </span>
          <span className="text-xs font-medium" style={{ color: 'var(--accent-emerald)' }}>
            مباشر
          </span>
        </div>

        {/* Error state */}
        {hasError && !isLoading && (
          <div className="text-center py-8">
            <p className="text-sm" style={{ color: 'var(--accent-rose)' }}>
              حدث خطأ في تحميل البيانات. يرجى المحاولة لاحقاً.
            </p>
          </div>
        )}

        {/* Loading state */}
        {isLoading && !hasError && <LoadingSkeleton />}

        {/* Loaded content */}
        {!isLoading && !hasError && (
          <div className="space-y-5">
            {/* ---- TOP MOVERS ---- */}
            {hasMovers && (
              <div>
                {/* Header row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Flame size={18} style={{ color: 'var(--accent-amber)' }} />
                    <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                      🔥 الأكثر نشاطاً
                    </h3>
                  </div>

                  {/* Period toggle */}
                  <div
                    className="flex rounded-lg overflow-hidden text-xs"
                    style={{ border: '1px solid var(--border-default)' }}
                  >
                    {[
                      { key: 'today', label: 'اليوم' },
                      { key: 'week', label: 'الأسبوع' },
                    ].map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setMoversPeriod(key)}
                        className="px-3 py-1.5 font-medium transition-colors"
                        style={{
                          background:
                            moversPeriod === key
                              ? 'var(--accent-sky)'
                              : 'transparent',
                          color:
                            moversPeriod === key
                              ? '#fff'
                              : 'var(--text-secondary)',
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cards grid */}
                <div className="grid grid-cols-3 gap-3">
                  {topThree.map((mover, i) => (
                    <MoverCard key={mover.student_id} mover={mover} rank={i} />
                  ))}
                </div>

                {/* Motivational separator */}
                {(() => {
                  const text = getMotivationalText()
                  if (!text) return null
                  return (
                    <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-default)' }}>
                      <p
                        className="text-center text-xs font-medium"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {text}
                      </p>
                    </div>
                  )
                })()}
              </div>
            )}

            {/* Top movers empty */}
            {!hasMovers && (
              <div
                className="text-center py-6 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.03)' }}
              >
                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  لا يوجد نشاط بعد اليوم — كن أول من يبدأ!
                </p>
              </div>
            )}

            {/* Divider between sections */}
            <div style={{ borderTop: '1px solid var(--border-default)' }} />

            {/* ---- ACTIVITY FEED ---- */}
            <div>
              <h3 className="font-bold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>
                آخر النشاطات
              </h3>

              {hasFeed ? (
                <div className="max-h-80 overflow-y-auto custom-scrollbar">
                  <AnimatePresence initial={false}>
                    {feedData.map((item) => (
                      <FeedItem
                        key={item.feed_id}
                        item={item}
                        isNew={!seenIds.has(item.feed_id)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div
                  className="text-center py-8 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.03)' }}
                >
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                    🌱 لا يوجد نشاط حديث من الزملاء بعد
                    <br />
                    كن أول من يبدأ — فعالية الأكاديمية تبدأ منك!
                  </p>
                </div>
              )}
            </div>

            {/* ---- PRIVACY BUTTON ---- */}
            <div className="pt-2" style={{ borderTop: '1px solid var(--border-default)' }}>
              <button
                onClick={() => setShowPrivacy(true)}
                className="flex items-center gap-1.5 text-xs font-medium hover:opacity-80 transition-opacity mx-auto"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <Settings size={14} />
                إعدادات الخصوصية
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Privacy modal */}
      <AnimatePresence>
        {showPrivacy && (
          <PrivacyModal
            studentId={studentId}
            onClose={() => setShowPrivacy(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
