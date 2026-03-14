import { useState } from 'react'
import { motion } from 'framer-motion'
import { Download, Loader2, Database, Users, FileText, CreditCard, BarChart3, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const EXPORT_OPTIONS = [
  {
    key: 'students',
    label: 'بيانات الطلاب',
    desc: 'الأسماء، المستويات، الباقات، XP، السلاسل',
    icon: Users,
    color: 'sky',
    query: async () => {
      const { data } = await supabase
        .from('students')
        .select('id, academic_level, package, xp_total, current_streak, gamification_level, status, enrollment_date, payment_day, custom_price, profiles(full_name, display_name, email, phone), groups(code, name)')
        .is('deleted_at', null)
        .order('enrollment_date', { ascending: false })
      return (data || []).map(s => ({
        الاسم: s.profiles?.full_name || '',
        'الاسم المعروض': s.profiles?.display_name || '',
        البريد: s.profiles?.email || '',
        الجوال: s.profiles?.phone || '',
        المجموعة: s.groups?.code || '',
        المستوى: s.academic_level,
        الباقة: s.package,
        XP: s.xp_total,
        السلسلة: s.current_streak,
        'مستوى اللعب': s.gamification_level,
        الحالة: s.status,
        'تاريخ الانضمام': s.enrollment_date,
        'يوم الدفع': s.payment_day,
        'سعر مخصص': s.custom_price || '',
      }))
    },
  },
  {
    key: 'payments',
    label: 'المدفوعات',
    desc: 'جميع المدفوعات مع الحالة والمبالغ',
    icon: CreditCard,
    color: 'emerald',
    query: async () => {
      const { data } = await supabase
        .from('payments')
        .select('id, amount, status, method, period_start, period_end, paid_at, created_at, profiles:student_id(full_name)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      return (data || []).map(p => ({
        الطالب: p.profiles?.full_name || '',
        المبلغ: p.amount,
        الحالة: p.status,
        'طريقة الدفع': p.method || '',
        'بداية الفترة': p.period_start,
        'نهاية الفترة': p.period_end,
        'تاريخ الدفع': p.paid_at || '',
        'تاريخ الإنشاء': p.created_at,
      }))
    },
  },
  {
    key: 'assignments',
    label: 'الواجبات والتسليمات',
    desc: 'جميع الواجبات مع التقييمات',
    icon: FileText,
    color: 'violet',
    query: async () => {
      const { data } = await supabase
        .from('submissions')
        .select('id, status, grade, grade_numeric, is_late, submitted_at, assignments(title, type, deadline), profiles:student_id(full_name)')
        .is('deleted_at', null)
        .order('submitted_at', { ascending: false })
        .limit(500)
      return (data || []).map(s => ({
        الطالب: s.profiles?.full_name || '',
        الواجب: s.assignments?.title || '',
        النوع: s.assignments?.type || '',
        الحالة: s.status,
        الدرجة: s.grade || '',
        'رقمي': s.grade_numeric || '',
        متأخر: s.is_late ? 'نعم' : 'لا',
        'تاريخ التسليم': s.submitted_at || '',
        'الموعد النهائي': s.assignments?.deadline || '',
      }))
    },
  },
  {
    key: 'attendance',
    label: 'سجل الحضور',
    desc: 'حضور وغياب الطلاب',
    icon: BarChart3,
    color: 'amber',
    query: async () => {
      const { data } = await supabase
        .from('attendance')
        .select('id, status, date, profiles:student_id(full_name), classes(title, groups(code))')
        .order('date', { ascending: false })
        .limit(1000)
      return (data || []).map(a => ({
        الطالب: a.profiles?.full_name || '',
        المجموعة: a.classes?.groups?.code || '',
        الحصة: a.classes?.title || '',
        التاريخ: a.date,
        الحالة: a.status,
      }))
    },
  },
]

function downloadCSV(data, filename) {
  if (!data?.length) return
  const headers = Object.keys(data[0])
  const csv = [
    '\uFEFF' + headers.join(','), // BOM for Arabic support in Excel
    ...data.map(row => headers.map(h => {
      const val = String(row[h] ?? '').replace(/"/g, '""')
      return val.includes(',') || val.includes('"') || val.includes('\n') ? `"${val}"` : val
    }).join(',')),
  ].join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const ICON_BG = {
  sky: 'bg-sky-500/10 text-sky-400',
  emerald: 'bg-emerald-500/10 text-emerald-400',
  violet: 'bg-violet-500/10 text-violet-400',
  amber: 'bg-amber-500/10 text-amber-400',
}

export default function AdminDataExport() {
  const [exporting, setExporting] = useState(null)
  const [completed, setCompleted] = useState(new Set())

  async function handleExport(option) {
    setExporting(option.key)
    try {
      const data = await option.query()
      downloadCSV(data, option.key)
      setCompleted(prev => new Set([...prev, option.key]))
    } catch (err) {
      console.error(`[Export ${option.key}] Error:`, err)
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="space-y-12 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center">
          <Database size={22} className="text-sky-400" />
        </div>
        <div>
          <h1 className="text-page-title text-white">تصدير البيانات</h1>
          <p className="text-muted text-sm mt-1">صدّر بيانات النظام بصيغة CSV</p>
        </div>
      </div>

      <div className="space-y-4">
        {EXPORT_OPTIONS.map((option, i) => {
          const iconBg = ICON_BG[option.color]
          const isExporting = exporting === option.key
          const isDone = completed.has(option.key)

          return (
            <motion.div
              key={option.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card p-7 flex items-center justify-between gap-5 hover:translate-y-[-2px] transition-all duration-200"
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
                  <option.icon size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">{option.label}</h3>
                  <p className="text-xs text-muted mt-1">{option.desc}</p>
                </div>
              </div>

              <button
                onClick={() => handleExport(option)}
                disabled={isExporting}
                className={`shrink-0 flex items-center gap-2 text-sm ${
                  isDone
                    ? 'badge-green px-4 py-2.5'
                    : 'btn-secondary py-2'
                }`}
              >
                {isExporting ? (
                  <><Loader2 size={14} className="animate-spin" /> جاري التصدير...</>
                ) : isDone ? (
                  <><CheckCircle2 size={14} /> تم التصدير</>
                ) : (
                  <><Download size={14} /> تصدير CSV</>
                )}
              </button>
            </motion.div>
          )
        })}
      </div>

      <div className="glass-card p-7">
        <p className="text-xs text-muted">
          الملفات تُحمّل بصيغة CSV مع دعم Unicode (UTF-8 BOM) لضمان عرض العربي بشكل صحيح في Excel.
        </p>
      </div>
    </div>
  )
}
