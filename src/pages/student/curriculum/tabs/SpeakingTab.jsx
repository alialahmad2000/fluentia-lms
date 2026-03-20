import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, ChevronDown, Clock, MessageCircle, Sparkles, Volume2 } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'

// ─── Main Component ──────────────────────────────────
export default function SpeakingTab({ unitId }) {
  const { data: topics, isLoading } = useQuery({
    queryKey: ['unit-speaking', unitId],
    queryFn: async () => {
      const { data } = await supabase
        .from('curriculum_speaking')
        .select('*')
        .eq('unit_id', unitId)
        .order('sort_order')
      return data || []
    },
    enabled: !!unitId,
  })

  if (isLoading) return <SpeakingSkeleton />

  if (!topics?.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center">
          <Mic size={28} className="text-cyan-400" />
        </div>
        <p className="text-[var(--text-muted)] font-['Tajawal']">لا توجد مهمة محادثة لهذه الوحدة بعد</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {topics.map((topic, idx) => (
        <SpeakingTopic key={topic.id} topic={topic} number={idx + 1} total={topics.length} />
      ))}
    </div>
  )
}

// ─── Speaking Topic ──────────────────────────────────
function SpeakingTopic({ topic, number, total }) {
  const [tipsOpen, setTipsOpen] = useState(false)
  const [phrasesOpen, setPhrasesOpen] = useState(false)
  const [showToast, setShowToast] = useState(false)

  const handleRecordClick = () => {
    setShowToast(true)
    setTimeout(() => setShowToast(false), 2500)
  }

  const formatDuration = (seconds) => {
    if (seconds < 60) return `${seconds} ثانية`
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return s > 0 ? `${m} دقيقة و ${s} ثانية` : `${m} ${m > 2 && m < 11 ? 'دقائق' : 'دقيقة'}`
  }

  const topicTypeAr = {
    personal: 'شخصي',
    descriptive: 'وصفي',
    narrative: 'سردي',
    opinion: 'رأي',
    discussion: 'نقاش',
  }

  return (
    <div className="space-y-4">
      {total > 1 && (
        <p className="text-xs text-[var(--text-muted)] font-['Tajawal']">
          الموضوع {number} من {total}
        </p>
      )}

      {/* Topic prompt */}
      <div
        className="rounded-xl p-5 space-y-3"
        style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
            <MessageCircle size={18} className="text-cyan-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-[var(--text-primary)] font-['Tajawal']">موضوع المحادثة</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 font-['Tajawal']">
                {topicTypeAr[topic.topic_type] || topic.topic_type}
              </span>
            </div>
            {/* English prompt */}
            <p className="text-sm text-[var(--text-secondary)] font-['Inter'] mt-2 leading-relaxed" dir="ltr">
              {topic.prompt_en}
            </p>
            {/* Arabic prompt */}
            {topic.prompt_ar && (
              <p className="text-sm text-[var(--text-muted)] font-['Tajawal'] mt-1.5 leading-relaxed">
                {topic.prompt_ar}
              </p>
            )}
          </div>
        </div>

        {/* Duration guide */}
        <div className="flex items-center gap-2">
          <Clock size={13} className="text-[var(--text-muted)]" />
          <span className="text-xs text-[var(--text-muted)] font-['Tajawal']">
            المدة المطلوبة: {formatDuration(topic.min_duration_seconds)} – {formatDuration(topic.max_duration_seconds)}
          </span>
        </div>

        {/* Evaluation criteria */}
        {topic.evaluation_criteria && (
          <div className="flex flex-wrap gap-2 pt-1">
            {Object.entries(topic.evaluation_criteria).map(([criterion, weight]) => (
              <span
                key={criterion}
                className="px-2.5 py-1 rounded-lg text-[10px] font-semibold font-['Inter'] capitalize"
                style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)' }}
              >
                {criterion} {weight}%
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Preparation notes (collapsible) */}
      {topic.preparation_notes?.length > 0 && (
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
        >
          <button
            onClick={() => setTipsOpen(!tipsOpen)}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
          >
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-amber-400" />
              <span className="text-sm font-bold text-[var(--text-secondary)] font-['Tajawal']">نصائح للتحضير</span>
            </div>
            <ChevronDown
              size={14}
              className={`text-[var(--text-muted)] transition-transform duration-200 ${tipsOpen ? 'rotate-180' : ''}`}
            />
          </button>
          <AnimatePresence>
            {tipsOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <ul className="px-4 pb-3 space-y-2">
                  {topic.preparation_notes.map((note, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-[var(--text-secondary)] font-['Tajawal']">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                      {note}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Useful phrases (collapsible) */}
      {topic.useful_phrases?.length > 0 && (
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
        >
          <button
            onClick={() => setPhrasesOpen(!phrasesOpen)}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
          >
            <div className="flex items-center gap-2">
              <Volume2 size={14} className="text-sky-400" />
              <span className="text-sm font-bold text-[var(--text-secondary)] font-['Tajawal']">عبارات مفيدة</span>
            </div>
            <ChevronDown
              size={14}
              className={`text-[var(--text-muted)] transition-transform duration-200 ${phrasesOpen ? 'rotate-180' : ''}`}
            />
          </button>
          <AnimatePresence>
            {phrasesOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-3 flex flex-wrap gap-2">
                  {topic.useful_phrases.map((phrase, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold font-['Inter'] bg-sky-500/10 text-sky-400"
                      dir="ltr"
                    >
                      {phrase}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Record button (placeholder) */}
      <div className="flex flex-col items-center gap-4 py-6">
        <div className="relative">
          {/* Pulsing ring */}
          <div className="absolute inset-0 rounded-full bg-cyan-500/10 animate-ping" style={{ animationDuration: '2s' }} />
          <button
            onClick={handleRecordClick}
            className="relative w-20 h-20 rounded-full bg-cyan-500/15 text-cyan-400 flex items-center justify-center hover:bg-cyan-500/25 transition-colors border border-cyan-500/20"
          >
            <Mic size={32} />
          </button>
        </div>
        <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 font-['Tajawal']">
          قريباً
        </span>
        <p className="text-xs text-[var(--text-muted)] font-['Tajawal'] text-center max-w-xs">
          اضغط للتسجيل عندما تكون جاهزاً
        </p>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-sm font-bold font-['Tajawal'] shadow-lg"
            style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
          >
            التسجيل سيكون متاحاً قريباً إن شاء الله
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Skeleton ────────────────────────────────────────
function SpeakingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-32 rounded-xl bg-[var(--surface-raised)] animate-pulse" />
      <div className="h-20 rounded-xl bg-[var(--surface-raised)] animate-pulse" />
      <div className="flex flex-col items-center gap-3 py-6">
        <div className="w-20 h-20 rounded-full bg-[var(--surface-raised)] animate-pulse" />
        <div className="h-4 w-16 rounded bg-[var(--surface-raised)] animate-pulse" />
      </div>
    </div>
  )
}
