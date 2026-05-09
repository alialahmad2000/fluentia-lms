import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Plus, Video, Calendar, Users, Eye, FileText } from 'lucide-react'
import { useAdminSpeakingHubs } from '@/hooks/useSpeakingHub'

const STATUS_BADGE = {
  draft:     'bg-[rgba(255,255,255,0.06)] text-[var(--text-muted)]',
  published: 'bg-sky-500/15 text-sky-400',
  live:      'bg-emerald-500/15 text-emerald-400',
  completed: 'bg-purple-500/15 text-purple-400',
  archived:  'bg-amber-500/15 text-amber-400',
}

const STATUS_LABEL = {
  draft:     'مسودة',
  published: 'منشور',
  live:      'مباشر',
  completed: 'مكتمل',
  archived:  'مؤرشف',
}

function extractYouTubeId(url) {
  if (!url) return null
  return url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)?.[1] || null
}

function getHubThumbnail(hub) {
  if (hub.video_thumbnail_url) return hub.video_thumbnail_url
  const ytId = extractYouTubeId(hub.video_url)
  if (ytId) return `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`
  return null
}

function HubCard({ hub, index }) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const thumbnail = getHubThumbnail(hub)
  const assignmentCount = hub.assignments?.length ?? 0
  const watchedCount = hub.progress?.filter(p => p.video_completed_at).length ?? 0
  const notesCount = hub.progress?.filter(p => p.notes_word_count > 0).length ?? 0

  const sessionDate = hub.hub_session_at
    ? new Date(hub.hub_session_at).toLocaleDateString('ar-SA', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      })
    : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      className="fl-card-static overflow-hidden cursor-pointer hover:ring-1 hover:ring-[rgba(255,255,255,0.12)] transition-all"
      onClick={() => navigate(`/admin/speaking-hubs/${hub.id}`)}
    >
      {/* Thumbnail */}
      <div className="relative w-full h-40 bg-[rgba(255,255,255,0.04)] overflow-hidden">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={hub.title}
            className="w-full h-full object-cover"
            onError={e => { e.target.style.display = 'none' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Video size={32} className="text-[var(--text-muted)]" />
          </div>
        )}
        {/* Status badge overlay */}
        <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[11px] font-bold font-['Tajawal'] ${STATUS_BADGE[hub.status] || STATUS_BADGE.draft}`}>
          {STATUS_LABEL[hub.status] || hub.status}
        </span>
      </div>

      {/* Content */}
      <div className="p-4 space-y-2">
        <h3 className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal'] line-clamp-2 leading-relaxed">
          {hub.title || hub.title_en || t('admin.speakingHub.list.untitled', 'بدون عنوان')}
        </h3>

        {sessionDate && (
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] font-['Tajawal']">
            <Calendar size={12} />
            <span>{sessionDate}</span>
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-3 pt-1 border-t border-[var(--border-subtle)]">
          <span className="flex items-center gap-1 text-xs text-[var(--text-muted)] font-['Tajawal']">
            <Users size={11} />
            {assignmentCount} {t('admin.speakingHub.list.assigned', 'معيّن')}
          </span>
          <span className="flex items-center gap-1 text-xs text-[var(--text-muted)] font-['Tajawal']">
            <Eye size={11} />
            {watchedCount} {t('admin.speakingHub.list.watched', 'شاهد')}
          </span>
          <span className="flex items-center gap-1 text-xs text-[var(--text-muted)] font-['Tajawal']">
            <FileText size={11} />
            {notesCount} {t('admin.speakingHub.list.notes', 'ملاحظات')}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="fl-card-static overflow-hidden">
          <div className="skeleton h-40 w-full rounded-none" />
          <div className="p-4 space-y-2">
            <div className="skeleton h-4 w-3/4 rounded-lg" />
            <div className="skeleton h-3 w-1/2 rounded-lg" />
            <div className="skeleton h-3 w-full rounded-lg mt-2" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AdminSpeakingHubs() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: hubs = [], isLoading } = useAdminSpeakingHubs()

  return (
    <div className="space-y-6">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-4 flex-wrap"
      >
        <div>
          <h1 className="text-page-title font-['Tajawal']">
            {t('admin.speakingHub.list.title', 'Speaking Hub')}
          </h1>
          <p className="text-muted text-sm mt-1 font-['Tajawal']">
            {t('admin.speakingHub.list.subtitle', 'إدارة جلسات المحادثة وتعيينها للطلاب')}
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/speaking-hubs/new')}
          className="btn-primary text-sm px-5 flex items-center gap-2 font-['Tajawal']"
        >
          <Plus size={16} />
          {t('admin.speakingHub.list.createBtn', 'إنشاء جلسة جديدة')}
        </button>
      </motion.div>

      {/* Content */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : hubs.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fl-card-static p-12 text-center"
        >
          <Video size={40} className="text-muted mx-auto mb-3" />
          <p className="text-[var(--text-muted)] font-['Tajawal'] text-sm">
            {t('admin.speakingHub.list.empty', 'لا توجد جلسات بعد. أنشئ أول جلسة الآن.')}
          </p>
          <button
            onClick={() => navigate('/admin/speaking-hubs/new')}
            className="btn-primary text-sm px-5 mt-4 inline-flex items-center gap-2 font-['Tajawal']"
          >
            <Plus size={16} />
            {t('admin.speakingHub.list.createBtn', 'إنشاء جلسة جديدة')}
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {hubs.map((hub, index) => (
            <HubCard key={hub.id} hub={hub} index={index} />
          ))}
        </div>
      )}
    </div>
  )
}
