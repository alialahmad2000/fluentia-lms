// Library browse — "three rooms" of a private library, not a flat card grid.
//  · مكتبتي / My Library  — unlocked books (finished ones wear a gold seal)
//  · اقرأ الفصل الأول     — the +1 "taste-and-tease" books
//  · قريباً / Coming Soon — +2 and beyond, covers softly blurred
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import BookCover from '../components/BookCover'
import { useLibraryBooks, usePreviewLevel, roomForBook } from '../hooks/useLibrary'
import '../library.css'

function Card({ book, room, onOpen }) {
  const locked = room === 'soon'
  return (
    <div className="lib-card" data-locked={locked || undefined} onClick={locked ? undefined : () => onOpen(book)}>
      <BookCover book={book} locked={locked} />
      <div className="lib-card-meta">
        <div className="t">{book.title_ar || book.title_en}</div>
        <div className="s">{book.title_en}</div>
        {room === 'mine' && book.total_chapters > 0 && <span className="lib-card-tag" data-kind="seal">رواية كاملة</span>}
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
  const { data: books = [], isLoading, error } = useLibraryBooks()

  const rooms = useMemo(() => {
    const g = { mine: [], tease: [], soon: [] }
    for (const b of books) g[roomForBook(b, level)].push(b)
    return g
  }, [books, level])

  const open = (book) => navigate(`/library/${book.id}`)

  return (
    <div className="lib-home">
      <header className="lib-masthead">
        <h1>مكتبة طلاقة</h1>
        <div className="lib-wordmark">The Fluentia Library</div>
        <p>روايات عالمية أصلية، بإنجليزية متدرّجة — اقرأ بمتعة، واضغط أي جملة لترى معناها يظهر بهدوء من تحتها.</p>
      </header>

      {isLoading && <div className="lib-shelf">{[0, 1, 2, 3].map((i) => <div key={i} className="lib-skel" />)}</div>}
      {error && <div className="lib-empty">تعذّر تحميل المكتبة الآن. حاول بعد قليل.</div>}

      {!isLoading && !error && (
        <>
          {rooms.mine.length > 0 && (
            <Room title="مكتبتي" count={`${rooms.mine.length} رواية`}>
              {rooms.mine.map((b) => <Card key={b.id} book={b} room="mine" onOpen={open} />)}
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
