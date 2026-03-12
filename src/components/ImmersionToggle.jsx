import { motion } from 'framer-motion'
import { Globe, Languages } from 'lucide-react'
import { useLanguageStore } from '../stores/languageStore'

const LEVELS = [
  { value: 'ar', label: 'عربي بالكامل', desc: 'الواجهة بالعربي فقط' },
  { value: 'mix', label: 'مختلط', desc: 'عربي + إنجليزي للتعلم' },
  { value: 'en', label: 'English Only', desc: 'Full English immersion' },
]

export default function ImmersionToggle({ compact = false }) {
  const { immersionMode, immersionLevel, toggleImmersion, setImmersionLevel } = useLanguageStore()

  if (compact) {
    return (
      <button
        onClick={toggleImmersion}
        className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-xl transition-all ${
          immersionMode
            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
            : 'bg-white/5 text-muted hover:text-white'
        }`}
      >
        <Globe size={12} />
        {immersionMode ? 'Immersion ON' : 'وضع الانغماس'}
      </button>
    )
  }

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Languages size={20} className="text-emerald-400" />
          <div>
            <h3 className="font-medium text-white">وضع الانغماس</h3>
            <p className="text-xs text-muted">تعلّم الإنجليزي من خلال استخدام المنصة</p>
          </div>
        </div>
        <button
          onClick={toggleImmersion}
          className={`relative w-12 h-6 rounded-full transition-all ${
            immersionMode ? 'bg-emerald-500' : 'bg-white/20'
          }`}
        >
          <motion.div
            className="absolute top-0.5 w-5 h-5 bg-white rounded-full"
            animate={{ left: immersionMode ? '26px' : '2px' }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        </button>
      </div>

      {immersionMode && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-2"
        >
          {LEVELS.map(level => (
            <button
              key={level.value}
              onClick={() => setImmersionLevel(level.value)}
              className={`w-full text-right p-3 rounded-xl transition-all ${
                immersionLevel === level.value
                  ? 'bg-emerald-500/10 border border-emerald-500/20'
                  : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              <p className={`text-sm ${immersionLevel === level.value ? 'text-emerald-400 font-medium' : 'text-white'}`}>
                {level.label}
              </p>
              <p className="text-[10px] text-muted">{level.desc}</p>
            </button>
          ))}
        </motion.div>
      )}
    </div>
  )
}
