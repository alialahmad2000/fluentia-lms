import { useState } from 'react'
import { Headphones } from 'lucide-react'
import { ListeningPlayer } from './ListeningPlayer'
import { ListeningAudioComingSoon } from './ListeningAudioComingSoon'
import { DriftChip } from './DriftChip'
import { InteractivePassage } from '../InteractivePassage'

const AUDIO_TYPE_LABELS = {
  interview: 'مقابلة',
  dialogue: 'محادثة',
  monologue: 'حديث فردي',
  lecture: 'محاضرة',
}

/**
 * Premium listening section layout.
 * Handles: section header, before-listen notice, transcript toggle owned by
 * the player, ListeningPlayer (sticky), and exercise slot.
 *
 * LISTENING-AUDIO-PLAYER-DRIFT-PROTECTION 2026-05-19:
 *  - Transcript HIDDEN by default — students practice listening first
 *  - "إظهار النص" toggle is now owned by the player (Phase D requirement)
 *  - ListeningAudioComingSoon fallback when audio_url is null — never dead-button
 *  - DriftChip surfaces stale audio to admins/trainers during impersonation
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
          <div className="flex items-center gap-2 flex-wrap">
            <Headphones size={15} style={{ color: 'var(--accent-sky)', flexShrink: 0 }} />
            <span
              className="text-xs font-bold font-['Tajawal'] uppercase tracking-wide"
              style={{ color: 'var(--accent-sky)' }}
            >
              الاستماع
            </span>
            {/* Admin-only drift chip — students never see it */}
            <DriftChip transcript={listening.transcript} storedHash={listening.source_text_hash} />
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
      </div>

      {/* ── Transcript — HIDDEN by default; revealed via the player's toggle ── */}
      {listening.transcript && transcriptHidden && (
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
            يمكنك إظهار النص من زر "إظهار النص" داخل المشغّل بالأسفل.
          </p>
        </div>
      )}
      {listening.transcript && !transcriptHidden && (
        renderTranscript ? renderTranscript() : (
          <InteractivePassage
            content={listening.transcript}
            audioUrl={listening.audio_url}
            wordTimestampsJson={listening.word_timestamps}
            unitId={unitId}
          />
        )
      )}

      {/* ── Player / fallback ── */}
      {!audioLoading && listening.audio_url && (
        <ListeningPlayer
          audioUrl={listening.audio_url}
          speakerSegments={speakerSegments}
          durationMs={durationMs}
          transcriptShown={!transcriptHidden}
          onTranscriptToggle={() => setTranscriptHidden((v) => !v)}
          listeningId={listening.id}
        />
      )}
      {!audioLoading && !listening.audio_url && <ListeningAudioComingSoon listening={listening} />}
      {audioLoading && <div className="h-4" aria-hidden="true" />}

      {/* ── Exercises slot ── */}
      {children && <div className="space-y-4 mt-2">{children}</div>}
    </div>
  )
}
