import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Headphones, BookOpen, PenTool, Mic, ChevronLeft, Info } from 'lucide-react'
import { motion } from 'framer-motion'
import { GlassPanel } from '@/design-system/components'

const SECTIONS_INFO = [
  { icon: Headphones, label: 'الاستماع',  duration: '25 دقيقة', desc: 'أسئلة على مقاطع صوتية', color: '#a855f7' },
  { icon: BookOpen,   label: 'القراءة',   duration: '35 دقيقة', desc: 'قراءة ونصوص تحليلية',   color: '#38bdf8' },
  { icon: PenTool,    label: 'الكتابة',   duration: '25 دقيقة', desc: 'مقال تحليلي (Task 2)',   color: '#4ade80' },
  { icon: Mic,        label: 'المحادثة',  duration: '8 دقائق',  desc: 'تسجيل صوتي بالميكروفون', color: '#fb923c' },
]

const RULES = [
  'لا يمكن إيقاف الاختبار بعد البدء إلا بالحفظ التلقائي',
  'لكل قسم وقت محدد — يمكنك الإكمال حتى لو انتهى الوقت',
  'الاستماع: يُشغَّل المقطع مرة واحدة فقط',
  'المحادثة: ستحتاج ميكروفوناً — تأكد من منح الإذن',
  'إجاباتك تُحفظ تلقائياً كل 30 ثانية',
]

export default function DiagnosticWelcome({ content, onStart, isStarting }) {
  const navigate = useNavigate()
  const [variant, setVariant] = useState('academic')

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ maxWidth: 680, margin: '0 auto', padding: 16 }}
      dir="rtl"
    >
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <button
          onClick={() => navigate('/student/ielts')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-tertiary)', fontFamily: 'Tajawal', fontSize: 13, cursor: 'pointer', marginBottom: 16 }}
        >
          <ChevronLeft size={16} style={{ transform: 'rotate(180deg)' }} />
          لوحة IELTS
        </button>

        <h1 style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 6 }}>
          🎯 الاختبار التشخيصي
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', fontFamily: 'Tajawal', lineHeight: 1.7 }}>
          سيساعدنا هذا الاختبار على تحديد مستواك الحقيقي ورسم خطتك الشخصية. مدته ~90 دقيقة.
        </p>
      </div>

      {/* Section cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
        {SECTIONS_INFO.map(s => {
          const Icon = s.icon
          return (
            <GlassPanel key={s.label} style={{ padding: 16, textAlign: 'center' }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', border: `1px solid ${s.color}30` }}>
                <Icon size={18} style={{ color: s.color }} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 4 }}>{s.label}</p>
              <p style={{ fontSize: 12, color: s.color, fontFamily: 'Tajawal', fontWeight: 600, marginBottom: 4 }}>{s.duration}</p>
              <p style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>{s.desc}</p>
            </GlassPanel>
          )
        })}
      </div>

      {/* Variant selector */}
      <GlassPanel style={{ padding: 16, marginBottom: 16 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'Tajawal', marginBottom: 12 }}>نوع الاختبار</p>
        <div style={{ display: 'flex', gap: 10 }}>
          {['academic', 'general'].map(v => (
            <button
              key={v}
              onClick={() => setVariant(v)}
              style={{
                flex: 1, padding: '10px 16px', borderRadius: 10, fontFamily: 'Tajawal', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                background: variant === v ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.03)',
                color: variant === v ? '#38bdf8' : 'var(--text-secondary)',
                border: variant === v ? '1.5px solid rgba(56,189,248,0.4)' : '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {v === 'academic' ? 'أكاديمي (Academic)' : 'عام (General Training)'}
            </button>
          ))}
        </div>
      </GlassPanel>

      {/* Rules */}
      <GlassPanel style={{ padding: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Info size={15} style={{ color: '#fb923c', flexShrink: 0 }} />
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>قبل البدء</p>
        </div>
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {RULES.map((rule, i) => (
            <li key={i} style={{ display: 'flex', gap: 8, fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'Tajawal', lineHeight: 1.6 }}>
              <span style={{ color: '#38bdf8', flexShrink: 0 }}>•</span>
              {rule}
            </li>
          ))}
        </ul>
      </GlassPanel>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={() => navigate('/student/ielts')}
          style={{ padding: '12px 24px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.1)', fontFamily: 'Tajawal', fontWeight: 700, cursor: 'pointer', fontSize: 15 }}
        >
          عودة
        </button>
        <button
          onClick={() => onStart(variant)}
          disabled={isStarting}
          style={{
            flex: 1, padding: '14px 24px', borderRadius: 12, fontFamily: 'Tajawal', fontWeight: 800, fontSize: 16, cursor: isStarting ? 'default' : 'pointer',
            background: isStarting ? 'rgba(255,255,255,0.05)' : 'rgba(56,189,248,0.2)',
            color: isStarting ? 'var(--text-tertiary)' : '#38bdf8',
            border: `1.5px solid ${isStarting ? 'rgba(255,255,255,0.1)' : 'rgba(56,189,248,0.4)'}`,
          }}
        >
          {isStarting ? 'جاري البدء...' : 'ابدأ الاختبار التشخيصي ←'}
        </button>
      </div>
    </motion.div>
  )
}
