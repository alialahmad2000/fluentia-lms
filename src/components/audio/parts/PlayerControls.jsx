import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Loader2 } from 'lucide-react'

function Btn({ onClick, title, className = '', children }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex items-center justify-center rounded-full transition-colors ${className}`}
    >
      {children}
    </button>
  )
}

export function PlayerControls({
  isPlaying, isLoading,
  playbackRate, RATES,
  onToggle, onSkip, onSetRate,
  onPrevSegment, onNextSegment,
  hasSegments,
  karaokeEnabled, onKaraokeToggle,
  showTranscript, onTranscriptToggle,
  volume, onVolumeToggle,
  features,
}) {
  const ctrlCls = 'w-9 h-9 text-slate-300 hover:text-white hover:bg-white/10'

  return (
    <div className="flex items-center gap-1 px-4 py-3 flex-wrap justify-center" dir="ltr">

      {/* Skip back 10s */}
      {features.skipButtons && (
        <Btn onClick={() => onSkip(-10000)} title="رجوع 10 ثوانٍ" className={ctrlCls}>
          <span className="text-[11px] font-bold leading-none">10<br/><SkipBack size={10} className="inline"/></span>
        </Btn>
      )}

      {/* Prev segment */}
      {features.paragraphNav && hasSegments && (
        <Btn onClick={onPrevSegment} title="الفقرة السابقة" className={ctrlCls}>
          <SkipBack size={18}/>
        </Btn>
      )}

      {/* Play/Pause */}
      <Btn
        onClick={onToggle}
        title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
        className="w-12 h-12 bg-sky-500 hover:bg-sky-400 text-white rounded-full"
      >
        {isLoading
          ? <Loader2 size={20} className="animate-spin"/>
          : isPlaying
            ? <Pause size={20}/>
            : <Play size={20}/>
        }
      </Btn>

      {/* Next segment */}
      {features.paragraphNav && hasSegments && (
        <Btn onClick={onNextSegment} title="الفقرة التالية" className={ctrlCls}>
          <SkipForward size={18}/>
        </Btn>
      )}

      {/* Skip forward 10s */}
      {features.skipButtons && (
        <Btn onClick={() => onSkip(10000)} title="تقدم 10 ثوانٍ" className={ctrlCls}>
          <span className="text-[11px] font-bold leading-none"><SkipForward size={10} className="inline"/><br/>10</span>
        </Btn>
      )}

      {/* Divider */}
      <div className="w-px h-6 mx-1" style={{ background: 'rgba(255,255,255,0.1)' }} />

      {/* Volume */}
      <Btn onClick={onVolumeToggle} title="صوت" className={ctrlCls}>
        {volume > 0 ? <Volume2 size={16}/> : <VolumeX size={16}/>}
      </Btn>

      {/* Speed */}
      {features.speedControl && (
        <button
          onClick={() => {
            const idx = RATES.indexOf(playbackRate)
            onSetRate(RATES[(idx + 1) % RATES.length])
          }}
          className="px-2 py-1 text-xs font-mono rounded text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          title="سرعة التشغيل"
          dir="ltr"
        >
          {playbackRate}x
        </button>
      )}

      {/* Karaoke toggle */}
      {features.karaoke && (
        <Btn
          onClick={onKaraokeToggle}
          title="كاريوكي"
          className={`${ctrlCls} text-[13px] font-bold ${karaokeEnabled ? 'text-sky-400' : 'text-slate-500'}`}
        >
          K
        </Btn>
      )}

      {/* Hide transcript */}
      {features.hideTranscript && (
        <Btn
          onClick={onTranscriptToggle}
          title={showTranscript ? 'إخفاء النص' : 'إظهار النص'}
          className={`${ctrlCls} ${!showTranscript ? 'text-slate-500' : ''}`}
        >
          <span className="text-[13px]">👁</span>
        </Btn>
      )}
    </div>
  )
}
