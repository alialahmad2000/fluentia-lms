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
function Ar({ text, className }) {
  const body = useMemo(() => isolateLatin(genderizeText(text) || '', 'ar'), [text])
  if (!text) return null
  return (
    <p dir="rtl" className={className}>
      {body}
    </p>
  )
}

// ── quoted line from the passage ───────────────────────────────────────────

function FromText({ text, highlights }) {
  const parts = useMemo(() => markParts(text, highlights), [text, highlights])
  return (
    <div className="rounded-xl border-r-2 border-amber-500/50 bg-slate-950/40 px-4 py-3">
      <div className="mb-1.5 flex items-center gap-1.5">
        <Quote size={11} className="text-amber-500/70" />
        <span className="font-['Tajawal'] text-[10px] tracking-wide text-slate-500">من النص</span>
      </div>
      <p dir="ltr" className="text-left font-en text-[15px] leading-[1.85] text-slate-200">
        {parts.map((p, i) =>
          p.hit ? (
            <mark
              key={i}
              className="rounded bg-amber-400/15 px-1 font-semibold text-amber-300 decoration-clone"
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
    <div className="overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-900/40">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-right transition-colors hover:bg-slate-800/25 sm:px-5"
      >
        <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-amber-500/15 font-en text-[12px] font-bold text-amber-400">
          {index + 1}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-['Tajawal'] text-[15px] font-bold text-white">
            {item.title_ar}
          </span>
          {item.title_en && (
            <span dir="ltr" className="block truncate text-right font-en text-[11.5px] text-slate-500">
              {item.title_en}
            </span>
          )}
        </span>
        <ChevronDown
          size={16}
          className={`flex-none text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
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
            <div className="space-y-3.5 border-t border-slate-800/60 px-4 pb-5 pt-4 sm:px-5">
              {item.from_text && <FromText text={item.from_text} highlights={item.highlights} />}

              <Ar
                text={item.explain_ar}
                className="font-['Tajawal'] text-[14.5px] leading-[2] text-slate-200"
              />

              {item.watch_out_ar && (
                <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-4 py-3">
                  <AlertTriangle size={14} className="mt-0.5 flex-none text-rose-400" />
                  <Ar
                    text={item.watch_out_ar}
                    className="font-['Tajawal'] text-[13.5px] leading-[1.95] text-rose-100/90"
                  />
                </div>
              )}

              {item.examples_en?.length > 0 && (
                <div className="space-y-1.5 border-r border-slate-700/60 pr-3.5">
                  {item.examples_en.map((ex, i) => (
                    <p key={i} dir="ltr" className="text-left font-en text-[14.5px] leading-[1.8] text-slate-300">
                      {ex}
                    </p>
                  ))}
                </div>
              )}

              {item.try_ar && (
                <div className="flex items-start gap-2.5 rounded-xl bg-slate-800/35 px-4 py-3">
                  <PenLine size={14} className="mt-0.5 flex-none text-sky-400" />
                  <Ar
                    text={item.try_ar}
                    className="font-['Tajawal'] text-[13.5px] leading-[1.95] text-slate-300"
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

function Verdict({ ok, why }) {
  return (
    <div
      className={`mt-3 flex items-start gap-2.5 rounded-xl px-3.5 py-2.5 ${
        ok ? 'bg-emerald-500/10 border border-emerald-500/25' : 'bg-amber-500/10 border border-amber-500/25'
      }`}
    >
      {ok ? (
        <CheckCircle2 size={14} className="mt-0.5 flex-none text-emerald-400" />
      ) : (
        <XCircle size={14} className="mt-0.5 flex-none text-amber-400" />
      )}
      <Ar text={why} className="font-['Tajawal'] text-[13px] leading-[1.9] text-slate-300" />
    </div>
  )
}

function McqCheck({ item, answered, onAnswer }) {
  const picked = answered?.value ?? null
  return (
    <>
      <p dir="ltr" className="text-left font-en text-[15.5px] leading-[1.9] text-slate-200">
        {item.stem_en}
      </p>
      <div dir="ltr" className="mt-3 flex flex-wrap gap-2">
        {(item.options || []).map((opt) => {
          const isPicked = picked === opt
          const isAnswer = norm(opt) === norm(item.answer)
          const style = picked
            ? isAnswer
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              : isPicked
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300 line-through'
                : 'border-slate-700/50 text-slate-500'
            : 'border-slate-700/60 text-slate-300 hover:border-sky-500/40 hover:text-white'
          return (
            <button
              key={opt}
              disabled={!!picked}
              onClick={() => onAnswer({ value: opt, ok: isAnswer })}
              className={`rounded-lg border px-3.5 py-2 font-en text-[14px] transition-colors ${style}`}
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
        className="mb-2.5 font-['Tajawal'] text-[13.5px] leading-[1.9] text-slate-400"
      />
      <div
        dir="ltr"
        className="min-h-[46px] rounded-xl border border-slate-700/50 bg-slate-950/40 px-3 py-2.5 text-left font-en text-[15px] text-slate-200"
      >
        {built.length ? built.join(' ') : <span className="text-slate-600">…</span>}
      </div>

      {!answered && (
        <>
          <div dir="ltr" className="mt-2.5 flex flex-wrap gap-2">
            {pool.map((t, i) => (
              <button
                key={`${t}-${i}`}
                onClick={() => setBuilt((b) => [...b, t])}
                className="rounded-lg border border-slate-700/60 px-3 py-1.5 font-en text-[13.5px] text-slate-300 transition-colors hover:border-sky-500/40 hover:text-white"
              >
                {t}
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              disabled={!built.length}
              onClick={submit}
              className="rounded-lg bg-sky-500/15 px-3.5 py-1.5 font-['Tajawal'] text-[12.5px] font-bold text-sky-300 transition-colors hover:bg-sky-500/25 disabled:opacity-40"
            >
              تحقّقي
            </button>
            {built.length > 0 && (
              <button
                onClick={() => setBuilt([])}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-['Tajawal'] text-[12.5px] text-slate-400 transition-colors hover:text-slate-200"
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
            <p dir="ltr" className="mt-2.5 text-left font-en text-[14px] text-emerald-300">
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
      <Ar text={item.prompt_ar} className="font-['Tajawal'] text-[14px] leading-[1.95] text-slate-200" />
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        dir="ltr"
        rows={2}
        placeholder="Write your own sentence…"
        className="mt-3 w-full resize-none rounded-xl border border-slate-700/50 bg-slate-950/40 px-3.5 py-3 text-left font-en text-[15px] leading-[1.7] text-slate-100 placeholder:text-slate-600 focus:border-sky-500/50 focus:outline-none"
      />
      <div className="mt-2.5 flex items-center gap-2">
        <button
          onClick={() => setShown(true)}
          className="flex items-center gap-1.5 rounded-lg bg-slate-800/60 px-3.5 py-1.5 font-['Tajawal'] text-[12.5px] font-bold text-slate-300 transition-colors hover:bg-slate-700/60"
        >
          <Eye size={12} /> أرِني نموذجاً
        </button>
        <span className="font-['Tajawal'] text-[11.5px] text-slate-500">قارني جملتك بالنموذج</span>
      </div>
      {shown && item.model_en && (
        <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-3.5 py-3">
          <p dir="ltr" className="text-left font-en text-[14.5px] leading-[1.8] text-emerald-200">
            {item.model_en}
          </p>
          <Ar
            text={item.why_ar}
            className="mt-2 font-['Tajawal'] text-[12.5px] leading-[1.9] text-slate-400"
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
      className="overflow-hidden rounded-2xl border border-amber-500/20"
      style={{
        background:
          'linear-gradient(160deg, rgba(251,191,36,0.055) 0%, rgba(15,23,42,0.5) 42%, rgba(15,23,42,0.5) 100%)',
      }}
    >
      {/* header */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-800/60 px-5 py-4 sm:px-6">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-amber-500/15">
          <GraduationCap size={17} className="text-amber-400" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-['Tajawal'] text-[16px] font-bold text-white">ورقة المذاكرة</h3>
          <p className="font-['Tajawal'] text-[12.5px] text-slate-300">
            {g('ما الذي تأخذه من هذا النص', 'ما الذي تأخذينه من هذا النص')}
          </p>
        </div>
        {teach.length > 0 && (
          <span className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 font-['Tajawal'] text-[11.5px] text-amber-300">
            {teach.length} تراكيب من النص
          </span>
        )}
      </div>

      <div className="space-y-6 px-4 py-5 sm:px-6 sm:py-6">
        {/* 1 — digest */}
        {digest.length > 0 && (
          <div className="space-y-2.5">
            <h4 className="font-['Tajawal'] text-[13.5px] font-bold text-slate-300">خلاصة النص</h4>
            <ul className="space-y-2">
              {digest.map((line, i) => (
                <li key={i} dir="rtl" className="flex items-start gap-2.5">
                  <span className="mt-[0.65em] h-1 w-1 flex-none rounded-full bg-amber-400/70" />
                  <span className="font-['Tajawal'] text-[14px] leading-[1.95] text-slate-300">
                    {isolateLatin(line, `d${i}`)}
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
              <h4 className="font-['Tajawal'] text-[13.5px] font-bold text-slate-300">اللغة الموجودة في النص</h4>
              <span className="font-['Tajawal'] text-[11.5px] text-slate-500">هذه هي المادة التي تُذاكَر</span>
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
              <h4 className="font-['Tajawal'] text-[13.5px] font-bold text-slate-300">عبارات جاهزة</h4>
              <span className="font-['Tajawal'] text-[11.5px] text-slate-500">تُنقل كما هي</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {phrases.map((p, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-slate-800/60 bg-slate-900/40 px-3.5 py-2.5"
                >
                  <p dir="ltr" className="text-left font-en text-[14.5px] font-medium text-slate-200">
                    {p.en}
                  </p>
                  <p dir="rtl" className="mt-0.5 font-['Tajawal'] text-[12.5px] text-slate-400">
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
            <h4 className="font-['Tajawal'] text-[13.5px] font-bold text-slate-300">
              {map.label_ar || 'خريطة النص'}
            </h4>
            <div dir="ltr" className="flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-900/40 px-3.5 py-3">
              {map.nodes.map((n, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  <span className="rounded-lg border border-slate-700/50 bg-slate-800/50 px-2.5 py-1 font-en text-[13px] text-slate-200">
                    {n}
                  </span>
                  {i < map.nodes.length - 1 && <ArrowLeft size={12} className="rotate-180 text-amber-500/60" />}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 5 — the check */}
        {check.length > 0 && (
          <div className="rounded-2xl border border-dashed border-sky-500/25 bg-sky-500/[0.04] p-4 sm:p-5">
            <div className="mb-1.5 flex flex-wrap items-center gap-2.5">
              <Sparkles size={14} className="text-sky-400" />
              <h4 className="font-['Tajawal'] text-[14.5px] font-bold text-sky-300">
                {g('أثبت أنك ذاكرت', 'أثبتي أنك ذاكرتِ')}
              </h4>
              {done > 0 && (
                <span className="mr-auto rounded-lg bg-slate-800/60 px-2.5 py-1 font-en text-[11.5px] text-slate-300">
                  {right}/{graded.length}
                </span>
              )}
            </div>
            <p dir="rtl" className="mb-4 font-['Tajawal'] text-[13px] leading-[1.95] text-slate-300">
              {g(
                'أسئلة عن الشرح لا عن المقال — لا تُحل بالعودة إلى النص. هذه لك وحدك، ولا تُحتسب في درجتك.',
                'أسئلة عن الشرح لا عن المقال — لا تُحل بالعودة إلى النص. هذه لكِ وحدكِ، ولا تُحتسب في درجتكِ.'
              )}
            </p>

            <div className="space-y-2.5">
              {check.map((item, i) => (
                <div
                  key={item.id || i}
                  className="rounded-xl border border-slate-800/60 bg-slate-900/50 px-4 py-3.5"
                >
                  <div className="mb-2 font-en text-[10.5px] tracking-[0.12em] text-slate-500">
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
    </section>
  )
}
