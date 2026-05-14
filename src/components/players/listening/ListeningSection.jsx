import { useState } from 'react'
import { Headphones } from 'lucide-react'
import { ListeningPlayer } from './ListeningPlayer'
import { InteractivePassage } from '../InteractivePassage'

const AUDIO_TYPE_LABELS = {
  interview: 'مقابلة',
  dialogue: 'محادثة',
  monologue: 'حديث فردي',
  lecture: 'محاضرة',
}

/**
 * Premium listening section layout.
 * Handles: section header, before-listen notice, transcript toggle,
 * ListeningPlayer (sticky), and exercise slot.
 *
 * Props:
 *   listening        — the curriculum_listening row
 *   unitId           — for InteractivePassage vocab lookup
 *   audioLoading     — shows skeleton while segments load
 *   renderTranscript — () => ReactNode, optional override for interactive transcript
 *   children         — rendered below the player (exercises)
 */
export function ListeningSection({
  listening,
  unitId,
  audioLoading = false,
  renderTranscript,
  children,
}) {
  // All hooks before any conditional return
  const [transcriptHidden, setTranscriptHidden] = useState(true)

  const speakerSegments = (() => {
    const raw = listening.speaker_segments
    if (Array.isArray(raw)) return raw
    if (typeof raw === 'string') { try { return JSON.parse(raw) } catch { return [] } }
    return []
  })()

  const durationMs =
    listening.audio_duration_ms ||
    (listening.audio_duration_seconds ? listening.audio_duration_seconds * 1000 : undefined)

  const typeLabel = AUDIO_TYPE_LABELS[listening.audio_type] || listening.audio_type

  return (
    <div className="space-y-5">
      {/* ── Section header ── */}
      <div dir="rtl" className="flex items-start justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2">
            <Headphones size={15} style={{ color: 'var(--accent-sky)', flexShrink: 0 }} />
            <span
              className="text-xs font-bold font-['Tajawal'] uppercase tracking-wide"
              style={{ color: 'var(--accent-sky)' }}
            >
              الاستماع
            </span>
          </div>

          {(listening.title_ar || listening.title_en) && (
            <h2
              className="text-xl font-bold font-['Tajawal'] leading-snug"
              style={{ color: 'var(--text-primary)' }}
            >
              {listening.title_ar || listening.title_en}
            </h2>
          )}

          {listening.audio_type && (
            <span
              className="inline-block text-[10px] font-bold px-2.5 py-1 rounded-lg font-['Tajawal']"
              style={{
                background: 'var(--info-bg)',
                color: 'var(--accent-sky)',
                border: '1px solid var(--info-border)',
              }}
            >
              {typeLabel}
            </span>
          )}
        </div>

        {listening.transcript && (
          <button
            onClick={() => setTranscriptHidden(v => !v)}
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-['Tajawal'] transition-colors"
            style={{
              background: transcriptHidden ? 'transparent' : 'var(--info-bg)',
              border: `1px solid ${transcriptHidden ? 'var(--border-subtle)' : 'var(--info-border)'}`,
              color: transcriptHidden ? 'var(--text-muted)' : 'var(--accent-sky)',
            }}
          >
            {transcriptHidden ? 'إظهار النص' : 'إخفاء النص'}
          </button>
        )}
      </div>

      {/* ── Transcript / before-listen notice ── */}
      {listening.transcript && (
        transcriptHidden ? (
          <div
            className="rounded-2xl p-6 text-center space-y-1"
            style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
            dir="rtl"
          >
            <p className="text-sm font-['Tajawal']" style={{ color: 'var(--text-muted)' }}>
              استمع للمقطع وحاول الإجابة بدون قراءة النص.
            </p>
            <p
              className="text-xs font-['Tajawal']"
              style={{ color: 'var(--text-muted)', opacity: 0.65 }}
            >
              يمكنك إظهار النص في أي وقت من الزر أعلاه.
            </p>
          </div>
        ) : (
          renderTranscript ? renderTranscript() : (
            <InteractivePassage
              content={listening.transcript}
              audioUrl={listening.audio_url}
              wordTimestampsJson={listening.word_timestamps}
              unitId={unitId}
            />
          )
        )
      )}

      {/* ── ListeningPlayer — sticky at bottom of content column ── */}
      {audioLoading ? (
        <div
          className="h-[140px] rounded-3xl animate-pulse"
          style={{ background: 'var(--surface-raised)' }}
        />
      ) : listening.audio_url ? (
        <ListeningPlayer
          audioUrl={listening.audio_url}
          speakerSegments={speakerSegments}
          durationMs={durationMs}
        />
      ) : null}

      {/* ── Exercises slot ── */}
      {children && <div className="space-y-4 mt-2">{children}</div>}
    </div>
  )
}
