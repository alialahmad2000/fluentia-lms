import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Headphones, Play, Pause, SkipBack, SkipForward, Eye, EyeOff, CheckCircle, XCircle, RotateCcw, History } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'
import { useAuthStore } from '../../../../stores/authStore'
import { toast } from '../../../../components/ui/FluentiaToast'
import { awardCurriculumXP } from '../../../../utils/curriculumXP'
import XPBadgeInline from '../../../../components/xp/XPBadgeInline'
import SmartAudioPlayer from '../../../../components/audio/SmartAudioPlayer'
import { VocabPopup } from '../../../../components/audio/VocabPopup'
import { OnePlayBanner } from '../../../../components/audio/parts/OnePlayBanner'
import { useListeningTranscriptAudio } from '../../../../hooks/useListeningTranscriptAudio'
import { trackEvent } from '../../../../lib/trackEvent'
import { useWordHighlights } from '../../../../hooks/useWordHighlights'
import { useUnitVocabSet } from '../../../../hooks/useUnitVocabSet'
import { WordActionMenu } from '../../../../components/audio/parts/WordActionMenu'
import { WordTooltip } from '../../../../components/audio/parts/WordTooltip'
import { findWordTimestamp, resolveVoiceLabel } from '../../../../lib/findWordTimestamp'

const QUESTION_TYPE_LABELS = {
  main_idea: 'الفكرة الرئيسية',
  detail: 'تفاصيل',
  vocabulary: 'مفردات',
  inference: 'استنتاج',
}

const QUESTION_TYPE_COLORS = {
  main_idea: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  detail: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  vocabulary: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  inference: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
}

// ─── Main Component ─────────────────────────────────
export default function ListeningTab({ unitId }) {
  const { user } = useAuthStore()

  const { data: listenings, isLoading } = useQuery({
    queryKey: ['unit-listening', unitId],
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curriculum_listening')
        .select('*')
        .eq('unit_id', unitId)
        .order('sort_order')
      if (error) throw error
      return data || []
    },
    enabled: !!unitId,
  })

  if (isLoading) return <ListeningSkeleton />

  if (!listenings?.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <Headphones size={40} className="text-[var(--text-muted)]" />
        <p className="text-[var(--text-muted)] font-['Tajawal']">محتوى الاستماع غير متاح لهذه الوحدة بعد</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {listenings.map((listening) => (
        <ListeningSection key={listening.id} listening={listening} studentId={user?.id} unitId={unitId} />
      ))}
    </div>
  )
}

// ─── Listening Section ───────────────────────────────
// Replaces legacy AudioPlayer with SmartAudioPlayer (bottom-bar variant).
// Fixes multi-speaker bug: loads ALL segments from listening_audio table.
// Preserves: exercises, completion tracking (ListeningExercises unchanged).
function ListeningSection({ listening, studentId, unitId }) {
  // All hooks before any conditional returns
  const { segments, loading: audioLoading } = useListeningTranscriptAudio(listening.id)
  const [vocabPopup, setVocabPopup] = useState(null)
  const [wordTooltip, setWordTooltip] = useState(null)
  const [actionMenu, setActionMenu] = useState(null)
  const [onePlayMode, setOnePlayMode] = useState(false)
  const [hasPlayed, setHasPlayed] = useState(false)
  const audioPlayStartedRef = useRef(false)
  const hoverCache = useRef(new Map())

  // Vocab set for the listening item's unit
  const { vocabSet } = useUnitVocabSet(listening.unit_id)

  const { highlights, lookup: highlightLookup, addHighlight, removeHighlight, updateColor, addNote } = useWordHighlights({
    studentId,
    contentId: listening.id,
    contentType: 'listening',
  })

  const exercises = (listening.exercises || []).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

  const handleWordHover = useCallback(async (word, segIdx, wordIdx, el, setTooltip) => {
    const cached = hoverCache.current.get(word)
    if (cached !== undefined) { setTooltip(cached); return }
    const { data } = await supabase
      .from('curriculum_vocabulary')
      .select('word, definition_ar, pronunciation_ipa')
      .ilike('word', word).limit(1).maybeSingle()
    hoverCache.current.set(word, data || null)
    setTooltip(data || null)
  }, [])

  const handleWordLongPress = useCallback((word, segIdx, wordIdx, position) => {
    const clean = word.toLowerCase().replace(/[.,!?;:'"()[\]]/g, '')
    const existingHighlight = wordIdx != null ? highlightLookup?.get(`${segIdx}:${wordIdx}`) : null
    setActionMenu({ word: clean, segIdx, wordIdx, position, existingHighlight })
    trackEvent('listening_word_lookup', { transcript_id: listening.id, word: clean, segment_index: segIdx })
  }, [listening.id, highlightLookup])

  const handleWordTap = useCallback((word, segIdx, wordIdx, startMs) => {
    if (onePlayMode) return
    trackEvent('listening_word_seek', { transcript_id: listening.id, word, segment_index: segIdx })
  }, [onePlayMode, listening.id])

  // Vocab word quick tap → instant WordTooltip
  const handleVocabWordTap = useCallback(async (word, segIdx, wordIdx, anchorEl, position) => {
    if (onePlayMode) return
    const cached = hoverCache.current.get('full:' + word)

    // Find in-context audio from listening segments (segment-local wordIdx)
    const ts = segments?.length ? findWordTimestamp(segments, segIdx, wordIdx) : null
    const inContextAudio = ts ? {
      audioUrl:   ts.audioUrl,
      startMs:    ts.startMs,
      endMs:      ts.endMs,
      voiceLabel: resolveVoiceLabel(ts.voiceId, ts.speakerLabel),
    } : null

    if (cached) { setWordTooltip({ vocab: cached, inContextAudio, anchorEl, position }); return }
    const { data } = await supabase
      .from('curriculum_vocabulary')
      .select('id, word, definition_ar, pronunciation_ipa, audio_url, example_sentence, image_url')
      .ilike('word', word).limit(1).maybeSingle()
    hoverCache.current.set('full:' + word, data || null)
    if (data) {
      setWordTooltip({ vocab: data, inContextAudio, anchorEl, position })
      trackEvent('listening_vocab_tap', { word, transcript_id: listening.id, has_context_audio: !!inContextAudio })
    }
  }, [onePlayMode, listening.id, segments])

  const handleSegmentComplete = useCallback((segIdx) => {
    if (!audioPlayStartedRef.current) {
      audioPlayStartedRef.current = true
      trackEvent('listening_audio_play_start', { transcript_id: listening.id })
    }
    trackEvent('listening_segment_complete', {
      transcript_id: listening.id,
      segment_index: segIdx,
      total_segments: segments.length,
    })
  }, [listening.id, segments.length])

  const handlePlaybackComplete = useCallback(() => {
    setHasPlayed(true)
    trackEvent('listening_audio_complete', {
      transcript_id: listening.id,
      total_segments: segments.length,
      one_play_mode: onePlayMode,
    })
  }, [listening.id, segments.length, onePlayMode])

  const handleAction = useCallback(async (action, payload) => {
    if (!actionMenu) return
    const { word, segIdx, wordIdx, existingHighlight } = actionMenu
    if (action === 'lookup') {
      setActionMenu(null)
      setVocabPopup({ word, position: actionMenu.position })
    } else if (action === 'highlight') {
      if (existingHighlight) await updateColor(existingHighlight.id, payload)
      else await addHighlight({ segmentIndex: segIdx, wordIndexStart: wordIdx, wordIndexEnd: wordIdx, wordText: word, color: payload })
      setActionMenu(null)
    } else if (action === 'remove-highlight') {
      if (existingHighlight) await removeHighlight(existingHighlight.id)
      setActionMenu(null)
    } else if (action === 'note') {
      const note = window.prompt('ملاحظتك على هذه الكلمة:', existingHighlight?.note || '')
      if (note !== null) {
        if (existingHighlight) await addNote(existingHighlight.id, note)
        else if (note) await addHighlight({ segmentIndex: segIdx, wordIndexStart: wordIdx, wordIndexEnd: wordIdx, wordText: word, color: 'yellow', note })
      }
      setActionMenu(null)
    }
  }, [actionMenu, addHighlight, removeHighlight, updateColor, addNote])

  return (
    <div className="space-y-5 pb-[100px]">
      {/* Title + one-play toggle */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-1 min-w-0">
          <h2 className="text-lg font-bold text-[var(--text-primary)] font-['Inter']" dir="ltr">
            {listening.title_en || 'Listening'}
          </h2>
          {listening.title_ar && (
            <p className="text-sm text-[var(--text-muted)] font-['Tajawal']">{listening.title_ar}</p>
          )}
          {listening.audio_type && (
            <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 font-['Inter']">
              {listening.audio_type}
            </span>
          )}
        </div>
        <button
          onClick={() => { setOnePlayMode(v => !v); setHasPlayed(false) }}
          className={`text-xs px-3 py-1.5 rounded-full border transition-colors flex-shrink-0 font-['Tajawal'] ${
            onePlayMode ? 'border-amber-500/50 text-amber-300 bg-amber-500/10' : 'border-slate-600 text-slate-400 hover:text-slate-300'
          }`}
        >
          {onePlayMode ? '✓ وضع الامتحان' : '🎯 محاكاة IELTS'}
        </button>
      </div>

      {/* One-play banner */}
      <OnePlayBanner
        enabled={onePlayMode}
        hasPlayed={hasPlayed}
        onDisable={() => { setOnePlayMode(false); setHasPlayed(false) }}
      />

      {/* Audio player */}
      {audioLoading ? (
        <div className="h-48 rounded-2xl animate-pulse" style={{ background: 'var(--surface-raised)' }} />
      ) : segments.length > 0 ? (
        <SmartAudioPlayer
          segments={segments}
          contentId={listening.id}
          contentType="listening"
          studentId={studentId}
          variant="bottom-bar"
          showTranscriptByDefault={false}
          features={{
            karaoke: !onePlayMode,
            speedControl: !onePlayMode,
            skipButtons: !onePlayMode,
            sentenceNav: !onePlayMode,
            paragraphNav: !onePlayMode,
            sentenceMode: false,
            abLoop: !onePlayMode,
            bookmarks: !onePlayMode,
            speakerLabels: true,
            hideTranscript: true,
            keyboardShortcuts: !onePlayMode,
            mobileGestures: !onePlayMode,
            dictation: !onePlayMode,
            autoResume: !onePlayMode,
            playbackHistory: true,
            wordClickToLookup: !onePlayMode,
            onePlayMode,
          }}
          onWordTap={handleWordTap}
          onWordLongPress={(word, segIdx, wordIdx, pos) => handleWordLongPress(word, segIdx, wordIdx, pos)}
          onWordHover={handleWordHover}
          onVocabWordTap={handleVocabWordTap}
          highlightLookup={highlightLookup}
          vocabSet={vocabSet}
          onSegmentComplete={handleSegmentComplete}
          onPlaybackComplete={handlePlaybackComplete}
        />
      ) : (
        /* No segments in listening_audio — show legacy audio_url fallback */
        listening.audio_url ? (
          <AudioPlayer url={listening.audio_url} duration={listening.audio_duration_seconds} />
        ) : (
          <div
            className="rounded-xl p-5 flex flex-col items-center gap-3"
            style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
          >
            <Headphones size={24} className="text-purple-400" />
            <p className="text-sm text-[var(--text-muted)] font-['Tajawal']">المقطع الصوتي غير متاح حالياً</p>
          </div>
        )
      )}

      {/* Word action menu */}
      {actionMenu && (
        <WordActionMenu
          word={actionMenu.word}
          position={actionMenu.position}
          existingHighlight={actionMenu.existingHighlight}
          onAction={handleAction}
          onClose={() => setActionMenu(null)}
        />
      )}

      {/* VocabPopup (from "lookup" action) */}
      {vocabPopup && (
        <VocabPopup
          word={vocabPopup.word}
          readingId={listening.id}
          isOpen={true}
          onClose={() => setVocabPopup(null)}
          anchorPosition={vocabPopup.position}
        />
      )}

      {/* Vocab tap tooltip */}
      {wordTooltip && (
        <WordTooltip
          word={wordTooltip.vocab.word}
          definition_ar={wordTooltip.vocab.definition_ar}
          ipa={wordTooltip.vocab.pronunciation_ipa}
          audio_url={wordTooltip.vocab.audio_url}
          example_sentence={wordTooltip.vocab.example_sentence}
          image_url={wordTooltip.vocab.image_url}
          inContextAudio={wordTooltip.inContextAudio || null}
          anchorEl={wordTooltip.anchorEl}
          onClose={() => setWordTooltip(null)}
          onMoreInfo={() => {
            setVocabPopup({ word: wordTooltip.vocab.word, position: wordTooltip.position })
            setWordTooltip(null)
          }}
        />
      )}

      {/* Exercises — PRESERVED UNCHANGED */}
      {exercises.length > 0 && (
        <ListeningExercises exercises={exercises} studentId={studentId} unitId={unitId} listeningId={listening.id} />
      )}
    </div>
  )
}

// ─── Audio Player ────────────────────────────────────
function AudioPlayer({ url, duration: initialDuration }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(initialDuration || 0)
  const [speed, setSpeed] = useState(1)

  useEffect(() => {
    const audio = new Audio(url)
    audioRef.current = audio

    audio.addEventListener('loadedmetadata', () => setDuration(audio.duration))
    audio.addEventListener('timeupdate', () => setCurrentTime(audio.currentTime))
    audio.addEventListener('ended', () => setPlaying(false))

    return () => {
      audio.pause()
      audio.removeAttribute('src')
    }
  }, [url])

  const togglePlay = () => {
    if (!audioRef.current) return
    if (playing) {
      audioRef.current.pause()
    } else {
      audioRef.current.play().catch(() => {})
    }
    setPlaying(!playing)
  }

  const skip = (seconds) => {
    if (!audioRef.current) return
    audioRef.current.currentTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds))
  }

  const seek = (e) => {
    if (!audioRef.current || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    audioRef.current.currentTime = pct * duration
  }

  const changeSpeed = () => {
    const speeds = [0.75, 1, 1.25, 1.5]
    const nextIdx = (speeds.indexOf(speed) + 1) % speeds.length
    const newSpeed = speeds[nextIdx]
    setSpeed(newSpeed)
    if (audioRef.current) audioRef.current.playbackRate = newSpeed
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div
      className="rounded-xl p-5 space-y-4"
      style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
    >
      <div className="flex items-center gap-2">
        <Headphones size={16} className="text-purple-400" />
        <span className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal']">استمع للمقطع</span>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div
          className="w-full h-2 rounded-full bg-[rgba(255,255,255,0.06)] cursor-pointer relative overflow-hidden"
          onClick={seek}
        >
          <div
            className="h-full rounded-full bg-purple-500 transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-[var(--text-muted)] font-['Inter']">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => skip(-10)}
          className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.05)] transition-colors"
          title="-10 ثواني"
        >
          <SkipBack size={18} />
        </button>
        <button
          onClick={togglePlay}
          className="w-14 h-14 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center hover:bg-purple-500/30 transition-colors"
        >
          {playing ? <Pause size={24} /> : <Play size={24} className="ml-0.5" />}
        </button>
        <button
          onClick={() => skip(10)}
          className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.05)] transition-colors"
          title="+10 ثواني"
        >
          <SkipForward size={18} />
        </button>
      </div>

      {/* Speed */}
      <div className="flex justify-center">
        <button
          onClick={changeSpeed}
          className="px-3 h-7 rounded-lg text-[11px] font-bold bg-[var(--surface-base)] text-[var(--text-muted)] border border-[var(--border-subtle)] hover:text-purple-400 transition-colors font-['Inter']"
        >
          {speed}x
        </button>
      </div>
    </div>
  )
}

// ─── Listening Exercises ─────────────────────────────
// Uses INSERT-per-attempt model (same as Grammar's ExerciseSection) to prevent
// the phantom-submit-on-reload bug. Each retry creates a new DB row instead of
// overwriting the previous one via upsert.
function ListeningExercises({ exercises, studentId, unitId, listeningId }) {
  const [answers, setAnswers] = useState({})
  const [progressLoading, setProgressLoading] = useState(true)
  const [isCompleted, setIsCompleted] = useState(false)
  const [attemptNumber, setAttemptNumber] = useState(1)
  const [allAttempts, setAllAttempts] = useState([])
  const [retrying, setRetrying] = useState(false)
  const [bestScore, setBestScore] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const currentRowId = useRef(null)
  const hasSaved = useRef(false)
  const timeRef = useRef(0)
  const timerRef = useRef(null)
  const prevAnsweredRef = useRef(0)

  const total = exercises.length
  // Only count answers where the student actually selected an option (not null).
  // This is the core phantom fix: null-restored answers must NOT count as answered.
  const answered = Object.values(answers).filter(a => a.selected !== null && a.selected !== undefined).length
  const correctCount = Object.values(answers).filter(a => a.correct).length
  const allAnswered = answered === total && total > 0

  // Time tracker
  useEffect(() => {
    timerRef.current = setInterval(() => { timeRef.current += 1 }, 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  // Load saved progress — multi-row query (same pattern as ExerciseSection)
  useEffect(() => {
    if (!studentId || !listeningId) { setProgressLoading(false); return }
    let isMounted = true
    const load = async () => {
      const { data: rows } = await supabase
        .from('student_curriculum_progress')
        .select('*')
        .eq('student_id', studentId)
        .eq('listening_id', listeningId)
        .order('attempt_number', { ascending: false })
      if (!isMounted) return

      if (rows && rows.length > 0) {
        setAllAttempts(rows)
        const latest = rows.find(r => r.is_latest) || rows[0]
        const best = rows.reduce((b, r) => (r.score || 0) > (b?.score || 0) ? r : b, rows[0])
        setBestScore(best?.score ?? null)
        setAttemptNumber(latest.attempt_number || 1)

        if (latest.status === 'completed') {
          setIsCompleted(true)
          hasSaved.current = true
          // DON'T restore answers — student starts fresh on next attempt
        } else {
          // in_progress: restore ONLY questions that were actually answered (non-null).
          // Phantom fix: old code restored null-selected answers and counted them as
          // "answered", making the submit button active with 0% score ready to fire.
          currentRowId.current = latest.id
          if (latest.answers?.questions) {
            const restored = {}
            latest.answers.questions.forEach(q => {
              if (q.studentAnswer !== null && q.studentAnswer !== undefined) {
                restored[q.questionIndex] = { selected: q.studentAnswer, correct: q.isCorrect }
              }
            })
            if (Object.keys(restored).length > 0) {
              setAnswers(restored)
              prevAnsweredRef.current = Object.keys(restored).length
            }
          }
          if (latest.time_spent_seconds) timeRef.current = latest.time_spent_seconds
        }
      }
      setProgressLoading(false)
    }
    load()
    return () => { isMounted = false }
  }, [studentId, listeningId])

  // Retry handler — clears local state; DB write happens on first new answer
  const handleRetry = () => {
    currentRowId.current = null
    setRetrying(true)
    setIsCompleted(false)
    setAnswers({})
    prevAnsweredRef.current = 0
    hasSaved.current = false
    timeRef.current = 0
  }

  // Build results — only include questions that were actually answered.
  // Never saves null-selected entries to DB so the restore-counts-as-answered bug
  // cannot recur after a page reload.
  const buildResults = useCallback((currentAnswers) => {
    return exercises
      .map((ex, idx) => {
        const ans = currentAnswers[idx]
        if (!ans || ans.selected === null || ans.selected === undefined) return null
        return {
          questionIndex: idx,
          question: ex.question_en,
          studentAnswer: ans.selected,
          correctAnswer: ex.correct_answer_index,
          isCorrect: ans.correct || false,
        }
      })
      .filter(Boolean)
  }, [exercises])

  // Save progress — INSERT-per-attempt model (no upsert, no unique-constraint overwrite).
  //   Autosave (isComplete=false): INSERT or UPDATE, status='in_progress', score=null.
  //   Submit  (isComplete=true):  UPDATE, status='completed', score computed, XP awarded.
  const saveProgress = useCallback(async (currentAnswers, isComplete) => {
    if (!studentId || !listeningId) return
    const results = buildResults(currentAnswers)
    const correct = Object.values(currentAnswers).filter(a => a.correct).length
    const score = isComplete ? (total > 0 ? Math.round((correct / total) * 100) : 0) : null

    if (currentRowId.current) {
      // UPDATE existing row
      const { error } = await supabase
        .from('student_curriculum_progress')
        .update({
          status: isComplete ? 'completed' : 'in_progress',
          ...(isComplete ? { score } : { score: null }),
          answers: { questions: results },
          time_spent_seconds: timeRef.current,
          completed_at: isComplete ? new Date().toISOString() : null,
        })
        .eq('id', currentRowId.current)

      if (error) { console.error('[ListeningTab] Save failed:', error); return }

      if (isComplete) {
        // Recompute is_best across all rows for this student+listening
        const { data: allRows } = await supabase
          .from('student_curriculum_progress')
          .select('id, score, attempt_number')
          .eq('student_id', studentId)
          .eq('listening_id', listeningId)
          .eq('status', 'completed')
          .order('score', { ascending: false })
          .order('attempt_number', { ascending: false })

        if (allRows?.length > 0) {
          await supabase.from('student_curriculum_progress')
            .update({ is_best: false })
            .eq('student_id', studentId)
            .eq('listening_id', listeningId)
          await supabase.from('student_curriculum_progress')
            .update({ is_best: true })
            .eq('id', allRows[0].id)
          setBestScore(allRows[0].score)
        }

        setRetrying(false)
        setIsCompleted(true)
        toast({ type: 'success', title: 'تم حفظ تقدمك ✅' })
        awardCurriculumXP(studentId, 'listening', score, unitId)
        window.dispatchEvent(new CustomEvent('fluentia:activity:complete', { detail: { activityKey: 'listening', score } }))

        const { data: refreshed } = await supabase
          .from('student_curriculum_progress')
          .select('*')
          .eq('student_id', studentId)
          .eq('listening_id', listeningId)
          .order('attempt_number', { ascending: false })
        if (refreshed) setAllAttempts(refreshed)
      }
    } else {
      // INSERT new row (first autosave of this attempt or after retry)
      const hasExisting = allAttempts.length > 0
      const nextAttemptNum = hasExisting ? attemptNumber + 1 : 1

      if (hasExisting) {
        await supabase
          .from('student_curriculum_progress')
          .update({ is_latest: false })
          .eq('student_id', studentId)
          .eq('listening_id', listeningId)
      }

      const { data: newRow, error } = await supabase
        .from('student_curriculum_progress')
        .insert({
          student_id: studentId,
          unit_id: unitId,
          listening_id: listeningId,
          section_type: 'listening',
          status: isComplete ? 'completed' : 'in_progress',
          score: isComplete ? score : null,
          answers: { questions: results },
          time_spent_seconds: timeRef.current,
          completed_at: isComplete ? new Date().toISOString() : null,
          attempt_number: nextAttemptNum,
          is_latest: true,
          is_best: isComplete && !hasExisting,
        })
        .select()
        .single()

      if (error) { console.error('[ListeningTab] Insert failed:', error); return }

      if (newRow) {
        currentRowId.current = newRow.id
        setAttemptNumber(nextAttemptNum)

        if (isComplete) {
          const { data: bestRows } = await supabase
            .from('student_curriculum_progress')
            .select('id, score')
            .eq('student_id', studentId)
            .eq('listening_id', listeningId)
            .eq('status', 'completed')
            .order('score', { ascending: false })

          if (bestRows?.length > 0) {
            await supabase.from('student_curriculum_progress')
              .update({ is_best: false })
              .eq('student_id', studentId)
              .eq('listening_id', listeningId)
            await supabase.from('student_curriculum_progress')
              .update({ is_best: true })
              .eq('id', bestRows[0].id)
            setBestScore(bestRows[0].score)
          } else {
            setBestScore(score)
          }

          setRetrying(false)
          setIsCompleted(true)
          toast({ type: 'success', title: 'تم حفظ تقدمك ✅' })
          awardCurriculumXP(studentId, 'listening', score, unitId)
          window.dispatchEvent(new CustomEvent('fluentia:activity:complete', { detail: { activityKey: 'listening', score } }))

          const { data: refreshed } = await supabase
            .from('student_curriculum_progress')
            .select('*')
            .eq('student_id', studentId)
            .eq('listening_id', listeningId)
            .order('attempt_number', { ascending: false })
          if (refreshed) setAllAttempts(refreshed)
        }
      }
    }
  }, [studentId, unitId, listeningId, total, buildResults, allAttempts, attemptNumber])

  // Autosave on each new answered question — always in_progress, NEVER completes.
  useEffect(() => {
    if (progressLoading) return
    if (answered === 0 || answered <= prevAnsweredRef.current) return
    prevAnsweredRef.current = answered
    saveProgress(answers, false)
  }, [answered, answers, progressLoading, saveProgress])

  // Explicit submit — shows confirmation dialog first
  const handleFinish = useCallback(() => {
    if (!allAnswered || hasSaved.current) return
    setConfirmOpen(true)
  }, [allAnswered])

  const handleConfirmSubmit = useCallback(() => {
    setConfirmOpen(false)
    hasSaved.current = true
    saveProgress(answers, true)
  }, [answers, saveProgress])

  if (progressLoading) {
    return (
      <div className="space-y-4">
        <div className="h-5 w-28 rounded bg-[rgba(255,255,255,0.06)] animate-pulse" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-[rgba(255,255,255,0.06)] animate-pulse" />
        ))}
      </div>
    )
  }

  const completedAttempts = allAttempts.filter(a => a.status === 'completed')
  const latestCompleted = completedAttempts.find(a => a.is_latest) || completedAttempts[0]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-[var(--text-primary)] font-['Tajawal']">أسئلة الاستماع</h3>
        {bestScore != null && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-md font-['Tajawal']"
            style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }}>
            أفضل درجة: {bestScore}%
          </span>
        )}
      </div>

      {/* Progress bar */}
      {!isCompleted && (
        <div className="space-y-1">
          <div className="h-1.5 rounded-full bg-[var(--surface-base)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${total > 0 ? (answered / total) * 100 : 0}%`,
                background: allAnswered ? '#10b981' : '#a855f7',
              }}
            />
          </div>
          <p className="text-xs text-[var(--text-muted)] font-['Tajawal'] text-left">
            {answered}/{total} مُجاب عليها
          </p>
        </div>
      )}

      {/* Completed banner with retry */}
      {isCompleted && !retrying && (
        <CompletedBanner
          attemptNumber={latestCompleted?.attempt_number || attemptNumber}
          allAttempts={completedAttempts}
          score={latestCompleted?.score}
          onRetry={handleRetry}
        />
      )}
      {retrying && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500/10 border border-sky-500/25">
          <RotateCcw size={16} className="text-sky-400" />
          <span className="text-sm font-medium text-sky-400 font-['Tajawal']">
            محاولة جديدة — أجب على الأسئلة من جديد
          </span>
        </div>
      )}

      <div className="space-y-4">
        {exercises.map((ex, idx) => (
          <ListeningMCQ
            key={idx}
            exercise={ex}
            index={idx}
            answer={answers[idx]}
            revealCorrect={isCompleted && !retrying}
            onAnswer={(ans) => {
              if (isCompleted && !retrying) return
              setAnswers(prev => ({ ...prev, [idx]: ans }))
            }}
          />
        ))}
      </div>

      {/* Submit button — only shown when not completed (or when retrying) */}
      {(!isCompleted || retrying) && answered > 0 && (
        <div className="flex flex-col items-center gap-2 pt-2">
          <button
            type="button"
            onClick={handleFinish}
            disabled={!allAnswered}
            className="px-6 py-3 rounded-xl font-bold font-['Tajawal'] text-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: allAnswered ? '#a855f7' : 'var(--surface-raised)',
              color: allAnswered ? '#fff' : 'var(--text-muted)',
              border: '1px solid ' + (allAnswered ? '#a855f7' : 'var(--border-subtle)'),
            }}
          >
            {allAnswered
              ? <><span>تسليم الإجابات ({answered}/{total})</span><XPBadgeInline amount={5} /></>
              : `أجب على جميع الأسئلة قبل التسليم (${answered}/${total})`}
          </button>
        </div>
      )}

      {/* Score result after completion */}
      {isCompleted && !retrying && latestCompleted && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-xl"
          style={{
            background: (latestCompleted.score || 0) === 100 ? 'rgba(16,185,129,0.1)' : 'rgba(56,189,248,0.1)',
            border: `1px solid ${(latestCompleted.score || 0) === 100 ? 'rgba(16,185,129,0.2)' : 'rgba(56,189,248,0.2)'}`,
          }}
        >
          <CheckCircle size={20} className={(latestCompleted.score || 0) === 100 ? 'text-emerald-400' : 'text-sky-400'} />
          <p className="text-sm font-medium font-['Tajawal']" style={{ color: (latestCompleted.score || 0) === 100 ? '#34d399' : '#38bdf8' }}>
            {(latestCompleted.score || 0) === 100
              ? 'ممتاز! أجبت على جميع الأسئلة بشكل صحيح'
              : `درجتك: ${latestCompleted.score ?? 0}%`}
          </p>
        </motion.div>
      )}

      {/* Confirmation dialog */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm rounded-2xl p-6 space-y-4"
            style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
            dir="rtl"
          >
            <h3 className="text-base font-bold text-[var(--text-primary)] font-['Tajawal']">تأكيد التسليم</h3>
            <p className="text-sm text-[var(--text-secondary)] font-['Tajawal']">
              لن تتمكن من تعديل هذه المحاولة بعد التسليم.
              <br />
              <span className="text-[var(--text-muted)] text-xs">يمكنك إعادة المحاولة لاحقاً — درجتك الأعلى هي المحتسبة.</span>
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setConfirmOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-bold font-['Tajawal'] text-[var(--text-muted)] border border-[var(--border-subtle)] hover:text-[var(--text-primary)] transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleConfirmSubmit}
                className="px-5 py-2 rounded-xl text-sm font-bold font-['Tajawal'] text-white"
                style={{ background: '#a855f7', border: '1px solid #a855f7' }}
              >
                تسليم
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

// ─── Single MCQ (listening uses correct_answer_index) ─
// `revealCorrect` (2026-04-16 bug fix): when false, students can change answers
// freely and no correct/wrong styling or explanation is shown. Only flips true
// after explicit submit — matches Reading's MCQQuestion semantics.
function ListeningMCQ({ exercise, index, answer, revealCorrect = false, onAnswer }) {
  const handleSelect = (optIdx) => {
    if (revealCorrect) return // locked after submit
    const correct = optIdx === exercise.correct_answer_index
    onAnswer({ selected: optIdx, correct })
  }

  const typeBadge = QUESTION_TYPE_LABELS[exercise.question_type] || exercise.question_type
  const typeColor = QUESTION_TYPE_COLORS[exercise.question_type] || QUESTION_TYPE_COLORS.detail

  return (
    <div
      className="rounded-xl p-4 sm:p-5 space-y-3"
      style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
    >
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
          {index + 1}
        </div>
        <div className="flex-1 space-y-2">
          {exercise.question_type && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${typeColor} font-['Tajawal']`}>
              {typeBadge}
            </span>
          )}
          <p className="text-sm sm:text-[15px] font-medium text-[var(--text-primary)] font-['Inter'] leading-relaxed" dir="ltr">
            {exercise.question_en}
          </p>
        </div>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 gap-2 mt-1">
        {exercise.options?.map((opt, i) => {
          const isSelected = answer?.selected === i
          const isCorrectAnswer = i === exercise.correct_answer_index
          // Correctness revealed only after submit.
          const showCorrect = revealCorrect && isCorrectAnswer
          const showWrong = revealCorrect && isSelected && !answer?.correct

          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              disabled={revealCorrect}
              dir="ltr"
              className={`text-start px-4 py-3 rounded-xl text-sm font-['Inter'] transition-all duration-200 border ${
                showCorrect
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                  : showWrong
                    ? 'bg-red-500/15 border-red-500/40 text-red-400'
                    : isSelected
                      ? 'bg-purple-500/10 border-purple-500/40 text-purple-200'
                      : 'bg-[var(--surface-base)] border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-purple-500/40 hover:bg-purple-500/5 cursor-pointer'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                  style={{
                    background: showCorrect ? 'rgba(16,185,129,0.2)' : showWrong ? 'rgba(239,68,68,0.2)' : isSelected ? 'rgba(168,85,247,0.2)' : 'var(--surface-raised)',
                    color: showCorrect ? '#34d399' : showWrong ? '#f87171' : isSelected ? '#c084fc' : 'var(--text-muted)',
                  }}
                >
                  {showCorrect ? <CheckCircle size={14} /> : showWrong ? <XCircle size={14} /> : String.fromCharCode(65 + i)}
                </span>
                <span>{opt}</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Explanation — only after submit */}
      <AnimatePresence>
        {revealCorrect && answer && exercise.explanation_ar && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div
              className="p-3.5 rounded-xl mt-1 text-xs font-['Tajawal']"
              dir="rtl"
              style={{
                background: answer.correct ? 'rgba(16,185,129,0.06)' : 'rgba(56,189,248,0.06)',
                border: `1px solid ${answer.correct ? 'rgba(16,185,129,0.15)' : 'rgba(56,189,248,0.15)'}`,
                color: 'var(--text-secondary)',
              }}
            >
              {exercise.explanation_ar}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Completed Banner with Retry ─────────────────────
// Now receives allAttempts (array of DB rows) instead of the old JSON attempt_history.
function CompletedBanner({ attemptNumber, allAttempts, score, onRetry }) {
  const [showHistory, setShowHistory] = useState(false)
  const priorAttempts = (allAttempts || []).filter(a => !a.is_latest)
  const hasHistory = priorAttempts.length > 0

  return (
    <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/25 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2">
          <CheckCircle size={18} className="text-emerald-400" />
          <span className="text-sm font-medium text-emerald-400 font-['Tajawal']">تم إكمال هذا القسم</span>
          {attemptNumber > 1 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-['Tajawal']">
              المحاولة {attemptNumber}
            </span>
          )}
          {score != null && (
            <span className="text-xs text-emerald-400/70 font-['Tajawal']">— {score}%</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasHistory && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors font-['Tajawal']"
            >
              <History size={12} />
              المحاولات السابقة
            </button>
          )}
          <button
            onClick={onRetry}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text-muted)] hover:text-sky-400 hover:bg-sky-500/10 transition-colors font-['Tajawal'] border border-[var(--border-subtle)]"
          >
            <RotateCcw size={12} />
            محاولة جديدة
          </button>
        </div>
      </div>
      <AnimatePresence>
        {showHistory && hasHistory && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3" style={{ borderTop: '1px solid rgba(16,185,129,0.15)' }}>
              <div className="pt-2.5 space-y-1.5">
                {priorAttempts.map(h => (
                  <div key={h.id} className="flex items-center gap-3 text-xs text-[var(--text-muted)] font-['Tajawal']">
                    <span className="font-medium">محاولة {h.attempt_number}</span>
                    <span>{h.score != null ? `${h.score}%` : '—'}</span>
                    {h.is_best && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400">الأفضل</span>
                    )}
                    {h.completed_at && (
                      <span dir="ltr">{new Date(h.completed_at).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' })}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function formatTime(s) {
  if (!s || isNaN(s)) return '00:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
}

// ─── Skeleton ────────────────────────────────────────
function ListeningSkeleton() {
  return (
    <div className="space-y-5">
      <div className="h-6 w-40 rounded bg-[var(--surface-raised)] animate-pulse" />
      <div className="h-40 rounded-xl bg-[var(--surface-raised)] animate-pulse" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-[var(--surface-raised)] animate-pulse" />
        ))}
      </div>
    </div>
  )
}
