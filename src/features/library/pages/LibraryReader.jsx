// The Reader — "The Midnight Reading Room". Three skins:
//   صفحات  (codex)  — book pages, page-turn; veil-lift opens a bottom tray
//   انسياب (reveal) — calm scroll; tap a sentence → Arabic unfolds inline
//   مساعدة (assist) — English paragraph with its Arabic stacked beneath
// Original illustrations (plates) are interleaved at authored positions.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, Sparkles, Settings2 } from 'lucide-react'
import SentenceReveal, { renderEN } from '../components/SentenceReveal'
import { useBook, useChapterContent, saveProgress, completeChapter, saveWord } from '../hooks/useLibrary'
import { useAuthProfileId } from '../../../stores/authStore'
import '../library.css'

const PAPERS = ['ivory', 'cream', 'linen', 'parchment', 'sepia', 'night']
const AMB_BASE = 'https://nmjexpuycmqcxuxljier.supabase.co/storage/v1/object/public/library-audio/ambience'
const AMBIENCE = { mystery: `${AMB_BASE}/sea.mp3`, grief: `${AMB_BASE}/rain.mp3` }

// interleave authored illustrations (after:-1 = chapter opener) into the paragraph flow
function buildBlocks(paragraphs, illustrations) {
  const list = Array.isArray(paragraphs) ? paragraphs : []
  const ill = Array.isArray(illustrations) ? illustrations : []
  const after = new Map()
  ill.forEach((x) => { const n = Number(x.after); if (n >= 0) { const a = after.get(n) || []; a.push(x); after.set(n, a) } })
  const blocks = []
  ill.filter((x) => Number(x.after) < 0).forEach((img) => blocks.push({ t: 'img', img }))
  list.forEach((p) => {
    blocks.push({ t: 'p', p })
    ;(after.get(p.index) || []).forEach((img) => blocks.push({ t: 'img', img }))
  })
  return blocks
}

function Plate({ img, variant }) {
  return (
    <figure className={variant === 'codex' ? 'lib-codex-plate' : 'lib-plate'}>
      <img src={img.url} alt={img.alt || ''} loading="lazy" />
      {img.alt && <figcaption>{img.alt}</figcaption>}
    </figure>
  )
}

function RevealProse({ blocks, help }) {
  return (
    <div className="lib-prose">
      {blocks.map((b, i) => b.t === 'img'
        ? <Plate key={`i${i}`} img={b.img} variant="scroll" />
        : (
          <p key={b.p.id}>
            {b.p.sentences.map((s) => <SentenceReveal key={s.id} en={s.text_en} ar={s.text_ar} isDialogue={s.is_dialogue} help={help} />)}
          </p>
        ))}
    </div>
  )
}

function AssistProse({ blocks }) {
  return (
    <div>
      <div className="lib-assist-badge">وضع المساعدة — لا يُحتسب ضمن التقدّم</div>
      {blocks.map((b, i) => b.t === 'img'
        ? <Plate key={`i${i}`} img={b.img} variant="scroll" />
        : (
          <div key={b.p.id} className="lib-assist-para">
            <p className="lib-assist-en" dir="ltr">{b.p.sentences.map((s) => s.text_en).join(' ')}</p>
            <p className="lib-assist-ar" dir="rtl">{b.p.sentences.map((s) => s.text_ar).filter(Boolean).join(' ')}</p>
          </div>
        ))}
    </div>
  )
}

// Codex — open book; reliable page count via a hidden single-column measurer;
// TWO facing pages on wide screens; a slow page-curl; gilt folios.
function CodexProse({ blocks, chapter, onNext, onPrev, hasNext, hasPrev, bookTitle, paper, onTray, help }) {
  const vpRef = useRef(null)
  const pgRef = useRef(null)
  const measRef = useRef(null)
  const flipId = useRef(0)
  const [spread, setSpread] = useState(0)
  const [m, setM] = useState({ colW: 0, gap: 0, two: false, spreads: 1, pages: 1 })
  const [flip, setFlip] = useState(null)

  const measure = useCallback(() => {
    const vp = vpRef.current, pg = pgRef.current, meas = measRef.current
    if (!vp || !pg || !meas) return
    const w = vp.clientWidth
    if (!w) return
    const two = w >= 600
    const gap = two ? 56 : 0
    const colW = two ? (w - gap) / 2 : w
    pg.style.columnWidth = `${colW}px`
    pg.style.columnGap = `${gap}px`
    meas.style.width = `${colW}px`
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
    const t2 = setTimeout(measure, 750)
    return () => { ro.disconnect(); clearTimeout(t1); clearTimeout(t2) }
  }, [measure, blocks, chapter?.id])

  useEffect(() => { setSpread(0); setFlip(null) }, [chapter?.id])

  const per = m.two ? 2 : 1
  const stride = per * (m.colW + m.gap)
  const turn = (dir) => {
    onTray(null)
    if (dir > 0) {
      if (spread < m.spreads - 1) { flipId.current += 1; setFlip({ dir: 1, id: flipId.current }); setSpread(spread + 1) }
      else if (hasNext) onNext()
    } else {
      if (spread > 0) { flipId.current += 1; setFlip({ dir: -1, id: flipId.current }); setSpread(spread - 1) }
      else if (hasPrev) onPrev()
    }
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); turn(1) }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); turn(-1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const leftNum = spread * per + 1
  const rightNum = m.two ? spread * 2 + 2 : null
  const content = (
    <>
      <div className="lib-codex-chhead">
        <div className="ch-num">{`Chapter ${chapter?.chapter_number}`}</div>
        <div className="ch-title">{chapter?.title_en || chapter?.title_ar}</div>
        <div className="lib-ch-orn"><span /></div>
      </div>
      {blocks.map((b, i) => b.t === 'img'
        ? <Plate key={`i${i}`} img={b.img} variant="codex" />
        : (
          <p key={b.p.id} className={`lib-codex-p${i === 0 ? ' first' : ''}`}>
            {b.p.sentences.map((s) => help === 'off'
              ? <span key={s.id} className="lib-sentence" data-static="" data-dialogue={s.is_dialogue || undefined}>{s.text_en}{' '}</span>
              : (
                <span key={s.id} className="lib-sentence" data-dialogue={s.is_dialogue || undefined}
                  onClick={() => onTray({ en: s.text_en, ar: s.text_ar })}>{renderEN(s.text_en, help)}{' '}</span>
              ))}
          </p>
        ))}
    </>
  )

  return (
    <div className="lib-codex">
      <div className="lib-book" data-paper={paper}>
        <div className="lib-book-head">{bookTitle}</div>
        <div className="lib-book-spread" ref={vpRef}>
          <div className="lib-codex-pages" lang="en" ref={pgRef} style={{ transform: `translateX(${-spread * stride}px)` }}>
            {content}
          </div>
          <div className="lib-codex-measure" lang="en" ref={measRef} aria-hidden="true">{content}</div>
          {leftNum <= m.pages && <span className="lib-folio left">{leftNum}</span>}
          {rightNum && rightNum <= m.pages && <span className="lib-folio right">{rightNum}</span>}
          <AnimatePresence>
            {flip && (
              <motion.div
                key={flip.id}
                className={`lib-leaf ${flip.dir > 0 ? 'next' : 'prev'} ${m.two ? '' : 'single'}`}
                initial={{ rotateY: 0 }}
                animate={{ rotateY: flip.dir > 0 ? -176 : 176 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.4, ease: [0.33, 0.0, 0.15, 1] }}
                onAnimationComplete={() => setFlip(null)}
              />
            )}
          </AnimatePresence>
        </div>
        <div className="lib-codex-foot">
          <button onClick={() => turn(-1)} disabled={spread === 0 && !hasPrev}>‹</button>
          <span className="pg">{m.two ? `${leftNum}–${Math.min(rightNum || leftNum, m.pages)}` : leftNum} / {m.pages}</span>
          <button onClick={() => turn(1)}>{spread >= m.spreads - 1 && !hasNext ? '✦' : '›'}</button>
        </div>
      </div>
    </div>
  )
}

export default function LibraryReader() {
  const { bookId, chapterId } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const myId = useAuthProfileId()
  const { data: bookData } = useBook(bookId)
  const { data: paragraphs, isLoading } = useChapterContent(chapterId)
  const [mode, setModeRaw] = useState(() => {
    try { return localStorage.getItem('fluentia:lib:mode') || 'codex' } catch { return 'codex' }
  })
  const setMode = (mn) => { setModeRaw(mn); try { localStorage.setItem('fluentia:lib:mode', mn) } catch { /* ignore */ } }
  const [finished, setFinished] = useState(false)
  const [prog, setProg] = useState(0)
  const [tray, setTray] = useState(null)
  const [paper, setPaper] = useState(() => {
    try { return localStorage.getItem('fluentia:lib:paper') || 'ivory' } catch { return 'ivory' }
  })
  const [fontScale, setFontScale] = useState(() => {
    try { return parseFloat(localStorage.getItem('fluentia:lib:font')) || 1 } catch { return 1 }
  })
  const [candle, setCandle] = useState(() => {
    try { return localStorage.getItem('fluentia:lib:candle') === '1' } catch { return false }
  })
  const [help, setHelp] = useState(() => {
    try { return localStorage.getItem('fluentia:lib:help') || 'full' } catch { return 'full' }
  })
  const [ambient, setAmbient] = useState(() => {
    try { return localStorage.getItem('fluentia:lib:ambient') === '1' } catch { return false }
  })
  const ambientRef = useRef(null)
  const [savedWords, setSavedWords] = useState(() => new Set())
  const [showSettings, setShowSettings] = useState(false)

  const chapters = bookData?.chapters || []
  const book = bookData?.book
  const idx = chapters.findIndex((c) => c.id === chapterId)
  const current = idx >= 0 ? chapters[idx] : null
  const prev = idx > 0 ? chapters[idx - 1] : null
  const next = idx >= 0 && idx < chapters.length - 1 ? chapters[idx + 1] : null
  const ambienceUrl = AMBIENCE[book?.theme] || null

  const blocks = useMemo(() => buildBlocks(paragraphs, current?.illustrations), [paragraphs, current])

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

  useEffect(() => { setFinished(false); setTray(null); window.scrollTo(0, 0) }, [chapterId])

  // remember where the reader is (powers "continue reading")
  useEffect(() => {
    if (myId && bookId && chapterId) saveProgress(myId, bookId, chapterId, mode)
  }, [myId, bookId, chapterId, mode])

  // ambient soundscape — play/pause the theme's loop
  useEffect(() => {
    const el = ambientRef.current
    if (!el) return
    if (ambient && ambienceUrl) { el.volume = 0.28; el.play().catch(() => {}) } else { el.pause() }
  }, [ambient, ambienceUrl])
  useEffect(() => () => { const el = ambientRef.current; if (el) { el.pause() } }, [])

  const changePaper = (p) => { setPaper(p); try { localStorage.setItem('fluentia:lib:paper', p) } catch { /* ignore */ } }
  const bumpFont = (d) => {
    const v = Math.min(1.35, Math.max(0.85, Math.round((fontScale + d) * 100) / 100))
    setFontScale(v); try { localStorage.setItem('fluentia:lib:font', String(v)) } catch { /* ignore */ }
  }
  const toggleCandle = () => {
    const v = !candle; setCandle(v); try { localStorage.setItem('fluentia:lib:candle', v ? '1' : '0') } catch { /* ignore */ }
  }
  const changeHelp = (h) => { setHelp(h); setTray(null); try { localStorage.setItem('fluentia:lib:help', h) } catch { /* ignore */ } }
  const cleanWord = (w) => String(w || '').replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, '').toLowerCase()
  const onSaveWord = (raw, context) => {
    const clean = cleanWord(raw)
    if (clean.length < 2) return
    try { const u = new SpeechSynthesisUtterance(clean); u.lang = 'en-US'; u.rate = 0.92; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u) } catch { /* ignore */ }
    if (savedWords.has(clean)) return
    setSavedWords((s) => { const n = new Set(s); n.add(clean); return n })
    if (myId && current) saveWord(myId, bookId, current.id, clean, context)
  }
  const toggleAmbient = () => {
    const v = !ambient; setAmbient(v)
    try { localStorage.setItem('fluentia:lib:ambient', v ? '1' : '0') } catch { /* ignore */ }
    const el = ambientRef.current
    if (el) { if (v && ambienceUrl) { el.volume = 0.28; el.play().catch(() => {}) } else { el.pause() } }
  }
  const goChapter = (c) => navigate(`/library/${bookId}/read/${c.id}`)
  const onNext = () => {
    if (myId && current) {
      completeChapter(myId, bookId, current.id, mode, !next).then(() => qc.invalidateQueries({ queryKey: ['library-my-progress'] }))
    }
    if (next) goChapter(next); else setFinished(true)
  }
  const onPrev = () => { if (prev) goChapter(prev) }
  const hasContent = blocks.length > 0

  return (
    <div className="lib-reader-stage" data-candle={candle || undefined} data-mood={book?.theme || undefined} style={{ '--lib-fontscale': fontScale }}>
      {candle && <div className="lib-candle" />}
      <audio ref={ambientRef} loop preload="none" src={ambienceUrl || undefined} />
      <div className="lib-reader-bar">
        <button className="lib-back" onClick={() => navigate(`/library/${bookId}`)}>
          <ChevronRight size={16} /> الرواية
        </button>
        <div className="lib-bar-title">
          <div className="bt">{book?.title_ar || book?.title_en || ''}</div>
          {current && <div className="bc">{current.title_en || `Chapter ${current.chapter_number}`}</div>}
        </div>
        <button className="lib-gear" onClick={() => setShowSettings(true)} aria-label="إعدادات القراءة"><Settings2 size={17} /></button>
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
          : hasContent ? <CodexProse blocks={blocks} chapter={current} onNext={onNext} onPrev={onPrev} hasNext={!!next} hasPrev={!!prev} bookTitle={book?.title_en || book?.title_ar} paper={paper} onTray={setTray} help={help} />
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
          {!isLoading && hasContent && (mode === 'reveal' ? <RevealProse blocks={blocks} help={help} /> : <AssistProse blocks={blocks} />)}
          {!isLoading && hasContent && (
            <div className="lib-foot">
              <button disabled={!prev} onClick={onPrev}>الفصل السابق</button>
              <button className="lib-finish" onClick={onNext}>{next ? 'الفصل التالي' : 'أنهيت الرواية ✦'}</button>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {mode === 'codex' && tray && (
          <motion.div
            key="scrim"
            className="lib-tray-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setTray(null)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {mode === 'codex' && tray && (
          <motion.div
            className="lib-codex-tray"
            initial={{ x: '-50%', y: 44, opacity: 0 }}
            animate={{ x: '-50%', y: 0, opacity: 1 }}
            exit={{ x: '-50%', y: 44, opacity: 0 }}
            transition={{ duration: 0.26, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <div className="en" dir="ltr">
              {tray.en.split(/(\s+)/).map((tok, i) => /[A-Za-z]/.test(tok)
                ? <span key={i} className="lib-word" data-saved={savedWords.has(cleanWord(tok)) || undefined} onClick={() => onSaveWord(tok, tray.en)}>{tok}</span>
                : tok)}
            </div>
            {tray.ar && <div className="ar" dir="rtl">{tray.ar}</div>}
            <div className="lib-tray-hint">اضغط أي كلمة لإضافتها إلى «كلماتي» وسماعها 🔊</div>
            <button className="close" onClick={() => setTray(null)}>إغلاق</button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div className="lib-sheet-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSettings(false)} />
            <motion.div className="lib-sheet" initial={{ x: '-50%', y: '100%' }} animate={{ x: '-50%', y: 0 }} exit={{ x: '-50%', y: '100%' }} transition={{ duration: 0.3, ease: [0.22, 0.61, 0.36, 1] }}>
              <div className="lib-sheet-grip" />
              {mode === 'codex' && (
                <div className="lib-sheet-row">
                  <span>الورق</span>
                  <div className="lib-papers">
                    {PAPERS.map((p) => (
                      <button key={p} className="lib-swatch" data-paper={p} data-active={paper === p} onClick={() => changePaper(p)} aria-label={`ورق ${p}`} />
                    ))}
                  </div>
                </div>
              )}
              <div className="lib-sheet-row">
                <span>حجم الخط</span>
                <div className="lib-stepper">
                  <button onClick={() => bumpFont(-0.05)}>A−</button>
                  <i>{Math.round(fontScale * 100)}%</i>
                  <button onClick={() => bumpFont(0.05)}>A+</button>
                </div>
              </div>
              <div className="lib-sheet-row">
                <span>إضاءة الشموع</span>
                <button className={`lib-toggle ${candle ? 'on' : ''}`} onClick={toggleCandle} aria-label="إضاءة الشموع"><i /></button>
              </div>
              {ambienceUrl && (
                <div className="lib-sheet-row">
                  <span>أجواء صوتية</span>
                  <button className={`lib-toggle ${ambient ? 'on' : ''}`} onClick={toggleAmbient} aria-label="أجواء صوتية"><i /></button>
                </div>
              )}
              <div className="lib-sheet-row">
                <span>مستوى المساعدة</span>
                <div className="lib-seg">
                  <button data-active={help === 'full'} onClick={() => changeHelp('full')}>الكل</button>
                  <button data-active={help === 'hints'} onClick={() => changeHelp('hints')}>تلميح</button>
                  <button data-active={help === 'off'} onClick={() => changeHelp('off')}>إيقاف</button>
                </div>
              </div>
              <button className="lib-sheet-done" onClick={() => setShowSettings(false)}>تم</button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
