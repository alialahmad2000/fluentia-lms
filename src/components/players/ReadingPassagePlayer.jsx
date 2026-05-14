import { useState, useRef } from 'react'
import { InteractivePassage } from './InteractivePassage'

// passage: { id, title_en, title_ar, content }  (content = paragraphs joined by \n\n)
// audio:   { full_audio_url, word_timestamps, full_duration_ms } | null
// Reading has NO hide-text toggle — the passage is always visible.
export function ReadingPassagePlayer({ passage, audio }) {
  const [currentTimeMs, setCurrentTimeMs] = useState(0)
  const audioRef = useRef(null)

  return (
    <div className="space-y-6">
      <header dir="rtl">
        {passage.title_ar && (
          <h2 className="text-2xl font-bold text-[var(--text-primary)] font-['Tajawal']">{passage.title_ar}</h2>
        )}
        {passage.title_en && (
          <p className="text-sm text-[var(--text-secondary)] mt-1 font-['Inter']" dir="ltr">{passage.title_en}</p>
        )}
      </header>

      {audio?.full_audio_url && (
        <div className="rounded-2xl bg-[var(--surface-raised)] border border-[var(--border-subtle)] p-4">
          <audio
            ref={audioRef}
            src={audio.full_audio_url}
            onTimeUpdate={(e) => setCurrentTimeMs(e.currentTarget.currentTime * 1000)}
            controls
            className="w-full"
            dir="ltr"
          />
          <p className="text-xs text-[var(--text-muted)] mt-2 text-right font-['Tajawal']" dir="rtl">
            انقر على أي كلمة لرؤية الترجمة وسماع نطقها
          </p>
        </div>
      )}

      <InteractivePassage
        content={passage.content}
        audioUrl={audio?.full_audio_url}
        wordTimestampsJson={audio?.word_timestamps}
        currentTimeMs={currentTimeMs}
      />
    </div>
  )
}
