import { useFadeIn } from './useFadeIn'

function highlightWord(sentence, word) {
  if (!word) return sentence
  const regex = new RegExp(`(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = sentence.split(regex)
  return parts.map((part, i) =>
    regex.test(part)
      ? <span key={i} className="text-sky-400 font-semibold">{part}</span>
      : <span key={i}>{part}</span>
  )
}

function RuleBlock({ section }) {
  return (
    <div className="space-y-3">
      {section.content_en && (
        <div
          className="grammar-rule-block"
          dir="ltr"
        >
          <div
            className="text-[15px] leading-[1.9] text-white/90 font-['Inter'] grammar-html"
            dangerouslySetInnerHTML={{ __html: section.content_en }}
          />
        </div>
      )}
      {section.content_ar && (
        <p className="text-sm text-white/50 font-['Tajawal'] leading-relaxed pr-4" dir="rtl">
          {section.content_ar}
        </p>
      )}
    </div>
  )
}

function FormulaBlock({ section }) {
  return (
    <div className="grammar-formula" dir="ltr">
      <p className="text-sky-300 font-semibold tracking-wide">
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
          <span className="text-sky-400 text-sm mt-0.5 flex-shrink-0">✓</span>
          <div className="flex-1">
            <p className="text-[15px] text-white/90 font-['Inter']" dir="ltr">
              {highlightWord(ex.sentence, ex.highlight)}
            </p>
            {ex.translation_ar && (
              <p className="text-xs text-white/35 font-['Tajawal'] mt-0.5" dir="rtl">
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
        <h2 className="text-sm font-bold text-white/70 font-['Tajawal']">الشرح</h2>
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
