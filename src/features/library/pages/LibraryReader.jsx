// The Reader — "The Midnight Reading Room". A warm, lamplit reading surface
// that contrasts the cool app. Two modes:
//   reveal — tap a sentence, its Arabic unfolds beneath (the signature veil-lift)
//   assist — English paragraph with its Arabic stacked beneath (no tapping)
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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

export default function LibraryReader() {
  const { bookId, chapterId } = useParams()
  const navigate = useNavigate()
  const { data: bookData } = useBook(bookId)
  const { data: paragraphs, isLoading } = useChapterContent(chapterId)
  const [mode, setMode] = useState('reveal')
  const [finished, setFinished] = useState(false)
  const [prog, setProg] = useState(0)
  const stageRef = useRef(null)

  const chapters = bookData?.chapters || []
  const book = bookData?.book
  const idx = chapters.findIndex((c) => c.id === chapterId)
  const current = idx >= 0 ? chapters[idx] : null
  const prev = idx > 0 ? chapters[idx - 1] : null
  const next = idx >= 0 && idx < chapters.length - 1 ? chapters[idx + 1] : null

  // thin top progress bar tracks scroll through the chapter
  useEffect(() => {
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

  // reset on chapter change
  useEffect(() => { setFinished(false); window.scrollTo(0, 0) }, [chapterId])

  const onNext = () => {
    if (next) navigate(`/library/${bookId}/read/${next.id}`)
    else setFinished(true)
  }

  const hasContent = useMemo(() => Array.isArray(paragraphs) && paragraphs.length > 0, [paragraphs])

  return (
    <div className="lib-reader-stage" ref={stageRef}>
      <div className="lib-reader-bar">
        <button className="lib-back" onClick={() => navigate(`/library/${bookId}`)}>
          <ChevronRight size={16} /> الرواية
        </button>
        <div className="lib-bar-title">
          <div className="bt">{book?.title_ar || book?.title_en || ''}</div>
          {current && <div className="bc">{current.title_en || `Chapter ${current.chapter_number}`}</div>}
        </div>
        <div className="lib-mode">
          <button data-active={mode === 'reveal'} onClick={() => setMode('reveal')}>كشف</button>
          <button data-active={mode === 'assist'} onClick={() => setMode('assist')}>مساعدة</button>
        </div>
      </div>
      <div className="lib-progress"><i style={{ width: `${Math.round(prog * 100)}%` }} /></div>

      <div className="lib-page">
        {finished ? (
          <div className="lib-seal">
            <div className="ring"><Sparkles size={34} /></div>
            <h3>{next ? 'إلى الفصل التالي' : 'تمّت الرواية'}</h3>
            <p>{next ? '' : `أتممت «${book?.title_ar || book?.title_en}» — رواية كاملة في رصيدك.`}</p>
          </div>
        ) : (
          <>
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
                <button disabled={!prev} onClick={() => prev && navigate(`/library/${bookId}/read/${prev.id}`)}>الفصل السابق</button>
                <button className="lib-finish" onClick={onNext}>{next ? 'الفصل التالي' : 'أنهيت الرواية ✦'}</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
