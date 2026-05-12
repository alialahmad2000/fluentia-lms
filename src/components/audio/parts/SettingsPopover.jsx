/**
 * SettingsPopover — comprehensive settings dropdown for the slim sticky bar.
 * Appears above the gear icon, anchored bottom-right.
 */
import { useRef, useEffect, useState } from 'react'
import { X, Bookmark, Volume2 } from 'lucide-react'
import { getBackgroundPlaybackPref, setBackgroundPlaybackPref } from '../hooks/useAudioNavigationPause'

function ToggleRow({ label, desc, checked, onChange, disabled }) {
  return (
    <label className={`flex items-center justify-between gap-3 py-2 ${disabled ? 'opacity-40' : 'cursor-pointer'}`}>
      <div className="min-w-0">
        <p className="text-sm text-slate-200 font-['Tajawal']">{label}</p>
        {desc && <p className="text-[11px] text-slate-500 mt-0.5 font-['Tajawal']">{desc}</p>}
      </div>
      <button
        onClick={disabled ? undefined : () => onChange(!checked)}
        className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${checked ? 'bg-sky-500' : 'bg-white/15'}`}
        role="switch"
        aria-checked={checked}
      >
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`}/>
      </button>
    </label>
  )
}

export function SettingsPopover({
  onClose, localFeatures, onToggleFeature,
  karaokeEnabled, onKaraokeToggle,
  markerA, markerB, isLooping,
  onSetMarkerA, onSetMarkerB, onClearMarkers, onToggleLoop,
  bookmarks, onAddBookmark, onRemoveBookmark, onJumpToBookmark,
  currentTime, dictation, fmt,
}) {
  const ref = useRef(null)
  const [bgPlay, setBgPlay] = useState(() => getBackgroundPlaybackPref())

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const fmtMs = (ms) => {
    if (ms === null || ms === undefined) return '--:--'
    return fmt ? fmt(ms) : `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`
  }

  return (
    <div
      ref={ref}
      className="absolute bottom-full right-0 mb-2 w-72 rounded-2xl shadow-2xl z-[61]"
      style={{
        background: 'rgba(8,14,28,0.97)',
        border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
      }}
      dir="rtl"
    >
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-white/[0.06]">
        <h3 className="text-sm font-semibold text-slate-100 font-['Tajawal']">إعدادات المشغّل</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-white p-1"><X size={15}/></button>
      </div>

      <div className="px-4 py-2 space-y-0 divide-y divide-white/[0.05]">
        {/* Karaoke */}
        <ToggleRow label="تفعيل الكاريوكي" checked={karaokeEnabled} onChange={onKaraokeToggle}/>

        {/* Sentence mode */}
        <ToggleRow label="وضع الجملة" desc="توقف تلقائي بعد كل جملة" checked={localFeatures.sentenceMode} onChange={() => onToggleFeature('sentenceMode')}/>

        {/* A-B loop */}
        <div className="py-2">
          <p className="text-sm text-slate-200 mb-2 font-['Tajawal']">تكرار A-B</p>
          <div className="flex items-center gap-2" dir="ltr">
            <button
              onClick={() => onSetMarkerA(currentTime)}
              className={`px-2 py-1 text-[11px] rounded font-mono transition-colors ${markerA !== null ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white'}`}
            >A: {fmtMs(markerA)}</button>
            <button
              onClick={() => onSetMarkerB(currentTime)}
              className={`px-2 py-1 text-[11px] rounded font-mono transition-colors ${markerB !== null ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white'}`}
            >B: {fmtMs(markerB)}</button>
            {markerA !== null && markerB !== null && (
              <button
                onClick={onToggleLoop}
                className={`px-2 py-1 text-[11px] rounded transition-colors ${isLooping ? 'bg-amber-400/30 text-amber-300' : 'bg-white/5 text-slate-400 hover:text-white'}`}
              >⟳</button>
            )}
            {(markerA !== null || markerB !== null) && (
              <button onClick={onClearMarkers} className="text-[11px] text-slate-500 hover:text-slate-300 font-['Tajawal']">مسح</button>
            )}
          </div>
        </div>

        {/* Bookmarks */}
        {localFeatures.bookmarks && (
          <div className="py-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-200 font-['Tajawal']">الإشارات{bookmarks.length > 0 ? ` (${bookmarks.length})` : ''}</p>
              <button
                onClick={() => onAddBookmark(currentTime)}
                className="text-[11px] text-sky-400 hover:text-sky-300 font-['Tajawal']"
              >+ إضافة</button>
            </div>
            {bookmarks.length > 0 && (
              <ul className="space-y-1">
                {bookmarks.map(bm => (
                  <li key={bm.id} className="flex items-center gap-2 group" dir="ltr">
                    <button onClick={() => onJumpToBookmark(bm.id)} className="flex-1 text-left text-xs py-1 px-2 rounded hover:bg-white/5 transition-colors text-slate-300">
                      <Bookmark size={11} className="inline mr-1 text-yellow-400"/>
                      {fmtMs(bm.position_ms)}
                    </button>
                    <button onClick={() => onRemoveBookmark(bm.id)} className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 px-1 text-xs">✕</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Dictation */}
        {localFeatures.dictation && (
          <div className="py-2">
            {!dictation?.active ? (
              <button
                onClick={dictation?.start}
                className="w-full py-2 rounded-xl bg-violet-500/10 text-violet-300 text-sm hover:bg-violet-500/20 transition-colors font-['Tajawal']"
              >
                📝 ابدأ وضع الإملاء
              </button>
            ) : (
              <button
                onClick={dictation?.stop}
                className="w-full py-2 rounded-xl bg-red-500/10 text-red-300 text-sm font-['Tajawal']"
              >
                إيقاف وضع الإملاء
              </button>
            )}
          </div>
        )}

        {/* Background playback */}
        <ToggleRow
          label="متابعة التشغيل في الخلفية"
          desc="استمرار الصوت عند مغادرة الصفحة"
          checked={bgPlay}
          onChange={(v) => { setBackgroundPlaybackPref(v); setBgPlay(v) }}
        />

        {/* IELTS one-play (listening) */}
        {localFeatures.onePlayMode !== undefined && (
          <ToggleRow
            label="وضع الامتحان IELTS"
            desc="تشغيل مرة واحدة فقط — محاكاة الاختبار"
            checked={localFeatures.onePlayMode}
            onChange={() => onToggleFeature('onePlayMode')}
          />
        )}
      </div>
    </div>
  )
}
