import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { NotebookPen, Play, Pause, Mic, Sparkles, ArrowLeft, Volume2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useG } from '@/i18n/gender'
import './phrasebook/phrasebook.css'

// ── دفتر عباراتي — the personal phrasebook ──────────────────────────────────
// Mined automatically from the student's own speaking recordings: what they
// said vs how a native says it, with the corrected sentence voiced in
// Dr. Ali's own (cloned) voice. Entries appear after the weekly build; no
// student action needed beyond doing speaking tasks.

const CATEGORY_META = {
  grammar:       { label: 'قواعد' },
  word_choice:   { label: 'اختيار كلمة' },
  expression:    { label: 'تعبير' },
  pronunciation: { label: 'نطق' },
}

function fmtDateAr(s) {
  try { return new Date(s).toLocaleDateString('ar', { day: 'numeric', month: 'long' }) } catch { return '' }
}

export default function StudentPhrasebook() {
  const g = useG()
  const profile = useAuthStore((s) => s.profile)
  const [playingId, setPlayingId] = useState(null)
  const audioRef = useRef(null)

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['phrasebook', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('phrasebook_entries')
        .select('*')
        .eq('student_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) throw error
      return data || []
    },
  })

  const voicedCount = entries.filter((e) => e.audio_url).length

  const togglePlay = (entry) => {
    if (!entry.audio_url) return
    if (playingId === entry.id) {
      audioRef.current?.pause()
      setPlayingId(null)
      return
    }
    audioRef.current?.pause()
    const a = new Audio(entry.audio_url)
    audioRef.current = a
    a.onended = () => setPlayingId(null)
    a.onerror = () => setPlayingId(null)
    a.play().then(() => setPlayingId(entry.id)).catch(() => setPlayingId(null))
  }

  return (
    <div dir="rtl" className="pbx-root" style={{ fontFamily: 'Tajawal, sans-serif' }}>
      {/* atmosphere */}
      <div className="pbx-atmo" aria-hidden="true">
        <div className="pbx-atmo__beam" />
        <div className="pbx-atmo__blob" />
      </div>

      <div className="pbx-content max-w-2xl mx-auto space-y-6 p-4 sm:p-6">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="pbx-hero"
        >
          <div className="pbx-hero__row">
            <div className="pbx-hero__crest"><NotebookPen size={25} strokeWidth={2.1} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 className="pbx-hero__title">دفتر عباراتي</h1>
              <p className="pbx-hero__sub">
                {g(
                  'لفتات من تسجيلاتك الصوتية: ما قلته، وكيف يقولها المتحدث الأصلي — بصوت مدرّبك.',
                  'لفتات من تسجيلاتكِ الصوتية: ما قلتِه، وكيف يقولها المتحدث الأصلي — بصوت مدرّبكِ.',
                )}
              </p>
            </div>
          </div>

          {entries.length > 0 && (
            <div className="pbx-hero__stats">
              <span className="pbx-stat">
                <Sparkles size={15} className="pbx-stat__ic" />
                <span><span className="pbx-stat__n">{entries.length}</span> <span className="pbx-stat__l">{entries.length >= 3 && entries.length <= 10 ? 'عبارات محفوظة' : 'عبارة محفوظة'}</span></span>
              </span>
              {voicedCount > 0 && (
                <span className="pbx-stat">
                  <Volume2 size={15} className="pbx-stat__ic" />
                  <span><span className="pbx-stat__n">{voicedCount}</span> <span className="pbx-stat__l">بصوت مدرّبك</span></span>
                </span>
              )}
            </div>
          )}
        </motion.section>

        {isLoading ? (
          <div className="pbx-list">
            {[...Array(3)].map((_, i) => <div key={i} className="pbx-skel" />)}
          </div>
        ) : entries.length === 0 ? (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="pbx-empty"
          >
            <div className="pbx-empty__orb"><Mic size={28} strokeWidth={2} /></div>
            <p className="pbx-empty__t">{g('دفترك ينتظر صوتك', 'دفتركِ ينتظر صوتكِ')}</p>
            <p className="pbx-empty__d">
              {g(
                'أكمل تمارين المحادثة في وحداتك، وكل أسبوع نلتقط من تسجيلاتك عبارات تستحق الحفظ — مع الصياغة الأصلية بصوت مدرّبك.',
                'أكملي تمارين المحادثة في وحداتكِ، وكل أسبوع نلتقط من تسجيلاتكِ عبارات تستحق الحفظ — مع الصياغة الأصلية بصوت مدرّبكِ.',
              )}
            </p>
            <Link to="/student/curriculum" className="pbx-empty__cta">
              إلى المنهج <ArrowLeft size={16} />
            </Link>
          </motion.section>
        ) : (
          <div>
            <div className="pbx-eyebrow">
              <span className="pbx-eyebrow__spark" />
              <span className="pbx-eyebrow__label">عباراتك</span>
              <span className="pbx-eyebrow__rule" />
              <span className="pbx-eyebrow__count">{entries.length}</span>
            </div>

            <div className="pbx-list">
              <AnimatePresence initial={false}>
                {entries.map((e, i) => {
                  const cat = CATEGORY_META[e.category] || CATEGORY_META.expression
                  const catKey = CATEGORY_META[e.category] ? e.category : 'expression'
                  return (
                    <motion.div
                      key={e.id}
                      data-cat={catKey}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      className="pbx-card"
                    >
                      <div className="pbx-card__top">
                        <span className={`pbx-cat pbx-cat--${catKey}`}>{cat.label}</span>
                        <span className="pbx-card__date">{fmtDateAr(e.created_at)}</span>
                      </div>

                      <div className="pbx-line">
                        <span className="pbx-line__tag pbx-line__tag--said">{g('قلتَ', 'قلتِ')}</span>
                        <p className="pbx-line__said" dir="ltr" style={{ textAlign: 'left' }}>{e.said_text}</p>
                      </div>
                      <div className="pbx-line">
                        <span className="pbx-line__tag pbx-line__tag--right">الأصح</span>
                        <div className="pbx-right-wrap">
                          <p className="pbx-line__right" dir="ltr" style={{ textAlign: 'left' }}>{e.native_text}</p>
                          {e.audio_url && (
                            <button
                              onClick={() => togglePlay(e)}
                              aria-label={g('استمع بصوت المدرب', 'استمعي بصوت المدرب')}
                              className="pbx-play"
                              data-playing={playingId === e.id}
                            >
                              {playingId === e.id ? <Pause size={16} /> : <Play size={16} style={{ marginInlineStart: 2 }} />}
                            </button>
                          )}
                        </div>
                      </div>

                      {e.note_ar && (
                        <div className="pbx-note">
                          <Sparkles size={13} className="pbx-note__ic" />
                          <p className="pbx-note__t">{e.note_ar}</p>
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
