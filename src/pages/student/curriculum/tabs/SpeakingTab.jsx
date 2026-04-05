import { useState, useMemo, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, ChevronDown, Clock, MessageCircle, Sparkles, Volume2, Bot, GraduationCap } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'
import { useAuthStore } from '../../../../stores/authStore'
import VoiceRecorder from '../../../../components/VoiceRecorder'

// ─── Main Component ──────────────────────────────────
export default function SpeakingTab({ unitId }) {
  const { profile } = useAuthStore()
  const studentId = profile?.id
  const queryClient = useQueryClient()

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

  // Fetch existing recordings for this student + unit
  const { data: recordings } = useQuery({
    queryKey: ['speaking-recordings', unitId, studentId],
    queryFn: async () => {
      const { data } = await supabase
        .from('speaking_recordings')
        .select('*')
        .eq('student_id', studentId)
        .eq('unit_id', unitId)
        .order('created_at', { ascending: false })
      return data || []
    },
    enabled: !!unitId && !!studentId,
  })

  // Group recordings: latest per question_index
  const latestByQuestion = useMemo(() => {
    const map = {}
    recordings?.forEach(rec => {
      if (!map[rec.question_index]) map[rec.question_index] = rec
    })
    return map
  }, [recordings])

  // Save progress after upload
  const handleUploadComplete = useCallback(async () => {
    // Refresh recordings
    queryClient.invalidateQueries({ queryKey: ['speaking-recordings', unitId, studentId] })

    // Update curriculum progress
    const progressRow = {
      student_id: studentId,
      unit_id: unitId,
      section_type: 'speaking',
      status: 'completed',
      completed_at: new Date().toISOString(),
    }

    // Try upsert using the unique constraint (student_id, unit_id, section_type)
    const { data: existing } = await supabase
      .from('student_curriculum_progress')
      .select('id')
      .eq('student_id', studentId)
      .eq('unit_id', unitId)
      .eq('section_type', 'speaking')
      .maybeSingle()

    if (existing) {
      await supabase.from('student_curriculum_progress').update(progressRow).eq('id', existing.id)
    } else {
      await supabase.from('student_curriculum_progress').insert(progressRow)
    }
  }, [unitId, studentId, queryClient])

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
        <SpeakingTopic
          key={topic.id}
          topic={topic}
          number={idx + 1}
          total={topics.length}
          questionIndex={idx}
          unitId={unitId}
          studentId={studentId}
          existingRecording={latestByQuestion[idx] || null}
          onUploadComplete={handleUploadComplete}
        />
      ))}
    </div>
  )
}

// ─── Speaking Topic ──────────────────────────────────
function SpeakingTopic({ topic, number, total, questionIndex, unitId, studentId, existingRecording, onUploadComplete }) {
  const [tipsOpen, setTipsOpen] = useState(false)
  const [phrasesOpen, setPhrasesOpen] = useState(false)

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

  const aiEval = existingRecording?.ai_evaluation

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

      {/* AI Evaluation (if available) */}
      {aiEval && <AIEvaluationCard evaluation={aiEval} />}

      {/* Trainer Feedback (if available) */}
      {existingRecording?.trainer_reviewed && (
        <div
          className="rounded-xl p-4 space-y-2"
          style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}
        >
          <div className="flex items-center gap-2">
            <GraduationCap size={14} className="text-emerald-400" />
            <span className="text-sm font-bold text-emerald-400 font-['Tajawal']">ملاحظات المعلم</span>
            {existingRecording.trainer_grade && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400">{existingRecording.trainer_grade}</span>
            )}
          </div>
          {existingRecording.trainer_feedback && (
            <p className="text-xs text-[var(--text-secondary)] font-['Tajawal'] leading-relaxed">{existingRecording.trainer_feedback}</p>
          )}
        </div>
      )}

      {/* Voice Recorder */}
      <div
        className="rounded-xl p-4"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <VoiceRecorder
          studentId={studentId}
          unitId={unitId}
          questionIndex={questionIndex}
          maxDuration={180}
          existingRecording={existingRecording}
          onUploadComplete={(url, id) => onUploadComplete?.()}
        />
      </div>

      {/* Recording timestamp */}
      {existingRecording?.created_at && (
        <p className="text-[10px] text-[var(--text-muted)] font-['Tajawal'] text-center">
          تم التسجيل بتاريخ {new Date(existingRecording.created_at).toLocaleDateString('ar-SA', { day: 'numeric', month: 'long' })}
        </p>
      )}
    </div>
  )
}

// ─── AI Evaluation Card ──────────────────────────────
function AIEvaluationCard({ evaluation }) {
  const CRITERIA_AR = {
    grammar_score: 'القواعد',
    vocabulary_score: 'المفردات',
    fluency_score: 'الطلاقة',
    confidence_score: 'الثقة',
  }

  const scores = Object.entries(CRITERIA_AR)
    .map(([key, label]) => ({ key, label, score: evaluation[key] }))
    .filter(s => s.score != null)

  const overall = evaluation.overall_score

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{ background: 'rgba(56,189,248,0.04)', border: '1px solid rgba(56,189,248,0.12)' }}
    >
      <div className="flex items-center gap-2">
        <Bot size={14} className="text-sky-400" />
        <span className="text-sm font-bold text-sky-400 font-['Tajawal']">تقييم الذكاء الاصطناعي</span>
      </div>

      {/* Score bars */}
      <div className="space-y-2">
        {scores.map(s => (
          <div key={s.key}>
            <div className="flex items-center justify-between text-xs mb-0.5">
              <span className="font-['Tajawal']" style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
              <span className="font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{s.score}/10</span>
            </div>
            <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(s.score / 10) * 100}%`,
                  background: s.score >= 8 ? '#22c55e' : s.score >= 6 ? '#38bdf8' : '#f59e0b',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Overall */}
      {overall != null && (
        <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <span className="text-xs font-bold font-['Tajawal']" style={{ color: 'var(--text-secondary)' }}>الدرجة الكلية</span>
          <span className="text-lg font-bold tabular-nums" style={{ color: overall >= 8 ? '#22c55e' : overall >= 6 ? '#38bdf8' : '#f59e0b' }}>
            {overall}/10
          </span>
        </div>
      )}

      {/* Feedback */}
      {evaluation.feedback_ar && (
        <p className="text-xs text-[var(--text-secondary)] font-['Tajawal'] leading-relaxed pt-1">
          {evaluation.feedback_ar}
        </p>
      )}
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
