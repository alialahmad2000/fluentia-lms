import { useNavigate } from 'react-router-dom'
import { Target, Swords, ChevronRight } from 'lucide-react'
import { useActiveCompetition } from '../../hooks/useCompetition'

/* ─── helpers ──────────────────────────────────────────────── */
function daysRemaining(sec) {
  return Math.ceil((sec ?? 0) / 86400)
}

/* ─── Card ─────────────────────────────────────────────────── */
function EarnCard({ icon, title, items, tip, maxXP, accent = '#38bdf8' }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        fontFamily: 'Tajawal, sans-serif',
      }}
      dir="rtl"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <span className="font-bold text-white text-sm">{title}</span>
        </div>
        {maxXP && (
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{
              background: 'var(--ds-xp-gold-bg, rgba(245,200,66,0.12))',
              border: '1px solid var(--ds-xp-gold-border, rgba(245,200,66,0.3))',
              color: 'var(--ds-xp-gold-fg, #f5c842)',
            }}
          >
            أقصى {maxXP}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {items.map(({ label, xp }) => (
          <div key={label} className="flex items-center justify-between text-sm">
            <span className="text-slate-300">{label}</span>
            <span
              className="font-bold tabular-nums"
              style={{ color: 'var(--ds-xp-gold-fg, #f5c842)' }}
            >
              +{xp} XP
            </span>
          </div>
        ))}
      </div>

      {tip && (
        <div
          className="mt-3 pt-3 text-xs text-slate-500 flex items-start gap-1.5"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          <span>💡</span>
          <span>{tip}</span>
        </div>
      )}
    </div>
  )
}

function BonusSection({ title, items, color = '#38bdf8' }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: `${color}08`,
        border: `1px solid ${color}20`,
        fontFamily: 'Tajawal, sans-serif',
      }}
      dir="rtl"
    >
      <div className="font-bold text-white text-sm mb-3">{title}</div>
      <div className="space-y-2">
        {items.map(({ label, xp, badge }) => (
          <div key={label} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="text-slate-300">{label}</span>
              {badge && (
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: color + '25', color, border: `1px solid ${color}40` }}
                >
                  {badge}
                </span>
              )}
            </div>
            <span className="font-bold tabular-nums" style={{ color }}>+{xp} XP</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const EARN_SECTIONS = [
  {
    icon: '📖',
    title: 'القراءة',
    items: [
      { label: 'قراءة القسم A', xp: 5 },
      { label: 'قراءة القسم B', xp: 5 },
    ],
    tip: 'أكمل القسمين لتكمل الوحدة',
  },
  {
    icon: '📝',
    title: 'الكتابة',
    maxXP: '+13 XP',
    items: [
      { label: 'تسليم أول', xp: 5 },
      { label: 'تقييم AI (تلقائي)', xp: 3 },
      { label: 'درجة ممتازة 9+/10', xp: 5 },
    ],
    tip: 'اكتب بعناية — كل تفصيلة تُحتسب',
  },
  {
    icon: '🎤',
    title: 'المحادثة',
    maxXP: '+18 XP/سؤال',
    items: [
      { label: 'أول تسجيل لكل سؤال', xp: 10 },
      { label: 'تقييم AI (تلقائي)', xp: 3 },
      { label: 'درجة ممتازة 9+/10', xp: 5 },
    ],
    tip: 'تحدث بوضوح — كل سؤال فرصة لكسب XP',
  },
  {
    icon: '👂',
    title: 'الاستماع',
    items: [
      { label: 'إكمال + حل الأسئلة', xp: 5 },
    ],
  },
  {
    icon: '📚',
    title: 'القواعد',
    items: [
      { label: 'إكمال التمارين', xp: 5 },
    ],
  },
  {
    icon: '💎',
    title: 'المفردات',
    maxXP: '+23+ XP',
    items: [
      { label: 'كل تمرين ناجح', xp: 3 },
      { label: 'إتقان كلمة (3/3 تمارين)', xp: 5 },
      { label: 'إتقان كل كلمات الوحدة', xp: 15 },
    ],
    tip: 'كلما تمرنت أكثر، كسبت أكثر',
  },
  {
    icon: '⭐',
    title: 'الوحدة',
    items: [
      { label: 'إكمال 100%', xp: 20 },
      { label: 'نجمة الوحدة (الأفضل في فريقك)', xp: 20 },
    ],
    tip: 'أكمل الوحدة أولاً — النجمة تأتي تلقائياً',
  },
  {
    icon: '🎮',
    title: 'الألعاب',
    items: [
      { label: 'أول لعبة', xp: 5 },
      { label: 'نتيجة مثالية', xp: 3 },
    ],
  },
  {
    icon: '📤',
    title: 'المشاركة',
    items: [
      { label: 'مشاركة إنجاز على السوشال', xp: 5 },
    ],
  },
  {
    icon: '💪',
    title: 'تشجيع الزملاء (جديد!)',
    items: [
      { label: 'إرسال تشجيع (+2 XP لك)', xp: 2 },
      { label: 'استقبال تشجيع (للزميل)', xp: 3 },
    ],
    tip: 'حد أقصى 5 رسائل تشجيع يومياً',
  },
  {
    icon: '👨‍🏫',
    title: 'مكافآت المدرب (Quick Points)',
    items: [
      { label: 'إجابة صحيحة', xp: 5 },
      { label: 'حضور ممتاز', xp: 15 },
      { label: 'مساعدة زميل', xp: 10 },
    ],
    tip: 'يمنحها المدرب مباشرة خلال الحصة',
  },
]

const STREAK_BONUSES = [
  { label: '3 أيام', xp: 75 },
  { label: '5 أيام', xp: 200 },
  { label: '7 أيام', xp: 500 },
  { label: '14 يوم', xp: 1500 },
]

const WEEKLY_BONUSES = [
  { label: '50% من الفريق أكمل', xp: 150 },
  { label: '70% من الفريق أكمل', xp: 400 },
  { label: '90% من الفريق أكمل', xp: 800, badge: 'Gold Week 🏅' },
  { label: '100% من الفريق أكمل', xp: 1200, badge: 'Perfect Team 💎' },
]

/* ─── Main Page ─────────────────────────────────────────────── */
export default function HowToEarnPage() {
  const navigate = useNavigate()
  const { data: comp } = useActiveCompetition()
  const compActive = comp?.status === 'active'
  const days = compActive ? daysRemaining(comp.seconds_remaining) : 0

  return (
    <div
      className="space-y-4 pb-10"
      style={{ maxWidth: 720, margin: '0 auto', fontFamily: 'Tajawal, sans-serif' }}
      dir="rtl"
    >
      {/* Hero */}
      <div
        className="rounded-2xl px-6 py-8 text-center relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(245,200,66,0.06) 0%, transparent 70%)' }}
        />
        <div className="relative">
          <div className="text-4xl mb-3">🎯</div>
          <h1 className="text-xl font-black text-white mb-2">كيف تكسب XP لفريقك</h1>
          <p className="text-slate-400 text-sm leading-relaxed max-w-md mx-auto">
            كل نشاط على المنصة يكسبك XP. النقاط تضاف لمجموع فريقك. هذا الدليل الكامل.
          </p>
        </div>
      </div>

      {/* Active Competition Banner */}
      {compActive && (
        <button
          onClick={() => navigate('/student/competition')}
          className="w-full rounded-xl overflow-hidden"
          style={{
            background: 'linear-gradient(90deg, rgba(239,68,68,0.12) 0%, rgba(15,23,42,0.6) 100%)',
            border: '1px solid rgba(239,68,68,0.25)',
            cursor: 'pointer',
          }}
        >
          <div className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-2">
              <Swords size={16} className="text-red-400" />
              <span className="text-sm font-bold text-white">
                {days > 0 ? `المسابقة تنتهي خلال ${days} يوم — كل نقطة الآن حاسمة!` : 'المسابقة تنتهي اليوم!'}
              </span>
            </div>
            <ChevronRight size={16} className="text-slate-400" />
          </div>
        </button>
      )}

      {/* Individual XP sources */}
      <div className="text-xs font-bold text-slate-500 px-1 mt-2">مصادر XP الفردية</div>
      <div className="grid sm:grid-cols-2 gap-3">
        {EARN_SECTIONS.map((s) => (
          <EarnCard key={s.title} {...s} />
        ))}
      </div>

      {/* Team bonuses */}
      <div className="text-xs font-bold text-slate-500 px-1 mt-4">مكافآت الفريق الجماعية</div>

      <BonusSection
        title="🔥 ستريك الفريق (80% من الفريق نشط يومياً)"
        items={STREAK_BONUSES}
        color="#fb923c"
      />

      <BonusSection
        title="🎯 تحدي الأسبوع (إكمال الوحدة المستهدفة)"
        items={WEEKLY_BONUSES}
        color="#34d399"
      />

      <div className="h-4" aria-hidden="true" />
    </div>
  )
}
