import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Trees } from 'lucide-react'

const POS_COLS_AR = [
  { key: 'verb',      label: 'فعل' },
  { key: 'noun',      label: 'اسم' },
  { key: 'adjective', label: 'صفة' },
  { key: 'adverb',    label: 'حال' },
]

/**
 * WordFamilySection — 4-column table by POS (or stacked on narrow screens).
 *
 * Production JSONB item shape (verified Phase A.2):
 *   {
 *     pos: 'verb'|'noun'|'adjective'|'adverb',
 *     word, level, is_base, is_opposite, vocabulary_id,
 *     morphology: {
 *       affix?, rule_ar?, base_pos?, base_word?, affix_type?,
 *       similar_examples?[], is_base?, note_ar?
 *     }
 *   }
 */
export default function WordFamilySection({ family, onOpenRelated }) {
  const [openChipKey, setOpenChipKey] = useState(null)

  const items = Array.isArray(family) ? family : []
  const isEmpty = items.length === 0

  // Group by POS
  const groups = {}
  for (const col of POS_COLS_AR) groups[col.key] = []
  for (const it of items) {
    const key = (it.pos || '').toLowerCase()
    if (groups[key]) groups[key].push(it)
  }

  return (
    <section style={{ marginBottom: 20 }} dir="rtl">
      <div
        className="flex items-center gap-1.5 font-['Tajawal'] font-bold"
        style={{
          color: 'var(--text-secondary)',
          fontSize: 13,
          marginBottom: 10,
        }}
      >
        <Trees size={14} style={{ color: 'var(--text-tertiary)' }} />
        <span>عائلة الكلمة</span>
      </div>

      {isEmpty ? (
        <p
          className="font-['Tajawal']"
          style={{
            color: 'var(--text-tertiary)',
            fontSize: 12,
            fontStyle: 'italic',
          }}
        >
          ما عندنا عائلة كلمات لهالكلمة بعد
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {POS_COLS_AR.map((col) => (
            <div key={col.key} className="space-y-1.5">
              <div
                className="font-['Tajawal']"
                style={{
                  color: 'var(--text-tertiary)',
                  fontSize: 11,
                  fontWeight: 700,
                  textAlign: 'center',
                  borderBottom: '1px solid var(--border, rgba(255,255,255,0.06))',
                  paddingBottom: 4,
                }}
              >
                {col.label}
              </div>
              <div className="flex flex-col gap-1.5">
                {groups[col.key].length === 0 ? (
                  <span
                    style={{
                      color: 'var(--text-tertiary)',
                      fontSize: 11,
                      textAlign: 'center',
                      opacity: 0.4,
                    }}
                  >
                    —
                  </span>
                ) : (
                  groups[col.key].map((it, i) => {
                    const chipKey = `${col.key}-${it.word}-${i}`
                    const isOpen = openChipKey === chipKey
                    return (
                      <div key={chipKey}>
                        <FamilyChip
                          item={it}
                          isOpen={isOpen}
                          onTap={() => {
                            // Tap to toggle the morphology drawer; we
                            // intentionally keep tap-to-open-related on
                            // a sub-button so the chip itself is
                            // dedicated to morphology disclosure.
                            setOpenChipKey(isOpen ? null : chipKey)
                          }}
                          onOpenRelated={onOpenRelated}
                        />
                        <AnimatePresence>
                          {isOpen && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.18 }}
                              style={{ overflow: 'hidden' }}
                            >
                              <MorphologyCard item={it} />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function FamilyChip({ item, isOpen, onTap, onOpenRelated }) {
  const known = !!item.vocabulary_id
  const isBase = item.is_base === true
  const isOpposite = item.is_opposite === true
  return (
    <button
      type="button"
      onClick={onTap}
      className="font-['Inter']"
      style={{
        background: isBase
          ? 'rgba(251,191,36,0.10)'
          : isOpen
          ? 'rgba(168,85,247,0.18)'
          : 'var(--surface-raised, rgba(255,255,255,0.05))',
        border: isBase
          ? '1px solid rgba(251,191,36,0.45)'
          : isOpen
          ? '1px solid rgba(168,85,247,0.40)'
          : '1px solid var(--border, rgba(255,255,255,0.08))',
        color: 'var(--text-primary)',
        padding: '5px 10px',
        borderRadius: 8,
        fontSize: 12,
        cursor: 'pointer',
        textAlign: 'center',
        position: 'relative',
        transition: 'background 160ms ease',
      }}
      dir="ltr"
    >
      <div className="flex items-center justify-center gap-1">
        {isBase && <span style={{ color: '#fbbf24', fontSize: 11 }}>⭐</span>}
        {isOpposite && <span style={{ color: 'rgb(239,68,68)', fontSize: 11 }}>↔</span>}
        <span>{item.word}</span>
        {known && (
          <span
            title="تعرفها"
            style={{
              background: 'rgba(34,197,94,0.20)',
              color: 'rgb(34,197,94)',
              padding: '0 4px',
              borderRadius: 4,
              fontSize: 9,
            }}
          >
            ✓
          </span>
        )}
      </div>
      {known && onOpenRelated && (
        <span
          onClick={(e) => {
            e.stopPropagation()
            onOpenRelated(item.vocabulary_id)
          }}
          role="link"
          style={{
            display: 'block',
            color: 'var(--text-tertiary)',
            fontSize: 9,
            marginTop: 2,
            opacity: 0.65,
            cursor: 'pointer',
            textDecoration: 'underline',
            fontFamily: "'Tajawal', sans-serif",
          }}
          dir="rtl"
        >
          افتح بطاقة
        </span>
      )}
    </button>
  )
}

function MorphologyCard({ item }) {
  const m = item.morphology
  if (!m) return null

  // Two kinds of morphology object: base form (note_ar) or derivative (affix + rule)
  return (
    <div
      className="rounded-lg p-2.5 mt-1.5 font-['Tajawal']"
      style={{
        background: 'rgba(168,85,247,0.08)',
        border: '1px solid rgba(168,85,247,0.18)',
      }}
      dir="rtl"
    >
      {m.note_ar && (
        <p style={{ color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.6 }}>
          {m.note_ar}
        </p>
      )}
      {m.affix && (
        <div className="space-y-1">
          <p style={{ color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.6 }}>
            <strong dir="ltr" style={{ fontFamily: "'Inter', system-ui", color: 'rgb(168,85,247)' }}>
              {m.base_word}
            </strong>
            {' '}
            +{' '}
            <code
              dir="ltr"
              style={{
                background: 'rgba(168,85,247,0.16)',
                color: 'rgb(168,85,247)',
                padding: '1px 6px',
                borderRadius: 4,
                fontFamily: 'ui-monospace, monospace',
                fontSize: 11,
              }}
            >
              {m.affix}
            </code>
          </p>
          {m.rule_ar && (
            <p style={{ color: 'var(--text-primary)', fontSize: 12, lineHeight: 1.6 }}>
              {m.rule_ar}
            </p>
          )}
          {Array.isArray(m.similar_examples) && m.similar_examples.length > 0 && (
            <div style={{ marginTop: 6 }}>
              <span style={{ color: 'var(--text-tertiary)', fontSize: 10 }}>
                أمثلة مشابهة:
              </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {m.similar_examples.map((ex, i) => (
                  <span
                    key={i}
                    dir="ltr"
                    className="font-['Inter']"
                    style={{
                      background: 'var(--surface-raised, rgba(255,255,255,0.05))',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border)',
                      padding: '2px 6px',
                      borderRadius: 4,
                      fontSize: 10,
                    }}
                  >
                    {ex}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
