import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, BookOpen, Headphones, ChevronDown } from 'lucide-react'
import HighlightableText from './HighlightableText'

/* ============================================================================
   The full post-exam review, shared by every IELTS exam (reading / listening /
   mock). One section = the SOURCE (passage text or audio transcript, collapsible)
   + every question with its choices, the student's answer, the correct answer,
   and the feedback. Feedback is ALWAYS shown (not only when wrong).
   ========================================================================== */

const SANS = "-apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
const arDigit = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d])
const norm = (v) => String(v ?? '').trim().toLowerCase()
function splitParagraphs(content) {
  return String(content || '').split(/\n{2,}|\r\n\r\n/).map((s) => s.trim()).filter(Boolean)
}

// Derive the choice list for a graded question, keyed the way the student answered
// (MCQ/matching → letters A/B/C…, TF-NG/YN → the words). Returns null for gap-fill.
function reviewOptions(r) {
  const t = String(r.type || '').toLowerCase()
  if (t === 'true_false_not_given') return ['TRUE', 'FALSE', 'NOT GIVEN'].map((k) => ({ key: k, label: k }))
  if (t === 'yes_no_not_given') return ['YES', 'NO', 'NOT GIVEN'].map((k) => ({ key: k, label: k }))
  const o = r.options
  if (Array.isArray(o) && o.length) {
    return o.map((v, i) => {
      const label = typeof v === 'string' ? v.replace(/^[A-Za-z][):.]\s*/, '') : (v?.text ?? v?.label ?? String(v))
      return { key: String.fromCharCode(65 + i), label }
    })
  }
  return null
}

export function ReviewRow({ r }) {
  const c = r.isCorrect ? 'var(--iel-accent)' : 'var(--iel-bad)'
  const tint = r.isCorrect ? 'color-mix(in oklab, var(--iel-accent) 6%, var(--iel-surface))' : 'color-mix(in oklab, var(--iel-bad) 7%, var(--iel-surface))'
  const opts = reviewOptions(r)
  const expected = norm(r.expected)
  const given = norm(r.given)
  const correctShown = opts ? opts.some((o) => norm(o.key) === expected || norm(o.label) === expected) : false
  return (
    <div style={{ padding: '12px 15px', borderRadius: 12, background: tint, border: '1px solid var(--iel-border)', borderInlineStart: `3px solid ${c}`, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <div style={{ flexShrink: 0, marginTop: 3 }}>{r.isCorrect ? <CheckCircle size={15} color={c} /> : <XCircle size={15} color={c} />}</div>
      <div style={{ flex: 1, textAlign: 'start', minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--iel-ink)', fontFamily: "'Tajawal', sans-serif", lineHeight: 1.65 }}>
          <span style={{ fontWeight: 800, color: 'var(--iel-ink-3)' }}>{arDigit(r.qNum)}. </span><span dir="ltr" style={{ fontFamily: SANS }}>{r.text}</span>
        </p>
        {opts ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 8 }}>
            {opts.map((o) => {
              const isCorrect = norm(o.key) === expected || norm(o.label) === expected
              const isPicked = norm(o.key) === given || norm(o.label) === given
              const oc = isCorrect ? 'var(--iel-accent)' : (isPicked ? 'var(--iel-bad)' : 'var(--iel-border)')
              const showBadge = o.key !== o.label // TF-NG/YN keys ARE the word → no separate letter badge
              return (
                <div key={o.key} dir="ltr" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, border: `1px solid ${oc}`, background: isCorrect ? 'color-mix(in oklab, var(--iel-accent) 10%, transparent)' : (isPicked ? 'color-mix(in oklab, var(--iel-bad) 8%, transparent)' : 'transparent') }}>
                  {showBadge && <span style={{ width: 20, height: 20, borderRadius: 6, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, fontFamily: SANS, color: (isCorrect || isPicked) ? '#fff' : 'var(--iel-ink-3)', background: isCorrect ? 'var(--iel-accent)' : (isPicked ? 'var(--iel-bad)' : 'var(--iel-surface-2)') }}>{o.key}</span>}
                  <span style={{ flex: 1, fontSize: 12.5, color: 'var(--iel-ink)', textAlign: 'left', fontFamily: SANS, lineHeight: 1.5, fontWeight: showBadge ? 400 : 700 }}>{o.label}</span>
                  {isCorrect && <CheckCircle size={13} color="var(--iel-accent)" style={{ flex: 'none' }} />}
                  {isPicked && !isCorrect && <XCircle size={13} color="var(--iel-bad)" style={{ flex: 'none' }} />}
                </div>
              )
            })}
            {/* safety net — if none of the rendered options matched the key, name the correct answer */}
            {!correctShown && r.expected != null && (
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--iel-accent)', fontFamily: "'Tajawal', sans-serif", fontWeight: 700 }}>الإجابة الصحيحة: <span dir="ltr">{String(r.expected)}</span></p>
            )}
          </div>
        ) : (
          <p style={{ margin: '5px 0 0', fontSize: 12.5, color: 'var(--iel-ink-2)', fontFamily: "'Tajawal', sans-serif" }}>
            إجابتك: <span dir="ltr" style={{ color: c, fontWeight: 800 }}>{r.given || '—'}</span>
            {!r.isCorrect && r.expected != null && <>{' '}· الصحيح: <span dir="ltr" style={{ color: 'var(--iel-accent)', fontWeight: 800 }}>{String(r.expected)}</span></>}
          </p>
        )}
        {r.explanation && (
          <p style={{ margin: '7px 0 0', padding: '7px 11px', borderRadius: 9, background: 'var(--iel-gold-soft)', border: '1px solid color-mix(in oklab, var(--iel-gold) 28%, transparent)', borderInlineStart: '3px solid var(--iel-gold)', fontSize: 11.5, color: 'var(--iel-ink-2)', fontFamily: "'Tajawal', sans-serif", lineHeight: 1.65 }}>
            <b style={{ color: 'var(--iel-gold-ink, var(--iel-gold))' }}>الشرح: </b>{r.explanation}
          </p>
        )}
      </div>
    </div>
  )
}

function SectionReviewCard({ section, defaultOpen }) {
  const [showSource, setShowSource] = useState(!!defaultOpen)
  const isTranscript = section.sourceKind === 'transcript'
  const paras = splitParagraphs(section.sourceText)
  const color = section.color || 'var(--iel-accent)'
  const SrcIcon = isTranscript ? Headphones : BookOpen
  const toggleLabel = isTranscript
    ? (showSource ? 'إخفاء نص التسجيل' : 'إظهار نص التسجيل (السكربت)')
    : (showSource ? 'إخفاء النص' : 'إظهار النص الكامل')
  return (
    <div className="iel-gcard" style={{ padding: 0, overflow: 'hidden', background: 'var(--iel-surface)' }}>
      <div style={{ padding: '15px 18px', borderBottom: '1px solid var(--iel-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', flex: 'none', background: color }} />
          <span className="iel-serif" dir="ltr" style={{ fontSize: 16, fontWeight: 700, color: 'var(--iel-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'start' }}>{section.title || '—'}</span>
        </div>
        {section.total != null && (
          <span style={{ flex: 'none', fontSize: 12.5, fontWeight: 800, color, fontFamily: "'Tajawal', sans-serif" }}>{arDigit(section.correct ?? 0)} من {arDigit(section.total)}</span>
        )}
      </div>

      {paras.length > 0 && (
        <>
          <button type="button" onClick={() => setShowSource((s) => !s)} style={{ width: '100%', padding: '11px 18px', border: 0, borderBottom: '1px solid var(--iel-border)', background: 'var(--iel-surface-2)', color: 'var(--iel-accent-ink)', fontSize: 12.5, fontWeight: 800, fontFamily: "'Tajawal', sans-serif", cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
            <SrcIcon size={14} /> {toggleLabel}
            <ChevronDown size={15} style={{ marginInlineStart: 'auto', transition: 'transform .22s ease', transform: showSource ? 'rotate(180deg)' : 'none' }} />
          </button>
          <AnimatePresence initial={false}>
            {showSource && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }} style={{ overflow: 'hidden', borderBottom: '1px solid var(--iel-border)' }}>
                {section.sourceId ? (
                  <HighlightableText text={section.sourceText} sourceType={isTranscript ? 'listening_transcript' : 'reading_passage'} sourceId={section.sourceId} lettered={!isTranscript} variant="review" />
                ) : (
                  <div style={{ padding: '16px 20px', direction: 'ltr' }}>
                    {paras.map((para, i) => (
                      <p key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '0 0 13px', fontSize: 14.5, color: 'var(--iel-ink)', fontFamily: SANS, lineHeight: 1.75, textAlign: 'left' }}>
                        {!isTranscript && <span style={{ flex: 'none', width: 15, fontWeight: 800, color: 'var(--iel-ink-3)', fontSize: 13 }}>{String.fromCharCode(65 + i)}</span>}
                        <span>{para}</span>
                      </p>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(section.perQuestion || []).map((r, i) => <ReviewRow key={r.qNum ?? i} r={r} />)}
      </div>
    </div>
  )
}

/**
 * sections: [{ title, correct, total, perQuestion:[…grading rows], sourceText, sourceKind:'passage'|'transcript', color? }]
 */
export default function ExamReview({ sections }) {
  const list = Array.isArray(sections) ? sections.filter(Boolean) : []
  if (!list.length) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {list.map((s, i) => <SectionReviewCard key={i} section={s} defaultOpen={list.length === 1} />)}
    </div>
  )
}
