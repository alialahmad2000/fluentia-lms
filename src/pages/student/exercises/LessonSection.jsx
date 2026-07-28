import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, ChevronDown, Lightbulb, AlertTriangle, Check, X } from 'lucide-react'

/**
 * LessonSection — the "teach" half of a targeted worksheet.
 *
 * Renders `exercise.content.learn` above the questions so a worksheet can explain
 * a point before testing it, instead of dropping the student straight into a quiz.
 * Bilingual by design: every rule carries Arabic explanation + English examples,
 * because these students think the rule in Arabic and produce it in English.
 *
 * Shape (all fields optional — unknown block types are skipped, never crash):
 *   learn: {
 *     intro_ar, intro_en,
 *     blocks: [
 *       { type:'rule',     title_ar, title_en, body_ar, examples:[{en, ar}] }
 *       { type:'contrast', title_ar, body_ar, cols:[{k, label_ar, note_ar, examples:[{en, ar}]}] }
 *       { type:'chunks',   title_ar, body_ar, items:[{en, ar}] }
 *       { type:'mistakes', title_ar, body_ar, items:[{wrong, right, note_ar}] }
 *     ]
 *   }
 *
 * `hl` on any example marks the substring to highlight (defaults to the sheet's focus word).
 */

const AR = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
const toAr = (n) => String(n ?? 0).replace(/\d/g, (d) => AR[+d])

// Highlight every occurrence of `hl` inside an English example.
function Example({ en, ar, hl }) {
  let body = en
  if (hl) {
    const parts = String(en).split(new RegExp(`(\\b${hl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b)`, 'gi'))
    body = parts.map((p, i) =>
      p.toLowerCase() === hl.toLowerCase() ? <mark key={i} className="ls-hl">{p}</mark> : <span key={i}>{p}</span>,
    )
  }
  return (
    <li className="ls-ex">
      <span className="ls-ex__en" dir="ltr">{body}</span>
      {ar && <span className="ls-ex__ar">{ar}</span>}
    </li>
  )
}

function RuleBlock({ block, n, hl }) {
  return (
    <article className="ls-card">
      <header className="ls-card__hd">
        <span className="ls-n" dir="ltr">{toAr(n)}</span>
        <div>
          <h4 className="ls-card__t">{block.title_ar}</h4>
          {block.title_en && <div className="ls-card__ten" dir="ltr">{block.title_en}</div>}
        </div>
      </header>
      {block.body_ar && <p className="ls-body">{block.body_ar}</p>}
      {Array.isArray(block.examples) && block.examples.length > 0 && (
        <ul className="ls-exs">
          {block.examples.map((ex, i) => <Example key={i} {...ex} hl={ex.hl || hl} />)}
        </ul>
      )}
    </article>
  )
}

function ContrastBlock({ block, n, hl }) {
  return (
    <article className="ls-card ls-card--contrast">
      <header className="ls-card__hd">
        <span className="ls-n" dir="ltr">{toAr(n)}</span>
        <div>
          <h4 className="ls-card__t">{block.title_ar}</h4>
          {block.title_en && <div className="ls-card__ten" dir="ltr">{block.title_en}</div>}
        </div>
      </header>
      {block.body_ar && <p className="ls-body">{block.body_ar}</p>}
      <div className="ls-cols">
        {(block.cols || []).map((c, i) => (
          <div className="ls-col" key={i}>
            <div className="ls-col__k" dir="ltr">{c.k}</div>
            <div className="ls-col__lab">{c.label_ar}</div>
            {c.note_ar && <p className="ls-col__note">{c.note_ar}</p>}
            <ul className="ls-exs ls-exs--tight">
              {(c.examples || []).map((ex, j) => <Example key={j} {...ex} hl={ex.hl || c.k || hl} />)}
            </ul>
          </div>
        ))}
      </div>
    </article>
  )
}

function ChunksBlock({ block, n, hl }) {
  return (
    <article className="ls-card">
      <header className="ls-card__hd">
        <span className="ls-n ls-n--teal" dir="ltr">{toAr(n)}</span>
        <div>
          <h4 className="ls-card__t">{block.title_ar}</h4>
          {block.title_en && <div className="ls-card__ten" dir="ltr">{block.title_en}</div>}
        </div>
      </header>
      {block.body_ar && <p className="ls-body">{block.body_ar}</p>}
      <ul className="ls-chunks">
        {(block.items || []).map((it, i) => (
          <li key={i} className="ls-chunk">
            <span className="ls-chunk__en" dir="ltr">
              {hl
                ? String(it.en).split(new RegExp(`(\\b${hl}\\b)`, 'gi')).map((p, k) =>
                    p.toLowerCase() === String(hl).toLowerCase() ? <mark key={k} className="ls-hl">{p}</mark> : <span key={k}>{p}</span>)
                : it.en}
            </span>
            <span className="ls-chunk__ar">{it.ar}</span>
          </li>
        ))}
      </ul>
    </article>
  )
}

function MistakesBlock({ block, n }) {
  return (
    <article className="ls-card ls-card--warn">
      <header className="ls-card__hd">
        <span className="ls-n ls-n--rose" dir="ltr"><AlertTriangle size={14} /></span>
        <div>
          <h4 className="ls-card__t">{block.title_ar}</h4>
          {block.title_en && <div className="ls-card__ten" dir="ltr">{block.title_en}</div>}
        </div>
      </header>
      {block.body_ar && <p className="ls-body">{block.body_ar}</p>}
      <ul className="ls-mis">
        {(block.items || []).map((it, i) => (
          <li key={i} className="ls-mis__row">
            <div className="ls-mis__pair">
              <span className="ls-mis__bad" dir="ltr"><X size={13} /> {it.wrong}</span>
              <span className="ls-mis__good" dir="ltr"><Check size={13} /> {it.right}</span>
            </div>
            {it.note_ar && <p className="ls-mis__note">{it.note_ar}</p>}
          </li>
        ))}
      </ul>
    </article>
  )
}

const BLOCKS = { rule: RuleBlock, contrast: ContrastBlock, chunks: ChunksBlock, mistakes: MistakesBlock }

export default function LessonSection({ learn, g }) {
  const [open, setOpen] = useState(true)
  if (!learn) return null
  const blocks = (learn.blocks || []).filter((b) => BLOCKS[b?.type])
  if (blocks.length === 0 && !learn.intro_ar) return null
  const hl = learn.highlight

  return (
    <section className="ls-root">
      <button className="ls-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="ls-toggle__ic"><BookOpen size={17} /></span>
        <span className="ls-toggle__txt">
          <b>الدرس أولًا — اقرأ الشرح قبل الأسئلة</b>
          <em>Learn it first · {toAr(blocks.length)} قواعد</em>
        </span>
        <ChevronDown size={18} className={`ls-toggle__chev${open ? ' up' : ''}`} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="lesson"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="ls-inner">
              {(learn.intro_ar || learn.intro_en) && (
                <div className="ls-intro">
                  <span className="ls-intro__ic"><Lightbulb size={18} /></span>
                  <div>
                    {learn.intro_ar && <p className="ls-intro__ar">{learn.intro_ar}</p>}
                    {learn.intro_en && <p className="ls-intro__en" dir="ltr">{learn.intro_en}</p>}
                  </div>
                </div>
              )}
              {blocks.map((b, i) => {
                const C = BLOCKS[b.type]
                return <C key={i} block={b} n={i + 1} hl={hl} g={g} />
              })}
              {learn.closing_ar && <p className="ls-closing">{learn.closing_ar}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
