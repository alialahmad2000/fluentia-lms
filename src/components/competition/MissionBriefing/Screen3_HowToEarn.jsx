import { motion } from 'framer-motion'
import { ExternalLink } from 'lucide-react'

const CATEGORIES = [
  {
    emoji: '📖',
    title: 'دراسة الوحدات',
    color: '#38bdf8',
    items: [
      { label: 'قراءة (A أو B)', xp: '+5 XP' },
      { label: 'قواعد اللغة', xp: '+5 XP' },
      { label: 'استماع', xp: '+5 XP' },
      { label: 'مفردات — كل تمرين', xp: '+3 XP' },
      { label: 'إتقان كلمة', xp: '+5 XP' },
      { label: 'إكمال وحدة كاملة', xp: '+20 XP' },
    ],
  },
  {
    emoji: '✍️',
    title: 'إنتاج اللغة',
    color: '#a78bfa',
    items: [
      { label: 'تسليم كتابة', xp: '+5 XP' },
      { label: 'تقييم AI (تلقائي)', xp: '+3 XP' },
      { label: 'درجة ممتازة', xp: '+5 XP إضافي' },
      { label: 'تسجيل محادثة', xp: '+10 XP' },
      { label: 'درجة محادثة ممتازة', xp: '+5 XP إضافي' },
    ],
  },
  {
    emoji: '🎮',
    title: 'مكافآت إضافية',
    color: '#34d399',
    items: [
      { label: 'أول لعبة يومياً', xp: '+5 XP' },
      { label: 'نتيجة مثالية', xp: '+3 XP' },
      { label: 'مشاركة إنجاز', xp: '+5 XP' },
      { label: 'تشجيع زميل', xp: '+2 XP لك +3 له' },
    ],
  },
]

export default function Screen3_HowToEarn() {
  return (
    <div className="px-5 py-6">
      {/* Header */}
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.05 }}
        className="text-center mb-5"
      >
        <div className="text-4xl mb-2">📚</div>
        <div className="text-lg font-black text-white">كل نشاط = XP لفريقك</div>
        <div className="text-xs text-slate-500 mt-1">كل نقطة تكسبها تضاف مباشرة لرصيد فريقك</div>
      </motion.div>

      {/* Category cards */}
      <div className="space-y-3">
        {CATEGORIES.map((cat, ci) => (
          <motion.div
            key={cat.title}
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 + ci * 0.1 }}
            className="rounded-2xl overflow-hidden"
            style={{ border: `1px solid ${cat.color}25` }}
          >
            {/* Card header */}
            <div
              className="flex items-center gap-2 px-4 py-3"
              style={{ background: `${cat.color}12` }}
            >
              <span className="text-lg">{cat.emoji}</span>
              <span className="font-bold text-sm" style={{ color: cat.color }}>{cat.title}</span>
            </div>

            {/* Items */}
            <div className="px-4 py-2 space-y-0.5" style={{ background: 'rgba(255,255,255,0.02)' }}>
              {cat.items.map((item) => (
                <div key={item.label} className="flex items-center justify-between py-1.5"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span className="text-sm text-slate-300">{item.label}</span>
                  <span className="text-sm font-black tabular-nums" style={{ color: cat.color }}>{item.xp}</span>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Rules link */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45 }}
        className="text-center mt-5"
      >
        <a
          href="/student/competition/rules"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300"
          style={{ textDecoration: 'none' }}
        >
          <ExternalLink size={12} />
          الدليل الكامل لكل المكافآت
        </a>
      </motion.div>
    </div>
  )
}
