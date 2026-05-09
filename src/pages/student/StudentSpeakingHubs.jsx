import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MessageCircle, Clock, CheckCircle2, FileText, ChevronLeft } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'
import { useStudentSpeakingHubs } from '@/hooks/useSpeakingHub'

function getYouTubeThumbnail(url) {
  const id = url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)?.[1]
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null
}

function SessionCountdown({ sessionAt, t, locale }) {
  if (!sessionAt) return <span className="text-xs text-[var(--text-muted)]">{t('student.speakingHub.detail.sessionTBD', 'موعد الجلسة سيُحدَّد قريباً')}</span>
  const now = new Date()
  const session = new Date(sessionAt)
  const diff = session - now
  if (diff < -30 * 60 * 1000) return <span className="text-xs text-[var(--text-muted)]">{t('student.speakingHub.card.sessionEnded', 'انتهت الجلسة')}</span>
  if (diff < 30 * 60 * 1000) return <span className="text-xs font-bold text-red-400">{t('student.speakingHub.card.sessionLive', '🔴 الجلسة الآن')}</span>
  const distance = formatDistanceToNow(session, { locale })
  return (
    <span className="text-xs text-sky-400 flex items-center gap-1">
      <Clock size={11} />
      {t('student.speakingHub.card.sessionIn', 'بعد {{distance}}', { distance })}
    </span>
  )
}

function HubCard({ hub, t, locale }) {
  const navigate = useNavigate()
  const progress = hub.progress
  const thumbnail = hub.video_thumbnail_url || getYouTubeThumbnail(hub.video_url)
  const hasNotes = progress?.notes_word_count > 0
  const watched = !!progress?.video_completed_at

  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => navigate('/student/speaking-hub/' + hub.id)}
      className="w-full text-start rounded-2xl overflow-hidden transition-all hover:scale-[1.01] hover:border-sky-500/30"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* Thumbnail */}
      <div className="relative w-full aspect-video bg-[rgba(255,255,255,0.04)] overflow-hidden">
        {thumbnail
          ? <img src={thumbnail} alt="" className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><MessageCircle size={32} className="text-[var(--text-muted)]" /></div>
        }
        {watched && (
          <div className="absolute top-2 end-2 bg-emerald-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <CheckCircle2 size={10} /> {t('student.speakingHub.card.watched', 'شاهدته')}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4 space-y-2">
        <h3 className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal'] leading-snug">{hub.title}</h3>

        {/* Status row */}
        <div className="flex items-center gap-2 flex-wrap">
          {!watched && !hasNotes && (
            <span className="text-xs text-[var(--text-muted)] font-['Tajawal']">{t('student.speakingHub.card.notWatched', 'لم تشاهد بعد')}</span>
          )}
          {hasNotes && (
            <span className="text-xs text-amber-400 flex items-center gap-1">
              <FileText size={11} />
              {t('student.speakingHub.card.wordsCount', '{{count}} كلمة', { count: progress.notes_word_count })}
            </span>
          )}
        </div>

        <SessionCountdown sessionAt={hub.hub_session_at} t={t} locale={locale} />
      </div>
    </motion.button>
  )
}

export default function StudentSpeakingHubs() {
  const { t, i18n } = useTranslation()
  const { data: hubs = [], isLoading } = useStudentSpeakingHubs()
  const locale = i18n.language === 'ar' ? ar : enUS

  const now = new Date()
  const upcoming = hubs.filter(h => !h.hub_session_at || new Date(h.hub_session_at) >= now)
  const past = hubs.filter(h => h.hub_session_at && new Date(h.hub_session_at) < now)

  if (isLoading) return (
    <div className="p-6 space-y-4">
      {[1,2].map(i => <div key={i} className="h-48 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />)}
    </div>
  )

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/15 flex items-center justify-center">
            <MessageCircle size={20} className="text-sky-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] font-['Tajawal']">
              {t('student.speakingHub.list.title', 'نادي المحادثة')}
            </h1>
            <p className="text-xs text-[var(--text-muted)] font-['Tajawal']">
              {t('student.speakingHub.list.subtitle', 'استمع وخذ ملاحظاتك، ثم انضم لجلسة النقاش')}
            </p>
          </div>
        </div>
      </div>

      {hubs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <MessageCircle size={40} className="text-[var(--text-muted)]" />
          <p className="text-[var(--text-muted)] font-['Tajawal'] text-sm">{t('student.speakingHub.list.empty', 'لا توجد جلسات مُعيّنة لك حالياً')}</p>
        </div>
      )}

      {upcoming.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider font-['Tajawal']">
            {t('student.speakingHub.list.upcoming', 'القادم')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {upcoming.map((hub, i) => <HubCard key={hub.id} hub={hub} t={t} locale={locale} />)}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider font-['Tajawal']">
            {t('student.speakingHub.list.past', 'السابق')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {past.map((hub) => <HubCard key={hub.id} hub={hub} t={t} locale={locale} />)}
          </div>
        </section>
      )}
    </div>
  )
}
