// Reusable Arabic feedback phrases to speed up grading. onPick appends the
// phrase to the feedback field.
const SNIPPETS = [
  'أحسنت، عمل ممتاز 👏',
  'تقدّم ملحوظ، استمر',
  'فكرة جيدة، وسّعها أكثر',
  'انتبه لقواعد الأزمنة',
  'راجع الإملاء',
  'رتّب أفكار الفقرة',
  'استخدم مفردات أغنى',
  'جُمَلك واضحة، أحسنت',
]

export default function FeedbackSnippets({ onPick }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {SNIPPETS.map((s) => (
        <button key={s} type="button" onClick={() => onPick(s)}
          className="text-[11px] px-2 py-1 rounded-md bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-colors">
          {s}
        </button>
      ))}
    </div>
  )
}
