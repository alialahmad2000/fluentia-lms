import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { NotebookPen, Play, Pause, Mic, Sparkles, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useG } from '@/i18n/gender'

// ── دفتر عباراتي — the personal phrasebook ──────────────────────────────────
// Mined automatically from the student's own speaking recordings: what they
// said vs how a native says it, with the corrected sentence voiced in
// Dr. Ali's own (cloned) voice. Entries appear after the weekly build; no
// student action needed beyond doing speaking tasks.

const CATEGORY_META = {
  grammar:       { label: 'قواعد',        cls: 'text-amber-300 bg-amber-500/10 border-amber-500/25' },
  word_choice:   { label: 'اختيار كلمة', cls: 'text-sky-300 bg-sky-500/10 border-sky-500/25' },
  expression:    { label: 'تعبير',        cls: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/25' },
  pronunciation: { label: 'نطق',          cls: 'text-violet-300 bg-violet-500/10 border-violet-500/25' },
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
    <div dir="rtl" className="max-w-2xl mx-auto space-y-6 p-4 sm:p-6" style={{ fontFamily: 'Tajawal, sans-serif' }}>
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center shrink-0">
          <NotebookPen className="w-5 h-5 text-sky-300" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">دفتر عباراتي</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            {g(
              'لفتات من تسجيلاتك الصوتية: ما قلته، وكيف يقولها المتحدث الأصلي — بصوت مدرّبك',
              'لفتات من تسجيلاتكِ الصوتية: ما قلتِه، وكيف يقولها المتحدث الأصلي — بصوت مدرّبكِ',
            )}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-2xl h-32 bg-white/[0.03] border border-white/[0.06] animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] py-14 px-6 text-center">
          <Mic className="w-10 h-10 mx-auto mb-4 text-slate-500" />
          <p className="text-slate-300 font-medium mb-1.5">
            {g('دفترك ينتظر صوتك', 'دفتركِ ينتظر صوتكِ')}
          </p>
          <p className="text-sm text-slate-400 leading-relaxed max-w-sm mx-auto">
            {g(
              'أكمل تمارين المحادثة في وحداتك، وكل أسبوع نلتقط من تسجيلاتك عبارات تستحق الحفظ — مع الصياغة الأصلية بصوت مدرّبك.',
              'أكملي تمارين المحادثة في وحداتكِ، وكل أسبوع نلتقط من تسجيلاتكِ عبارات تستحق الحفظ — مع الصياغة الأصلية بصوت مدرّبكِ.',
            )}
          </p>
          <Link
            to="/student/curriculum"
            className="inline-flex items-center gap-2 mt-5 px-4 h-11 rounded-xl text-sm font-bold"
            style={{ background: 'rgba(56,189,248,0.14)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.35)' }}
          >
            إلى المنهج <ArrowLeft size={15} />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {entries.map((e, i) => {
              const cat = CATEGORY_META[e.category] || CATEGORY_META.expression
              return (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.3, ease: 'easeOut' }}
                  className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 sm:p-5"
                >
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${cat.cls}`}>{cat.label}</span>
                    <span className="text-[11px] text-slate-500">{fmtDateAr(e.created_at)}</span>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <span className="text-[11px] font-bold text-slate-500 mt-0.5 shrink-0 w-12">{g('قلتَ', 'قلتِ')}</span>
                      <p className="text-[15px] text-slate-400 leading-relaxed" dir="ltr" style={{ textAlign: 'left' }}>
                        {e.said_text}
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="text-[11px] font-bold text-sky-400 mt-1 shrink-0 w-12">الأصح</span>
                      <div className="flex-1 flex items-start gap-2.5">
                        <p className="flex-1 text-[16px] text-white font-medium leading-relaxed" dir="ltr" style={{ textAlign: 'left' }}>
                          {e.native_text}
                        </p>
                        {e.audio_url && (
                          <button
                            onClick={() => togglePlay(e)}
                            aria-label={g('استمع بصوت المدرب', 'استمعي بصوت المدرب')}
                            className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-colors"
                            style={playingId === e.id
                              ? { background: 'rgba(56,189,248,0.25)', color: '#7dd3fc', border: '1px solid rgba(56,189,248,0.5)' }
                              : { background: 'rgba(56,189,248,0.12)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)' }}
                          >
                            {playingId === e.id ? <Pause size={17} /> : <Play size={17} style={{ marginInlineStart: 2 }} />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {e.note_ar && (
                    <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-start gap-2">
                      <Sparkles size={13} className="text-amber-300/80 mt-0.5 shrink-0" />
                      <p className="text-[13px] text-slate-300 leading-relaxed">{e.note_ar}</p>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
