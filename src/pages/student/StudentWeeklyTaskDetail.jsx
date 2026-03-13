import { useState, useRef, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  Mic,
  MicOff,
  Square,
  Play,
  Pause,
  Send,
  Clock,
  Star,
  CheckCircle2,
  XCircle,
  BookOpen,
  PenLine,
  Headphones,
  Volume2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Award,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'

const TYPE_CONFIG = {
  speaking: { icon: Mic, label: 'محادثة', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
  reading: { icon: BookOpen, label: 'قراءة', color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20' },
  writing: { icon: PenLine, label: 'كتابة', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  listening: { icon: Headphones, label: 'استماع', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  irregular_verbs: { icon: RotateCcw, label: 'أفعال شاذة', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
}

const STATUS_BADGES = {
  pending: 'badge-warning',
  submitted: 'badge-info',
  graded: 'badge-success',
  overdue: 'badge-danger',
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

      const { data: { session } } = await supabase.auth.getSession()
      await supabase.functions.invoke('grade-weekly-task', {
        body: { task_id: task.id },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-task', id] })
      queryClient.invalidateQueries({ queryKey: ['weekly-tasks'] })
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!task) {
    return (
      <div className="glass-card p-8 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-muted mx-auto" />
        <p className="text-muted">لم يتم العثور على المهمة</p>
        <Link to="/student/weekly-tasks" className="btn-secondary inline-block">
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
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <Link
          to="/student/weekly-tasks"
          className="inline-flex items-center gap-2 text-muted hover:text-white transition-colors text-sm"
        >
          <ArrowRight className="w-4 h-4" />
          العودة للمهام الأسبوعية
        </Link>

        <div className="glass-card p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl border ${config.bg}`}>
                <TypeIcon className={`w-6 h-6 ${config.color}`} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{task.title}</h1>
                <p className="text-muted text-sm mt-1">{config.label}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <span className={`${STATUS_BADGES[task.status] || 'badge-warning'} px-3 py-1 rounded-full text-xs font-medium`}>
                {STATUS_LABELS[task.status] || task.status}
              </span>
              {task.deadline && (
                <span className="flex items-center gap-1 text-muted text-sm">
                  <Clock className="w-4 h-4" />
                  {new Date(task.deadline).toLocaleDateString('ar-EG', {
                    weekday: 'short', month: 'short', day: 'numeric',
                  })}
                </span>
              )}
              {task.points != null && (
                <span className="flex items-center gap-1 text-amber-400 text-sm font-medium">
                  <Star className="w-4 h-4" />
                  {task.points} نقطة
                </span>
              )}
            </div>
          </div>
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
      </motion.div>

      {/* AI Feedback (after grading) */}
      {task.status === 'graded' && task.feedback && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <FeedbackDisplay feedback={task.feedback} scores={task.scores} type={task.type} />
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
      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = (e) => chunksRef.current.push(e.data)
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
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
      const fileName = `speaking/${task.id}_${Date.now()}.webm`
      const { error: uploadError } = await supabase.storage
        .from('voice-recordings')
        .upload(fileName, audioBlob, { contentType: 'audio/webm' })
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('voice-recordings').getPublicUrl(fileName)

      await onSubmit.mutateAsync({
        voice_url: urlData.publicUrl,
        response: { duration, recorded_at: new Date().toISOString() },
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
    <div className="space-y-6">
      {/* Topic & guiding questions */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">{content.topic || 'موضوع المحادثة'}</h2>
        {content.guiding_questions?.length > 0 && (
          <div className="space-y-2">
            <p className="text-muted text-sm font-medium">أسئلة إرشادية:</p>
            <ul className="space-y-2">
              {content.guiding_questions.map((q, i) => (
                <li key={i} className="flex items-start gap-2 text-white/80 text-sm">
                  <span className="text-primary font-bold mt-0.5">{i + 1}.</span>
                  {q}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Recording UI */}
      {!isSubmitted && (
        <div className="glass-card p-6 space-y-6">
          <div className="flex flex-col items-center gap-4">
            {/* Timer */}
            <div className="text-3xl font-mono text-white tabular-nums">{formatTime(duration)}</div>

            {/* Recording indicator */}
            {recording && (
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-red-400 text-sm">جاري التسجيل...</span>
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center gap-4">
              {!recording && !audioUrl && (
                <button onClick={startRecording} className="btn-primary flex items-center gap-2 px-6 py-3 text-lg">
                  <Mic className="w-5 h-5" />
                  ابدأ التسجيل
                </button>
              )}
              {recording && (
                <button onClick={stopRecording} className="btn-secondary flex items-center gap-2 px-6 py-3 bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30">
                  <Square className="w-5 h-5" />
                  إيقاف التسجيل
                </button>
              )}
              {audioUrl && !recording && (
                <>
                  <button onClick={resetRecording} className="btn-secondary flex items-center gap-2">
                    <RotateCcw className="w-4 h-4" />
                    إعادة التسجيل
                  </button>
                </>
              )}
            </div>

            {/* Playback */}
            {audioUrl && (
              <div className="w-full max-w-md">
                <audio src={audioUrl} controls className="w-full" />
                <p className="text-muted text-xs text-center mt-2">مدة التسجيل: {formatTime(duration)}</p>
              </div>
            )}
          </div>

          {/* Submit */}
          {audioUrl && !recording && (
            <div className="flex justify-center">
              <button
                onClick={handleSubmit}
                disabled={uploading || onSubmit.isPending}
                className="btn-primary flex items-center gap-2 px-8 py-3"
              >
                {uploading || onSubmit.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
                إرسال التسجيل
              </button>
            </div>
          )}
        </div>
      )}

      {/* Already submitted */}
      {isSubmitted && task.voice_url && (
        <div className="glass-card p-6 space-y-4">
          <h3 className="text-white font-medium">التسجيل المرسل</h3>
          <audio src={task.voice_url} controls className="w-full" />
        </div>
      )}
    </div>
  )
}

/* ─── Reading Task ───────────────────────────────────────────────── */
function ReadingTask({ task, content, isSubmitted, onSubmit }) {
  const [answers, setAnswers] = useState({})
  const [showResults, setShowResults] = useState(isSubmitted)
  const questions = content.questions || []

  function handleMCQChange(qIndex, value) {
    setAnswers((prev) => ({ ...prev, [qIndex]: value }))
  }

  function handleOpenChange(qIndex, value) {
    setAnswers((prev) => ({ ...prev, [qIndex]: value }))
  }

  async function handleSubmit() {
    await onSubmit.mutateAsync({ response: { answers } })
    setShowResults(true)
  }

  return (
    <div className="space-y-6">
      {/* Article */}
      <div className="glass-card p-6 space-y-4">
        {content.article_title && (
          <h2 className="text-lg font-semibold text-white">{content.article_title}</h2>
        )}
        {content.article_text && (
          <div className="text-white/80 leading-relaxed whitespace-pre-wrap text-sm">
            {content.article_text}
          </div>
        )}
      </div>

      {/* Questions */}
      <QuestionsUI
        questions={questions}
        answers={answers}
        showResults={showResults}
        isSubmitted={isSubmitted}
        onMCQChange={handleMCQChange}
        onOpenChange={handleOpenChange}
      />

      {/* Submit */}
      {!isSubmitted && (
        <div className="flex justify-center">
          <button
            onClick={handleSubmit}
            disabled={onSubmit.isPending}
            className="btn-primary flex items-center gap-2 px-8 py-3"
          >
            {onSubmit.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            إرسال الإجابات
          </button>
        </div>
      )}
    </div>
  )
}

/* ─── Writing Task ───────────────────────────────────────────────── */
function WritingTask({ task, content, isSubmitted, onSubmit }) {
  const [text, setText] = useState(task.response?.text || '')
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0
  const minWords = content.min_words || 0
  const maxWords = content.max_words || Infinity
  const isValidLength = wordCount >= minWords && wordCount <= (maxWords === Infinity ? Infinity : maxWords)

  async function handleSubmit() {
    await onSubmit.mutateAsync({ response: { text, word_count: wordCount } })
  }

  return (
    <div className="space-y-6">
      {/* Prompt */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">موضوع الكتابة</h2>
        <p className="text-white/80 leading-relaxed">{content.prompt}</p>
        {content.focus_areas?.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {content.focus_areas.map((area, i) => (
              <span key={i} className="badge-info px-3 py-1 rounded-full text-xs">
                {area}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-4 text-muted text-sm">
          {minWords > 0 && <span>الحد الأدنى: {minWords} كلمة</span>}
          {maxWords < Infinity && <span>الحد الأقصى: {maxWords} كلمة</span>}
        </div>
      </div>

      {/* Writing area */}
      <div className="glass-card p-6 space-y-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={isSubmitted}
          placeholder="اكتب هنا..."
          className="input-field w-full min-h-[300px] resize-y text-sm leading-relaxed"
          dir="auto"
        />
        <div className="flex items-center justify-between">
          <span className={`text-sm font-medium ${isValidLength ? 'text-emerald-400' : 'text-amber-400'}`}>
            عدد الكلمات: {wordCount}
          </span>
          {!isSubmitted && (
            <button
              onClick={handleSubmit}
              disabled={onSubmit.isPending || !text.trim() || !isValidLength}
              className="btn-primary flex items-center gap-2"
            >
              {onSubmit.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              إرسال الكتابة
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Listening Task ─────────────────────────────────────────────── */
function ListeningTask({ task, content, isSubmitted, onSubmit }) {
  const [answers, setAnswers] = useState({})
  const [showResults, setShowResults] = useState(isSubmitted)
  const questions = content.questions || []

  function handleMCQChange(qIndex, value) {
    setAnswers((prev) => ({ ...prev, [qIndex]: value }))
  }

  function handleOpenChange(qIndex, value) {
    setAnswers((prev) => ({ ...prev, [qIndex]: value }))
  }

  async function handleSubmit() {
    await onSubmit.mutateAsync({ response: { answers } })
    setShowResults(true)
  }

  const isYouTube = content.media_url && (content.media_url.includes('youtube.com') || content.media_url.includes('youtu.be'))
  const youtubeId = isYouTube ? extractYouTubeId(content.media_url) : null

  return (
    <div className="space-y-6">
      {/* Media */}
      <div className="glass-card p-6 space-y-4">
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
            <div className="flex items-center gap-2 text-white">
              <Volume2 className="w-5 h-5 text-amber-400" />
              <span className="font-medium">الملف الصوتي</span>
            </div>
            <audio src={content.media_url} controls className="w-full" />
          </div>
        ) : content.topic_description ? (
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-white">وصف الموضوع</h2>
            <p className="text-white/80 leading-relaxed">{content.topic_description}</p>
          </div>
        ) : null}
      </div>

      {/* Questions */}
      <QuestionsUI
        questions={questions}
        answers={answers}
        showResults={showResults}
        isSubmitted={isSubmitted}
        onMCQChange={handleMCQChange}
        onOpenChange={handleOpenChange}
      />

      {/* Submit */}
      {!isSubmitted && (
        <div className="flex justify-center">
          <button
            onClick={handleSubmit}
            disabled={onSubmit.isPending}
            className="btn-primary flex items-center gap-2 px-8 py-3"
          >
            {onSubmit.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            إرسال الإجابات
          </button>
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
  const [results, setResults] = useState([]) // { verb, pastSimple, pastParticiple, correct }
  const [finished, setFinished] = useState(isSubmitted)

  const currentVerb = verbs[currentIndex]
  const total = verbs.length || 5

  function checkAndNext() {
    if (!revealed) {
      // Reveal the answer
      const isCorrect =
        pastSimple.trim().toLowerCase() === (currentVerb.past_simple || '').toLowerCase() &&
        pastParticiple.trim().toLowerCase() === (currentVerb.past_participle || '').toLowerCase()
      setResults((prev) => [
        ...prev,
        {
          verb: currentVerb.base,
          userPastSimple: pastSimple.trim(),
          userPastParticiple: pastParticiple.trim(),
          correctPastSimple: currentVerb.past_simple,
          correctPastParticiple: currentVerb.past_participle,
          correct: isCorrect,
        },
      ])
      setRevealed(true)
    } else {
      // Move to next
      if (currentIndex < total - 1) {
        setCurrentIndex((i) => i + 1)
        setPastSimple('')
        setPastParticiple('')
        setRevealed(false)
      } else {
        setFinished(true)
      }
    }
  }

  const score = results.filter((r) => r.correct).length

  async function handleSubmit() {
    await onSubmit.mutateAsync({
      response: { results, score, total },
    })
  }

  if (verbs.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <p className="text-muted">لا توجد أفعال في هذه المهمة</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {!finished ? (
        <>
          {/* Progress */}
          <div className="glass-card p-4">
            <div className="flex items-center justify-between text-sm text-muted mb-2">
              <span>الفعل {currentIndex + 1} من {total}</span>
              <span>الإجابات الصحيحة: {results.filter((r) => r.correct).length}</span>
            </div>
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${((currentIndex + (revealed ? 1 : 0)) / total) * 100}%` }}
              />
            </div>
          </div>

          {/* Flashcard */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="glass-card p-8 space-y-6"
            >
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-white">{currentVerb.base}</h2>
                {currentVerb.arabic && (
                  <p className="text-muted text-lg">{currentVerb.arabic}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
                <div className="space-y-2">
                  <label className="text-sm text-muted">Past Simple</label>
                  <input
                    type="text"
                    value={pastSimple}
                    onChange={(e) => setPastSimple(e.target.value)}
                    disabled={revealed}
                    placeholder="أدخل الماضي البسيط"
                    className="input-field w-full text-center"
                    dir="ltr"
                  />
                  {revealed && (
                    <div className="flex items-center justify-center gap-1 text-sm">
                      {pastSimple.trim().toLowerCase() === (currentVerb.past_simple || '').toLowerCase() ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 text-red-400" />
                          <span className="text-emerald-400">{currentVerb.past_simple}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-muted">Past Participle</label>
                  <input
                    type="text"
                    value={pastParticiple}
                    onChange={(e) => setPastParticiple(e.target.value)}
                    disabled={revealed}
                    placeholder="أدخل التصريف الثالث"
                    className="input-field w-full text-center"
                    dir="ltr"
                  />
                  {revealed && (
                    <div className="flex items-center justify-center gap-1 text-sm">
                      {pastParticiple.trim().toLowerCase() === (currentVerb.past_participle || '').toLowerCase() ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 text-red-400" />
                          <span className="text-emerald-400">{currentVerb.past_participle}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-center">
                <button onClick={checkAndNext} className="btn-primary flex items-center gap-2 px-6 py-3">
                  {!revealed ? (
                    <>تحقق</>
                  ) : currentIndex < total - 1 ? (
                    <>
                      التالي
                      <ChevronLeft className="w-4 h-4" />
                    </>
                  ) : (
                    <>عرض النتيجة</>
                  )}
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </>
      ) : (
        /* Summary */
        <div className="space-y-6">
          <div className="glass-card p-8 text-center space-y-4">
            <Award className="w-16 h-16 text-amber-400 mx-auto" />
            <h2 className="text-2xl font-bold text-white">النتيجة النهائية</h2>
            <div className="text-4xl font-bold text-primary">{score} / {total}</div>
            <p className="text-muted">
              {score === total ? 'ممتاز! أجبت على جميع الأفعال بشكل صحيح' :
               score >= total / 2 ? 'أحسنت! واصل التمرين' :
               'حاول مراجعة الأفعال والمحاولة مرة أخرى'}
            </p>
          </div>

          {/* Results list */}
          <div className="glass-card p-6 space-y-3">
            <h3 className="text-white font-medium mb-4">تفاصيل الإجابات</h3>
            {results.map((r, i) => (
              <div
                key={i}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  r.correct ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  {r.correct ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  )}
                  <span className="text-white font-medium">{r.verb}</span>
                </div>
                <div className="text-sm text-muted" dir="ltr">
                  {r.correctPastSimple} / {r.correctPastParticiple}
                </div>
              </div>
            ))}
          </div>

          {/* Submit */}
          {!isSubmitted && (
            <div className="flex justify-center">
              <button
                onClick={handleSubmit}
                disabled={onSubmit.isPending}
                className="btn-primary flex items-center gap-2 px-8 py-3"
              >
                {onSubmit.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                إرسال النتيجة
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Shared Questions UI (Reading / Listening) ──────────────────── */
function QuestionsUI({ questions, answers, showResults, isSubmitted, onMCQChange, onOpenChange }) {
  if (!questions.length) return null

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">الأسئلة</h3>
      {questions.map((q, i) => (
        <div key={i} className="glass-card p-5 space-y-3">
          <p className="text-white font-medium">
            <span className="text-primary ml-2">{i + 1}.</span>
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
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all hover:translate-y-[-2px] ${
                      isCorrectOption
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : isWrongSelection
                        ? 'bg-red-500/10 border-red-500/30'
                        : selected
                        ? 'bg-primary/10 border-primary/30'
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q-${i}`}
                      value={opt}
                      checked={selected}
                      onChange={() => onMCQChange(i, opt)}
                      disabled={isSubmitted}
                      className="accent-primary"
                    />
                    <span className="text-white/80 text-sm">{opt}</span>
                    {isCorrectOption && <CheckCircle2 className="w-4 h-4 text-emerald-400 mr-auto" />}
                    {isWrongSelection && <XCircle className="w-4 h-4 text-red-400 mr-auto" />}
                  </label>
                )
              })}
              {showResults && q.explanation && (
                <p className="text-muted text-xs mt-2 p-2 bg-white/5 rounded-lg">{q.explanation}</p>
              )}
            </div>
          ) : (
            /* Open question */
            <div>
              <textarea
                value={answers[i] || ''}
                onChange={(e) => onOpenChange(i, e.target.value)}
                disabled={isSubmitted}
                placeholder="اكتب إجابتك هنا..."
                className="input-field w-full min-h-[100px] resize-y text-sm"
                dir="auto"
              />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/* ─── AI Feedback Display ────────────────────────────────────────── */
function FeedbackDisplay({ feedback, scores, type }) {
  const feedbackData = typeof feedback === 'string' ? JSON.parse(feedback) : feedback
  const scoresData = typeof scores === 'string' ? JSON.parse(scores) : scores || {}

  const scoreEntries = []
  if (scoresData.overall != null) scoreEntries.push({ label: 'الدرجة الكلية', value: scoresData.overall })
  if (scoresData.grammar != null) scoreEntries.push({ label: 'القواعد', value: scoresData.grammar })
  if (scoresData.vocabulary != null) scoreEntries.push({ label: 'المفردات', value: scoresData.vocabulary })
  if (type === 'speaking' && scoresData.fluency != null) scoreEntries.push({ label: 'الطلاقة', value: scoresData.fluency })

  return (
    <div className="glass-card p-6 space-y-6 border-primary/20">
      <div className="flex items-center gap-2">
        <Award className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-white">تقييم الذكاء الاصطناعي</h3>
      </div>

      {/* Scores */}
      {scoreEntries.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {scoreEntries.map((s, i) => (
            <div key={i} className="stat-card text-center p-4">
              <div className="text-2xl font-bold text-primary">{s.value}</div>
              <div className="text-muted text-xs mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Suggestions */}
      {feedbackData?.suggestions?.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-white font-medium text-sm">اقتراحات للتحسين</h4>
          <ul className="space-y-2">
            {feedbackData.suggestions.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-white/70 text-sm">
                <ChevronLeft className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Corrected text */}
      {feedbackData?.corrected_text && (
        <div className="space-y-2">
          <h4 className="text-white font-medium text-sm">النص المصحح</h4>
          <div className="bg-white/5 rounded-lg p-4 text-white/80 text-sm leading-relaxed whitespace-pre-wrap" dir="auto">
            {feedbackData.corrected_text}
          </div>
        </div>
      )}

      {/* General comment */}
      {feedbackData?.comment && (
        <p className="text-white/70 text-sm leading-relaxed">{feedbackData.comment}</p>
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
