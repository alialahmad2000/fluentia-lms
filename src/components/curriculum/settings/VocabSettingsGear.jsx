import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Settings2, X, LayoutGrid, List, Volume2, ExternalLink, Eye, Zap } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useBodyLock } from '../../../hooks/useBodyLock'
import { toast } from '../../ui/FluentiaToast'
import { CHUNK_SIZE_OPTIONS } from '../../../utils/vocabularyChunks'

const toArabicNum = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d])

const VIEW_MODE_OPTIONS = [
  { value: 'grid', label: 'شبكة', icon: LayoutGrid },
  { value: 'list', label: 'قائمة', icon: List },
]
const TAP_BEHAVIOR_OPTIONS = [
  { value: 'details',  label: 'عرض التفاصيل أولاً' },
  { value: 'practice', label: 'ابدأ التدريب مباشرة' },
]

/**
 * Floating settings gear (bottom-end of viewport) opening a drawer
 * with unit-vocab preferences. Settings auto-save with 500ms debounce.
 *
 * Props:
 *   studentId: profile.id
 */
export default function VocabSettingsGear({ studentId }) {
  const [open, setOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const queryClient = useQueryClient()
  useBodyLock(open)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const sync = () => setIsMobile(mq.matches)
    sync()
    if (mq.addEventListener) mq.addEventListener('change', sync)
    else mq.addListener(sync)
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', sync)
      else mq.removeListener(sync)
    }
  }, [])

  // ESC closes drawer
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Load all prefs in one query
  const { data: prefs, isLoading } = useQuery({
    queryKey: ['vocab-settings-prefs', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(
          'vocab_view_mode_default, vocab_card_autoplay_audio, vocab_tap_behavior, preferred_chunk_size'
        )
        .eq('id', studentId)
        .maybeSingle()
      if (error) throw error
      return data ?? {}
    },
    enabled: !!studentId,
    staleTime: 60_000,
  })

  const updateMut = useMutation({
    mutationFn: async (patch) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(patch)
        .eq('id', studentId)
        .select()
        .maybeSingle()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      // Optimistic refresh of the local cache
      queryClient.setQueryData(['vocab-settings-prefs', studentId], (old) => ({
        ...(old || {}),
        ...(data || {}),
      }))
      queryClient.invalidateQueries({ queryKey: ['unit-chunks'] })
      queryClient.invalidateQueries({ queryKey: ['unit-vocab-status'] })
    },
    onError: (e) => {
      toast({
        type: 'error',
        title: 'تعذر حفظ الإعداد',
        description: e?.message || 'حاول مرة أخرى.',
      })
    },
  })

  // Debounce store: any setting waits 500ms before write
  const debounceRef = useRef(null)
  const pendingRef = useRef({})
  const enqueueWrite = useCallback(
    (patch) => {
      pendingRef.current = { ...pendingRef.current, ...patch }
      // Optimistic local update right away
      queryClient.setQueryData(['vocab-settings-prefs', studentId], (old) => ({
        ...(old || {}),
        ...patch,
      }))
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        const toSend = pendingRef.current
        pendingRef.current = {}
        updateMut.mutate(toSend, {
          onSuccess: () => {
            toast({
              type: 'success',
              title: 'تم الحفظ',
              description: '✓',
            })
          },
        })
      }, 500)
    },
    [queryClient, studentId, updateMut]
  )

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const viewMode = prefs?.vocab_view_mode_default ?? 'grid'
  const autoplay = prefs?.vocab_card_autoplay_audio === true
  const tapBehavior = prefs?.vocab_tap_behavior ?? 'details'
  const chunkSize = prefs?.preferred_chunk_size ?? 10

  if (!studentId) return null

  return (
    <>
      {/* Floating gear button */}
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        whileHover={{ rotate: 90 }}
        whileTap={{ scale: 0.94 }}
        transition={{ duration: 0.25 }}
        aria-label="إعدادات المفردات"
        title="إعدادات المفردات"
        className="fixed z-[55]"
        style={{
          insetInlineEnd: 18, // bottom-right in LTR, bottom-left in RTL
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 18px)',
          width: 56,
          height: 56,
          borderRadius: 9999,
          background:
            'linear-gradient(135deg, rgba(56,189,248,0.92) 0%, rgba(168,85,247,0.92) 100%)',
          color: 'white',
          border: '1px solid rgba(255,255,255,0.18)',
          boxShadow:
            '0 14px 32px rgba(56,189,248,0.32), 0 2px 8px rgba(0,0,0,0.30)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Settings2 size={22} />
      </motion.button>

      {/* Drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="vocab-settings-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[56]"
              style={{
                background: 'rgba(2,6,15,0.62)',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
              }}
              aria-hidden="true"
            />
            <motion.aside
              key="vocab-settings-drawer"
              role="dialog"
              aria-modal="true"
              aria-labelledby="vocab-settings-title"
              initial={isMobile ? { y: '100%' } : { x: '-100%' }}
              animate={isMobile ? { y: 0 } : { x: 0 }}
              exit={isMobile ? { y: '100%' } : { x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="z-[57] flex flex-col"
              style={{
                position: 'fixed',
                ...(isMobile
                  ? {
                      bottom: 0,
                      left: 0,
                      right: 0,
                      maxHeight: '78vh',
                      borderTopLeftRadius: 24,
                      borderTopRightRadius: 24,
                    }
                  : {
                      top: 0,
                      bottom: 0,
                      insetInlineStart: 0,
                      width: 'min(420px, 95vw)',
                    }),
                background:
                  'linear-gradient(180deg, rgba(10,18,37,0.98) 0%, rgba(10,18,37,1) 60%)',
                border: '1px solid rgba(255,255,255,0.06)',
                color: 'var(--text-primary, #faf5e6)',
                boxShadow: isMobile
                  ? '0 -16px 40px rgba(0,0,0,0.45)'
                  : '8px 0 40px rgba(0,0,0,0.45)',
              }}
              dir="rtl"
            >
              {isMobile && (
                <div className="flex justify-center pt-2">
                  <span
                    style={{
                      width: 40,
                      height: 4,
                      borderRadius: 9999,
                      background: 'rgba(255,255,255,0.18)',
                    }}
                    aria-hidden="true"
                  />
                </div>
              )}

              <header className="flex items-start justify-between px-5 py-4 shrink-0">
                <h2
                  id="vocab-settings-title"
                  className="font-['Tajawal'] font-bold"
                  style={{ fontSize: 18, color: 'var(--text-primary)' }}
                >
                  إعدادات المفردات
                </h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="إغلاق"
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{
                    background: 'var(--surface, rgba(255,255,255,0.04))',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <X size={16} />
                </button>
              </header>

              <div
                className="flex-1 overflow-y-auto px-5 pb-5 space-y-5"
                style={{ overscrollBehavior: 'contain' }}
              >
                {isLoading ? (
                  <div className="py-12 text-center font-['Tajawal']" style={{ color: 'var(--text-tertiary)' }}>
                    تحميل…
                  </div>
                ) : (
                  <>
                    <SettingGroup icon={<Eye size={14} />} label="العرض الافتراضي">
                      <SegmentedPills
                        options={VIEW_MODE_OPTIONS}
                        value={viewMode}
                        onChange={(v) => enqueueWrite({ vocab_view_mode_default: v })}
                      />
                    </SettingGroup>

                    <SettingGroup icon={<Volume2 size={14} />} label="تشغيل الصوت تلقائياً عند الضغط">
                      <ToggleSwitch
                        checked={autoplay}
                        onChange={(checked) =>
                          enqueueWrite({ vocab_card_autoplay_audio: checked })
                        }
                        ariaLabel="تشغيل الصوت تلقائياً"
                      />
                    </SettingGroup>

                    <SettingGroup icon={<Zap size={14} />} label="سلوك الضغط على الكلمة">
                      <div className="flex flex-col gap-2" role="radiogroup">
                        {TAP_BEHAVIOR_OPTIONS.map((opt) => {
                          const checked = tapBehavior === opt.value
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              role="radio"
                              aria-checked={checked}
                              onClick={() =>
                                enqueueWrite({ vocab_tap_behavior: opt.value })
                              }
                              className="text-start font-['Tajawal']"
                              style={{
                                padding: '10px 12px',
                                borderRadius: 10,
                                background: checked
                                  ? 'rgba(56,189,248,0.12)'
                                  : 'var(--surface, rgba(255,255,255,0.04))',
                                border: checked
                                  ? '1px solid rgba(56,189,248,0.45)'
                                  : '1px solid var(--border)',
                                color: 'var(--text-primary)',
                                fontSize: 13,
                                cursor: 'pointer',
                              }}
                              dir="rtl"
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  style={{
                                    display: 'inline-block',
                                    width: 14,
                                    height: 14,
                                    borderRadius: 9999,
                                    border: checked
                                      ? '4px solid rgb(56,189,248)'
                                      : '2px solid rgba(255,255,255,0.25)',
                                  }}
                                />
                                {opt.label}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </SettingGroup>

                    <SettingGroup label="حجم المجموعة">
                      <div className="flex flex-wrap gap-1.5" role="radiogroup">
                        {CHUNK_SIZE_OPTIONS.map((size) => {
                          const checked = size === chunkSize
                          return (
                            <button
                              key={size}
                              type="button"
                              role="radio"
                              aria-checked={checked}
                              onClick={() => enqueueWrite({ preferred_chunk_size: size })}
                              className="font-['Tajawal'] font-bold"
                              style={{
                                minWidth: 40,
                                height: 32,
                                padding: '0 10px',
                                borderRadius: 9999,
                                fontSize: 13,
                                background: checked
                                  ? 'linear-gradient(135deg, rgba(56,189,248,0.25), rgba(168,85,247,0.18))'
                                  : 'rgba(255,255,255,0.04)',
                                border: checked
                                  ? '1px solid rgba(168,85,247,0.45)'
                                  : '1px solid rgba(255,255,255,0.08)',
                                color: checked
                                  ? 'var(--text-primary)'
                                  : 'var(--text-secondary)',
                                cursor: 'pointer',
                              }}
                            >
                              {toArabicNum(size)}
                            </button>
                          )
                        })}
                      </div>
                    </SettingGroup>

                    <SettingGroup label="إعدادات أخرى">
                      <Link
                        to="/student/srs"
                        onClick={() => setOpen(false)}
                        className="inline-flex items-center gap-2 font-['Tajawal']"
                        style={{
                          padding: '10px 14px',
                          borderRadius: 12,
                          background: 'var(--surface, rgba(255,255,255,0.04))',
                          border: '1px solid var(--border, rgba(255,255,255,0.08))',
                          color: 'var(--text-primary)',
                          fontSize: 13,
                          textDecoration: 'none',
                        }}
                      >
                        إعدادات المراجعة اليومية
                        <ExternalLink size={13} style={{ opacity: 0.7 }} />
                      </Link>
                    </SettingGroup>
                  </>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

function SettingGroup({ icon, label, children }) {
  return (
    <section className="space-y-2">
      <div
        className="flex items-center gap-1.5 font-['Tajawal'] font-bold"
        style={{ color: 'var(--text-secondary)', fontSize: 12 }}
      >
        {icon && <span style={{ color: 'var(--text-tertiary)' }}>{icon}</span>}
        <span>{label}</span>
      </div>
      <div>{children}</div>
    </section>
  )
}

function SegmentedPills({ options, value, onChange }) {
  return (
    <div className="flex items-center gap-1.5" role="radiogroup">
      {options.map((opt) => {
        const Icon = opt.icon
        const checked = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => onChange(opt.value)}
            className="inline-flex items-center gap-1.5 font-['Tajawal'] font-bold"
            style={{
              padding: '6px 12px',
              borderRadius: 9999,
              background: checked
                ? 'rgba(56,189,248,0.18)'
                : 'var(--surface, rgba(255,255,255,0.04))',
              border: checked
                ? '1px solid rgba(56,189,248,0.45)'
                : '1px solid var(--border)',
              color: checked ? 'rgb(56,189,248)' : 'var(--text-secondary)',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {Icon && <Icon size={13} />}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

function ToggleSwitch({ checked, onChange, ariaLabel }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      style={{
        position: 'relative',
        width: 48,
        height: 28,
        borderRadius: 9999,
        border: '1px solid var(--border)',
        background: checked
          ? 'linear-gradient(135deg, rgba(34,197,94,0.32), rgba(16,185,129,0.32))'
          : 'rgba(255,255,255,0.06)',
        cursor: 'pointer',
        transition: 'background 200ms ease',
        padding: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          insetInlineStart: checked ? 23 : 3, // slides on the start edge in RTL
          width: 20,
          height: 20,
          borderRadius: 9999,
          background: 'white',
          transition: 'inset-inline-start 200ms cubic-bezier(0.4,0,0.2,1)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.25)',
        }}
      />
    </button>
  )
}
