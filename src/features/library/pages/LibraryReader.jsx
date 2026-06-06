// The Reader — "The Midnight Reading Room". Warm, lamplit reading surface that
// contrasts the cool app. Three reading skins (toggle):
//   صفحات  (codex)  — book pages, page-turn; veil-lift opens a bottom tray
//   انسياب (reveal) — calm scroll; tap a sentence → Arabic unfolds inline
//   مساعدة (assist) — English paragraph with its Arabic stacked beneath (no tap)
import { useEffect, useMemo, useRef, useState } from 'react'
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

// Codex — CSS-column pagination (the ebook trick): content flows into columns
// of one page width that overflow horizontally; we translateX to "turn pages".
function CodexProse({ paragraphs, chapter, onNext, onPrev, hasNext, hasPrev }) {
  const vpRef = useRef(null)
  const pgRef = useRef(null)
  const [pageW, setPageW] = useState(0)
  const [pageCount, setPageCount] = useState(1)
  const [page, setPage] = useState(0)
  const [tray, setTray] = useState(null)

  useEffect(() => {
    const vp = vpRef.current
    if (!vp) return
    const set = () => setPageW(vp.clientWidth)
    set()
    const ro = new ResizeObserver(set)
    ro.observe(vp)
    return () => ro.disconnect()
  }, [])

  // measure page count once the column layout (and fonts) have settled
  useEffect(() => {
    if (!pageW) return
    let raf
    const measure = () => {
      const pg = pgRef.current
      if (!pg) return
      const total = Math.max(1, Math.round(pg.scrollWidth / pageW))
      setPageCount(total)
      setPage((p) => Math.min(p, total - 1))
    }
    raf = requestAnimationFrame(() => requestAnimationFrame(measure))
    const t = setTimeout(measure, 420)
    return () => { cancelAnimationFrame(raf); clearTimeout(t) }
  }, [pageW, paragraphs, chapter?.id])

  useEffect(() => { setPage(0); setTray(null) }, [chapter?.id])

  const go = (dir) => {
    setTray(null)
    if (dir > 0) { if (page < pageCount - 1) setPage(page + 1); else if (hasNext) onNext() }
    else { if (page > 0) setPage(page - 1); else if (hasPrev) onPrev() }
  }

  return (
    <div className="lib-codex">
      <div className="lib-codex-viewport" ref={vpRef}>
        <div
          className="lib-codex-pages"
          ref={pgRef}
          style={{ columnWidth: pageW ? `${pageW}px` : '100%', transform: `translateX(${-page * pageW}px)` }}
        >
          <div className="lib-codex-chhead">
            <div className="ch-num">{`Chapter ${chapter?.chapter_number}`}</div>
            <div className="ch-title">{chapter?.title_en || chapter?.title_ar}</div>
          </div>
          {paragraphs.map((p) => (
            <p key={p.id} className="lib-codex-p">
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
        </div>
      </div>
      <button className="lib-codex-edge left" onClick={() => go(-1)} aria-label="الصفحة السابقة" />
      <button className="lib-codex-edge right" onClick={() => go(1)} aria-label="الصفحة التالية" />
      <div className="lib-codex-foot">
        <button onClick={() => go(-1)} disabled={page === 0 && !hasPrev}>‹</button>
        <span className="pg">{page + 1} / {pageCount}</span>
        <button onClick={() => go(1)}>{page >= pageCount - 1 && !hasNext ? '✦' : '›'}</button>
      </div>
      <AnimatePresence>
        {tray && (
          <motion.div
            className="lib-codex-tray"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
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
          : hasContent ? <CodexProse paragraphs={paragraphs} chapter={current} onNext={onNext} onPrev={onPrev} hasNext={!!next} hasPrev={!!prev} />
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
