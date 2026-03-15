import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic, MicOff, Play, Pause, Loader2, Zap, Calendar,
  MessageSquare, CheckCircle2, AlertCircle, BookOpen,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { invokeWithRetry } from '../../lib/invokeWithRetry'

const TOPICS = [
  'أخبرنا عن يومك',
  'ماذا تعلمت اليوم؟',
  'صف مكانك المفضل',
  'أخبرنا عن هوايتك',
  'ماذا أكلت اليوم؟',
  'صف صديقك المفضل',
  'ماذا تحب في تعلم الإنجليزي؟',
  'أخبرنا عن عطلة نهاية الأسبوع',
]

const MOODS = [
  { value: 'great', label: 'ممتاز', emoji: '😄' },
  { value: 'good', label: 'جيد', emoji: '🙂' },
  { value: 'okay', label: 'عادي', emoji: '😐' },
  { value: 'struggling', label: 'صعب', emoji: '😓' },
]

export default function StudentVoiceJournal() {
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const [recording, setRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState(null)
  const [audioUrl, setAudioUrl] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [topic, setTopic] = useState('')
  const [mood, setMood] = useState('')
  const [result, setResult] = useState(null)
  const [duration, setDuration] = useState(0)
  const mediaRecorderRef = useRef(null)
  const audioRef = useRef(null)
  const timerRef = useRef(null)
  const chunksRef = useRef([])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const { data: journals, isLoading } = useQuery({
    queryKey: ['voice-journals'],
    queryFn: async () => {
      const { data } = await supabase
        .from('voice_journals')
        .select('*')
        .eq('student_id', profile?.id)
        .order('created_at', { ascending: false })
        .limit(20)
      return data || []
    },
    enabled: !!profile?.id,
  })

  const todayEntry = journals?.find(j => {
    const d = new Date(j.created_at)
    const today = new Date()
    return d.toDateString() === today.toDateString()
  })

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        if (audioUrl) URL.revokeObjectURL(audioUrl)
        setAudioUrl(URL.createObjectURL(blob))
        stream.getTracks().forEach(t => t.stop())
      }

      mediaRecorder.start()
      setRecording(true)
      setDuration(0)
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000)
    } catch {
      alert('لم نتمكن من الوصول للميكروفون')
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    setRecording(false)
    clearInterval(timerRef.current)
  }

  function togglePlay() {
    if (!audioRef.current) return
    if (playing) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setPlaying(!playing)
  }

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!audioBlob) throw new Error('No audio')

      // Upload to Supabase Storage
      const fileName = `voice-journals/${profile?.id}/${Date.now()}.webm`
      const { data: upload, error: uploadErr } = await supabase.storage
        .from('submissions')
        .upload(fileName, audioBlob, { contentType: 'audio/webm' })

      if (uploadErr) throw uploadErr

      const { data: urlData } = supabase.storage.from('submissions').getPublicUrl(fileName)
      const publicUrl = urlData.publicUrl

      // Process with edge function
      const res = await invokeWithRetry('process-voice-journal', {
        body: {
          student_id: profile?.id,
          audio_url: publicUrl,
          duration_seconds: duration,
          topic: topic || TOPICS[Math.floor(Math.random() * TOPICS.length)],
          mood,
        },
        
      })

      if (res.error) throw new Error(typeof res.error === 'object' ? (res.error.message || 'Processing failed') : String(res.error))
      return res.data
    },
    onSuccess: (data) => {
      setResult(data)
      queryClient.invalidateQueries({ queryKey: ['voice-journals'] })
    },
    onError: (err) => {
      console.error('Voice journal error:', err)
    },
  })

  function resetRecording() {
    setAudioBlob(null)
    setAudioUrl(null)
    setResult(null)
    setDuration(0)
    setPlaying(false)
  }

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-page-title flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <Mic size={20} className="text-violet-400" />
          </div>
          يومياتي الصوتية
        </h1>
        <p className="text-muted text-sm mt-1">سجّل مقطع صوتي يومي بالإنجليزي واحصل على تقييم فوري</p>
      </div>

      {/* Recording card */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-7">
        {todayEntry && !result ? (
          <div className="text-center py-4">
            <CheckCircle2 size={48} className="mx-auto text-emerald-400 mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">سجّلت يومياتك اليوم!</h3>
            <p className="text-muted text-sm">درجة الطلاقة: {todayEntry.fluency_score}% — +{todayEntry.xp_awarded} XP</p>
          </div>
        ) : result ? (
          // Result view
          <div className="space-y-4">
            <div className="text-center">
              <div className={`text-4xl font-bold mb-1 ${
                result.fluency_score >= 80 ? 'text-emerald-400' : result.fluency_score >= 60 ? 'text-sky-400' : 'text-gold-400'
              }`}>
                {result.fluency_score}%
              </div>
              <p className="text-muted text-sm">درجة الطلاقة</p>
              <div className="flex items-center justify-center gap-1 mt-1 text-violet-400">
                <Zap size={14} />
                <span className="text-sm font-bold">+{result.xp_awarded} XP</span>
              </div>
            </div>

            {result.feedback && (
              <div className="rounded-xl p-3" style={{ background: 'var(--color-bg-surface-raised)' }}>
                <p className="text-sm text-white leading-relaxed">{result.feedback}</p>
              </div>
            )}

            {result.corrections?.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-white mb-2">تصحيحات:</h4>
                <div className="space-y-2">
                  {result.corrections.map((c, i) => (
                    <div key={i} className="rounded-lg p-2 text-xs" style={{ background: 'var(--color-bg-surface-raised)' }}>
                      <p className="text-red-400 line-through">{c.original}</p>
                      <p className="text-emerald-400">{c.corrected}</p>
                      {c.explanation && <p className="text-muted mt-1">{c.explanation}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.transcript && (
              <div>
                <h4 className="text-xs font-medium text-white mb-1">النص المُستخرج:</h4>
                <p className="text-xs text-muted rounded-lg p-2" dir="ltr" style={{ background: 'var(--color-bg-surface-raised)' }}>{result.transcript}</p>
              </div>
            )}

            <button onClick={resetRecording} className="btn-primary w-full text-sm py-2">
              تسجيل آخر
            </button>
          </div>
        ) : (
          // Recording UI
          <div className="space-y-4">
            {/* Topic selector */}
            <div>
              <label className="text-xs text-muted mb-1 block">الموضوع (اختياري):</label>
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="input-field w-full text-sm"
              >
                <option value="">حرّ — تحدث عن أي شيء</option>
                {TOPICS.map((t, i) => (
                  <option key={i} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Mood */}
            <div>
              <label className="text-xs text-muted mb-1 block">كيف تحس اليوم؟</label>
              <div className="flex gap-2">
                {MOODS.map(m => (
                  <button
                    key={m.value}
                    onClick={() => setMood(m.value)}
                    className={`flex-1 text-center py-2 rounded-xl text-sm transition-all ${
                      mood === m.value ? 'bg-sky-500/20 border border-sky-500/30 text-white' : 'bg-white/5 text-muted hover:text-white'
                    }`}
                  >
                    <span className="text-lg">{m.emoji}</span>
                    <p className="text-xs mt-0.5">{m.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Record button */}
            <div className="text-center py-4">
              {!audioBlob ? (
                <>
                  <button
                    onClick={recording ? stopRecording : startRecording}
                    className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto transition-all ${
                      recording
                        ? 'bg-red-500 animate-pulse shadow-lg shadow-red-500/30'
                        : 'bg-violet-500/20 border-2 border-violet-500/40 hover:bg-violet-500/30'
                    }`}
                  >
                    {recording ? <MicOff size={32} className="text-white" /> : <Mic size={32} className="text-violet-400" />}
                  </button>
                  <p className="text-muted text-sm mt-3">
                    {recording ? `جاري التسجيل... ${formatTime(duration)}` : 'اضغط للبدء'}
                  </p>
                  {recording && (
                    <p className="text-xs text-muted mt-1">تحدث بالإنجليزي لمدة 30 ثانية على الأقل</p>
                  )}
                </>
              ) : (
                <>
                  {/* Playback */}
                  <audio ref={audioRef} src={audioUrl} onEnded={() => setPlaying(false)} />
                  <div className="flex items-center justify-center gap-4 mb-4">
                    <button onClick={togglePlay} className="w-12 h-12 rounded-full bg-sky-500/20 flex items-center justify-center">
                      {playing ? <Pause size={20} className="text-sky-400" /> : <Play size={20} className="text-sky-400" />}
                    </button>
                    <span className="text-sm text-muted">{formatTime(duration)}</span>
                  </div>

                  {submitMutation.isError && (
                    <p className="text-red-400 text-xs text-center mb-2">حدث خطأ أثناء التحليل — حاول مرة أخرى</p>
                  )}
                  <div className="flex gap-2">
                    <button onClick={resetRecording} className="flex-1 text-sm py-2.5 rounded-xl bg-white/5 text-muted hover:text-white transition-all">
                      إعادة تسجيل
                    </button>
                    <button
                      onClick={() => submitMutation.mutate()}
                      disabled={submitMutation.isPending}
                      className="flex-1 btn-primary text-sm py-2.5 flex items-center justify-center gap-2"
                    >
                      {submitMutation.isPending ? (
                        <><Loader2 size={14} className="animate-spin" /> يحلل...</>
                      ) : (
                        <><CheckCircle2 size={14} /> إرسال للتقييم</>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* History */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-16 w-full rounded-xl" />)}
        </div>
      ) : null}
      {!isLoading && journals?.length > 0 && (
        <div>
          <h2 className="text-section-title mb-3 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 flex items-center justify-center">
              <Calendar size={16} className="text-sky-400" />
            </div>
            السجلات السابقة
          </h2>
          <div className="space-y-2">
            {journals.map((journal, i) => (
              <motion.div
                key={journal.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="glass-card p-3 hover:translate-y-[-2px] transition-all duration-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      journal.fluency_score >= 80 ? 'bg-emerald-500/10 text-emerald-400' :
                      journal.fluency_score >= 60 ? 'bg-sky-500/10 text-sky-400' :
                      'bg-gold-500/10 text-gold-400'
                    }`}>
                      <span className="text-sm font-bold">{journal.fluency_score}</span>
                    </div>
                    <div>
                      <p className="text-sm text-white">{journal.topic || 'حرّ'}</p>
                      <p className="text-xs text-muted">
                        {new Date(journal.created_at).toLocaleDateString('ar-SA')} — {formatTime(journal.duration_seconds || 0)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {journal.mood && <span className="text-lg">{MOODS.find(m => m.value === journal.mood)?.emoji}</span>}
                    <span className="text-xs text-violet-400">+{journal.xp_awarded} XP</span>
                  </div>
                </div>
                {journal.ai_feedback && (
                  <p className="text-xs text-muted mt-2 mr-13">{journal.ai_feedback}</p>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
