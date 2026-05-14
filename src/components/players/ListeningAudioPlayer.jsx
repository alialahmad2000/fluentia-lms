import { useState, useRef } from 'react'
import { InteractivePassage } from './InteractivePassage'
import { StickyAudioBar } from './StickyAudioBar'

/**
 * item:   { id, title_en, title_ar, transcript, audio_url, word_timestamps, audio_type }
 * unitId: string — required for vocab word highlighting in transcript
 */
export function ListeningAudioPlayer({ item, unitId }) {
  const [transcriptHidden, setTranscriptHidden] = useState(true)
  const audioRef = useRef(null)

  return (
    <div className="space-y-4 pb-36">
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
            className="flex-shrink-0 px-3 py-1.5 text-sm rounded-lg border transition-colors font-['Tajawal']"
            style={{
              background: 'var(--surface-raised)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
            }}
          >
            {transcriptHidden ? 'إظهار النص' : 'إخفاء النص'}
          </button>
        )}
      </header>

      {item.transcript && !transcriptHidden && (
        <InteractivePassage
          content={item.transcript}
          audioUrl={item.audio_url}
          wordTimestampsJson={item.word_timestamps}
          unitId={unitId}
        />
      )}

      {item.transcript && transcriptHidden && (
        <div
          className="rounded-2xl p-8 text-center"
          style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
          dir="rtl"
        >
          <p className="text-sm font-['Tajawal']" style={{ color: 'var(--text-muted)' }}>
            استمع للمقطع وحاول الإجابة بدون قراءة النص.
          </p>
          <p className="text-xs mt-1 font-['Tajawal']" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
            يمكنك إظهار النص في أي وقت من الزر أعلاه.
          </p>
        </div>
      )}

      {item.audio_url && (
        <>
          <audio
            ref={audioRef}
            src={item.audio_url}
            preload="metadata"
            playsInline
            style={{ display: 'none' }}
          />
          <StickyAudioBar audioRef={audioRef} showABRepeat={true} />
        </>
      )}
    </div>
  )
}
