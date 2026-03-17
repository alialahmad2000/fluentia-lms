import { Play, Pause } from 'lucide-react'
import { useRef, useState } from 'react'

export default function AudioPreview({ value, onChange, label }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)

  const toggle = () => {
    if (!audioRef.current || !value) return
    if (playing) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setPlaying(!playing)
  }

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>
          {label}
        </label>
      )}
      <div className="flex items-center gap-2">
        <input
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder="رابط الصوت (URL)"
          className="flex-1 px-3 py-2 rounded-lg text-sm"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'var(--text-primary)',
            fontFamily: 'Tajawal',
          }}
          dir="ltr"
        />
        {value && (
          <button
            onClick={toggle}
            className="p-2 rounded-lg"
            style={{ background: 'rgba(56,189,248,0.15)', color: '#38bdf8' }}
          >
            {playing ? <Pause size={16} /> : <Play size={16} />}
          </button>
        )}
      </div>
      {value && <audio ref={audioRef} src={value} onEnded={() => setPlaying(false)} />}
    </div>
  )
}
