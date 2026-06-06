// Library browse — "three rooms": My Library / Read Chapter One / Coming Soon.
// Plus a "Continue reading" hero and gold seals on finished books.
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import BookCover from '../components/BookCover'
import { useLibraryBooks, usePreviewLevel, roomForBook, useMyProgress } from '../hooks/useLibrary'
import { useAuthProfileId } from '../../../stores/authStore'
import '../library.css'

function Card({ book, room, completed, onOpen }) {
  const locked = room === 'soon'
  return (
    <div className="lib-card" data-locked={locked || undefined} onClick={locked ? undefined : () => onOpen(book)}>
      <div className="lib-card-cover">
        <BookCover book={book} locked={locked} />
        {completed && <span className="lib-seal-badge" aria-label="تمّت">✦</span>}
      </div>
      <div className="lib-card-meta">
        <div className="t">{book.title_ar || book.title_en}</div>
        <div className="s">{book.title_en}</div>
        {completed && <span className="lib-card-tag" data-kind="seal">تمّت ✦</span>}
        {!completed && room === 'mine' && book.total_chapters > 0 && <span className="lib-card-tag" data-kind="seal">رواية كاملة</span>}
        {room === 'tease' && <span className="lib-card-tag" data-kind="tease">الفصل الأول مفتوح</span>}
        {room === 'soon' && <span className="lib-card-tag" data-kind="soon">قريباً · {book.cefr}</span>}
      </div>
    </div>
  )
}

function Room({ title, count, children }) {
  return (
    <section className="lib-room">
      <div className="lib-room-head">
        <h2>{title}</h2>
        <span className="lib-room-rule" />
        <span className="lib-room-count">{count}</span>
      </div>
      <div className="lib-shelf">{children}</div>
    </section>
  )
}

export default function LibraryHome() {
  const navigate = useNavigate()
  const level = usePreviewLevel()
  const myId = useAuthProfileId()
  const { data: books = [], isLoading, error } = useLibraryBooks()
  const { data: prog } = useMyProgress(myId)
  const byBook = prog?.byBook || {}
  const rows = prog?.rows || []

  const rooms = useMemo(() => {
    const g = { mine: [], tease: [], soon: [] }
    for (const b of books) g[roomForBook(b, level)].push(b)
    return g
  }, [books, level])

  const continueEntry = rows.find((r) => !r.book_completed_at && r.current_chapter_id)
  const continueBook = continueEntry ? books.find((b) => b.id === continueEntry.book_id) : null

  const open = (book) => navigate(`/library/${book.id}`)

  return (
    <div className="lib-home">
      <header className="lib-masthead">
        <h1>مكتبة طلاقة</h1>
        <div className="lib-wordmark">The Fluentia Library</div>
        <p>روايات عالمية أصلية، بإنجليزية متدرّجة — اقرأ بمتعة، واضغط أي جملة لترى معناها يظهر بهدوء من تحتها.</p>
      </header>

      {continueBook && (
        <button className="lib-continue" onClick={() => navigate(`/library/${continueBook.id}/read/${continueEntry.current_chapter_id}`)}>
          <div className="lib-cover-wrap"><BookCover book={continueBook} /></div>
          <div className="lib-continue-info">
            <div className="k">تابع القراءة</div>
            <div className="t">{continueBook.title_ar || continueBook.title_en}</div>
            <div className="s">{continueBook.title_en}</div>
          </div>
          <BookOpen size={20} className="lib-continue-go" />
        </button>
      )}

      {isLoading && <div className="lib-shelf">{[0, 1, 2, 3].map((i) => <div key={i} className="lib-skel" />)}</div>}
      {error && <div className="lib-empty">تعذّر تحميل المكتبة الآن. حاول بعد قليل.</div>}

      {!isLoading && !error && (
        <>
          {rooms.mine.length > 0 && (
            <Room title="مكتبتي" count={`${rooms.mine.length} رواية`}>
              {rooms.mine.map((b) => <Card key={b.id} book={b} room="mine" completed={!!byBook[b.id]?.book_completed_at} onOpen={open} />)}
            </Room>
          )}
          {rooms.tease.length > 0 && (
            <Room title="اقرأ الفصل الأول" count={`${rooms.tease.length}`}>
              {rooms.tease.map((b) => <Card key={b.id} book={b} room="tease" onOpen={open} />)}
            </Room>
          )}
          {rooms.soon.length > 0 && (
            <Room title="قريباً" count={`${rooms.soon.length}`}>
              {rooms.soon.map((b) => <Card key={b.id} book={b} room="soon" onOpen={open} />)}
            </Room>
          )}
          {books.length === 0 && <div className="lib-empty">المكتبة قيد الإعداد — أول رواية في الطريق.</div>}
        </>
      )}
    </div>
  )
}
