import { useRef, useEffect } from 'react'
import FilterLensPill from './FilterLensPill'
import { useGroupLensCounts } from '../../queries/useUnifiedMessages'

const LENSES = [
  { slug: 'all',       label: 'الكل',      icon: '◈' },
  { slug: 'important', label: 'مهم',       icon: '✦' },
  { slug: 'voice',     label: 'صوتيات',    icon: '🎙️' },
  { slug: 'files',     label: 'ملفات',     icon: '📎' },
  { slug: 'mentions',  label: 'ذكروني',   icon: '@' },
  { slug: 'questions', label: 'أسئلة',    icon: '؟' },
]

const glass = {
  background: 'color-mix(in srgb, var(--ds-bg-base) 85%, transparent)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  borderBottom: '1px solid var(--ds-border-subtle)',
}

export default function FilterLensBar({ groupId, activeLens, onLensChange }) {
  const scrollRef = useRef(null)
  const activeRef = useRef(null)
  const { data: counts = {} } = useGroupLensCounts(groupId)

  // Auto-scroll active pill into view
  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    }
  }, [activeLens])

  const countFor = (slug) => {
    const map = {
      all: counts.cnt_all, important: counts.cnt_important,
      voice: counts.cnt_voice, files: counts.cnt_files,
      mentions: counts.cnt_mentions, questions: counts.cnt_questions,
    }
    return map[slug] ?? 0
  }

  return (
    <div style={{ ...glass, position: 'sticky', top: 56, zIndex: 25, direction: 'rtl' }}>
      <div
        ref={scrollRef}
        className="flex gap-2 px-4 py-2 overflow-x-auto"
        style={{ scrollbarWidth: 'none', scrollSnapType: 'x mandatory' }}
      >
        {LENSES.map((lens) => (
          <div
            key={lens.slug}
            ref={lens.slug === activeLens ? activeRef : null}
            style={{ scrollSnapAlign: 'start' }}
          >
            <FilterLensPill
              lens={lens}
              isActive={activeLens === lens.slug}
              count={countFor(lens.slug)}
              onClick={() => onLensChange(lens.slug)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
