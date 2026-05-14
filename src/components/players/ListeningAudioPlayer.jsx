import { useState, useRef } from 'react'
import { InteractivePassage } from './InteractivePassage'

// item: { id, title_en, title_ar, transcript, audio_url, word_timestamps, audio_type }
export function ListeningAudioPlayer({ item }) {
  const [transcriptHidden, setTranscriptHidden] = useState(true)
  const [currentTimeMs, setCurrentTimeMs] = useState(0)
  const audioRef = useRef(null)

  return (
    <div className="space-y-6">
      <header dir="rtl" className="flex items-start justify-between gap-4">
        <div>
          {(item.title_ar || item.title_en) && (
            <h2 className="text-xl font-bold text-[var(--text-primary)] font-['Tajawal']">
              {item.title_ar || item.title_en}
            </h2>
          )}
          {item.audio_type && (
            <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 font-['Inter']">
              {item.audio_type}
            </span>
          )}
        </div>
        {item.transcript && (
          <button
            onClick={() => setTranscriptHidden(v => !v)}
            className="flex-shrink-0 px-3 py-1.5 text-sm rounded-lg bg-[var(--surface-raised)] border border-[var(--border-subtle)] hover:bg-[rgba(255,255,255,0.05)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors font-['Tajawal']"
          >
            {transcriptHidden ? 'إظهار النص' : 'إخفاء النص'}
          </button>
        )}
      </header>

      {item.audio_url && (
        <div className="rounded-2xl bg-[var(--surface-raised)] border border-[var(--border-subtle)] p-4">
          <audio
            ref={audioRef}
            src={item.audio_url}
            onTimeUpdate={(e) => setCurrentTimeMs(e.currentTarget.currentTime * 1000)}
            controls
            className="w-full"
            dir="ltr"
          />
        </div>
      )}

      {item.transcript && !transcriptHidden && (
        <InteractivePassage
          content={item.transcript}
          audioUrl={item.audio_url}
          wordTimestampsJson={item.word_timestamps}
          currentTimeMs={currentTimeMs}
        />
      )}
    </div>
  )
}
