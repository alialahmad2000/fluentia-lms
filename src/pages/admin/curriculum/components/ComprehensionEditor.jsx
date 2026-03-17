import MCQEditor from './MCQEditor'

export default function ComprehensionEditor({ questions = [], onChange }) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>
        أسئلة الفهم
      </h4>
      <MCQEditor questions={questions} onChange={onChange} />
    </div>
  )
}
