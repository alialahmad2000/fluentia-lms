import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { motion } from 'framer-motion'
import {
  Brain,
  Cpu,
  Coins,
  TrendingUp,
  AlertTriangle,
  Bell,
  BookOpen,
  Activity,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Zap,
  BarChart3,
  PieChart,
  RefreshCw
} from 'lucide-react'

const USAGE_TYPE_LABELS = {
  writing_correction: 'تصحيح الكتابة',
  test_question_generation: 'توليد أسئلة',
  speaking_analysis: 'تحليل المحادثة',
  progress_report: 'تقرير التقدم',
  student_profile: 'ملف الطالب',
  smart_nudge: 'التنبيهات الذكية',
  other: 'أخرى'
}

const USAGE_TYPE_COLORS = {
  writing_correction: 'var(--accent-sky)',
  test_question_generation: 'var(--accent-emerald)',
  speaking_analysis: 'var(--accent-violet)',
  progress_report: 'var(--accent-gold)',
  student_profile: 'var(--accent-rose)',
  smart_nudge: 'var(--accent-amber)',
  other: 'var(--text-tertiary)'
}

const SKILLS = ['reading', 'writing', 'listening', 'speaking']
const SKILL_LABELS = { reading: 'القراءة', writing: 'الكتابة', listening: 'الاستماع', speaking: 'المحادثة' }
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1']

const TOKEN_COST_PER_1K = 0.015
const SAR_PER_USD = 3.75

function formatNumber(n) {
  if (n == null) return '0'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toLocaleString('ar-SA')
}

function StatCard({ icon: Icon, label, value, sub, color, delay = 0 }) {
  return (
    <motion.div
      className="fl-card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      style={{ padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: color + '18', display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0
      }}>
        <Icon size={22} style={{ color }} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
          {value}
        </div>
        {sub && <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 2 }}>{sub}</div>}
      </div>
    </motion.div>
  )
}

export default function AdminAIDashboard() {
  const [trendDays] = useState(30)

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - trendDays)

  // ── AI Usage Overview ──
  const { data: usageStats, isLoading: loadingUsage } = useQuery({
    queryKey: ['ai-usage-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_usage')
        .select('type, input_tokens, output_tokens, cost_usd, created_at')
        .gte('created_at', startOfMonth.toISOString())

      if (error) throw error

      const totalCalls = data.length
      const totalInputTokens = data.reduce((s, r) => s + (r.input_tokens || 0), 0)
      const totalOutputTokens = data.reduce((s, r) => s + (r.output_tokens || 0), 0)
      const totalTokens = totalInputTokens + totalOutputTokens
      const totalCostUSD = data.reduce((s, r) => s + (r.cost_usd || (totalTokens / 1000) * TOKEN_COST_PER_1K), 0)
      const totalCostSAR = totalCostUSD * SAR_PER_USD

      const byType = {}
      data.forEach(r => {
        const t = r.type || 'other'
        if (!byType[t]) byType[t] = { count: 0, tokens: 0 }
        byType[t].count++
        byType[t].tokens += (r.input_tokens || 0) + (r.output_tokens || 0)
      })

      return { totalCalls, totalTokens, totalInputTokens, totalOutputTokens, totalCostSAR, byType }
    }
  })

  // ── Daily Trend ──
  const { data: trendData } = useQuery({
    queryKey: ['ai-usage-trend', trendDays],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_usage')
        .select('type, created_at')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true })

      if (error) throw error

      const buckets = {}
      for (let i = 0; i < trendDays; i++) {
        const d = new Date(thirtyDaysAgo)
        d.setDate(d.getDate() + i)
        buckets[d.toISOString().slice(0, 10)] = {}
      }

      data.forEach(r => {
        const day = r.created_at?.slice(0, 10)
        if (!day || !buckets[day]) return
        const t = r.type || 'other'
        buckets[day][t] = (buckets[day][t] || 0) + 1
      })

      return Object.entries(buckets).map(([date, types]) => ({
        date,
        label: new Date(date).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' }),
        total: Object.values(types).reduce((a, b) => a + b, 0),
        types
      }))
    }
  })

  // ── Student AI Profiles ──
  const { data: profileStats } = useQuery({
    queryKey: ['ai-student-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_student_profiles')
        .select('risk_level, recommendations, student_id, profiles(full_name)')

      if (error) throw error

      const riskCounts = { low: 0, medium: 0, high: 0 }
      const highRisk = []
      const withRecs = []

      data.forEach(p => {
        const lvl = p.risk_level || 'low'
        riskCounts[lvl] = (riskCounts[lvl] || 0) + 1
        if (lvl === 'high') highRisk.push(p)
        if (p.recommendations?.length > 0) withRecs.push(p)
      })

      return { riskCounts, highRisk: highRisk.slice(0, 8), withRecs: withRecs.slice(0, 6), total: data.length }
    }
  })

  // ── Smart Nudges ──
  const { data: nudgeStats } = useQuery({
    queryKey: ['ai-nudge-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('smart_nudges')
        .select('type, is_read, read_at, created_at')

      if (error) throw error

      const total = data.length
      const readCount = data.filter(n => n.is_read).length
      const readRate = total > 0 ? ((readCount / total) * 100).toFixed(1) : 0

      const byType = {}
      data.forEach(n => {
        const t = n.type || 'general'
        if (!byType[t]) byType[t] = { total: 0, read: 0 }
        byType[t].total++
        if (n.is_read) byType[t].read++
      })

      const actedOn = data.filter(n => {
        if (!n.is_read || !n.read_at || !n.created_at) return false
        const diff = new Date(n.read_at) - new Date(n.created_at)
        return diff <= 24 * 60 * 60 * 1000
      }).length

      return { total, readCount, readRate, byType, actedOn }
    }
  })

  // ── Test Bank Coverage ──
  const { data: testCoverage } = useQuery({
    queryKey: ['ai-test-coverage'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_questions')
        .select('skill, level')

      if (error) throw error

      const grid = {}
      SKILLS.forEach(s => {
        grid[s] = {}
        LEVELS.forEach(l => { grid[s][l] = 0 })
      })

      data.forEach(q => {
        if (q.skill && q.level && grid[q.skill]) {
          grid[q.skill][q.level] = (grid[q.skill][q.level] || 0) + 1
        }
      })

      return grid
    }
  })

  // ── Recent Activity ──
  const { data: recentActivity } = useQuery({
    queryKey: ['ai-recent-activity'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_usage')
        .select('id, type, input_tokens, output_tokens, cost_usd, created_at')
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      return data
    }
  })

  const maxBar = trendData ? Math.max(...trendData.map(d => d.total), 1) : 1

  const riskTotal = profileStats
    ? profileStats.riskCounts.low + profileStats.riskCounts.medium + profileStats.riskCounts.high
    : 0

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1280, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="text-page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Brain size={28} style={{ color: 'var(--accent-violet)' }} />
            لوحة تحليلات الذكاء الاصطناعي
          </h1>
          <p className="text-muted" style={{ marginTop: 4 }}>
            مراقبة استخدام وأداء خدمات الذكاء الاصطناعي في المنصة
          </p>
        </div>
      </div>

      {/* ── Section 1: Usage Overview ── */}
      {loadingUsage ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>
          <RefreshCw size={24} className="spin" style={{ marginBottom: 8 }} />
          <div>جاري تحميل البيانات...</div>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <StatCard icon={Cpu} label="طلبات API هذا الشهر" value={formatNumber(usageStats?.totalCalls)} color="var(--accent-sky)" delay={0} />
            <StatCard icon={Zap} label="إجمالي التوكنات" value={formatNumber(usageStats?.totalTokens)} sub={`إدخال: ${formatNumber(usageStats?.totalInputTokens)} | إخراج: ${formatNumber(usageStats?.totalOutputTokens)}`} color="var(--accent-emerald)" delay={0.05} />
            <StatCard icon={Coins} label="التكلفة التقديرية (ر.س)" value={usageStats?.totalCostSAR?.toFixed(2) || '0.00'} sub="ريال سعودي" color="var(--accent-gold)" delay={0.1} />
            <StatCard icon={BarChart3} label="أنواع الاستخدام" value={Object.keys(usageStats?.byType || {}).length} sub="نوع مختلف" color="var(--accent-violet)" delay={0.15} />
          </div>

          {/* Usage by Type */}
          <motion.div className="fl-card-static" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '1rem', fontSize: '1rem', fontWeight: 600 }}>
              التوزيع حسب النوع
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              {Object.entries(usageStats?.byType || {}).map(([type, stats]) => (
                <div key={type} style={{
                  background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)',
                  borderRadius: 10, padding: '0.75rem 1rem', minWidth: 140
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: USAGE_TYPE_COLORS[type] || 'var(--text-tertiary)' }} />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {USAGE_TYPE_LABELS[type] || type}
                    </span>
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.1rem' }}>
                    {formatNumber(stats.count)}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                    {formatNumber(stats.tokens)} توكن
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}

      {/* ── Section 2: Usage Trend Chart ── */}
      <motion.div className="fl-card-static" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: '1rem', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrendingUp size={18} style={{ color: 'var(--accent-sky)' }} />
          اتجاه الاستخدام — آخر {trendDays} يوم
        </h3>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 160, direction: 'ltr' }}>
          {trendData?.map((day, i) => (
            <div key={day.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 0 }}>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', marginBottom: 2, writingMode: 'vertical-lr', display: day.total > 0 ? 'block' : 'none' }}>
                {day.total}
              </div>
              <svg width="100%" viewBox="0 0 20 100" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                {(() => {
                  const types = Object.entries(day.types)
                  let yOffset = 100
                  return types.map(([type, count]) => {
                    const h = (count / maxBar) * 100
                    yOffset -= h
                    return (
                      <rect key={type} x="2" y={yOffset} width="16" rx="2"
                        height={h} fill={USAGE_TYPE_COLORS[type] || 'var(--accent-sky)'}
                        opacity={0.85}>
                        <title>{USAGE_TYPE_LABELS[type] || type}: {count}</title>
                      </rect>
                    )
                  })
                })()}
              </svg>
              {i % 5 === 0 && (
                <div style={{ fontSize: '0.55rem', color: 'var(--text-tertiary)', marginTop: 4, whiteSpace: 'nowrap' }}>
                  {day.label}
                </div>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Section 3: Student AI Profiles ── */}
      <motion.div className="fl-card-static" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: '1rem', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={18} style={{ color: 'var(--accent-rose)' }} />
          ملفات الطلاب الذكية
        </h3>

        {/* Risk Distribution */}
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 240 }}>
            {[
              { key: 'low', label: 'منخفض', color: 'var(--accent-emerald)' },
              { key: 'medium', label: 'متوسط', color: 'var(--accent-amber)' },
              { key: 'high', label: 'مرتفع', color: 'var(--accent-rose)' }
            ].map(r => {
              const count = profileStats?.riskCounts?.[r.key] || 0
              const pct = riskTotal > 0 ? ((count / riskTotal) * 100).toFixed(0) : 0
              return (
                <div key={r.key} style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: r.color }}>{count}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{r.label}</div>
                  <div style={{
                    height: 6, borderRadius: 3, background: 'var(--border-subtle)',
                    marginTop: 6, overflow: 'hidden'
                  }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: r.color, borderRadius: 3, transition: 'width 0.5s' }} />
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', marginTop: 2 }}>{pct}%</div>
                </div>
              )
            })}
          </div>

          {/* Risk Pie Summary (SVG) */}
          <div style={{ width: 100, height: 100, flexShrink: 0 }}>
            <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
              {(() => {
                const segments = [
                  { key: 'low', color: 'var(--accent-emerald)' },
                  { key: 'medium', color: 'var(--accent-amber)' },
                  { key: 'high', color: 'var(--accent-rose)' }
                ]
                let offset = 0
                return segments.map(seg => {
                  const count = profileStats?.riskCounts?.[seg.key] || 0
                  const pct = riskTotal > 0 ? (count / riskTotal) * 100 : 0
                  const el = (
                    <circle key={seg.key} cx="18" cy="18" r="15.9" fill="none"
                      stroke={seg.color} strokeWidth="3.5"
                      strokeDasharray={`${pct} ${100 - pct}`}
                      strokeDashoffset={-offset} />
                  )
                  offset += pct
                  return el
                })
              })()}
            </svg>
          </div>
        </div>

        {/* High Risk Students */}
        {profileStats?.highRisk?.length > 0 && (
          <div>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--accent-rose)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={14} />
              طلاب بمستوى خطر مرتفع
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.5rem' }}>
              {profileStats.highRisk.map(s => (
                <div key={s.student_id} style={{
                  background: 'var(--surface-raised)', border: '1px solid var(--accent-rose)',
                  borderRadius: 8, padding: '0.6rem 0.75rem', fontSize: '0.8rem'
                }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {s.profiles?.full_name || 'طالب'}
                  </div>
                  {s.recommendations?.[0] && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                      {s.recommendations[0]}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* ── Section 4: Smart Nudges ── */}
      <motion.div className="fl-card-static" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: '1rem', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bell size={18} style={{ color: 'var(--accent-amber)' }} />
          تحليلات التنبيهات الذكية
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ background: 'var(--surface-raised)', borderRadius: 10, padding: '1rem', textAlign: 'center' }}>
            <Bell size={20} style={{ color: 'var(--accent-amber)', marginBottom: 4 }} />
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {formatNumber(nudgeStats?.total)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>إجمالي التنبيهات</div>
          </div>
          <div style={{ background: 'var(--surface-raised)', borderRadius: 10, padding: '1rem', textAlign: 'center' }}>
            <CheckCircle size={20} style={{ color: 'var(--accent-emerald)', marginBottom: 4 }} />
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {nudgeStats?.readRate || 0}%
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>نسبة القراءة</div>
          </div>
          <div style={{ background: 'var(--surface-raised)', borderRadius: 10, padding: '1rem', textAlign: 'center' }}>
            <Zap size={20} style={{ color: 'var(--accent-violet)', marginBottom: 4 }} />
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {formatNumber(nudgeStats?.actedOn)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>قُرئ خلال 24 ساعة</div>
          </div>
        </div>

        {/* Nudges by Type */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {Object.entries(nudgeStats?.byType || {}).map(([type, stats]) => {
            const readPct = stats.total > 0 ? ((stats.read / stats.total) * 100).toFixed(0) : 0
            return (
              <div key={type} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                background: 'var(--surface-raised)', borderRadius: 8, padding: '0.6rem 0.75rem'
              }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', minWidth: 100 }}>{type}</span>
                <div style={{ flex: 1, height: 8, background: 'var(--border-subtle)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${readPct}%`, background: 'var(--accent-emerald)', borderRadius: 4, transition: 'width 0.5s' }} />
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', minWidth: 60, textAlign: 'left' }}>
                  {stats.read}/{stats.total}
                </span>
              </div>
            )
          })}
        </div>
      </motion.div>

      {/* ── Section 5: Test Bank Coverage ── */}
      <motion.div className="fl-card-static" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: '1rem', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <BookOpen size={18} style={{ color: 'var(--accent-emerald)' }} />
          تغطية بنك الأسئلة
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 4, minWidth: 400 }}>
            <thead>
              <tr>
                <th style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', padding: '0.4rem', textAlign: 'right' }}>المهارة / المستوى</th>
                {LEVELS.map(l => (
                  <th key={l} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '0.4rem', textAlign: 'center', fontWeight: 600 }}>{l}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SKILLS.map(skill => (
                <tr key={skill}>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-primary)', padding: '0.4rem', fontWeight: 600 }}>
                    {SKILL_LABELS[skill]}
                  </td>
                  {LEVELS.map(level => {
                    const count = testCoverage?.[skill]?.[level] || 0
                    const isGap = count < 10
                    return (
                      <td key={level} style={{
                        textAlign: 'center', padding: '0.5rem',
                        borderRadius: 8, fontWeight: 600, fontSize: '0.9rem',
                        background: isGap ? 'var(--accent-rose)' + '18' : 'var(--accent-emerald)' + '18',
                        color: isGap ? 'var(--accent-rose)' : 'var(--accent-emerald)',
                        border: isGap ? '1px dashed var(--accent-rose)' : '1px solid transparent',
                        position: 'relative'
                      }}>
                        {count}
                        {isGap && (
                          <AlertTriangle size={10} style={{
                            position: 'absolute', top: 3, left: 3,
                            color: 'var(--accent-rose)', opacity: 0.7
                          }} />
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: '0.75rem', fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--accent-rose)', opacity: 0.25 }} />
            أقل من 10 أسئلة (فجوة)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--accent-emerald)', opacity: 0.25 }} />
            تغطية كافية
          </span>
        </div>
      </motion.div>

      {/* ── Section 6: Recent AI Activity ── */}
      <motion.div className="fl-card-static" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
        style={{ padding: '1.25rem' }}>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: '1rem', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={18} style={{ color: 'var(--accent-sky)' }} />
          آخر نشاط للذكاء الاصطناعي
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {recentActivity?.map((entry, i) => {
            const tokens = (entry.input_tokens || 0) + (entry.output_tokens || 0)
            const costSAR = ((entry.cost_usd || 0) * SAR_PER_USD).toFixed(3)
            const timeAgo = (() => {
              const diff = Date.now() - new Date(entry.created_at).getTime()
              const mins = Math.floor(diff / 60000)
              if (mins < 60) return `منذ ${mins} دقيقة`
              const hrs = Math.floor(mins / 60)
              if (hrs < 24) return `منذ ${hrs} ساعة`
              return `منذ ${Math.floor(hrs / 24)} يوم`
            })()

            return (
              <div key={entry.id || i} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.6rem 0.75rem', borderRadius: 8,
                background: i % 2 === 0 ? 'var(--surface-raised)' : 'transparent',
                fontSize: '0.8rem'
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: USAGE_TYPE_COLORS[entry.type] || 'var(--text-tertiary)'
                }} />
                <span style={{ color: 'var(--text-primary)', fontWeight: 500, minWidth: 110 }}>
                  {USAGE_TYPE_LABELS[entry.type] || entry.type}
                </span>
                <span style={{ color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Clock size={12} /> {timeAgo}
                </span>
                <span style={{ marginRight: 'auto' }} />
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                  {formatNumber(tokens)} توكن
                </span>
                <span style={{ color: 'var(--accent-gold)', fontSize: '0.75rem', fontWeight: 600, minWidth: 55, textAlign: 'left' }}>
                  {costSAR} ر.س
                </span>
              </div>
            )
          })}

          {(!recentActivity || recentActivity.length === 0) && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>
              <XCircle size={24} style={{ marginBottom: 8, opacity: 0.5 }} />
              <div>لا يوجد نشاط حديث</div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
