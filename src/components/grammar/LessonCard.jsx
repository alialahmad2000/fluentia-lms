import { useFadeIn } from './useFadeIn'

function highlightWord(sentence, word) {
  if (!word) return sentence
  const regex = new RegExp(`(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = sentence.split(regex)
  return parts.map((part, i) =>
    regex.test(part)
      ? <span key={i} style={{ color: 'var(--accent-sky)', fontWeight: 600 }}>{part}</span>
      : <span key={i}>{part}</span>
  )
}

function RuleBlock({ section }) {
  return (
    <div className="space-y-3">
      {section.content_en && (
        <div className="grammar-rule-block" dir="ltr">
          <div
            className="text-[15px] leading-[1.9] font-['Inter'] grammar-html"
            style={{ color: 'var(--text-primary)' }}
            dangerouslySetInnerHTML={{ __html: section.content_en }}
          />
        </div>
      )}
      {section.content_ar && (
        <p className="text-sm font-['Tajawal'] leading-relaxed pr-4" dir="rtl" style={{ color: 'var(--text-secondary)' }}>
          {section.content_ar}
        </p>
      )}
    </div>
  )
}

function FormulaBlock({ section }) {
  return (
    <div className="grammar-formula" dir="ltr">
      <p className="font-semibold tracking-wide" style={{ color: 'var(--accent-sky)' }}>
        {section.content}
      </p>
    </div>
  )
}

function ExamplesBlock({ section }) {
  return (
    <div className="space-y-2">
      {section.items?.map((ex, i) => (
        <div key={i} className="grammar-example-row">
          <span className="text-sm mt-0.5 flex-shrink-0" style={{ color: 'var(--accent-sky)' }}>✓</span>
          <div className="flex-1">
            <p className="text-[15px] font-['Inter']" dir="ltr" style={{ color: 'var(--text-primary)' }}>
              {highlightWord(ex.sentence, ex.highlight)}
            </p>
            {ex.translation_ar && (
              <p className="text-xs font-['Tajawal'] mt-0.5" dir="rtl" style={{ color: 'var(--text-tertiary)' }}>
                {ex.translation_ar}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function HeadingBlock({ section }) {
  return (
    <h3 className="grammar-heading" dir="ltr">
      {section.content || section.title}
    </h3>
  )
}

export default function LessonCard({ sections }) {
  const ref = useFadeIn()

  if (!sections?.length) return null

  return (
    <div ref={ref} className="grammar-glass grammar-fade-in p-5 sm:p-7 space-y-5 mb-6">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">📘</span>
        <h2 className="text-sm font-bold font-['Tajawal']" style={{ color: 'var(--text-secondary)' }}>الشرح</h2>
      </div>

      <div className="space-y-5">
        {sections.map((section, i) => {
          switch (section.type) {
            case 'explanation':
              return <RuleBlock key={i} section={section} />
            case 'formula':
              return <FormulaBlock key={i} section={section} />
            case 'examples':
              return <ExamplesBlock key={i} section={section} />
            case 'heading':
              return <HeadingBlock key={i} section={section} />
            default:
              return null
          }
        })}
      </div>
    </div>
  )
}
