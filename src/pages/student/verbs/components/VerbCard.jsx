import { useRef, useState } from 'react'
import { Volume2, Play } from 'lucide-react'
import { motion } from 'framer-motion'

export default function VerbCard({ verb }) {
  const audioRef = useRef(null)
  const [playingForm, setPlayingForm] = useState(null)
  const [playingAll, setPlayingAll] = useState(false)

  const playAudio = (url, form) => {
    if (audioRef.current) audioRef.current.pause()
    if (!url) return
    setPlayingForm(form)
    audioRef.current = new Audio(url)
    audioRef.current.onended = () => setPlayingForm(null)
    audioRef.current.onerror = () => setPlayingForm(null)
    audioRef.current.play().catch(() => setPlayingForm(null))
  }

  const playAll = async () => {
    if (playingAll) return
    setPlayingAll(true)
    const urls = [
      { url: verb.audio_base_url, form: 'base' },
      { url: verb.audio_past_url, form: 'past' },
      { url: verb.audio_pp_url, form: 'pp' },
    ].filter(u => u.url)

    for (const { url, form } of urls) {
      setPlayingForm(form)
      await new Promise(resolve => {
        const a = new Audio(url)
        a.onended = () => setTimeout(resolve, 500)
        a.onerror = resolve
        a.play().catch(resolve)
      })
    }
    setPlayingForm(null)
    setPlayingAll(false)
  }

  const forms = [
    { label: 'Base', labelAr: 'المصدر', value: verb.verb_base, audioUrl: verb.audio_base_url, form: 'base' },
    { label: 'Past', labelAr: 'الماضي', value: verb.verb_past, audioUrl: verb.audio_past_url, form: 'past' },
    { label: 'Past Part.', labelAr: 'التصريف الثالث', value: verb.verb_past_participle, audioUrl: verb.audio_pp_url, form: 'pp' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-xl p-6 hover:border-sky-500/30 transition-colors"
    >
      {/* 3 forms row */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {forms.map(f => (
          <div key={f.form} className="text-center">
            <p className="text-xl font-bold text-[var(--text-primary)] font-['Inter']">
              {f.value}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">{f.labelAr}</p>
            {f.audioUrl && (
              <button
                onClick={() => playAudio(f.audioUrl, f.form)}
                className={`mt-2 w-9 h-9 rounded-full inline-flex items-center justify-center transition-colors ${
                  playingForm === f.form
                    ? 'bg-sky-500 text-white'
                    : 'bg-sky-500/10 text-sky-400 hover:bg-sky-500/20'
                }`}
              >
                <Volume2 size={16} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Arabic meaning */}
      <p className="text-base font-['Tajawal'] text-[var(--text-secondary)] mb-1">
        {verb.meaning_ar}
      </p>

      {/* Example sentence */}
      {verb.example_sentence && (
        <p className="text-sm text-[var(--text-muted)] italic font-['Inter']">
          "{verb.example_sentence}"
        </p>
      )}

      {/* Play All button */}
      <button
        onClick={playAll}
        disabled={playingAll}
        className={`mt-4 flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-colors ${
          playingAll
            ? 'bg-sky-500/20 text-sky-300'
            : 'bg-sky-500/10 text-sky-400 hover:bg-sky-500/20'
        }`}
      >
        <Play size={14} />
        {playingAll ? 'جاري التشغيل...' : 'تشغيل الكل'}
      </button>
    </motion.div>
  )
}
