import { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, ChevronDown, ClipboardCheck, GraduationCap, Clock, Save, Loader2, CheckCircle, User, FileText } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { notifyUser } from '../../utils/notify'
import AudioPlayer from '../AudioPlayer'

const TOPIC_TYPE_LABELS = {
  personal: 'شخصي',
  descriptive: 'وصفي',
  narrative: 'سردي',
  opinion: 'رأي',
  discussion: 'نقاش',
}

const GRADE_OPTIONS = ['A+', 'A', 'B+', 'B', 'C', 'D', 'F']

export default function InteractiveSpeakingTab({ unitId, students = [], highlightStudent }) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
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
    placeholderData: (prev) => prev,
  })

  // Fetch ALL recordings for this unit (trainer/admin can see all via RLS)
  // Generate signed URLs in parallel for fast loading
  const { data: recordings, isLoading: loadingRecordings } = useQuery({
    queryKey: ['speaking-recordings-all', unitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('speaking_recordings')
        .select('*')
        .eq('unit_id', unitId)
        .order('created_at', { ascending: false })
      if (error) throw error
      if (!data?.length) return []

      // Generate signed URLs in parallel
      const withUrls = await Promise.all(
        data.map(async (rec) => {
          if (rec.audio_url && !rec.audio_url.includes('expired')) return rec
          if (!rec.audio_path) return rec
          try {
            const { data: urlData } = await supabase.storage
              .from('voice-notes')
              .createSignedUrl(rec.audio_path, 3600)
            return { ...rec, audio_url: urlData?.signedUrl || rec.audio_url }
          } catch {
            return rec
          }
        })
      )
      return withUrls
    },
    enabled: !!unitId,
    staleTime: 1000 * 60 * 10,
    placeholderData: (prev) => prev,
  })

  // Group recordings: latest per student per question_index
  const recordingsByQuestion = useMemo(() => {
    const map = {}
    recordings?.forEach(rec => {
      const key = rec.question_index ?? 0
      if (!map[key]) map[key] = {}
      // Keep only latest per student
      if (!map[key][rec.student_id]) {
        map[key][rec.student_id] = rec
      }
    })
    return map
  }, [recordings])

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
  const questionRecordings = recordingsByQuestion[activeTopic] || {}
  const recordedStudentIds = new Set(Object.keys(questionRecordings))
  const recordedCount = recordedStudentIds.size
  const totalStudents = students.length

  return (
    <div className="space-y-5">
      {speakingTopics.length > 1 && (
        <div className="flex gap-2 flex-wrap">
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
          {topic.evaluation_criteria && (
            <ExpandableSection title="معايير التقييم">
              <div className="space-y-2">
                {(Array.isArray(topic.evaluation_criteria)
                  ? topic.evaluation_criteria
                  : Object.entries(topic.evaluation_criteria).map(([k, v]) => ({ name: k, weight: v }))
                ).map((c, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'var(--surface-base)' }}>
                    <span className="text-xs text-[var(--text-primary)] font-['Inter'] capitalize" dir="ltr">{c.name || c.criterion}</span>
                    {c.weight && <span className="text-[10px] text-[var(--text-muted)] font-['Tajawal']">{c.weight}%</span>}
                  </div>
                ))}
              </div>
            </ExpandableSection>
          )}

          {/* Student recordings section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Mic size={16} className="text-sky-400" />
              <span className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal']">تسجيلات الطلاب</span>
              {totalStudents > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-400">
                  {recordedCount}/{totalStudents} سجّلوا
                </span>
              )}
            </div>

            {loadingRecordings ? (
              <div className="space-y-3">
                {[1, 2].map(i => <div key={i} className="h-24 rounded-xl bg-[var(--surface-raised)] animate-pulse" />)}
              </div>
            ) : recordedCount === 0 ? (
              <div className="rounded-xl p-6 flex flex-col items-center justify-center gap-3 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <Mic size={24} className="text-[var(--text-muted)]" />
                <p className="text-sm text-[var(--text-muted)] font-['Tajawal']">
                  لم يسجل أي طالب بعد
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Students who recorded */}
                {students.filter(s => recordedStudentIds.has(s.user_id)).map(student => (
                  <StudentRecordingCard
                    key={student.user_id}
                    student={student}
                    recording={questionRecordings[student.user_id]}
                    trainerId={user?.id}
                    onFeedbackSaved={() => queryClient.invalidateQueries({ queryKey: ['speaking-recordings-all', unitId] })}
                    autoOpen={student.user_id === highlightStudent}
                  />
                ))}

                {/* If students prop is empty but we have recordings, show by student_id */}
                {students.length === 0 && Object.values(questionRecordings).map(rec => (
                  <StudentRecordingCard
                    key={rec.id}
                    student={null}
                    recording={rec}
                    trainerId={user?.id}
                    onFeedbackSaved={() => queryClient.invalidateQueries({ queryKey: ['speaking-recordings-all', unitId] })}
                  />
                ))}
              </div>
            )}

            {/* Students who haven't recorded */}
            {totalStudents > 0 && students.filter(s => !recordedStudentIds.has(s.user_id)).length > 0 && (
              <ExpandableSection title={`لم يسجلوا بعد (${totalStudents - recordedCount})`}>
                <div className="space-y-2">
                  {students.filter(s => !recordedStudentIds.has(s.user_id)).map(student => (
                    <div key={student.user_id} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--surface-base)' }}>
                      <Clock size={13} className="text-[var(--text-muted)]" />
                      <span className="text-xs text-[var(--text-muted)] font-['Tajawal']">
                        {student.full_name || 'طالب'}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] mr-auto font-['Tajawal']">لم تسجل بعد</span>
                    </div>
                  ))}
                </div>
              </ExpandableSection>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ─── Student Recording Card ──────────────────────
function StudentRecordingCard({ student, recording, trainerId, onFeedbackSaved, autoOpen }) {
  const cardRef = useRef(null)
  const [showTranscript, setShowTranscript] = useState(false)
  const [showRichFeedback, setShowRichFeedback] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(autoOpen || false)

  // Auto-scroll when deep-linked
  useEffect(() => {
    if (autoOpen && cardRef.current) {
      setTimeout(() => cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)
    }
  }, [autoOpen])
  const [grade, setGrade] = useState(recording.trainer_grade || '')
  const [feedback, setFeedback] = useState(recording.trainer_feedback || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const aiEval = recording.ai_evaluation
  const studentName = student?.full_name || student?.profiles?.full_name || student?.profiles?.display_name || 'طالب'
  const hasRichFeedback = aiEval && (aiEval.corrected_transcript || aiEval.errors?.length || aiEval.better_expressions?.length || aiEval.fluency_tips?.length || aiEval.model_answer)

  const saveTrainerFeedback = async () => {
    if (!grade) return
    setSaving(true)
    setSaved(false)

    const { data, error } = await supabase
      .from('speaking_recordings')
      .update({
        trainer_reviewed: true,
        trainer_grade: grade,
        trainer_feedback: feedback || null,
        trainer_reviewed_at: new Date().toISOString(),
        trainer_id: trainerId,
      })
      .eq('id', recording.id)
      .select()

    if (error) {
      console.error('Failed to save trainer feedback:', error)
      setSaving(false)
      return
    }

    // Notify student
    if (data?.[0]) {
      await notifyUser({
        userId: recording.student_id,
        title: 'تمت مراجعة تسجيلك',
        body: `قيّم المعلم نشاط التحدث — التقدير: ${grade}`,
        type: 'speaking_reviewed',
        data: { recording_id: recording.id, unit_id: recording.unit_id, grade },
      })
    }

    setSaving(false)
    setSaved(true)
    onFeedbackSaved?.()
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div
      ref={cardRef}
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--surface-raised)', border: autoOpen ? '1px solid rgba(56,189,248,0.4)' : '1px solid var(--border-subtle)' }}
    >
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-sky-500/10 flex items-center justify-center flex-shrink-0">
          <User size={14} className="text-sky-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal'] truncate">{studentName}</p>
          <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
            {recording.audio_duration_seconds && (
              <span className="font-['Tajawal']">{Math.floor(recording.audio_duration_seconds / 60)}:{(recording.audio_duration_seconds % 60).toString().padStart(2, '0')}</span>
            )}
            {recording.created_at && (
              <span className="font-['Tajawal']">
                {new Date(recording.created_at).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' })}
              </span>
            )}
            {recording.trainer_reviewed && (
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold font-['Tajawal']">تمت المراجعة</span>
            )}
          </div>
        </div>
        {/* AI overall score badge */}
        {aiEval?.overall_score != null && (
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-[var(--text-muted)] font-['Tajawal']">AI</span>
            <span
              className="text-sm font-bold tabular-nums"
              style={{ color: aiEval.overall_score >= 8 ? '#22c55e' : aiEval.overall_score >= 6 ? '#38bdf8' : '#f59e0b' }}
            >
              {aiEval.overall_score}/10
            </span>
          </div>
        )}
        {/* Trainer grade badge */}
        {recording.trainer_grade && (
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-[var(--text-muted)] font-['Tajawal']">التقدير</span>
            <span className="text-sm font-bold text-emerald-400">{recording.trainer_grade}</span>
          </div>
        )}
      </div>

      {/* Audio player */}
      <div className="px-4 pb-3">
        <AudioPlayer
          src={recording.audio_url}
          duration={recording.audio_duration_seconds}
          compact
        />
      </div>

      {/* AI Evaluation details */}
      {aiEval && (
        <div className="px-4 pb-3">
          <div className="rounded-lg p-3 space-y-3" style={{ background: 'rgba(56,189,248,0.04)', border: '1px solid rgba(56,189,248,0.08)' }}>
            <div className="flex items-center gap-1.5">
              <ClipboardCheck size={12} className="text-sky-400" />
              <span className="text-[10px] font-bold text-sky-400 font-['Tajawal']">التقييم</span>
            </div>
            {/* Score bars */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {[
                { key: 'grammar_score', label: 'القواعد' },
                { key: 'vocabulary_score', label: 'المفردات' },
                { key: 'fluency_score', label: 'الطلاقة' },
                { key: 'confidence_score', label: 'الثقة' },
              ].filter(s => aiEval[s.key] != null).map(s => (
                <div key={s.key} className="flex items-center gap-2">
                  <span className="text-[10px] text-[var(--text-muted)] font-['Tajawal'] w-12 flex-shrink-0">{s.label}</span>
                  <div className="flex-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(aiEval[s.key] / 10) * 100}%`,
                        background: aiEval[s.key] >= 8 ? '#22c55e' : aiEval[s.key] >= 6 ? '#38bdf8' : '#f59e0b',
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-bold tabular-nums text-[var(--text-primary)]">{aiEval[s.key]}</span>
                </div>
              ))}
            </div>

            {/* Strengths */}
            {aiEval.strengths && (
              <p className="text-[11px] text-emerald-400 font-['Tajawal'] leading-relaxed">{aiEval.strengths}</p>
            )}

            {/* Feedback summary */}
            {aiEval.feedback_ar && (
              <p className="text-[10px] text-[var(--text-secondary)] font-['Tajawal'] leading-relaxed">{aiEval.feedback_ar}</p>
            )}

            {/* Rich feedback toggle */}
            {hasRichFeedback && (
              <>
                <button
                  onClick={() => setShowRichFeedback(!showRichFeedback)}
                  className="flex items-center gap-1.5 text-[10px] font-bold text-sky-400 hover:text-sky-300 transition-colors font-['Tajawal']"
                >
                  {showRichFeedback ? 'إخفاء التفاصيل' : 'عرض التفاصيل الكاملة'}
                  <ChevronDown size={10} className={`transition-transform duration-200 ${showRichFeedback ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {showRichFeedback && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden space-y-3"
                    >
                      {/* Corrected transcript */}
                      {aiEval.corrected_transcript && (
                        <div className="rounded-lg p-2.5" style={{ background: 'var(--surface-base)' }}>
                          <p className="text-[10px] font-bold text-emerald-400 font-['Tajawal'] mb-1">النص المصحح</p>
                          <p className="text-xs text-[var(--text-secondary)] font-['Inter'] leading-relaxed" dir="ltr">{aiEval.corrected_transcript}</p>
                        </div>
                      )}

                      {/* Errors */}
                      {aiEval.errors?.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-bold text-red-400 font-['Tajawal']">الأخطاء والتصحيحات</p>
                          {aiEval.errors.map((err, i) => (
                            <div key={i} className="rounded-lg p-2.5 space-y-1" style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.08)' }}>
                              <div className="flex items-start gap-2 text-xs font-['Inter']" dir="ltr">
                                <span className="line-through text-red-400/70">{err.spoken || err.original}</span>
                                <span className="text-emerald-400">{err.corrected || err.correction}</span>
                              </div>
                              {(err.rule || err.explanation_ar) && (
                                <p className="text-[10px] text-[var(--text-muted)] font-['Tajawal']">{err.rule || err.explanation_ar}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Better expressions */}
                      {aiEval.better_expressions?.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-bold text-violet-400 font-['Tajawal']">تعبيرات أفضل</p>
                          {aiEval.better_expressions.map((expr, i) => (
                            <div key={i} className="rounded-lg p-2.5" style={{ background: 'rgba(139,92,246,0.04)', border: '1px solid rgba(139,92,246,0.08)' }}>
                              <div className="flex items-center gap-2 text-xs font-['Inter']" dir="ltr">
                                <span className="text-[var(--text-muted)]">{expr.basic}</span>
                                <span className="text-violet-400">→</span>
                                <span className="text-violet-300 font-medium">{expr.natural}</span>
                              </div>
                              {expr.context && <p className="text-[10px] text-[var(--text-muted)] font-['Tajawal'] mt-1">{expr.context}</p>}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Fluency tips */}
                      {aiEval.fluency_tips?.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-amber-400 font-['Tajawal']">نصائح الطلاقة</p>
                          {aiEval.fluency_tips.map((tip, i) => (
                            <div key={i} className="flex items-start gap-1.5 text-[11px] text-[var(--text-secondary)] font-['Tajawal']">
                              <span className="text-amber-400 mt-0.5">•</span>
                              <span>{tip}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Model answer */}
                      {aiEval.model_answer && (
                        <div className="rounded-lg p-2.5" style={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.1)' }}>
                          <p className="text-[10px] font-bold text-sky-400 font-['Tajawal'] mb-1">الإجابة النموذجية</p>
                          <p className="text-xs text-[var(--text-secondary)] font-['Inter'] leading-relaxed" dir="ltr">{aiEval.model_answer}</p>
                        </div>
                      )}

                      {/* Improvement tip */}
                      {aiEval.improvement_tip && (
                        <div className="rounded-lg p-2.5" style={{ background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.08)' }}>
                          <p className="text-[10px] font-bold text-emerald-400 font-['Tajawal'] mb-1">الخطوة التالية</p>
                          <p className="text-[11px] text-[var(--text-secondary)] font-['Tajawal']">{aiEval.improvement_tip}</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </div>
        </div>
      )}

      {/* Transcript toggle */}
      {aiEval?.transcript && (
        <div className="px-4 pb-3">
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors font-['Tajawal']"
          >
            <FileText size={12} />
            {showTranscript ? 'إخفاء النص' : 'عرض النص المكتوب'}
            <ChevronDown size={10} className={`transition-transform duration-200 ${showTranscript ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {showTranscript && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <p className="text-xs text-[var(--text-secondary)] font-['Inter'] leading-relaxed mt-2 p-2 rounded-lg" dir="ltr" style={{ background: 'var(--surface-base)' }}>
                  {aiEval.transcript}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Trainer feedback form */}
      <div className="px-4 pb-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <button
          onClick={() => setFeedbackOpen(!feedbackOpen)}
          className="w-full flex items-center justify-between py-2.5"
        >
          <div className="flex items-center gap-1.5">
            <GraduationCap size={13} className="text-emerald-400" />
            <span className="text-xs font-bold text-emerald-400 font-['Tajawal']">تقييم المعلم</span>
          </div>
          <ChevronDown size={13} className={`text-[var(--text-muted)] transition-transform duration-200 ${feedbackOpen ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {feedbackOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-3 pt-1">
                {/* Grade */}
                <div>
                  <label className="text-[10px] text-[var(--text-muted)] font-['Tajawal'] mb-1 block">التقدير</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {GRADE_OPTIONS.map(g => (
                      <button
                        key={g}
                        onClick={() => setGrade(g)}
                        className={`px-3 h-8 rounded-lg text-xs font-bold border transition-colors ${
                          grade === g
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            : 'bg-[var(--surface-base)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Feedback text */}
                <div>
                  <label className="text-[10px] text-[var(--text-muted)] font-['Tajawal'] mb-1 block">ملاحظة (اختياري)</label>
                  <textarea
                    value={feedback}
                    onChange={e => setFeedback(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg px-3 py-2 text-xs font-['Tajawal'] resize-none outline-none"
                    style={{ background: 'var(--surface-base)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                    placeholder="اكتب ملاحظتك هنا..."
                  />
                </div>

                {/* Save button */}
                <button
                  onClick={saveTrainerFeedback}
                  disabled={!grade || saving}
                  className="flex items-center gap-1.5 px-4 h-9 rounded-lg text-xs font-bold font-['Tajawal'] transition-colors disabled:opacity-40 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25"
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : saved ? <CheckCircle size={13} /> : <Save size={13} />}
                  {saving ? 'جاري الحفظ...' : saved ? 'تم الحفظ' : 'حفظ التقييم'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─── Expandable Section ──────────────────────────
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
