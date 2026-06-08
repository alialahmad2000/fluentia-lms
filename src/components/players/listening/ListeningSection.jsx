import { useState } from 'react'
import { motion } from 'framer-motion'
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
      {/* ── Cinematic hero (topic image) — premium banner; graceful text fallback ── */}
      {listening.image_url ? (
        <div dir="rtl" className="relative overflow-hidden rounded-2xl" style={{ border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 18px 50px -24px rgba(0,0,0,0.75)' }}>
          <motion.img
            src={listening.image_url}
            alt=""
            initial={{ scale: 1.09 }}
            animate={{ scale: 1 }}
            transition={{ duration: 9, ease: 'easeOut' }}
            className="w-full h-44 sm:h-60 object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(6,14,28,0.10) 0%, rgba(6,14,28,0.34) 48%, rgba(6,14,28,0.90) 100%)' }} />
          <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 space-y-1.5">
            <div className="flex items-center gap-2">
              <Headphones size={14} style={{ color: '#7dd3fc', flexShrink: 0 }} />
              <span className="text-[11px] font-bold font-['Tajawal'] uppercase tracking-wide" style={{ color: '#7dd3fc' }}>الاستماع</span>
              <DriftChip transcript={listening.transcript} storedHash={listening.source_text_hash} />
            </div>
            {(listening.title_ar || listening.title_en) && (
              <h2 className="text-lg sm:text-2xl font-bold font-['Tajawal'] leading-snug" style={{ color: '#fff', textShadow: '0 2px 14px rgba(0,0,0,0.55)' }}>
                {listening.title_ar || listening.title_en}
              </h2>
            )}
            {listening.audio_type && (
              <span className="inline-block text-[10px] font-bold px-2.5 py-1 rounded-lg font-['Tajawal']" style={{ background: 'rgba(56,189,248,0.18)', color: '#bae6fd', border: '1px solid rgba(56,189,248,0.32)', backdropFilter: 'blur(6px)' }}>
                {typeLabel}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div dir="rtl" className="flex items-start justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Headphones size={15} style={{ color: 'var(--accent-sky)', flexShrink: 0 }} />
              <span className="text-xs font-bold font-['Tajawal'] uppercase tracking-wide" style={{ color: 'var(--accent-sky)' }}>
                الاستماع
              </span>
              {/* Admin-only drift chip — students never see it */}
              <DriftChip transcript={listening.transcript} storedHash={listening.source_text_hash} />
            </div>
            {(listening.title_ar || listening.title_en) && (
              <h2 className="text-xl font-bold font-['Tajawal'] leading-snug" style={{ color: 'var(--text-primary)' }}>
                {listening.title_ar || listening.title_en}
              </h2>
            )}
            {listening.audio_type && (
              <span className="inline-block text-[10px] font-bold px-2.5 py-1 rounded-lg font-['Tajawal']" style={{ background: 'var(--info-bg)', color: 'var(--accent-sky)', border: '1px solid var(--info-border)' }}>
                {typeLabel}
              </span>
            )}
          </div>
        </div>
      )}

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
