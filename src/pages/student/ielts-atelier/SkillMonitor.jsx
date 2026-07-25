import React, { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp, Target, Clock, CheckCircle, Layers, Activity, ArrowUpRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useStudentId } from './_helpers/resolveStudentId'
import { useSkillProgress, useAdaptivePlan } from '@/hooks/ielts/useIELTSHub'
import { useG } from '@/i18n/gender'
import { Card, LabHeader, BandGauge, PrimaryButton, Icon } from './_ui/primitives'

const BASE = '/student/ielts-atelier'
const SKILL = {
  reading:   { label: 'القراءة',  icon: Icon.reading,   color: '#34c8a6' },
  listening: { label: 'الاستماع', icon: Icon.listening, color: '#34c8a6' },
  writing:   { label: 'الكتابة',  icon: Icon.writing,   color: '#34c8a6' },
  speaking:  { label: 'المحادثة', icon: Icon.speaking,  color: '#34c8a6' },
}
const QTYPE_AR = {
  true_false_not_given: 'صح / خطأ / غير مذكور', yes_no_not_given: 'نعم / لا / غير مذكور',
  multiple_choice: 'اختيار من متعدّد', mcq: 'اختيار من متعدّد',
  matching_information: 'مطابقة المعلومات', matching_headings: 'مطابقة العناوين', matching_features: 'مطابقة الخصائص',
  sentence_completion: 'إكمال الجُمل', summary_completion: 'إكمال الملخّص', note_completion: 'إكمال الملاحظات',
  table_completion: 'إكمال الجدول', short_answer: 'إجابة قصيرة', form_completion: 'إكمال النموذج',
  note_table_flowchart: 'ملاحظات / جدول / مخطّط', diagram_label_completion: 'تسمية الرسم', flow_chart_completion: 'إكمال المخطّط',
  map_labelling: 'تسمية الخريطة', writing_task1: 'المهمة الأولى', writing_task2: 'المهمة الثانية',
  part_1: 'الجزء الأول', part_2: 'الجزء الثاني', part_3: 'الجزء الثالث',
}
const qLabel = (t) => QTYPE_AR[t] || String(t || '').replace(/_/g, ' ')
const arDigit = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d])

function fmtDate(s) {
  if (!s) return ''
  const d = new Date(s)
  if (isNaN(d)) return ''
  return arDigit(`${d.getDate()}/${d.getMonth() + 1}`)
}

// Per-skill session history + question-type breakdown. Writing lives in
// ielts_submissions; the other three in ielts_skill_sessions.
function useSkillMonitor(studentId, skill) {
  return useQuery({
    queryKey: ['ielts-skill-monitor', studentId, skill],
    enabled: !!studentId && !!skill,
    staleTime: 30_000,
    queryFn: async () => {
      let sessions = []
      if (skill === 'writing') {
        const { data } = await supabase
          .from('ielts_submissions')
          .select('id, submission_type, band_score, submitted_at, evaluated_at')
          .eq('student_id', studentId)
          .in('submission_type', ['writing_task1', 'writing_task2'])
          .not('evaluated_at', 'is', null)
          .order('submitted_at', { ascending: true })
          .limit(40)
        sessions = (data || []).map((r) => ({
          id: r.id, band: r.band_score != null ? Number(r.band_score) : null,
          date: r.submitted_at, meta: qLabel(r.submission_type), correct: null, total: null, duration: 0,
        }))
      } else {
        const { data } = await supabase
          .from('ielts_skill_sessions')
          .select('id, question_type, band_score, correct_count, incorrect_count, duration_seconds, started_at, completed_at')
          .eq('student_id', studentId)
          .eq('skill_type', skill)
          .order('started_at', { ascending: true })
          .limit(40)
        sessions = (data || []).map((r) => ({
          id: r.id, band: r.band_score != null ? Number(r.band_score) : null,
          date: r.completed_at || r.started_at, meta: r.question_type ? qLabel(r.question_type) : null,
          correct: r.correct_count, total: (r.correct_count || 0) + (r.incorrect_count || 0), duration: r.duration_seconds || 0,
        }))
      }
      const { data: prog } = await supabase
        .from('ielts_student_progress')
        .select('question_type, estimated_band, attempts_count, correct_count')
        .eq('student_id', studentId)
        .eq('skill_type', skill)
      const types = (prog || [])
        .filter((p) => p.question_type)
        .map((p) => ({ type: p.question_type, band: p.estimated_band != null ? Number(p.estimated_band) : null, attempts: p.attempts_count || 0, accuracy: p.attempts_count ? (p.correct_count || 0) / p.attempts_count : null }))
        .sort((a, b) => (a.band ?? 9) - (b.band ?? 9))

      // Open errors for this skill — the most actionable number on the page.
      let openErrors = 0
      try {
        const { count } = await supabase
          .from('ielts_error_bank')
          .select('id', { count: 'exact', head: true })
          .eq('student_id', studentId)
          .eq('skill_type', skill)
          .eq('mastered', false)
        openErrors = count || 0
      } catch { /* non-fatal */ }

      const withBand = sessions.filter((s) => s.band != null)
      const bestBand = withBand.length ? Math.max(...withBand.map((s) => s.band)) : null
      const totalCorrect = sessions.reduce((a, s) => a + (s.correct || 0), 0)
      const totalQ = sessions.reduce((a, s) => a + (s.total || 0), 0)
      const accuracy = totalQ ? totalCorrect / totalQ : null
      const totalMinutes = Math.round(sessions.reduce((a, s) => a + (s.duration || 0), 0) / 60)
      return { sessions, types, count: sessions.length, bestBand, accuracy, totalMinutes, openErrors }
    },
  })
}

function Sparkline({ points, color = 'var(--iel-accent)', w = 300, h = 60 }) {
  const vals = points.filter((v) => v != null)
  if (vals.length < 2) return null
  const lo = Math.min(4, ...vals) - 0.3
  const hi = Math.max(6, ...vals) + 0.3
  const n = points.length
  const X = (i) => (n === 1 ? w / 2 : (i / (n - 1)) * (w - 8) + 4)
  const Y = (v) => h - 6 - ((v - lo) / (hi - lo || 1)) * (h - 12)
  const line = points.map((v, i) => `${i === 0 ? 'M' : 'L'} ${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(' ')
  const area = `${line} L ${X(n - 1).toFixed(1)} ${h} L ${X(0).toFixed(1)} ${h} Z`
  const lastX = X(n - 1), lastY = Y(points[n - 1])
  const gid = `spark-${Math.round(Math.random() * 1e6)}`
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="3.6" fill={color} stroke="var(--iel-ground)" strokeWidth="2" />
    </svg>
  )
}

function Stat({ icon: I, label, value, accent }) {
  return (
    <Card style={{ padding: '15px 16px', flex: '1 1 130px', minWidth: 128 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--iel-ink-3)', fontWeight: 700, marginBottom: 8 }}>
        {I && <I size={14} />}{label}
      </div>
      <div className="iel-serif" style={{ fontSize: 24, fontWeight: 600, color: accent || 'var(--iel-ink)', lineHeight: 1 }}>{value}</div>
    </Card>
  )
}

export default function SkillMonitor() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const g = useG()
  const studentId = useStudentId()
  const m = pathname.match(/\/(reading|listening|writing|speaking)\/monitor/)
  const skill = m?.[1] || 'reading'
  const meta = SKILL[skill]

  const { data: mon, isLoading } = useSkillMonitor(studentId, skill)
  const { data: skills } = useSkillProgress(studentId)
  const { data: plan } = useAdaptivePlan(studentId)

  const currentBand = skills?.[skill]?.band != null ? Number(skills[skill].band) : (mon?.bestBand ?? null)
  const target = plan?.target_band != null ? Number(plan.target_band) : 7
  const gap = currentBand != null ? +(target - currentBand).toFixed(1) : null

  const trend = useMemo(() => (mon?.sessions || []).map((s) => s.band).filter((b) => b != null), [mon])
  const recent = useMemo(() => (mon?.sessions || []).slice(-6).reverse(), [mon])
  const weakTypes = useMemo(() => (mon?.types || []).filter((t) => t.band != null).slice(0, 4), [mon])

  // ── Detailed report, derived entirely from sessions already loaded ──────────
  const report = useMemo(() => {
    const ss = mon?.sessions || []
    if (!ss.length) return null
    const scored = ss.filter((x) => x.total > 0)
    const accTrend = scored.map((x) => Math.round((x.correct / x.total) * 100))
    const banded = ss.filter((x) => x.band != null)
    const firstBand = banded.length ? banded[0].band : null
    const lastBand = banded.length ? banded[banded.length - 1].band : null
    const delta = firstBand != null && lastBand != null ? lastBand - firstBand : null
    // practice cadence over the last 30 days
    const DAY = 86400000, today = new Date(); today.setHours(0, 0, 0, 0)
    const daySet = new Set()
    for (const x of ss) { const d = new Date(x.date); if (!isNaN(d)) { d.setHours(0, 0, 0, 0); daySet.add(d.getTime()) } }
    const last30 = Array.from({ length: 30 }, (_, i) => daySet.has(today.getTime() - (29 - i) * DAY))
    const daysActive = last30.filter(Boolean).length
    let streak = 0
    for (let i = 29; i >= 0; i--) { if (last30[i]) streak++; else if (i < 29) break }
    const avgMin = ss.length ? Math.round((mon.totalMinutes || 0) / ss.length) : 0
    const bestSession = banded.length ? banded.reduce((a, b) => (b.band > a.band ? b : a)) : null
    return { accTrend, delta, last30, daysActive, streak, avgMin, bestSession, firstBand, lastBand }
  }, [mon])

  const goLab = () => navigate(skill === 'reading' ? `${BASE}/reading/tests` : `${BASE}/${skill}`)

  const hasData = !isLoading && (mon?.count || 0) > 0

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingTop: 2, maxWidth: 940 }}>
      <LabHeader eyebrow={`${meta.label} · الأداء`} title={`أداؤك في ${meta.label}`}>
        متابعة تقدّمك في هذه المهارة — نطاقك الحالي، مسار تحسّنك عبر الجلسات، ونقاط قوّتك وضعفك.
      </LabHeader>

      {!hasData ? (
        <div style={{ position: 'relative', overflow: 'hidden', maxWidth: 660, border: '1px solid var(--iel-border-strong)', borderRadius: 16, background: 'var(--iel-surface)', boxShadow: '0 12px 28px -22px rgba(60,45,20,.2)' }}>
          <div style={{ height: 3, background: 'linear-gradient(90deg, transparent, var(--iel-accent) 32%, var(--iel-gold) 72%, transparent)' }} />
          <div style={{ padding: '30px 30px 32px' }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.14em', color: 'var(--iel-ink-3)' }}>سِجِلّ الأداء</div>
            <h3 style={{ fontFamily: 'var(--iel-display)', fontSize: 25, fontWeight: 700, color: 'var(--iel-ink)', margin: '9px 0 0', lineHeight: 1.22 }}>لا يوجد أداء بعد</h3>
            <div style={{ height: 1, margin: '15px 0', background: 'linear-gradient(90deg, var(--iel-border-strong), transparent)' }} />
            <p style={{ margin: 0, fontSize: 14, color: 'var(--iel-ink-2)', lineHeight: 1.85, maxWidth: '46ch' }}>
              {g('ابدأ التدريب على هذه المهارة، وستُنشَر هنا درجاتك ومسار تحسّنك عبر الجلسات، خطوة بخطوة.', 'ابدئي التدريب على هذه المهارة، وستُنشَر هنا درجاتك ومسار تحسّنك عبر الجلسات، خطوة بخطوة.')}
            </p>
            <div style={{ marginTop: 22 }}>
              <PrimaryButton onClick={goLab}>{g('ابدأ التدريب', 'ابدئي التدريب')} <Icon.chevron size={16} sw={2.4} /></PrimaryButton>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Hero: gauge + trend */}
          <Card style={{ padding: '24px 26px', display: 'grid', gridTemplateColumns: 'minmax(180px, 200px) 1fr', gap: 24, alignItems: 'center' }}>
            <BandGauge current={currentBand} target={target} size={184} label="نطاقك" />
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--iel-accent)', marginBottom: 6 }}>مسار التحسّن</div>
              <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: 'var(--iel-ink)', lineHeight: 1.3 }}>
                {gap != null && gap > 0 ? `تبقّى ${arDigit(gap)} نطاق للوصول إلى هدفك` : gap != null ? 'بلغت هدفك في هذه المهارة' : 'تابع التدريب لرفع نطاقك'}
              </h2>
              <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--iel-ink-3)', fontWeight: 600 }}>
                {arDigit(mon.count)} جلسة · الهدف Band {arDigit(target.toFixed(1))}
              </p>
              {trend.length >= 2 ? <Sparkline points={trend} color="var(--iel-accent)" /> : (
                <p style={{ margin: 0, fontSize: 12.5, color: 'var(--iel-ink-3)', fontWeight: 600 }}>أكمل جلستين على الأقل لعرض مسار التحسّن.</p>
              )}
            </div>
          </Card>

          {/* Stats */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <Stat icon={Layers} label="جلسات" value={arDigit(mon.count)} />
            {mon.accuracy != null && <Stat icon={CheckCircle} label="الدقّة" value={`${arDigit(Math.round(mon.accuracy * 100))}٪`} accent="var(--iel-accent)" />}
            {mon.bestBand != null && <Stat icon={TrendingUp} label="أفضل نطاق" value={arDigit(mon.bestBand.toFixed(1))} accent="var(--iel-gold-ink, var(--iel-gold))" />}
            {mon.totalMinutes > 0 && <Stat icon={Clock} label="وقت التدريب" value={`${arDigit(mon.totalMinutes)} د`} />}
          </div>

          {/* Weak question types */}
          {weakTypes.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Target size={16} color="var(--iel-warn, #e6b45a)" />
                <h2 style={{ margin: 0, fontSize: 15.5, fontWeight: 800, color: 'var(--iel-ink)' }}>حسب نوع السؤال</h2>
                <span style={{ fontSize: 12, color: 'var(--iel-ink-3)', fontWeight: 600 }}>الأضعف أولاً</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {weakTypes.map((t) => {
                  const pct = t.band != null ? Math.max(6, Math.min(100, (t.band / 9) * 100)) : 0
                  const c = t.band >= 6.5 ? 'var(--iel-diff-1, #4ade80)' : t.band >= 5 ? 'var(--iel-diff-2, #f5b042)' : 'var(--iel-diff-3, #fb7185)'
                  return (
                    <Card key={t.type} style={{ padding: '12px 15px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--iel-ink)' }}>{qLabel(t.type)}</span>
                        <span className="iel-serif" style={{ fontSize: 16, fontWeight: 700, color: c }}>{t.band != null ? arDigit(t.band.toFixed(1)) : '—'}</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 20, background: 'var(--iel-track)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 20, background: c }} />
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Detailed report ─────────────────────────────────────────── */}
          {report && (
            <div>
              <h2 style={{ margin: '0 0 12px', fontSize: 15.5, fontWeight: 800, color: 'var(--iel-ink)' }}>التقرير المفصّل</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12 }}>

                {/* progress since the first session */}
                <Card style={{ padding: '16px 18px' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--iel-ink-3)', marginBottom: 9 }}>تقدّمك منذ أول جلسة</div>
                  {report.delta != null ? (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
                      <span dir="ltr" className="iel-serif" style={{ fontSize: 30, fontWeight: 700, color: report.delta >= 0 ? 'var(--iel-accent)' : 'var(--iel-bad)' }}>
                        {report.delta >= 0 ? '+' : '−'}{arDigit(Math.abs(report.delta).toFixed(1))}
                      </span>
                      <span style={{ fontSize: 12.5, color: 'var(--iel-ink-2)', fontWeight: 600 }}>
                        نطاق · من {arDigit(report.firstBand.toFixed(1))} إلى {arDigit(report.lastBand.toFixed(1))}
                      </span>
                    </div>
                  ) : <div style={{ fontSize: 13, color: 'var(--iel-ink-3)' }}>تحتاجين جلستين على الأقل لقياس التقدّم.</div>}
                </Card>

                {/* accuracy over time */}
                <Card style={{ padding: '16px 18px' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--iel-ink-3)', marginBottom: 9 }}>الدقّة عبر الجلسات</div>
                  {report.accTrend.length >= 2 ? (
                    <>
                      <Sparkline points={report.accTrend} color="var(--iel-gold)" h={44} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12, fontWeight: 700, color: 'var(--iel-ink-3)' }}>
                        <span>الأحدث {arDigit(report.accTrend[report.accTrend.length - 1])}٪</span>
                        <span>الأولى {arDigit(report.accTrend[0])}٪</span>
                      </div>
                    </>
                  ) : <div style={{ fontSize: 13, color: 'var(--iel-ink-3)' }}>لا تكفي البيانات بعد.</div>}
                </Card>

                {/* practice cadence — 30 days */}
                <Card style={{ padding: '16px 18px' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--iel-ink-3)', marginBottom: 10 }}>انتظام التدريب · آخر ٣٠ يوماً</div>
                  <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', marginBottom: 10 }}>
                    {report.last30.map((on, i) => (
                      <span key={i} title={on ? 'تدرّبتِ' : 'بلا تدريب'} style={{ flex: 1, height: on ? 22 : 9, borderRadius: 3, background: on ? 'var(--iel-accent)' : 'var(--iel-track)' }} />
                    ))}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--iel-ink-2)', fontWeight: 600 }}>
                    <b style={{ color: 'var(--iel-ink)' }}>{arDigit(report.daysActive)}</b> يوماً من التدريب
                    {report.streak > 1 && <> · تتابع حالي <b style={{ color: 'var(--iel-accent)' }}>{arDigit(report.streak)}</b></>}
                  </div>
                </Card>

                {/* rhythm + best session */}
                <Card style={{ padding: '16px 18px' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--iel-ink-3)', marginBottom: 9 }}>إيقاع الجلسات</div>
                  <div style={{ fontSize: 13, color: 'var(--iel-ink-2)', lineHeight: 1.9, fontWeight: 600 }}>
                    متوسّط الجلسة <b style={{ color: 'var(--iel-ink)' }}>{arDigit(report.avgMin)} دقيقة</b><br />
                    عدد الجلسات <b style={{ color: 'var(--iel-ink)' }}>{arDigit(mon.count)}</b>
                    {report.bestSession && <><br />أفضل جلسة <b style={{ color: 'var(--iel-accent)' }}>{arDigit(report.bestSession.band.toFixed(1))}</b> · {fmtDate(report.bestSession.date)}</>}
                  </div>
                </Card>

                {/* error bank — the actionable one */}
                {mon.openErrors > 0 && (
                  <Card style={{ padding: '16px 18px', gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                    <span style={{ width: 42, height: 42, borderRadius: 12, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--iel-gold-soft)', color: 'var(--iel-gold)' }}>
                      <Icon.errors size={19} />
                    </span>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--iel-ink)' }}>
                        {arDigit(mon.openErrors)} خطأ في {meta.label} بانتظار المراجعة
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--iel-ink-2)', marginTop: 3 }}>مراجعة أخطائك أسرع طريق لرفع نطاقك — كل خطأ تُتقنينه يختفي من البنك.</div>
                    </div>
                    <button onClick={() => navigate(`${BASE}/errors`)} style={{ flex: 'none', padding: '11px 20px', borderRadius: 11, border: '1px solid var(--iel-border-strong)', background: 'transparent', color: 'var(--iel-ink)', fontSize: 13.5, fontWeight: 800, fontFamily: "'Tajawal', sans-serif", cursor: 'pointer' }}>
                      بنك الأخطاء ←
                    </button>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Recent sessions */}
          <div>
            <h2 style={{ margin: '0 0 12px', fontSize: 15.5, fontWeight: 800, color: 'var(--iel-ink)' }}>آخر الجلسات</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recent.map((s) => (
                <Card key={s.id} style={{ padding: '12px 15px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 40, height: 40, borderRadius: 11, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--iel-accent-soft)', color: 'var(--iel-accent)' }}>
                    <meta.icon size={18} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--iel-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.meta || meta.label}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--iel-ink-3)', fontWeight: 600, marginTop: 2 }}>
                      {fmtDate(s.date)}{s.total ? ` · ${arDigit(s.correct || 0)}/${arDigit(s.total)}` : ''}
                    </div>
                  </div>
                  {s.band != null && (
                    <span className="iel-serif" style={{ fontSize: 19, fontWeight: 700, color: 'var(--iel-ink)', flex: 'none' }}>{arDigit(s.band.toFixed(1))}</span>
                  )}
                </Card>
              ))}
            </div>
            <button onClick={goLab} style={{ marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 0, cursor: 'pointer', color: 'var(--iel-accent)', fontSize: 13.5, fontWeight: 800, fontFamily: "'Tajawal', sans-serif" }}>
              {g('تابع التدريب', 'تابعي التدريب')} <ArrowUpRight size={15} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
