import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MessageCircle, Clock, CheckCircle2, FileText, Play, Eye, PenLine, Users, Sparkles } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'
import { useStudentSpeakingHubs } from '@/hooks/useSpeakingHub'
import { useG } from '@/i18n/gender'
import './speaking-hub/speakingHub.css'

function getYouTubeThumbnail(url) {
  const id = url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)?.[1]
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null
}

// live = within ±30 min of the session time
function isLiveNow(sessionAt) {
  if (!sessionAt) return false
  const diff = new Date(sessionAt) - new Date()
  return diff < 30 * 60 * 1000 && diff > -30 * 60 * 1000
}

function SessionChip({ sessionAt, t, locale }) {
  if (!sessionAt) {
    return <span className="shx-chip shx-chip--muted">{t('student.speakingHub.detail.sessionTBD', 'الموعد قريباً')}</span>
  }
  const diff = new Date(sessionAt) - new Date()
  if (diff < -30 * 60 * 1000) {
    return <span className="shx-chip shx-chip--muted">{t('student.speakingHub.card.sessionEnded', 'انتهت الجلسة')}</span>
  }
  // Live is shown once, as the prominent corner stamp on the thumbnail.
  if (diff < 30 * 60 * 1000) return null
  return (
    <span className="shx-chip shx-chip--time">
      <Clock size={11} />
      {t('student.speakingHub.card.sessionIn', 'بعد {{distance}}', { distance: formatDistanceToNow(new Date(sessionAt), { locale }) })}
    </span>
  )
}

function HubCard({ hub, index, t, locale }) {
  const navigate = useNavigate()
  const progress = hub.progress
  const thumbnail = hub.video_thumbnail_url || getYouTubeThumbnail(hub.video_url)
  const hasNotes = progress?.notes_word_count > 0
  const watched = !!progress?.video_completed_at
  const live = isLiveNow(hub.hub_session_at)

  return (
    <motion.button
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.06, 0.3), duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      onClick={() => navigate('/student/speaking-hub/' + hub.id)}
      className="shx-card"
    >
      <div className="shx-card__thumb">
        {thumbnail
          ? <img src={thumbnail} alt="" loading="lazy" />
          : <div className="shx-card__thumbfallback"><MessageCircle size={34} /></div>}
        {(live || watched) && (
          <span className={`shx-card__badge ${live ? 'shx-badge--live' : 'shx-badge--watched'}`}>
            {live
              ? <><span style={{ width: 6, height: 6, borderRadius: 99, background: '#fff', display: 'inline-block' }} /> {t('student.speakingHub.card.sessionLive', 'الآن')}</>
              : <><CheckCircle2 size={12} /> {t('student.speakingHub.card.watched', 'شاهدته')}</>}
          </span>
        )}
        <span className="shx-card__play"><span className="shx-card__playbtn"><Play size={20} style={{ marginInlineStart: 2 }} /></span></span>
      </div>

      <div className="shx-card__body">
        <h3 className="shx-card__title">{hub.title}</h3>
        <div className="shx-chips">
          <SessionChip sessionAt={hub.hub_session_at} t={t} locale={locale} />
          {hasNotes && (
            <span className="shx-chip shx-chip--gold">
              <FileText size={11} />
              {t('student.speakingHub.card.wordsCount', '{{count}} كلمة', { count: progress.notes_word_count })}
            </span>
          )}
          {watched && !hasNotes && (
            <span className="shx-chip shx-chip--done"><CheckCircle2 size={11} /> {t('student.speakingHub.card.done', 'جاهز')}</span>
          )}
        </div>
      </div>
    </motion.button>
  )
}

export default function StudentSpeakingHubs() {
  const { t, i18n } = useTranslation()
  const g = useG()
  const { data: hubs = [], isLoading } = useStudentSpeakingHubs()
  const locale = i18n.language === 'ar' ? ar : enUS

  const now = new Date()
  const upcoming = hubs.filter((h) => !h.hub_session_at || new Date(h.hub_session_at) >= now)
  const past = hubs.filter((h) => h.hub_session_at && new Date(h.hub_session_at) < now)
  const anyLive = hubs.some((h) => isLiveNow(h.hub_session_at))

  const RITUAL = [
    { icon: Eye, t: g('شاهِد', 'شاهِدي'), d: t('student.speakingHub.ritual.watch', 'فيديو الموضوع بتركيز') },
    { icon: PenLine, t: g('دوِّن', 'دوِّني'), d: t('student.speakingHub.ritual.note', 'أفكارك وكلماتك الجديدة') },
    { icon: Users, t: g('انضمّ', 'انضمّي'), d: t('student.speakingHub.ritual.join', 'لجلسة النقاش الحيّة') },
  ]

  return (
    <div dir="rtl" className="shx-root" style={{ fontFamily: 'Tajawal, sans-serif' }}>
      {/* atmosphere */}
      <div className="shx-atmo" aria-hidden="true">
        <div className="shx-atmo__beam" />
        <div className="shx-atmo__blob" />
      </div>

      <div className="shx-content p-4 sm:p-6 space-y-7 max-w-3xl mx-auto">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="shx-hero"
        >
          <div className="shx-hero__row">
            <div className="shx-hero__crest">
              <MessageCircle size={26} strokeWidth={2.2} />
              {anyLive && <span className="shx-hero__live" />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 className="shx-hero__title">{t('student.speakingHub.list.title', 'نادي التحدّث')}</h1>
              <p className="shx-hero__sub">
                {g(
                  'مساحتك للتحدّث بثقة — شاهِد، دوّن، ثم تكلّم مع مدرّبك وزملائك في جلسة حيّة.',
                  'مساحتكِ للتحدّث بثقة — شاهِدي، دوّني، ثم تكلّمي مع مدرّبكِ وزميلاتكِ في جلسة حيّة.',
                )}
              </p>
            </div>
          </div>

          {/* the ritual */}
          <div className="shx-ritual">
            {RITUAL.map((step, i) => (
              <motion.div
                key={i}
                className="shx-step"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="shx-step__num">{i + 1}</div>
                <step.icon size={18} className="shx-step__icon" />
                <div className="shx-step__body">
                  <div className="shx-step__t">{step.t}</div>
                  <div className="shx-step__d">{step.d}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Loading */}
        {isLoading && (
          <div className="shx-grid">
            {[1, 2].map((i) => <div key={i} className="shx-skel" />)}
          </div>
        )}

        {/* Empty state — the invitation */}
        {!isLoading && hubs.length === 0 && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="shx-empty"
          >
            <div className="shx-empty__orb"><MessageCircle size={30} strokeWidth={2} /></div>
            <h2 className="shx-empty__t">{g('ناديك جاهز لأول جلسة', 'ناديكِ جاهز لأول جلسة')}</h2>
            <p className="shx-empty__d">
              {g(
                'حين يفتح مدرّبك جلسة، ستظهر هنا مباشرةً. تابع منهجك وتمارين التحدّث، وسنراك في النادي قريباً.',
                'حين يفتح مدرّبكِ جلسة، ستظهر هنا مباشرةً. تابعي منهجكِ وتمارين التحدّث، وسنراكِ في النادي قريباً.',
              )}
            </p>
            <span className="shx-empty__hint">
              <Sparkles size={13} />
              {g('جلستك القادمة ستظهر هنا', 'جلستكِ القادمة ستظهر هنا')}
            </span>
          </motion.section>
        )}

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <section>
            <div className="shx-eyebrow">
              <span className="shx-eyebrow__spark" />
              <span className="shx-eyebrow__label">{t('student.speakingHub.list.upcoming', 'القادم')}</span>
              <span className="shx-eyebrow__rule" />
            </div>
            <div className="shx-grid" style={upcoming.length === 1 ? { gridTemplateColumns: 'minmax(0, 440px)' } : undefined}>
              {upcoming.map((hub, i) => <HubCard key={hub.id} hub={hub} index={i} t={t} locale={locale} />)}
            </div>
          </section>
        )}

        {/* Past */}
        {past.length > 0 && (
          <section>
            <div className="shx-eyebrow">
              <span className="shx-eyebrow__spark" style={{ background: 'rgba(255,255,255,0.4)', boxShadow: 'none' }} />
              <span className="shx-eyebrow__label">{t('student.speakingHub.list.past', 'السابق')}</span>
              <span className="shx-eyebrow__rule" />
            </div>
            <div className="shx-grid" style={past.length === 1 ? { gridTemplateColumns: 'minmax(0, 440px)' } : undefined}>
              {past.map((hub, i) => <HubCard key={hub.id} hub={hub} index={i} t={t} locale={locale} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
