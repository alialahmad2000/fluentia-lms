import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, X, CheckCircle, XCircle, Clock } from 'lucide-react'

export default function StudentAnswersOverlay({
  questionId,
  correctAnswer,
  studentsData = [],
  isOpen,
  onToggle,
}) {
  // studentsData shape: [{ student_id, full_name, avatar_url, answer, isCorrect, attempted }]
  const attempted = studentsData.filter(s => s.attempted)
  const total = studentsData.length

  return (
    <div className="relative">
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 font-['Tajawal'] ${
          isOpen
            ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
            : 'bg-[var(--surface-raised)] text-[var(--text-muted)] border border-[var(--border-subtle)] hover:text-sky-400 hover:border-sky-500/30'
        }`}
      >
        <Users size={14} />
        <span>{attempted.length}/{total}</span>
      </button>

      {/* Expandable panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div
              className="mt-3 rounded-xl overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal']">
                  إجابات الطلاب ({attempted.length} من {total})
                </span>
                <button
                  onClick={onToggle}
                  className="w-6 h-6 rounded-md flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Student rows */}
              <div className="divide-y divide-[rgba(255,255,255,0.04)]">
                {studentsData.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <p className="text-sm text-[var(--text-muted)] font-['Tajawal']">لا توجد إجابات بعد</p>
                  </div>
                ) : (
                  studentsData.map((student, idx) => (
                    <div
                      key={student.student_id}
                      className="flex items-center gap-3 px-4 py-3"
                      style={{ background: idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}
                    >
                      {/* Status icon */}
                      {!student.attempted ? (
                        <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(100,116,139,0.15)' }}>
                          <Clock size={13} style={{ color: '#64748b' }} />
                        </div>
                      ) : student.isCorrect ? (
                        <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(34,197,94,0.15)' }}>
                          <CheckCircle size={13} style={{ color: '#22c55e' }} />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(239,68,68,0.15)' }}>
                          <XCircle size={13} style={{ color: '#ef4444' }} />
                        </div>
                      )}

                      {/* Avatar + name */}
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                          style={{
                            background: 'rgba(56,189,248,0.15)',
                            color: '#38bdf8',
                          }}
                        >
                          {student.avatar_url ? (
                            <img src={student.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                          ) : (
                            student.full_name?.charAt(0) || '?'
                          )}
                        </div>
                        <span className="text-sm text-[var(--text-primary)] font-['Tajawal'] truncate">
                          {student.full_name}
                        </span>
                      </div>

                      {/* Answer text */}
                      <div className="flex-shrink-0 max-w-[200px]">
                        {!student.attempted ? (
                          <span className="text-xs font-['Tajawal']" style={{ color: '#64748b' }}>لم تجب بعد</span>
                        ) : (
                          <span
                            className="text-xs font-['Inter'] truncate block"
                            dir="ltr"
                            style={{ color: student.isCorrect ? '#22c55e' : correctAnswer ? '#ef4444' : 'var(--text-secondary)' }}
                          >
                            {student.answer}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
