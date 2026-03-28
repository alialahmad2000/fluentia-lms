import { useState } from 'react'
import { motion } from 'framer-motion'
import { Lock, ChevronLeft, Palette } from 'lucide-react'

const STYLES = [
  { key: 'A', label: 'Style A — Gradient', file: '/style-tests/test-style-A-gradient.png' },
  { key: 'B', label: 'Style B — Glass', file: '/style-tests/test-style-B-glass.png' },
  { key: 'C', label: 'Style C — Geometric', file: '/style-tests/test-style-C-geometric.png' },
  { key: 'D', label: 'Style D — Watercolor Dark', file: '/style-tests/test-style-D-watercolor-dark.png' },
]

const LEVELS = [
  { level_number: 0, name_ar: 'تأسيس', name_en: 'Foundation', cefr: 'Pre-A1', color: '#4ade80', description_ar: 'البداية الأولى لتعلم اللغة الإنجليزية من الصفر' },
  { level_number: 1, name_ar: 'أساسيات', name_en: 'Essentials', cefr: 'A1', color: '#38bdf8', description_ar: 'بناء الأساسيات والقواعد الأولية' },
  { level_number: 2, name_ar: 'تطوير', name_en: 'Development', cefr: 'A2', color: '#a78bfa', description_ar: 'تطوير المهارات والتعبير بشكل أفضل' },
  { level_number: 3, name_ar: 'طلاقة', name_en: 'Fluency', cefr: 'B1', color: '#f59e0b', description_ar: 'الوصول إلى مرحلة الطلاقة في المحادثة' },
  { level_number: 4, name_ar: 'تمكّن', name_en: 'Mastery', cefr: 'B2', color: '#ef4444', description_ar: 'إتقان المهارات المتقدمة والتحليل' },
  { level_number: 5, name_ar: 'احتراف', name_en: 'Proficiency', cefr: 'C1', color: '#fbbf24', description_ar: 'مستوى الاحتراف والتميز اللغوي' },
]

const EMOJI = { 0: '🌱', 1: '🧱', 2: '🚀', 3: '📖', 4: '🏆', 5: '💎' }

function PreviewCard({ level, iconSrc, isLocked, isCurrent, completedUnits, totalUnits }) {
  const color = level.color
  const progress = totalUnits > 0 ? (completedUnits / totalUnits) * 100 : 0

  return (
    <div
      className={`relative rounded-2xl border overflow-hidden transition-all duration-200 min-h-[180px] flex flex-col ${
        isLocked ? 'opacity-60' : 'hover:-translate-y-0.5'
      } ${isCurrent ? 'ring-2 ring-offset-0' : ''}`}
      style={{
        background: 'var(--surface-base)',
        borderColor: isCurrent ? color : 'var(--border-subtle)',
        ...(isCurrent && { boxShadow: `0 0 20px ${color}30, 0 0 40px ${color}15` }),
      }}
    >
      <div className="h-1" style={{ background: color }} />
      <div className="p-4 sm:p-6 flex flex-col flex-1">
        <div className="mb-3 self-start">
          {iconSrc ? (
            <div className="w-16 h-16 rounded-xl flex items-center justify-center overflow-hidden" style={{ background: `${color}15` }}>
              <img src={iconSrc} alt={level.name_en} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl" style={{ background: `${color}15` }}>
              {EMOJI[level.level_number] || '📚'}
            </div>
          )}
        </div>

        {isCurrent && (
          <span className="inline-flex items-center self-start text-xs font-semibold px-2.5 py-1 rounded-lg mb-3"
            style={{ background: `${color}20`, color }}>
            مستواك الحالي
          </span>
        )}

        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">{level.name_ar}</h3>
        <p className="text-sm text-[var(--text-muted)] mb-2" dir="ltr">{level.name_en}</p>
        <span className="inline-flex items-center self-start text-xs font-medium px-2.5 py-1 rounded-full mb-3"
          style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
          {level.cefr}
        </span>
        <p className="text-sm text-[var(--text-muted)] line-clamp-2 leading-relaxed mb-3">{level.description_ar}</p>
        <div className="flex-1" />
        <div className="mt-auto">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-1.5">
            <span>{completedUnits} / {totalUnits} وحدة مكتملة</span>
            {!isLocked && <ChevronLeft size={14} className="text-[var(--text-muted)]" />}
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--surface-raised)' }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: color }} />
          </div>
        </div>
      </div>

      {isLocked && (
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--surface-base)', border: '1px solid var(--border-subtle)' }}>
            <Lock size={18} className="text-[var(--text-muted)]" />
          </div>
        </div>
      )}
    </div>
  )
}

export default function StylePreview() {
  const [activeStyle, setActiveStyle] = useState(0)
  const currentStyle = STYLES[activeStyle]

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/10 flex items-center justify-center ring-1 ring-purple-500/20">
            <Palette size={20} className="text-purple-400" />
          </div>
          <h1 className="text-page-title">معاينة أنماط الأيقونات</h1>
        </div>
        <p className="text-[var(--text-muted)] text-sm mt-1 mr-[52px]">
          اختر النمط المناسب لأيقونات المستويات
        </p>
      </motion.div>

      {/* Style Selector */}
      <div className="flex flex-wrap gap-2">
        {STYLES.map((style, idx) => (
          <button
            key={style.key}
            onClick={() => setActiveStyle(idx)}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
              activeStyle === idx
                ? 'bg-[var(--accent-sky)] text-white border-transparent'
                : 'bg-[var(--surface-base)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--border-default)]'
            }`}
          >
            {style.label}
          </button>
        ))}
      </div>

      {/* Full-size preview */}
      <div className="flex justify-center">
        <div className="rounded-2xl border border-[var(--border-subtle)] overflow-hidden" style={{ background: 'var(--surface-base)' }}>
          <img src={currentStyle.file} alt={currentStyle.label} className="w-64 h-64 object-cover" />
          <div className="p-3 text-center text-sm font-medium text-[var(--text-secondary)]">{currentStyle.label}</div>
        </div>
      </div>

      {/* Level Cards with selected style */}
      <div>
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">المنهج الدراسي — بنمط {currentStyle.key}</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
          {LEVELS.map((level) => (
            <PreviewCard
              key={level.level_number}
              level={level}
              iconSrc={currentStyle.file}
              isLocked={level.level_number > 1}
              isCurrent={level.level_number === 1}
              completedUnits={level.level_number === 0 ? 12 : level.level_number === 1 ? 4 : 0}
              totalUnits={12}
            />
          ))}
        </div>
      </div>

      {/* Side-by-side comparison with no icon (current) */}
      <div>
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">مقارنة: بأيقونة vs بدون أيقونة (الحالي)</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-[var(--text-muted)] mb-2 text-center">مع أيقونة ({currentStyle.key})</p>
            <PreviewCard
              level={LEVELS[1]}
              iconSrc={currentStyle.file}
              isCurrent={true}
              completedUnits={4}
              totalUnits={12}
            />
          </div>
          <div>
            <p className="text-sm text-[var(--text-muted)] mb-2 text-center">بدون أيقونة (الحالي)</p>
            <PreviewCard
              level={LEVELS[1]}
              iconSrc={null}
              isCurrent={true}
              completedUnits={4}
              totalUnits={12}
            />
          </div>
        </div>
      </div>

      {/* All 4 styles side by side for one card */}
      <div>
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">كل الأنماط جنبًا إلى جنب</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {STYLES.map(style => (
            <div key={style.key}>
              <p className="text-xs text-[var(--text-muted)] mb-2 text-center">{style.label}</p>
              <PreviewCard
                level={LEVELS[1]}
                iconSrc={style.file}
                isCurrent={true}
                completedUnits={4}
                totalUnits={12}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
