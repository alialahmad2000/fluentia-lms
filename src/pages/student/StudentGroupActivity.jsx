import { motion } from 'framer-motion'
import { UsersRound, Sparkles } from 'lucide-react'

export default function StudentGroupActivity() {
  return (
    <div className="space-y-8">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 flex items-center justify-center ring-1 ring-emerald-500/20">
          <UsersRound size={22} className="text-emerald-400" strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="text-page-title" style={{ color: 'var(--text-primary)' }}>نشاط المجموعة</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>تحديات وتقدير الأقران ونشاط الفريق</p>
        </div>
      </motion.div>

      {/* Empty / Coming soon state */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="fl-card-static"
      >
        <div className="fl-empty">
          <div className="fl-empty-icon">
            <Sparkles size={48} className="text-emerald-400" strokeWidth={1.5} />
          </div>
          <p className="fl-empty-title">قريباً</p>
          <p className="fl-empty-desc">هذه الميزة تحت التطوير — ستجمع نشاط المجموعة والتحديات وتقدير الأقران في مكان واحد.</p>
        </div>
      </motion.div>
    </div>
  )
}
