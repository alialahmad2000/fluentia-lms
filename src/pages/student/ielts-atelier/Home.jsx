import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useAdaptivePlan, useLatestResult, useSkillProgress, useMockAttempts, useErrorBankCount } from '@/hooks/ielts/useIELTSHub'
import { useStudentId } from './_helpers/resolveStudentId'
import { useIELTSPreview } from '@/pages/admin/ielts-preview/IELTSPreviewContext'

// ── Instrument palette ──
const C = {
  fg: '#eceff1', dim: '#9aa4ae', faint: '#616a73',
  accent: '#3fdcc0', accentSoft: 'rgba(63,220,192,.13)',
  panel: 'linear-gradient(180deg,#111519,#0d1114)', panel2: '#0d1114', bezel: '#0c1013',
  line: 'rgba(255,255,255,.07)', line2: 'rgba(255,255,255,.13)',
  ok: '#63d693', warn: '#e0a83e',
}
const MONO = "'SF Mono', ui-monospace, Menlo, monospace"

const SKILLS = [
  { id: 'reading',   title: 'القراءة',  code: 'R', field: 'reading_score',   path: 'reading' },
  { id: 'listening', title: 'الاستماع', code: 'L', field: 'listening_score', path: 'listening' },
  { id: 'writing',   title: 'الكتابة',  code: 'W', field: 'writing_score',   path: 'writing' },
  { id: 'speaking',  title: 'المحادثة', code: 'S', field: 'speaking_score',  path: 'speaking' },
]

// band (0–9) → position on a 4→9 ruler, clamped 0–100%
const pos = (b) => `${Math.max(0, Math.min(100, ((Number(b) - 4) / 5) * 100))}%`
const fmt = (b) => (b == null ? '—' : Number(b).toFixed(1))

function relTime(iso) {
  if (!iso) return null
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (d <= 0) return 'اليوم'
  if (d === 1) return 'أمس'
  if (d < 7) return `قبل ${d} أيام`
  if (d < 14) return 'قبل أسبوع'
  return `قبل ${Math.floor(d / 7)} أسابيع`
}

function SkillMeter({ s, band, target, measuredAt, index }) {
  const has = band != null
  const delta = has ? (target - band) : null
  return (
    <div style={{
      background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: '20px 18px 18px',
      position: 'relative', overflow: 'hidden',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 12px 34px -20px rgba(0,0,0,.9)',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.14),transparent)' }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: C.fg }}>{s.title}</span>
        <span style={{ fontFamily: MONO, fontSize: 11, color: C.faint, border: `1px solid ${C.line}`, borderRadius: 5, padding: '1px 6px' }}>{s.code}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, margin: '12px 0 4px' }}>
        <span style={{ fontFamily: MONO, fontWeight: 600, fontSize: 33, letterSpacing: '-.02em', fontVariantNumeric: 'tabular-nums', color: has ? C.fg : C.faint }}>{fmt(band)}</span>
        {has && delta > 0 && <span style={{ fontFamily: MONO, fontSize: 12, color: C.faint, paddingBottom: 4 }}>▾ {delta.toFixed(1)}</span>}
        {has && delta <= 0 && <span style={{ fontFamily: MONO, fontSize: 12, color: C.ok, paddingBottom: 4 }}>✓</span>}
      </div>
      <div style={{ direction: 'ltr', position: 'relative', height: 18, marginTop: 8 }}>
        <div style={{ position: 'absolute', top: 8, left: 0, right: 0, height: 2, background: C.line2 }} />
        {has && <div style={{ position: 'absolute', top: 8, left: 0, height: 2, background: C.accent, width: pos(band) }} />}
        {has && <div style={{ position: 'absolute', top: 4, width: 9, height: 9, borderRadius: '50%', background: C.fg, border: '2px solid #111519', left: pos(band), transform: 'translateX(-50%)' }} />}
        <div style={{ position: 'absolute', top: 1, width: 1, height: 15, background: C.accent, left: pos(target), transform: 'translateX(-50%)' }} />
      </div>
      <div style={{ fontFamily: MONO, fontSize: 11, color: C.faint, marginTop: 12 }}>
        {has ? (measuredAt ? `آخر قياس · ${measuredAt}` : 'مُقاس') : 'لم يُقَس بعد'}
      </div>
    </div>
  )
}

export default function Home() {
  // ===== ALL HOOKS TOP =====
  const profile = useAuthStore((s) => s.profile)
  const preview = useIELTSPreview()
  const studentId = useStudentId()
  const { data: planRow } = useAdaptivePlan(studentId)
  const { data: latestResult } = useLatestResult(studentId)
  const { data: skillProgress } = useSkillProgress(studentId)
  const { data: mocks } = useMockAttempts(studentId)
  const { data: errorsLeft } = useErrorBankCount(studentId)

  const targetBand = planRow?.target_band || preview?.mockStudent?.target_band || 7.0
  const measuredAt = relTime(latestResult?.created_at)

  const skillBands = useMemo(() => {
    const out = {}
    for (const s of SKILLS) out[s.id] = skillProgress?.[s.id]?.band ?? latestResult?.[s.field] ?? null
    return out
  }, [skillProgress, latestResult])

  const known = SKILLS.map((s) => skillBands[s.id]).filter((b) => b != null)
  const overallNow = latestResult?.overall_band ?? (known.length ? Math.round((known.reduce((a, b) => a + b, 0) / known.length) * 2) / 2 : null)
  const hasData = overallNow != null
  const gap = hasData ? Math.max(0, targetBand - overallNow) : null

  // weakest skill drives the next action
  const weakest = useMemo(() => {
    const withBand = SKILLS.filter((s) => skillBands[s.id] != null).sort((a, b) => skillBands[a.id] - skillBands[b.id])
    return withBand[0] || null
  }, [skillBands])

  // readiness signals
  const diagnosticDone = !!latestResult
  const mockDone = (mocks?.completed?.length || 0) > 0
  const examDate = planRow?.target_exam_date || preview?.mockStudent?.target_exam_date || preview?.mockStudent?.exam_date
  const examDays = examDate ? Math.max(0, Math.ceil((new Date(examDate).getTime() - Date.now()) / 86400000)) : null

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 34, paddingBottom: 30 }}>

      {/* ===== HERO BEZEL — the measurement ===== */}
      <section style={{
        border: `1px solid ${C.line2}`, borderRadius: 20, padding: '28px 30px 30px',
        background: `linear-gradient(180deg,#0d1114,${C.bezel})`,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,.05), 0 24px 60px -34px rgba(0,0,0,.9)',
      }}>
        {hasData ? (
          <>
            <div style={{ fontSize: 12, color: C.dim, marginBottom: 18 }}>القياس الحالي <span style={{ color: C.faint, fontFamily: MONO }}>·</span> المجموع</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20 }}>
                <div>
                  <div style={{ fontSize: 12, color: C.dim, marginBottom: 5 }}>الآن</div>
                  <div style={{ fontFamily: MONO, fontWeight: 600, fontSize: 'clamp(60px,10vw,82px)', lineHeight: .8, letterSpacing: '-.03em', fontVariantNumeric: 'tabular-nums' }}>{fmt(overallNow)}</div>
                </div>
                <div style={{ color: C.accent, fontFamily: MONO, fontSize: 30, paddingBottom: 16 }}>←</div>
                <div>
                  <div style={{ fontSize: 12, color: C.dim, marginBottom: 5 }}>الهدف</div>
                  <div style={{ fontFamily: MONO, fontWeight: 600, fontSize: 'clamp(42px,7vw,54px)', lineHeight: .8, color: C.accent, fontVariantNumeric: 'tabular-nums', paddingBottom: 2 }}>{fmt(targetBand)}</div>
                </div>
              </div>
              <div style={{ paddingBottom: 8 }}>
                <span style={{ fontFamily: MONO, fontSize: 14, color: C.fg, border: `1px solid ${C.line2}`, background: 'rgba(255,255,255,.03)', borderRadius: 8, padding: '5px 12px' }}>
                  الفجوة <b style={{ color: C.accent, fontWeight: 600 }}>{gap.toFixed(1)}</b> نطاق
                </span>
                <div style={{ fontSize: 12, color: C.faint, marginTop: 8 }}>{gap <= 0 ? 'بلغت هدفك' : `على بُعد ${Math.round(gap / 0.5)} قياس${gap === 0.5 ? '' : 'ات'} من هدفك`}</div>
              </div>
            </div>
            {/* ruler */}
            <div style={{ direction: 'ltr', position: 'relative', height: 60, marginTop: 30 }}>
              {[0, 20, 40, 60, 80, 100].map((p, i) => (
                <div key={p} style={{ position: 'absolute', top: 30, width: 1, height: 16, background: C.line, left: `${p}%` }}>
                  <b style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', fontFamily: MONO, fontSize: 12, color: C.faint, fontWeight: 500 }}>{4 + i}</b>
                </div>
              ))}
              <div style={{ position: 'absolute', top: 38, left: 0, right: 0, height: 2, background: C.line2 }} />
              <div style={{ position: 'absolute', top: 38, left: pos(overallNow), height: 2, width: `calc(${pos(targetBand)} - ${pos(overallNow)})`, background: 'linear-gradient(90deg,#3fdcc0,rgba(63,220,192,.4))', boxShadow: '0 0 14px rgba(63,220,192,.55)' }} />
              <div style={{ position: 'absolute', top: 31, left: pos(overallNow), width: 15, height: 15, borderRadius: '50%', background: C.fg, border: `3px solid ${C.bezel}`, boxShadow: `0 0 0 2px ${C.fg}`, transform: 'translateX(-50%)' }}>
                <b style={{ position: 'absolute', bottom: 22, left: '50%', transform: 'translateX(-50%)', fontFamily: "'Tajawal',sans-serif", fontSize: 11, color: C.dim, whiteSpace: 'nowrap' }}>أنت · {fmt(overallNow)}</b>
              </div>
              <div style={{ position: 'absolute', top: 27, left: pos(targetBand), transform: 'translateX(-50%)' }}>
                <b style={{ position: 'absolute', bottom: 26, left: '50%', transform: 'translateX(-50%)', fontFamily: MONO, fontSize: 11, color: C.accent, whiteSpace: 'nowrap' }}>الهدف {fmt(targetBand)}</b>
                <i style={{ display: 'block', width: 2, height: 22, background: C.accent, margin: '0 auto', boxShadow: `0 0 8px ${C.accent}` }} />
              </div>
            </div>
          </>
        ) : (
          /* ---- empty state: first measurement ---- */
          <div>
            <div style={{ fontFamily: MONO, fontSize: 11, color: C.accent, marginBottom: 12 }}>أول قياس</div>
            <h2 style={{ fontSize: 'clamp(26px,4vw,38px)', fontWeight: 800, letterSpacing: '-.02em', margin: '0 0 12px', lineHeight: 1.2 }}>لنقِس مستواك بدقّة.</h2>
            <p style={{ fontSize: 15, color: C.dim, margin: '0 0 22px', maxWidth: 52 + 'ch' }}>التشخيص يحدّد نطاقك الحالي في المهارات الأربع، ثم يرسم خطّتك نحو <b style={{ color: C.accent, fontWeight: 600, fontFamily: MONO }}>{fmt(targetBand)}</b>. حوالي ٤٥ دقيقة.</p>
            <Link to="/student/ielts-atelier/diagnostic" style={{
              display: 'inline-flex', alignItems: 'center', gap: 9, background: C.accent, color: '#04140f',
              textDecoration: 'none', fontWeight: 800, fontSize: 15, padding: '13px 26px', borderRadius: 11,
              boxShadow: '0 10px 28px -12px rgba(63,220,192,.6)',
            }}>بدء التشخيص <span style={{ fontFamily: MONO }}>←</span></Link>
            {/* aspirational ruler: just the target */}
            <div style={{ direction: 'ltr', position: 'relative', height: 44, marginTop: 30, opacity: .9 }}>
              {[0, 20, 40, 60, 80, 100].map((p, i) => (
                <div key={p} style={{ position: 'absolute', top: 14, width: 1, height: 16, background: C.line, left: `${p}%` }}>
                  <b style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', fontFamily: MONO, fontSize: 12, color: C.faint }}>{4 + i}</b>
                </div>
              ))}
              <div style={{ position: 'absolute', top: 22, left: 0, right: 0, height: 2, background: C.line2 }} />
              <div style={{ position: 'absolute', top: 11, left: pos(targetBand), transform: 'translateX(-50%)' }}>
                <b style={{ position: 'absolute', bottom: 22, left: '50%', transform: 'translateX(-50%)', fontFamily: MONO, fontSize: 11, color: C.accent, whiteSpace: 'nowrap' }}>الهدف {fmt(targetBand)}</b>
                <i style={{ display: 'block', width: 2, height: 22, background: C.accent, margin: '0 auto', boxShadow: `0 0 8px ${C.accent}` }} />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ===== skill instruments ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
        {SKILLS.map((s, i) => (
          <SkillMeter key={s.id} s={s} band={skillBands[s.id]} target={targetBand} measuredAt={measuredAt} index={i} />
        ))}
      </div>

      {/* ===== next action (only when there's data to prioritise from) ===== */}
      {hasData && weakest && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, background: 'linear-gradient(180deg,#0f1418,#0c1013)', border: `1px solid ${C.line2}`, borderRadius: 16, padding: '22px 24px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 11, color: C.accent }}>الأولوية</div>
            <h3 style={{ margin: '6px 0 4px', fontSize: 19, fontWeight: 800, letterSpacing: '-.01em' }}>{weakest.title} — أبعد مهاراتك عن الهدف</h3>
            <p style={{ margin: 0, fontSize: 13, color: C.dim }}>الفجوة {(targetBand - skillBands[weakest.id]).toFixed(1)} نطاق، وأسرعها تحسّناً بالتدريب المركّز.</p>
          </div>
          <div style={{ marginInlineStart: 'auto' }}>
            <Link to={`/student/ielts-atelier/${weakest.path}`} style={{
              display: 'inline-flex', alignItems: 'center', gap: 9, background: 'transparent', color: C.accent,
              textDecoration: 'none', fontWeight: 700, fontSize: 14, padding: '12px 22px', borderRadius: 11, border: `1px solid ${C.accent}`,
            }}>فتح مختبر {weakest.title} <span style={{ fontFamily: MONO }}>←</span></Link>
          </div>
        </div>
      )}

      {/* ===== readiness strip ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        <Ready label="التشخيص" tone={diagnosticDone ? 'done' : 'wait'} value={diagnosticDone ? 'مكتمل ✓' : 'لم يبدأ'} />
        <Ready label="محاكاة كاملة" tone={mockDone ? 'done' : 'wait'} value={mockDone ? 'مكتملة ✓' : 'لم تبدأ'} />
        <Ready label="بنك الدروس" tone={(errorsLeft ?? 0) > 0 ? 'open' : 'wait'} value={(errorsLeft ?? 0) > 0 ? `${errorsLeft} مستحقة` : '—'} />
        <Ready label="موعد الاختبار" tone={examDays != null ? 'open' : 'wait'} value={examDays != null ? `بعد ${examDays} يوم` : 'لم يُحدَّد'} />
      </div>

      {/* ===== trainer line ===== */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '17px 20px', borderRadius: 14, background: C.panel2, border: `1px solid ${C.line}`, boxShadow: '0 8px 24px -20px rgba(0,0,0,.8)', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex' }}>
          <span style={avStyle}>ع</span>
          <span style={{ ...avStyle, marginInlineStart: -9 }}>م</span>
        </div>
        <div style={{ fontSize: 13.5, color: C.dim, flex: 1, minWidth: 200 }}>
          <b style={{ color: C.fg, fontWeight: 600 }}>د. علي</b> و<b style={{ color: C.fg, fontWeight: 600 }}>د. محمد</b> يراجعان كتابتك ومحادثتك بأنفسهما — لا الذكاء الاصطناعي وحده.
        </div>
        <Link to="/student/ielts-atelier/trainer" style={{ marginInlineStart: 'auto', fontFamily: MONO, fontSize: 11.5, color: C.accent, textDecoration: 'none', whiteSpace: 'nowrap' }}>غرفة المدرب ←</Link>
      </div>
    </div>
  )
}

const avStyle = {
  width: 34, height: 34, borderRadius: '50%', background: '#1b232b', border: '2px solid #0d1114',
  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#9aa4ae',
}

function Ready({ label, value, tone }) {
  const dot = tone === 'done' ? { background: C.ok, boxShadow: `0 0 7px ${C.ok}` } : tone === 'open' ? { background: C.warn } : { background: C.faint }
  return (
    <div style={{ background: C.panel2, border: `1px solid ${C.line}`, borderRadius: 12, padding: '16px', boxShadow: '0 8px 24px -20px rgba(0,0,0,.8)' }}>
      <div style={{ fontSize: 12, color: C.dim, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, ...dot }} />{label}
      </div>
      <div style={{ fontFamily: MONO, fontSize: 15, marginTop: 8, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  )
}
