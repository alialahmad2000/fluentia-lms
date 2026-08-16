// ═══════════════════════════════════════════════════════════════════════════
// SPEAKING «المحادثة» — the Studio
//
// Redesigned 2026-08-16. The section used to be a STACK of disconnected cards
// (topic card → tips accordion → phrases accordion → conversation panel →
// evaluation → attempts → leaderboard → share), which meant the one thing the
// student is here to do — talk — sat below the fold under two collapsibles they
// had to remember to open, and the brief was printed twice (EN + AR).
//
// Now: ONE continuous stage.
//   ① الإحاطة  — the brief, which COLLAPSES to a single line the moment the
//                conversation starts, so the mic is always on screen.
//   ② المحادثة — the live voiced conversation, the hero, full width.
//   ③ الحصيلة  — score + detailed feedback, one segmented panel instead of
//                eight stacked sub-sections.
// Prep material (tips + phrases + the brief itself) moved INSIDE the stage as
// one «مساعدة» sheet reachable mid-conversation, where it is actually needed.
//
// The classic record-once surface is HIDDEN from here on (owner decision,
// 2026-08-16): speaking IS a conversation with the platform now. Nothing is
// deleted — VoiceRecorder / PracticeMode / AICoachPanel and every existing
// speaking_recordings row stay untouched, and old evaluations still render.
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useMemo, useCallback, useEffect } from 'react'
import { genderizeText, useG, useGenderize } from '@/i18n/gender'
import { useShallow } from 'zustand/react/shallow'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic, ChevronDown, Clock, Sparkles, Loader2, History, GraduationCap,
  Languages, MessagesSquare, LifeBuoy, CheckCircle2, X, Wand2, Quote, Volume2,
} from 'lucide-react'
import AudioPlayer from '../../../../components/AudioPlayer'
import ShareAchievementCard from '../../../../components/ShareAchievementCard'
import ActivityLeaderboard from '../../../../components/ActivityLeaderboard'
import { useActivityLeaderboard } from '../../../../hooks/useActivityLeaderboard'
import { supabase } from '../../../../lib/supabase'
import { useAuthStore } from '../../../../stores/authStore'
import ConversationMode from '../../../../components/curriculum/speaking/ConversationMode'
import { safeCelebrate } from '../../../../lib/celebrations'
import { awardCurriculumXP } from '../../../../utils/curriculumXP'
import { useCurriculumPreview } from '../../../../contexts/CurriculumPreviewContext'
import { toast } from '../../../../components/ui/FluentiaToast'
import './speakingStudio.css'

// ── Arabic helpers ─────────────────────────────────────────────────────────
// Number–noun agreement: 1 singular · 2 dual · 3-10 plural · 11+ singular.
// Arabic counts the singular and the dual WITHOUT the numeral («دقيقتين», never
// «2 دقيقتان»), takes the plural for 3–10 and the singular again from 11 up.
const secPhrase = (n) => (n === 1 ? 'ثانية' : n === 2 ? 'ثانيتين' : n <= 10 ? `${n} ثوانٍ` : `${n} ثانية`)
const minPhrase = (n) => (n === 1 ? 'دقيقة' : n === 2 ? 'دقيقتين' : n <= 10 ? `${n} دقائق` : `${n} دقيقة`)
const formatDuration = (sec) => {
  if (!sec && sec !== 0) return ''
  if (sec < 60) return secPhrase(sec)
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return s > 0 ? `${minPhrase(m)} و${secPhrase(s)}` : minPhrase(m)
}
// One numeral system on the surface — mixing ٣ with 30 in the same line is the
// kind of detail that makes a screen read as unfinished.
const durationRange = (min, max) => {
  if (!min || !max) return null
  return `من ${formatDuration(min)} إلى ${formatDuration(max)}`
}

const TOPIC_TYPE_AR = {
  personal: 'حديث شخصي',
  descriptive: 'وصف',
  narrative: 'سرد',
  opinion: 'رأي',
  discussion: 'نقاش',
  debate: 'مناظرة',
  academic: 'طرح أكاديمي',
  roleplay: 'تمثيل موقف',
}

// The DB stores a real short title only for roleplay rows; for every other type
// `title_ar` is a verbatim copy of the prompt. So: use the title when it is
// genuinely a title, otherwise lead with the task's VERB.
const ACTION_TITLE = {
  descriptive: ['صِف بالتفصيل', 'صِفي بالتفصيل'],
  opinion: ['قل رأيك بثقة', 'قولي رأيكِ بثقة'],
  personal: ['تكلّم عن نفسك', 'تكلّمي عن نفسكِ'],
  discussion: ['ناقِش وأقنِع', 'ناقشي وأقنعي'],
  debate: ['ناقِش وأقنِع', 'ناقشي وأقنعي'],
  academic: ['اطرح تحليلك', 'اطرحي تحليلكِ'],
  narrative: ['احكِ القصة', 'احكي القصة'],
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function SpeakingTab({ unitId }) {
  const { profile, studentData } = useAuthStore(useShallow((s) => ({ profile: s.profile, studentData: s.studentData })))
  const studentId = profile?.id
  const studentName = profile?.full_name || profile?.display_name
  const groupId = studentData?.group_id
  const queryClient = useQueryClient()
  const { readOnly } = useCurriculumPreview() // teacher preview: never persist progress
  const [activeTopic, setActiveTopic] = useState(0)

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

  // Existing recordings — a conversation writes a summary row here too, so this
  // covers BOTH the new conversations and any historical record-once attempt.
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

      // Always mint a FRESH signed URL from audio_path. The stored `audio_url`
      // is itself a signed URL (all 97 live rows are) with a 1-year token, so
      // "only sign when audio_url is missing" quietly becomes "playback breaks
      // a year after the recording" — the April 2026 rows expire April 2027.
      // audio_path is the durable reference; the URL is disposable.
      const withUrls = await Promise.all((data || []).map(async (rec) => {
        if (!rec.audio_path) return rec
        const { data: urlData } = await supabase.storage
          .from('voice-notes')
          .createSignedUrl(rec.audio_path, 60 * 60 * 6)
        return { ...rec, audio_url: urlData?.signedUrl || rec.audio_url || null }
      }))

      return withUrls
    },
    enabled: !!unitId && !!studentId,
  })

  // The unit's cover art opens the stage (see .spk-scene). Cheap, cached, and
  // present for all 154 units.
  const { data: unitCover } = useQuery({
    queryKey: ['unit-cover', unitId],
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from('curriculum_units')
        .select('cover_image_url')
        .eq('id', unitId)
        .maybeSingle()
      return data?.cover_image_url || null
    },
    enabled: !!unitId,
  })

  const latestByQuestion = useMemo(() => {
    const map = {}
    recordings?.forEach((rec) => { if (!map[rec.question_index]) map[rec.question_index] = rec })
    return map
  }, [recordings])

  const attemptsByQuestion = useMemo(() => {
    const map = {}
    recordings?.forEach((rec) => {
      if (!map[rec.question_index]) map[rec.question_index] = []
      map[rec.question_index].push(rec)
    })
    return map
  }, [recordings])

  const handleUploadComplete = useCallback(async () => {
    if (readOnly) return
    try { safeCelebrate('speaking_uploaded') } catch {}
    queryClient.invalidateQueries({ queryKey: ['speaking-recordings', unitId, studentId] })

    if (!studentId || !unitId) return

    const progressRow = {
      student_id: studentId,
      unit_id: unitId,
      section_type: 'speaking',
      status: 'completed',
      completed_at: new Date().toISOString(),
    }

    const { data: existing, error: fetchErr } = await supabase
      .from('student_curriculum_progress')
      .select('id')
      .eq('student_id', studentId)
      .eq('unit_id', unitId)
      .eq('section_type', 'speaking')
      .limit(1)
      .maybeSingle()

    if (fetchErr && fetchErr.code !== 'PGRST116') {
      console.error('[SpeakingTab] fetch progress error:', fetchErr)
    }

    let writeErr
    if (existing) {
      const { error } = await supabase
        .from('student_curriculum_progress')
        .update(progressRow)
        .eq('id', existing.id)
        .select()
      writeErr = error
    } else {
      const { error } = await supabase
        .from('student_curriculum_progress')
        .insert(progressRow)
        .select()
      writeErr = error
    }

    if (writeErr) {
      console.error('[SpeakingTab] progress write failed:', writeErr)
      toast({ type: 'error', title: 'تعذّر حفظ التقدم — يرجى إبلاغ المشرف' })
      return
    }

    queryClient.invalidateQueries({ queryKey: ['unit-progress-comprehensive', studentId, unitId] })
    awardCurriculumXP(studentId, 'speaking', null, unitId)
    // keepOpen: the reward screen + AI feedback IS the payoff here — the unit
    // page's 3s auto-return would yank the student off it before they read it.
    window.dispatchEvent(new CustomEvent('fluentia:activity:complete', {
      detail: { activityKey: 'speaking', keepOpen: true },
    }))
  }, [unitId, studentId, queryClient, readOnly])

  if (isLoading) return <SpeakingSkeleton />

  if (!topics?.length) {
    return (
      <div className="spk">
        <div className="spk-bloom" aria-hidden><span /><span /><span /></div>
        <div className="spk-body-col">
          <div className="spk-stage flex flex-col items-center justify-center text-center gap-4 px-6 py-16">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(34,211,238,0.10)', border: '1px solid rgba(126,227,245,0.22)', boxShadow: '0 10px 30px -14px rgba(34,211,238,0.6)' }}>
              <Mic size={26} style={{ color: '#7ee3f5' }} />
            </div>
            <div className="space-y-1.5">
              <p className="text-[15px] font-bold font-['Tajawal']" style={{ color: '#f4f8ff' }}>ما فيه محادثة لهذه الوحدة بعد</p>
              <p className="text-[12.5px] font-['Tajawal'] leading-[1.9] max-w-[32ch]" style={{ color: 'rgba(238,245,255,0.5)' }}>
                نجهّز لك مهمة محادثة قريباً — كمّل بقية أقسام الوحدة وارجع لها.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const idx = Math.min(activeTopic, topics.length - 1)
  const topic = topics[idx]

  return (
    <div className="spk">
      <div className="spk-bloom" aria-hidden><span /><span /><span /></div>

      <div className="spk-body-col">
        {/* Several tasks in one unit → switch between them instead of stacking
            two full studios on top of each other. (Today every unit has one.) */}
        {topics.length > 1 && (
          <div className="spk-seg" style={{ margin: '0 0 14px' }}>
            {topics.map((t, i) => (
              <button key={t.id} onClick={() => setActiveTopic(i)} data-on={i === idx}>
                المهمة {i + 1}
              </button>
            ))}
          </div>
        )}

        <SpeakingStudio
          key={topic.id}
          topic={topic}
          questionIndex={idx}
          unitId={unitId}
          studentId={studentId}
          studentName={studentName}
          groupId={groupId}
          coverUrl={unitCover}
          existingRecording={latestByQuestion[idx] || null}
          allAttempts={attemptsByQuestion[idx] || []}
          onComplete={handleUploadComplete}
        />
      </div>
    </div>
  )
}

// ── The Studio ─────────────────────────────────────────────────────────────
function SpeakingStudio({ topic, questionIndex, unitId, studentId, studentName, groupId, coverUrl, existingRecording, allAttempts = [], onComplete }) {
  const g = useG()
  const gz = useGenderize()
  const [phase, setPhase] = useState('intro')       // mirrors ConversationMode
  const [briefOpen, setBriefOpen] = useState(true)
  const [showEn, setShowEn] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [helpTab, setHelpTab] = useState('brief')
  const [liveEvaluation, setLiveEvaluation] = useState(null)
  const [realtimeStatus, setRealtimeStatus] = useState(existingRecording?.evaluation_status || null)
  const [attemptsOpen, setAttemptsOpen] = useState(false)
  const { data: leaderboard } = useActivityLeaderboard('speaking', unitId, studentId, groupId)

  // The brief steps aside the moment the conversation is live — the mic must
  // never be below the fold. It stays one tap away in the strip + help sheet.
  useEffect(() => { setBriefOpen(phase === 'intro') }, [phase])

  // Realtime — a late sweeper evaluation lands without a reload.
  useEffect(() => {
    if (!existingRecording?.id) return
    if (existingRecording?.evaluation_status === 'completed') return

    const channel = supabase
      .channel(`speaking_recording:${existingRecording.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'speaking_recordings',
        filter: `id=eq.${existingRecording.id}`,
      }, (payload) => {
        const updated = payload.new
        setRealtimeStatus(updated.evaluation_status)
        if (updated.evaluation_status === 'completed' && updated.ai_evaluation) {
          setLiveEvaluation(updated.ai_evaluation)
          onComplete?.()
          toast({ type: 'success', title: '✨ وصل تقييم محادثتك!' })
        }
        if (updated.evaluation_status === 'failed_manual') setRealtimeStatus('failed_manual')
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [existingRecording?.id, existingRecording?.evaluation_status, onComplete])

  const aiEval = liveEvaluation || existingRecording?.ai_evaluation
  const typeLabel = TOPIC_TYPE_AR[topic.topic_type] || topic.topic_type || 'محادثة'

  // What the student reads first should be THE QUESTION, not a generic verb.
  //  · roleplay rows carry a real short title  → title is the headline, prompt is the body
  //  · short prompts (descriptive/personal)    → the prompt IS the headline, no body
  //  · long prompts (debate/academic)          → action verb headline + prompt body
  const promptAr = gz((topic.prompt_ar || '').trim())
  const rawTitle = (topic.title_ar || '').trim()
  const hasRealTitle = rawTitle && rawTitle !== (topic.prompt_ar || '').trim() && rawTitle.length <= 110
  const action = ACTION_TITLE[topic.topic_type]
  const promptIsHeadline = !hasRealTitle && promptAr.length > 0 && promptAr.length <= 165
  const heading = hasRealTitle
    ? gz(rawTitle)
    : promptIsHeadline ? promptAr
    : action ? g(action[0], action[1]) : typeLabel
  const briefBody = promptIsHeadline ? '' : promptAr

  const notes = Array.isArray(topic.preparation_notes) ? topic.preparation_notes : []
  const phrases = Array.isArray(topic.useful_phrases) ? topic.useful_phrases : []
  const durationText = durationRange(topic.min_duration_seconds, topic.max_duration_seconds)

  const openHelp = useCallback((tab) => { setHelpTab(tab); setHelpOpen(true) }, [])

  return (
    <>
      <div className="spk-stage">
        {/* Already done once — a quiet acknowledgement, not a wall of scores */}
        {existingRecording && phase === 'intro' && (
          <div className="spk-done">
            <span className="spk-done-dot"><CheckCircle2 size={13} /></span>
            <p className="text-[12px] font-bold font-['Tajawal']" style={{ color: 'rgba(238,245,255,0.78)' }}>
              {g('أنجزت هذه المهمة', 'أنجزتِ هذه المهمة')}
              {aiEval?.overall_score != null && (
                <span className="mx-1.5 tabular-nums" style={{ color: '#6ee7b7' }}>· {aiEval.overall_score}/10</span>
              )}
            </p>
            <span className="text-[11px] font-['Tajawal'] mr-auto" style={{ color: 'rgba(238,245,255,0.4)' }}>
              {g('تقدر تعيدها', 'تقدرين تعيدينها')}
            </span>
          </div>
        )}

        {/* ① THE BRIEF */}
        <AnimatePresence initial={false} mode="wait">
          {briefOpen ? (
            <motion.div
              key="brief"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
              style={{ overflow: 'hidden' }}
            >
              {coverUrl && (
                <div className="spk-scene">
                  <img className="spk-scene__img" src={coverUrl} alt="" loading="lazy" />
                  <div className="spk-scene__veil" />
                  <div className="spk-scene__body">
                    <span className="spk-kicker"><i />{typeLabel}<u /></span>
                    <h3 className="spk-title">{heading}</h3>
                  </div>
                </div>
              )}

              <div className="spk-brief">
                {!coverUrl && <><span className="spk-kicker"><i />{typeLabel}<u /></span>
                <h3 className="spk-title">{heading}</h3></>}

                {briefBody && <p className="spk-brieftext">{briefBody}</p>}
                {!promptAr && topic.prompt_en && (
                  <p className="spk-en" dir="ltr">{topic.prompt_en}</p>
                )}

                <AnimatePresence initial={false}>
                  {showEn && promptAr && topic.prompt_en && (
                    <motion.p
                      className="spk-en"
                      dir="ltr"
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginTop: 10 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
                    >
                      {topic.prompt_en}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* facts read as a quiet line; only the two real ACTIONS look
                    like controls — four identical chips flattened that hierarchy
                    and wrapped to three rows on a phone. */}
                <p className="spk-facts">
                  <Clock size={12} />
                  {durationText ? `${durationText}، و3 تبادلات تكفي للإنهاء` : '3 تبادلات تكفي للإنهاء'}
                </p>

                <div className="spk-meta">
                  {(notes.length > 0 || phrases.length > 0) && (
                    <button type="button" className="spk-chip" data-accent="true" onClick={() => openHelp(notes.length ? 'tips' : 'phrases')}>
                      <Sparkles size={12} />{g('محتاج تحضير؟', 'محتاجة تحضير؟')}
                    </button>
                  )}
                  {promptAr && topic.prompt_en && (
                    <button type="button" className="spk-chip" data-on={showEn} onClick={() => setShowEn((v) => !v)}>
                      <Languages size={12} />النص بالإنجليزي
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.button
              key="strip"
              type="button"
              className="spk-strip"
              onClick={() => setBriefOpen(true)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.24 }}
            >
              <span className="spk-strip-label">{typeLabel}</span>
              <span className="spk-strip-text">{heading}</span>
              <ChevronDown size={14} />
            </motion.button>
          )}
        </AnimatePresence>

        {/* ② THE CONVERSATION */}
        {studentId && (
          <ConversationMode
            variant="stage"
            topic={topic}
            studentId={studentId}
            unitId={unitId}
            questionIndex={questionIndex}
            onComplete={onComplete}
            onPhaseChange={setPhase}
            headerExtra={(notes.length > 0 || phrases.length > 0 || promptAr) ? (
              <button
                type="button"
                onClick={() => openHelp(phase === 'intro' ? 'brief' : (notes.length ? 'tips' : 'phrases'))}
                className="flex items-center gap-1.5 text-[11px] font-bold font-['Tajawal'] transition-colors px-3 rounded-xl"
                style={{ minHeight: 40, background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(238,245,255,0.62)' }}
              >
                <LifeBuoy size={13} /> مساعدة
              </button>
            ) : null}
          />
        )}
      </div>

      {/* ③ AFTER — outcome, one band */}
      {(aiEval || existingRecording) && (
        <>
          <div className="spk-band-label"><b /><span>الحصيلة</span><i /></div>

          {/* The student's OWN submission — audio + what they actually said.
              Record-once is retired, but 77 of the 97 live recordings came from
              it: hiding the recorder must never hide their work. */}
          {existingRecording && <PreviousSubmission recording={existingRecording} />}

          {aiEval && <SpeakingEvaluation evaluation={aiEval} />}

          {existingRecording && !aiEval && <PendingEvaluation status={realtimeStatus || existingRecording?.evaluation_status} />}

          {existingRecording?.trainer_reviewed && (
            <div className="spk-panel mt-3" style={{ borderColor: 'rgba(16,185,129,0.18)' }}>
              <div className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <GraduationCap size={14} className="text-emerald-400" />
                  <span className="text-sm font-bold text-emerald-400 font-['Tajawal']">ملاحظات المعلم</span>
                  {existingRecording.trainer_grade && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400">{existingRecording.trainer_grade}</span>
                  )}
                </div>
                {existingRecording.trainer_feedback && (
                  <p className="text-xs font-['Tajawal'] leading-relaxed" style={{ color: 'rgba(238,245,255,0.72)' }}>{existingRecording.trainer_feedback}</p>
                )}
              </div>
            </div>
          )}

          {allAttempts.length > 1 && (
            <div className="spk-panel mt-3">
              <button className="spk-row" style={{ borderTop: 0 }} onClick={() => setAttemptsOpen((v) => !v)}>
                <span className="flex items-center gap-2 text-[13px] font-bold" style={{ color: 'rgba(238,245,255,0.78)' }}>
                  <History size={14} style={{ color: '#a5b4fc' }} /> كل المحاولات ({allAttempts.length})
                </span>
                <ChevronDown size={14} style={{ color: 'rgba(238,245,255,0.4)', transform: attemptsOpen ? 'rotate(180deg)' : 'none', transition: 'transform 200ms ease' }} />
              </button>
              <AnimatePresence>
                {attemptsOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                    <div className="px-4 pb-4 pt-1 space-y-2">
                      {allAttempts.map((attempt) => {
                        const score = attempt.ai_evaluation?.overall_score
                        return (
                          <div key={attempt.id} className="py-2 px-3 rounded-xl text-xs space-y-2"
                            style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 font-['Tajawal']" style={{ color: 'rgba(238,245,255,0.5)' }}>
                                <span>محاولة {attempt.attempt_number || '—'}</span>
                                <span className="text-[10px]">{new Date(attempt.created_at).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' })}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {score != null && (
                                  <span className="font-bold tabular-nums" style={{ color: score >= 8 ? '#34d399' : score >= 6 ? '#7ee3f5' : '#f6cf6a' }}>{score}/10</span>
                                )}
                                {attempt.is_best && <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-400">الأفضل</span>}
                              </div>
                            </div>
                            {/* every past attempt stays playable, not just the latest */}
                            {attempt.audio_url && (
                              <AudioPlayer src={attempt.audio_url} duration={attempt.audio_duration_seconds || 0} compact />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {aiEval && leaderboard && leaderboard.rankings?.length > 1 && (
            <div className="mt-3">
              <ActivityLeaderboard rankings={leaderboard.rankings} currentStudentId={studentId} totalInGroup={leaderboard.totalInGroup} />
            </div>
          )}

          {aiEval && (
            <div className="mt-3">
              <ShareAchievementCard
                type="speaking"
                studentName={studentName}
                studentText={aiEval?.transcript || ''}
                feedback={aiEval}
                scores={{
                  ...(aiEval.grammar_score != null && { grammar: aiEval.grammar_score }),
                  ...(aiEval.vocabulary_score != null && { vocabulary: aiEval.vocabulary_score }),
                  ...(aiEval.fluency_score != null && { fluency: aiEval.fluency_score }),
                  ...((aiEval.task_completion_score ?? aiEval.confidence_score) != null && { pronunciation: aiEval.task_completion_score ?? aiEval.confidence_score }),
                }}
                leaderboard={leaderboard}
                currentStudentId={studentId}
              />
            </div>
          )}
        </>
      )}

      {/* HELP — one sheet, reachable mid-conversation */}
      <HelpSheet
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        tab={helpTab}
        setTab={setHelpTab}
        heading={heading}
        typeLabel={typeLabel}
        promptAr={promptAr}
        promptEn={topic.prompt_en}
        notes={notes}
        phrases={phrases}
      />
    </>
  )
}

// ── Help sheet ─────────────────────────────────────────────────────────────
function HelpSheet({ open, onClose, tab, setTab, heading, typeLabel, promptAr, promptEn, notes, phrases }) {
  const g = useG()
  const gz = useGenderize()

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // The DB mixes two shapes in `useful_phrases`: full sentences (roleplay rows)
  // and bare collocations (everything else). Fifteen one-word rows is a scroll
  // for nothing — short items become a chip cloud instead.
  const avgLen = phrases.length ? phrases.reduce((a, p) => a + String(p).length, 0) / phrases.length : 0
  const phrasesAreWords = phrases.length > 0 && avgLen <= 24

  const tabs = [
    { id: 'brief', label: 'الإحاطة', on: !!(promptAr || promptEn) },
    { id: 'tips', label: 'نصائح', on: notes.length > 0 },
    { id: 'phrases', label: phrasesAreWords ? 'كلمات' : 'عبارات', on: phrases.length > 0 },
  ].filter((t) => t.on)

  const active = tabs.some((t) => t.id === tab) ? tab : tabs[0]?.id

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="spk-sheet-back" onClick={onClose}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} />
          <motion.div
            className="spk-sheet"
            dir="rtl"
            role="dialog"
            aria-modal="true"
            aria-label="مساعدة المحادثة"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="spk-sheet-grab" />
            <div className="flex items-center justify-between px-4 pt-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold font-['Tajawal']" style={{ color: '#7ee3f5' }}>{typeLabel}</p>
                <p className="text-[13px] font-bold font-['Tajawal'] truncate" style={{ color: '#f4f8ff' }}>{heading}</p>
              </div>
              <button onClick={onClose} aria-label="إغلاق" className="w-8 h-8 rounded-lg grid place-items-center flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(238,245,255,0.6)' }}>
                <X size={15} />
              </button>
            </div>

            {tabs.length > 1 && (
              <div className="spk-seg">
                {tabs.map((t) => (
                  <button key={t.id} data-on={active === t.id} onClick={() => setTab(t.id)}>{t.label}</button>
                ))}
              </div>
            )}

            <div className="spk-sheet-body">
              {active === 'brief' && (
                <div className="space-y-3">
                  {promptAr && <p className="text-[14px] font-['Tajawal'] leading-[1.95]" style={{ color: 'rgba(238,245,255,0.82)' }}>{promptAr}</p>}
                  {promptEn && <p className="spk-en" dir="ltr" style={{ marginTop: 0 }}>{promptEn}</p>}
                </div>
              )}

              {active === 'tips' && (
                <div className="space-y-2.5">
                  <p className="text-[11px] font-['Tajawal'] mb-1" style={{ color: 'rgba(238,245,255,0.42)' }}>
                    {g('اقرأها بسرعة، ولا تحفظها — المحادثة أحلى وأنت طبيعي.', 'اقرئيها بسرعة، ولا تحفظيها — المحادثة أحلى وأنتِ طبيعية.')}
                  </p>
                  {notes.map((note, i) => (
                    <div key={i} className="spk-tip"><b>{i + 1}</b><span>{gz(String(note))}</span></div>
                  ))}
                </div>
              )}

              {active === 'phrases' && (
                <div className={phrasesAreWords ? '' : 'space-y-2'}>
                  <p className="text-[11px] font-['Tajawal'] mb-2" style={{ color: 'rgba(238,245,255,0.42)' }}>
                    {g('استخدم منها اللي يناسبك أثناء الكلام.', 'استخدمي منها اللي يناسبكِ أثناء الكلام.')}
                  </p>
                  {phrasesAreWords ? (
                    <div className="flex flex-wrap gap-2" dir="ltr">
                      {phrases.map((p, i) => (
                        <span key={i} className="spk-phrase spk-phrase--chip">{String(p)}</span>
                      ))}
                    </div>
                  ) : (
                    phrases.map((p, i) => <span key={i} className="spk-phrase">{String(p)}</span>)
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ── The student's own previous submission (audio + transcript) ─────────────
function PreviousSubmission({ recording }) {
  const g = useG()
  const [textOpen, setTextOpen] = useState(false)
  const transcript = recording?.ai_evaluation?.transcript || ''
  const isConversation = !!recording?.conversation_id
  const when = recording?.created_at
    ? new Date(recording.created_at).toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  if (!recording?.audio_url && !transcript) return null

  return (
    <div className="spk-panel mb-3">
      <div className="px-4 pt-3.5 pb-1 flex items-center gap-2 flex-wrap">
        <Volume2 size={14} style={{ color: '#7ee3f5' }} />
        <span className="text-[13px] font-bold font-['Tajawal']" style={{ color: 'rgba(238,245,255,0.85)' }}>
          {isConversation ? g('كلامك في هذه المحادثة', 'كلامكِ في هذه المحادثة') : g('تسجيلك السابق', 'تسجيلكِ السابق')}
        </span>
        {when && <span className="text-[11px] font-['Tajawal']" style={{ color: 'rgba(238,245,255,0.36)' }}>{when}</span>}
      </div>

      {recording.audio_url && (
        <div className="px-4 pb-3 pt-2">
          <AudioPlayer src={recording.audio_url} duration={recording.audio_duration_seconds || 0} />
        </div>
      )}

      {transcript && (
        <>
          <button className="spk-row" onClick={() => setTextOpen((v) => !v)}>
            <span className="text-[12.5px] font-bold" style={{ color: 'rgba(238,245,255,0.7)' }}>
              {g('اقرأ اللي قلته', 'اقرئي اللي قلتيه')}
            </span>
            <ChevronDown size={14} style={{ color: 'rgba(238,245,255,0.4)', transform: textOpen ? 'rotate(180deg)' : 'none', transition: 'transform 200ms ease' }} />
          </button>
          <AnimatePresence>
            {textOpen && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                <p dir="ltr" className="spk-en mx-4 mb-4" style={{ marginTop: 0 }}>{transcript}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  )
}

// ── Pending / failed evaluation ────────────────────────────────────────────
function PendingEvaluation({ status }) {
  if (status === 'failed_manual') {
    return (
      <div className="spk-panel" style={{ borderColor: 'rgba(245,158,11,0.2)' }}>
        <p className="p-4 text-sm text-amber-400 font-['Tajawal'] text-center">محادثتك مُرسلة للمعلم لمراجعتها شخصياً</p>
      </div>
    )
  }
  if (status === 'pending' || status === 'evaluating' || status === 'failed_retrying') {
    return (
      <div className="spk-panel">
        <div className="p-4 flex items-center justify-center gap-3">
          <Loader2 size={17} className="animate-spin flex-shrink-0" style={{ color: '#7ee3f5' }} />
          <span className="text-sm font-bold font-['Tajawal']" style={{ color: '#7ee3f5' }}>جاري تقييم محادثتك…</span>
        </div>
      </div>
    )
  }
  return null
}

// ── Evaluation — segmented instead of eight stacked sub-sections ───────────
const CRITERIA_AR = {
  grammar_score: 'القواعد',
  vocabulary_score: 'المفردات',
  fluency_score: 'الطلاقة',
  task_completion_score: 'إتمام المهمة',
}

function SpeakingEvaluation({ evaluation }) {
  const [tab, setTab] = useState('summary')

  const scores = Object.entries(CRITERIA_AR)
    .map(([key, label]) => ({ key, label, score: evaluation[key] }))
    .filter((s) => s.score != null)

  const overall = evaluation.overall_score
  const errors = evaluation.errors || []
  const better = evaluation.better_expressions || []
  const fluencyTips = evaluation.fluency_tips || []
  const modelAnswer = evaluation.model_answer || ''
  const strengths = typeof evaluation.strengths === 'string' ? evaluation.strengths : ''
  const improvement = evaluation.improvement_tip || ''
  const corrected = evaluation.corrected_transcript || ''

  const color = overall >= 8 ? '#34d399' : overall >= 6 ? '#7ee3f5' : '#f6cf6a'

  const band = overall >= 8 ? 'ممتاز' : overall >= 6 ? 'جيد جداً' : overall >= 4 ? 'في الطريق' : 'بداية'

  const tabs = [
    { id: 'summary', label: 'الملخّص', on: !!(evaluation.feedback_ar || strengths || improvement || evaluation.score_justification) },
    { id: 'fixes', label: 'التصحيحات', on: errors.length > 0 || !!corrected },
    { id: 'better', label: 'تعبيرات', on: better.length > 0 || fluencyTips.length > 0 },
    { id: 'model', label: 'نموذج', on: !!modelAnswer },
  ].filter((t) => t.on)

  const active = tabs.some((t) => t.id === tab) ? tab : tabs[0]?.id

  return (
    <div className="spk-panel">
      {/* score hero — the overall reads first, the four criteria are a compact
          2×2 of short meters (a full-width bar for a 0-10 value is noise). */}
      <div className="spk-score-hero">
        {overall != null && (
          <>
            <div className="spk-score-num" style={{ color }}>{overall}<small>/10</small></div>
            <span className="spk-score-band" style={{ color, borderColor: `${color}44`, background: `${color}18` }}>{band}</span>
          </>
        )}
        <span className="text-[11px] font-['Tajawal'] mr-auto" style={{ color: 'rgba(238,245,255,0.38)' }}>تقييم ليلى</span>
      </div>

      {scores.length > 0 && (
        <div className="spk-meters">
          {scores.map((s) => (
            <div key={s.key}>
              <div className="flex items-center justify-between text-[11px] font-['Tajawal'] mb-1.5">
                <span style={{ color: 'rgba(238,245,255,0.62)' }}>{s.label}</span>
                <span className="font-bold tabular-nums" style={{ color: 'rgba(238,245,255,0.88)' }}>{s.score}</span>
              </div>
              <div className="spk-bar">
                <i style={{
                  width: `${(s.score / 10) * 100}%`,
                  background: s.score >= 8 ? 'linear-gradient(90deg,#34d399,#6ee7b7)' : s.score >= 6 ? 'linear-gradient(90deg,#22d3ee,#7ee3f5)' : 'linear-gradient(90deg,#f59e0b,#f6cf6a)',
                }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {tabs.length > 1 && (
        <div className="spk-seg" style={{ margin: '2px 16px 0' }}>
          {tabs.map((t) => (
            <button key={t.id} data-on={active === t.id} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>
      )}

      <div className="px-4 py-4 space-y-3">
        {active === 'summary' && (
          <>
            {evaluation.feedback_ar && (
              <p className="text-[13px] font-['Tajawal'] leading-[1.9]" style={{ color: 'rgba(238,245,255,0.8)' }}>{evaluation.feedback_ar}</p>
            )}
            {strengths && (
              <div className="rounded-xl p-3" style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.14)' }}>
                <p className="text-[11px] font-bold font-['Tajawal'] mb-1" style={{ color: '#6ee7b7' }}>نقاط القوة</p>
                <p className="text-[12px] font-['Tajawal'] leading-[1.85]" style={{ color: 'rgba(238,245,255,0.75)' }}>{genderizeText(strengths)}</p>
              </div>
            )}
            {evaluation.score_justification && (
              <div className="rounded-xl p-3" style={{ background: 'rgba(165,180,252,0.07)', border: '1px solid rgba(165,180,252,0.15)' }}>
                <p className="text-[11px] font-bold font-['Tajawal'] mb-1" style={{ color: '#c7d2fe' }}>ليش هذي الدرجة؟</p>
                <p className="text-[12px] font-['Tajawal'] leading-[1.85]" style={{ color: 'rgba(238,245,255,0.75)' }}>{genderizeText(evaluation.score_justification)}</p>
              </div>
            )}
            {improvement && (
              <div className="rounded-xl p-3" style={{ background: 'rgba(246,207,106,0.07)', border: '1px solid rgba(246,207,106,0.16)' }}>
                <p className="text-[11px] font-bold font-['Tajawal'] mb-1" style={{ color: '#f6cf6a' }}>خطوتك القادمة</p>
                <p className="text-[12px] font-['Tajawal'] leading-[1.85]" style={{ color: 'rgba(238,245,255,0.75)' }}>{genderizeText(improvement)}</p>
              </div>
            )}
          </>
        )}

        {active === 'fixes' && (
          <>
            {errors.map((e, i) => (
              <div key={i} className="spk-fix">
                <div className="spk-fix-line">
                  <span className="was">{e.spoken || e.original}</span>
                  <span style={{ color: 'rgba(238,245,255,0.35)' }}>→</span>
                  <span className="now">{e.corrected || e.correction}</span>
                </div>
                {e.rule && <p className="text-[11px] font-['Tajawal'] mt-1.5" style={{ color: 'rgba(238,245,255,0.5)' }}>{genderizeText(e.rule)}</p>}
              </div>
            ))}
            {corrected && (
              <div>
                <p className="text-[11px] font-bold font-['Tajawal'] mb-1.5" style={{ color: '#7ee3f5' }}>كلامك بعد التصحيح</p>
                <p dir="ltr" className="spk-en" style={{ marginTop: 0 }}>{corrected}</p>
              </div>
            )}
          </>
        )}

        {active === 'better' && (
          <>
            {better.map((b, i) => (
              <div key={i} className="spk-fix">
                <div className="spk-fix-line">
                  <span style={{ color: 'rgba(238,245,255,0.5)' }}>{b.basic}</span>
                  <span style={{ color: 'rgba(238,245,255,0.35)' }}>→</span>
                  <span style={{ color: '#c7d2fe', fontWeight: 600 }}>{b.natural}</span>
                </div>
                {b.context && <p className="text-[11px] font-['Tajawal'] mt-1.5" style={{ color: 'rgba(238,245,255,0.5)' }}>{genderizeText(b.context)}</p>}
              </div>
            ))}
            {fluencyTips.map((tip, i) => (
              <p key={i} className="text-[12px] font-['Tajawal'] flex items-start gap-2 leading-[1.85]" style={{ color: 'rgba(238,245,255,0.72)' }}>
                <Wand2 size={13} className="flex-shrink-0 mt-1" style={{ color: '#f6cf6a' }} />
                {genderizeText(String(tip))}
              </p>
            ))}
          </>
        )}

        {active === 'model' && modelAnswer && (
          <div>
            <p className="text-[11px] font-bold font-['Tajawal'] mb-1.5 flex items-center gap-1.5" style={{ color: '#7ee3f5' }}>
              <Quote size={12} /> كيف يقولها متحدّث أصلي
            </p>
            <p dir="ltr" className="spk-en" style={{ marginTop: 0, fontStyle: 'italic' }}>{modelAnswer}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Skeleton ───────────────────────────────────────────────────────────────
function SpeakingSkeleton() {
  return (
    <div className="spk">
      <div className="spk-bloom" aria-hidden><span /><span /><span /></div>
      <div className="spk-body-col">
        <div className="spk-stage" style={{ padding: 20 }}>
          <div className="space-y-3">
            <div className="h-3 w-20 rounded bg-white/5 animate-pulse" />
            <div className="h-5 w-56 rounded bg-white/5 animate-pulse" />
            <div className="h-3 w-full rounded bg-white/5 animate-pulse" />
            <div className="h-3 w-4/5 rounded bg-white/5 animate-pulse" />
          </div>
          <div className="flex flex-col items-center gap-3 py-10">
            <div className="w-20 h-20 rounded-full bg-white/5 animate-pulse" />
            <div className="h-3 w-24 rounded bg-white/5 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  )
}
