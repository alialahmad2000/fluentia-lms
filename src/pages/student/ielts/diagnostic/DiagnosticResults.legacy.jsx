import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Headphones, PenTool, Mic, Sparkles } from 'lucide-react'
import { GlassPanel } from '@/design-system/components'
import { supabase } from '@/lib/supabase'

const SKILL_CONFIG = {
  reading:   { label: 'القراءة',  icon: BookOpen,   color: '#38bdf8' },
  listening: { label: 'الاستماع', icon: Headphones, color: '#a855f7' },
  writing:   { label: 'الكتابة',  icon: PenTool,    color: '#4ade80' },
  speaking:  { label: 'المحادثة', icon: Mic,         color: '#fb923c' },
}

function useCountUp(target, duration = 1800) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!target) return
    const steps = 40
    const stepVal = target / steps
    let current = 0
    const id = setInterval(() => {
      current += stepVal
      if (current >= target) { setVal(target); clearInterval(id) }
      else setVal(Math.round(current * 2) / 2)
    }, duration / steps)
    return () => clearInterval(id)
  }, [target, duration])
  return val
}

export default function DiagnosticResults({ attempt, onBackToHub }) {
  const navigate = useNavigate()
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!attempt?.result_id) return
    supabase
      .from('ielts_student_results')
      .select('*')
      .eq('id', attempt.result_id)
      .single()
      .then(({ data }) => { setResult(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [attempt?.result_id])

  const overallBand = result?.overall_band || 0
  const displayBand = useCountUp(overallBand)

  const perSkill = {
    reading:   result?.reading_score,
    listening: result?.listening_score,
    writing:   result?.writing_score,
    speaking:  result?.speaking_score,
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🎓</div>
        <p style={{ fontFamily: 'Tajawal', color: '#38bdf8' }}>جاري تحميل نتائجك...</p>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, type: 'spring' }}
      style={{ maxWidth: 680, margin: '0 auto', padding: 16 }}
      dir="rtl"
    >
      {/* Celebration header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          style={{ fontSize: 56, marginBottom: 16 }}
        >
          🎉
        </motion.div>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 8 }}>
          أكملت الاختبار التشخيصي!
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>
          إليك نتيجتك الأولية
        </p>
      </div>

      {/* Overall band — animated count-up */}
      <GlassPanel style={{ padding: 32, textAlign: 'center', marginBottom: 20, border: '1px solid rgba(56,189,248,0.2)', background: 'rgba(56,189,248,0.04)' }}>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', marginBottom: 8 }}>مستواك الحالي</p>
        <div style={{ fontSize: 72, fontWeight: 900, color: '#38bdf8', fontFamily: 'Tajawal', lineHeight: 1, marginBottom: 8 }}>
          {displayBand.toFixed(1)}
        </div>
        <p style={{ fontSize: 14, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>Band Score الإجمالي</p>
      </GlassPanel>

      {/* Per-skill bands */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20 }}>
        {Object.entries(SKILL_CONFIG).map(([key, cfg]) => {
          const band = perSkill[key]
          const Icon = cfg.icon
          return (
            <GlassPanel key={key} style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <Icon size={18} style={{ color: cfg.color, flexShrink: 0 }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Tajawal' }}>{cfg.label}</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: band != null ? cfg.color : 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
                {band != null ? Number(band).toFixed(1) : '—'}
              </div>
            </GlassPanel>
          )
        })}
      </div>

      {/* Strengths + weaknesses */}
      {(result?.strengths?.length > 0 || result?.weaknesses?.length > 0) && (
        <GlassPanel style={{ padding: 20, marginBottom: 20 }}>
          {result?.strengths?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#4ade80', fontFamily: 'Tajawal', marginBottom: 10 }}>نقاط قوتك</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {result.strengths.map((s, i) => (
                  <span key={i} style={{ padding: '6px 14px', borderRadius: 20, background: 'rgba(74,222,128,0.1)', color: '#4ade80', fontSize: 13, fontFamily: 'Tajawal', border: '1px solid rgba(74,222,128,0.25)' }}>{s}</span>
                ))}
              </div>
            </div>
          )}
          {result?.weaknesses?.length > 0 && (
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#fb923c', fontFamily: 'Tajawal', marginBottom: 10 }}>مجالات التحسين</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {result.weaknesses.map((w, i) => (
                  <span key={i} style={{ padding: '6px 14px', borderRadius: 20, background: 'rgba(251,146,60,0.1)', color: '#fb923c', fontSize: 13, fontFamily: 'Tajawal', border: '1px solid rgba(251,146,60,0.25)' }}>{w}</span>
                ))}
              </div>
            </div>
          )}
        </GlassPanel>
      )}

      {/* Adaptive plan badge */}
      <GlassPanel style={{ padding: 18, marginBottom: 24, textAlign: 'center', border: '1px solid rgba(168,85,247,0.25)', background: 'rgba(168,85,247,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Sparkles size={18} style={{ color: '#a855f7' }} />
          <p style={{ fontSize: 15, fontWeight: 700, color: '#a855f7', fontFamily: 'Tajawal' }}>
            خطتك المخصصة جاهزة ✨
          </p>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'Tajawal', marginTop: 6 }}>
          بُنيت بناءً على نتائجك لتساعدك على الوصول لهدفك بأسرع وقت
        </p>
      </GlassPanel>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          onClick={onBackToHub}
          style={{
            width: '100%', padding: '14px 24px', borderRadius: 12, fontFamily: 'Tajawal', fontWeight: 800, fontSize: 16, cursor: 'pointer',
            background: 'rgba(56,189,248,0.2)', color: '#38bdf8',
            border: '1.5px solid rgba(56,189,248,0.4)',
          }}
        >
          اذهب للوحة IELTS ←
        </button>
        <button
          title="قريباً"
          disabled
          style={{
            width: '100%', padding: '12px 24px', borderRadius: 12, fontFamily: 'Tajawal', fontWeight: 700, fontSize: 15, cursor: 'default',
            background: 'rgba(255,255,255,0.03)', color: 'var(--text-tertiary)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          شارك النتيجة (قريباً)
        </button>
      </div>
    </motion.div>
  )
}
