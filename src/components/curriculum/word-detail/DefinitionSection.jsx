import { Languages, Volume2 } from 'lucide-react'

/**
 * DefinitionSection — Arabic definition + English example sentence.
 * Audio for the example sentence is rendered when the production schema
 * exposes one (currently it doesn't — there's only word.audio_url). We
 * fall back to playing the word's audio if the host wants.
 */
export default function DefinitionSection({ word, onPlayAudio }) {
  if (!word) return null
  return (
    <section
      className="space-y-3"
      style={{ marginBottom: 20 }}
      dir="rtl"
    >
      <SectionHeading icon={<Languages size={14} />} label="التعريف" />

      <p
        className="font-['Tajawal']"
        dir="rtl"
        style={{
          color: 'var(--text-primary, #faf5e6)',
          fontSize: 18,
          lineHeight: 1.5,
        }}
      >
        {word.definition_ar ? word.definition_ar : (
          <span style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>—</span>
        )}
      </p>

      {word.example_sentence ? (
        <div
          className="rounded-xl"
          style={{
            background: 'var(--surface, rgba(255,255,255,0.04))',
            border: '1px solid var(--border, rgba(255,255,255,0.08))',
            padding: 12,
          }}
        >
          <div
            className="font-['Tajawal']"
            style={{
              color: 'var(--text-tertiary, rgba(255,255,255,0.55))',
              fontSize: 11,
              marginBottom: 6,
            }}
          >
            جملة مثال
          </div>
          <div className="flex items-start gap-2.5">
            {word.audio_url && (
              <button
                type="button"
                onClick={() => onPlayAudio?.(word.audio_url)}
                className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center mt-0.5"
                style={{
                  background: 'var(--surface-raised, rgba(255,255,255,0.05))',
                  color: 'var(--text-tertiary)',
                  border: '1px solid var(--border)',
                }}
                aria-label="استمع للنطق"
              >
                <Volume2 size={14} />
              </button>
            )}
            <p
              dir="ltr"
              style={{
                color: 'var(--text-secondary, rgba(255,255,255,0.75))',
                fontSize: 15,
                lineHeight: 1.5,
                fontStyle: 'italic',
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            >
              {word.example_sentence}
            </p>
          </div>
        </div>
      ) : null}
    </section>
  )
}

function SectionHeading({ icon, label }) {
  return (
    <div
      className="flex items-center gap-1.5 font-['Tajawal'] font-bold"
      style={{
        color: 'var(--text-secondary, rgba(255,255,255,0.75))',
        fontSize: 13,
        opacity: 0.85,
      }}
    >
      <span style={{ color: 'var(--text-tertiary)' }}>{icon}</span>
      <span>{label}</span>
    </div>
  )
}
