// LISTENING-AUDIO-PLAYER-DRIFT-PROTECTION 2026-05-19
// Fallback card shown when a listening row has no audio_url yet.
// Never render a dead play button — instead show a clean "coming soon" panel
// so students aren't left wondering why play does nothing.

export function ListeningAudioComingSoon({ listening }) {
  return (
    <div
      dir="rtl"
      className="rounded-2xl px-6 py-5 text-center space-y-1.5"
      style={{
        background: 'rgba(251, 191, 36, 0.06)',
        border: '1px solid rgba(251, 191, 36, 0.2)',
      }}
    >
      <div className="text-sm font-medium font-['Tajawal']" style={{ color: 'rgba(252, 211, 77, 0.95)' }}>
        🎧 الصوت قيد التحضير
      </div>
      <div className="text-xs font-['Tajawal']" style={{ color: 'rgba(255, 255, 255, 0.55)' }}>
        هذه المحادثة ستكون متاحة للاستماع قريباً. يمكنك قراءة النص في الوقت الحالي.
      </div>
    </div>
  )
}
