import WordFamilySection from '../WordFamilySection'

/**
 * العائلة tab — wraps the existing WordFamilySection component.
 * Only rendered when the word has a word_family with 2+ members.
 * WordFamilySection already provides its own container + heading, so no outer wrapper needed.
 */
export default function FamilyTab({ word, studentId }) {
  return (
    <div dir="rtl">
      <WordFamilySection wordFamily={word.word_family} studentId={studentId} />
    </div>
  )
}
