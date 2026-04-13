import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Search, Eye, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { toast } from '../../components/ui/FluentiaToast'

const STATUS_TABS = [
  { key: 'all', label: 'الكل' },
  { key: 'pending', label: 'قيد المراجعة' },
  { key: 'approved', label: 'معتمدين' },
  { key: 'rejected', label: 'مرفوضين' },
  { key: 'suspended', label: 'موقوفين' },
]

const STATUS_CONFIG = {
  pending: { label: 'قيد المراجعة', color: 'amber' },
  approved: { label: 'معتمد', color: 'emerald' },
  rejected: { label: 'مرفوض', color: 'red' },
  suspended: { label: 'موقوف', color: 'gray' },
}

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  const colorClasses = {
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    gray: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClasses[config.color]}`}>
      {config.label}
    </span>
  )
}

export default function AffiliatesList() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')

  const { data: affiliates, isLoading } = useQuery({
    queryKey: ['admin-affiliates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('affiliates')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
  })

  const filtered = affiliates?.filter(a => {
    if (activeTab !== 'all' && a.status !== activeTab) return false
    if (!search) return true
    const name = a.full_name || ''
    const email = a.email || ''
    const code = a.ref_code || ''
    const phone = a.phone || ''
    return (
      name.includes(search) ||
      email.toLowerCase().includes(search.toLowerCase()) ||
      code.toLowerCase().includes(search.toLowerCase()) ||
      phone.includes(search)
    )
  })

  const tabCounts = {
    all: affiliates?.length || 0,
    pending: affiliates?.filter(a => a.status === 'pending').length || 0,
    approved: affiliates?.filter(a => a.status === 'approved').length || 0,
    rejected: affiliates?.filter(a => a.status === 'rejected').length || 0,
    suspended: affiliates?.filter(a => a.status === 'suspended').length || 0,
  }

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center">
            <Users size={22} className="text-sky-400" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-page-title text-[var(--text-primary)]">إدارة الشركاء</h1>
            <p className="text-muted text-sm mt-1">{affiliates?.length || 0} شريك</p>
          </div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="fl-card-static p-7 space-y-6">
        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                  : 'bg-[var(--surface-base)] text-muted hover:text-[var(--text-primary)] border border-transparent'
              }`}
            >
              {tab.label}
              <span className="mr-2 text-xs opacity-70">({tabCounts[tab.key]})</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="بحث بالاسم أو الإيميل أو الكود..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pr-10 py-2 text-sm w-full"
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="fl-card-static p-12 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-muted" />
        </div>
      ) : !filtered?.length ? (
        <div className="fl-card-static p-12 text-center text-muted">
          لا يوجد شركاء
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="fl-card-static overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="text-right">الاسم</th>
                  <th className="text-right">الكود</th>
                  <th className="text-right">الهاتف</th>
                  <th className="text-right">الإيميل</th>
                  <th className="text-right">الحالة</th>
                  <th className="text-right">تاريخ التقديم</th>
                  <th className="text-right">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filtered.map(a => (
                    <motion.tr
                      key={a.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <td className="text-[var(--text-primary)] font-medium">{a.full_name}</td>
                      <td>
                        <code className="text-xs bg-[var(--surface-base)] px-2 py-1 rounded text-sky-400">
                          {a.ref_code}
                        </code>
                      </td>
                      <td className="text-muted text-sm" dir="ltr">{a.phone || '—'}</td>
                      <td className="text-muted text-sm" dir="ltr">{a.email}</td>
                      <td><StatusBadge status={a.status} /></td>
                      <td className="text-muted text-sm">
                        {a.created_at ? new Date(a.created_at).toLocaleDateString('ar-SA') : '—'}
                      </td>
                      <td>
                        <button
                          onClick={() => navigate(`/admin/affiliates/${a.id}`)}
                          className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                        >
                          <Eye size={14} />
                          عرض
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  )
}
