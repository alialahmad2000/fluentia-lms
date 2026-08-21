// «ورقة المذاكرة» — the study layer distilled from a reading passage.
//
// WHY THIS EXISTS
// The reading section used to be read → listen → answer → a few highlighted
// words. Nothing survived the session: the article was something you consumed,
// never something you studied. This surface is what a teacher says at the board
// AFTER the class finishes reading — the patterns that are actually in THIS
// passage, the phrases worth stealing whole, and a short check that can only be
// answered by someone who studied the explanation rather than re-scanning the
// text.
//
// It is purely ADDITIVE. The passage, the audio, the vocabulary box and the
// comprehension questions are untouched; this sits between the article and the
// questions so those questions now test something that was actually taught.
//
// The check here is a self-check: it is graded in the browser and writes
// nothing. The graded record for a reading stays exactly what it was — the
// comprehension questions — so the (fragile) progress/attempt engine is not
// touched by this feature at all.
//
// Content lives in curriculum_readings.study_sheet (jsonb, v1 shape documented
// in the reading_study_sheet_column migration). A reading with no sheet renders
// nothing, so this is safe on all 260 readings from day one.
import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GraduationCap, ChevronDown, Quote, AlertTriangle, PenLine,
  Sparkles, CheckCircle2, XCircle, RotateCcw, Eye, ArrowLeft,
} from 'lucide-react'
import { useG, genderizeText } from '@/i18n/gender'
import { isolateLatin } from '../../grammar/RichText'

// ── helpers ────────────────────────────────────────────────────────────────

/** Escape a phrase for use inside a RegExp (highlights come from content). */
function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Split `text` on every occurrence of any phrase in `phrases`, returning
 * [{ t, hit }] parts so the caller can render the hits as <mark>.
 * Longest-first so "make the cost higher" wins over "make".
 */
function markParts(text, phrases) {
  const list = (phrases || []).filter(Boolean).map(String).sort((a, b) => b.length - a.length)
  if (!text) return []
  if (!list.length) return [{ t: text, hit: false }]
  const re = new RegExp(`(${list.map(escapeRe).join('|')})`, 'gi')
  return String(text)
    .split(re)
    .filter((p) => p !== '')
    .map((p) => ({ t: p, hit: list.some((h) => h.toLowerCase() === p.toLowerCase()) }))
}

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[.,!?;:"'’]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * Arabic teaching prose. Every explanation here quotes English mid-sentence
 * ("…ثم Next للخطوة التالية…"), and an un-isolated multi-word Latin run gets
 * reordered by RTL bidi — "First / Next / After that" arrives split across
 * lines in the wrong order. isolateLatin() is the same helper the grammar
 * lessons use; it wraps those runs in <bdi> without dragging in RichText's
 * block layout or its CSS.
 */
const AR_LETTERS = '\\u0600-\\u06FF\\u0750-\\u077F\\uFB50-\\uFDFF\\uFE70-\\uFEFF'
// A single Latin word closing an Arabic sentence — "… كلمة واحدة: named." — is the
// one case isolateLatin deliberately skips (a lone word reorders fine on its own).
// But the sentence's final «.» is bidi-neutral, so RTL paints it on the WRONG side
// (".named"). Isolating that word together with its punctuation fixes it, and lets
// the Arabic prose end on an English term whenever that is the clearest way to say
// it. Group 1 runs to the last Arabic letter, group 2 is the non-Latin gap (": "),
// group 3 is the lone word — a multi-word tail cannot match, and is already handled
// by isolateLatin.
const LONE_TAIL = new RegExp(
  `^([\\s\\S]*[${AR_LETTERS}])([^A-Za-z]*)([A-Za-z][A-Za-z'\u2019-]*[)"'\\]]?[.!?]?)\\s*$`
)
function renderAr(text, key) {
  const s = genderizeText(text) || ''
  const m = s.match(LONE_TAIL)
  if (!m) return isolateLatin(s, key)
  return [
    isolateLatin(m[1], key),
    m[2],
    <bdi key={`${key}-tail`} dir="ltr">{m[3]}</bdi>,
  ]
}


// ── the palette ────────────────────────────────────────────────────────────
//
// The reading tab runs on the --ds-* token layer, and in the student's default
// theme that layer is WARM: ground #0b0f18, cream ink #faf5e6, one gold accent
// #e9b949. The first version of this sheet was built from raw Tailwind instead —
// cold slate neutrals (slate-900/800/300), a SECOND gold (amber #f59e0b) beside
// the theme's gold, and a sky-blue check block. Cold neutrals lit by a warm
// accent is precisely what reads as muddy brown rather than lit, which is what
// the owner saw on production.
//
// So every colour here is a token with the same fallback the article card uses,
// and the sheet now inherits the student's theme instead of fighting it. Two
// rules held throughout:
//   • elevation moves toward the LIGHT — a card darker than the surface it sits
//     on is the single thing that makes a dark UI look unfinished.
//   • ONE accent. A block that is a different KIND of thing is separated by
//     MATERIAL (raised warm glass, a dashed rule), never by a second hue.
const T = {
  ink: 'var(--ds-text-primary, #faf5e6)',
  body: 'var(--ds-text-secondary, #c9c3b0)',
  muted: 'var(--ds-text-tertiary, #8b8578)',
  gold: 'var(--ds-accent-primary, #e9b949)',
  rule: 'var(--ds-accent-rule, rgba(233,185,73,.42))',
  wash: 'var(--ds-accent-wash, rgba(233,185,73,.08))',
  ground: 'var(--ds-bg-elevated, #0d111b)',
  well: 'var(--ds-bg-base, #05070d)',
  raise: 'var(--ds-surface-1, rgba(255,255,255,0.028))',
  warm: 'var(--ds-surface-2, rgba(255,215,140,0.055))',
  edge: 'var(--ds-border-subtle, rgba(255,255,255,0.07))',
  good: 'var(--ds-accent-success, #84cc7a)',
  bad: 'var(--ds-accent-danger, #e06666)',
}
// Tints are stated once so a verdict, a warning and a highlight never drift apart.
const GOOD_BG = 'rgba(132,204,122,0.12)'
const GOOD_EDGE = 'rgba(132,204,122,0.26)'
const BAD_BG = 'rgba(224,102,102,0.09)'
const BAD_EDGE = 'rgba(224,102,102,0.22)'
const GOLD_EDGE = 'rgba(233,185,73,0.26)'

function Ar({ text, className, style }) {
  const body = useMemo(() => renderAr(text, 'ar'), [text])
  if (!text) return null
  return (
    <p dir="rtl" className={className} style={style}>
      {body}
    </p>
  )
}

// ── quoted line from the passage ───────────────────────────────────────────

function FromText({ text, highlights }) {
  const parts = useMemo(() => markParts(text, highlights), [text, highlights])
  return (
    <div
      className="rounded-xl px-4 py-3"
      style={{ background: T.well, borderRight: `2px solid ${T.rule}` }}
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        <Quote size={11} style={{ color: T.gold, opacity: 0.7 }} />
        <span className="font-['Tajawal'] text-[10px] tracking-wide" style={{ color: T.muted }}>
          من النص
        </span>
      </div>
      <p dir="ltr" className="text-left font-en text-[15px] leading-[1.85]" style={{ color: T.body }}>
        {parts.map((p, i) =>
          p.hit ? (
            <mark
              key={i}
              className="rounded px-1 font-semibold decoration-clone"
              style={{ background: 'rgba(233,185,73,0.15)', color: T.gold }}
            >
              {p.t}
            </mark>
          ) : (
            <span key={i}>{p.t}</span>
          )
        )}
      </p>
    </div>
  )
}

// ── one taught pattern ─────────────────────────────────────────────────────

function PatternCard({ item, index, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div
      className="overflow-hidden rounded-2xl"
      style={{ background: T.raise, border: `1px solid ${T.edge}` }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-right transition-colors hover:bg-white/[0.03] sm:px-5"
      >
        <span
          className="flex h-7 w-7 flex-none items-center justify-center rounded-lg font-en text-[12px] font-bold"
          style={{ background: T.wash, color: T.gold }}
        >
          {index + 1}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-['Tajawal'] text-[15px] font-bold" style={{ color: T.ink }}>
            {item.title_ar}
          </span>
          {item.title_en && (
            <span
              dir="ltr"
              className="block truncate text-right font-en text-[11.5px]"
              style={{ color: T.muted }}
            >
              {item.title_en}
            </span>
          )}
        </span>
        <ChevronDown
          size={16}
          style={{ color: T.muted }}
          className={`flex-none transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div
              className="space-y-3.5 px-4 pb-5 pt-4 sm:px-5"
              style={{ borderTop: `1px solid ${T.edge}` }}
            >
              {item.from_text && <FromText text={item.from_text} highlights={item.highlights} />}

              <Ar
                text={item.explain_ar}
                className="font-['Tajawal'] text-[14.5px] leading-[2]"
                style={{ color: T.body }}
              />

              {item.watch_out_ar && (
                <div
                  className="flex items-start gap-2.5 rounded-xl px-4 py-3"
                  style={{ background: BAD_BG, border: `1px solid ${BAD_EDGE}` }}
                >
                  <AlertTriangle size={14} className="mt-0.5 flex-none" style={{ color: T.bad }} />
                  <Ar
                    text={item.watch_out_ar}
                    className="font-['Tajawal'] text-[13.5px] leading-[1.95]"
                    style={{ color: T.ink }}
                  />
                </div>
              )}

              {item.examples_en?.length > 0 && (
                <div className="space-y-1.5 pr-3.5" style={{ borderRight: `1px solid ${T.edge}` }}>
                  {item.examples_en.map((ex, i) => (
                    <p
                      key={i}
                      dir="ltr"
                      className="text-left font-en text-[14.5px] leading-[1.8]"
                      style={{ color: T.body }}
                    >
                      {ex}
                    </p>
                  ))}
                </div>
              )}

              {item.try_ar && (
                <div className="flex items-start gap-2.5 rounded-xl px-4 py-3" style={{ background: T.raise }}>
                  <PenLine size={14} className="mt-0.5 flex-none" style={{ color: T.gold }} />
                  <Ar
                    text={item.try_ar}
                    className="font-['Tajawal'] text-[13.5px] leading-[1.95]"
                    style={{ color: T.body }}
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── check items ────────────────────────────────────────────────────────────

// A missed self-check is not an error — nothing is recorded and nobody sees it.
// So "wrong" is styled as a nudge in the section's own gold, and the alarming
// red is reserved for the option the student actually picked in an MCQ.
function Verdict({ ok, why }) {
  return (
    <div
      className="mt-3 flex items-start gap-2.5 rounded-xl px-3.5 py-2.5"
      style={{
        background: ok ? GOOD_BG : T.wash,
        border: `1px solid ${ok ? GOOD_EDGE : GOLD_EDGE}`,
      }}
    >
      {ok ? (
        <CheckCircle2 size={14} className="mt-0.5 flex-none" style={{ color: T.good }} />
      ) : (
        <XCircle size={14} className="mt-0.5 flex-none" style={{ color: T.gold }} />
      )}
      <Ar text={why} className="font-['Tajawal'] text-[13px] leading-[1.9]" style={{ color: T.body }} />
    </div>
  )
}

function McqCheck({ item, answered, onAnswer }) {
  const picked = answered?.value ?? null
  return (
    <>
      <p dir="ltr" className="text-left font-en text-[15.5px] leading-[1.9]" style={{ color: T.ink }}>
        {item.stem_en}
      </p>
      <div dir="ltr" className="mt-3 flex flex-wrap gap-2">
        {(item.options || []).map((opt) => {
          const isPicked = picked === opt
          const isAnswer = norm(opt) === norm(item.answer)
          const style = picked
            ? isAnswer
              ? { background: GOOD_BG, borderColor: GOOD_EDGE, color: T.good }
              : isPicked
                ? { background: BAD_BG, borderColor: BAD_EDGE, color: T.bad }
                : { borderColor: T.edge, color: T.muted }
            : { background: T.raise, borderColor: T.edge, color: T.body }
          return (
            <button
              key={opt}
              disabled={!!picked}
              onClick={() => onAnswer({ value: opt, ok: isAnswer })}
              style={style}
              className={`rounded-lg border px-3.5 py-2 font-en text-[14px] transition-colors ${
                picked ? '' : 'hover:border-[rgba(233,185,73,0.45)]'
              } ${picked && isPicked && !isAnswer ? 'line-through' : ''}`}
            >
              {opt}
            </button>
          )
        })}
      </div>
      {picked && <Verdict ok={answered.ok} why={item.why_ar} />}
    </>
  )
}

function OrderCheck({ item, answered, onAnswer }) {
  const [built, setBuilt] = useState([])
  const pool = useMemo(() => {
    const used = [...built]
    return (item.tokens || []).filter((t) => {
      const i = used.indexOf(t)
      if (i === -1) return true
      used.splice(i, 1)
      return false
    })
  }, [item.tokens, built])

  const submit = useCallback(() => {
    onAnswer({ value: built.join(' '), ok: norm(built.join(' ')) === norm(item.answer) })
  }, [built, item.answer, onAnswer])

  return (
    <>
      <Ar
        text={item.prompt_ar}
        className="mb-2.5 font-['Tajawal'] text-[13.5px] leading-[1.9]"
        style={{ color: T.muted }}
      />
      <div
        dir="ltr"
        className="min-h-[46px] rounded-xl px-3 py-2.5 text-left font-en text-[15px]"
        style={{ background: T.well, border: `1px solid ${T.edge}`, color: T.ink }}
      >
        {built.length ? built.join(' ') : <span style={{ color: T.muted, opacity: 0.7 }}>…</span>}
      </div>

      {!answered && (
        <>
          <div dir="ltr" className="mt-2.5 flex flex-wrap gap-2">
            {pool.map((t, i) => (
              <button
                key={`${t}-${i}`}
                onClick={() => setBuilt((b) => [...b, t])}
                style={{ background: T.raise, borderColor: T.edge, color: T.body }}
                className="rounded-lg border px-3 py-1.5 font-en text-[13.5px] transition-colors hover:border-[rgba(233,185,73,0.45)]"
              >
                {t}
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              disabled={!built.length}
              onClick={submit}
              style={{ background: T.gold, color: 'var(--ds-text-inverse, #14100a)' }}
              className="rounded-lg px-3.5 py-1.5 font-['Tajawal'] text-[12.5px] font-bold transition-opacity hover:opacity-85 disabled:opacity-40"
            >
              تحقّقي
            </button>
            {built.length > 0 && (
              <button
                onClick={() => setBuilt([])}
                style={{ color: T.muted }}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-['Tajawal'] text-[12.5px] transition-opacity hover:opacity-70"
              >
                <RotateCcw size={12} /> من جديد
              </button>
            )}
          </div>
        </>
      )}

      {answered && (
        <>
          {!answered.ok && (
            <p dir="ltr" className="mt-2.5 text-left font-en text-[14px]" style={{ color: T.good }}>
              {item.answer}
            </p>
          )}
          <Verdict ok={answered.ok} why={item.why_ar} />
        </>
      )}
    </>
  )
}

function ProduceCheck({ item }) {
  const [text, setText] = useState('')
  const [shown, setShown] = useState(false)
  return (
    <>
      <Ar
        text={item.prompt_ar}
        className="font-['Tajawal'] text-[14px] leading-[1.95]"
        style={{ color: T.ink }}
      />
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        dir="ltr"
        rows={2}
        placeholder="Write your own sentence…"
        style={{ background: T.well, borderColor: T.edge, color: T.ink }}
        className="mt-3 w-full resize-none rounded-xl border px-3.5 py-3 text-left font-en text-[15px] leading-[1.7] outline-none transition-colors placeholder:text-[rgba(139,133,120,0.7)] focus:border-[rgba(233,185,73,0.45)]"
      />
      <div className="mt-2.5 flex items-center gap-2">
        <button
          onClick={() => setShown(true)}
          style={{ background: T.raise, color: T.body, border: `1px solid ${T.edge}` }}
          className="flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 font-['Tajawal'] text-[12.5px] font-bold transition-colors hover:bg-white/[0.05]"
        >
          <Eye size={12} /> أرِني نموذجاً
        </button>
        <span className="font-['Tajawal'] text-[11.5px]" style={{ color: T.muted }}>
          قارني جملتك بالنموذج
        </span>
      </div>
      {shown && item.model_en && (
        <div
          className="mt-3 rounded-xl px-3.5 py-3"
          style={{ background: GOOD_BG, border: `1px solid ${GOOD_EDGE}` }}
        >
          <p dir="ltr" className="text-left font-en text-[14.5px] leading-[1.8]" style={{ color: T.good }}>
            {item.model_en}
          </p>
          <Ar
            text={item.why_ar}
            className="mt-2 font-['Tajawal'] text-[12.5px] leading-[1.9]"
            style={{ color: T.muted }}
          />
        </div>
      )}
    </>
  )
}

// ── the sheet ──────────────────────────────────────────────────────────────

export default function StudySheet({ sheet }) {
  const g = useG()
  const [answers, setAnswers] = useState({})

  const teach = sheet?.teach || []
  const check = sheet?.check || []
  const phrases = sheet?.phrases || []
  const digest = sheet?.digest_ar || []
  const map = sheet?.map

  const answerOne = useCallback((id, payload) => {
    setAnswers((prev) => (prev[id] ? prev : { ...prev, [id]: payload }))
  }, [])

  const graded = check.filter((c) => c.type !== 'produce')
  const done = graded.filter((c) => answers[c.id]).length
  const right = graded.filter((c) => answers[c.id]?.ok).length

  if (!teach.length && !phrases.length && !digest.length) return null

  return (
    <section
      className="relative overflow-hidden rounded-2xl"
      style={{ background: T.ground, border: `1px solid ${T.edge}` }}
    >
      {/* The same warm crown the article card sits under, so the sheet reads as
          the next page of one document rather than a differently-lit box. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-44"
        style={{ background: `radial-gradient(120% 70% at 50% 0%, ${T.wash}, transparent 70%)` }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(to right, transparent, ${T.rule}, transparent)` }}
      />

      <div className="relative">
        {/* header */}
        <div
          className="flex flex-wrap items-center gap-3 px-5 py-4 sm:px-6"
          style={{ borderBottom: `1px solid ${T.edge}` }}
        >
          <span
            className="flex h-9 w-9 flex-none items-center justify-center rounded-xl"
            style={{ background: T.wash, border: `1px solid ${GOLD_EDGE}` }}
          >
            <GraduationCap size={17} style={{ color: T.gold }} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-['Tajawal'] text-[16px] font-bold" style={{ color: T.ink }}>
              ورقة المذاكرة
            </h3>
            <p className="font-['Tajawal'] text-[12.5px]" style={{ color: T.body }}>
              {g('ما الذي تأخذه من هذا النص', 'ما الذي تأخذينه من هذا النص')}
            </p>
          </div>
          {teach.length > 0 && (
            <span
              className="rounded-lg px-2.5 py-1 font-['Tajawal'] text-[11.5px]"
              style={{ background: T.wash, border: `1px solid ${GOLD_EDGE}`, color: T.gold }}
            >
              {teach.length} تراكيب من النص
            </span>
          )}
        </div>

        <div className="space-y-6 px-4 py-5 sm:px-6 sm:py-6">
          {/* 1 — digest */}
          {digest.length > 0 && (
            <div className="space-y-2.5">
              <h4 className="font-['Tajawal'] text-[13.5px] font-bold" style={{ color: T.ink }}>
                خلاصة النص
              </h4>
              <ul className="space-y-2">
                {digest.map((line, i) => (
                  <li key={i} dir="rtl" className="flex items-start gap-2.5">
                    <span
                      className="mt-[0.65em] h-1 w-1 flex-none rounded-full"
                      style={{ background: T.gold, opacity: 0.7 }}
                    />
                    <span className="font-['Tajawal'] text-[14px] leading-[1.95]" style={{ color: T.body }}>
                      {renderAr(line, `d${i}`)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 2 — the lesson */}
          {teach.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-baseline justify-between gap-3">
                <h4 className="font-['Tajawal'] text-[13.5px] font-bold" style={{ color: T.ink }}>
                  اللغة الموجودة في النص
                </h4>
                <span className="font-['Tajawal'] text-[11.5px]" style={{ color: T.muted }}>
                  هذه هي المادة التي تُذاكَر
                </span>
              </div>
              <div className="space-y-2.5">
                {teach.map((item, i) => (
                  <PatternCard key={item.id || i} item={item} index={i} defaultOpen={i === 0} />
                ))}
              </div>
            </div>
          )}

          {/* 3 — phrase bank */}
          {phrases.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-baseline justify-between gap-3">
                <h4 className="font-['Tajawal'] text-[13.5px] font-bold" style={{ color: T.ink }}>
                  عبارات جاهزة
                </h4>
                <span className="font-['Tajawal'] text-[11.5px]" style={{ color: T.muted }}>
                  تُنقل كما هي
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {phrases.map((p, i) => (
                  <div
                    key={i}
                    className="rounded-xl px-3.5 py-2.5"
                    style={{ background: T.raise, border: `1px solid ${T.edge}` }}
                  >
                    <p
                      dir="ltr"
                      className="text-left font-en text-[14.5px] font-medium"
                      style={{ color: T.ink }}
                    >
                      {p.en}
                    </p>
                    <p dir="rtl" className="mt-0.5 font-['Tajawal'] text-[12.5px]" style={{ color: T.muted }}>
                      {p.ar}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4 — text map */}
          {map?.nodes?.length > 0 && (
            <div className="space-y-2.5">
              <h4 className="font-['Tajawal'] text-[13.5px] font-bold" style={{ color: T.ink }}>
                {map.label_ar || 'خريطة النص'}
              </h4>
              <div
                dir="ltr"
                className="flex flex-wrap items-center gap-1.5 rounded-xl px-3.5 py-3"
                style={{ background: T.raise, border: `1px solid ${T.edge}` }}
              >
                {map.nodes.map((n, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    <span
                      className="rounded-lg px-2.5 py-1 font-en text-[13px]"
                      style={{ background: T.warm, border: `1px solid ${T.edge}`, color: T.ink }}
                    >
                      {n}
                    </span>
                    {i < map.nodes.length - 1 && (
                      <ArrowLeft size={12} className="rotate-180" style={{ color: T.gold, opacity: 0.6 }} />
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 5 — the check. Raised warm glass + a dashed rule: a worksheet laid on
              the page, told apart by MATERIAL rather than by a second accent hue. */}
          {check.length > 0 && (
            <div
              className="rounded-2xl p-4 sm:p-5"
              style={{ background: T.warm, border: `1px dashed ${GOLD_EDGE}` }}
            >
              <div className="mb-1.5 flex flex-wrap items-center gap-2.5">
                <Sparkles size={14} style={{ color: T.gold }} />
                <h4 className="font-['Tajawal'] text-[14.5px] font-bold" style={{ color: T.gold }}>
                  {g('أثبت أنك ذاكرت', 'أثبتي أنك ذاكرتِ')}
                </h4>
                {done > 0 && (
                  <span
                    className="mr-auto rounded-lg px-2.5 py-1 font-en text-[11.5px]"
                    style={{ background: T.wash, border: `1px solid ${GOLD_EDGE}`, color: T.gold }}
                  >
                    {right}/{graded.length}
                  </span>
                )}
              </div>
              <p dir="rtl" className="mb-4 font-['Tajawal'] text-[13px] leading-[1.95]" style={{ color: T.body }}>
                {g(
                  'أسئلة عن الشرح لا عن المقال — لا تُحل بالعودة إلى النص. هذه لك وحدك، ولا تُحتسب في درجتك.',
                  'أسئلة عن الشرح لا عن المقال — لا تُحل بالعودة إلى النص. هذه لكِ وحدكِ، ولا تُحتسب في درجتكِ.'
                )}
              </p>

              <div className="space-y-2.5">
                {check.map((item, i) => (
                  <div
                    key={item.id || i}
                    className="rounded-xl px-4 py-3.5"
                    style={{ background: T.ground, border: `1px solid ${T.edge}` }}
                  >
                    <div
                      className="mb-2 font-en text-[10.5px] tracking-[0.12em]"
                      style={{ color: T.muted }}
                    >
                      Q{i + 1}
                    </div>
                    {item.type === 'order' ? (
                      <OrderCheck
                        item={item}
                        answered={answers[item.id]}
                        onAnswer={(p) => answerOne(item.id, p)}
                      />
                    ) : item.type === 'produce' ? (
                      <ProduceCheck item={item} />
                    ) : (
                      <McqCheck
                        item={item}
                        answered={answers[item.id]}
                        onAnswer={(p) => answerOne(item.id, p)}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
