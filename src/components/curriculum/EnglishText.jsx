/**
 * Wraps English-script content inside an RTL page so the visual flow
 * (and any flex/grid children) renders left-to-right.
 *
 * Use for: English words, syllabified words, IPA notation, example
 * sentences, minimal pairs — anything in Latin script that must read
 * left-to-right regardless of parent direction.
 *
 * Inline by default (renders as <span>). Pass as="div" for block.
 */
export default function EnglishText({
  children,
  as: Tag = 'span',
  className = '',
  style = {},
  ...rest
}) {
  return (
    <Tag
      dir="ltr"
      lang="en"
      className={`fl-en ${className}`.trim()}
      style={{
        unicodeBidi: 'isolate',
        direction: 'ltr',
        ...style,
      }}
      {...rest}
    >
      {children}
    </Tag>
  )
}
