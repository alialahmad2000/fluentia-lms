import { useEffect, useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { Square } from 'lucide-react'
import useClassMode from '@/stores/classModeStore'
import { useCloseClassSession } from '@/hooks/trainer/useCloseClassSession'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import QuickPointsPopup from '@/components/trainer/QuickPointsPopup'
import AttendancePopup from '@/components/trainer/AttendancePopup'
import QuickNotePopup from '@/components/trainer/QuickNotePopup'
import TimerPopup from '@/components/trainer/TimerPopup'
import UnitProgressPopup from '@/components/trainer/UnitProgressPopup'
import './LiveClassPage.css'

const TOOLS = [
  { id: 'points',     emoji: '🎯', label: 'نقاط' },
  { id: 'attendance', emoji: '✋', label: 'حضور' },
  { id: 'note',       emoji: '📝', label: 'ملاحظة' },
  { id: 'timer',      emoji: '⏱', label: 'تايمر' },
  { id: 'progress',   emoji: '📊', label: 'تقدم' },
]

export default function LiveClassPage() {
  const navigate = useNavigate()
  const {
    isClassMode, currentGroupId, currentUnitId, classStartedAt,
    endClass, timerRunning,
  } = useClassMode()
  const closeSession = useCloseClassSession()
  const [openPopup, setOpenPopup] = useState(null)
  const [elapsed, setElapsed] = useState(0)

  // Count students for the session close
  const { data: students } = useQuery({
    queryKey: ['live-class-students', currentGroupId],
    queryFn: async () => {
      if (!currentGroupId) return []
      const { data } = await supabase
        .from('students')
        .select('id')
        .eq('group_id', currentGroupId)
        .eq('status', 'active')
        .is('deleted_at', null)
      return data || []
    },
    enabled: !!currentGroupId,
  })

  // Elapsed timer
  useEffect(() => {
    if (!isClassMode || !classStartedAt) return
    const tick = () => {
      const mins = Math.floor((Date.now() - new Date(classStartedAt).getTime()) / 60_000)
      setElapsed(mins)
    }
    tick()
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [isClassMode, classStartedAt])

  // Redirect if no active session
  if (!isClassMode) return <Navigate to="/trainer/prep" replace />

  const togglePopup = (id) => setOpenPopup((prev) => (prev === id ? null : id))

  const handleEndClass = async () => {
    if (!window.confirm('هل تريد إنهاء الحصة؟ سيتم حفظ الملخص.')) return
    try {
      await closeSession.mutateAsync({
        groupId: currentGroupId,
        unitId: currentUnitId,
        durationMinutes: elapsed || 1,
        attendedCount: students?.length || 0,
        totalCount: students?.length || 0,
        notes: null,
      })
      endClass()
      navigate('/trainer')
    } catch (err) {
      window.alert('حدث خطأ: ' + err.message)
    }
  }

  return (
    <div className="lc-page" dir="rtl">
      {/* Top bar */}
      <div className="lc-topbar">
        <div className="lc-topbar__status">
          <span className="lc-live-dot" />
          <span>الحصة جارية · {elapsed} دقيقة</span>
        </div>
        <button
          onClick={handleEndClass}
          disabled={closeSession.isPending}
          className="lc-end-btn"
        >
          <Square size={12} fill="currentColor" />
          إنهاء الحصة
        </button>
      </div>

      {/* Main content area */}
      <div className="lc-content">
        {currentUnitId ? (
          <div className="lc-unit-display">
            <p className="lc-unit-label">الوحدة الحالية</p>
            <p className="lc-unit-hint">افتح المحتوى من "تقدم" للمراجعة مع الطلاب</p>
          </div>
        ) : (
          <div className="lc-unit-display">
            <p className="lc-unit-label">لا توجد وحدة محددة</p>
            <p className="lc-unit-hint">استخدم الأدوات أدناه لتسجيل الحضور والنقاط</p>
          </div>
        )}
      </div>

      {/* Bottom toolbar */}
      <div className="lc-toolbar">
        <div className="lc-toolbar__inner">
          {TOOLS.map(({ id, emoji, label }) => (
            <button
              key={id}
              onClick={() => togglePopup(id)}
              className={`lc-tool ${openPopup === id ? 'lc-tool--active' : ''}`}
            >
              <span className="lc-tool__icon">{emoji}</span>
              <span className="lc-tool__label">{label}</span>
              {id === 'timer' && timerRunning && <span className="lc-tool__badge" />}
            </button>
          ))}
        </div>
      </div>

      {/* Popups */}
      <AnimatePresence>
        {openPopup === 'points' && currentGroupId && (
          <QuickPointsPopup groupId={currentGroupId} onClose={() => setOpenPopup(null)} />
        )}
        {openPopup === 'attendance' && currentGroupId && (
          <AttendancePopup groupId={currentGroupId} onClose={() => setOpenPopup(null)} />
        )}
        {openPopup === 'note' && currentGroupId && (
          <QuickNotePopup groupId={currentGroupId} onClose={() => setOpenPopup(null)} />
        )}
        {openPopup === 'timer' && (
          <TimerPopup onClose={() => setOpenPopup(null)} />
        )}
        {openPopup === 'progress' && currentGroupId && currentUnitId && (
          <UnitProgressPopup
            groupId={currentGroupId}
            unitId={currentUnitId}
            onClose={() => setOpenPopup(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
