import { motion } from 'framer-motion'
import { PenLine, Sparkles } from 'lucide-react'

export default function StudentWritingLab() {
  return (
    <div className="space-y-8">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/10 flex items-center justify-center ring-1 ring-violet-500/20">
          <PenLine size={22} className="text-violet-400" strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="text-page-title" style={{ color: 'var(--text-primary)' }}>معمل الكتابة</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>تدرّب على الكتابة وحسّن مهاراتك</p>
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
            <Sparkles size={48} className="text-violet-400" strokeWidth={1.5} />
          </div>
          <p className="fl-empty-title">قريباً</p>
          <p className="fl-empty-desc">هذه الميزة تحت التطوير — ستتمكن قريباً من التدرب على الكتابة والحصول على تقييم فوري بالذكاء الاصطناعي.</p>
        </div>
      </motion.div>
    </div>
  )
}
