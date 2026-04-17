import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, BookOpen, Swords, Trophy, Target, Flame, Users, ExternalLink, ArrowRight } from 'lucide-react'
import { useLatestCompetition } from '../../hooks/useCompetition'

/* ─── helpers ──────────────────────────────────────────────── */
const TIMELINE_EVENTS = [
  { date: '17 أبريل', label: 'إطلاق المسابقة', icon: '⚔️', key: 'start' },
  { date: '23 أبريل', label: 'نهاية الأسبوع 1 (وحدة 4)', icon: '🎯', key: 'w1' },
  { date: '24 أبريل', label: 'منتصف المسابقة', icon: '🔥', key: 'mid' },
  { date: '30 أبريل', label: 'الإغلاق + إعلان الفائز', icon: '🏆', key: 'end' },
]

const XP_TABLE = [
  {
    section: 'القراءة والاستماع والقواعد',
    color: '#38bdf8',
    rows: [
      { label: 'قراءة (نص A أو B)', xp: '+5', max: 'لكل نشاط' },
      { label: 'قواعد اللغة', xp: '+5', max: 'لكل نشاط' },
      { label: 'استماع', xp: '+5', max: 'لكل نشاط' },
    ],
  },
  {
    section: 'المفردات',
    color: '#a78bfa',
    rows: [
      { label: 'تمرين مفردات', xp: '+3', max: 'لكل تمرين' },
      { label: 'إتقان كلمة', xp: '+5', max: 'إضافي' },
    ],
  },
  {
    section: 'الكتابة',
    color: '#34d399',
    rows: [
      { label: 'تسليم نشاط كتابة', xp: '+5', max: 'لكل تسليم' },
      { label: 'تقييم AI تلقائي', xp: '+3', max: 'لكل تقييم' },
      { label: 'درجة ممتازة (8+/10)', xp: '+5', max: 'إضافي' },
    ],
  },
  {
    section: 'المحادثة',
    color: '#fbbf24',
    rows: [
      { label: 'تسجيل محادثة', xp: '+10', max: 'لكل تسجيل' },
      { label: 'تقييم AI المحادثة', xp: '+3', max: 'تلقائي' },
      { label: 'درجة ممتازة', xp: '+5', max: 'إضافي' },
    ],
  },
  {
    section: 'الوحدات والإكمال',
    color: '#f43f5e',
    rows: [
      { label: 'إكمال وحدة كاملة', xp: '+20', max: 'لكل وحدة' },
      { label: 'إكمال وحدة مستهدفة', xp: '+20', max: 'نفس المكافأة' },
    ],
  },
  {
    section: 'الألعاب',
    color: '#fb923c',
    rows: [
      { label: 'أول لعبة يومياً', xp: '+5', max: 'مرة/يوم' },
      { label: 'نتيجة مثالية', xp: '+3', max: 'إضافي' },
    ],
  },
  {
    section: 'المشاركة على السوشال',
    color: '#06b6d4',
    rows: [
      { label: 'مشاركة إنجاز', xp: '+5', max: 'لكل مشاركة' },
    ],
  },
  {
    section: 'مكافآت المدرب (Quick Points)',
    color: '#8b5cf6',
    rows: [
      { label: 'نقاط سريعة من المدرب', xp: 'متغير', max: 'حسب تقدير المدرب' },
    ],
  },
  {
    section: 'تشجيع الزملاء',
    color: '#ec4899',
    rows: [
      { label: 'إرسال تشجيع', xp: '+2', max: '5 مرات/يوم' },
      { label: 'استقبال تشجيع', xp: '+3', max: '5 مرات/يوم' },
    ],
  },
]

const BADGES = [
  { code: 'competition_april_2026_winner', icon: '🏆', name: 'بطل تحدي أبريل 2026', xp: 50, desc: 'للفريق الفائز' },
  { code: 'competition_april_2026_mvp', icon: '⭐', name: 'MVP تحدي أبريل 2026', xp: 100, desc: 'أعلى مساهم في فريقه' },
  { code: 'competition_april_2026_gold_week', icon: '🏅', name: 'أسبوع ذهبي', xp: 25, desc: 'فريقك أكمل 90%+ من الوحدة الأسبوعية' },
  { code: 'competition_april_2026_perfect_team', icon: '💎', name: 'فريق مثالي', xp: 50, desc: 'كل أعضاء الفريق أكملوا الوحدة' },
  { code: 'competition_april_2026_streak_7', icon: '🔥', name: 'ستريك الفريق 7', xp: 25, desc: 'نشاط متواصل 7 أيام' },
  { code: 'competition_april_2026_streak_14', icon: '⚡', name: 'ستريك الفريق 14', xp: 75, desc: 'نشاط متواصل 14 يوماً' },
]

const FAQS = [
  { q: 'كيف يُحدَّد الفائز؟', a: 'الفريق الحاصل على أعلى مجموع نقاط نصر (VP) في نهاية المسابقة (30 أبريل) هو الفائز. VP = مجموع XP الفريق ÷ 50.' },
  { q: 'هل XP من قبل المسابقة يُحسب؟', a: 'نعم. كل XP كسبتَه منذ بداية المسابقة (17 أبريل) يُضاف للرصيد. النقاط السابقة لا تُحسب.' },
  { q: 'ماذا لو فاتني يوم؟', a: 'لا بأس — فريقك يكمل بدونك. المهم تعود للنشاط في أسرع وقت. إذا غبتَ 2+ يوم فالستريك ينكسر لكن يمكن بناء ستريك جديد.' },
  { q: 'كيف يعمل ستريك الفريق بالضبط؟', a: '80% من أعضاء الفريق يجب أن يكونوا نشطين (لديهم أي XP) في نفس اليوم. يُحسب يومياً بتوقيت الرياض (12 منتصف الليل).' },
  { q: 'فريق A فيه 10 طلاب وفريق B فيه 7 — هل هذا عادل؟', a: 'نعم. عتبة الستريك 80% تعني 8 من 10 لفريق A، و6 من 7 لفريق B — نسبة متساوية. الهدف الأسبوعي كذلك يعتمد على النسبة المئوية.' },
  { q: 'هل أستطيع تغيير فريقي؟', a: 'لا. الفرق تحددت عند الإطلاق وتبقى ثابتة طوال المسابقة.' },
  { q: 'ماذا لو تعادل الفريقان؟', a: 'إذا تعادلت نقاط النصر تماماً، يُعلن عن تعادل شريف ويحصل الجميع على بادج المشارك.' },
  { q: 'هل النقاط التي يمنحها المدرب مشروعة؟', a: 'نعم تماماً. المدربون يملكون صلاحية منح نقاط سريعة مقابل مجهود حقيقي ويراه المدرب مناسبًا.' },
  { q: 'كيف أرسل تشجيعاً لزميل؟', a: 'من صفحة المسابقة → لوحة المتصدرين → اضغط زر التشجيع بجانب اسم أي زميل. يمكنك إرسال رسالة مخصصة.' },
  { q: 'ماذا لو فقدتُ XP أو وجدتُ خطأ؟', a: 'تواصل مع مدربك فوراً أو عبر قناة الدعم على واتساب. كل رصيد XP موثق في قاعدة البيانات.' },
  { q: 'كيف يُختار MVP؟', a: 'MVP هو الطالب الحاصل على أعلى XP فردي داخل فريقه طوال فترة المسابقة.' },
  { q: 'هل الشارات تبقى بعد نهاية المسابقة؟', a: 'نعم. جميع الشارات المكتسبة تبقى دائمة على ملفك الشخصي بعد نهاية المسابقة.' },
]

const GLOSSARY = [
  { term: 'XP (نقاط خبرة)', def: 'النقاط التي تكسبها بممارسة الأنشطة. كل 50 XP = 1 نقطة نصر للفريق.' },
  { term: 'نقاط النصر (VP)', def: 'مقياس تقدم الفريق في المسابقة. = مجموع XP الفريق ÷ 50.' },
  { term: 'الستريك الجماعي', def: 'عدد الأيام المتتالية التي نشط فيها ≥80% من أعضاء الفريق.' },
  { term: 'MVP', def: 'Most Valuable Player — الطالب الأعلى مساهمةً في فريقه.' },
  { term: 'وحدة مُكتملة', def: 'وحدة أتممتَ جميع أنشطتها (قراءة، قواعد، استماع، مفردات).' },
  { term: 'تشجيع الزملاء', def: 'رسالة تشجيع ترسلها لزميل في المسابقة. يمنح XP للطرفين.' },
  { term: 'بونص الفريق', def: 'XP إضافي يُمنح للفريق كله عند تحقيق هدف جماعي (ستريك أو هدف أسبوعي).' },
  { term: 'وحدة مستهدفة', def: 'الوحدة المحددة لكل أسبوع كهدف جماعي (أسبوع 1: وحدة 4 / أسبوع 2: وحدة 5).' },
]

/* ─── sub-components ───────────────────────────────────────── */
function SectionTitle({ icon, title, color = '#38bdf8' }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-1 h-6 rounded-full flex-shrink-0" style={{ background: color }} />
      <span className="text-lg">{icon}</span>
      <h2 className="font-black text-white text-lg">{title}</h2>
    </div>
  )
}

function Card({ children, style }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-right"
        style={{ background: open ? 'rgba(56,189,248,0.05)' : 'rgba(255,255,255,0.02)' }}
      >
        <span className="text-sm font-bold text-white">{q}</span>
        {open ? <ChevronUp size={15} className="text-slate-400 flex-shrink-0 mr-2" /> : <ChevronDown size={15} className="text-slate-400 flex-shrink-0 mr-2" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="faq-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-4 py-3 text-sm text-slate-400 leading-relaxed">{a}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── Timeline ─────────────────────────────────────────────── */
function Timeline() {
  const todayStr = new Date().toLocaleDateString('ar-SA', { day: 'numeric', month: 'long' })
  const todayKey = (() => {
    const now = new Date()
    const d = now.getDate()
    const m = now.getMonth() + 1
    if (m === 4 && d === 17) return 'start'
    if (m === 4 && d >= 24 && d < 24) return 'mid'
    if (m === 4 && d === 30) return 'end'
    if (m === 4 && d >= 24) return 'mid'
    if (m === 4 && d >= 17 && d <= 23) return 'w1'
    return null
  })()

  return (
    <div className="relative">
      {/* Line */}
      <div
        className="absolute top-4 right-4 left-4 h-px hidden sm:block"
        style={{ background: 'rgba(255,255,255,0.1)' }}
      />
      <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
        {TIMELINE_EVENTS.map((ev) => {
          const isToday = ev.key === todayKey
          return (
            <div key={ev.key} className="flex sm:flex-col items-start sm:items-center gap-3 sm:gap-2 relative z-10">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0"
                style={{
                  background: isToday ? '#38bdf8' : 'rgba(255,255,255,0.08)',
                  border: `2px solid ${isToday ? '#38bdf8' : 'rgba(255,255,255,0.12)'}`,
                  boxShadow: isToday ? '0 0 12px rgba(56,189,248,0.4)' : undefined,
                }}
              >
                {ev.icon}
              </div>
              <div className="sm:text-center">
                <div className="text-xs font-bold" style={{ color: isToday ? '#38bdf8' : '#94a3b8' }}>{ev.date}</div>
                <div className="text-xs text-slate-400">{ev.label}</div>
                {isToday && (
                  <div className="text-[10px] font-black text-sky-400 mt-0.5">← أنت هنا</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Main page ─────────────────────────────────────────────── */
export default function CompetitionRules() {
  const navigate = useNavigate()
  const { data: comp, isLoading } = useLatestCompetition()

  const secondsLeft = useMemo(() => {
    if (!comp?.end_at) return null
    return Math.max(0, Math.floor((new Date(comp.end_at).getTime() - Date.now()) / 1000))
  }, [comp])

  const countdownLabel = useMemo(() => {
    if (!secondsLeft) return null
    const days = Math.floor(secondsLeft / 86400)
    const hours = Math.floor((secondsLeft % 86400) / 3600)
    if (days > 0) return `${days} يوم و${hours} ساعة`
    if (hours > 0) return `${hours} ساعة`
    return 'أقل من ساعة!'
  }, [secondsLeft])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24" dir="rtl" style={{ fontFamily: 'Tajawal, sans-serif' }}>
        <div className="text-slate-400">جاري التحميل...</div>
      </div>
    )
  }

  if (!comp) {
    return (
      <div className="max-w-lg mx-auto py-24 text-center" dir="rtl" style={{ fontFamily: 'Tajawal, sans-serif' }}>
        <div className="text-4xl mb-4">📜</div>
        <div className="font-bold text-white text-xl mb-2">لا توجد مسابقة نشطة</div>
        <div className="text-slate-400 text-sm">ترقّب إطلاق المسابقة القادمة!</div>
      </div>
    )
  }

  return (
    <div
      className="max-w-2xl mx-auto px-4 pb-16"
      style={{ fontFamily: 'Tajawal, sans-serif' }}
      dir="rtl"
    >
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-10"
      >
        <div className="text-5xl mb-4">📜</div>
        <h1 className="text-3xl font-black text-white mb-2">قواعد المسابقة</h1>
        <div className="text-slate-400 text-sm mb-4">الدليل الشامل لتحدي طلاقة أبريل 2026</div>
        {comp.status === 'active' && countdownLabel && (
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold"
            style={{ background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.25)', color: '#38bdf8' }}
          >
            <Flame size={14} />
            ينتهي خلال {countdownLabel}
          </div>
        )}
        {comp.status === 'closed' && (
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold"
            style={{ background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.25)', color: '#f43f5e' }}
          >
            انتهت المسابقة
          </div>
        )}
      </motion.div>

      <div className="space-y-8">
        {/* Mechanics */}
        <Card>
          <SectionTitle icon="⚙️" title="آلية المسابقة" color="#38bdf8" />
          <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
            <p>فريقان يتنافسان على مدى <strong className="text-white">أسبوعين</strong> (17–30 أبريل). كل XP يكسبه الطالب يُضاف لرصيد فريقه. في النهاية، الفريق الأعلى <strong className="text-white">نقاطاً نصراً (VP)</strong> ينتصر.</p>
            <p><strong className="text-sky-400">VP = مجموع XP الفريق ÷ 50.</strong> كل 50 XP = نقطة نصر واحدة.</p>
            <p>الفائز يُعلن فوراً بعد الإغلاق في <strong className="text-white">30 أبريل الساعة 11:59 مساءً</strong> بتوقيت الرياض.</p>
          </div>
        </Card>

        {/* Timeline */}
        <Card>
          <SectionTitle icon="📅" title="الجدول الزمني" color="#fbbf24" />
          <Timeline />
        </Card>

        {/* XP Table */}
        <div>
          <SectionTitle icon="📊" title="جدول مصادر XP الكامل" color="#a78bfa" />
          <div className="space-y-3">
            {XP_TABLE.map((sec) => (
              <div key={sec.section} className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${sec.color}25` }}>
                <div className="px-4 py-2.5 text-xs font-black" style={{ background: `${sec.color}15`, color: sec.color }}>
                  {sec.section}
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)' }}>
                  {sec.rows.map((row, ri) => (
                    <div
                      key={row.label}
                      className="grid grid-cols-3 px-4 py-2.5 text-sm"
                      style={{ borderTop: ri > 0 ? '1px solid rgba(255,255,255,0.04)' : undefined }}
                    >
                      <span className="text-slate-300 col-span-1">{row.label}</span>
                      <span className="font-black text-center" style={{ color: sec.color }}>{row.xp}</span>
                      <span className="text-slate-500 text-xs text-left">{row.max}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Team bonuses */}
        <Card>
          <SectionTitle icon="🔥" title="مكافآت الفريق الجماعية" color="#fb923c" />
          <div className="space-y-5 text-sm">
            {/* Streak */}
            <div>
              <div className="font-bold text-white mb-2">1. ستريك الفريق اليومي</div>
              <div className="text-xs text-slate-400 mb-3">يُنشَّط عندما 80% من الفريق نشط في نفس اليوم</div>
              <div className="grid grid-cols-2 gap-2">
                {[{d:3,xp:75},{d:5,xp:200},{d:7,xp:500},{d:14,xp:1500}].map(m => (
                  <div key={m.d} className="rounded-xl p-3 text-center" style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.2)' }}>
                    <div className="text-xs text-slate-400">{m.d} أيام متتالية</div>
                    <div className="text-lg font-black text-orange-400">+{m.xp} XP</div>
                  </div>
                ))}
              </div>
            </div>
            {/* Weekly goal */}
            <div>
              <div className="font-bold text-white mb-2">2. تحدي الوحدة الأسبوعية</div>
              <div className="text-xs text-slate-400 mb-3">يُقيَّم في نهاية كل أسبوع</div>
              <div className="space-y-1.5">
                {[{pct:50,xp:150,icon:'🥉'},{pct:70,xp:400,icon:'🥈'},{pct:90,xp:800,icon:'🏅'},{pct:100,xp:1200,icon:'💎'}].map(t => (
                  <div key={t.pct} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'rgba(34,197,94,0.06)' }}>
                    <div className="flex items-center gap-2">
                      <span>{t.icon}</span>
                      <span className="text-slate-300 text-xs">{t.pct}% من الفريق يكمل الوحدة</span>
                    </div>
                    <span className="font-black text-green-400 text-sm">+{t.xp} XP</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Badges */}
        <div>
          <SectionTitle icon="🏅" title="الشارات والمكافآت" color="#fbbf24" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {BADGES.map((b) => (
              <div
                key={b.code}
                className="rounded-2xl p-4 flex items-start gap-3"
                style={{ background: 'rgba(245,200,66,0.06)', border: '1px solid rgba(245,200,66,0.15)' }}
              >
                <span className="text-3xl flex-shrink-0">{b.icon}</span>
                <div>
                  <div className="font-bold text-white text-sm">{b.name}</div>
                  <div className="text-xs text-slate-400">{b.desc}</div>
                  <div className="text-xs text-yellow-400 mt-1 font-bold">+{b.xp} XP</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div>
          <SectionTitle icon="❓" title="الأسئلة الشائعة" color="#38bdf8" />
          <div className="space-y-2">
            {FAQS.map((faq) => (
              <FAQItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>

        {/* Glossary */}
        <Card>
          <SectionTitle icon="📖" title="المصطلحات" color="#a78bfa" />
          <div className="space-y-3">
            {GLOSSARY.map((g) => (
              <div key={g.term} className="flex gap-3">
                <div className="text-purple-400 font-bold text-sm w-44 flex-shrink-0">{g.term}</div>
                <div className="text-slate-400 text-sm">{g.def}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Related links */}
        <div className="flex flex-wrap gap-2 justify-center pt-2">
          <button
            onClick={() => navigate('/student/competition')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-sky-400"
            style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)' }}
          >
            <Swords size={14} />
            لوحة المسابقة
          </button>
          <button
            onClick={() => navigate('/student/how-to-earn')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-slate-400"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <Target size={14} />
            كيف تكسب XP
          </button>
          <button
            onClick={() => navigate('/student')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-slate-400"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <ArrowRight size={14} />
            الرئيسية
          </button>
        </div>
      </div>
    </div>
  )
}
