import { useState, lazy, Suspense } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, CheckCircle2, Circle, BookOpen, Headphones, MessageSquare, SpellCheck, BrainCircuit, ChevronDown, ChevronUp, AlertCircle, Sparkles, ArrowRight, Loader2 } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { invokeWithRetry } from '../../lib/invokeWithRetry'
import SubTabs from '../../components/common/SubTabs'

// Lazy-load sub-tab content
const StudentVoiceJournal = lazy(() => import('./StudentVoiceJournal'))
const StudentPronunciation = lazy(() => import('./StudentPronunciation'))
const StudentConversation = lazy(() => import('./StudentConversation'))
const StudentSpelling = lazy(() => import('./StudentSpelling'))

const TABS = [
  { key: 'topics', label: 'المحادثة', icon: Mic },
  { key: 'journal', label: 'يوميات صوتية', icon: BookOpen },
  { key: 'pronunciation', label: 'مدرب النطق', icon: Headphones },
  { key: 'conversation', label: 'محاكي المحادثات', icon: MessageSquare },
  { key: 'spelling', label: 'مدرب الإملاء', icon: SpellCheck },
]

const DIFFICULTY_COLORS = {
  easy: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  medium: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  hard: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
}
const DIFFICULTY_LABELS = { easy: 'سهل', medium: 'متوسط', hard: 'صعب' }

const TabFallback = () => <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-20 w-full" />)}</div>

export default function StudentSpeaking() {
  const [activeTab, setActiveTab] = useState('topics')

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-page-title flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <Mic size={20} className="text-violet-400" />
          </div>
          معمل التحدث
        </h1>
        <p className="text-muted text-sm mt-1">تدرب على مهارات التحدث والاستماع والنطق</p>
      </motion.div>

      <SubTabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      <Suspense fallback={<TabFallback />}>
        {activeTab === 'topics' && <SpeakingTopics />}
        {activeTab === 'journal' && <StudentVoiceJournal />}
        {activeTab === 'pronunciation' && <StudentPronunciation />}
        {activeTab === 'conversation' && <StudentConversation />}
        {activeTab === 'spelling' && <StudentSpelling />}
      </Suspense>
    </div>
  )
}

/* ── Score Gauge ── */
function ScoreGauge({ label, value, max = 100, color = 'var(--accent-primary)' }) {
  const pct = Math.min(Math.round((value / max) * 100), 100)
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-16 h-16">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--surface-raised)" strokeWidth="3" />
          <circle
            cx="18" cy="18" r="15.5" fill="none" stroke={color} strokeWidth="3"
            strokeDasharray={`${pct} ${100 - pct}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.6s ease' }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ color }}>{value}</span>
      </div>
      <span className="text-[11px] text-muted text-center leading-tight">{label}</span>
    </div>
  )
}

/* ── Analysis Results Card ── */
function SpeakingAnalysisCard({ result }) {
  const [showCorrections, setShowCorrections] = useState(true)
  if (!result) return null
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="fl-card-static p-5 mt-4 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-amber-400" />
        <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>التحليل المفصّل</h4>
        {result.cefr_assessment && (
          <span className="mr-auto text-xs font-bold px-2 py-0.5 rounded-lg bg-violet-500/15 text-violet-400 border border-violet-500/20">
            CEFR: {result.cefr_assessment}
          </span>
        )}
      </div>

      {/* Score Gauges */}
      <div className="flex justify-center gap-6 flex-wrap">
        <ScoreGauge label="الطلاقة" value={result.fluency_score ?? 0} color="#38bdf8" />
        <ScoreGauge label="دقة القواعد" value={result.grammar_accuracy ?? 0} color="#34d399" />
        <ScoreGauge label="ثراء المفردات" value={result.vocabulary_richness ?? 0} color="#a78bfa" />
      </div>

      {/* Overall Feedback */}
      {(result.overall_feedback_ar || result.overall_feedback_en) && (
        <div className="rounded-xl p-3" style={{ background: 'var(--surface-raised)' }}>
          {result.overall_feedback_ar && <p className="text-sm leading-relaxed mb-1" style={{ color: 'var(--text-primary)' }}>{result.overall_feedback_ar}</p>}
          {result.overall_feedback_en && <p className="text-xs text-muted leading-relaxed" dir="ltr">{result.overall_feedback_en}</p>}
        </div>
      )}

      {/* Corrections */}
      {result.corrections?.length > 0 && (
        <div>
          <button
            onClick={() => setShowCorrections(v => !v)}
            className="flex items-center gap-1.5 text-sm font-medium mb-2 hover:opacity-80 transition-opacity"
            style={{ color: 'var(--text-primary)' }}
          >
            <AlertCircle size={14} className="text-amber-400" />
            التصحيحات ({result.corrections.length})
            {showCorrections ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <AnimatePresence>
            {showCorrections && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-2">
                {result.corrections.map((c, i) => (
                  <div key={i} className="rounded-lg p-3 text-xs space-y-1" style={{ background: 'var(--surface-raised)' }}>
                    <div className="flex items-center gap-2 flex-wrap" dir="ltr">
                      <span className="line-through text-red-400">{c.original}</span>
                      <ArrowRight size={12} className="text-muted" />
                      <span className="text-emerald-400 font-medium">{c.corrected}</span>
                    </div>
                    {c.explanation_ar && <p className="text-muted leading-relaxed">{c.explanation_ar}</p>}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Tips */}
      {result.tips_ar?.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
            <BrainCircuit size={14} className="text-sky-400" />
            نصائح للتحسين
          </p>
          <ul className="space-y-1.5">
            {result.tips_ar.map((tip, i) => (
              <li key={i} className="text-xs text-muted flex gap-2 items-start">
                <span className="text-sky-400 mt-0.5">•</span>
                <span className="leading-relaxed">{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Pronunciation notes */}
      {result.pronunciation_notes && (
        <div className="rounded-xl p-3 text-xs text-muted leading-relaxed" style={{ background: 'var(--surface-raised)' }}>
          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>ملاحظات النطق: </span>
          {result.pronunciation_notes}
        </div>
      )}
    </motion.div>
  )
}

function SpeakingTopics() {
  const { profile, studentData } = useAuthStore()
  const queryClient = useQueryClient()
  const level = studentData?.academic_level || 1

  const { data: topics, isLoading } = useQuery({
    queryKey: ['speaking-topics', level],
    queryFn: async () => {
      const { data } = await supabase
        .from('speaking_topic_banks')
        .select('*')
        .eq('level', level)
        .order('topic_number')
      return data || []
    },
  })

  const { data: progress } = useQuery({
    queryKey: ['speaking-progress', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('student_speaking_progress')
        .select('topic_id, completed, completed_at')
        .eq('student_id', profile?.id)
      const map = {}
      for (const p of data || []) map[p.topic_id] = p
      return map
    },
    enabled: !!profile?.id,
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ topicId, completed }) => {
      if (completed) {
        const { error } = await supabase.from('student_speaking_progress').upsert({
          student_id: profile?.id,
          topic_id: topicId,
          completed: true,
          completed_at: new Date().toISOString(),
        }, { onConflict: 'student_id,topic_id' }).select()
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('student_speaking_progress')
          .update({ completed: false, completed_at: null })
          .eq('student_id', profile?.id)
          .eq('topic_id', topicId)
          .select()
        if (error) throw error
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['speaking-progress'] }),
  })

  // AI analysis state
  const [expandedTopic, setExpandedTopic] = useState(null)
  const [transcripts, setTranscripts] = useState({})
  const [analysisResults, setAnalysisResults] = useState({})

  const analysisMutation = useMutation({
    mutationFn: async ({ topicId, transcript, taskContext }) => {
      const { data, error } = await invokeWithRetry('analyze-speaking', {
        body: { transcript, level, task_context: taskContext },
      }, { timeoutMs: 45000 })
      if (error) throw new Error(error)
      return { topicId, result: data }
    },
    onSuccess: ({ topicId, result }) => {
      setAnalysisResults(prev => ({ ...prev, [topicId]: result }))
    },
  })

  const completedCount = Object.values(progress || {}).filter(p => p.completed).length
  const totalCount = topics?.length || 0
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <div className="space-y-8">
      {/* Progress bar */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="fl-card-static p-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>التقدم</p>
          <p className="text-sm text-sky-400">{completedCount}/{totalCount} ({progressPct}%)</p>
        </div>
        <div className="fl-progress-track" style={{ height: '10px' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="fl-progress-fill"
          />
        </div>
      </motion.div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="skeleton h-20 w-full" />)}</div>
      ) : topics?.length === 0 ? (
        <div className="fl-card-static p-8 text-center">
          <Mic size={32} className="text-muted mx-auto mb-2" />
          <p className="text-muted">لا توجد مواضيع لمستواك حالياً</p>
        </div>
      ) : (
        <div className="space-y-4">
          {topics.map((topic, i) => {
            const isCompleted = progress?.[topic.id]?.completed
            return (
              <motion.div
                key={topic.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`fl-card p-5 ${isCompleted ? 'border-emerald-500/20' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleMutation.mutate({ topicId: topic.id, completed: !isCompleted })}
                    disabled={toggleMutation.isPending}
                    className="mt-0.5 shrink-0"
                  >
                    {isCompleted ? (
                      <CheckCircle2 size={22} className="text-emerald-400" />
                    ) : (
                      <Circle size={22} className="text-muted hover:text-sky-400 transition-colors" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-muted">#{topic.topic_number}</span>
                      <h3 className={`text-sm font-medium ${isCompleted ? 'text-muted line-through' : ''}`} style={!isCompleted ? { color: 'var(--text-primary)' } : undefined}>
                        {topic.title_en}
                      </h3>
                    </div>
                    {topic.title_ar && <p className="text-xs text-muted mb-2">{topic.title_ar}</p>}
                    {topic.prompt_questions?.length > 0 && (
                      <div className="space-y-1 mt-2">
                        {topic.prompt_questions.map((q, qi) => (
                          <p key={qi} className="text-xs text-muted/80 pr-3 border-r border-border-subtle" dir="ltr">{q}</p>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      {topic.category && (
                        <span className="text-xs text-muted px-2 py-0.5 rounded-lg" style={{ background: 'var(--surface-raised)' }}>{topic.category}</span>
                      )}
                      {topic.difficulty && (
                        <span className={`text-xs px-2 py-0.5 rounded-lg border ${DIFFICULTY_COLORS[topic.difficulty] || DIFFICULTY_COLORS.medium}`}>
                          {DIFFICULTY_LABELS[topic.difficulty] || topic.difficulty}
                        </span>
                      )}
                      <button
                        onClick={() => setExpandedTopic(expandedTopic === topic.id ? null : topic.id)}
                        className="mr-auto text-xs flex items-center gap-1 px-2 py-0.5 rounded-lg hover:opacity-80 transition-opacity"
                        style={{ color: 'var(--accent-primary)', background: 'var(--accent-primary-10, rgba(56,189,248,0.1))' }}
                      >
                        <BrainCircuit size={12} />
                        تحليل AI
                        {expandedTopic === topic.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                    </div>

                    {/* AI Analysis Section */}
                    <AnimatePresence>
                      {expandedTopic === topic.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-3 space-y-3">
                            <textarea
                              value={transcripts[topic.id] || ''}
                              onChange={e => setTranscripts(prev => ({ ...prev, [topic.id]: e.target.value }))}
                              placeholder="الصق نص إجابتك هنا للتحليل..."
                              className="w-full rounded-xl p-3 text-sm resize-none border focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                              style={{ background: 'var(--surface-raised)', color: 'var(--text-primary)', borderColor: 'var(--border-subtle)' }}
                              rows={3}
                              dir="ltr"
                            />
                            <button
                              onClick={() => analysisMutation.mutate({
                                topicId: topic.id,
                                transcript: transcripts[topic.id],
                                taskContext: topic.title_en,
                              })}
                              disabled={!transcripts[topic.id]?.trim() || (analysisMutation.isPending && analysisMutation.variables?.topicId === topic.id)}
                              className="fl-btn-sm flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all disabled:opacity-40"
                              style={{ background: 'var(--accent-primary)', color: '#fff' }}
                            >
                              {analysisMutation.isPending && analysisMutation.variables?.topicId === topic.id ? (
                                <>
                                  <Loader2 size={14} className="animate-spin" />
                                  جارٍ التحليل...
                                </>
                              ) : (
                                <>
                                  <Sparkles size={14} />
                                  تحليل التسجيل
                                </>
                              )}
                            </button>
                            {analysisMutation.isError && analysisMutation.variables?.topicId === topic.id && (
                              <p className="text-xs text-red-400 flex items-center gap-1">
                                <AlertCircle size={12} />
                                {analysisMutation.error?.message || 'حدث خطأ أثناء التحليل'}
                              </p>
                            )}
                            <SpeakingAnalysisCard result={analysisResults[topic.id]} />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
