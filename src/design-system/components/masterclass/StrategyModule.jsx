import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const SECTION_META = {
  arabic_intro: { label: 'المقدمة', accent: 'var(--ds-accent-primary)' },
  strategic_approach: { label: 'الاستراتيجية', accent: 'var(--ds-accent-secondary)' },
  common_traps: { label: 'الأخطاء الشائعة', accent: 'var(--ds-amber)' },
  worked_example: { label: 'مثال محلول', accent: 'var(--ds-accent-gold)' },
  guided_practice_start: { label: 'التدريب', accent: 'var(--ds-accent-success)' },
}

function parseMarkdown(text) {
  const lines = text.split('\n')
  const result = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('```')) {
      const codeLines = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      result.push(
        <pre key={i} style={{
          margin: '12px 0',
          padding: 'var(--space-4)',
          background: 'var(--ds-bg-base)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--ds-border-subtle)',
          fontSize: 13,
          color: 'var(--ds-text-primary)',
          fontFamily: "'IBM Plex Mono', 'Cascadia Code', monospace",
          overflowX: 'auto',
          whiteSpace: 'pre',
          direction: 'ltr',
          textAlign: 'left',
        }}>
          <code>{codeLines.join('\n')}</code>
        </pre>
      )
      i++
      continue
    }

    if (line.startsWith('- ')) {
      const items = []
      while (i < lines.length && lines[i].startsWith('- ')) {
        items.push(lines[i].slice(2))
        i++
      }
      result.push(
        <ul key={i} style={{ margin: '8px 0', paddingInlineStart: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {items.map((item, j) => (
            <li key={j} style={{ fontSize: 14, color: 'var(--ds-text-secondary)', fontFamily: "'Tajawal', sans-serif", lineHeight: 1.7 }}>
              {renderInline(item)}
            </li>
          ))}
        </ul>
      )
      continue
    }

    if (line.trim()) {
      result.push(
        <p key={i} style={{ margin: '6px 0', fontSize: 15, color: 'var(--ds-text-secondary)', fontFamily: "'Tajawal', sans-serif", lineHeight: 1.8 }}>
          {renderInline(line)}
        </p>
      )
    }
    i++
  }
  return result
}

function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ color: 'var(--ds-text-primary)' }}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i}>{part.slice(1, -1)}</em>
    }
    return part
  })
}

function SectionBlock({ section, index }) {
  const [open, setOpen] = useState(section.defaultOpen !== false)
  const meta = SECTION_META[section.type] || SECTION_META.arabic_intro
  const isTrap = section.type === 'common_traps'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      id={`section-${section.type}`}
      style={{
        border: '1px solid var(--ds-border-subtle)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        borderInlineStart: `3px solid ${meta.accent}`,
      }}
    >
      <button
        onClick={() => section.collapsible && setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          padding: 'var(--space-4)',
          background: open ? 'var(--ds-surface-2)' : 'var(--ds-surface-1)',
          border: 'none',
          cursor: section.collapsible ? 'pointer' : 'default',
          textAlign: 'right',
        }}
        aria-expanded={open}
      >
        {isTrap && <span aria-hidden="true" style={{ color: meta.accent, flexShrink: 0 }}>⚠</span>}
        <span style={{
          flex: 1,
          fontSize: 15,
          fontWeight: 700,
          color: 'var(--ds-text-primary)',
          fontFamily: "'Tajawal', sans-serif",
        }}>
          {section.title}
        </span>
        <span style={{ fontSize: 10, color: meta.accent, fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600 }}>
          {meta.label}
        </span>
        {section.collapsible && (
          <span style={{ color: 'var(--ds-text-tertiary)', fontSize: 14, transition: 'transform var(--motion-fast)', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            ▼
          </span>
        )}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div dir="rtl" style={{ padding: 'var(--space-4)', background: 'var(--ds-surface-1)' }}>
              {parseMarkdown(section.content)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function StrategyModule({
  moduleId,
  questionType,
  sections = [],
  onStartPractice,
  readingProgress,
  className = '',
}) {
  const scrollRef = useRef(null)
  const [scrollProg, setScrollProg] = useState(readingProgress ?? 0)

  useEffect(() => {
    if (readingProgress != null) return
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el
      setScrollProg(Math.min(scrollTop / (scrollHeight - clientHeight), 1) || 0)
    }
    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [readingProgress])

  const prog = readingProgress ?? scrollProg

  return (
    <div className={className} style={{ maxWidth: 720, margin: '0 auto', position: 'relative' }}>
      {/* Reading progress bar */}
      <div style={{ position: 'sticky', top: 0, height: 3, background: 'var(--ds-border-subtle)', zIndex: 10 }}>
        <motion.div
          animate={{ width: `${prog * 100}%` }}
          transition={{ duration: 0.2 }}
          style={{ height: '100%', background: 'var(--ds-accent-primary)', borderRadius: 'var(--radius-full)' }}
        />
      </div>

      <div ref={scrollRef} style={{ padding: 'var(--space-5) var(--space-4)' }}>
        {/* Module header */}
        <div dir="rtl" style={{ marginBottom: 'var(--space-6)' }}>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--ds-text-tertiary)', fontFamily: "'IBM Plex Sans', sans-serif", letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            استراتيجية
          </p>
          <h1 style={{
            margin: '4px 0 0',
            fontSize: 'clamp(22px, 4vw, 32px)',
            fontWeight: 800,
            fontFamily: "'Tajawal', sans-serif",
            color: 'var(--ds-text-primary)',
            lineHeight: 1.3,
          }}>
            {questionType}
          </h1>
        </div>

        {/* Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {sections.map((section, i) => (
            <SectionBlock key={section.type + i} section={section} index={i} />
          ))}
        </div>

        {/* Final CTA */}
        {onStartPractice && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{ marginTop: 'var(--space-7)', textAlign: 'center' }}
          >
            <button
              onClick={onStartPractice}
              style={{
                padding: 'var(--space-4) var(--space-7)',
                background: 'var(--ds-accent-primary)',
                color: 'var(--ds-text-inverse)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: 17,
                fontWeight: 700,
                fontFamily: "'Tajawal', sans-serif",
                cursor: 'pointer',
                boxShadow: 'var(--ds-shadow-glow)',
                transition: 'opacity var(--motion-fast) var(--ease-out)',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              ابدأ التدريب ←
            </button>
          </motion.div>
        )}
      </div>
    </div>
  )
}
