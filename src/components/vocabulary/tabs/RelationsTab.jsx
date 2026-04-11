import WordRelationships from '../WordRelationships'

/**
 * المرادفات tab — wraps the existing WordRelationships component.
 * Only rendered when word has synonyms or antonyms.
 */
export default function RelationsTab({ word, studentId }) {
  return (
    <div
      dir="rtl"
      className="rounded-xl bg-slate-800/30 border border-slate-800/50 p-4 sm:p-5"
    >
      <WordRelationships
        synonyms={word.synonyms || []}
        antonyms={word.antonyms || []}
        studentId={studentId}
      />
    </div>
  )
}
