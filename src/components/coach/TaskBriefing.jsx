import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Sparkles, User } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const STORAGE_KEY = (taskId) => `briefing_collapsed_${taskId}`

// ─── Skeleton ─────────────────────────────────────────
function BriefingSkeleton() {
  return (
    <div className="rounded-2xl p-5 space-y-3 animate-pulse" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-white/8" />
          <div className="h-4 w-32 rounded-lg bg-white/8" />
        </div>
        <div className="w-5 h-5 rounded bg-white/8" />
      </div>
      <div className="space-y-2 pt-1">
        <div className="h-3 w-full rounded bg-white/6" />
        <div className="h-3 w-5/6 rounded bg-white/6" />
        <div className="h-3 w-4/6 rounded bg-white/6" />
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────
export default function TaskBriefing({ studentId, taskId, taskType }) {
  const [briefing, setBriefing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY(taskId)) === '1' } catch { return false }
  })
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => { isMounted.current = false }
  }, [])

  useEffect(() => {
    if (!studentId || !taskId || !taskType) { setLoading(false); return }

    let cancelled = false
    ;(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('generate-task-briefing', {
          body: { student_id: studentId, task_id: taskId, task_type: taskType },
        })
        if (cancelled || !isMounted.current) return

        if (!error && data?.briefing) {
          setBriefing(data.briefing)
        }
      } catch {
        // Fail silently — student can still do the task
      } finally {
        if (!cancelled && isMounted.current) setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [studentId, taskId, taskType])

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      const next = !prev
      try { localStorage.setItem(STORAGE_KEY(taskId), next ? '1' : '0') } catch {}
      return next
    })
  }

  const handleStart = () => {
    setCollapsed(true)
    try { localStorage.setItem(STORAGE_KEY(taskId), '1') } catch {}
  }

  if (loading) return <BriefingSkeleton />
  if (!briefing) return null

  const generic = briefing.generic_section
  const personal = briefing.personalized_section

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Header — always visible */}
      <button
        onClick={toggleCollapsed}
        className="w-full flex items-center justify-between px-5 py-4 text-right"
        style={{ minHeight: 52 }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(168,85,247,0.12)' }}>
            <Sparkles size={14} style={{ color: '#a855f7' }} />
          </div>
          <span className="text-sm font-bold font-['Tajawal']" style={{ color: 'var(--text-primary)' }}>
            توجيه قبل البدء
          </span>
          {personal?.show && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-['Tajawal']" style={{ background: 'rgba(56,189,248,0.12)', color: '#38bdf8' }}>
              شخصي
            </span>
          )}
        </div>
        <ChevronDown
          size={16}
          className="flex-shrink-0 transition-transform duration-200"
          style={{ color: 'var(--text-muted)', transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
        />
      </button>

      {/* Body */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4">

              {/* Personalized section */}
              {personal?.show && (personal.strengths_note || personal.focus_for_this_task) && (
                <div
                  className="rounded-xl p-3.5 space-y-1.5"
                  style={{ borderRight: '3px solid rgba(56,189,248,0.5)', background: 'rgba(56,189,248,0.04)', paddingRight: '14px' }}
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <User size={12} style={{ color: '#38bdf8' }} />
                    <span className="text-[11px] font-bold font-['Tajawal']" style={{ color: '#38bdf8' }}>بناءً على أدائك السابق</span>
                  </div>
                  {personal.strengths_note && (
                    <p className="text-[13px] font-['Tajawal'] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      ✨ {personal.strengths_note}
                    </p>
                  )}
                  {personal.focus_for_this_task && (
                    <p className="text-[13px] font-['Tajawal'] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      🎯 {personal.focus_for_this_task}
                    </p>
                  )}
                </div>
              )}

              {/* Generic questions */}
              {generic?.questions?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold font-['Tajawal']" style={{ color: 'var(--text-muted)' }}>
                    {generic.title || 'اسأل نفسك قبل ما تبدأ'}
                  </p>
                  <ul className="space-y-2">
                    {generic.questions.map((q, i) => (
                      <li key={i} className="flex items-start gap-2 text-[13px] font-['Tajawal'] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5" style={{ background: 'rgba(168,85,247,0.1)', color: '#a855f7' }}>
                          {i + 1}
                        </span>
                        {q}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Encouragement + start button */}
              <div className="flex items-center justify-between pt-1">
                {personal?.encouragement && (
                  <p className="text-[12px] font-['Tajawal']" style={{ color: 'var(--text-muted)' }}>
                    {personal.encouragement}
                  </p>
                )}
                <button
                  onClick={handleStart}
                  className="mr-auto flex-shrink-0 px-4 h-9 rounded-xl text-xs font-bold font-['Tajawal'] transition-colors"
                  style={{ background: 'rgba(168,85,247,0.15)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.25)' }}
                >
                  ابدأ التاسك ←
                </button>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
