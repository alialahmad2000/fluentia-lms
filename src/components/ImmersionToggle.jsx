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
        className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-xl transition-all duration-200 hover:translate-y-[-2px] ${
          immersionMode
            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
            : 'bg-white/5 text-muted hover:text-white border border-white/5'
        }`}
      >
        <Globe size={12} />
        {immersionMode ? 'Immersion ON' : 'وضع الانغماس'}
      </button>
    )
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Languages size={20} className="text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">وضع الانغماس</h3>
            <p className="text-sm text-muted">تعلّم الإنجليزي من خلال استخدام المنصة</p>
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
          className="space-y-2 mt-4"
        >
          {LEVELS.map(level => (
            <button
              key={level.value}
              onClick={() => setImmersionLevel(level.value)}
              className={`w-full text-right p-4 rounded-xl transition-all duration-200 hover:translate-y-[-2px] ${
                immersionLevel === level.value
                  ? 'bg-emerald-500/10 border border-emerald-500/20'
                  : 'bg-white/5 border border-white/5 hover:bg-white/10'
              }`}
            >
              <p className={`text-sm font-medium ${immersionLevel === level.value ? 'text-emerald-400' : 'text-white'}`}>
                {level.label}
              </p>
              <p className="text-xs text-muted mt-0.5">{level.desc}</p>
            </button>
          ))}
        </motion.div>
      )}
    </div>
  )
}
