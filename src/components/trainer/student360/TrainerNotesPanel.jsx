import { useState } from 'react'
import { useStudentNotes, useAddTrainerNote } from '@/hooks/trainer/useStudent360'
import { useTranslation } from 'react-i18next'
import './TrainerNotesPanel.css'

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

export default function TrainerNotesPanel({ studentId }) {
  const { t } = useTranslation()
  const { data: notes, isLoading } = useStudentNotes(studentId)
  const { mutate: addNote, isPending: saving } = useAddTrainerNote(studentId)

  const NOTE_TYPES = [
    { value: 'observation',   label: t('trainer.students.note_type_observation') },
    { value: 'encouragement', label: t('trainer.students.note_type_encouragement') },
    { value: 'warning',       label: t('trainer.students.note_type_warning') },
    { value: 'reminder',      label: t('trainer.students.note_type_reminder') },
  ]

  function timeAgo(iso) {
    const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
    if (d === 0) return t('trainer.students.date_today')
    if (d === 1) return t('trainer.students.date_yesterday')
    return `${t('trainer.student360.since', 'منذ')} ${d} ${t('trainer.students.time_unit_day')}`
  }

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
      <h3 className="tnp-title">{t('trainer.students.trainer_notes_title')}</h3>

      <form className="tnp-form" onSubmit={handleSubmit}>
        <div className="tnp-type-row">
          {NOTE_TYPES.map(nt => (
            <button
              key={nt.value}
              type="button"
              className={`tnp-type-btn ${type === nt.value ? 'tnp-type-btn--active' : ''}`}
              onClick={() => setType(nt.value)}
            >
              {TYPE_ICON[nt.value]} {nt.label}
            </button>
          ))}
        </div>
        <textarea
          className="tnp-textarea"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={t('trainer.student360.note_placeholder', 'اكتب ملاحظتك هنا…')}
          rows={3}
          maxLength={500}
          dir="rtl"
        />
        <div className="tnp-form-footer">
          <span className="tnp-char-count">{text.length}/500</span>
          <button className="tnp-submit" type="submit" disabled={saving || !text.trim()}>
            {saving ? t('common.saving') : t('trainer.student360.save_note')}
          </button>
        </div>
      </form>

      {isLoading ? (
        <div className="tnp-skeleton-list">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="tnp-skeleton" />)}
        </div>
      ) : !notes?.length ? (
        <p className="tnp-empty">{t('trainer.student360.no_notes')}</p>
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
