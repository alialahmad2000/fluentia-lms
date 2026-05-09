import { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, CheckCircle2, Loader2, ExternalLink, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'
import VideoPlayer from '@/components/VideoPlayer'
import {
  useStudentSpeakingHub,
  useStudentHubProgress,
  useUpdateStudentNotes,
  useMarkVideoStarted,
} from '@/hooks/useSpeakingHub'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

function SessionInfo({ hub, t, locale }) {
  if (!hub.hub_session_at) {
    return (
      <p className="text-sm text-[var(--text-muted)] font-['Tajawal']">
        {t('student.speakingHub.detail.sessionTBD', 'موعد الجلسة سيُحدَّد قريباً')}
      </p>
    )
  }
  const now = new Date()
  const session = new Date(hub.hub_session_at)
  const diff = session - now
  const isLive = diff > -30 * 60 * 1000 && diff < (hub.hub_session_duration_minutes || 60) * 60 * 1000
  const isPast = diff < -(hub.hub_session_duration_minutes || 60) * 60 * 1000

  return (
    <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.2)' }}>
      <div className="flex items-center gap-2">
        <Clock size={16} className="text-sky-400" />
        <span className="text-sm font-bold text-sky-400 font-['Tajawal']">
          {t('student.speakingHub.detail.session', 'جلسة النقاش')}
        </span>
      </div>
      <p className="text-sm text-[var(--text-primary)] font-['Tajawal']">
        {session.toLocaleString(locale === ar ? 'ar-SA' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
      </p>
      {isLive && hub.hub_session_link && (
        <a
          href={hub.hub_session_link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition font-['Tajawal']"
        >
          <span className="animate-pulse">🔴</span>
          {t('student.speakingHub.detail.joinMeet', 'انضم عبر Google Meet')}
          <ExternalLink size={14} />
        </a>
      )}
      {!isLive && !isPast && hub.hub_session_link && (
        <a
          href={hub.hub_session_link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-sky-400 border border-sky-400/30 hover:bg-sky-500/10 transition font-['Tajawal']"
        >
          {t('student.speakingHub.detail.joinMeet', 'انضم عبر Google Meet')}
          <ExternalLink size={14} />
        </a>
      )}
      {!isLive && !isPast && (
        <p className="text-xs text-[var(--text-muted)] font-['Tajawal']">
          {t('student.speakingHub.card.sessionIn', 'بعد {{distance}}', { distance: formatDistanceToNow(session, { locale }) })}
        </p>
      )}
      {isPast && <p className="text-xs text-[var(--text-muted)] font-['Tajawal']">{t('student.speakingHub.card.sessionEnded', 'انتهت الجلسة')}</p>}
    </div>
  )
}

export default function StudentSpeakingHubDetail() {
  const { t, i18n } = useTranslation()
  const { id: hubId } = useParams()
  const navigate = useNavigate()
  const locale = i18n.language === 'ar' ? ar : enUS

  const { data: hub, isLoading: hubLoading } = useStudentSpeakingHub(hubId)
  const { data: progress } = useStudentHubProgress(hubId)
  const markStarted = useMarkVideoStarted(hubId)
  const updateNotes = useUpdateStudentNotes(hubId)

  const [notes, setNotes] = useState('')
  const [savingState, setSavingState] = useState('idle') // idle | saving | saved
  const initializedRef = useRef(false)
  const debouncedNotes = useDebouncedValue(notes, 1500)

  // Initialize notes from server once
  useEffect(() => {
    if (progress && !initializedRef.current) {
      setNotes(progress.notes || '')
      initializedRef.current = true
    }
  }, [progress])

  // Auto-save on debounced change
  useEffect(() => {
    if (!initializedRef.current) return
    if (debouncedNotes === (progress?.notes || '')) return
    setSavingState('saving')
    updateNotes.mutate(debouncedNotes, {
      onSuccess: () => setSavingState('saved'),
      onError: () => setSavingState('idle'),
    })
  }, [debouncedNotes]) // eslint-disable-line react-hooks/exhaustive-deps

  // Mark video started
  useEffect(() => {
    if (progress && !progress.video_started_at) {
      markStarted.mutate()
    }
  }, [progress?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const wordCount = notes.trim().split(/\s+/).filter(Boolean).length
  const lastSavedAgo = progress?.notes_updated_at
    ? formatDistanceToNow(new Date(progress.notes_updated_at), { addSuffix: true, locale })
    : null

  if (hubLoading) {
    return (
      <div className="p-6 space-y-4">
        {[1,2,3].map(i => <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />)}
      </div>
    )
  }

  if (!hub) return (
    <div className="p-6 text-center">
      <p className="text-[var(--text-muted)] font-['Tajawal']">{t('common.no_data', 'لا توجد بيانات')}</p>
    </div>
  )

  const notePrompts = hub.note_prompts || []
  const vocabFocus = hub.vocab_focus || []
  const discussionQuestions = hub.discussion_questions || []

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-3xl mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate('/student/speaking-hub')}
        className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition font-['Tajawal']"
      >
        <ChevronLeft size={16} />
        {t('student.speakingHub.detail.back', 'رجوع')}
      </button>

      {/* Title + description */}
      <div className="space-y-2">
        <h1 className="text-xl font-bold text-[var(--text-primary)] font-['Tajawal']">{hub.title}</h1>
        {hub.description && (
          <p className="text-sm text-[var(--text-muted)] font-['Tajawal'] leading-relaxed">{hub.description}</p>
        )}
      </div>

      {/* Session info */}
      <SessionInfo hub={hub} t={t} locale={locale} />

      {/* Video */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal']">
          📺 {t('student.speakingHub.detail.watch', 'شاهد الفيديو')}
        </h2>
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          <VideoPlayer url={hub.video_url} />
        </div>
        {hub.video_title && (
          <p className="text-xs text-[var(--text-muted)] font-['Tajawal']">
            {hub.video_title}{hub.video_channel ? ' — ' + hub.video_channel : ''}
            {hub.video_duration_minutes ? ' · ' + hub.video_duration_minutes + ' دقيقة' : ''}
          </p>
        )}
      </section>

      {/* Note prompts */}
      {notePrompts.length > 0 && (
        <section className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <h2 className="text-sm font-bold text-amber-400 font-['Tajawal']">
            {t('student.speakingHub.detail.notePrompts', '💡 ركّز على هذه الأسئلة')}
          </h2>
          <ul className="space-y-2">
            {notePrompts.map((p, i) => (
              <li key={i} className="text-sm text-[var(--text-secondary)] font-['Tajawal'] flex gap-2">
                <span className="text-amber-400 font-bold shrink-0">{i + 1}.</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Vocab focus */}
      {vocabFocus.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal']">
            {t('student.speakingHub.detail.vocabFocus', '📚 مفردات مهمة')}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {vocabFocus.map((v, i) => (
              <div key={i} className="rounded-xl p-3 space-y-1" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-sm font-bold text-sky-400 font-['Inter']" dir="ltr">{v.word}</p>
                <p className="text-xs text-[var(--text-muted)] font-['Tajawal']">{v.meaning_ar}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Notes */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal']">
            📝 {t('student.speakingHub.detail.yourNotes', 'ملاحظاتك')}
            <span className="text-xs font-normal text-[var(--text-muted)] mr-2">
              {t('student.speakingHub.detail.notesOptional', '(اختياري)')}
            </span>
          </h2>
          {/* Save status */}
          <div className="text-xs font-['Tajawal'] flex items-center gap-1.5">
            {savingState === 'saving' && (
              <span className="text-amber-400 flex items-center gap-1">
                <Loader2 size={12} className="animate-spin" />
                {t('student.speakingHub.detail.saving', 'جاري الحفظ...')}
              </span>
            )}
            {savingState === 'saved' && lastSavedAgo && (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 size={12} />
                {t('student.speakingHub.detail.saved', 'تم الحفظ')} · {lastSavedAgo} · {t('student.speakingHub.detail.wordCount', '{{count}} كلمة', { count: wordCount })}
              </span>
            )}
            {savingState === 'idle' && wordCount > 0 && lastSavedAgo && (
              <span className="text-[var(--text-muted)]">
                {t('student.speakingHub.detail.wordCount', '{{count}} كلمة', { count: wordCount })}
              </span>
            )}
          </div>
        </div>
        <textarea
          value={notes}
          onChange={(e) => { setNotes(e.target.value); setSavingState('idle') }}
          dir="auto"
          placeholder={t('student.speakingHub.detail.notesPlaceholder', 'اكتب أفكارك هنا أثناء الاستماع...')}
          className="w-full rounded-2xl px-4 py-3 text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-y focus:outline-none focus:ring-1 focus:ring-sky-500/40 font-['Tajawal'] leading-relaxed"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            minHeight: 280,
            fontSize: 17,
            lineHeight: 1.7,
          }}
        />
      </section>

      {/* Discussion questions */}
      {discussionQuestions.length > 0 && (
        <section className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.2)' }}>
          <h2 className="text-sm font-bold text-sky-400 font-['Tajawal']">
            {t('student.speakingHub.detail.discussionQuestions', '💬 أسئلة النقاش')}
          </h2>
          <p className="text-xs text-[var(--text-muted)] font-['Tajawal']">
            {t('student.speakingHub.detail.discussionHint', 'حضّر إجاباتك لهذه الأسئلة قبل الجلسة')}
          </p>
          <ul className="space-y-2">
            {discussionQuestions.map((q, i) => (
              <li key={i} className="text-sm text-[var(--text-secondary)] font-['Tajawal'] flex gap-2">
                <span className="text-sky-400 font-bold shrink-0">{i + 1}.</span>
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
