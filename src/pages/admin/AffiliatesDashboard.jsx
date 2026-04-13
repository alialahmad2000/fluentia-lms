import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Users, MousePointerClick, ArrowRightLeft, Banknote,
  Search, Eye, Loader2, TrendingDown, Activity,
  ChevronLeft,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'

// ─── Helpers ──────────────────────────────────────────────────────────
function fmt(n) {
  if (n == null) return '٠'
  return new Intl.NumberFormat('ar-SA').format(n)
}

function fmtCurrency(n) {
  if (n == null) return '٠ ر.س'
  return new Intl.NumberFormat('ar-SA', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n) + ' ر.س'
}

function fmtPercent(part, total) {
  if (!total) return '0%'
  return ((part / total) * 100).toFixed(1) + '%'
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'الآن'
  if (mins < 60) return `منذ ${mins} د`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `منذ ${hrs} س`
  const days = Math.floor(hrs / 24)
  return `منذ ${days} ي`
}

function defaultDateRange() {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 30)
  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  }
}

// ─── Status badge ─────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending: { label: 'قيد المراجعة', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  approved: { label: 'معتمد', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  rejected: { label: 'مرفوض', cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
  suspended: { label: 'موقوف', cls: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
}

function StatusBadge({ status }) {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${c.cls}`}>
      {c.label}
    </span>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────
function KPICard({ icon: Icon, label, value, color }) {
  return (
    <div
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 12,
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: `${color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={22} style={{ color }} />
      </div>
      <div>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 4 }}>{label}</p>
        <p style={{ color: 'var(--text-primary)', fontSize: 26, fontWeight: 700, lineHeight: 1 }}>{value}</p>
      </div>
    </div>
  )
}

// ─── Funnel Bar ───────────────────────────────────────────────────────
function FunnelBar({ label, count, maxCount, color, conversionLabel }) {
  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 600 }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 700 }}>{fmt(count)}</span>
          {conversionLabel && (
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{conversionLabel}</span>
          )}
        </div>
      </div>
      <div style={{ background: 'var(--surface-hover)', borderRadius: 6, height: 28, overflow: 'hidden' }}>
        <div
          style={{
            width: `${Math.max(pct, 1)}%`,
            height: '100%',
            background: color,
            borderRadius: 6,
            transition: 'width 0.6s ease',
          }}
        />
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════
export default function AffiliatesDashboard() {
  const navigate = useNavigate()
  const [dateRange, setDateRange] = useState(defaultDateRange)
  const [search, setSearch] = useState('')

  // ── Data queries ──────────────────────────────────────────────────────

  // Affiliates
  const { data: affiliates, isPending: loadingAffiliates } = useQuery({
    queryKey: ['aff-dash-affiliates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('affiliates')
        .select('id, full_name, email, ref_code, status, created_at')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    staleTime: 30_000,
  })

  // Clicks in date range
  const { data: clicks, isPending: loadingClicks } = useQuery({
    queryKey: ['aff-dash-clicks', dateRange.from, dateRange.to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('affiliate_clicks')
        .select('id, affiliate_id, ref_code, created_at')
        .gte('created_at', `${dateRange.from}T00:00:00`)
        .lte('created_at', `${dateRange.to}T23:59:59`)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    staleTime: 30_000,
  })

  // Conversions in date range
  const { data: conversions, isPending: loadingConversions } = useQuery({
    queryKey: ['aff-dash-conversions', dateRange.from, dateRange.to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('affiliate_conversions')
        .select('id, affiliate_id, ref_code, commission_amount, status, first_payment_at, created_at')
        .gte('created_at', `${dateRange.from}T00:00:00`)
        .lte('created_at', `${dateRange.to}T23:59:59`)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    staleTime: 30_000,
  })

  // Leads in date range
  const { data: leads, isPending: loadingLeads } = useQuery({
    queryKey: ['aff-dash-leads', dateRange.from, dateRange.to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, affiliate_id, ref_code, created_at')
        .not('affiliate_id', 'is', null)
        .gte('created_at', `${dateRange.from}T00:00:00`)
        .lte('created_at', `${dateRange.to}T23:59:59`)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    staleTime: 30_000,
  })

  // Payouts (all time for the paid commissions total, but also respect date range)
  const { data: payouts, isPending: loadingPayouts } = useQuery({
    queryKey: ['aff-dash-payouts', dateRange.from, dateRange.to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('affiliate_payouts')
        .select('id, affiliate_id, amount, status, paid_at, created_at')
        .eq('status', 'paid')
        .gte('created_at', `${dateRange.from}T00:00:00`)
        .lte('created_at', `${dateRange.to}T23:59:59`)
      if (error) throw error
      return data || []
    },
    staleTime: 30_000,
  })

  const isPending = loadingAffiliates || loadingClicks || loadingConversions || loadingLeads || loadingPayouts

  // ── Computed KPIs ─────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const activeCount = affiliates?.filter(a => a.status === 'approved').length || 0
    const totalClicks = clicks?.length || 0
    const totalConversions = conversions?.length || 0
    const paidCommissions = payouts?.reduce((s, p) => s + Number(p.amount || 0), 0) || 0
    return { activeCount, totalClicks, totalConversions, paidCommissions }
  }, [affiliates, clicks, conversions, payouts])

  // ── Funnel data ───────────────────────────────────────────────────────
  const funnel = useMemo(() => {
    const clicksCount = clicks?.length || 0
    const leadsCount = leads?.length || 0
    const enrolledCount = conversions?.length || 0
    const paidCount = conversions?.filter(c => c.status === 'paid' || c.status === 'approved').length || 0
    return { clicksCount, leadsCount, enrolledCount, paidCount }
  }, [clicks, leads, conversions])

  // ── Per-affiliate table ───────────────────────────────────────────────
  const tableRows = useMemo(() => {
    if (!affiliates) return []

    const clickMap = {}
    clicks?.forEach(c => { clickMap[c.affiliate_id] = (clickMap[c.affiliate_id] || 0) + 1 })

    const convMap = {}
    const commDueMap = {}
    const commPaidMap = {}
    conversions?.forEach(c => {
      convMap[c.affiliate_id] = (convMap[c.affiliate_id] || 0) + 1
      const amt = Number(c.commission_amount || 0)
      commDueMap[c.affiliate_id] = (commDueMap[c.affiliate_id] || 0) + amt
      if (c.status === 'paid') {
        commPaidMap[c.affiliate_id] = (commPaidMap[c.affiliate_id] || 0) + amt
      }
    })

    return affiliates.map(a => ({
      id: a.id,
      name: a.full_name,
      code: a.ref_code,
      status: a.status,
      clicks: clickMap[a.id] || 0,
      conversions: convMap[a.id] || 0,
      commissionDue: commDueMap[a.id] || 0,
      commissionPaid: commPaidMap[a.id] || 0,
    }))
  }, [affiliates, clicks, conversions])

  const filteredRows = useMemo(() => {
    if (!search.trim()) return tableRows
    const q = search.trim().toLowerCase()
    return tableRows.filter(r =>
      r.name?.toLowerCase().includes(q) || r.code?.toLowerCase().includes(q)
    )
  }, [tableRows, search])

  // ── Recent activity feed ──────────────────────────────────────────────
  const activityFeed = useMemo(() => {
    const affiliateNameMap = {}
    affiliates?.forEach(a => { affiliateNameMap[a.id] = a.full_name })

    const items = []

    // Recent clicks (last entries from clicks array, already sorted desc)
    clicks?.slice(0, 30).forEach(c => {
      items.push({
        type: 'click',
        label: 'نقرة جديدة',
        affiliate: affiliateNameMap[c.affiliate_id] || c.ref_code,
        time: c.created_at,
      })
    })

    // Recent leads
    leads?.slice(0, 20).forEach(l => {
      items.push({
        type: 'lead',
        label: 'عميل محتمل جديد',
        affiliate: affiliateNameMap[l.affiliate_id] || l.ref_code,
        time: l.created_at,
      })
    })

    // Recent conversions
    conversions?.slice(0, 20).forEach(c => {
      items.push({
        type: 'conversion',
        label: 'تحويل جديد',
        affiliate: affiliateNameMap[c.affiliate_id] || c.ref_code,
        time: c.created_at,
      })
    })

    items.sort((a, b) => new Date(b.time) - new Date(a.time))
    return items.slice(0, 20)
  }, [affiliates, clicks, leads, conversions])

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div dir="rtl" style={{ fontFamily: "'Tajawal', sans-serif", padding: '24px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ color: 'var(--text-primary)', fontSize: 24, fontWeight: 700, margin: 0 }}>
          لوحة تحليلات الشركاء
        </h1>

        {/* Date range filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <label style={{ color: 'var(--text-muted)', fontSize: 13 }}>من</label>
          <input
            type="date"
            value={dateRange.from}
            onChange={e => setDateRange(prev => ({ ...prev, from: e.target.value }))}
            style={{
              background: 'var(--surface-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 8,
              padding: '6px 12px',
              color: 'var(--text-primary)',
              fontSize: 13,
              fontFamily: "'Tajawal', sans-serif",
            }}
          />
          <label style={{ color: 'var(--text-muted)', fontSize: 13 }}>إلى</label>
          <input
            type="date"
            value={dateRange.to}
            onChange={e => setDateRange(prev => ({ ...prev, to: e.target.value }))}
            style={{
              background: 'var(--surface-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 8,
              padding: '6px 12px',
              color: 'var(--text-primary)',
              fontSize: 13,
              fontFamily: "'Tajawal', sans-serif",
            }}
          />
        </div>
      </div>

      {/* Loading overlay */}
      {isPending && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Loader2 size={28} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
        </div>
      )}

      {!isPending && (
        <>
          {/* ── KPI Cards ──────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
            <KPICard icon={Users} label="إجمالي الشركاء النشطين" value={fmt(kpis.activeCount)} color="#38bdf8" />
            <KPICard icon={MousePointerClick} label="إجمالي النقرات" value={fmt(kpis.totalClicks)} color="#a78bfa" />
            <KPICard icon={ArrowRightLeft} label="إجمالي التحويلات" value={fmt(kpis.totalConversions)} color="#34d399" />
            <KPICard icon={Banknote} label="إجمالي العمولات المصروفة" value={fmtCurrency(kpis.paidCommissions)} color="#fbbf24" />
          </div>

          {/* ── Funnel + Activity in 2-column layout ─────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, marginBottom: 32 }}>

            {/* Funnel chart */}
            <div
              style={{
                background: 'var(--surface-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 12,
                padding: 24,
              }}
            >
              <h2 style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 700, marginBottom: 20, margin: '0 0 20px 0' }}>
                قمع التحويل
              </h2>
              <FunnelBar
                label="نقرات"
                count={funnel.clicksCount}
                maxCount={funnel.clicksCount}
                color="#a78bfa"
              />
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, margin: '2px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <TrendingDown size={12} />
                {fmtPercent(funnel.leadsCount, funnel.clicksCount)} معدل التحويل
              </div>
              <FunnelBar
                label="عملاء محتملين"
                count={funnel.leadsCount}
                maxCount={funnel.clicksCount}
                color="#60a5fa"
              />
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, margin: '2px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <TrendingDown size={12} />
                {fmtPercent(funnel.enrolledCount, funnel.leadsCount)} معدل التحويل
              </div>
              <FunnelBar
                label="طلاب مسجلين"
                count={funnel.enrolledCount}
                maxCount={funnel.clicksCount}
                color="#34d399"
              />
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, margin: '2px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <TrendingDown size={12} />
                {fmtPercent(funnel.paidCount, funnel.enrolledCount)} معدل التحويل
              </div>
              <FunnelBar
                label="طلاب دفعوا"
                count={funnel.paidCount}
                maxCount={funnel.clicksCount}
                color="#fbbf24"
              />
            </div>

            {/* Activity feed */}
            <div
              style={{
                background: 'var(--surface-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 12,
                padding: 24,
                maxHeight: 440,
                overflowY: 'auto',
              }}
            >
              <h2 style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 700, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Activity size={18} />
                آخر الأحداث
              </h2>
              {activityFeed.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 24 }}>
                  لا توجد أحداث في هذه الفترة
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {activityFeed.map((item, i) => {
                    const typeColors = { click: '#a78bfa', lead: '#60a5fa', conversion: '#34d399' }
                    return (
                      <div
                        key={`${item.type}-${i}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '10px 0',
                          borderBottom: i < activityFeed.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                        }}
                      >
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: typeColors[item.type] || '#666',
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ color: 'var(--text-primary)', fontSize: 13 }}>{item.label}</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: 12, marginRight: 6 }}>— {item.affiliate}</span>
                        </div>
                        <span style={{ color: 'var(--text-muted)', fontSize: 11, flexShrink: 0 }}>
                          {timeAgo(item.time)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Affiliates Performance Table ──────────────────── */}
          <div
            style={{
              background: 'var(--surface-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 12,
              padding: 24,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
              <h2 style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 700, margin: 0 }}>
                أداء الشركاء
              </h2>
              <div style={{ position: 'relative' }}>
                <Search
                  size={16}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  type="text"
                  placeholder="ابحث بالاسم أو الكود..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    background: 'var(--surface-hover)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 8,
                    padding: '8px 36px 8px 12px',
                    color: 'var(--text-primary)',
                    fontSize: 13,
                    fontFamily: "'Tajawal', sans-serif",
                    width: 240,
                  }}
                />
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-subtle)' }}>
                    {['الاسم', 'الكود', 'النقرات', 'التحويلات', 'العمولة المستحقة', 'العمولة المصروفة', 'الحالة', ''].map((h, i) => (
                      <th
                        key={i}
                        style={{
                          padding: '10px 12px',
                          textAlign: 'start',
                          color: 'var(--text-muted)',
                          fontWeight: 600,
                          fontSize: 12,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                        لا توجد نتائج
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map(row => (
                      <tr
                        key={row.id}
                        style={{
                          borderBottom: '1px solid var(--border-subtle)',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '12px', color: 'var(--text-primary)', fontWeight: 600 }}>{row.name}</td>
                        <td style={{ padding: '12px' }}>
                          <code style={{ color: '#38bdf8', fontSize: 12, background: 'var(--surface-hover)', padding: '2px 8px', borderRadius: 4 }}>
                            {row.code}
                          </code>
                        </td>
                        <td style={{ padding: '12px', color: 'var(--text-primary)' }}>{fmt(row.clicks)}</td>
                        <td style={{ padding: '12px', color: 'var(--text-primary)' }}>{fmt(row.conversions)}</td>
                        <td style={{ padding: '12px', color: '#34d399', fontWeight: 600 }}>{fmtCurrency(row.commissionDue)}</td>
                        <td style={{ padding: '12px', color: '#fbbf24', fontWeight: 600 }}>{fmtCurrency(row.commissionPaid)}</td>
                        <td style={{ padding: '12px' }}><StatusBadge status={row.status} /></td>
                        <td style={{ padding: '12px' }}>
                          <button
                            onClick={() => navigate(`/admin/affiliates/${row.id}`)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              background: 'none',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: 6,
                              padding: '4px 10px',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              fontSize: 12,
                              fontFamily: "'Tajawal', sans-serif",
                              transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.color = 'var(--text-primary)'
                              e.currentTarget.style.borderColor = 'var(--text-muted)'
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.color = 'var(--text-muted)'
                              e.currentTarget.style.borderColor = 'var(--border-subtle)'
                            }}
                          >
                            <Eye size={14} />
                            تفاصيل
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
