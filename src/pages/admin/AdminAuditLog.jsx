import { useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Clock, User, ChevronDown, ChevronUp, Filter } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { timeAgo } from '../../utils/dateHelpers'

// ─── Action type config ──────────────────────────────────────
const ACTION_TYPES = {
  'student.create':   { label: 'إنشاء طالب',     color: 'text-emerald-400 bg-emerald-500/10' },
  'student.update':   { label: 'تعديل طالب',     color: 'text-sky-400 bg-sky-500/10' },
  'student.delete':   { label: 'حذف طالب',       color: 'text-red-400 bg-red-500/10' },
  'payment.record':   { label: 'تسجيل دفعة',     color: 'text-emerald-400 bg-emerald-500/10' },
  'payment.update':   { label: 'تعديل دفعة',     color: 'text-sky-400 bg-sky-500/10' },
  'payment.delete':   { label: 'حذف دفعة',       color: 'text-red-400 bg-red-500/10' },
  'level.promote':    { label: 'ترقية مستوى',     color: 'text-amber-400 bg-amber-500/10' },
  'group.create':     { label: 'إنشاء مجموعة',   color: 'text-emerald-400 bg-emerald-500/10' },
  'group.update':     { label: 'تعديل مجموعة',   color: 'text-sky-400 bg-sky-500/10' },
  'group.delete':     { label: 'حذف مجموعة',     color: 'text-red-400 bg-red-500/10' },
  'trainer.create':   { label: 'إضافة مدرب',     color: 'text-emerald-400 bg-emerald-500/10' },
  'trainer.update':   { label: 'تعديل مدرب',     color: 'text-sky-400 bg-sky-500/10' },
  'settings.update':  { label: 'تعديل إعدادات',  color: 'text-sky-400 bg-sky-500/10' },
}

function getActionStyle(action) {
  if (ACTION_TYPES[action]) return ACTION_TYPES[action]
  if (action?.includes('create')) return { label: action, color: 'text-emerald-400 bg-emerald-500/10' }
  if (action?.includes('update')) return { label: action, color: 'text-sky-400 bg-sky-500/10' }
  if (action?.includes('delete')) return { label: action, color: 'text-red-400 bg-red-500/10' }
  if (action?.includes('promote')) return { label: action, color: 'text-amber-400 bg-amber-500/10' }
  return { label: action, color: 'text-slate-400 bg-slate-500/10' }
}

const TARGET_LABELS = {
  student: 'طالب',
  payment: 'دفعة',
  group: 'مجموعة',
  trainer: 'مدرب',
  settings: 'إعدادات',
  level: 'مستوى',
}

const PAGE_SIZE = 20

// ─── Diff viewer ─────────────────────────────────────────────
function DiffView({ oldData, newData }) {
  if (!oldData && !newData) return null

  const allKeys = [...new Set([
    ...Object.keys(oldData || {}),
    ...Object.keys(newData || {}),
  ])]

  const changedKeys = allKeys.filter(k => {
    const o = JSON.stringify(oldData?.[k])
    const n = JSON.stringify(newData?.[k])
    return o !== n
  })

  if (changedKeys.length === 0 && oldData && newData) {
    return <p className="text-slate-500 text-sm">لا توجد تغييرات</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="data-table w-full text-sm">
        <thead>
          <tr className="text-slate-400 border-b border-white/5">
            <th className="text-right py-2 px-3 font-medium">الحقل</th>
            <th className="text-right py-2 px-3 font-medium">القيمة القديمة</th>
            <th className="text-right py-2 px-3 font-medium">القيمة الجديدة</th>
          </tr>
        </thead>
        <tbody>
          {changedKeys.map(key => (
            <tr key={key} className="border-b border-white/5">
              <td className="py-2 px-3 text-slate-300 font-mono text-xs">{key}</td>
              <td className="py-2 px-3 text-red-400/70">
                {oldData?.[key] !== undefined ? String(oldData[key]) : '—'}
              </td>
              <td className="py-2 px-3 text-emerald-400/70">
                {newData?.[key] !== undefined ? String(newData[key]) : '—'}
              </td>
            </tr>
          ))}
          {!oldData && newData && (
            <tr>
              <td colSpan={3} className="py-2 px-3 text-emerald-400/70 text-xs">
                إنشاء جديد — {JSON.stringify(newData, null, 2).slice(0, 200)}
              </td>
            </tr>
          )}
          {oldData && !newData && (
            <tr>
              <td colSpan={3} className="py-2 px-3 text-red-400/70 text-xs">
                حذف — {JSON.stringify(oldData, null, 2).slice(0, 200)}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────
export default function AdminAuditLog() {
  const [page, setPage] = useState(0)
  const [filterAction, setFilterAction] = useState('')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit-log', page, filterAction, search, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from('audit_log')
        .select('*, actor:actor_id(full_name, display_name)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      if (filterAction) query = query.eq('action', filterAction)
      if (search) query = query.ilike('description', `%${search}%`)
      if (dateFrom) query = query.gte('created_at', `${dateFrom}T00:00:00`)
      if (dateTo) query = query.lte('created_at', `${dateTo}T23:59:59`)

      const { data: rows, count } = await query
      return { rows: rows || [], count: count || 0 }
    },
    placeholderData: keepPreviousData,
  })

  const logs = data?.rows || []
  const totalCount = data?.count || 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const uniqueActions = [...new Set(Object.keys(ACTION_TYPES))]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-violet-500/10">
          <Shield className="w-6 h-6 text-violet-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">سجل المراجعة</h1>
          <p className="text-sm text-slate-400">تتبع جميع العمليات والتغييرات في النظام</p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-400 font-medium">تصفية</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Action filter */}
          <select
            value={filterAction}
            onChange={e => { setFilterAction(e.target.value); setPage(0) }}
            className="input-field text-sm"
          >
            <option value="">كل العمليات</option>
            {uniqueActions.map(a => (
              <option key={a} value={a}>{ACTION_TYPES[a]?.label || a}</option>
            ))}
          </select>

          {/* Search */}
          <input
            type="text"
            placeholder="بحث بالوصف..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0) }}
            className="input-field text-sm"
          />

          {/* Date from */}
          <input
            type="date"
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setPage(0) }}
            className="input-field text-sm"
            placeholder="من تاريخ"
          />

          {/* Date to */}
          <input
            type="date"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); setPage(0) }}
            className="input-field text-sm"
            placeholder="إلى تاريخ"
          />
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>لا توجد سجلات</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-slate-400">
                  <th className="text-right py-3 px-4 font-medium">الوقت</th>
                  <th className="text-right py-3 px-4 font-medium">المستخدم</th>
                  <th className="text-right py-3 px-4 font-medium">العملية</th>
                  <th className="text-right py-3 px-4 font-medium">الوصف</th>
                  <th className="text-right py-3 px-4 font-medium">الهدف</th>
                  <th className="py-3 px-4 w-10" />
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {logs.map(log => {
                    const actionStyle = getActionStyle(log.action)
                    const isExpanded = expandedId === log.id
                    const hasDiff = log.old_data || log.new_data
                    const actorName = log.actor?.display_name || log.actor?.full_name || 'غير معروف'

                    return (
                      <motion.tr
                        key={log.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="border-b border-white/5 hover:bg-white/[0.02] cursor-pointer"
                        onClick={() => hasDiff && setExpandedId(isExpanded ? null : log.id)}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span className="whitespace-nowrap">{timeAgo(log.created_at)}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <User className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                            <span>{actorName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`badge ${actionStyle.color} text-xs px-2 py-1 rounded-full`}>
                            {actionStyle.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-300 max-w-xs truncate">
                          {log.description}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-slate-500 text-xs">
                            {TARGET_LABELS[log.target_type] || log.target_type}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {hasDiff && (
                            isExpanded
                              ? <ChevronUp className="w-4 h-4 text-slate-500" />
                              : <ChevronDown className="w-4 h-4 text-slate-500" />
                          )}
                        </td>
                      </motion.tr>
                    )
                  })}
                </AnimatePresence>
              </tbody>
            </table>

            {/* Expanded diff rows */}
            {logs.map(log => {
              if (expandedId !== log.id) return null
              const hasDiff = log.old_data || log.new_data
              if (!hasDiff) return null

              return (
                <motion.div
                  key={`diff-${log.id}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-white/[0.02] border-b border-white/5 px-6 py-4"
                >
                  <p className="text-xs text-slate-500 mb-2 font-medium">التغييرات:</p>
                  <DiffView oldData={log.old_data} newData={log.new_data} />
                  {log.ip_address && (
                    <p className="text-xs text-slate-600 mt-2">IP: {log.ip_address}</p>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
            <span className="text-xs text-slate-500">
              {totalCount} سجل — صفحة {page + 1} من {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="btn-ghost px-3 py-1.5 text-xs rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
              >
                السابق
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="btn-ghost px-3 py-1.5 text-xs rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
              >
                التالي
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
