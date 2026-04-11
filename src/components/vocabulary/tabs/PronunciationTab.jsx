import PronunciationAlert from '../PronunciationAlert'

/**
 * النطق tab — wraps the existing PronunciationAlert component.
 * Only rendered when word has a pronunciation_alert with has_alert !== false.
 */
export default function PronunciationTab({ word }) {
  return (
    <div dir="rtl">
      <PronunciationAlert
        alert={word.pronunciation_alert}
        word={word.word}
        audioUrl={word.audio_url}
      />
    </div>
  )
}
