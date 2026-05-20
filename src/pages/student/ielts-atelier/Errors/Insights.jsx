// IELTS V3 Phase 5a — Insights (skill breakdown + patterns)
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useStudentId } from '../_helpers/resolveStudentId'
import { useErrorStats, useErrorList, useImprovementTips, SKILL_LABELS } from './useErrorBank'

const SKILL_COLORS = {
  reading:   'var(--sunset-orange)',
  listening: 'var(--sunset-amber)',
  writing:   '#c084fc',
  speaking:  '#38bdf8',
}

function SkillBar({ skill, total, mastered }) {
  const pct = total > 0 ? Math.round((mastered / total) * 100) : 0
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, color: 'var(--ds-text)', fontFamily: "'Tajawal', sans-serif" }}>{SKILL_LABELS[skill]}</span>
        <span style={{ fontSize: 12, color: 'var(--ds-text-muted)', fontFamily: "'IBM Plex Mono', monospace" }}>{mastered}/{total}</span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: 'color-mix(in srgb, var(--ds-border) 35%, transparent)', overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{ height: '100%', borderRadius: 99, background: SKILL_COLORS[skill] || 'var(--sunset-orange)' }}
        />
      </div>
      <span style={{ fontSize: 11, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>{pct}% أتقنتها</span>
    </div>
  )
}

export default function Insights() {
  const navigate  = useNavigate()
  const studentId = useStudentId()

  // ── 1. useState ────────────────────────────────────────────────────────────
  const [tab, setTab] = useState('overview')

  // ── 2. useQuery ───────────────────────────────────────────────────────────
  const statsQ  = useErrorStats(studentId)
  const errorsQ = useErrorList(studentId, { status: 'all', sort: 'newest' })
  const tipsQ   = useImprovementTips(studentId, 50)

  const stats  = statsQ.data || {}
  const errors = errorsQ.data || []
  const tips   = tipsQ.data || []

  // Chart data — errors by skill
  const chartData = ['reading','listening','writing','speaking'].map(s => ({
    name: SKILL_LABELS[s],
    errors: stats.bySkill?.[s]?.total || 0,
    mastered: stats.bySkill?.[s]?.mastered || 0,
    skill: s,
  })).filter(d => d.errors > 0)

  // Question type distribution (R/L only)
  const qtypeCounts = {}
  for (const e of errors) {
    if (e.skill_type === 'reading' || e.skill_type === 'listening') {
      const qt = e.question_type || 'غير محدد'
      qtypeCounts[qt] = (qtypeCounts[qt] || 0) + 1
    }
  }
  const topQTypes = Object.entries(qtypeCounts).sort(([,a],[,b]) => b-a).slice(0, 5)

  // Writing/Speaking improvement tips breakdown by skill
  const tipsBySkill = { writing: [], speaking: [] }
  for (const t of tips) {
    if (tipsBySkill[t.skill_type]) tipsBySkill[t.skill_type].push(t)
  }

  // Suggested focus — skill with highest error rate
  const suggestedFocus = chartData
    .filter(d => d.errors > d.mastered)
    .sort((a,b) => (b.errors - b.mastered) - (a.errors - a.mastered))[0]

  const hasData = stats.total > 0 || errors.length > 0 || tips.length > 0

  return (
    <div dir="rtl" style={{ maxWidth: 720, margin: '0 auto', paddingBottom: 80, display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0 0' }}>
        <button onClick={() => navigate('/student/ielts-v2/errors')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid color-mix(in srgb, var(--ds-border) 50%, transparent)', background: 'transparent', color: 'var(--ds-text-muted)', fontSize: 13, fontFamily: "'Tajawal', sans-serif", cursor: 'pointer' }}>
          <ChevronLeft size={13} /> البنك
        </button>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: 'var(--ds-text)', fontFamily: "'Tajawal', sans-serif" }}>إحصائيات الأداء</h2>
      </div>

      {!hasData ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ padding: '48px 24px', textAlign: 'center', borderRadius: 20, background: 'color-mix(in srgb, var(--ds-surface) 35%, transparent)', border: '1px solid color-mix(in srgb, var(--ds-border) 35%, transparent)' }}>
          <p style={{ margin: 0, fontSize: 15, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif", lineHeight: 1.7 }}>
            لا توجد بيانات بعد. أكملي جلسات ممارسة لتظهر إحصائياتك هنا.
          </p>
        </motion.div>
      ) : (
        <>
          {/* Suggested focus callout */}
          {suggestedFocus && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              style={{ padding: '16px 20px', borderRadius: 16, background: 'color-mix(in srgb, var(--sunset-orange) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--sunset-orange) 25%, transparent)' }}>
              <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, color: 'var(--sunset-orange)', fontFamily: "'IBM Plex Sans', sans-serif", textTransform: 'uppercase' }}>التركيز المقترح</p>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--ds-text)', fontFamily: "'Tajawal', sans-serif" }}>
                {suggestedFocus.name} — {suggestedFocus.errors - suggestedFocus.mastered} درس لم يُتقن بعد
              </p>
            </motion.div>
          )}

          {/* Skill progress bars */}
          {chartData.length > 0 && (
            <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
              style={{ padding: '20px 22px', borderRadius: 18, background: 'color-mix(in srgb, var(--sunset-base-mid) 35%, transparent)', border: '1px solid color-mix(in srgb, var(--sunset-amber) 14%, transparent)', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--ds-text)', fontFamily: "'Tajawal', sans-serif" }}>التقدم حسب المهارة</p>
              {['reading','listening','writing','speaking'].filter(s => stats.bySkill?.[s]?.total > 0).map(s => (
                <SkillBar key={s} skill={s} total={stats.bySkill[s].total} mastered={stats.bySkill[s].mastered} />
              ))}
            </motion.section>
          )}

          {/* Bar chart */}
          {chartData.length > 1 && (
            <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
              style={{ padding: '20px 22px', borderRadius: 18, background: 'color-mix(in srgb, var(--ds-surface) 45%, transparent)', border: '1px solid color-mix(in srgb, var(--ds-border) 35%, transparent)' }}>
              <p style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: 'var(--ds-text)', fontFamily: "'Tajawal', sans-serif" }}>الأخطاء حسب المهارة</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData} layout="vertical" margin={{ right: 20 }}>
                  <XAxis type="number" tick={{ fill: 'var(--ds-text-muted)', fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'var(--ds-text)', fontSize: 12, fontFamily: 'Tajawal' }} width={60} />
                  <Tooltip contentStyle={{ background: '#0b0f18', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'var(--ds-text)', fontFamily: 'Tajawal', fontSize: 12 }} />
                  <Bar dataKey="errors" radius={[0,4,4,0]} name="أخطاء">
                    {chartData.map(d => <Cell key={d.skill} fill={SKILL_COLORS[d.skill]} fillOpacity={0.7} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </motion.section>
          )}

          {/* Question type breakdown (R/L) */}
          {topQTypes.length > 0 && (
            <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
              style={{ padding: '20px 22px', borderRadius: 18, background: 'color-mix(in srgb, var(--ds-surface) 45%, transparent)', border: '1px solid color-mix(in srgb, var(--ds-border) 35%, transparent)' }}>
              <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: 'var(--ds-text)', fontFamily: "'Tajawal', sans-serif" }}>أنواع الأسئلة الأصعب (قراءة + استماع)</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {topQTypes.map(([qt, cnt]) => (
                  <div key={qt} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 10, background: 'color-mix(in srgb, var(--ds-surface) 50%, transparent)', border: '1px solid color-mix(in srgb, var(--ds-border) 35%, transparent)' }}>
                    <span style={{ fontSize: 13, color: 'var(--ds-text)', fontFamily: "'IBM Plex Sans', sans-serif" }}>{qt}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--sunset-orange)', fontFamily: "'IBM Plex Mono', monospace" }}>{cnt}</span>
                  </div>
                ))}
              </div>
            </motion.section>
          )}

          {/* W/S improvement tips summary */}
          {(tipsBySkill.writing.length > 0 || tipsBySkill.speaking.length > 0) && (
            <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
              style={{ padding: '20px 22px', borderRadius: 18, background: 'color-mix(in srgb, var(--ds-surface) 45%, transparent)', border: '1px solid color-mix(in srgb, var(--ds-border) 35%, transparent)', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--ds-text)', fontFamily: "'Tajawal', sans-serif" }}>نصائح التحسين الأخيرة</p>
              {['writing','speaking'].filter(s => tipsBySkill[s].length > 0).map(s => (
                <div key={s}>
                  <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: SKILL_COLORS[s], fontFamily: "'IBM Plex Sans', sans-serif", textTransform: 'uppercase' }}>{SKILL_LABELS[s]}</p>
                  {tipsBySkill[s].slice(0, 3).map((t, i) => (
                    <p key={i} style={{ margin: i > 0 ? '6px 0 0' : 0, fontSize: 13, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif", lineHeight: 1.7, textAlign: 'right' }}>• {t.text}</p>
                  ))}
                </div>
              ))}
            </motion.section>
          )}
        </>
      )}
    </div>
  )
}
