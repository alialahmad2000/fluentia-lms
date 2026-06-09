// Book detail — large cover, Arabic synopsis, chapter list, "ابدأ القراءة".
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronRight, BookOpen } from 'lucide-react'
import BookCover from '../components/BookCover'
import BookClub from '../components/BookClub'
import { useBook, useMyProgress } from '../hooks/useLibrary'
import { useAuthProfileId, useAuthProfile } from '../../../stores/authStore'
import '../library.css'

export default function LibraryBook() {
  const { bookId } = useParams()
  const navigate = useNavigate()
  const myId = useAuthProfileId()
  const profile = useAuthProfile()
  const authorName = profile?.display_name || profile?.full_name || null
  const { data, isLoading, error } = useBook(bookId)
  const { data: prog } = useMyProgress(myId)

  if (isLoading) return <div className="lib-detail"><div className="lib-skel" style={{ height: 280 }} /></div>
  if (error || !data?.book) return <div className="lib-empty">تعذّر فتح هذه الرواية.</div>

  const { book, chapters } = data
  const firstChapter = chapters[0]
  const bookProg = (prog?.byBook || {})[bookId]
  const completed = !!bookProg?.book_completed_at
  const resumeChapter = bookProg?.current_chapter_id && !completed ? bookProg.current_chapter_id : null

  return (
    <div className="lib-detail">
      <button className="lib-foot" onClick={() => navigate('/library')} style={{ border: 'none', background: 'none', padding: '4px 0 16px', color: 'var(--ds-text-tertiary,#94a3b8)', cursor: 'pointer', fontFamily: 'Tajawal, sans-serif', fontSize: 13 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ChevronRight size={16} /> المكتبة</span>
      </button>

      <div className="lib-detail-hero">
        <BookCover book={book} size="lg" />
        <div className="lib-detail-info">
          <h1>{book.title_ar || book.title_en}</h1>
          <div className="en">{book.title_en}</div>
          <div className="by">{book.author_label || 'Fluentia Originals'} · {book.cefr}</div>
          {completed && <div className="lib-detail-seal">✦ تمّت — رواية كاملة في رصيدك</div>}
        </div>
      </div>

      {book.synopsis_ar && <p className="lib-syn">{book.synopsis_ar}</p>}

      {firstChapter ? (
        <button className="lib-start" onClick={() => navigate(`/library/${book.id}/read/${resumeChapter || firstChapter.id}`)}>
          <BookOpen size={17} /> {completed ? 'اقرأ مجدّدًا' : resumeChapter ? 'تابع القراءة' : 'ابدأ القراءة'}
        </button>
      ) : (
        <div className="lib-empty">الفصل الأول قيد الإعداد — قريباً بإذن الله.</div>
      )}

      {chapters.length > 0 && (
        <div className="lib-chapters">
          <h2>الفصول</h2>
          {chapters.map((c) => (
            <div key={c.id} className="lib-chapter-row" onClick={() => navigate(`/library/${book.id}/read/${c.id}`)}>
              <span className="n">{c.chapter_number}</span>
              <div className="ti">
                <div className="a">{c.title_ar || `الفصل ${c.chapter_number}`}</div>
                {c.title_en && <div className="e">{c.title_en}</div>}
              </div>
              {c.word_count > 0 && <span className="w">{c.word_count} كلمة</span>}
            </div>
          ))}
        </div>
      )}

      <BookClub bookId={book.id} bookTitle={book.title_ar || book.title_en} authorName={authorName} totalChapters={chapters.length} />
    </div>
  )
}
