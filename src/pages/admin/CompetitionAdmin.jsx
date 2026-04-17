import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Trophy, Users, Zap, Target, Flame, AlertTriangle,
  Download, ChevronUp, ChevronDown, Search, ExternalLink,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'

/* ─── Data hooks ──────────────────────────────────────────────── */
function useLatestComp() {
  return useQuery({
    queryKey: ['latest-competition'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_latest_competition')
      if (error) throw error
      return data
    },
    staleTime: 15_000,
  })
}

function useAdminData(compId) {
  return useQuery({
    queryKey: ['competition-admin-data', compId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_competition_admin_data', {
        p_competition_id: compId,
      })
      if (error) throw error
      return data
    },
    enabled: !!compId,
    staleTime: 15_000,
  })
}

/* ─── CompetitionSummaryCard ──────────────────────────────────── */
function StatusBadge({ status }) {
  const cfg = {
    active: { label: 'نشطة', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
    closed: { label: 'مغلقة', color: '#f43f5e', bg: 'rgba(244,63,94,0.12)' },
    pending: { label: 'قادمة', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  }[status] ?? { label: status, color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' }

  return (
    <span
      className="text-xs font-black px-2.5 py-1 rounded-full"
      style={{ color: cfg.color, background: cfg.bg }}
    >
      {cfg.label}
    </span>
  )
}

function CompetitionSummaryCard({ comp }) {
  if (!comp) return null
  const teamA = comp.team_a
  const teamB = comp.team_b

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', fontFamily: 'Tajawal, sans-serif' }}
      dir="rtl"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy size={18} className="text-yellow-400" />
          <span className="font-bold text-white text-sm">{comp.name ?? comp.title_ar}</span>
        </div>
        <StatusBadge status={comp.status} />
      </div>

      {comp.status === 'closed' && comp.winner_team && (
        <div
          className="mb-4 p-3 rounded-xl text-center"
          style={{ background: 'rgba(245,200,66,0.08)', border: '1px solid rgba(245,200,66,0.2)' }}
        >
          <div className="text-yellow-400 font-black text-sm">
            {comp.winner_team === 'tie'
              ? '🤝 تعادل!'
              : `👑 الفائز: ${comp.winner_team === 'A' ? teamA?.emoji : teamB?.emoji} ${comp.winner_team === 'A' ? teamA?.name : teamB?.name}`}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {[teamA, teamB].map((t) => {
          if (!t) return null
          const isWinnerTeam = comp.winner_team === (t === teamA ? 'A' : 'B')
          return (
            <div
              key={t.name}
              className="rounded-xl p-4 text-center"
              style={{
                background: `${t.color}10`,
                border: `1px solid ${t.color}${isWinnerTeam ? '50' : '20'}`,
              }}
            >
              <div className="text-xl mb-1">{t.emoji}</div>
              <div className="font-bold text-white text-sm mb-1">{t.name}</div>
              <div className="text-2xl font-black tabular-nums" style={{ color: t.color }}>
                {t.victory_points}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">VP</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── VsArena (admin) ─────────────────────────────────────────── */
function VsArenaAdmin({ comp }) {
  if (!comp?.team_a || !comp?.team_b) return null
  const teamA = comp.team_a
  const teamB = comp.team_b
  const total = teamA.victory_points + teamB.victory_points || 1
  const aWidth = Math.round((teamA.victory_points / total) * 100)

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', fontFamily: 'Tajawal, sans-serif' }}
      dir="rtl"
    >
      <div className="text-xs font-bold text-slate-500 mb-3 text-center">التوزيع الحالي للنقاط</div>
      <div className="h-4 rounded-full overflow-hidden flex mb-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <div className="h-full transition-all duration-700" style={{ width: `${aWidth}%`, background: teamA.color }} />
        <div className="h-full transition-all duration-700" style={{ width: `${100 - aWidth}%`, background: teamB.color }} />
      </div>
      <div className="flex justify-between text-sm font-bold">
        <span style={{ color: teamA.color }}>{teamA.emoji} {teamA.name} — {teamA.victory_points} VP</span>
        <span style={{ color: teamB.color }}>{teamB.victory_points} VP — {teamB.name} {teamB.emoji}</span>
      </div>
    </div>
  )
}

/* ─── StudentContributionTable ────────────────────────────────── */
const SORT_KEYS = {
  rank: 'total_xp',
  name: 'student_name',
  total_xp: 'total_xp',
  today_xp: 'today_xp',
  week_xp: 'week_xp',
  enc_sent: 'enc_sent',
  enc_received: 'enc_received',
}

function StudentContributionTable({ students, comp }) {
  const navigate = useNavigate()
  const [sortKey, setSortKey] = useState('total_xp')
  const [sortDir, setSortDir] = useState('desc')
  const [teamFilter, setTeamFilter] = useState('all')
  const [search, setSearch] = useState('')

  const handleSort = useCallback((key) => {
    if (sortKey === key) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    else { setSortKey(key); setSortDir('desc') }
  }, [sortKey])

  const sorted = useMemo(() => {
    if (!students) return []
    let rows = [...students]

    if (teamFilter !== 'all') {
      const groupId = teamFilter === 'A' ? comp?.team_a_group_id : comp?.team_b_group_id
      rows = rows.filter((s) => s.group_id === groupId)
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      rows = rows.filter((s) => (s.student_name ?? '').toLowerCase().includes(q))
    }

    rows.sort((a, b) => {
      const av = a[sortKey] ?? 0
      const bv = b[sortKey] ?? 0
      return sortDir === 'desc'
        ? typeof bv === 'string' ? bv.localeCompare(av) : bv - av
        : typeof av === 'string' ? av.localeCompare(bv) : av - bv
    })

    return rows
  }, [students, teamFilter, search, sortKey, sortDir, comp])

  const SortIcon = ({ k }) => {
    if (sortKey !== k) return <span className="text-slate-700 ml-0.5">↕</span>
    return <span className="ml-0.5" style={{ color: '#38bdf8' }}>{sortDir === 'desc' ? '↓' : '↑'}</span>
  }

  const thClass = 'text-left text-xs font-bold text-slate-500 px-3 py-2.5 cursor-pointer hover:text-white whitespace-nowrap'

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', fontFamily: 'Tajawal, sans-serif' }}
      dir="rtl"
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-white/[0.05]">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Search size={14} className="text-slate-500 flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث باسم الطالب..."
            className="bg-transparent text-sm text-white placeholder-slate-600 outline-none flex-1"
            style={{ fontFamily: 'Tajawal, sans-serif' }}
          />
        </div>
        <div className="flex gap-1">
          {['all', 'A', 'B'].map((t) => (
            <button
              key={t}
              onClick={() => setTeamFilter(t)}
              className="text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
              style={{
                background: teamFilter === t ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.05)',
                color: teamFilter === t ? '#38bdf8' : '#64748b',
                border: `1px solid ${teamFilter === t ? 'rgba(56,189,248,0.3)' : 'rgba(255,255,255,0.07)'}`,
              }}
            >
              {t === 'all' ? 'الكل' : t === 'A' ? comp?.team_a?.emoji : comp?.team_b?.emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <th className={thClass} onClick={() => handleSort('total_xp')}>#</th>
              <th className={thClass} onClick={() => handleSort('student_name')}>الطالب <SortIcon k="student_name" /></th>
              <th className={`${thClass} text-center`}>الفريق</th>
              <th className={thClass} onClick={() => handleSort('total_xp')}>XP الكلي <SortIcon k="total_xp" /></th>
              <th className={thClass} onClick={() => handleSort('today_xp')}>اليوم <SortIcon k="today_xp" /></th>
              <th className={thClass} onClick={() => handleSort('week_xp')}>الأسبوع <SortIcon k="week_xp" /></th>
              <th className={thClass} onClick={() => handleSort('enc_sent')}>تشجيعات ↑ <SortIcon k="enc_sent" /></th>
              <th className={thClass} onClick={() => handleSort('enc_received')}>تشجيعات ↓ <SortIcon k="enc_received" /></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s, i) => {
              const isA = s.group_id === comp?.team_a_group_id
              const team = isA ? comp?.team_a : comp?.team_b
              return (
                <tr
                  key={s.student_id ?? i}
                  className="hover:bg-white/[0.02] cursor-pointer transition-colors"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  onClick={() => navigate(`/admin/student/${s.profile_id}/progress`)}
                >
                  <td className="px-3 py-2.5 text-sm text-slate-500 tabular-nums">#{i + 1}</td>
                  <td className="px-3 py-2.5 text-sm text-white font-medium">{s.student_name}</td>
                  <td className="px-3 py-2.5 text-center text-sm" style={{ color: team?.color }}>{team?.emoji}</td>
                  <td className="px-3 py-2.5 text-sm font-bold tabular-nums text-green-400">{s.total_xp}</td>
                  <td className="px-3 py-2.5 text-sm tabular-nums text-slate-300">{s.today_xp || 0}</td>
                  <td className="px-3 py-2.5 text-sm tabular-nums text-slate-300">{s.week_xp || 0}</td>
                  <td className="px-3 py-2.5 text-sm tabular-nums text-purple-400">{s.enc_sent || 0}</td>
                  <td className="px-3 py-2.5 text-sm tabular-nums text-sky-400">{s.enc_received || 0}</td>
                </tr>
              )
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-8 text-slate-500 text-sm">لا توجد بيانات</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ─── BonusesTimeline ─────────────────────────────────────────── */
function BonusesTimeline({ bonuses, comp }) {
  if (!bonuses?.length) return null

  return (
    <div
      className="rounded-2xl"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', fontFamily: 'Tajawal, sans-serif' }}
      dir="rtl"
    >
      <div className="px-5 py-4 border-b border-white/[0.05] flex items-center gap-2">
        <Flame size={16} className="text-orange-400" />
        <span className="font-bold text-white text-sm">سجل المكافآت</span>
      </div>
      <div className="divide-y divide-white/[0.04] max-h-72 overflow-y-auto">
        {bonuses.map((b, i) => {
          const isA = b.group_id === comp?.team_a_group_id
          const team = isA ? comp?.team_a : comp?.team_b
          const date = b.created_at ? new Date(b.created_at).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' }) : ''
          return (
            <div key={b.id ?? i} className="flex items-center gap-3 px-5 py-3">
              <span className="text-lg flex-shrink-0">{team?.emoji ?? '🎯'}</span>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-bold" style={{ color: team?.color }}>{team?.name}</span>
                <span className="text-xs text-slate-500 block">{b.reason_ar ?? b.reason}</span>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-sm font-bold text-green-400 tabular-nums">+{b.xp_amount} XP</div>
                <div className="text-xs text-slate-600">{date}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── QuickPointsBanner ───────────────────────────────────────── */
function QuickPointsBanner() {
  const navigate = useNavigate()
  return (
    <div
      className="rounded-2xl p-5 flex items-center gap-4"
      style={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.2)', fontFamily: 'Tajawal, sans-serif' }}
      dir="rtl"
    >
      <Zap size={28} className="text-sky-400 flex-shrink-0" />
      <div className="flex-1">
        <div className="font-bold text-white text-sm mb-0.5">مكافآت المدرب تُحتسب ضمن نقاط الفريق</div>
        <div className="text-xs text-slate-400">اختر طالبًا لمنحه نقاط سريعة تُضاف لفريقه في المسابقة</div>
      </div>
      <button
        onClick={() => navigate('/trainer/quick-points')}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-sky-400"
        style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.25)' }}
      >
        <ExternalLink size={14} />
        نقاط سريعة
      </button>
    </div>
  )
}

/* ─── ExportButton ────────────────────────────────────────────── */
function ExportButton({ students, comp }) {
  const handleExport = useCallback(() => {
    if (!students?.length) return
    const rows = [
      ['الترتيب', 'الاسم', 'الفريق', 'XP الكلي', 'XP اليوم', 'XP الأسبوع', 'تشجيعات أرسلها', 'تشجيعات استقبلها'],
      ...students.map((s, i) => {
        const isA = s.group_id === comp?.team_a_group_id
        const team = isA ? comp?.team_a : comp?.team_b
        return [i + 1, s.student_name, team?.name ?? '', s.total_xp, s.today_xp || 0, s.week_xp || 0, s.enc_sent || 0, s.enc_received || 0]
      }),
    ]
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const today = new Date().toISOString().slice(0, 10)
    a.href = url
    a.download = `competition-april-2026-contributions-${today}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [students, comp])

  return (
    <button
      onClick={handleExport}
      disabled={!students?.length}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm disabled:opacity-40"
      style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#22c55e', fontFamily: 'Tajawal, sans-serif' }}
    >
      <Download size={14} />
      تصدير CSV
    </button>
  )
}

/* ─── DangerZone ──────────────────────────────────────────────── */
function DangerZone({ comp }) {
  const queryClient = useQueryClient()
  const [confirm, setConfirm] = useState('')
  const [open, setOpen] = useState(false)

  const { mutate: close, isPending } = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('close_competition', {
        p_competition_id: comp.id,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['latest-competition'] })
      queryClient.invalidateQueries({ queryKey: ['competition-admin-data'] })
      setOpen(false)
      setConfirm('')
    },
  })

  if (comp?.status !== 'active') return null

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: 'rgba(244,63,94,0.04)', border: '1px solid rgba(244,63,94,0.2)', fontFamily: 'Tajawal, sans-serif' }}
      dir="rtl"
    >
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle size={16} className="text-red-400" />
        <span className="font-bold text-red-400 text-sm">منطقة الخطر</span>
      </div>

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="px-4 py-2.5 rounded-xl font-bold text-sm text-red-400"
          style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)' }}
        >
          إغلاق يدوي للمسابقة
        </button>
      ) : (
        <div className="space-y-3">
          <div className="text-sm text-slate-400">
            هذا الإجراء لا يمكن التراجع عنه. اكتب <strong className="text-red-400">إغلاق</strong> للتأكيد:
          </div>
          <input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder='اكتب "إغلاق"'
            className="w-full px-3 py-2.5 rounded-xl text-sm text-white bg-transparent outline-none"
            style={{ border: '1px solid rgba(244,63,94,0.3)', fontFamily: 'Tajawal, sans-serif' }}
          />
          <div className="flex gap-2">
            <button
              onClick={() => close()}
              disabled={confirm !== 'إغلاق' || isPending}
              className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-40"
              style={{ background: confirm === 'إغلاق' ? '#ef4444' : 'rgba(244,63,94,0.2)' }}
            >
              {isPending ? 'جاري الإغلاق...' : 'تأكيد الإغلاق'}
            </button>
            <button
              onClick={() => { setOpen(false); setConfirm('') }}
              className="px-4 py-2.5 rounded-xl font-bold text-sm text-slate-400"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              إلغاء
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Main Page ───────────────────────────────────────────────── */
export default function CompetitionAdmin() {
  const { profile } = useAuthStore()
  const { data: comp, isLoading: compLoading } = useLatestComp()
  const { data: adminData, isLoading: adminLoading } = useAdminData(comp?.id)

  const students = useMemo(() => {
    if (!adminData?.students) return []
    return [...adminData.students].sort((a, b) => (b.total_xp ?? 0) - (a.total_xp ?? 0))
  }, [adminData])

  const bonuses = adminData?.bonuses ?? []

  if (compLoading) {
    return (
      <div className="flex items-center justify-center py-24" dir="rtl" style={{ fontFamily: 'Tajawal, sans-serif' }}>
        <div className="text-slate-400">جاري تحميل بيانات المسابقة...</div>
      </div>
    )
  }

  if (!comp) {
    return (
      <div className="max-w-lg mx-auto py-24 text-center" dir="rtl" style={{ fontFamily: 'Tajawal, sans-serif' }}>
        <div className="text-4xl mb-4">⚔️</div>
        <div className="font-bold text-white text-xl mb-2">لا توجد مسابقة</div>
        <div className="text-slate-400 text-sm">لم يتم إنشاء أي مسابقة بعد</div>
      </div>
    )
  }

  return (
    <div
      className="space-y-4 pb-8"
      style={{ maxWidth: 860, margin: '0 auto', fontFamily: 'Tajawal, sans-serif' }}
    >
      {/* Page header */}
      <div className="flex items-center justify-between" dir="rtl">
        <div className="flex items-center gap-3">
          <Trophy size={22} className="text-yellow-400" />
          <h1 className="text-xl font-black text-white">لوحة المسابقة</h1>
        </div>
        <ExportButton students={students} comp={comp} />
      </div>

      {/* Summary + VS side by side on wider screens */}
      <div className="grid md:grid-cols-2 gap-4">
        <CompetitionSummaryCard comp={comp} />
        <VsArenaAdmin comp={comp} />
      </div>

      {/* Quick points banner */}
      <QuickPointsBanner />

      {/* Contribution table */}
      <div dir="rtl">
        <div className="flex items-center gap-2 mb-3">
          <Users size={16} className="text-slate-400" />
          <span className="text-xs font-bold text-slate-400">مساهمات الطلاب</span>
          {adminLoading && <span className="text-xs text-slate-600">جاري التحميل...</span>}
        </div>
        <StudentContributionTable students={students} comp={comp} />
      </div>

      {/* Bonuses timeline */}
      {bonuses.length > 0 && <BonusesTimeline bonuses={bonuses} comp={comp} />}

      {/* Danger zone */}
      <DangerZone comp={comp} />
    </div>
  )
}
