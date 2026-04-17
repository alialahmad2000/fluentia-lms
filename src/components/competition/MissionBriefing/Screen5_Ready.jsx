import { motion } from 'framer-motion'
import { Swords } from 'lucide-react'

const REWARDS = [
  { icon: '🏆', label: 'بادج البطل', desc: 'دائم على ملفك الشخصي' },
  { icon: '📤', label: 'بطاقة نصر', desc: 'قابلة للمشاركة على السوشال' },
  { icon: '⭐', label: 'لقب MVP', desc: 'لأعلى مساهم في الفريق' },
  { icon: '📜', label: 'شهادة تقدير', desc: 'للمشارك الفاعل' },
]

const FIRST_STEPS = [
  'افتح منهجك وابدأ الوحدة الحالية',
  'أرسل تشجيعاً لزميل واحد على الأقل',
  'تأكد من دخولك غداً للحفاظ على الستريك',
]

export default function Screen5_Ready({ comp, ctx, myTeam, onStartNow, onClose }) {
  const color = myTeam?.color ?? '#38bdf8'

  return (
    <div className="px-5 py-6">
      {/* Hero */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 14, stiffness: 220 }}
        className="text-center mb-6"
      >
        <div className="text-6xl mb-3">⚔️</div>
        <div className="text-xl font-black text-white mb-1">الآن أنت تعرف القواعد</div>
        <div className="text-sm text-slate-400">فريقك يعتمد عليك</div>
      </motion.div>

      {/* Rewards */}
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="mb-5"
      >
        <div
          className="text-xs font-bold text-center text-slate-500 mb-3 pb-2"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          ماذا يحدث لو فزتم؟
        </div>
        <div className="grid grid-cols-2 gap-2">
          {REWARDS.map((r) => (
            <div
              key={r.label}
              className="rounded-xl p-3 flex items-start gap-2.5"
              style={{ background: `${color}08`, border: `1px solid ${color}20` }}
            >
              <span className="text-xl flex-shrink-0">{r.icon}</span>
              <div>
                <div className="text-sm font-bold text-white">{r.label}</div>
                <div className="text-xs text-slate-500">{r.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* First steps */}
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="mb-6"
      >
        <div
          className="text-xs font-bold text-center text-slate-500 mb-3 pb-2"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          خطواتك الأولى الآن:
        </div>
        <div className="space-y-2.5">
          {FIRST_STEPS.map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <div
                className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black"
                style={{ background: color, color: '#0f172a' }}
              >
                {i + 1}
              </div>
              <span className="text-sm text-slate-300">{step}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* CTAs */}
      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="space-y-2"
      >
        <button
          onClick={onStartNow}
          className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-black text-base"
          style={{ background: color, color: '#0f172a' }}
        >
          <Swords size={18} />
          ابدأ الآن ⚔️
        </button>
        <button
          onClick={onClose}
          className="w-full py-2.5 text-sm text-slate-500 hover:text-slate-300 transition-colors"
        >
          عودة للداشبورد
        </button>
      </motion.div>
    </div>
  )
}
