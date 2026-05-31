// /admin/retention — master switch UI for per-student per-module enable flags.
// Admin can toggle individual cells or bulk-enable a module for an entire group.

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, X, RefreshCw, Users } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { RETENTION_MODULES, MODULE_LABELS_AR } from '../../../lib/retention/constants'
import { useRetentionModuleStatus } from '../../../lib/retention/useRetentionModule'
import AuroraBackground from '../../../design-system/components/AuroraBackground'
import GlassPanel from '../../../design-system/components/GlassPanel'
import DailyLettersPanel from './DailyLettersPanel'

const MODULE_KEYS = [
  RETENTION_MODULES.STREAK_ACTIVATION,
  RETENTION_MODULES.SMART_HOMEWORK,
  RETENTION_MODULES.DAILY_PARTNER,
  RETENTION_MODULES.LESSON_BRIEFS,
  RETENTION_MODULES.WEEKLY_REPORTS,
]
const COLUMN_KEY = {
  [RETENTION_MODULES.STREAK_ACTIVATION]: 'streak_activation_enabled',
  [RETENTION_MODULES.SMART_HOMEWORK]: 'smart_homework_enabled',
  [RETENTION_MODULES.DAILY_PARTNER]: 'daily_partner_enabled',
  [RETENTION_MODULES.LESSON_BRIEFS]: 'lesson_briefs_enabled',
  [RETENTION_MODULES.WEEKLY_REPORTS]: 'weekly_reports_enabled',
}

export default function RetentionMasterSwitch() {
  const status = useRetentionModuleStatus()
  const groups = useQuery({
    queryKey: ['retention-groups'],
    queryFn: async () => {
      const { data, error } = await supabase.from('groups').select('id, name, level').order('name')
      if (error) throw error
      return data || []
    },
  })
  const qc = useQueryClient()
  const [toggling, setToggling] = useState(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)

  const toggle = async (studentId, moduleKey, currentValue) => {
    const k = `${studentId}:${moduleKey}`
    setToggling((s) => new Set(s).add(k))
    try {
      const { error } = await supabase.rpc('retention_set_module_enabled', {
        p_student_ids: [studentId],
        p_module_key: moduleKey,
        p_enabled: !currentValue,
        p_notes: null,
      })
      if (error) throw error
      await qc.invalidateQueries({ queryKey: ['retention-module-status'] })
    } catch (e) {
      window.alert('فشل التحديث: ' + (e?.message ?? 'خطأ غير معروف'))
    } finally {
      setToggling((s) => { const next = new Set(s); next.delete(k); return next })
    }
  }

  const bulkEnable = async (groupId, moduleKey, enable) => {
    if (!groupId) return
    if (!window.confirm(`متأكدة من ${enable ? 'تفعيل' : 'إيقاف'} ${MODULE_LABELS_AR[moduleKey]} لكل طالبات هذه المجموعة؟`)) return
    setBulkBusy(true)
    try {
      const studentIds = (status.data || []).filter((s) => s.group_id === groupId).map((s) => s.student_id)
      if (studentIds.length === 0) { setBulkBusy(false); return }
      const { error } = await supabase.rpc('retention_set_module_enabled', {
        p_student_ids: studentIds,
        p_module_key: moduleKey,
        p_enabled: enable,
        p_notes: 'bulk via admin UI',
      })
      if (error) throw error
      await qc.invalidateQueries({ queryKey: ['retention-module-status'] })
    } catch (e) {
      window.alert('فشل التحديث الجماعي: ' + (e?.message ?? 'خطأ غير معروف'))
    } finally {
      setBulkBusy(false)
    }
  }

  if (status.isLoading) return <div className="p-8" dir="rtl"><div className="h-32 animate-pulse" /></div>

  const groupMap = new Map((groups.data || []).map((g) => [g.id, g.name]))
  const byGroup = new Map()
  for (const s of (status.data || [])) {
    const key = s.group_id || 'unassigned'
    if (!byGroup.has(key)) byGroup.set(key, [])
    byGroup.get(key).push(s)
  }

  return (
    <div className="relative min-h-screen" dir="rtl">
      <AuroraBackground />
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-5 relative">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--ds-text-primary)' }}>نظام بقاء الطالبات</h1>
            <p className="mt-2" style={{ color: 'var(--ds-text-secondary)' }}>
              فعّلي وحدات نظام البقاء لكل طالبة. كل وحدة معطّلة بشكل افتراضي.
            </p>
          </div>
          <button onClick={() => status.refetch()} className="px-3 py-2 text-sm flex items-center gap-1"
            style={{ border: '1px solid var(--ds-border-subtle)', color: 'var(--ds-text-secondary)', borderRadius: 'var(--radius-md)' }}>
            <RefreshCw size={14} /> تحديث
          </button>
        </div>

        <DailyLettersPanel />

        {[...byGroup.entries()].map(([groupKey, students]) => (
          <GlassPanel key={groupKey} padding="md">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-lg" style={{ color: 'var(--ds-text-primary)' }}>
                <Users size={16} className="inline ml-1" />
                {groupMap.get(groupKey) || (groupKey === 'unassigned' ? 'بدون مجموعة' : 'مجموعة')}
                {' '}({students.length})
              </h2>
              {groupKey !== 'unassigned' && (
                <div className="flex gap-1 flex-wrap">
                  {MODULE_KEYS.map((mk) => (
                    <button
                      key={mk}
                      onClick={() => bulkEnable(groupKey, mk, true)}
                      disabled={bulkBusy}
                      className="text-xs px-2 py-1"
                      style={{
                        border: '1px solid var(--ds-border-subtle)',
                        color: 'var(--ds-text-secondary)',
                        borderRadius: 'var(--radius-sm)',
                      }}
                      title={`فعّل ${MODULE_LABELS_AR[mk]} للمجموعة كلها`}
                    >
                      + {MODULE_LABELS_AR[mk]}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ color: 'var(--ds-text-tertiary)' }}>
                    <th className="text-right p-2 font-normal">الطالبة</th>
                    <th className="text-center p-2 font-normal">مستوى</th>
                    {MODULE_KEYS.map((mk) => (
                      <th key={mk} className="text-center p-2 font-normal whitespace-nowrap">{MODULE_LABELS_AR[mk]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.student_id} style={{ borderTop: '1px solid var(--ds-border-subtle)' }}>
                      <td className="p-2 font-medium" style={{ color: 'var(--ds-text-primary)' }}>{s.full_name}</td>
                      <td className="p-2 text-center" style={{ color: 'var(--ds-text-tertiary)' }}>L{s.academic_level ?? '?'}</td>
                      {MODULE_KEYS.map((mk) => {
                        const enabled = s[COLUMN_KEY[mk]]
                        const k = `${s.student_id}:${mk}`
                        const isPending = toggling.has(k)
                        return (
                          <td key={mk} className="p-2 text-center">
                            <motion.button
                              whileTap={{ scale: 0.9 }}
                              onClick={() => toggle(s.student_id, mk, enabled)}
                              disabled={isPending}
                              className="w-7 h-7 inline-flex items-center justify-center"
                              style={{
                                background: enabled ? 'var(--ds-accent-success)' : 'var(--ds-surface-2)',
                                color: enabled ? 'var(--ds-text-inverse)' : 'var(--ds-text-tertiary)',
                                borderRadius: 'var(--radius-full)',
                                opacity: isPending ? 0.6 : 1,
                                border: '1px solid ' + (enabled ? 'var(--ds-accent-success)' : 'var(--ds-border-subtle)'),
                              }}
                            >
                              {enabled ? <Check size={14} /> : <X size={14} />}
                            </motion.button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassPanel>
        ))}
      </div>
    </div>
  )
}
