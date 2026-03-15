import { useState, useRef, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight, Mic, MicOff, Square, Play, Pause, Send, Clock, Star,
  CheckCircle2, XCircle, BookOpen, PenLine, Headphones, Volume2,
  ChevronLeft, ChevronRight, RotateCcw, Award, AlertCircle, Loader2,
  BookType, Sparkles,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { invokeWithRetry } from '../../lib/invokeWithRetry'

const TYPE_CONFIG = {
  speaking:        { icon: Mic,        label: 'تحدث',       gradient: 'from-sky-500 to-cyan-400',     bg: 'bg-sky-500/[0.08]',     border: 'border-sky-500/15',    text: 'text-sky-400' },
  reading:         { icon: BookOpen,   label: 'قراءة',      gradient: 'from-emerald-500 to-teal-400', bg: 'bg-emerald-500/[0.08]', border: 'border-emerald-500/15', text: 'text-emerald-400' },
  writing:         { icon: PenLine,    label: 'كتابة',      gradient: 'from-violet-500 to-purple-400', bg: 'bg-violet-500/[0.08]', border: 'border-violet-500/15', text: 'text-violet-400' },
  listening:       { icon: Headphones, label: 'استماع',     gradient: 'from-amber-500 to-orange-400', bg: 'bg-amber-500/[0.08]',  border: 'border-amber-500/15',  text: 'text-amber-400' },
  irregular_verbs: { icon: RotateCcw,  label: 'أفعال شاذة', gradient: 'from-rose-500 to-pink-400',    bg: 'bg-rose-500/[0.08]',   border: 'border-rose-500/15',   text: 'text-rose-400' },
  vocabulary:      { icon: BookType,   label: 'مفردات',     gradient: 'from-indigo-500 to-blue-400',  bg: 'bg-indigo-500/[0.08]', border: 'border-indigo-500/15', text: 'text-indigo-400' },
}

const STATUS_LABELS = {
  pending: 'قيد الانتظار',
  submitted: 'تم التسليم',
  graded: 'تم التقييم',
  overdue: 'متأخر',
}

export default function StudentWeeklyTaskDetail() {
  const { id } = useParams()
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()

  const { data: task, isLoading } = useQuery({
    queryKey: ['weekly-task', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('weekly_tasks')
        .select('*')
        .eq('id', id)
        .single()
      return data
    },
  })

  const submitMutation = useMutation({
    mutationFn: async (responseData) => {
      const { error } = await supabase
        .from('weekly_tasks')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          ...responseData,
        })
        .eq('id', task.id)
      if (error) throw error

      try {
        await invokeWithRetry('grade-weekly-task', {
          body: { task_id: task.id },
          
        })
      } catch (gradeErr) {
        console.error('AI grading request failed (will be retried):', gradeErr)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-task', id] })
      queryClient.invalidateQueries({ queryKey: ['weekly-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['weekly-task-set'] })
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!task) {
    return (
      <div className="rounded-2xl border border-[var(--border-subtle)] p-10 text-center space-y-4" style={{ background: 'var(--surface-base)' }}>
        <AlertCircle className="w-10 h-10 text-[var(--text-tertiary)] mx-auto" />
        <p className="text-[var(--text-tertiary)]">لم يتم العثور على المهمة</p>
        <Link to="/student/weekly-tasks" className="inline-flex items-center gap-2 text-sky-400 hover:text-sky-300 text-sm transition-colors">
          <ArrowRight className="w-4 h-4" />
          العودة للمهام
        </Link>
      </div>
    )
  }

  const config = TYPE_CONFIG[task.type] || TYPE_CONFIG.reading
  const TypeIcon = config.icon
  const content = task.content || {}
  const isSubmitted = task.status === 'submitted' || task.status === 'graded'

  return (
    <div className="space-y-6 pb-8">
      {/* Back link */}
      <Link
        to="/student/weekly-tasks"
        className="inline-flex items-center gap-2 text-[var(--text-tertiary)] hover:text-[var(--text-tertiary)] transition-colors text-sm"
      >
        <ArrowRight className="w-4 h-4" />
        المهام الأسبوعية
      </Link>

      {/* Hero header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-[var(--border-subtle)]"
        style={{ background: 'var(--surface-base)' }}
      >
        <div className={`h-1 bg-gradient-to-r ${config.gradient}`} />
        <div className="p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3.5">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${config.gradient} bg-opacity-20 ${config.bg} flex items-center justify-center ring-1 ${config.border}`}>
                <TypeIcon className={`w-5 h-5 ${config.text}`} />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">{task.title}</h1>
                <p className="text-[var(--text-tertiary)] text-sm mt-0.5">{config.label}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                task.status === 'graded' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' :
                task.status === 'submitted' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/15' :
                'bg-[var(--surface-base)] text-[var(--text-tertiary)] border border-[var(--border-subtle)]'
              }`}>
                {STATUS_LABELS[task.status] || task.status}
              </span>
              {task.deadline && (
                <span className="flex items-center gap-1.5 text-[var(--text-tertiary)] text-xs">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(task.deadline).toLocaleDateString('ar-EG', {
                    weekday: 'short', month: 'short', day: 'numeric',
                  })}
                </span>
              )}
              {task.points != null && (
                <span className="flex items-center gap-1 text-amber-400/70 text-xs font-medium">
                  <Star className="w-3.5 h-3.5" />
                  {task.points} نقطة
                </span>
              )}
            </div>
          </div>

          {/* Instructions */}
          {(task.instructions_ar || task.instructions) && (
            <div className="mt-4 p-4 rounded-xl bg-[var(--surface-base)] border border-[var(--border-subtle)]">
              <p className="text-sm text-[var(--text-tertiary)] leading-relaxed">
                {task.instructions_ar || task.instructions}
              </p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Type-specific UI */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        {task.type === 'speaking' && (
          <SpeakingTask task={task} content={content} isSubmitted={isSubmitted} onSubmit={submitMutation} />
        )}
        {task.type === 'reading' && (
          <ReadingTask task={task} content={content} isSubmitted={isSubmitted} onSubmit={submitMutation} />
        )}
        {task.type === 'writing' && (
          <WritingTask task={task} content={content} isSubmitted={isSubmitted} onSubmit={submitMutation} />
        )}
        {task.type === 'listening' && (
          <ListeningTask task={task} content={content} isSubmitted={isSubmitted} onSubmit={submitMutation} />
        )}
        {task.type === 'irregular_verbs' && (
          <IrregularVerbsTask task={task} content={content} isSubmitted={isSubmitted} onSubmit={submitMutation} />
        )}
        {task.type === 'vocabulary' && (
          <VocabularyTask task={task} content={content} isSubmitted={isSubmitted} onSubmit={submitMutation} />
        )}
      </motion.div>

      {/* AI Feedback (after grading) */}
      {task.status === 'graded' && task.ai_feedback && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <FeedbackDisplay feedback={task.ai_feedback} autoScore={task.auto_score} type={task.type} />
        </motion.div>
      )}
    </div>
  )
}

/* ─── Speaking Task ──────────────────────────────────────────────── */
function SpeakingTask({ task, content, isSubmitted, onSubmit }) {
  const [recording, setRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState(null)
  const [audioUrl, setAudioUrl] = useState(null)
  const [duration, setDuration] = useState(0)
  const [uploading, setUploading] = useState(false)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl])

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      // Safari → audio/mp4, Chrome → audio/webm
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/mp4'
      const mr = new MediaRecorder(stream, { mimeType })
      chunksRef.current = []
      mr.ondataavailable = (e) => chunksRef.current.push(e.data)
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
        stream.getTracks().forEach((t) => t.stop())
      }
      mr.start()
      mediaRecorderRef.current = mr
      setRecording(true)
      setDuration(0)
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000)
    } catch {
      alert('لم يتم السماح بالوصول إلى الميكروفون')
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    setRecording(false)
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  function resetRecording() {
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioBlob(null)
    setAudioUrl(null)
    setDuration(0)
  }

  async function handleSubmit() {
    if (!audioBlob) return
    setUploading(true)
    try {
      const ext = audioBlob.type.includes('mp4') ? 'mp4' : 'webm'
      const fileName = `speaking/${task.id}_${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('voice-recordings')
        .upload(fileName, audioBlob, { contentType: audioBlob.type })
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('voice-recordings').getPublicUrl(fileName)

      await onSubmit.mutateAsync({
        response_voice_url: urlData.publicUrl,
        response_voice_duration: duration,
      })
    } catch (err) {
      alert('حدث خطأ أثناء رفع التسجيل')
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className="space-y-5">
      {/* Topic & guiding questions */}
      <Card>
        <h2 className="text-base font-semibold text-[var(--text-primary)] mb-3">{content.topic || 'موضوع المحادثة'}</h2>
        {content.guiding_questions?.length > 0 && (
          <div className="space-y-2">
            <p className="text-[var(--text-tertiary)] text-xs font-medium mb-2">أسئلة إرشادية:</p>
            <ul className="space-y-2">
              {content.guiding_questions.map((q, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[var(--text-tertiary)] text-sm">
                  <span className="w-5 h-5 rounded-md bg-sky-500/10 text-sky-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {q}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* Recording UI */}
      {!isSubmitted && (
        <Card className="flex flex-col items-center gap-5">
          <div className="text-4xl font-mono text-[var(--text-primary)] tabular-nums tracking-wider">{formatTime(duration)}</div>

          {recording && (
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-400 text-xs font-medium">جاري التسجيل</span>
            </div>
          )}

          <div className="flex items-center gap-3">
            {!recording && !audioUrl && (
              <button onClick={startRecording} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 text-white font-medium text-sm hover:brightness-110 transition-all">
                <Mic className="w-4 h-4" />
                ابدأ التسجيل
              </button>
            )}
            {recording && (
              <button onClick={stopRecording} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-500/15 border border-red-500/20 text-red-400 font-medium text-sm hover:bg-red-500/20 transition-all">
                <Square className="w-4 h-4" />
                إيقاف
              </button>
            )}
            {audioUrl && !recording && (
              <button onClick={resetRecording} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--surface-base)] border border-[var(--border-subtle)] text-[var(--text-tertiary)] text-sm hover:bg-[var(--surface-raised)] transition-all">
                <RotateCcw className="w-3.5 h-3.5" />
                إعادة
              </button>
            )}
          </div>

          {audioUrl && (
            <div className="w-full max-w-md">
              <audio src={audioUrl} controls className="w-full rounded-lg" />
              <p className="text-[var(--text-tertiary)] text-xs text-center mt-2">مدة التسجيل: {formatTime(duration)}</p>
            </div>
          )}

          {audioUrl && !recording && (
            <SubmitButton onClick={handleSubmit} loading={uploading || onSubmit.isPending} label="إرسال التسجيل" />
          )}
        </Card>
      )}

      {isSubmitted && task.response_voice_url && (
        <Card>
          <h3 className="text-sm font-medium text-[var(--text-tertiary)] mb-3">التسجيل المرسل</h3>
          <audio src={task.response_voice_url} controls className="w-full" />
        </Card>
      )}
    </div>
  )
}

/* ─── Reading Task ───────────────────────────────────────────────── */
function ReadingTask({ task, content, isSubmitted, onSubmit }) {
  const [answers, setAnswers] = useState({})
  const [showResults, setShowResults] = useState(isSubmitted)
  const questions = content.questions || []

  async function handleSubmit() {
    const formattedAnswers = Object.entries(answers).map(([idx, answer]) => ({
      question_index: parseInt(idx),
      answer,
    }))
    await onSubmit.mutateAsync({ response_answers: formattedAnswers })
    setShowResults(true)
  }

  return (
    <div className="space-y-5">
      <Card>
        {content.article_title && (
          <h2 className="text-base font-semibold text-[var(--text-primary)] mb-3">{content.article_title}</h2>
        )}
        {content.article_text && (
          <div className="text-[var(--text-tertiary)] leading-relaxed whitespace-pre-wrap text-sm" dir="ltr">
            {content.article_text}
          </div>
        )}
      </Card>

      <QuestionsUI
        questions={questions}
        answers={answers}
        showResults={showResults}
        isSubmitted={isSubmitted}
        onMCQChange={(i, v) => setAnswers(p => ({ ...p, [i]: v }))}
        onOpenChange={(i, v) => setAnswers(p => ({ ...p, [i]: v }))}
      />

      {!isSubmitted && (
        <div className="flex justify-center">
          <SubmitButton onClick={handleSubmit} loading={onSubmit.isPending} label="إرسال الإجابات" />
        </div>
      )}
    </div>
  )
}

/* ─── Writing Task ───────────────────────────────────────────────── */
function WritingTask({ task, content, isSubmitted, onSubmit }) {
  const [text, setText] = useState(task.response_text || '')
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0
  const minWords = content.word_limit_min || 0
  const maxWords = content.word_limit_max || Infinity
  const isValidLength = wordCount >= minWords && wordCount <= (maxWords === Infinity ? Infinity : maxWords)

  async function handleSubmit() {
    await onSubmit.mutateAsync({ response_text: text })
  }

  return (
    <div className="space-y-5">
      <Card>
        <h2 className="text-base font-semibold text-[var(--text-primary)] mb-3">موضوع الكتابة</h2>
        <p className="text-[var(--text-tertiary)] leading-relaxed text-sm">{content.prompt}</p>
        {content.focus_areas?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {content.focus_areas.map((area, i) => (
              <span key={i} className="px-2.5 py-0.5 rounded-md bg-violet-500/10 text-violet-400 border border-violet-500/15 text-xs font-medium">
                {area}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-4 text-[var(--text-tertiary)] text-xs mt-3">
          {minWords > 0 && <span>الحد الأدنى: {minWords} كلمة</span>}
          {maxWords < Infinity && <span>الحد الأقصى: {maxWords} كلمة</span>}
        </div>
      </Card>

      <Card>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={isSubmitted}
          placeholder="اكتب هنا..."
          className="w-full min-h-[280px] resize-y text-sm leading-relaxed bg-transparent border border-[var(--border-subtle)] rounded-xl p-4 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-subtle)] focus:ring-1 focus:ring-sky-500/20 transition-all"
          dir="auto"
        />
        <div className="flex items-center justify-between mt-3">
          <span className={`text-xs font-medium ${isValidLength ? 'text-emerald-400/70' : 'text-amber-400/70'}`}>
            عدد الكلمات: {wordCount}
          </span>
          {!isSubmitted && (
            <SubmitButton
              onClick={handleSubmit}
              loading={onSubmit.isPending}
              disabled={!text.trim() || !isValidLength}
              label="إرسال"
              small
            />
          )}
        </div>
      </Card>
    </div>
  )
}

/* ─── Listening Task ─────────────────────────────────────────────── */
function ListeningTask({ task, content, isSubmitted, onSubmit }) {
  const [answers, setAnswers] = useState({})
  const [showResults, setShowResults] = useState(isSubmitted)
  const questions = content.questions || []

  async function handleSubmit() {
    const formattedAnswers = Object.entries(answers).map(([idx, answer]) => ({
      question_index: parseInt(idx),
      answer,
    }))
    await onSubmit.mutateAsync({ response_answers: formattedAnswers })
    setShowResults(true)
  }

  const isYouTube = content.media_url && (content.media_url.includes('youtube.com') || content.media_url.includes('youtu.be'))
  const youtubeId = isYouTube ? extractYouTubeId(content.media_url) : null

  return (
    <div className="space-y-5">
      <Card>
        {youtubeId ? (
          <div className="aspect-video rounded-xl overflow-hidden">
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}`}
              title="Listening material"
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : content.media_url ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[var(--text-tertiary)]">
              <Volume2 className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-medium">الملف الصوتي</span>
            </div>
            <audio src={content.media_url} controls className="w-full" />
          </div>
        ) : content.topic_description ? (
          <div className="space-y-2">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">وصف الموضوع</h2>
            <p className="text-[var(--text-tertiary)] leading-relaxed text-sm">{content.topic_description}</p>
          </div>
        ) : null}
      </Card>

      <QuestionsUI
        questions={questions}
        answers={answers}
        showResults={showResults}
        isSubmitted={isSubmitted}
        onMCQChange={(i, v) => setAnswers(p => ({ ...p, [i]: v }))}
        onOpenChange={(i, v) => setAnswers(p => ({ ...p, [i]: v }))}
      />

      {!isSubmitted && (
        <div className="flex justify-center">
          <SubmitButton onClick={handleSubmit} loading={onSubmit.isPending} label="إرسال الإجابات" />
        </div>
      )}
    </div>
  )
}

/* ─── Irregular Verbs Task ───────────────────────────────────────── */
function IrregularVerbsTask({ task, content, isSubmitted, onSubmit }) {
  const verbs = content.verbs || []
  const [currentIndex, setCurrentIndex] = useState(0)
  const [pastSimple, setPastSimple] = useState('')
  const [pastParticiple, setPastParticiple] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [results, setResults] = useState([])
  const [finished, setFinished] = useState(isSubmitted)

  const currentVerb = verbs[currentIndex]
  const total = verbs.length || 5

  function checkAndNext() {
    if (!revealed) {
      const correctPastOptions = (currentVerb.past_simple || '').toLowerCase().split('/').map(s => s.trim())
      const correctParticipleOptions = (currentVerb.past_participle || '').toLowerCase().split('/').map(s => s.trim())
      const pastOk = correctPastOptions.includes(pastSimple.trim().toLowerCase())
      const participleOk = correctParticipleOptions.includes(pastParticiple.trim().toLowerCase())
      setResults(prev => [
        ...prev,
        {
          verb: currentVerb.base_form,
          base_form: currentVerb.base_form,
          userPastSimple: pastSimple.trim(),
          userPastParticiple: pastParticiple.trim(),
          correctPastSimple: currentVerb.past_simple,
          correctPastParticiple: currentVerb.past_participle,
          correct: pastOk && participleOk,
        },
      ])
      setRevealed(true)
    } else {
      if (currentIndex < total - 1) {
        setCurrentIndex(i => i + 1)
        setPastSimple('')
        setPastParticiple('')
        setRevealed(false)
      } else {
        setFinished(true)
      }
    }
  }

  const score = results.filter(r => r.correct).length

  async function handleSubmit() {
    const formattedAnswers = results.map((r, i) => ({
      verb_index: i,
      base_form: r.base_form || r.verb,
      past_simple: r.userPastSimple,
      past_participle: r.userPastParticiple,
    }))
    await onSubmit.mutateAsync({ response_answers: formattedAnswers })
  }

  if (verbs.length === 0) {
    return (
      <Card className="text-center">
        <p className="text-[var(--text-tertiary)]">لا توجد أفعال في هذه المهمة</p>
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      {!finished ? (
        <>
          {/* Progress */}
          <Card className="!p-4">
            <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)] mb-2">
              <span>الفعل {currentIndex + 1} من {total}</span>
              <span>{results.filter(r => r.correct).length} صحيح</span>
            </div>
            <div className="w-full h-1.5 bg-[var(--surface-base)] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-rose-500 to-pink-400 rounded-full"
                animate={{ width: `${((currentIndex + (revealed ? 1 : 0)) / total) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </Card>

          {/* Flashcard */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="text-center space-y-5">
                <div>
                  <h2 className="text-2xl font-bold text-[var(--text-primary)]">{currentVerb.base_form}</h2>
                  {currentVerb.meaning_ar && (
                    <p className="text-[var(--text-tertiary)] text-base mt-1">{currentVerb.meaning_ar}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto">
                  <div className="space-y-2">
                    <label className="text-xs text-[var(--text-tertiary)] font-medium">Past Simple</label>
                    <input
                      type="text"
                      value={pastSimple}
                      onChange={e => setPastSimple(e.target.value)}
                      disabled={revealed}
                      placeholder="..."
                      className="w-full text-center bg-[var(--surface-base)] border border-[var(--border-subtle)] rounded-xl px-3 py-2.5 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-subtle)] focus:ring-1 focus:ring-rose-500/20 transition-all"
                      dir="ltr"
                      onKeyDown={e => e.key === 'Enter' && checkAndNext()}
                    />
                    {revealed && (
                      <AnswerFeedback
                        isCorrect={
                          (currentVerb.past_simple || '').toLowerCase().split('/').map(s => s.trim())
                            .includes(pastSimple.trim().toLowerCase())
                        }
                        correctAnswer={currentVerb.past_simple}
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-[var(--text-tertiary)] font-medium">Past Participle</label>
                    <input
                      type="text"
                      value={pastParticiple}
                      onChange={e => setPastParticiple(e.target.value)}
                      disabled={revealed}
                      placeholder="..."
                      className="w-full text-center bg-[var(--surface-base)] border border-[var(--border-subtle)] rounded-xl px-3 py-2.5 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-subtle)] focus:ring-1 focus:ring-rose-500/20 transition-all"
                      dir="ltr"
                      onKeyDown={e => e.key === 'Enter' && checkAndNext()}
                    />
                    {revealed && (
                      <AnswerFeedback
                        isCorrect={
                          (currentVerb.past_participle || '').toLowerCase().split('/').map(s => s.trim())
                            .includes(pastParticiple.trim().toLowerCase())
                        }
                        correctAnswer={currentVerb.past_participle}
                      />
                    )}
                  </div>
                </div>

                <button
                  onClick={checkAndNext}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white text-sm font-medium hover:brightness-110 transition-all"
                >
                  {!revealed ? 'تحقق' : currentIndex < total - 1 ? 'التالي' : 'عرض النتيجة'}
                </button>
              </Card>
            </motion.div>
          </AnimatePresence>
        </>
      ) : (
        <div className="space-y-5">
          <Card className="text-center space-y-4">
            <Award className="w-12 h-12 text-amber-400 mx-auto" />
            <h2 className="text-xl font-bold text-[var(--text-primary)]">النتيجة النهائية</h2>
            <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-pink-400">
              {score} / {total}
            </div>
            <p className="text-[var(--text-tertiary)] text-sm">
              {score === total ? 'ممتاز! أجبت على جميع الأفعال بشكل صحيح' :
               score >= total / 2 ? 'أحسنت! واصل التمرين' :
               'حاول مراجعة الأفعال والمحاولة مرة أخرى'}
            </p>
          </Card>

          <Card>
            <h3 className="text-sm font-medium text-[var(--text-tertiary)] mb-3">تفاصيل الإجابات</h3>
            <div className="space-y-2">
              {results.map((r, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between p-3 rounded-xl border ${
                    r.correct ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-red-500/5 border-red-500/10'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {r.correct ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                    <span className="text-[var(--text-secondary)] font-medium text-sm">{r.verb}</span>
                  </div>
                  <span className="text-xs text-[var(--text-tertiary)]" dir="ltr">
                    {r.correctPastSimple} / {r.correctPastParticiple}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {!isSubmitted && (
            <div className="flex justify-center">
              <SubmitButton onClick={handleSubmit} loading={onSubmit.isPending} label="إرسال النتيجة" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Vocabulary Task ────────────────────────────────────────────── */
function VocabularyTask({ task, content, isSubmitted, onSubmit }) {
  const words = content.words || []
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [results, setResults] = useState([])
  const [finished, setFinished] = useState(isSubmitted)

  const currentWord = words[currentIndex]
  const total = words.length

  function checkAndNext() {
    if (!revealed) {
      const isCorrect = userAnswer.trim().toLowerCase() === (currentWord.word || '').toLowerCase()
      setResults(prev => [...prev, {
        word: currentWord.word,
        translation: currentWord.translation_ar,
        userAnswer: userAnswer.trim(),
        correct: isCorrect,
      }])
      setRevealed(true)
    } else {
      if (currentIndex < total - 1) {
        setCurrentIndex(i => i + 1)
        setUserAnswer('')
        setRevealed(false)
      } else {
        setFinished(true)
      }
    }
  }

  const score = results.filter(r => r.correct).length

  async function handleSubmit() {
    await onSubmit.mutateAsync({
      response_answers: results.map((r, i) => ({
        word_index: i,
        word: r.word,
        user_answer: r.userAnswer,
        correct: r.correct,
      })),
    })
  }

  if (total === 0) {
    return <Card className="text-center"><p className="text-[var(--text-tertiary)]">لا توجد مفردات في هذه المهمة</p></Card>
  }

  return (
    <div className="space-y-5">
      {!finished ? (
        <>
          <Card className="!p-4">
            <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)] mb-2">
              <span>الكلمة {currentIndex + 1} من {total}</span>
              <span>{results.filter(r => r.correct).length} صحيح</span>
            </div>
            <div className="w-full h-1.5 bg-[var(--surface-base)] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-indigo-500 to-blue-400 rounded-full"
                animate={{ width: `${((currentIndex + (revealed ? 1 : 0)) / total) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </Card>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="text-center space-y-5">
                <div>
                  <p className="text-[var(--text-tertiary)] text-sm mb-1">ما هي الكلمة الإنجليزية التي تعني:</p>
                  <h2 className="text-2xl font-bold text-[var(--text-primary)]">{currentWord.translation_ar}</h2>
                  {currentWord.definition && (
                    <p className="text-[var(--text-tertiary)] text-xs mt-2" dir="ltr">Hint: {currentWord.definition}</p>
                  )}
                </div>

                <div className="max-w-xs mx-auto">
                  <input
                    type="text"
                    value={userAnswer}
                    onChange={e => setUserAnswer(e.target.value)}
                    disabled={revealed}
                    placeholder="اكتب الكلمة بالإنجليزية"
                    className="w-full text-center bg-[var(--surface-base)] border border-[var(--border-subtle)] rounded-xl px-3 py-2.5 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-subtle)] focus:ring-1 focus:ring-indigo-500/20 transition-all"
                    dir="ltr"
                    onKeyDown={e => e.key === 'Enter' && checkAndNext()}
                  />
                  {revealed && (
                    <div className="mt-2">
                      <AnswerFeedback isCorrect={userAnswer.trim().toLowerCase() === (currentWord.word || '').toLowerCase()} correctAnswer={currentWord.word} />
                      {currentWord.example_sentence && (
                        <p className="text-xs text-[var(--text-tertiary)] mt-2" dir="ltr">"{currentWord.example_sentence}"</p>
                      )}
                    </div>
                  )}
                </div>

                <button
                  onClick={checkAndNext}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 text-white text-sm font-medium hover:brightness-110 transition-all"
                >
                  {!revealed ? 'تحقق' : currentIndex < total - 1 ? 'التالي' : 'عرض النتيجة'}
                </button>
              </Card>
            </motion.div>
          </AnimatePresence>
        </>
      ) : (
        <div className="space-y-5">
          <Card className="text-center space-y-4">
            <BookType className="w-12 h-12 text-indigo-400 mx-auto" />
            <h2 className="text-xl font-bold text-[var(--text-primary)]">النتيجة النهائية</h2>
            <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-400">
              {score} / {total}
            </div>
          </Card>

          <Card>
            <div className="space-y-2">
              {results.map((r, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between p-3 rounded-xl border ${
                    r.correct ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-red-500/5 border-red-500/10'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {r.correct ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                    <span className="text-[var(--text-secondary)] font-medium text-sm">{r.translation}</span>
                  </div>
                  <span className="text-xs text-[var(--text-tertiary)]" dir="ltr">{r.word}</span>
                </div>
              ))}
            </div>
          </Card>

          {!isSubmitted && (
            <div className="flex justify-center">
              <SubmitButton onClick={handleSubmit} loading={onSubmit.isPending} label="إرسال النتيجة" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Shared: Questions UI ───────────────────────────────────────── */
function QuestionsUI({ questions, answers, showResults, isSubmitted, onMCQChange, onOpenChange }) {
  if (!questions.length) return null

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-[var(--text-secondary)]">الأسئلة</h3>
      {questions.map((q, i) => (
        <Card key={i}>
          <p className="text-[var(--text-secondary)] font-medium text-sm mb-3">
            <span className="text-sky-400 ml-2 font-bold">{i + 1}.</span>
            {q.question}
          </p>

          {q.type === 'mcq' && q.options ? (
            <div className="space-y-2">
              {q.options.map((opt, j) => {
                const selected = answers[i] === opt
                const isCorrectOption = showResults && opt === q.correct_answer
                const isWrongSelection = showResults && selected && opt !== q.correct_answer

                return (
                  <label
                    key={j}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      isCorrectOption
                        ? 'bg-emerald-500/[0.08] border-emerald-500/20'
                        : isWrongSelection
                        ? 'bg-red-500/[0.08] border-red-500/20'
                        : selected
                        ? 'bg-sky-500/[0.08] border-sky-500/20'
                        : 'bg-[var(--surface-base)] border-[var(--border-subtle)] hover:border-[var(--border-subtle)]'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q-${i}`}
                      value={opt}
                      checked={selected}
                      onChange={() => onMCQChange(i, opt)}
                      disabled={isSubmitted}
                      className="accent-sky-400"
                    />
                    <span className="text-[var(--text-tertiary)] text-sm flex-1">{opt}</span>
                    {isCorrectOption && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    {isWrongSelection && <XCircle className="w-4 h-4 text-red-400" />}
                  </label>
                )
              })}
              {showResults && q.explanation && (
                <p className="text-[var(--text-tertiary)] text-xs mt-2 p-2.5 bg-[var(--surface-base)] rounded-lg border border-[var(--border-subtle)]">
                  {q.explanation}
                </p>
              )}
            </div>
          ) : (
            <textarea
              value={answers[i] || ''}
              onChange={e => onOpenChange(i, e.target.value)}
              disabled={isSubmitted}
              placeholder="اكتب إجابتك هنا..."
              className="w-full min-h-[90px] resize-y text-sm bg-[var(--surface-base)] border border-[var(--border-subtle)] rounded-xl p-3 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-subtle)] transition-all"
              dir="auto"
            />
          )}
        </Card>
      ))}
    </div>
  )
}

/* ─── AI Feedback Display ────────────────────────────────────────── */
function FeedbackDisplay({ feedback, autoScore, type }) {
  const feedbackData = typeof feedback === 'string' ? (() => { try { return JSON.parse(feedback) } catch { return {} } })() : feedback || {}

  const scoreEntries = []
  if (feedbackData.overall_score != null) scoreEntries.push({ label: 'الدرجة الكلية', value: feedbackData.overall_score })
  if (feedbackData.grammar_score != null) scoreEntries.push({ label: 'القواعد', value: feedbackData.grammar_score })
  if (feedbackData.vocabulary_score != null) scoreEntries.push({ label: 'المفردات', value: feedbackData.vocabulary_score })
  if (type === 'speaking' && feedbackData.fluency_score != null) scoreEntries.push({ label: 'الطلاقة', value: feedbackData.fluency_score })
  if (type === 'writing' && feedbackData.structure_score != null) scoreEntries.push({ label: 'البنية', value: feedbackData.structure_score })
  if (feedbackData.auto_score != null && scoreEntries.length === 0) scoreEntries.push({ label: 'الدرجة', value: feedbackData.auto_score })

  return (
    <Card className="!border-sky-500/10">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500/20 to-cyan-500/10 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-sky-400" />
        </div>
        <h3 className="text-base font-semibold text-[var(--text-secondary)]">تقييم الذكاء الاصطناعي</h3>
      </div>

      {scoreEntries.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {scoreEntries.map((s, i) => (
            <div key={i} className="rounded-xl bg-[var(--surface-base)] border border-[var(--border-subtle)] p-3 text-center">
              <div className="text-xl font-bold text-sky-400">{s.value}</div>
              <div className="text-[var(--text-tertiary)] text-xs mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {feedbackData?.suggestions?.length > 0 && (
        <div className="mb-4">
          <h4 className="text-[var(--text-tertiary)] font-medium text-xs mb-2">اقتراحات للتحسين</h4>
          <ul className="space-y-2">
            {feedbackData.suggestions.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-[var(--text-tertiary)] text-sm">
                <ChevronLeft className="w-3.5 h-3.5 text-sky-400/50 mt-0.5 shrink-0" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {feedbackData?.corrected_text && (
        <div>
          <h4 className="text-[var(--text-tertiary)] font-medium text-xs mb-2">النص المصحح</h4>
          <div className="bg-[var(--surface-base)] rounded-xl p-4 text-[var(--text-tertiary)] text-sm leading-relaxed whitespace-pre-wrap border border-[var(--border-subtle)]" dir="auto">
            {feedbackData.corrected_text}
          </div>
        </div>
      )}

      {feedbackData?.comment && (
        <p className="text-[var(--text-tertiary)] text-sm leading-relaxed mt-3">{feedbackData.comment}</p>
      )}
    </Card>
  )
}

/* ─── Shared Components ──────────────────────────────────────────── */
function Card({ children, className = '' }) {
  return (
    <div
      className={`rounded-2xl border border-[var(--border-subtle)] p-6 ${className}`}
      style={{ background: 'var(--surface-base)' }}
    >
      {children}
    </div>
  )
}

function SubmitButton({ onClick, loading, disabled, label, small }) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className={`flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 text-white font-medium hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
        small ? 'px-4 py-2 text-sm' : 'px-7 py-3 text-sm'
      }`}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
      {label}
    </button>
  )
}

function AnswerFeedback({ isCorrect, correctAnswer }) {
  return (
    <div className="flex items-center justify-center gap-1.5 text-xs mt-1">
      {isCorrect ? (
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
      ) : (
        <>
          <XCircle className="w-3.5 h-3.5 text-red-400" />
          <span className="text-emerald-400 font-medium" dir="ltr">{correctAnswer}</span>
        </>
      )}
    </div>
  )
}

/* ─── Helpers ────────────────────────────────────────────────────── */
function extractYouTubeId(url) {
  if (!url) return null
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?#]+)/)
  return match ? match[1] : null
}
