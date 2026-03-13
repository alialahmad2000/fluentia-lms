import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, Quote, Users, Globe, TrendingUp, Award, ArrowLeft, ChevronDown } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

// ─── Supabase (lazy — doesn't throw if env vars missing on public page) ───────
let supabaseClient = null
async function getSupabase() {
  if (supabaseClient) return supabaseClient
  try {
    const { supabase } = await import('../../lib/supabase')
    supabaseClient = supabase
    return supabaseClient
  } catch {
    return null
  }
}

// ─── Sample / Placeholder Testimonials ───────────────────────────────────────
const SAMPLE_TESTIMONIALS = [
  {
    id: 1,
    student_name: 'سارة م.',
    quote: 'بعد ٨ أشهر مع Fluentia تحولت من A1 إلى B2. كنت أخاف أتكلم بالإنجليزية قدام أي أحد، والحين أقدر أقدم نفسي وأتناقش في أي موضوع بثقة كاملة.',
    rating: 5,
    level_from: 'A1',
    level_to: 'B2',
    created_at: '2025-11-10',
    is_approved: true,
    featured: true,
  },
  {
    id: 2,
    student_name: 'خالد ع.',
    quote: 'المدرب ما يعامل الطلاب كأرقام. يعرف نقاط ضعفي بالتحديد ويشتغل عليها. التطور اللي صار عندي في ٤ أشهر ما صار في سنين من المحاولات الثانية.',
    rating: 5,
    level_from: 'A2',
    level_to: 'B1',
    created_at: '2025-12-01',
    is_approved: true,
    featured: true,
  },
  {
    id: 3,
    student_name: 'نورة ف.',
    quote: 'اشتركت عشان أحضّر لمقابلة عمل، وطلعت من المقابلة بثقة ما توقعتها. الأساليب اللي تعلمتها في Fluentia غيّرت طريقة تفكيري بالإنجليزية كلها.',
    rating: 5,
    level_from: 'B1',
    level_to: 'B2',
    created_at: '2026-01-15',
    is_approved: true,
    featured: false,
  },
  {
    id: 4,
    student_name: 'عبدالرحمن ق.',
    quote: 'كنت مقتنع إن الإنجليزية مو لي. لكن بعد الشهر الأول حسيت بفرق حقيقي. الأسلوب التدريبي مختلف كلياً عن أي دورة جربتها قبل.',
    rating: 5,
    level_from: 'A1',
    level_to: 'A2',
    created_at: '2026-01-28',
    is_approved: true,
    featured: false,
  },
  {
    id: 5,
    student_name: 'ريم ح.',
    quote: 'الـ LMS نفسه تجربة ممتعة — الواجبات والمتابعة والتقارير كل شيء في مكان واحد. شعرت إن مسيرتي منظمة ومدعومة طوال الوقت.',
    rating: 5,
    level_from: 'A2',
    level_to: 'B2',
    created_at: '2026-02-10',
    is_approved: true,
    featured: true,
  },
  {
    id: 6,
    student_name: 'فيصل ط.',
    quote: 'ما توقعت أكمل أكثر من شهرين في أي دورة، لكن مع Fluentia وصلت الشهر العاشر. الشغف اللي يجيبه المدرب يخلي التعلم ممتعاً مو مجهداً.',
    rating: 5,
    level_from: 'A1',
    level_to: 'B1',
    created_at: '2026-02-20',
    is_approved: true,
    featured: false,
  },
]

const CEFR_COLORS = {
  A1: 'from-red-500 to-orange-400',
  A2: 'from-orange-400 to-yellow-400',
  B1: 'from-yellow-400 to-green-400',
  B2: 'from-green-400 to-sky-400',
  C1: 'from-sky-400 to-violet-500',
  C2: 'from-violet-500 to-purple-400',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function StarRating({ rating, size = 16 }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          className={s <= rating ? 'text-amber-400 fill-amber-400' : 'text-white/15 fill-white/5'}
        />
      ))}
    </div>
  )
}

function LevelJourney({ from, to }) {
  const fromColor = CEFR_COLORS[from] || 'from-white/30 to-white/10'
  const toColor   = CEFR_COLORS[to]   || 'from-sky-400 to-violet-500'
  return (
    <div className="flex items-center gap-2 text-sm font-bold">
      <span className={`px-2 py-0.5 rounded-full bg-gradient-to-r ${fromColor} text-white text-xs`}>
        {from}
      </span>
      <ArrowLeft size={12} className="text-white/30 rotate-180" />
      <span className={`px-2 py-0.5 rounded-full bg-gradient-to-r ${toColor} text-white text-xs`}>
        {to}
      </span>
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────
function TestimonialCard({ t, index }) {
  const initial   = t.student_name?.charAt(0) || '؟'
  const dateLabel = t.created_at
    ? new Date(t.created_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long' })
    : ''

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: (index % 3) * 0.1 }}
      className="relative group glass-card p-6 flex flex-col gap-4 hover:border-sky-500/30 transition-all duration-300"
    >
      {/* Quote icon */}
      <Quote
        size={28}
        className="absolute top-4 left-4 text-sky-500/15 rotate-180"
        aria-hidden
      />

      {/* Quote text */}
      <p className="text-white/75 leading-relaxed text-sm pt-4 flex-1">
        "{t.quote}"
      </p>

      {/* Rating */}
      <StarRating rating={t.rating} />

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-white/5">
        <div className="flex items-center gap-3">
          {/* Avatar placeholder */}
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-500/30 to-violet-500/30 border border-white/10 flex items-center justify-center text-sm font-bold text-sky-300 shrink-0">
            {initial}
          </div>
          <div>
            <p className="text-white/90 text-sm font-semibold">{t.student_name || 'طالب'}</p>
            {dateLabel && <p className="text-white/30 text-xs">{dateLabel}</p>}
          </div>
        </div>
        {t.level_from && t.level_to && (
          <LevelJourney from={t.level_from} to={t.level_to} />
        )}
      </div>
    </motion.div>
  )
}

// ─── Stats Banner ─────────────────────────────────────────────────────────────
function StatsBanner({ count }) {
  const stats = [
    { icon: Users,     value: count ? `${count}+` : '٢٠٠+', label: 'طالب يثق بنا' },
    { icon: Star,      value: '4.9',                          label: 'متوسط التقييم' },
    { icon: Globe,     value: '٥+',                           label: 'دول مختلفة' },
    { icon: TrendingUp,value: '٥',                            label: 'مستويات CEFR' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map(({ icon: Icon, value, label }, i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, scale: 0.85 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.1, duration: 0.4 }}
          className="glass-card p-5 text-center flex flex-col items-center gap-2"
        >
          <Icon size={22} className="text-sky-400" />
          <span className="text-2xl font-bold text-white">{value}</span>
          <span className="text-xs text-white/40">{label}</span>
        </motion.div>
      ))}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Testimonials() {
  const [sortBy, setSortBy] = useState('date') // 'date' | 'rating'
  const [showAll, setShowAll] = useState(false)

  // Attempt to fetch from DB; gracefully fall back to samples if table missing
  const { data: dbTestimonials, isLoading } = useQuery({
    queryKey: ['public-testimonials'],
    queryFn: async () => {
      const sb = await getSupabase()
      if (!sb) return null
      const { data, error } = await sb
        .from('testimonials')
        .select('id, student_name, quote, rating, level_from, level_to, is_approved, created_at, featured')
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
      if (error) return null // table might not exist yet
      return data && data.length > 0 ? data : null
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  const rawList = dbTestimonials ?? SAMPLE_TESTIMONIALS

  const sorted = [...rawList].sort((a, b) => {
    if (sortBy === 'rating') return b.rating - a.rating
    return new Date(b.created_at) - new Date(a.created_at)
  })

  const displayed = showAll ? sorted : sorted.slice(0, 6)

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-darkest text-white font-tajawal selection:bg-sky-500/30 overflow-x-hidden"
      style={{
        background: 'radial-gradient(ellipse at 50% -10%, rgba(56,189,248,0.14) 0%, #060e1c 55%)',
      }}
    >
      {/* ── Background blobs ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-violet-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-0 w-[400px] h-[400px] bg-sky-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-20">

        {/* ── Hero ── */}
        <motion.section
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-5 pt-6"
        >
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="text-sky-400 text-sm font-semibold tracking-widest uppercase"
          >
            Fluentia Academy
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="text-4xl md:text-5xl font-bold leading-tight"
          >
            قصص نجاح طلابنا
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-white/50 text-lg max-w-2xl mx-auto leading-relaxed"
          >
            كل رحلة بدأت بخطوة واحدة. هؤلاء الطلاب قرروا أن تكون تلك الخطوة مع
            <span className="text-sky-400 font-semibold"> Fluentia</span>،
            وها هم اليوم يتحدثون بثقة لم يتخيلوها.
          </motion.p>

          {/* Sort control */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
            className="flex items-center justify-center gap-2 pt-2"
          >
            <span className="text-white/30 text-sm">ترتيب حسب:</span>
            <button
              onClick={() => setSortBy('date')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                sortBy === 'date'
                  ? 'bg-sky-500/20 border border-sky-500/40 text-sky-300'
                  : 'text-white/40 hover:text-white/60 border border-white/10'
              }`}
            >
              الأحدث
            </button>
            <button
              onClick={() => setSortBy('rating')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                sortBy === 'rating'
                  ? 'bg-sky-500/20 border border-sky-500/40 text-sky-300'
                  : 'text-white/40 hover:text-white/60 border border-white/10'
              }`}
            >
              الأعلى تقييماً
            </button>
          </motion.div>
        </motion.section>

        {/* ── Stats Banner ── */}
        <section>
          <StatsBanner count={rawList.length > 6 ? rawList.length : null} />
        </section>

        {/* ── Testimonials Grid ── */}
        <section className="space-y-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="skeleton h-52 rounded-2xl" />
              ))}
            </div>
          ) : (
            <>
              <AnimatePresence mode="wait">
                <motion.div
                  key={sortBy}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
                >
                  {displayed.map((t, i) => (
                    <TestimonialCard key={t.id} t={t} index={i} />
                  ))}
                </motion.div>
              </AnimatePresence>

              {/* Show more */}
              {!showAll && sorted.length > 6 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  className="flex justify-center pt-4"
                >
                  <button
                    onClick={() => setShowAll(true)}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 text-white/50 hover:text-white hover:border-white/25 transition-all duration-200 text-sm"
                  >
                    <ChevronDown size={16} />
                    عرض المزيد من القصص
                  </button>
                </motion.div>
              )}
            </>
          )}
        </section>

        {/* ── Levels Info Strip ── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card p-6 space-y-4"
        >
          <div className="flex items-center gap-2 text-white/70">
            <Award size={18} className="text-sky-400" />
            <span className="font-semibold text-sm">رحلة CEFR — من المبتدئ إلى المتقن</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {['A1', 'A2', 'B1', 'B2', 'C1'].map((lvl) => (
              <div key={lvl} className="text-center space-y-1">
                <div className={`mx-auto w-12 h-12 rounded-full bg-gradient-to-br ${CEFR_COLORS[lvl]} flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
                  {lvl}
                </div>
                <p className="text-white/40 text-xs">
                  {lvl === 'A1' && 'مبتدئ'}
                  {lvl === 'A2' && 'أساسي'}
                  {lvl === 'B1' && 'متوسط'}
                  {lvl === 'B2' && 'متقدم'}
                  {lvl === 'C1' && 'متميز'}
                </p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ── CTA Section ── */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-6 py-6"
        >
          <div className="space-y-3">
            <h2 className="text-3xl md:text-4xl font-bold">
              ابدأ رحلتك
            </h2>
            <p className="text-white/50 text-lg">
              اكتشف مستواك الحقيقي في دقيقتين — مجاناً وفورياً
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/test"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl text-lg font-bold
                         bg-gradient-to-l from-sky-500 to-sky-600
                         shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40
                         transition-shadow duration-300 text-center"
            >
              اختبر مستواك مجاناً
            </Link>
            <a
              href="https://wa.me/966558669974"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl text-lg font-bold
                         bg-white/5 border border-white/15
                         hover:bg-white/10 hover:border-white/25
                         transition-all duration-300 text-center"
            >
              احجز لقاء مبدئي مجاني مع المدرب
            </a>
          </div>

          <p className="text-white/25 text-sm">+966 55 866 9974</p>
        </motion.section>

        {/* ── Footer Social ── */}
        <motion.footer
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center space-y-2 pb-8 border-t border-white/5 pt-8"
        >
          <p className="text-3xl font-playfair text-sky-400">Fluentia</p>
          <p className="text-white/30 text-sm">
            TikTok: @fluentia_ &nbsp;|&nbsp; Instagram: @fluentia__
          </p>
          <p className="text-white/15 text-xs">
            © {new Date().getFullYear()} Fluentia Academy — جميع الحقوق محفوظة
          </p>
        </motion.footer>

      </div>
    </div>
  )
}
