import { useGenderize } from '@/i18n/gender'
import RichText from './RichText'

/**
 * The section vocabulary shared by the main «الشرح» card and the collapsed
 * «شرح أعمق» panel. Both layers are authored with the same shapes, so they get
 * one renderer instead of two that can drift apart.
 */

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

const isRtl = (s) => /[؀-ۿ]/.test(String(s || ''))

function RuleBlock({ section }) {
  const gz = useGenderize()
  if (!section.content_en && !section.content_ar) return null
  return (
    <div className="grammar-rule-block">
      {section.content_en && (
        <RichText
          text={section.content_en}
          dir="ltr"
          className="text-[15px] leading-[1.85] font-['Inter']"
          style={{ color: 'var(--text-primary)' }}
        />
      )}
      {section.content_ar && (
        <RichText
          text={gz(section.content_ar)}
          dir="rtl"
          className={`text-sm leading-[1.9] font-['Tajawal']${section.content_en ? ' grammar-rule-ar' : ''}`}
          style={{ color: 'var(--text-secondary)' }}
        />
      )}
    </div>
  )
}

function FormulaBlock({ section }) {
  if (!section.content) return null
  return (
    <div className="grammar-formula" dir="ltr">
      <span className="grammar-formula-label" dir="rtl">الصيغة</span>
      <RichText text={section.content} dir="ltr" />
    </div>
  )
}

function TableBlock({ section }) {
  const gz = useGenderize()
  const columns = section.columns || []
  const rows = section.rows || []
  if (!columns.length || !rows.length) return null

  return (
    <div className="space-y-2">
      {(section.title_ar || section.title_en) && (
        <h4 className="text-xs font-bold font-['Tajawal']" dir="rtl" style={{ color: 'var(--text-secondary)' }}>
          {gz(section.title_ar) || section.title_en}
        </h4>
      )}
      <div className="grammar-table-wrap">
        <table className="grammar-table">
          <thead>
            <tr>
              {columns.map((c, i) => {
                const label = typeof c === 'string' ? c : (c.label_ar || c.label_en)
                const rtl = isRtl(label)
                return (
                  <th key={i} dir={rtl ? 'rtl' : 'ltr'} style={{ textAlign: rtl ? 'right' : 'left' }}>
                    {rtl ? gz(label) : label}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => {
                  const rtl = isRtl(cell)
                  return (
                    <td key={ci} className={rtl ? '' : 'grammar-table-cell-ltr'} dir={rtl ? 'rtl' : 'ltr'}>
                      <RichText text={rtl ? gz(cell) : cell} dir={rtl ? 'rtl' : 'ltr'} as="span" />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ExamplesBlock({ section }) {
  const gz = useGenderize()
  if (!section.items?.length) return null
  return (
    <div className="space-y-1.5">
      <h4 className="text-xs font-bold font-['Tajawal']" dir="rtl" style={{ color: 'var(--success)' }}>
        أمثلة
      </h4>
      {section.items.map((ex, i) => (
        <div key={i} className="grammar-example-row">
          <span className="text-sm mt-0.5 flex-shrink-0" style={{ color: 'var(--accent-sky)' }}>✓</span>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-['Inter']" dir="ltr" style={{ color: 'var(--text-primary)' }}>
              {highlightWord(ex.sentence, ex.highlight)}
            </p>
            {/* --text-tertiary measures 2.54:1 on the parchment theme — under AA */}
            {ex.translation_ar && (
              <p className="text-[13px] font-['Tajawal'] mt-1 leading-relaxed" dir="rtl" style={{ color: 'var(--text-secondary)' }}>
                {gz(ex.translation_ar)}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function HeadingBlock({ section }) {
  const gz = useGenderize()
  const raw = section.content || section.title
  if (!raw) return null
  const rtl = isRtl(raw)
  return (
    <h3 className="grammar-heading" dir={rtl ? 'rtl' : 'ltr'}>
      {rtl ? gz(raw) : raw}
    </h3>
  )
}

export default function GrammarSections({ sections }) {
  if (!sections?.length) return null
  return (
    <div className="space-y-5">
      {sections.map((section, i) => {
        switch (section.type) {
          case 'explanation': return <RuleBlock key={i} section={section} />
          case 'formula': return <FormulaBlock key={i} section={section} />
          case 'table': return <TableBlock key={i} section={section} />
          case 'examples': return <ExamplesBlock key={i} section={section} />
          case 'heading': return <HeadingBlock key={i} section={section} />
          default: return null
        }
      })}
    </div>
  )
}
