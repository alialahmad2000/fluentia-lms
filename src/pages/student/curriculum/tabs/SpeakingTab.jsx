import { useState, useMemo, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, ChevronDown, Clock, MessageCircle, Sparkles, Volume2, Bot, GraduationCap } from 'lucide-react'
import ShareAchievementCard from '../../../../components/ShareAchievementCard'
import { supabase } from '../../../../lib/supabase'
import { useAuthStore } from '../../../../stores/authStore'
import VoiceRecorder from '../../../../components/VoiceRecorder'

// ─── Main Component ──────────────────────────────────
export default function SpeakingTab({ unitId }) {
  const { profile } = useAuthStore()
  const studentId = profile?.id
  const studentName = profile?.display_name || profile?.full_name
  const queryClient = useQueryClient()

  const { data: topics, isLoading } = useQuery({
    queryKey: ['unit-speaking', unitId],
    placeholderData: (prev) => prev,
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
      const { data, error } = await supabase
        .from('speaking_recordings')
        .select('*')
        .eq('student_id', studentId)
        .eq('unit_id', unitId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[SpeakingTab] Fetch recordings error:', error)
        return []
      }

      // Regenerate signed URLs from audio_path if audio_url is missing or expired
      const withUrls = await Promise.all((data || []).map(async (rec) => {
        if (rec.audio_path && !rec.audio_url) {
          const { data: urlData } = await supabase.storage
            .from('voice-notes')
            .createSignedUrl(rec.audio_path, 60 * 60)
          return { ...rec, audio_url: urlData?.signedUrl || null }
        }
        return rec
      }))

      return withUrls
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
          studentName={studentName}
          existingRecording={latestByQuestion[idx] || null}
          onUploadComplete={handleUploadComplete}
        />
      ))}
    </div>
  )
}

// ─── Speaking Topic ──────────────────────────────────
function SpeakingTopic({ topic, number, total, questionIndex, unitId, studentId, studentName, existingRecording, onUploadComplete }) {
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

      {/* Share achievement card */}
      {aiEval && (
        <ShareAchievementCard
          type="speaking"
          studentName={studentName}
          studentText={existingRecording?.transcript || ''}
          feedback={aiEval}
          scores={{
            ...(aiEval.grammar_score != null && { grammar: aiEval.grammar_score }),
            ...(aiEval.vocabulary_score != null && { vocabulary: aiEval.vocabulary_score }),
            ...(aiEval.fluency_score != null && { fluency: aiEval.fluency_score }),
            ...(aiEval.confidence_score != null && { pronunciation: aiEval.confidence_score }),
          }}
        />
      )}

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
  const [showDetails, setShowDetails] = useState(true)
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
  const errors = evaluation.errors || []
  const betterExpressions = evaluation.better_expressions || []
  const fluencyTips = evaluation.fluency_tips || []
  const modelAnswer = evaluation.model_answer || ''
  const strengthsText = typeof evaluation.strengths === 'string' ? evaluation.strengths : ''
  const improvementTip = evaluation.improvement_tip || ''
  const correctedTranscript = evaluation.corrected_transcript || ''

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{ background: 'rgba(56,189,248,0.04)', border: '1px solid rgba(56,189,248,0.12)' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot size={14} className="text-sky-400" />
          <span className="text-sm font-bold text-sky-400 font-['Tajawal']">تقييم الذكاء الاصطناعي</span>
        </div>
        {overall != null && (
          <span className="text-lg font-bold tabular-nums" style={{ color: overall >= 8 ? '#22c55e' : overall >= 6 ? '#38bdf8' : '#f59e0b' }}>
            {overall}<span className="text-sm opacity-60">/10</span>
          </span>
        )}
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

      {/* Feedback summary */}
      {evaluation.feedback_ar && (
        <p className="text-xs text-[var(--text-secondary)] font-['Tajawal'] leading-relaxed pt-1">
          {evaluation.feedback_ar}
        </p>
      )}

      {/* Toggle for detailed feedback */}
      {(errors.length > 0 || betterExpressions.length > 0 || correctedTranscript || modelAnswer) && (
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-1.5 text-xs font-bold text-sky-400 hover:text-sky-300 font-['Tajawal'] transition-colors"
        >
          <ChevronDown size={14} className={`transition-transform duration-200 ${showDetails ? 'rotate-180' : ''}`} />
          {showDetails ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
        </button>
      )}

      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden space-y-3"
          >
            {/* Strengths */}
            {strengthsText && (
              <div
                className="rounded-lg p-3 space-y-1"
                style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.12)' }}
              >
                <h4 className="text-[11px] font-bold text-emerald-400 font-['Tajawal']">نقاط القوة</h4>
                <p className="text-xs text-[var(--text-secondary)] font-['Tajawal'] leading-relaxed" dir="rtl">
                  {strengthsText}
                </p>
              </div>
            )}

            {/* Corrected transcript */}
            {correctedTranscript && (
              <div className="space-y-1">
                <h4 className="text-[11px] font-bold text-sky-400 font-['Tajawal']">النص المصحح</h4>
                <p
                  className="text-xs text-[var(--text-secondary)] font-['Inter'] leading-[1.8] p-2.5 rounded-lg"
                  dir="ltr"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
                >
                  {correctedTranscript}
                </p>
              </div>
            )}

            {/* Errors */}
            {errors.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-[11px] font-bold text-red-400 font-['Tajawal']">الأخطاء والتصحيحات</h4>
                {errors.map((e, i) => (
                  <div
                    key={i}
                    className="rounded-lg px-3 py-2 space-y-1"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs" dir="ltr">
                      <span className="line-through text-red-400/70 font-['Inter']">{e.spoken || e.original}</span>
                      <span className="text-[var(--text-muted)]">→</span>
                      <span className="text-emerald-400 font-['Inter']">{e.corrected || e.correction}</span>
                    </div>
                    {e.rule && (
                      <p className="text-[11px] text-[var(--text-muted)] font-['Tajawal']" dir="rtl">{e.rule}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Better expressions */}
            {betterExpressions.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-[11px] font-bold text-purple-400 font-['Tajawal']">تعبيرات أفضل</h4>
                {betterExpressions.map((be, i) => (
                  <div
                    key={i}
                    className="rounded-lg px-3 py-2"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <div className="flex items-center gap-2 text-xs" dir="ltr">
                      <span className="text-[var(--text-muted)] font-['Inter']">{be.basic}</span>
                      <span className="text-[var(--text-muted)]">→</span>
                      <span className="text-purple-400 font-bold font-['Inter']">{be.natural}</span>
                    </div>
                    {be.context && (
                      <p className="text-[11px] text-[var(--text-muted)] font-['Tajawal'] mt-1" dir="rtl">{be.context}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Fluency tips */}
            {fluencyTips.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-[11px] font-bold text-amber-400 font-['Tajawal']">نصائح للطلاقة</h4>
                {fluencyTips.map((tip, i) => (
                  <p key={i} className="text-xs text-[var(--text-secondary)] font-['Tajawal'] flex items-start gap-1.5" dir="rtl">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                    {tip}
                  </p>
                ))}
              </div>
            )}

            {/* Model answer */}
            {modelAnswer && (
              <div className="space-y-1">
                <h4 className="text-[11px] font-bold text-sky-400 font-['Tajawal']">إجابة نموذجية</h4>
                <p
                  className="text-xs text-[var(--text-secondary)] font-['Inter'] leading-relaxed italic px-3 py-2 rounded-lg"
                  dir="ltr"
                  style={{ background: 'rgba(56,189,248,0.04)', borderRight: '2px solid rgba(56,189,248,0.3)' }}
                >
                  "{modelAnswer}"
                </p>
              </div>
            )}

            {/* Improvement tip */}
            {improvementTip && (
              <div
                className="rounded-lg p-3 space-y-1"
                style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)' }}
              >
                <h4 className="text-[11px] font-bold text-amber-400 font-['Tajawal']">خطوتك القادمة</h4>
                <p className="text-xs text-[var(--text-secondary)] font-['Tajawal'] leading-relaxed" dir="rtl">
                  {improvementTip}
                </p>
              </div>
            )}
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
