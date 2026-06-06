// Typographic, publisher-series cover. No stock art — a colour field per theme
// (mystery / grief / ambition), Playfair-style title, level tag, byline, motif.
import { Lock } from 'lucide-react'
import { themeKicker } from '../hooks/useLibrary'

export default function BookCover({ book, size = 'md', locked = false }) {
  return (
    <div className={`lib-cover ${size === 'lg' ? 'lib-cover-lg' : ''}`} data-theme={book.theme} data-locked={locked || undefined}>
      <div className="lib-cover-field">
        <div className="lib-cover-top">
          <span className="lib-cover-kicker">{themeKicker(book.theme)}</span>
          <span className="lib-cover-level">{book.cefr}</span>
        </div>
        <div className="lib-cover-title">{book.title_en}</div>
        <div className="lib-cover-rule" />
        <div className="lib-cover-author">{book.author_label || 'Fluentia Originals'}</div>
        <div className="lib-cover-motif" />
      </div>
      {locked && (
        <div className="lib-cover-lock"><Lock size={20} /></div>
      )}
    </div>
  )
}
