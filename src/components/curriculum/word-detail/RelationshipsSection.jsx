import { RefreshCw, Repeat } from 'lucide-react'

// CEFR level color palette (cefr-level field is numeric 1..5 in production)
const LEVEL_COLORS = {
  1: { bg: 'rgba(34,197,94,0.18)',  text: 'rgb(34,197,94)',  label: 'A1' },
  2: { bg: 'rgba(16,185,129,0.18)', text: 'rgb(16,185,129)', label: 'A2' },
  3: { bg: 'rgba(56,189,248,0.18)', text: 'rgb(56,189,248)', label: 'B1' },
  4: { bg: 'rgba(245,158,11,0.18)', text: 'rgb(245,158,11)', label: 'B2' },
  5: { bg: 'rgba(239,68,68,0.18)',  text: 'rgb(239,68,68)',  label: 'C1' },
}

function clampLevel(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return 3
  if (v < 1) return 1
  if (v > 5) return 5
  return Math.round(v)
}

/**
 * RelationshipsSection — synonyms + antonyms chips.
 *
 * Production JSONB item shape (verified Phase A.2):
 *   { word, level, is_strongest, vocabulary_id }
 * NOT: cefr_level, NOT: known_word_id.
 */
export default function RelationshipsSection({ synonyms, antonyms, onOpenRelated }) {
  const hasSyn = Array.isArray(synonyms) && synonyms.length > 0
  const hasAnt = Array.isArray(antonyms) && antonyms.length > 0

  return (
    <section style={{ marginBottom: 20 }} dir="rtl">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RelGroup
          icon={<RefreshCw size={14} />}
          label="مرادفات"
          items={hasSyn ? synonyms : []}
          emptyMsg="ما عندنا مرادفات لهالكلمة بعد"
          onOpenRelated={onOpenRelated}
        />
        <RelGroup
          icon={<Repeat size={14} />}
          label="متضادات"
          items={hasAnt ? antonyms : []}
          emptyMsg="ما عندنا متضادات لهالكلمة بعد"
          onOpenRelated={onOpenRelated}
        />
      </div>
    </section>
  )
}

function RelGroup({ icon, label, items, emptyMsg, onOpenRelated }) {
  return (
    <div className="space-y-2">
      <div
        className="flex items-center gap-1.5 font-['Tajawal'] font-bold"
        style={{ color: 'var(--text-secondary)', fontSize: 13 }}
      >
        <span style={{ color: 'var(--text-tertiary)' }}>{icon}</span>
        <span>{label}</span>
      </div>
      {items.length === 0 ? (
        <p
          className="font-['Tajawal']"
          style={{
            color: 'var(--text-tertiary)',
            fontSize: 12,
            fontStyle: 'italic',
          }}
        >
          {emptyMsg}
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item, i) => {
            const lvl = clampLevel(item.level)
            const c = LEVEL_COLORS[lvl]
            const isStrongest = item.is_strongest === true
            const known = !!item.vocabulary_id
            return (
              <button
                key={`${item.word}-${i}`}
                type="button"
                disabled={!known}
                onClick={() => {
                  if (known && onOpenRelated) onOpenRelated(item.vocabulary_id)
                }}
                className="inline-flex items-center gap-1.5 font-['Inter']"
                style={{
                  background: known
                    ? 'var(--surface-raised, rgba(255,255,255,0.06))'
                    : 'var(--surface, rgba(255,255,255,0.04))',
                  border: known
                    ? '1px solid rgba(168,85,247,0.30)'
                    : '1px solid var(--border, rgba(255,255,255,0.08))',
                  color: 'var(--text-primary)',
                  padding: '4px 10px',
                  borderRadius: 9999,
                  fontSize: 13,
                  cursor: known ? 'pointer' : 'default',
                  transition: 'background 160ms ease',
                }}
                dir="ltr"
              >
                {isStrongest && (
                  <span aria-label="strongest synonym" style={{ color: '#fbbf24' }}>⭐</span>
                )}
                <span>{item.word}</span>
                <span
                  className="font-['Tajawal']"
                  style={{
                    background: c.bg,
                    color: c.text,
                    padding: '1px 6px',
                    borderRadius: 6,
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                  dir="ltr"
                >
                  {c.label}
                </span>
                {known && (
                  <span
                    className="font-['Tajawal']"
                    title="تعرفها"
                    style={{
                      background: 'rgba(34,197,94,0.15)',
                      color: 'rgb(34,197,94)',
                      padding: '1px 5px',
                      borderRadius: 6,
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                    dir="rtl"
                  >
                    ✓
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
