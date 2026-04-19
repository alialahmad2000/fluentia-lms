import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Clock, Target, MessageCircle, Users, Sparkles,
  Play, RefreshCw, ChevronLeft, BookOpen, AlertCircle,
} from 'lucide-react'
import { useClassPrepContext } from '@/hooks/trainer/useClassPrepContext'
import { useClassPrep, useClassPrepRefresh } from '@/hooks/trainer/useClassPrep'
import useClassMode from '@/stores/classModeStore'
import { CommandCard } from '@/design-system/trainer'
import './ClassPrepPage.css'

function Skeleton() {
  return (
    <div className="cp-skeleton">
      <div className="cp-skeleton__hero" />
      <div className="cp-skeleton__row">
        <div className="cp-skeleton__card" />
        <div className="cp-skeleton__card" />
        <div className="cp-skeleton__card" />
      </div>
    </div>
  )
}

function WeaknessCard({ weaknesses }) {
  const LABELS = {
    stuck_on_unit: 'عالقون على الوحدة',
    silent_48h: 'صامتون ٤٨ ساعة',
    silent_7d: 'صامتون أسبوع',
    never_logged_in: 'لم يسجلوا دخول',
  }
  return (
    <CommandCard className="cp-card">
      <div className="cp-card__header">
        <Target size={16} className="cp-card__icon" />
        <h3 className="cp-card__title">نقاط ضعف المجموعة</h3>
      </div>
      {weaknesses?.length ? (
        <ul className="cp-card__list">
          {weaknesses.map((w, i) => (
            <li key={i} className="cp-weakness__row">
              <span className="cp-weakness__ratio">{w.student_count}/{w.total_students}</span>
              <span className="cp-weakness__label">{LABELS[w.signal_type] || w.signal_type}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="cp-card__empty">المجموعة في حالة جيدة — لا نقاط ضعف واضحة</p>
      )}
    </CommandCard>
  )
}

function TalkingPointsCard({ ai, isLoading, onRefresh }) {
  return (
    <CommandCard className="cp-card">
      <div className="cp-card__header">
        <MessageCircle size={16} className="cp-card__icon" />
        <h3 className="cp-card__title">نقاط الحوار</h3>
        <button onClick={onRefresh} className="cp-card__refresh" aria-label="تحديث">
          <RefreshCw size={14} className={isLoading ? 'cp-spin' : ''} />
        </button>
      </div>
      {isLoading ? (
        <div className="cp-card__skeleton">
          {[1, 2, 3].map(i => <div key={i} className="cp-skel-line" />)}
        </div>
      ) : ai?.talking_points?.length ? (
        <ul className="cp-card__list">
          {ai.talking_points.map((t, i) => (
            <li key={i} className="cp-talking__point">
              <ChevronLeft size={14} className="cp-talking__arrow" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="cp-card__empty">سيتم توليد نقاط الحوار بعد تحديد المجموعة</p>
      )}
      {ai?.cached && (
        <p className="cp-card__cache-note">⏱ من الذاكرة ({Math.floor(ai.age_hours || 0)}س)</p>
      )}
    </CommandCard>
  )
}

function StudentsCard({ ai }) {
  return (
    <CommandCard className="cp-card">
      <div className="cp-card__header">
        <Users size={16} className="cp-card__icon" />
        <h3 className="cp-card__title">اذكرهم اليوم</h3>
      </div>
      {ai?.students_to_call_on?.length ? (
        <div className="cp-students__list">
          {ai.students_to_call_on.map((s, i) => (
            <div key={i} className="cp-student__item">
              <div className="cp-student__name">{s.name}</div>
              <div className="cp-student__reason">{s.reason}</div>
              {s.approach && <div className="cp-student__approach">"{s.approach}"</div>}
            </div>
          ))}
        </div>
      ) : (
        <p className="cp-card__empty">لا اقتراحات بعد</p>
      )}
    </CommandCard>
  )
}

export default function ClassPrepPage() {
  const navigate = useNavigate()
  const startClass = useClassMode((s) => s.startClass)
  const isClassMode = useClassMode((s) => s.isClassMode)
  const [selectedGroupId, setSelectedGroupId] = useState(null)
  const refresh = useClassPrepRefresh()

  const { data: context, isLoading: ctxLoading } = useClassPrepContext(selectedGroupId)
  const { data: ai, isLoading: aiLoading } = useClassPrep(selectedGroupId || context?.group?.id)

  const ctx = context || {}
  const minutesUntil = ctx.next_class?.minutes_until
  const canStartNow = minutesUntil !== undefined && minutesUntil < 30

  const handleRefreshAi = async () => {
    const gid = selectedGroupId || ctx.group?.id
    if (!gid) return
    try { await refresh(gid) } catch {}
  }

  const handleStartClass = () => {
    const gid = selectedGroupId || ctx.group?.id
    const uid = ctx.unit?.id || null
    startClass(uid, gid)
    navigate('/trainer/live')
  }

  if (isClassMode) {
    return (
      <div className="cp-page" dir="rtl">
        <div className="cp-active-banner">
          <span className="cp-active-dot" />
          الحصة جارية
          <button onClick={() => navigate('/trainer/live')} className="cp-active-btn">
            العودة إلى الحصة
          </button>
        </div>
      </div>
    )
  }

  if (ctxLoading) {
    return <div className="cp-page" dir="rtl"><Skeleton /></div>
  }

  if (ctx?.error === 'no_group_found') {
    return (
      <div className="cp-page" dir="rtl">
        <CommandCard className="cp-empty-state">
          <AlertCircle size={40} className="cp-empty-icon" />
          <h3 className="cp-empty-title">لا توجد حصص قادمة</h3>
          <p className="cp-empty-text">تأكّد من إعداد مجموعاتك وجدولة الحصص.</p>
        </CommandCard>
      </div>
    )
  }

  return (
    <div className="cp-page" dir="rtl">
      {/* Hero: unit + countdown */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="cp-hero"
      >
        <div className="cp-hero__content">
          <div className="cp-hero__countdown">
            <Clock size={14} />
            {minutesUntil !== undefined ? (
              minutesUntil < 60
                ? `الحصة بعد ${Math.floor(minutesUntil)} دقيقة`
                : `الحصة بعد ${Math.floor(minutesUntil / 60)}س ${Math.floor(minutesUntil % 60)}د`
            ) : 'لا يوجد موعد محدد'}
          </div>
          <h1 className="cp-hero__unit">{ctx.unit?.title || 'وحدة غير محددة'}</h1>
          <p className="cp-hero__group">
            {ctx.group?.name || '—'} · Level {ctx.group?.level || '—'}
            {ctx.unit?.order_index && ` · الوحدة ${ctx.unit.order_index}`}
          </p>
        </div>
        <BookOpen size={48} className="cp-hero__icon" strokeWidth={1.2} />
        <button
          onClick={handleStartClass}
          disabled={!canStartNow}
          className={`cp-start-btn ${canStartNow ? 'cp-start-btn--ready' : ''}`}
        >
          <Play size={16} fill="currentColor" />
          {canStartNow ? 'ابدأ الحصة الآن' : 'ابدأ الحصة (قريباً)'}
        </button>
      </motion.div>

      {/* Cards row */}
      <div className="cp-cards">
        <WeaknessCard weaknesses={ctx.weaknesses} />
        <TalkingPointsCard ai={ai} isLoading={aiLoading} onRefresh={handleRefreshAi} />
        <StudentsCard ai={ai} />
      </div>

      {/* Success story + focus areas */}
      {(ai?.success_story?.name || ai?.focus_areas?.length > 0) && (
        <div className="cp-cards cp-cards--bottom">
          {ai?.success_story?.name && (
            <CommandCard className="cp-card cp-card--celebrate">
              <div className="cp-card__header">
                <Sparkles size={16} className="cp-card__icon" />
                <h3 className="cp-card__title">قصة نجاح للإشادة</h3>
              </div>
              <div className="cp-success__name">{ai.success_story.name}</div>
              <p className="cp-success__moment">{ai.success_story.moment}</p>
              <p className="cp-success__tip">💡 ابدأ الحصة بذكر هذه اللحظة</p>
            </CommandCard>
          )}
          {ai?.focus_areas?.length > 0 && (
            <CommandCard className="cp-card">
              <div className="cp-card__header">
                <Target size={16} className="cp-card__icon" />
                <h3 className="cp-card__title">مجالات التركيز</h3>
              </div>
              <div className="cp-focus__list">
                {ai.focus_areas.map((f, i) => (
                  <div key={i} className="cp-focus__item">
                    <div className="cp-focus__title">{f.title}</div>
                    <div className="cp-focus__reason">{f.reason}</div>
                  </div>
                ))}
              </div>
            </CommandCard>
          )}
        </div>
      )}
    </div>
  )
}
