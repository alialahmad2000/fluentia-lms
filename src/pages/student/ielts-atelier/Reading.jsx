import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Clock, CheckCircle, XCircle, RotateCcw, FileText, Layers, GraduationCap, ArrowLeft, ArrowRight, ChevronDown, Timer, Hourglass, Infinity as InfinityIcon, History } from 'lucide-react'

import BandDisplay from '@/design-system/components/masterclass/BandDisplay'
import { useStudentId } from './_helpers/resolveStudentId'
import { useReadingTests, usePassageMeta, useSubmitReadingTest, useRecentReadingSessions } from '@/hooks/ielts/useReadingLab'
import { gradeQuestions, scoreToBand } from '@/lib/ielts/grading'
import { supabase } from '@/lib/supabase'
import { useG } from '@/i18n/gender'
import { Card, MetaChip, LabHeader } from './_ui/primitives'
import { ExamShell, QuestionPalette } from './_ui/ExamShell'
import { ExamQuestion } from './_ui/ExamQuestions'

const SANS = "-apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
const arDigit = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d])
function splitParagraphs(content) {
  return String(content || '').split(/\n{2,}/).map((s) => s.trim()).filter(Boolean)
}

// ─── Difficulty visuals (per passage position) ────────────────────────────────
const POS_LABEL = ['نص ١ — أيسر', 'نص ٢ — متوسّط', 'نص ٣ — أصعب']
const POS_LEVEL = ['أيسر', 'متوسّط', 'أصعب']
const BAND_COLOR = {
  band_5_6: 'var(--iel-diff-1, #4ade80)',
  band_6_7: 'var(--iel-diff-2, #f5b042)',
  band_7_8: 'var(--iel-diff-3, #fb7185)',
  band_8_9: '#c084fc',
}
function posColor(i) {
  return ['var(--iel-diff-1, #4ade80)', 'var(--iel-diff-2, #f5b042)', 'var(--iel-diff-3, #fb7185)'][i] || 'var(--iel-ink-3)'
}

function useIsWide(bp = 900) {
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.innerWidth > bp)
  useEffect(() => {
    const fn = () => setWide(window.innerWidth > bp)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [bp])
  return wide
}

// ─── Test card — pick ONE text (prominent, interactive) OR the full 3-passage test ─
function TestCard({ test, meta, session, loading, g, onSelectFull, onSelectSingle }) {
  const ids = Array.isArray(test.passage_ids) ? test.passage_ids : []
  const topics = ids.map((id) => meta?.[id]).filter(Boolean)
  const bestBand = session?.band != null ? session.band : null
  const num = String(test.test_number).padStart(2, '0')
  return (
    <div className="iel-gcard" style={{ display: 'flex', flexDirection: 'column', gap: 15, padding: '22px 22px', background: 'var(--iel-surface)', fontFamily: "'Tajawal', sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '2px 10px', borderRadius: 6,
          fontSize: 11.5, fontWeight: 800, fontFamily: "'IBM Plex Sans', sans-serif",
          color: 'var(--iel-accent)', background: 'var(--iel-accent-soft)', border: '1px solid color-mix(in srgb, var(--iel-accent) 26%, transparent)',
        }}>
          <Layers size={12} /> TEST {num}
        </span>
        {bestBand != null && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#4ade80' }}>
            <CheckCircle size={13} /> {Number(bestBand).toFixed(1)}
          </span>
        )}
      </div>

      <div>
        <h3 style={{ margin: '2px 0 8px', fontSize: 16.5, fontWeight: 800, color: 'var(--iel-ink)', lineHeight: 1.4, textAlign: 'start' }}>
          {test.title_ar || `اختبار القراءة ${num}`}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap', fontSize: 12.5, fontWeight: 700, color: 'var(--iel-ink-2)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><BookOpen size={13} color="var(--iel-ink-3)" />٣ نصوص</span>
          <span aria-hidden style={{ opacity: .4 }}>·</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><FileText size={13} color="var(--iel-ink-3)" />{arDigit(test.total_questions || 40)} سؤالاً</span>
          <span aria-hidden style={{ opacity: .4 }}>·</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Clock size={13} color="var(--iel-ink-3)" />{arDigit(test.total_time_minutes || 60)} دقيقة</span>
        </div>
      </div>

      {/* Choice 1 — practise ONE text (now a clear, interactive choice) */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--iel-ink-2)', marginBottom: 8 }}>
          {g('تدرّب على نصّ واحد', 'تدرّبي على نصّ واحد')}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {[0, 1, 2].map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => !loading && onSelectSingle(test, i)}
              title="تدريب على هذا النص وحده (~٢٠ دقيقة)"
              className="iel-passrow"
              style={{
                display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'start',
                padding: '11px 13px', borderRadius: 11, cursor: loading ? 'wait' : 'pointer',
                border: '1px solid var(--iel-border)', background: 'var(--iel-surface-2)',
                fontFamily: "'Tajawal', sans-serif",
              }}
            >
              <span style={{ width: 10, height: 10, borderRadius: '50%', flex: 'none', background: posColor(i), boxShadow: `0 0 9px color-mix(in srgb, ${posColor(i)} 60%, transparent)` }} />
              <span style={{ minWidth: 0, flex: 1 }}>
                <span dir="ltr" style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--iel-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'left' }}>
                  {topics[i]?.title || POS_LABEL[i]}
                </span>
                <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--iel-ink-2)', marginTop: 2 }}>
                  نص {arDigit(i + 1)} · {POS_LEVEL[i]}
                </span>
              </span>
              <span className="arrow" style={{ flex: 'none', fontSize: 16, display: 'inline-block', color: 'var(--iel-ink-3)' }}>←</span>
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '-1px 0' }}>
        <span style={{ flex: 1, height: 1, background: 'var(--iel-border)' }} />
        <span style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--iel-ink-3)' }}>أو</span>
        <span style={{ flex: 1, height: 1, background: 'var(--iel-border)' }} />
      </div>

      {/* Choice 2 — full test */}
      <button
        type="button"
        onClick={() => !loading && onSelectFull(test)}
        disabled={loading}
        className="iel-primary"
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          padding: '12px 14px', borderRadius: 12, border: 0, cursor: loading ? 'wait' : 'pointer',
          background: 'var(--iel-accent)', color: '#fff', fontSize: 13.5, fontWeight: 800, fontFamily: "'Tajawal', sans-serif",
          position: 'relative', overflow: 'hidden',
        }}
      >
        {loading ? 'جارٍ…' : <>الاختبار الكامل — ٣ نصوص · ٦٠ دقيقة <span style={{ fontSize: 15 }}>←</span></>}
      </button>
    </div>
  )
}

function StatBox({ label, value, accent }) {
  return (
    <Card style={{ padding: '14px 18px', flex: '0 0 auto' }}>
      <div style={{ fontSize: 12, color: 'var(--iel-ink-2)', fontWeight: 700, marginBottom: 4 }}>{label}</div>
      <div className="iel-serif" style={{ fontSize: 24, fontWeight: 600, color: accent || 'var(--iel-ink)' }}>{value}</div>
    </Card>
  )
}

// ─── «تحت الساعة» — one passage, 13-14 questions, a visible 20-minute clock ─────
// The missing middle rung. Between learning a question type and sitting a full
// 60-minute exam there is a cliff; this is the step most students actually need
// to live on for weeks, so it gets its own surface rather than being buried as
// an option inside a test card.
function ClockLibrary({ tests, meta, sessions, loadingTestId, onStart }) {
  const g = useG()
  const rows = []
  for (const t of tests) {
    const ids = Array.isArray(t.passage_ids) ? t.passage_ids : []
    ids.forEach((pid, pi) => {
      const m = meta[pid]
      if (!m) return
      rows.push({ test: t, pi, pid, title: m.title, band: m.difficulty_band, topic: m.topic_category })
    })
  }

  // Best + last attempt per passage, and the honest average pace.
  const byPassage = {}
  let singleTotal = 0, singleCount = 0
  for (const ss of sessions) {
    const kind = ss.session_data?.kind
    if (kind && kind !== 'reading_passage') continue
    if (!ss.source_id) continue
    const prev = byPassage[ss.source_id]
    if (!prev || new Date(ss.started_at) > new Date(prev.started_at)) byPassage[ss.source_id] = ss
    if (ss.duration_seconds) { singleTotal += ss.duration_seconds; singleCount++ }
  }
  const avgSecs = singleCount ? Math.round(singleTotal / singleCount) : null
  const avgMin = avgSecs != null ? avgSecs / 60 : null

  const DIFF = { band_5_6: ['سهلة', 'var(--iel-diff-1)'], band_6_7: ['متوسّطة', 'var(--iel-diff-2)'], band_7_8: ['صعبة', 'var(--iel-diff-3)'], band_8_9: ['صعبة', 'var(--iel-diff-3)'] }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22, paddingTop: 2, maxWidth: 940 }}>
      <LabHeader eyebrow="الدرجة الرابعة · الضغط الحقيقي" title="تحت الساعة">
        قطعة واحدة، ثلاثة عشر سؤالاً تقريباً، عشرون دقيقة، وساعة ظاهرة أمامك. {g('الدرجة المفقودة بين تعلّم أنواع الأسئلة وبين امتحان الستين دقيقة — وهي الدرجة التي ستعيش عليها أسابيع.', 'الدرجة المفقودة بين تعلّم أنواع الأسئلة وبين امتحان الستين دقيقة — وهي الدرجة التي ستعيشين عليها أسابيع.')}
      </LabHeader>

      {avgMin != null && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          <div className="iel-gcard" style={{ padding: 18 }}>
            <span className="iel-metachip" style={{ marginBottom: 10, background: 'var(--iel-gold-soft)', borderColor: 'rgba(234,179,8,.3)', color: 'var(--iel-gold-ink)' }}>مؤشّرك</span>
            <h4 style={{ fontSize: 15, fontWeight: 800, color: 'var(--iel-ink)', margin: '0 0 6px' }}>
              متوسّط وقتك: {arDigit(Math.floor(avgMin))}:{arDigit(String(Math.round(avgSecs % 60)).padStart(2, '0'))} دقيقة
            </h4>
            <p style={{ fontSize: 13, color: 'var(--iel-ink-2)', lineHeight: 1.75, margin: 0 }}>
              {avgMin > 20
                ? `أنت${g('', 'ِ')} أبطأ من الهدف بـ${arDigit(Math.round((avgMin - 20) * 10) / 10)} دقيقة تقريباً — أي ${arDigit(Math.round((avgMin - 20) * 3))} دقائق زائدة في الامتحان الكامل. هذه هي القطعة الثالثة التي ${g('لن تصل', 'لن تصلي')} إليها.`
                : g('أنت داخل الهدف. ثبّت هذا الإيقاع ثم انتقل إلى الامتحان الكامل.', 'أنتِ داخل الهدف. ثبّتي هذا الإيقاع ثم انتقلي إلى الامتحان الكامل.')}
            </p>
          </div>
          <div className="iel-gcard" style={{ padding: 18 }}>
            <span className="iel-metachip" style={{ marginBottom: 10, background: 'var(--iel-accent-soft)', borderColor: 'rgba(16,185,129,.3)', color: 'var(--iel-accent-ink)' }}>الهدف</span>
            <h4 style={{ fontSize: 15, fontWeight: 800, color: 'var(--iel-ink)', margin: '0 0 6px' }}>ثلاث قطع متتالية تحت ٢٠ دقيقة</h4>
            <p style={{ fontSize: 13, color: 'var(--iel-ink-2)', lineHeight: 1.75, margin: 0 }}>
              {g('عندها يكون الامتحان الكامل خطوةً طبيعية لا قفزة — لأنك تكون جاهزاً له فعلاً لا نظرياً.', 'عندها يكون الامتحان الكامل خطوةً طبيعية لا قفزة — لأنك تكونين جاهزة له فعلاً لا نظرياً.')}
            </p>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 2 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--iel-ink)' }}>قطع مُوقّتة</h2>
        <span style={{ fontSize: 12.5, color: 'var(--iel-ink-3)', fontWeight: 600 }}>الساعة تعمل من أول كلمة — لا إيقاف</span>
      </div>

      <div>
        {rows.map((r) => {
          const last = byPassage[r.pid]
          const [dLabel, dColor] = DIFF[r.band] || ['متوسّطة', 'var(--iel-diff-2)']
          const busy = loadingTestId === r.test.id
          return (
            <button key={r.pid} type="button" disabled={busy} onClick={() => onStart(r.test, r.pi)} className="iel-passrow"
              style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 14, width: '100%',
                background: 'var(--iel-surface-2)', border: '1px solid var(--iel-border)', marginBottom: 9,
                cursor: busy ? 'wait' : 'pointer', textAlign: 'start', fontFamily: "'Tajawal', sans-serif", opacity: busy ? 0.6 : 1,
              }}>
              <span style={{ flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 64, height: 52, borderRadius: 12, background: 'var(--iel-surface)', border: '1px solid var(--iel-border)' }}>
                <span className="iel-serif" style={{ fontSize: 18, fontWeight: 700, color: 'var(--iel-gold-ink)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>٢٠:٠٠</span>
                <span style={{ fontSize: 10, color: 'var(--iel-ink-3)', fontWeight: 700, marginTop: 3 }}>دقيقة</span>
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 14.5, fontWeight: 700, color: 'var(--iel-ink)', marginBottom: 5, direction: 'ltr', textAlign: 'start' }}>{r.title}</span>
                <span style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                  <span className="iel-metachip"><span style={{ width: 7, height: 7, borderRadius: '50%', background: dColor, display: 'inline-block' }} />{dLabel}</span>
                  {last ? (
                    <span className="iel-metachip" style={{
                      color: last.duration_seconds > 1200 ? '#fca5a5' : 'var(--iel-accent-ink)',
                      borderColor: last.duration_seconds > 1200 ? 'rgba(248,113,113,.3)' : 'rgba(16,185,129,.3)',
                    }}>
                      آخر محاولة {arDigit(last.correct_count)} / {arDigit((last.correct_count || 0) + (last.incorrect_count || 0))} · {arDigit(Math.round((last.duration_seconds || 0) / 60))} دقيقة
                    </span>
                  ) : (
                    <span className="iel-metachip">لم تُحاوَل بعد</span>
                  )}
                </span>
              </span>
              <span className="arrow" style={{ flex: 'none', color: 'var(--iel-ink-3)' }}>←</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Attempt review (shared by post-exam results + the attempts log) ─────────────
const AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
// Month NAME, never «14/7» — a slashed date next to a slashed score is unreadable.
function fmtWhen(iso) {
  if (!iso) return ''
  const d = new Date(iso); if (isNaN(d)) return ''
  const hh = String(d.getHours()).padStart(2, '0'), mm = String(d.getMinutes()).padStart(2, '0')
  return `${arDigit(d.getDate())} ${AR_MONTHS[d.getMonth()]} · ${arDigit(`${hh}:${mm}`)}`
}
function fmtDur(secs) {
  const m = Math.max(1, Math.round((secs || 0) / 60))
  return m >= 60 ? `${arDigit(Math.floor(m / 60))}س ${arDigit(m % 60)}د` : `${arDigit(m)} دقيقة`
}
// Every attempt keeps its full graded review in session_data. Normalise the two
// historical shapes (full-test perPassage[] vs single-passage flat perQuestion).
function reviewPerPassage(sd) {
  if (!sd) return []
  if (Array.isArray(sd.perPassage) && sd.perPassage.length) return sd.perPassage
  if (Array.isArray(sd.perQuestion)) return [{ pi: 0, title: sd.title || null, correct: sd.correct, total: sd.total, perQuestion: sd.perQuestion }]
  return []
}
function attemptLabel(session) {
  const sd = session.session_data || {}
  const pp = reviewPerPassage(sd)
  if (sd.kind === 'reading_passage' || pp.length === 1) return pp[0]?.title || 'نصّ واحد'
  return sd.test_number ? `اختبار القراءة ${arDigit(String(sd.test_number).padStart(2, '0'))}` : 'اختبار كامل'
}

function ReviewRow({ r }) {
  // Warm, on-identity outcome colours — the theme's own green + terracotta,
  // carried on a low tint + a 3px inline-start rule so the paper stays visible.
  const c = r.isCorrect ? 'var(--iel-accent)' : 'var(--iel-bad)'
  const tint = r.isCorrect ? 'color-mix(in srgb, var(--iel-accent) 6%, var(--iel-surface))' : 'color-mix(in srgb, var(--iel-bad) 7%, var(--iel-surface))'
  return (
    <div style={{ padding: '12px 15px', borderRadius: 12, background: tint, border: '1px solid var(--iel-border)', borderInlineStart: `3px solid ${c}`, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <div style={{ flexShrink: 0, marginTop: 3 }}>{r.isCorrect ? <CheckCircle size={15} color={c} /> : <XCircle size={15} color={c} />}</div>
      <div style={{ flex: 1, textAlign: 'start' }}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--iel-ink)', fontFamily: "'Tajawal', sans-serif", lineHeight: 1.65 }}>
          <span style={{ fontWeight: 800, color: 'var(--iel-ink-3)' }}>{arDigit(r.qNum)}. </span>{r.text}
        </p>
        <p style={{ margin: '5px 0 0', fontSize: 12.5, color: 'var(--iel-ink-2)', fontFamily: "'Tajawal', sans-serif" }}>
          إجابتك: <span dir="ltr" style={{ color: c, fontWeight: 800 }}>{r.given || '—'}</span>
          {!r.isCorrect && <>{' '}· الصحيح: <span dir="ltr" style={{ color: 'var(--iel-accent)', fontWeight: 800 }}>{String(r.expected)}</span></>}
        </p>
        {r.explanation && !r.isCorrect && (
          <p style={{ margin: '5px 0 0', fontSize: 11.5, color: 'var(--iel-ink-3)', fontFamily: "'Tajawal', sans-serif", lineHeight: 1.6 }}>{r.explanation}</p>
        )}
      </div>
    </div>
  )
}

function PassageReviewCard({ pp, passage, defaultOpen }) {
  const [showText, setShowText] = useState(!!defaultOpen)
  const paras = passage ? splitParagraphs(passage.content) : []
  const letters = paras.map((_, i) => String.fromCharCode(65 + i))
  const title = passage?.title || pp.title || `نص ${arDigit(pp.pi + 1)}`
  return (
    <div className="iel-gcard" style={{ padding: 0, overflow: 'hidden', background: 'var(--iel-surface)' }}>
      <div style={{ padding: '15px 18px', borderBottom: '1px solid var(--iel-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', flex: 'none', background: posColor(pp.pi) }} />
          <span className="iel-serif" dir="ltr" style={{ fontSize: 16, fontWeight: 700, color: 'var(--iel-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
        </div>
        <span style={{ flex: 'none', fontSize: 12.5, fontWeight: 800, color: posColor(pp.pi), fontFamily: "'Tajawal', sans-serif" }}>{arDigit(pp.correct)} من {arDigit(pp.total)}</span>
      </div>
      {paras.length > 0 && (
        <>
          <button type="button" onClick={() => setShowText((s) => !s)} style={{ width: '100%', padding: '11px 18px', border: 0, borderBottom: '1px solid var(--iel-border)', background: 'var(--iel-surface-2)', color: 'var(--iel-accent-ink)', fontSize: 12.5, fontWeight: 800, fontFamily: "'Tajawal', sans-serif", cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
            <BookOpen size={14} /> {showText ? 'إخفاء النص' : 'إظهار النص الكامل'}
            <ChevronDown size={15} style={{ marginInlineStart: 'auto', transition: 'transform .22s ease', transform: showText ? 'rotate(180deg)' : 'none' }} />
          </button>
          <AnimatePresence initial={false}>
            {showText && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }} style={{ overflow: 'hidden', borderBottom: '1px solid var(--iel-border)' }}>
                <div style={{ padding: '16px 20px', direction: 'ltr' }}>
                  {paras.map((para, i) => (
                    <p key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '0 0 13px', fontSize: 14.5, color: 'var(--iel-ink)', fontFamily: SANS, lineHeight: 1.75, textAlign: 'left' }}>
                      <span style={{ flex: 'none', width: 15, fontWeight: 800, color: 'var(--iel-ink-3)', fontSize: 13 }}>{letters[i]}</span>
                      <span>{para}</span>
                    </p>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(pp.perQuestion || []).map((r) => <ReviewRow key={r.qNum} r={r} />)}
      </div>
    </div>
  )
}

function AttemptReview({ perPassage, passages }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {perPassage.map((pp) => (
        <PassageReviewCard key={pp.pi} pp={pp} passage={passages?.[pp.pi]} defaultOpen={perPassage.length === 1} />
      ))}
    </div>
  )
}

function AttemptRow({ session, onOpen }) {
  const sd = session.session_data || {}
  const pp = reviewPerPassage(sd)
  const isFull = pp.length > 1
  const band = session.band_score != null ? Number(session.band_score) : null
  const correct = session.correct_count || 0
  const total = correct + (session.incorrect_count || 0)
  return (
    <button type="button" onClick={onOpen} className="iel-passrow" style={{ display: 'flex', alignItems: 'center', gap: 13, width: '100%', textAlign: 'start', padding: '14px 16px', borderRadius: 14, cursor: 'pointer', border: '1px solid var(--iel-border)', background: 'var(--iel-surface)', fontFamily: "'Tajawal', sans-serif", boxShadow: '0 1px 2px rgba(60,45,20,.05), 0 12px 26px -20px rgba(60,45,20,.24)' }}>
      <span style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 9px', borderRadius: 7, fontSize: 11.5, fontWeight: 800, color: isFull ? 'var(--iel-accent-ink)' : 'var(--iel-ink-2)', background: isFull ? 'var(--iel-accent-soft)' : 'var(--iel-surface-2)', border: `1px solid ${isFull ? 'color-mix(in srgb, var(--iel-accent) 24%, transparent)' : 'var(--iel-border)'}` }}>
        {isFull ? <Layers size={11} /> : <FileText size={11} />}{isFull ? 'كامل' : 'نصّ'}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: 'var(--iel-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'start', unicodeBidi: 'plaintext' }}>{attemptLabel(session)}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12, color: 'var(--iel-ink-3)', marginTop: 4 }}>
          <span>{fmtWhen(session.completed_at || session.started_at)}</span>
          <span aria-hidden style={{ opacity: .45 }}>·</span>
          <span>{fmtDur(session.duration_seconds)}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 7, background: 'var(--iel-track)', border: '1px solid var(--iel-border)', color: 'var(--iel-ink)', fontWeight: 700 }}>
            <CheckCircle size={11} color="var(--iel-accent)" />{arDigit(correct)} من {arDigit(total)}
          </span>
        </span>
      </span>
      {band != null && (
        <span style={{ flex: 'none', textAlign: 'center' }}>
          <span style={{ display: 'block', fontSize: 9.5, fontWeight: 800, letterSpacing: '.12em', color: 'var(--iel-ink-3)' }}>BAND</span>
          <span className="iel-serif" style={{ display: 'block', fontSize: 19, fontWeight: 700, color: 'var(--iel-accent)', lineHeight: 1 }}>{band.toFixed(1)}</span>
        </span>
      )}
      <span className="arrow" style={{ flex: 'none', fontSize: 15, color: 'var(--iel-ink-3)' }}>←</span>
    </button>
  )
}

// ─── Pre-flight duration chooser — official run, roomy, or untimed ────────────────
function DurationPreflight({ preflight, g, onStart, onClose }) {
  const { test, mode, singleTitle } = preflight
  const official = mode === 'single' ? 20 : (test.total_time_minutes || 60)
  const relaxed = Math.round(official * 1.5)
  const options = [
    { key: 'official', minutes: official, icon: Timer, label: 'الوقت الرسمي', sub: `${arDigit(official)} دقيقة — كتجربة الاختبار الحقيقية` },
    { key: 'relaxed', minutes: relaxed, icon: Hourglass, label: 'وقت مريح', sub: `${arDigit(relaxed)} دقيقة — وقت أوسع بلا ضغط` },
    { key: 'untimed', minutes: null, icon: InfinityIcon, label: 'بلا توقيت', sub: g('خذ وقتك — مطالعة حرّة دون عدّاد', 'خذي وقتك — مطالعة حرّة دون عدّاد') },
  ]
  const [sel, setSel] = useState('official')
  const chosen = options.find((o) => o.key === sel)
  const titleText = mode === 'single' ? (singleTitle || 'تدريب على نصّ واحد') : `الاختبار الكامل — اختبار ${arDigit(String(test.test_number || '').padStart(2, '0'))}`
  const overlay = (
    <div className="iel-root" dir="rtl" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 10060, background: 'color-mix(in srgb, #1b1710 55%, transparent)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <motion.div onClick={(e) => e.stopPropagation()} initial={{ opacity: 0, scale: 0.94, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 26 }} style={{ width: 'min(460px, 100%)', background: 'var(--iel-surface)', border: '1px solid var(--iel-border-strong)', borderRadius: 22, boxShadow: 'var(--iel-shadow)', overflow: 'hidden', fontFamily: "'Tajawal', sans-serif" }}>
        <div style={{ padding: '20px 22px 16px', borderBottom: '1px solid var(--iel-border)' }}>
          <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '.14em', color: 'var(--iel-ink-3)', marginBottom: 6 }}>قبل أن تبدأ</div>
          <div className="iel-serif" style={{ fontSize: 20, fontWeight: 700, color: 'var(--iel-ink)', lineHeight: 1.3 }}>اختر المدّة</div>
          <div dir={mode === 'single' ? 'ltr' : 'rtl'} style={{ fontSize: 12.5, color: 'var(--iel-ink-2)', marginTop: 6, textAlign: 'start' }}>{titleText}</div>
        </div>
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 9 }}>
          {options.map((o) => {
            const on = sel === o.key; const I = o.icon
            return (
              <button key={o.key} type="button" onClick={() => setSel(o.key)} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'start', padding: '13px 14px', borderRadius: 13, cursor: 'pointer', fontFamily: "'Tajawal', sans-serif", border: `1.5px solid ${on ? 'var(--iel-accent)' : 'var(--iel-border-strong)'}`, background: on ? 'var(--iel-accent-soft)' : 'var(--iel-surface-2)', boxShadow: on ? '0 8px 20px -14px color-mix(in srgb, var(--iel-accent) 60%, transparent)' : 'none' }}>
                <span style={{ width: 38, height: 38, borderRadius: 11, flex: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: on ? 'var(--iel-accent)' : 'var(--iel-surface)', color: on ? '#fff' : 'var(--iel-ink-3)', border: on ? '0' : '1px solid var(--iel-border)' }}><I size={18} /></span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 14.5, fontWeight: 800, color: 'var(--iel-ink)' }}>{o.label}</span>
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--iel-ink-2)', marginTop: 2 }}>{o.sub}</span>
                </span>
                <span style={{ width: 18, height: 18, borderRadius: '50%', flex: 'none', border: `2px solid ${on ? 'var(--iel-accent)' : 'var(--iel-border-strong)'}`, background: on ? 'var(--iel-accent)' : 'transparent', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{on && <CheckCircle size={12} color="#fff" />}</span>
              </button>
            )
          })}
        </div>
        <div style={{ padding: '6px 16px 18px', display: 'flex', gap: 10 }}>
          <button type="button" onClick={onClose} style={{ flex: 'none', padding: '13px 18px', borderRadius: 12, border: '1px solid var(--iel-border)', background: 'transparent', color: 'var(--iel-ink-2)', fontSize: 14, fontWeight: 700, fontFamily: "'Tajawal', sans-serif", cursor: 'pointer' }}>إلغاء</button>
          <button type="button" onClick={() => onStart(chosen.minutes)} className="iel-primary" style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '13px', borderRadius: 12, border: 0, background: 'var(--iel-accent)', color: '#fff', fontSize: 14.5, fontWeight: 800, fontFamily: "'Tajawal', sans-serif", cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
            {g('ابدأ الآن', 'ابدئي الآن')} <span style={{ fontSize: 15 }}>←</span>
          </button>
        </div>
      </motion.div>
    </div>
  )
  return createPortal(overlay, document.body)
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function Reading() {
  const { pathname } = useLocation()
  // /reading and /reading/types are their own pages now; this component hosts
  // the two surfaces that need the exam machinery: «تحت الساعة» and «الاختبارات».
  const section = pathname.endsWith('/reading/clock') ? 'clock' : 'tests'

  const g = useG()
  const studentId = useStudentId()
  const testsQ = useReadingTests()
  const metaQ = usePassageMeta()
  const recentQ = useRecentReadingSessions(studentId, 60)
  const submitTest = useSubmitReadingTest()
  const isWide = useIsWide()

  const [act, setAct] = useState('library')
  const [test, setTest] = useState(null)         // selected test + loaded .passages
  const [loadingTestId, setLoadingTestId] = useState(null)
  const [answers, setAnswers] = useState({})     // keyed `${pi}_${qNum}`
  const [timeLeft, setTimeLeft] = useState(0)
  const [gradeResult, setGradeResult] = useState(null)
  const [showReview, setShowReview] = useState(false)
  const [current, setCurrent] = useState(null)
  const [tabIdx, setTabIdx] = useState(0)
  const [mobilePane, setMobilePane] = useState('passage')
  const [preflight, setPreflight] = useState(null)   // { test, mode, pi, singleTitle } — duration chooser
  const [attempt, setAttempt] = useState(null)       // a past session row being reviewed
  const [attemptPassages, setAttemptPassages] = useState(null) // re-fetched passage bodies for the review
  const [attemptLoading, setAttemptLoading] = useState(false)

  const timerRef = useRef(null)
  const qScrollRef = useRef(null)
  const sessionStartRef = useRef(0)

  // ── Per-question timing ────────────────────────────────────────────────────
  // Seconds-per-question is half of what the type heatmap reports, and it is the
  // only way to tell a rushed guess from a considered wrong answer. We accrue
  // time against whichever question is `current`, switching the meter as the
  // student moves. Capped at 600s so an abandoned tab can't poison the average.
  const qSecsRef = useRef({})                       // `${pi}_${qNum}` → seconds
  const qActiveRef = useRef({ key: null, at: 0 })
  const timedOutRef = useRef(false)

  function flushQuestionTime(nextKey) {
    const now = Date.now()
    const { key, at } = qActiveRef.current
    if (key && at) {
      const d = Math.round((now - at) / 1000)
      if (d > 0 && d < 600) qSecsRef.current[key] = (qSecsRef.current[key] || 0) + d
    }
    qActiveRef.current = { key: nextKey ?? null, at: nextKey ? now : 0 }
  }

  // Move the meter whenever the focused question changes.
  useEffect(() => {
    if (act !== 'session') return
    flushQuestionTime(current)
  }, [current, act]) // eslint-disable-line react-hooks/exhaustive-deps

  function resetQuestionTiming() {
    qSecsRef.current = {}
    qActiveRef.current = { key: null, at: 0 }
    timedOutRef.current = false
  }


  // Best band per test id from recent sessions
  const bestByTest = useMemo(() => {
    const m = {}
    for (const s of (recentQ.data || [])) {
      const band = s.band_score != null ? Number(s.band_score) : null
      if (s.source_id == null || band == null) continue
      if (m[s.source_id] == null || band > m[s.source_id]) m[s.source_id] = band
    }
    return m
  }, [recentQ.data])

  // Submit ref so the timer can call it safely
  const submitRef = useRef(null)
  submitRef.current = function doSubmit() {
    clearInterval(timerRef.current)
    flushQuestionTime(null)   // stop the meter on whatever question was open
    const passages = test?.passages || []
    let correct = 0, total = 0
    const perPassage = []
    passages.forEach((p, pi) => {
      const sa = {}
      const secondsByKey = {}
      ;(Array.isArray(p.questions) ? p.questions : []).forEach((q) => {
        const k = `${pi}_${q.question_number}`
        const v = answers[k]
        if (v != null && v !== '') sa[String(q.question_number)] = v
        const s = qSecsRef.current[k]
        if (s != null) secondsByKey[String(q.question_number)] = s
      })
      const r = gradeQuestions({
        questions: p.questions, answerKey: p.answer_key, studentAnswers: sa,
        secondsByKey, timedOut: timedOutRef.current,
      })
      correct += r.correct
      total += r.total
      perPassage.push({ pi, title: p.title, band: r.band, correct: r.correct, total: r.total, perQuestion: r.perQuestion })
    })
    const band = scoreToBand(correct, total || 1)
    const result = { correct, total, band, perPassage }
    setGradeResult(result)
    if (studentId && test) {
      // Elapsed from a real start stamp — correct for timed AND untimed runs.
      const elapsed = Math.max(1, Math.round((Date.now() - (sessionStartRef.current || Date.now())) / 1000))
      submitTest.mutate({
        studentId, test, result, durationSeconds: elapsed,
        sourceId: test.single ? test.singleSourceId : test.id,
        kind: test.single ? 'reading_passage' : 'reading_test',
      })
    }
    setAct('results')
  }

  // Timer — only counts down for timed attempts; an untimed attempt never auto-submits.
  useEffect(() => {
    if (act !== 'session' || test?.untimed) return
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t == null) return t
        if (t <= 1) { clearInterval(timerRef.current); timedOutRef.current = true; submitRef.current(); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [act]) // eslint-disable-line react-hooks/exhaustive-deps

  // `minutes`: a number, or null for an untimed run. undefined → official default.
  async function handleSelectTest(t, minutes) {
    setLoadingTestId(t.id)
    const ids = Array.isArray(t.passage_ids) ? t.passage_ids : []
    const { data, error } = await supabase
      .from('ielts_reading_passages')
      .select('id, title, content, questions, answer_key, difficulty_band, topic_category')
      .in('id', ids)
    if (error || !data?.length) { setLoadingTestId(null); return }
    const order = new Map(ids.map((id, i) => [id, i]))
    const passages = data.slice().sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
    const mins = minutes === undefined ? (t.total_time_minutes || 60) : minutes
    const untimed = mins == null
    setTest({ ...t, passages, single: false, total_time_minutes: mins ?? (t.total_time_minutes || 60), untimed })
    setAnswers({})
    setTimeLeft(untimed ? null : mins * 60)
    sessionStartRef.current = Date.now()
    resetQuestionTiming()
    setGradeResult(null)
    setShowReview(false)
    setTabIdx(0)
    setMobilePane('passage')
    const firstQ = passages[0]?.questions?.[0]?.question_number
    setCurrent(firstQ != null ? `0_${firstQ}` : null)
    setLoadingTestId(null)
    setAct('session')
  }

  // Practise ONE passage on its own; numbering normalised to 1..N for a standalone session
  async function handleSelectSingle(t, pi, minutes) {
    setLoadingTestId(t.id)
    const ids = Array.isArray(t.passage_ids) ? t.passage_ids : []
    const targetId = ids[pi]
    if (!targetId) { setLoadingTestId(null); return }
    const { data, error } = await supabase
      .from('ielts_reading_passages')
      .select('id, title, content, questions, answer_key, difficulty_band, topic_category')
      .eq('id', targetId)
      .single()
    if (error || !data) { setLoadingTestId(null); return }
    const questions = (Array.isArray(data.questions) ? data.questions : []).map((q, i) => ({ ...q, question_number: i + 1 }))
    const answer_key = (Array.isArray(data.answer_key) ? data.answer_key : []).map((e, i) => ({ ...e, question_number: i + 1 }))
    const passage = { ...data, questions, answer_key }
    const mins = minutes === undefined ? 20 : minutes
    const untimed = mins == null
    setTest({
      id: t.id, test_number: t.test_number, title_ar: t.title_ar,
      passages: [passage], single: true, singleSourceId: passage.id, single_title: passage.title,
      total_time_minutes: mins ?? 20, untimed,
    })
    setAnswers({})
    setTimeLeft(untimed ? null : mins * 60)
    sessionStartRef.current = Date.now()
    resetQuestionTiming()
    setGradeResult(null)
    setShowReview(false)
    setTabIdx(0)
    setMobilePane('passage')
    setCurrent(`0_${questions[0]?.question_number ?? 1}`)
    setLoadingTestId(null)
    setAct('session')
  }

  function openPreflight(t, mode, pi) {
    const ids = Array.isArray(t.passage_ids) ? t.passage_ids : []
    const singleTitle = mode === 'single' ? (metaQ.data?.[ids[pi]]?.title || null) : null
    setPreflight({ test: t, mode, pi, singleTitle })
  }

  // Open a past attempt for detailed review — the graded answers live in
  // session_data; the passage bodies are re-fetched (static content).
  async function openAttempt(session) {
    setAttempt(session)
    setAttemptPassages(null)
    setAttemptLoading(true)
    setAct('attempt')
    const sd = session.session_data || {}
    const kind = sd.kind || (reviewPerPassage(sd).length > 1 ? 'reading_test' : 'reading_passage')
    let ids = []
    if (kind === 'reading_passage') ids = session.source_id ? [session.source_id] : []
    else {
      const found = (testsQ.data || []).find((x) => x.id === session.source_id)
      ids = Array.isArray(found?.passage_ids) ? found.passage_ids : []
    }
    if (!ids.length) { setAttemptPassages([]); setAttemptLoading(false); return }
    const { data } = await supabase.from('ielts_reading_passages').select('id, title, content').in('id', ids)
    const byId = new Map((data || []).map((p) => [p.id, p]))
    setAttemptPassages(ids.map((id) => byId.get(id)).filter(Boolean))
    setAttemptLoading(false)
  }

  // Retry the CURRENT session (single or full) without re-fetching — reuses loaded passages
  function restartSession() {
    if (!test) return
    setAnswers({})
    setGradeResult(null)
    setShowReview(false)
    setTabIdx(0)
    setMobilePane('passage')
    setTimeLeft(test.untimed ? null : (test.total_time_minutes || 60) * 60)
    sessionStartRef.current = Date.now()
    resetQuestionTiming()
    const firstQ = test.passages?.[0]?.questions?.[0]?.question_number
    setCurrent(firstQ != null ? `0_${firstQ}` : null)
    setAct('session')
  }

  function handleAnswer(pi, qNum, val) {
    setAnswers((prev) => ({ ...prev, [`${pi}_${qNum}`]: val }))
    setCurrent(`${pi}_${qNum}`)
  }

  function jump(gi, n) {
    if (gi !== tabIdx) { setTabIdx(gi); setMobilePane('questions') }
    setCurrent(`${gi}_${n}`)
    setTimeout(() => {
      const el = (qScrollRef.current || document).querySelector(`[data-q="${n}"]`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, gi !== tabIdx ? 120 : 0)
  }

  function selectPassageTab(pi) {
    setTabIdx(pi)
    setMobilePane('questions')
    const firstQ = test?.passages?.[pi]?.questions?.[0]?.question_number
    if (firstQ != null) setCurrent(`${pi}_${firstQ}`)
  }

  // ── TESTS: ACT 1 — LIBRARY ────────────────────────────────────────────────────
  if (act === 'library') {
    const tests = testsQ.data || []
    const meta = metaQ.data || {}
    if (section === 'clock') {
      return (
        <ClockLibrary
          tests={tests} meta={meta} sessions={recentQ.data || []} loadingTestId={loadingTestId}
          onStart={(t, pi) => handleSelectSingle(t, pi, 20)}
        />
      )
    }
    const completedCount = tests.filter((t) => bestByTest[t.id] != null).length
    const bestBand = Object.keys(bestByTest).length ? Math.max(...Object.values(bestByTest)) : null

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 30, paddingTop: 2, maxWidth: 940 }}>
        <LabHeader eyebrow="القراءة · التدرّب" title="الاختبارات">
          اختر نصّاً واحداً للتركيز (نحو ٢٠ دقيقة)، أو ابدأ اختباراً كاملاً من ثلاثة نصوص وأربعين سؤالاً في ساعة. تصحيح فوري وشرح عربيّ لكل إجابة، وتُضاف أخطاؤك إلى بنك المراجعة.
        </LabHeader>

        {(completedCount > 0 || recentQ.data?.length > 0) && (
          <div className="iel-gcard" style={{ display: 'flex', gap: 0, alignItems: 'stretch', flexWrap: 'wrap', padding: 0, background: 'var(--iel-surface)', borderRadius: 16, overflow: 'hidden' }}>
            {completedCount > 0 && (
              <div style={{ flex: '1 1 150px', padding: '15px 20px', borderInlineEnd: '1px solid var(--iel-border)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--iel-ink-3)', marginBottom: 4 }}>اختبارات مكتملة</div>
                <div className="iel-serif" style={{ fontSize: 26, fontWeight: 700, color: 'var(--iel-ink)', lineHeight: 1 }}>{arDigit(completedCount)}</div>
              </div>
            )}
            {bestBand != null && (
              <div style={{ flex: '1 1 150px', padding: '15px 20px', borderInlineEnd: '1px solid var(--iel-border)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--iel-ink-3)', marginBottom: 4 }}>أفضل نطاق</div>
                <div className="iel-serif" style={{ fontSize: 26, fontWeight: 700, color: 'var(--iel-accent)', lineHeight: 1 }}>{bestBand.toFixed(1)}</div>
              </div>
            )}
            {recentQ.data?.length > 0 && (
              <button type="button" onClick={() => setAct('history')} style={{ flex: '2 1 250px', display: 'flex', alignItems: 'center', gap: 11, padding: '15px 20px', cursor: 'pointer', background: 'transparent', fontFamily: "'Tajawal', sans-serif", border: 0, textAlign: 'start' }}>
                <span style={{ width: 36, height: 36, borderRadius: 10, flex: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--iel-accent-soft)', color: 'var(--iel-accent-ink)', border: '1px solid color-mix(in srgb, var(--iel-accent) 24%, transparent)' }}><History size={17} /></span>
                <span style={{ textAlign: 'start' }}>
                  <span style={{ display: 'block', fontSize: 13.5, fontWeight: 800, color: 'var(--iel-ink)' }}>سجل المحاولات</span>
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--iel-ink-2)', marginTop: 2 }}>{arDigit(recentQ.data.length)} محاولة · النص وإجاباتك</span>
                </span>
                <span style={{ color: 'var(--iel-ink-3)', fontSize: 15, marginInlineStart: 4 }}>←</span>
              </button>
            )}
          </div>
        )}

        {testsQ.isLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
            {Array(6).fill(0).map((_, i) => (
              <div key={i} style={{ height: 260, borderRadius: 18, background: 'color-mix(in srgb, var(--ds-surface) 35%, transparent)', border: '1px solid color-mix(in srgb, var(--ds-border) 35%, transparent)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        ) : tests.length === 0 ? (
          <div style={{ padding: '40px 24px', borderRadius: 20, background: 'color-mix(in srgb, var(--ds-surface) 40%, transparent)', border: '1px solid color-mix(in srgb, var(--ds-border) 40%, transparent)', textAlign: 'center' }}>
            <BookOpen size={32} color="var(--ds-text-muted)" style={{ marginBottom: 12 }} />
            <p style={{ margin: 0, fontSize: 15, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>لا توجد اختبارات متاحة حالياً</p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}
          >
            {tests.map((t) => (
              <TestCard key={t.id} test={t} meta={meta} session={{ band: bestByTest[t.id] }} loading={loadingTestId === t.id} g={g} onSelectFull={(tt) => openPreflight(tt, 'full')} onSelectSingle={(tt, pi) => openPreflight(tt, 'single', pi)} />
            ))}
          </motion.div>
        )}

        {preflight && (
          <DurationPreflight
            preflight={preflight}
            g={g}
            onClose={() => setPreflight(null)}
            onStart={(minutes) => {
              const pf = preflight
              setPreflight(null)
              if (pf.mode === 'single') handleSelectSingle(pf.test, pf.pi, minutes)
              else handleSelectTest(pf.test, minutes)
            }}
          />
        )}
      </div>
    )
  }

  // ── ATTEMPTS LOG ────────────────────────────────────────────────────────────────
  if (act === 'history') {
    const rows = recentQ.data || []
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 70 }}>
        <div>
          <button type="button" onClick={() => setAct('library')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 15px', borderRadius: 10, border: '1px solid var(--iel-border)', background: 'transparent', color: 'var(--iel-ink-2)', fontSize: 13, fontWeight: 700, fontFamily: "'Tajawal', sans-serif", cursor: 'pointer', marginBottom: 16 }}>
            <ArrowRight size={15} /> الاختبارات
          </button>
          <LabHeader eyebrow="القراءة" title="سجل المحاولات">
            كل محاولاتك السابقة — افتح أيّها لتراجع النص كاملاً وإجاباتك سؤالاً سؤالاً مع الصحيح والشرح.
          </LabHeader>
        </div>
        {rows.length === 0 ? (
          <div style={{ padding: '40px 24px', borderRadius: 20, background: 'var(--iel-surface)', border: '1px solid var(--iel-border)', textAlign: 'center' }}>
            <History size={30} color="var(--iel-ink-3)" style={{ marginBottom: 12 }} />
            <p style={{ margin: 0, fontSize: 15, color: 'var(--iel-ink-2)', fontFamily: "'Tajawal', sans-serif" }}>لا توجد محاولات بعد — ابدأ اختباراً وستظهر هنا.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rows.map((s) => <AttemptRow key={s.id} session={s} onOpen={() => openAttempt(s)} />)}
          </div>
        )}
      </div>
    )
  }

  // ── ATTEMPT DETAIL — the text along with the answers ─────────────────────────────
  if (act === 'attempt' && attempt) {
    const perPassage = reviewPerPassage(attempt.session_data)
    const band = attempt.band_score != null ? Number(attempt.band_score) : null
    const correct = attempt.correct_count || 0
    const total = correct + (attempt.incorrect_count || 0)
    return (
      <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18, paddingBottom: 80 }}>
        <button type="button" onClick={() => { setAttempt(null); setAct('history') }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 15px', borderRadius: 10, border: '1px solid var(--iel-border)', background: 'transparent', color: 'var(--iel-ink-2)', fontSize: 13, fontWeight: 700, fontFamily: "'Tajawal', sans-serif", cursor: 'pointer', alignSelf: 'flex-start' }}>
          <ArrowRight size={15} /> السجل
        </button>
        <div className="iel-gcard" style={{ padding: '20px 22px', background: 'var(--iel-surface)', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="iel-serif" style={{ fontSize: 25, fontWeight: 700, color: 'var(--iel-ink)', textAlign: 'start', unicodeBidi: 'plaintext', lineHeight: 1.2 }}>{attemptLabel(attempt)}</div>
            <div style={{ fontSize: 12.5, color: 'var(--iel-ink-3)', marginTop: 5, fontFamily: "'Tajawal', sans-serif" }}>{fmtWhen(attempt.completed_at || attempt.started_at)} · {fmtDur(attempt.duration_seconds)} · <span style={{ color: 'var(--iel-ink)', fontWeight: 800 }}>{arDigit(correct)} من {arDigit(total)}</span> إجابة صحيحة</div>
          </div>
          {band != null && (
            <div style={{ flex: 'none', textAlign: 'center', padding: '8px 16px', borderRadius: 14, background: 'var(--iel-accent-soft)', border: '1px solid color-mix(in srgb, var(--iel-accent) 24%, transparent)' }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.1em', color: 'var(--iel-accent-ink)', fontFamily: "'Tajawal', sans-serif" }}>BAND</div>
              <div className="iel-serif" style={{ fontSize: 24, fontWeight: 700, color: 'var(--iel-accent)', lineHeight: 1 }}>{band.toFixed(1)}</div>
            </div>
          )}
        </div>
        {attemptLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {Array(perPassage.length || 1).fill(0).map((_, i) => (
              <div key={i} style={{ height: 160, borderRadius: 18, background: 'var(--iel-surface-2)', border: '1px solid var(--iel-border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        ) : perPassage.length === 0 ? (
          <div style={{ padding: '32px 24px', borderRadius: 18, background: 'var(--iel-surface)', border: '1px solid var(--iel-border)', textAlign: 'center', color: 'var(--iel-ink-2)', fontFamily: "'Tajawal', sans-serif", fontSize: 14 }}>لا تتوفّر تفاصيل هذه المحاولة.</div>
        ) : (
          <AttemptReview perPassage={perPassage} passages={attemptPassages} />
        )}
      </div>
    )
  }

  // ── ACT 2: SESSION (3 passages) ────────────────────────────────────────────────
  if (act === 'session' && test) {
    const passages = test.passages || []
    const p = passages[tabIdx]
    const paras = splitParagraphs(p?.content)
    const paraLetters = paras.map((_, i) => String.fromCharCode(65 + i))

    const answeredSet = new Set()
    passages.forEach((pp, pi) => (Array.isArray(pp.questions) ? pp.questions : []).forEach((q) => {
      const v = answers[`${pi}_${q.question_number}`]
      if (v != null && v !== '') answeredSet.add(`${pi}_${q.question_number}`)
    }))
    const groups = passages.map((pp, pi) => ({ label: `Passage ${pi + 1}`, numbers: (Array.isArray(pp.questions) ? pp.questions : []).map((q) => q.question_number) }))

    const PassageTabs = (
      <div style={{ flex: 'none', display: 'flex', gap: 6, padding: '9px 16px', borderBottom: '1px solid var(--iel-border)', overflowX: 'auto' }}>
        {passages.map((pp, pi) => {
          const on = pi === tabIdx
          return (
            <button key={pi} onClick={() => selectPassageTab(pi)} style={{
              flex: 'none', display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 13px', borderRadius: 9, cursor: 'pointer',
              fontFamily: "'Tajawal', sans-serif", fontSize: 12.5, fontWeight: 700,
              border: `1.5px solid ${on ? 'var(--iel-accent)' : 'var(--iel-border)'}`,
              background: on ? 'var(--iel-accent-soft)' : 'transparent',
              color: on ? 'var(--iel-accent-ink)' : 'var(--iel-ink-2)',
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: BAND_COLOR[pp.difficulty_band] || 'var(--iel-ink-3)' }} />
              نص {arDigit(pi + 1)}
            </button>
          )
        })}
      </div>
    )

    const PassagePane = (
      <div style={{ padding: isWide ? '24px 30px' : '18px 18px', overflowY: 'auto', height: '100%', direction: 'ltr' }}>
        <h2 style={{ fontSize: 19, fontWeight: 800, color: 'var(--iel-ink)', margin: '0 0 18px', fontFamily: SANS, textAlign: 'left', lineHeight: 1.3 }}>{p?.title}</h2>
        {paras.map((para, i) => (
          <p key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 12, margin: '0 0 15px', fontSize: 15.5, color: 'var(--iel-ink)', fontFamily: SANS, lineHeight: 1.75, textAlign: 'left' }}>
            <span style={{ flex: 'none', width: 16, fontWeight: 800, color: 'var(--iel-ink-2)', fontFamily: SANS, fontSize: 14 }}>{paraLetters[i]}</span>
            <span>{para}</span>
          </p>
        ))}
      </div>
    )

    const QuestionsPane = (
      <div ref={qScrollRef} style={{ padding: isWide ? '22px 24px' : '18px 16px', overflowY: 'auto', height: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          {(Array.isArray(p?.questions) ? p.questions : []).map((q) => (
            <ExamQuestion key={q.question_number} q={q} value={answers[`${tabIdx}_${q.question_number}`]} onChange={(v) => handleAnswer(tabIdx, q.question_number, v)} paragraphLetters={paraLetters} />
          ))}
        </div>
      </div>
    )

    return (
      <ExamShell
        sectionLabel="القراءة"
        partLabel={test.single ? (test.single_title || 'نص واحد') : `Reading Passage ${tabIdx + 1} / ${passages.length}`}
        secsLeft={timeLeft}
        note={test.untimed ? 'بلا توقيت' : null}
        onSubmit={() => submitRef.current()}
        submitting={submitTest.isPending}
        submitLabel={test.single ? 'تسليم النص' : 'تسليم الاختبار'}
        onExit={() => { clearInterval(timerRef.current); setAct('library') }}
        footer={<QuestionPalette groups={groups} answered={answeredSet} current={current} onJump={jump} />}
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
          {passages.length > 1 ? PassageTabs : null}
          <div style={{ flex: 1, minHeight: 0 }}>
            {isWide ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: '100%', minHeight: 0 }}>
                <div style={{ minHeight: 0, borderInlineStart: '1px solid var(--iel-border)', order: 2 }}>{PassagePane}</div>
                <div style={{ minHeight: 0, order: 1 }}>{QuestionsPane}</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
                <div style={{ flex: 'none', display: 'flex', gap: 8, padding: '10px 16px', borderBottom: '1px solid var(--iel-border)' }}>
                  {[['passage', 'النص'], ['questions', 'الأسئلة']].map(([k, l]) => (
                    <button key={k} onClick={() => setMobilePane(k)} style={{ flex: 1, padding: '9px', borderRadius: 9, cursor: 'pointer', fontFamily: "'Tajawal', sans-serif", fontSize: 13.5, fontWeight: 700, border: `1.5px solid ${mobilePane === k ? 'var(--iel-accent)' : 'var(--iel-border)'}`, background: mobilePane === k ? 'var(--iel-accent-soft)' : 'transparent', color: mobilePane === k ? 'var(--iel-accent-ink)' : 'var(--iel-ink-2)' }}>{l}</button>
                  ))}
                </div>
                <div style={{ flex: 1, minHeight: 0 }}>{mobilePane === 'passage' ? PassagePane : QuestionsPane}</div>
              </div>
            )}
          </div>
        </div>
      </ExamShell>
    )
  }

  // ── ACT 3: RESULTS ──────────────────────────────────────────────────────────────
  if (act === 'results' && gradeResult) {
    const { correct, total, band, perPassage } = gradeResult

    return (
      <div dir="rtl" style={{ maxWidth: 680, margin: '0 auto', paddingBottom: 80, display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Score */}
        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{ padding: '40px 32px', borderRadius: 24, background: 'color-mix(in srgb, var(--sunset-base-mid, #1a1220) 48%, transparent)', border: '1px solid color-mix(in srgb, var(--sunset-amber, #f59e0b) 22%, transparent)', backdropFilter: 'blur(10px)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
        >
          {test?.single ? (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif", direction: 'ltr' }}>{test.single_title || 'نص واحد'}</p>
          ) : (
            <p style={{ margin: 0, fontSize: 12, color: 'var(--ds-text-muted)', fontFamily: "'IBM Plex Sans', sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Reading Test {String(test?.test_number || '').padStart(2, '0')}
            </p>
          )}
          <BandDisplay band={band} size="xl" animate />
          <p style={{ margin: 0, fontSize: 15, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>{correct} من {total} إجابة صحيحة</p>
        </motion.div>

        {/* Per-passage breakdown (only for the full 3-passage test) */}
        {perPassage.length > 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.4 }} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {perPassage.map((pp) => (
              <div key={pp.pi} style={{ padding: '14px 12px', borderRadius: 14, background: 'color-mix(in srgb, var(--ds-surface) 45%, transparent)', border: '1px solid color-mix(in srgb, var(--ds-border) 45%, transparent)', textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif", marginBottom: 6 }}>نص {arDigit(pp.pi + 1)}</div>
                <div className="iel-serif" style={{ fontSize: 20, fontWeight: 700, color: posColor(pp.pi) }}>{pp.correct}/{pp.total}</div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Actions */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 0.4 }} style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => setAct('library')} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid color-mix(in srgb, var(--ds-border) 55%, transparent)', background: 'color-mix(in srgb, var(--ds-surface) 45%, transparent)', color: 'var(--ds-text-muted)', fontSize: 14, fontWeight: 700, fontFamily: "'Tajawal', sans-serif", cursor: 'pointer' }}>
            كل الاختبارات
          </button>
          <button onClick={restartSession} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px', borderRadius: 12, border: '1px solid color-mix(in srgb, var(--sunset-orange, #fb7185) 38%, transparent)', background: 'color-mix(in srgb, var(--sunset-orange, #fb7185) 13%, transparent)', color: 'var(--ds-text)', fontSize: 14, fontWeight: 700, fontFamily: "'Tajawal', sans-serif", cursor: 'pointer' }}>
            <RotateCcw size={13} /> {g('حاول مرة أخرى', 'حاولي مرة أخرى')}
          </button>
        </motion.div>

        {/* Review */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.4 }}>
          <button onClick={() => setShowReview((r) => !r)} style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid color-mix(in srgb, var(--ds-border) 45%, transparent)', background: 'color-mix(in srgb, var(--ds-surface) 45%, transparent)', color: 'var(--ds-text-muted)', fontSize: 14, fontFamily: "'Tajawal', sans-serif", cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {showReview ? 'إخفاء المراجعة' : 'مراجعة الإجابات'}
          </button>

          <AnimatePresence>
            {showReview && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} style={{ overflow: 'hidden', marginTop: 12 }}>
                <AttemptReview perPassage={perPassage} passages={test?.passages} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    )
  }

  return null
}
