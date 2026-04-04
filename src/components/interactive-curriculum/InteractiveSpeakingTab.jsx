import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, ChevronDown } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const TOPIC_TYPE_LABELS = {
  personal: 'شخصي',
  descriptive: 'وصفي',
  narrative: 'سردي',
  opinion: 'رأي',
  discussion: 'نقاش',
}

export default function InteractiveSpeakingTab({ unitId, groupId, students = [] }) {
  const [activeTopic, setActiveTopic] = useState(0)

  const { data: speakingTopics, isLoading } = useQuery({
    queryKey: ['unit-speaking', unitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curriculum_speaking')
        .select('*')
        .eq('unit_id', unitId)
        .order('sort_order')
      if (error) throw error
      return data || []
    },
    enabled: !!unitId,
  })

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-48 rounded-lg bg-[var(--surface-raised)] animate-pulse" />
        <div className="h-32 rounded-xl bg-[var(--surface-raised)] animate-pulse" />
      </div>
    )
  }

  if (!speakingTopics?.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <Mic size={40} className="text-[var(--text-muted)]" />
        <p className="text-[var(--text-muted)] font-['Tajawal']">لا توجد محادثة لهذه الوحدة بعد</p>
      </div>
    )
  }

  const topic = speakingTopics[activeTopic]

  return (
    <div className="space-y-5">
      {speakingTopics.length > 1 && (
        <div className="flex gap-2">
          {speakingTopics.map((t, i) => (
            <button
              key={t.id}
              onClick={() => setActiveTopic(i)}
              className={`px-4 h-9 rounded-xl text-xs font-bold border transition-colors font-['Tajawal'] flex-shrink-0 ${
                activeTopic === i
                  ? 'bg-sky-500/20 text-sky-400 border-sky-500/40'
                  : 'bg-[var(--surface-raised)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
              }`}
            >
              الموضوع {i + 1}
            </button>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={topic.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {/* Topic info */}
          <div className="rounded-xl p-5 space-y-3" style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center gap-2">
              {topic.topic_type && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-['Tajawal']">
                  {TOPIC_TYPE_LABELS[topic.topic_type] || topic.topic_type}
                </span>
              )}
              {topic.min_duration_seconds && (
                <span className="text-[10px] text-[var(--text-muted)] font-['Tajawal']">
                  {formatDuration(topic.min_duration_seconds)} — {formatDuration(topic.max_duration_seconds)}
                </span>
              )}
            </div>
            <p className="text-sm sm:text-[15px] font-medium text-[var(--text-primary)] font-['Inter'] leading-relaxed" dir="ltr">{topic.prompt_en}</p>
            {topic.prompt_ar && <p className="text-xs text-[var(--text-muted)] font-['Tajawal']">{topic.prompt_ar}</p>}
          </div>

          {/* Evaluation criteria */}
          {topic.evaluation_criteria?.length > 0 && (
            <ExpandableSection title="معايير التقييم">
              <div className="space-y-2">
                {topic.evaluation_criteria.map((c, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'var(--surface-base)' }}>
                    <span className="text-xs text-[var(--text-primary)] font-['Inter']" dir="ltr">{c.name || c.criterion}</span>
                    {c.weight && <span className="text-[10px] text-[var(--text-muted)] font-['Tajawal']">{c.weight}%</span>}
                  </div>
                ))}
              </div>
            </ExpandableSection>
          )}

          {/* Preparation notes */}
          {topic.preparation_notes && (
            <ExpandableSection title="ملاحظات التحضير">
              <p className="text-sm text-[var(--text-secondary)] font-['Inter'] leading-relaxed whitespace-pre-wrap" dir="ltr">
                {typeof topic.preparation_notes === 'string' ? topic.preparation_notes : JSON.stringify(topic.preparation_notes, null, 2)}
              </p>
            </ExpandableSection>
          )}

          {/* Useful phrases */}
          {topic.useful_phrases?.length > 0 && (
            <ExpandableSection title="عبارات مفيدة">
              <div className="space-y-1">
                {topic.useful_phrases.map((p, i) => (
                  <div key={i} className="px-3 py-2 rounded-lg text-sm font-['Inter']" dir="ltr" style={{ background: 'var(--surface-base)' }}>
                    {typeof p === 'string' ? p : p.phrase || p.text || JSON.stringify(p)}
                  </div>
                ))}
              </div>
            </ExpandableSection>
          )}

          {/* Empty state for student answers */}
          <div className="rounded-xl p-6 flex flex-col items-center justify-center gap-3 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Mic size={24} className="text-[var(--text-muted)]" />
            <p className="text-sm text-[var(--text-muted)] font-['Tajawal']">
              لا توجد بيانات متتبعة لهذا التاب — تسجيل المحادثة لم يُفعّل بعد
            </p>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function ExpandableSection({ title, children }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}>
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-[rgba(255,255,255,0.02)]">
        <span className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal']">{title}</span>
        <ChevronDown size={16} className={`text-[var(--text-muted)] transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="px-5 pb-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <div className="pt-3">{children}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function formatDuration(seconds) {
  if (!seconds) return ''
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m > 0 && s > 0) return `${m} دقيقة و ${s} ثانية`
  if (m > 0) return `${m} دقيقة`
  return `${s} ثانية`
}
