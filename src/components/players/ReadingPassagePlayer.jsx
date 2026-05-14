import { useRef } from 'react'
import { InteractivePassage } from './InteractivePassage'
import { StickyAudioBar } from './StickyAudioBar'

/**
 * passage: { id, title_en, title_ar, content }
 * audio:   { full_audio_url, word_timestamps, full_duration_ms } | null
 * unitId:  string — required for vocab word highlighting
 */
export function ReadingPassagePlayer({ passage, audio, unitId }) {
  const audioRef = useRef(null)

  return (
    <div className="space-y-4 pb-36">
      <header dir="rtl">
        {passage.title_ar && (
          <h2 className="text-2xl font-bold text-[var(--text-primary)] font-['Tajawal']">{passage.title_ar}</h2>
        )}
        {passage.title_en && (
          <p className="text-sm text-[var(--text-secondary)] mt-1 font-['Inter']" dir="ltr">{passage.title_en}</p>
        )}
        {unitId && (
          <p className="text-xs text-[var(--text-muted)] mt-2 font-['Tajawal']" dir="rtl">
            الكلمات الذهبية من مفردات الوحدة — ترجمتها ظاهرة تحتها. انقر على أي كلمة لسماع نطقها.
          </p>
        )}
      </header>

      <InteractivePassage
        content={passage.content}
        audioUrl={audio?.full_audio_url}
        wordTimestampsJson={audio?.word_timestamps}
        unitId={unitId}
      />

      {audio?.full_audio_url && (
        <>
          <audio
            ref={audioRef}
            src={audio.full_audio_url}
            preload="metadata"
            playsInline
            style={{ display: 'none' }}
          />
          <StickyAudioBar audioRef={audioRef} showABRepeat={false} />
        </>
      )}
    </div>
  )
}
