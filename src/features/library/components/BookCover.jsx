// Publisher-series cover. A tone-matched, full-bleed illustration per novel
// (locked art direction + palette) dissolving into the theme colour field, with
// the title + byline anchored on a clean scrim so the typography stays the hero.
import { Lock } from 'lucide-react'
import { themeKicker } from '../hooks/useLibrary'

export default function BookCover({ book, size = 'md', locked = false }) {
  const art = book.cover_data?.art_url
  return (
    <div
      className={`lib-cover ${size === 'lg' ? 'lib-cover-lg' : ''}`}
      data-theme={book.theme}
      data-art={art ? 'true' : undefined}
      data-locked={locked || undefined}
    >
      {art && (
        <div className="lib-cover-art" style={{ backgroundImage: `url("${art}")` }} />
      )}
      <div className="lib-cover-field">
        <div className="lib-cover-top">
          <span className="lib-cover-kicker">{themeKicker(book.theme)}</span>
          <span className="lib-cover-level">{book.cefr}</span>
        </div>
        <div className="lib-cover-title">{book.title_en}</div>
        <div className="lib-cover-rule" />
        <div className="lib-cover-author">{book.author_label || 'Fluentia Originals'}</div>
        {!art && <div className="lib-cover-motif" />}
      </div>
      {locked && (
        <div className="lib-cover-lock"><Lock size={20} /></div>
      )}
    </div>
  )
}
