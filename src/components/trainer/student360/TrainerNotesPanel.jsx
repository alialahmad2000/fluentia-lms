import { useState } from 'react'
import { useStudentNotes, useAddTrainerNote } from '@/hooks/trainer/useStudent360'
import './TrainerNotesPanel.css'

const NOTE_TYPES = [
  { value: 'observation',  label: 'ملاحظة' },
  { value: 'encouragement', label: 'تشجيع' },
  { value: 'warning',      label: 'تحذير' },
  { value: 'reminder',     label: 'تذكير' },
]

const TYPE_CLS = {
  observation:   'tnp-note--observation',
  encouragement: 'tnp-note--encouragement',
  warning:       'tnp-note--warning',
  reminder:      'tnp-note--reminder',
}

const TYPE_ICON = {
  observation:   '📝',
  encouragement: '🎉',
  warning:       '⚠️',
  reminder:      '🔔',
}

function timeAgo(iso) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (d === 0) return 'اليوم'
  if (d === 1) return 'أمس'
  return `منذ ${d} يوم`
}

export default function TrainerNotesPanel({ studentId }) {
  const { data: notes, isLoading } = useStudentNotes(studentId)
  const { mutate: addNote, isPending: saving } = useAddTrainerNote(studentId)

  const [text, setText] = useState('')
  const [type, setType] = useState('observation')

  function handleSubmit(e) {
    e.preventDefault()
    if (!text.trim()) return
    addNote({ text: text.trim(), type }, {
      onSuccess: () => setText(''),
    })
  }

  return (
    <div className="tnp-card">
      <h3 className="tnp-title">ملاحظات المدرب</h3>

      <form className="tnp-form" onSubmit={handleSubmit}>
        <div className="tnp-type-row">
          {NOTE_TYPES.map(t => (
            <button
              key={t.value}
              type="button"
              className={`tnp-type-btn ${type === t.value ? 'tnp-type-btn--active' : ''}`}
              onClick={() => setType(t.value)}
            >
              {TYPE_ICON[t.value]} {t.label}
            </button>
          ))}
        </div>
        <textarea
          className="tnp-textarea"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="اكتب ملاحظتك هنا…"
          rows={3}
          maxLength={500}
          dir="rtl"
        />
        <div className="tnp-form-footer">
          <span className="tnp-char-count">{text.length}/500</span>
          <button className="tnp-submit" type="submit" disabled={saving || !text.trim()}>
            {saving ? 'جارٍ الحفظ…' : 'حفظ الملاحظة'}
          </button>
        </div>
      </form>

      {isLoading ? (
        <div className="tnp-skeleton-list">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="tnp-skeleton" />)}
        </div>
      ) : !notes?.length ? (
        <p className="tnp-empty">لا توجد ملاحظات بعد</p>
      ) : (
        <ul className="tnp-list">
          {notes.map(n => (
            <li key={n.id} className={`tnp-note ${TYPE_CLS[n.note_type] || ''}`}>
              <div className="tnp-note-header">
                <span className="tnp-note-icon">{TYPE_ICON[n.note_type] || '📝'}</span>
                <span className="tnp-note-age">{timeAgo(n.created_at)}</span>
              </div>
              <p className="tnp-note-content">{n.content}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
