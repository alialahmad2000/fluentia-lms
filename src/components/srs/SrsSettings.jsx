import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Volume2, VolumeX } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthProfile } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'

const NEW_CARD_STEPS = [0, 5, 10, 20, 30, 50]
const MAX_REVIEW_STEPS = [50, 100, 200, 300, 500]
const ORDER_OPTIONS = [
  { value: 'level', label: 'حسب المستوى' },
  { value: 'random', label: 'عشوائي' },
  { value: 'unit', label: 'حسب الوحدة' },
]

const toArabicNum = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d])

/**
 * SrsSettings drawer.
 * Reads + writes profiles.srs_* columns. Auto-saves on change (500ms debounce).
 * Slides up on mobile (full-width bottom sheet), in from the right on lg.
 */
export default function SrsSettings({ isOpen, onClose }) {
  const profile = useAuthProfile()
  const profileId = profile?.id
  const queryClient = useQueryClient()

  // Fetch current settings
  const { data: prefs } = useQuery({
    queryKey: ['srs-prefs', profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('srs_daily_new_cards, srs_daily_max_reviews, srs_review_order, srs_autoplay_audio')
        .eq('id', profileId)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!profileId && isOpen,
    staleTime: 60_000,
  })

  // Local mirror so the UI reflects changes instantly while debounced save fires.
  const [dailyNew, setDailyNew] = useState(20)
  const [maxReviews, setMaxReviews] = useState(200)
  const [order, setOrder] = useState('level')
  const [autoplay, setAutoplay] = useState(true)
  const [savedFlash, setSavedFlash] = useState(false)
  const saveTimer = useRef(null)
  const initialized = useRef(false)

  // Hydrate from server fetch once
  useEffect(() => {
    if (!prefs || initialized.current) return
    setDailyNew(prefs.srs_daily_new_cards ?? 20)
    setMaxReviews(prefs.srs_daily_max_reviews ?? 200)
    setOrder(prefs.srs_review_order ?? 'level')
    setAutoplay(prefs.srs_autoplay_audio ?? true)
    initialized.current = true
  }, [prefs])

  // Reset initialization flag when drawer closes so re-open re-hydrates fresh
  useEffect(() => {
    if (!isOpen) initialized.current = false
  }, [isOpen])

  // Debounced save: writes whichever fields changed, 500ms after the last edit
  function scheduleSave(patch) {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      if (!profileId) return
      const { data, error } = await supabase
        .from('profiles')
        .update(patch)
        .eq('id', profileId)
        .select('srs_daily_new_cards, srs_daily_max_reviews, srs_review_order, srs_autoplay_audio')
        .maybeSingle()
      if (error) {
        console.warn('[SrsSettings] save failed:', error.message)
        return
      }
      // Update cached prefs + dashboard counts (depend on daily new limit)
      queryClient.setQueryData(['srs-prefs', profileId], data)
      queryClient.invalidateQueries({ queryKey: ['srs-dashboard', profileId] })
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 1200)
    }, 500)
  }

  function handleDailyNewChange(value) {
    setDailyNew(value)
    scheduleSave({ srs_daily_new_cards: value })
  }
  function handleMaxReviewsChange(value) {
    setMaxReviews(value)
    scheduleSave({ srs_daily_max_reviews: value })
  }
  function handleOrderChange(value) {
    setOrder(value)
    scheduleSave({ srs_review_order: value })
  }
  function handleAutoplayChange(value) {
    setAutoplay(value)
    scheduleSave({ srs_autoplay_audio: value })
  }

  // Hook cleanup happens through unmount via parent; nothing local to do.

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[110]"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed inset-x-0 bottom-0 z-[111] lg:inset-y-0 lg:left-auto lg:right-0 lg:bottom-auto lg:max-w-md lg:w-full lg:h-full"
            style={{
              background: 'var(--ds-bg-elevated, var(--surface-base, #0b0f18))',
              borderTop: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.08))',
              borderInlineStart: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.08))',
              maxHeight: '90vh',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingBottom: 'calc(24px + var(--sab, 0px))',
            }}
            dir="rtl"
          >
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.06))' }}>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-['Tajawal']" style={{ color: 'var(--text-primary)' }}>
                  إعدادات المراجعة
                </h2>
                <AnimatePresence>
                  {savedFlash && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-emerald-400 inline-flex items-center gap-1 text-[11px] font-['Tajawal']"
                    >
                      <Check size={12} /> محفوظ
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                aria-label="إغلاق"
              >
                <X size={18} style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>

            <div className="px-5 py-6 space-y-7 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 64px)' }}>
              {/* Daily new cards */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold font-['Tajawal']" style={{ color: 'var(--text-primary)' }}>
                    كلمات جديدة يومياً
                  </label>
                  <span className="text-sm font-bold" style={{ color: 'var(--accent-violet)' }}>
                    {toArabicNum(dailyNew)}
                  </span>
                </div>
                <div className="flex gap-2">
                  {NEW_CARD_STEPS.map((v) => (
                    <button
                      key={v}
                      onClick={() => handleDailyNewChange(v)}
                      className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
                      style={{
                        background: dailyNew === v ? 'var(--accent-violet-glow, rgba(167,139,250,0.2))' : 'var(--surface-raised, rgba(255,255,255,0.04))',
                        color: dailyNew === v ? 'var(--accent-violet)' : 'var(--text-tertiary)',
                        border: dailyNew === v ? '1px solid var(--accent-violet)' : '1px solid transparent',
                      }}
                    >
                      {toArabicNum(v)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Max reviews */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold font-['Tajawal']" style={{ color: 'var(--text-primary)' }}>
                    حد المراجعات اليومية
                  </label>
                  <span className="text-sm font-bold" style={{ color: 'var(--accent-violet)' }}>
                    {toArabicNum(maxReviews)}
                  </span>
                </div>
                <div className="flex gap-2">
                  {MAX_REVIEW_STEPS.map((v) => (
                    <button
                      key={v}
                      onClick={() => handleMaxReviewsChange(v)}
                      className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
                      style={{
                        background: maxReviews === v ? 'var(--accent-violet-glow, rgba(167,139,250,0.2))' : 'var(--surface-raised, rgba(255,255,255,0.04))',
                        color: maxReviews === v ? 'var(--accent-violet)' : 'var(--text-tertiary)',
                        border: maxReviews === v ? '1px solid var(--accent-violet)' : '1px solid transparent',
                      }}
                    >
                      {toArabicNum(v)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Order */}
              <div>
                <label className="block text-sm font-semibold font-['Tajawal'] mb-3" style={{ color: 'var(--text-primary)' }}>
                  ترتيب المراجعة
                </label>
                <div className="flex gap-2">
                  {ORDER_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleOrderChange(opt.value)}
                      className="flex-1 py-2.5 rounded-lg text-xs font-bold font-['Tajawal'] transition-all"
                      style={{
                        background: order === opt.value ? 'var(--accent-violet-glow, rgba(167,139,250,0.2))' : 'var(--surface-raised, rgba(255,255,255,0.04))',
                        color: order === opt.value ? 'var(--accent-violet)' : 'var(--text-tertiary)',
                        border: order === opt.value ? '1px solid var(--accent-violet)' : '1px solid transparent',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Autoplay audio */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  {autoplay ? (
                    <Volume2 size={18} style={{ color: 'var(--accent-violet)' }} />
                  ) : (
                    <VolumeX size={18} style={{ color: 'var(--text-tertiary)' }} />
                  )}
                  <label className="text-sm font-semibold font-['Tajawal']" style={{ color: 'var(--text-primary)' }}>
                    تشغيل الصوت تلقائياً
                  </label>
                </div>
                <button
                  onClick={() => handleAutoplayChange(!autoplay)}
                  className="relative h-7 w-12 rounded-full transition-colors"
                  style={{
                    background: autoplay ? 'var(--accent-violet)' : 'var(--surface-raised, rgba(255,255,255,0.1))',
                  }}
                  aria-pressed={autoplay}
                  aria-label="تبديل تشغيل الصوت التلقائي"
                >
                  <motion.span
                    className="absolute top-1 inline-block w-5 h-5 rounded-full bg-white"
                    animate={{ left: autoplay ? 24 : 4 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
