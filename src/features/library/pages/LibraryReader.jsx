// The Reader — "The Midnight Reading Room". Warm, lamplit reading surface that
// contrasts the cool app. Three reading skins (toggle):
//   صفحات  (codex)  — book pages, page-turn; veil-lift opens a bottom tray
//   انسياب (reveal) — calm scroll; tap a sentence → Arabic unfolds inline
//   مساعدة (assist) — English paragraph with its Arabic stacked beneath (no tap)
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, Sparkles } from 'lucide-react'
import SentenceReveal from '../components/SentenceReveal'
import { useBook, useChapterContent } from '../hooks/useLibrary'
import '../library.css'

function RevealProse({ paragraphs }) {
  return (
    <div className="lib-prose">
      {paragraphs.map((p) => (
        <p key={p.id}>
          {p.sentences.map((s) => (
            <SentenceReveal key={s.id} en={s.text_en} ar={s.text_ar} isDialogue={s.is_dialogue} />
          ))}
        </p>
      ))}
    </div>
  )
}

function AssistProse({ paragraphs }) {
  return (
    <div>
      <div className="lib-assist-badge">وضع المساعدة — لا يُحتسب ضمن التقدّم</div>
      {paragraphs.map((p) => (
        <div key={p.id} className="lib-assist-para">
          <p className="lib-assist-en" dir="ltr">{p.sentences.map((s) => s.text_en).join(' ')}</p>
          <p className="lib-assist-ar" dir="rtl">{p.sentences.map((s) => s.text_ar).filter(Boolean).join(' ')}</p>
        </div>
      ))}
    </div>
  )
}

// Codex — a real open book. CSS-column pagination + a hidden single-column
// measurer for a reliable page count; TWO facing pages on wide screens; a 3D
// page-curl on turn (next drags right→left, prev drags left→right); gilt folios.
function CodexProse({ paragraphs, chapter, onNext, onPrev, hasNext, hasPrev, bookTitle }) {
  const vpRef = useRef(null)
  const pgRef = useRef(null)
  const measRef = useRef(null)
  const flipId = useRef(0)
  const [spread, setSpread] = useState(0)
  const [m, setM] = useState({ colW: 0, gap: 0, two: false, spreads: 1, pages: 1 })
  const [tray, setTray] = useState(null)
  const [flip, setFlip] = useState(null) // { dir, id }

  const measure = useCallback(() => {
    const vp = vpRef.current
    const pg = pgRef.current
    const meas = measRef.current
    if (!vp || !pg || !meas) return
    const w = vp.clientWidth
    if (!w) return
    const two = w >= 600                       // open-book spread on wide screens, single page on phones
    const gap = two ? 56 : 0                    // the spine gutter
    const colW = two ? (w - gap) / 2 : w
    pg.style.columnWidth = `${colW}px`
    pg.style.columnGap = `${gap}px`
    meas.style.width = `${colW}px`
    // pages = how many page-heights the content fills (measured in one column)
    const pageH = pg.clientHeight || 1
    const naturalH = meas.scrollHeight || pageH
    const pages = Math.max(1, Math.ceil(naturalH / pageH))
    const spreads = Math.max(1, Math.ceil(pages / (two ? 2 : 1)))
    setM({ colW, gap, two, spreads, pages })
    setSpread((s) => Math.min(s, spreads - 1))
  }, [])

  useEffect(() => {
    measure()
    const ro = new ResizeObserver(() => measure())
    if (vpRef.current) ro.observe(vpRef.current)
    const t1 = setTimeout(measure, 250)
    const t2 = setTimeout(measure, 700)        // re-measure after the serif font loads
    return () => { ro.disconnect(); clearTimeout(t1); clearTimeout(t2) }
  }, [measure, paragraphs, chapter?.id])

  useEffect(() => { setSpread(0); setTray(null); setFlip(null) }, [chapter?.id])

  const per = m.two ? 2 : 1
  const stride = per * (m.colW + m.gap)
  const turn = (dir) => {
    setTray(null)
    if (dir > 0) {
      if (spread < m.spreads - 1) { flipId.current += 1; setFlip({ dir: 1, id: flipId.current }); setSpread(spread + 1) }
      else if (hasNext) onNext()
    } else {
      if (spread > 0) { flipId.current += 1; setFlip({ dir: -1, id: flipId.current }); setSpread(spread - 1) }
      else if (hasPrev) onPrev()
    }
  }

  const leftNum = spread * per + 1
  const rightNum = m.two ? spread * 2 + 2 : null
  const content = (
    <>
      <div className="lib-codex-chhead">
        <div className="ch-num">{`Chapter ${chapter?.chapter_number}`}</div>
        <div className="ch-title">{chapter?.title_en || chapter?.title_ar}</div>
      </div>
      {paragraphs.map((p, i) => (
        <p key={p.id} className={`lib-codex-p${i === 0 ? ' first' : ''}`}>
          {p.sentences.map((s) => (
            <span
              key={s.id}
              className="lib-sentence"
              data-dialogue={s.is_dialogue || undefined}
              onClick={() => setTray({ en: s.text_en, ar: s.text_ar })}
            >
              {s.text_en}{' '}
            </span>
          ))}
        </p>
      ))}
    </>
  )

  return (
    <div className="lib-codex">
      <div className="lib-book">
        <div className="lib-book-head">{bookTitle}</div>
        <div className="lib-book-spread" ref={vpRef}>
          <div className="lib-codex-pages" ref={pgRef} style={{ transform: `translateX(${-spread * stride}px)` }}>
            {content}
          </div>
          <div className="lib-codex-measure" ref={measRef} aria-hidden="true">{content}</div>
          {leftNum <= m.pages && <span className="lib-folio left">{leftNum}</span>}
          {rightNum && rightNum <= m.pages && <span className="lib-folio right">{rightNum}</span>}
          <AnimatePresence>
            {flip && (
              <motion.div
                key={flip.id}
                className={`lib-leaf ${flip.dir > 0 ? 'next' : 'prev'} ${m.two ? '' : 'single'}`}
                initial={{ rotateY: 0 }}
                animate={{ rotateY: flip.dir > 0 ? -174 : 174 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.56, ease: [0.32, 0.04, 0.2, 1] }}
                onAnimationComplete={() => setFlip(null)}
              />
            )}
          </AnimatePresence>
          <button className="lib-codex-edge left" onClick={() => turn(-1)} aria-label="الصفحة السابقة" />
          <button className="lib-codex-edge right" onClick={() => turn(1)} aria-label="الصفحة التالية" />
        </div>
        <div className="lib-codex-foot">
          <button onClick={() => turn(-1)} disabled={spread === 0 && !hasPrev}>‹</button>
          <span className="pg">{m.two ? `${leftNum}–${Math.min(rightNum || leftNum, m.pages)}` : leftNum} / {m.pages}</span>
          <button onClick={() => turn(1)}>{spread >= m.spreads - 1 && !hasNext ? '✦' : '›'}</button>
        </div>
      </div>
      <AnimatePresence>
        {tray && (
          <motion.div
            className="lib-codex-tray"
            initial={{ x: '-50%', y: 44, opacity: 0 }}
            animate={{ x: '-50%', y: 0, opacity: 1 }}
            exit={{ x: '-50%', y: 44, opacity: 0 }}
            transition={{ duration: 0.26, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <div className="en" dir="ltr">{tray.en}</div>
            {tray.ar && <div className="ar" dir="rtl">{tray.ar}</div>}
            <button className="close" onClick={() => setTray(null)}>إغلاق</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function LibraryReader() {
  const { bookId, chapterId } = useParams()
  const navigate = useNavigate()
  const { data: bookData } = useBook(bookId)
  const { data: paragraphs, isLoading } = useChapterContent(chapterId)
  const [mode, setMode] = useState('reveal')
  const [finished, setFinished] = useState(false)
  const [prog, setProg] = useState(0)

  const chapters = bookData?.chapters || []
  const book = bookData?.book
  const idx = chapters.findIndex((c) => c.id === chapterId)
  const current = idx >= 0 ? chapters[idx] : null
  const prev = idx > 0 ? chapters[idx - 1] : null
  const next = idx >= 0 && idx < chapters.length - 1 ? chapters[idx + 1] : null

  useEffect(() => {
    if (mode === 'codex') return
    let mounted = true
    const onScroll = () => {
      if (!mounted) return
      const doc = document.documentElement
      const max = doc.scrollHeight - window.innerHeight
      setProg(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => { mounted = false; window.removeEventListener('scroll', onScroll) }
  }, [chapterId, mode, isLoading])

  useEffect(() => { setFinished(false); window.scrollTo(0, 0) }, [chapterId])

  const goChapter = (c) => navigate(`/library/${bookId}/read/${c.id}`)
  const onNext = () => { if (next) goChapter(next); else setFinished(true) }
  const onPrev = () => { if (prev) goChapter(prev) }
  const hasContent = useMemo(() => Array.isArray(paragraphs) && paragraphs.length > 0, [paragraphs])

  return (
    <div className="lib-reader-stage">
      <div className="lib-reader-bar">
        <button className="lib-back" onClick={() => navigate(`/library/${bookId}`)}>
          <ChevronRight size={16} /> الرواية
        </button>
        <div className="lib-bar-title">
          <div className="bt">{book?.title_ar || book?.title_en || ''}</div>
          {current && <div className="bc">{current.title_en || `Chapter ${current.chapter_number}`}</div>}
        </div>
        <div className="lib-mode">
          <button data-active={mode === 'codex'} onClick={() => setMode('codex')}>صفحات</button>
          <button data-active={mode === 'reveal'} onClick={() => setMode('reveal')}>انسياب</button>
          <button data-active={mode === 'assist'} onClick={() => setMode('assist')}>مساعدة</button>
        </div>
      </div>
      {mode !== 'codex' && <div className="lib-progress"><i style={{ width: `${Math.round(prog * 100)}%` }} /></div>}

      {finished ? (
        <div className="lib-page">
          <div className="lib-seal">
            <div className="ring"><Sparkles size={34} /></div>
            <h3>{next ? 'إلى الفصل التالي' : 'تمّت الرواية'}</h3>
            <p>{next ? '' : `أتممت «${book?.title_ar || book?.title_en}» — رواية كاملة في رصيدك.`}</p>
          </div>
        </div>
      ) : mode === 'codex' ? (
        isLoading ? <div className="lib-page"><div className="lib-skel" style={{ height: 320 }} /></div>
          : hasContent ? <CodexProse paragraphs={paragraphs} chapter={current} onNext={onNext} onPrev={onPrev} hasNext={!!next} hasPrev={!!prev} bookTitle={book?.title_en || book?.title_ar} />
            : <div className="lib-page"><div className="lib-empty">هذا الفصل قيد الإعداد.</div></div>
      ) : (
        <div className="lib-page">
          {current && (
            <div className="lib-chapter-head">
              <div className="ch-num">{current.title_ar ? `الفصل ${current.chapter_number}` : `Chapter ${current.chapter_number}`}</div>
              <div className="ch-title">{current.title_en || current.title_ar}</div>
              <div className="ch-rule" />
            </div>
          )}
          {isLoading && <div className="lib-skel" style={{ height: 320 }} />}
          {!isLoading && !hasContent && <div className="lib-empty">هذا الفصل قيد الإعداد.</div>}
          {!isLoading && hasContent && (mode === 'reveal'
            ? <RevealProse paragraphs={paragraphs} />
            : <AssistProse paragraphs={paragraphs} />)}
          {!isLoading && hasContent && (
            <div className="lib-foot">
              <button disabled={!prev} onClick={onPrev}>الفصل السابق</button>
              <button className="lib-finish" onClick={onNext}>{next ? 'الفصل التالي' : 'أنهيت الرواية ✦'}</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
