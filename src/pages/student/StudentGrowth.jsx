import { useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Play, Pause, Sparkles, ArrowUpRight, ArrowLeft, Clock, CalendarCheck,
  BookOpenCheck, Languages, TrendingUp,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useEffectiveStudentId } from '@/stores/authStore'
import { useG } from '@/i18n/gender'
import './studentGrowth.css'

// ── «كم قطعتِ» — the evidence surface (2026-07-25) ─────────────────────────
// Adults abandon language study when progress feels invisible. Everything needed
// to prove movement already existed — 82 evaluated recordings with per-error
// detail, daily rollups, vocabulary mastery — it had simply never been shown
// back to the student.
//
// HONESTY RULE: this never claims a mistake is "fixed". It shows the score arc,
// lets the student hear their own first and latest recording, and lists the
// corrections they received as a learning ledger. Error COUNT is deliberately not
// surfaced — it often rises as speech gets longer and more ambitious, so it would
// read as regression when the opposite is true.

const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
const ar = (n) => String(n ?? 0).replace(/\d/g, (d) => AR_DIGITS[+d]).replace('.', '٫')

const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']

function recLabel(n) {
  if (n === 1) return 'تسجيل واحد'
  if (n === 2) return 'تسجيلان'
  if (n <= 10) return `${ar(n)} تسجيلات`
  return `${ar(n)} تسجيلاً`
}

function monthLabel(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${MONTHS_AR[d.getMonth()]} ${ar(d.getFullYear())}`
}

const CATEGORY_AR = {
  grammar: 'قواعد',
  vocabulary: 'مفردات',
  pronunciation: 'نطق',
  fluency: 'طلاقة',
}

function AudioCard({ label, rec, tone }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)

  function toggle() {
    const el = audioRef.current
    if (!el) return
    if (playing) { el.pause(); return }
    // Stop any other clip on the page before starting this one.
    document.querySelectorAll('audio[data-growth-clip]').forEach((a) => {
      if (a !== el) a.pause()
    })
    el.play().catch(() => setPlaying(false))
  }

  if (!rec?.audio_url) return null

  return (
    <div className={`gw-clip gw-clip--${tone}`}>
      <div className="gw-clip__head">
        <span className="gw-clip__label">{label}</span>
        <span className="gw-clip__date">{monthLabel(rec.created_at)}</span>
      </div>

      <div className="gw-clip__row">
        <button type="button" onClick={toggle} className="gw-play"
          aria-label={playing ? 'إيقاف' : 'تشغيل'}>
          {playing ? <Pause size={20} /> : <Play size={20} className="gw-play__glyph" />}
        </button>
        <div className="gw-clip__score">
          <div className="gw-clip__num">{rec.score != null ? ar(Math.round(rec.score * 10) / 10) : '—'}</div>
          <div className="gw-clip__cap">من ١٠</div>
        </div>
      </div>

      {rec.transcript && (
        <p className="gw-clip__transcript" dir="ltr">{rec.transcript}</p>
      )}

      <audio ref={audioRef} src={rec.audio_url} preload="none" playsInline
        data-growth-clip
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)} />
    </div>
  )
}

function Stat({ icon: Icon, value, label }) {
  return (
    <div className="gw-stat">
      <Icon size={16} className="gw-stat__icon" />
      <div className="gw-stat__value">{value}</div>
      <div className="gw-stat__label">{label}</div>
    </div>
  )
}

export default function StudentGrowth() {
  const studentId = useEffectiveStudentId()
  const g = useG()
  const reduce = useReducedMotion()

  const { data, isLoading } = useQuery({
    queryKey: ['student', 'growth-evidence', studentId],
    enabled: !!studentId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_student_growth_evidence', {
        p_student_id: studentId,
      })
      if (error) throw error
      return data
    },
  })

  const delta = data?.score?.delta ?? 0
  const improved = delta > 0

  const corrections = useMemo(() => (data?.corrections || []).slice(0, 8), [data])
  const expressions = useMemo(() => (data?.expressions || []).slice(0, 6), [data])

  const rise = reduce ? {} : {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  }

  if (isLoading) {
    return (
      <div className="gw-root">
        <div className="gw-atmo" aria-hidden="true" />
        <div className="gw-shell">
          <div className="gw-skel gw-skel--hero" />
          <div className="gw-skel" />
          <div className="gw-skel" />
        </div>
      </div>
    )
  }

  if (!data?.has_evidence) {
    return (
      <div className="gw-root">
        <div className="gw-atmo" aria-hidden="true" />
        <div className="gw-shell">
          <div className="gw-empty">
            <Sparkles size={30} className="gw-empty__icon" />
            <h2 className="gw-empty__title">رحلتك الصوتية لم تبدأ بعد</h2>
            <p className="gw-empty__body">
              {g('سجّل محادثتين على الأقل، وسنريك هنا كيف تغيّر صوتك بينهما.',
                 'سجّلي محادثتين على الأقل، وسنريكِ هنا كيف تغيّر صوتكِ بينهما.')}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="gw-root">
      <div className="gw-atmo" aria-hidden="true" />
      <div className="gw-atmo-grain" aria-hidden="true" />

      <div className="gw-shell">
        <motion.header className="gw-hero" {...rise}>
          <div className="gw-hero__eyebrow">الدليل</div>
          <h1 className="gw-hero__title">
            {g('كم قطعتَ', 'كم قطعتِ')}
          </h1>
          <p className="gw-hero__sub">
            <span>من {monthLabel(data.first?.created_at)}</span>
            <i className="gw-dot" aria-hidden="true" />
            <span>إلى {monthLabel(data.latest?.created_at)}</span>
            <i className="gw-dot" aria-hidden="true" />
            <span>{recLabel(data.recordings_total)}</span>
          </p>

          <div className="gw-arc">
            <div className="gw-arc__side">
              <div className="gw-arc__num gw-arc__num--then">{ar(data.score?.early_avg ?? 0)}</div>
              <div className="gw-arc__cap">في البداية</div>
            </div>
            <div className="gw-arc__mid">
              <div className={`gw-arc__delta ${improved ? 'is-up' : ''}`}>
                {improved && <ArrowUpRight size={18} />}
                <bdi dir="ltr">{improved ? '+' : '−'}{ar(Math.abs(delta))}</bdi>
              </div>
              <div className="gw-arc__rule" />
            </div>
            <div className="gw-arc__side">
              <div className="gw-arc__num gw-arc__num--now">{ar(data.score?.recent_avg ?? 0)}</div>
              <div className="gw-arc__cap">الآن</div>
            </div>
          </div>

          <p className="gw-hero__note">
            {improved
              ? g('هذا تقدّم حقيقي — قِسناه من تسجيلاتك أنت، لا من تقدير عام.',
                  'هذا تقدّم حقيقي — قِسناه من تسجيلاتكِ أنتِ، لا من تقدير عام.')
              : g('الرقم نزل قليلاً — غالباً لأن كلامك صار أطول وأجرأ. هذا طبيعي في هذه المرحلة.',
                  'الرقم نزل قليلاً — غالباً لأن كلامكِ صار أطول وأجرأ. هذا طبيعي في هذه المرحلة.')}
          </p>
        </motion.header>

        <motion.section className="gw-section" {...rise}>
          <h2 className="gw-h2">{g('استمع لنفسك', 'استمعي لنفسكِ')}</h2>
          <p className="gw-lede">
            نفس الصوت — قبل، وبعد.
          </p>
          <div className="gw-clips">
            <AudioCard label="أول تسجيل" rec={data.first} tone="then" />
            <AudioCard label="آخر تسجيل" rec={data.latest} tone="now" />
          </div>
        </motion.section>

        {corrections.length > 0 && (
          <motion.section className="gw-section" {...rise}>
            <h2 className="gw-h2">{g('ما تعلّمتَه', 'ما تعلّمتِه')}</h2>
            <p className="gw-lede">
              {g('تصحيحات وصلتك من تسجيلاتك — راجعها قبل محادثتك القادمة.',
                 'تصحيحات وصلتكِ من تسجيلاتكِ — راجعيها قبل محادثتكِ القادمة.')}
            </p>
            <div className="gw-ledger">
              {corrections.map((c, i) => (
                <div key={i} className="gw-fix">
                  <div className="gw-fix__pair">
                    <span className="gw-fix__was" dir="ltr">{c.spoken}</span>
                    <ArrowLeft size={15} className="gw-fix__arrow" aria-hidden="true" />
                    <span className="gw-fix__now" dir="ltr">{c.corrected}</span>
                  </div>
                  {c.rule && <p className="gw-fix__rule">{c.rule}</p>}
                  {c.category && (
                    <span className="gw-fix__tag">{CATEGORY_AR[c.category] || c.category}</span>
                  )}
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {expressions.length > 0 && (
          <motion.section className="gw-section" {...rise}>
            <h2 className="gw-h2">{g('عبارات ارتقيتَ بها', 'عبارات ارتقيتِ بها')}</h2>
            <p className="gw-lede">من عبارتك الأولى إلى ما يقوله متحدث أصلي.</p>
            <div className="gw-exprs">
              {expressions.map((e, i) => (
                <div key={i} className="gw-expr">
                  <div className="gw-expr__basic" dir="ltr">{e.basic}</div>
                  <div className="gw-expr__natural" dir="ltr">{e.natural}</div>
                  {e.context && <p className="gw-expr__ctx">{e.context}</p>}
                </div>
              ))}
            </div>
          </motion.section>
        )}

        <motion.section className="gw-section" {...rise}>
          <h2 className="gw-h2">أرقامك</h2>
          <div className="gw-stats">
            <Stat icon={Clock} value={ar(data.numbers?.learning_minutes)} label="دقيقة تعلّم" />
            <Stat icon={CalendarCheck} value={ar(data.numbers?.active_days)} label="يوم نشِط" />
            <Stat icon={BookOpenCheck} value={ar(data.numbers?.sections_completed)} label="قسم مكتمل" />
            <Stat icon={Languages} value={ar(data.numbers?.words_mastered)} label="كلمة أتقنتها" />
          </div>
        </motion.section>

        <motion.p className="gw-foot" {...rise}>
          <TrendingUp size={15} />
          {g('كل رقم هنا من عملك أنت. لا شيء مُقدَّر.',
             'كل رقم هنا من عملكِ أنتِ. لا شيء مُقدَّر.')}
        </motion.p>
      </div>
    </div>
  )
}
