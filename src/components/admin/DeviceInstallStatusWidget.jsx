import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Smartphone, Tablet, Monitor, CheckCircle2, AlertTriangle, XCircle, RefreshCw, EyeOff, Eye } from 'lucide-react'
import { useDeviceInstallStatus } from '../../hooks/useDeviceInstallStatus'

const STORAGE_KEY = 'device_install_widget_hidden'
const STORAGE_KEY_AT = 'device_install_widget_hidden_at'
// Any dismissal before this timestamp is auto-cleared (fix for accidental hide)
const FIX_TIMESTAMP = 1744042800000 // 2026-04-07T17:00:00Z

function StatCard({ value, label, color }) {
  const colors = {
    emerald: { border: 'rgba(16,185,129,0.3)', text: 'var(--accent-emerald, #10b981)', bg: 'rgba(16,185,129,0.06)' },
    sky: { border: 'rgba(56,189,248,0.3)', text: 'var(--accent-sky)', bg: 'rgba(56,189,248,0.06)' },
    purple: { border: 'rgba(168,85,247,0.3)', text: 'var(--accent-violet)', bg: 'rgba(168,85,247,0.06)' },
    red: { border: 'rgba(239,68,68,0.3)', text: '#ef4444', bg: 'rgba(239,68,68,0.06)' },
  }
  const c = colors[color]
  return (
    <div className="flex-1 min-w-[70px] rounded-xl px-3 py-3 text-center" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
      <div className="text-2xl font-black" style={{ color: c.text }}>{value}</div>
      <div className="text-[11px] mt-0.5 font-medium" style={{ color: 'var(--text-tertiary)' }}>{label}</div>
    </div>
  )
}

function StatusIcon({ complete, hasPhone, hasTablet, deviceCount }) {
  if (complete) return <CheckCircle2 size={16} className="text-emerald-400" />
  if (deviceCount > 0) return <AlertTriangle size={16} className="text-amber-400" />
  return <XCircle size={16} className="text-red-400" />
}

function DeviceIndicator({ active, icon: Icon, label }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px]" title={label}>
      <Icon size={13} style={{ color: active ? 'var(--accent-emerald, #10b981)' : 'var(--text-tertiary)', opacity: active ? 1 : 0.3 }} />
      {active
        ? <CheckCircle2 size={10} className="text-emerald-400" />
        : <XCircle size={10} style={{ color: 'var(--text-tertiary)', opacity: 0.3 }} />
      }
    </span>
  )
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-2.5 animate-pulse">
      <div className="w-4 h-4 rounded-full" style={{ background: 'var(--surface-raised)' }} />
      <div className="h-3 rounded flex-1 max-w-[120px]" style={{ background: 'var(--surface-raised)' }} />
      <div className="h-3 w-16 rounded" style={{ background: 'var(--surface-raised)' }} />
    </div>
  )
}

// Small restore button shown when the widget is hidden
export function RestoreWidgetButton({ onRestore }) {
  return (
    <button
      onClick={onRestore}
      className="flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
      style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)' }}
      onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent-gold, #f59e0b)'; e.currentTarget.style.borderColor = 'rgba(245,158,11,0.3)' }}
      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.borderColor = 'var(--border-subtle)' }}
    >
      <Eye size={14} />
      إظهار حالة التثبيت والإشعارات
    </button>
  )
}

export default function DeviceInstallStatusWidget() {
  const [hidden, setHidden] = useState(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY) === 'true'
    if (!dismissed) return false
    // Auto-clear old dismissals from before the fix
    const dismissedAt = localStorage.getItem(STORAGE_KEY_AT)
    if (!dismissedAt || parseInt(dismissedAt, 10) < FIX_TIMESTAMP) {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(STORAGE_KEY_AT)
      return false
    }
    return true
  })
  const { students, summary, loading, error, refetch } = useDeviceInstallStatus()

  if (hidden) {
    return (
      <RestoreWidgetButton onRestore={() => {
        localStorage.removeItem(STORAGE_KEY)
        localStorage.removeItem(STORAGE_KEY_AT)
        setHidden(false)
      }} />
    )
  }

  const handleHide = () => {
    const confirmed = window.confirm(
      'هل أنت متأكد من إخفاء قائمة حالة التثبيت؟\n\nيمكنك إعادة إظهارها من زر "إظهار حالة التثبيت" في أعلى لوحة التحكم.'
    )
    if (!confirmed) return
    localStorage.setItem(STORAGE_KEY, 'true')
    localStorage.setItem(STORAGE_KEY_AT, Date.now().toString())
    setHidden(true)
  }

  // Group students by group
  const grouped = {}
  for (const s of students) {
    const key = s.group_id || '_ungrouped'
    if (!grouped[key]) grouped[key] = { name: s.group_name || 'بدون مجموعة', level: s.group_level, students: [] }
    grouped[key].students.push(s)
  }

  // Sort groups by level
  const groupEntries = Object.entries(grouped).sort((a, b) => (a[1].level || 99) - (b[1].level || 99))

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-5 sm:p-6"
      style={{ background: 'var(--surface-base)', border: '1px solid var(--border-subtle)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
          📱 حالة تثبيت التطبيق والإشعارات
        </h2>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => refetch()}
            className="p-2 rounded-lg transition-all hover:scale-105 active:scale-95"
            style={{ color: 'var(--text-tertiary)' }}
            title="تحديث"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={handleHide}
            className="p-2 rounded-lg transition-all hover:scale-105 active:scale-95"
            style={{ color: 'var(--text-tertiary)' }}
            title="إخفاء مؤقت — يمكن إعادة الإظهار في أي وقت"
          >
            <EyeOff size={14} />
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="text-center py-6">
          <p className="text-sm" style={{ color: '#ef4444' }}>خطأ في تحميل البيانات</p>
          <button onClick={() => refetch()} className="text-xs mt-2 px-3 py-1.5 rounded-lg" style={{ color: 'var(--accent-sky)' }}>
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && !students.length && (
        <div className="space-y-2">
          <div className="flex gap-3 mb-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex-1 h-16 rounded-xl animate-pulse" style={{ background: 'var(--surface-raised)' }} />
            ))}
          </div>
          {[1, 2, 3, 4, 5].map(i => <SkeletonRow key={i} />)}
        </div>
      )}

      {/* Content */}
      {!error && (students.length > 0 || !loading) && (
        <>
          {/* Summary stats */}
          <div className="flex gap-2.5 mb-4 flex-wrap">
            <StatCard value={summary.complete} label="مكتمل" color="emerald" />
            <StatCard value={summary.withPhone} label="جوال" color="sky" />
            <StatCard value={summary.withTablet} label="آيباد" color="purple" />
            <StatCard value={summary.missing} label="ناقص" color="red" />
          </div>

          {/* Warning banner */}
          {summary.total > 0 && summary.complete < summary.total && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl mb-4" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)' }}>
              <AlertTriangle size={14} className="text-amber-400 shrink-0" />
              <p className="text-xs font-medium" style={{ color: 'var(--accent-gold, #f59e0b)' }}>
                {summary.total - summary.complete} من {summary.total} طالب لم يكملوا التثبيت على الجوال والآيباد
              </p>
            </div>
          )}

          {/* Empty state */}
          {students.length === 0 && !loading && (
            <div className="text-center py-6">
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>لا يوجد طلاب مسجلين</p>
            </div>
          )}

          {/* Grouped student list */}
          {groupEntries.map(([key, group]) => (
            <div key={key} className="mb-3">
              <div className="flex items-center gap-2 mb-1.5 mt-3">
                <span className="text-xs font-bold" style={{ color: 'var(--accent-gold, #f59e0b)' }}>
                  {group.name}
                  {group.level && <span className="font-normal" style={{ color: 'var(--text-tertiary)' }}> (Level {group.level})</span>}
                </span>
              </div>
              {group.students.map(student => (
                <div
                  key={student.id}
                  className="flex items-center gap-3 py-2 px-1"
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}
                >
                  <StatusIcon {...student} />
                  <span className="text-xs font-medium flex-1 min-w-0 truncate" style={{ color: 'var(--text-primary)' }}>
                    {student.full_name}
                  </span>

                  {student.deviceCount === 0 ? (
                    <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>لم يثبّت التطبيق</span>
                  ) : (
                    <div className="flex items-center gap-3">
                      <DeviceIndicator active={student.hasPhone} icon={Smartphone} label="جوال" />
                      <DeviceIndicator active={student.hasTablet} icon={Tablet} label="آيباد" />
                      {student.hasDesktop && (
                        <span className="inline-flex items-center gap-0.5" title="كمبيوتر">
                          <Monitor size={12} style={{ color: 'var(--text-tertiary)' }} />
                        </span>
                      )}
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{
                        background: student.complete ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                        color: student.complete ? '#10b981' : '#f59e0b',
                      }}>
                        {student.complete ? 'مكتمل' : student.hasPhone && !student.hasTablet ? 'ناقص آيباد' : student.hasTablet && !student.hasPhone ? 'ناقص جوال' : 'جزئي'}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}

          {/* Placeholder button for future reminder feature */}
          <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <button
              disabled
              className="text-xs px-4 py-2 rounded-xl opacity-40 cursor-not-allowed"
              style={{ background: 'var(--surface-raised)', color: 'var(--text-tertiary)' }}
            >
              🔔 إرسال تذكير لجميع الطلاب الناقصين (قريباً)
            </button>
          </div>
        </>
      )}
    </motion.div>
  )
}
