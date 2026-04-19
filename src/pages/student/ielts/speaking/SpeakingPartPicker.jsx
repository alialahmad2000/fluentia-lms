import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, Mic } from 'lucide-react'
import { GlassPanel } from '@/design-system/components'
import { useSpeakingQuestions } from '@/hooks/ielts/useSpeakingLab'

const PART_META = {
  1: { icon: '🗣️', label_ar: 'الجزء الأول', subtitle_ar: 'محادثة شخصية', en: 'Introduction & Interview', color: '#38bdf8', hint_ar: 'أسئلة شخصية عن حياتك — المنزل، العمل، الهوايات.' },
  2: { icon: '🎤', label_ar: 'الجزء الثاني', subtitle_ar: 'حديث متواصل', en: 'Long Turn (Cue Card)', color: '#a78bfa', hint_ar: 'دقيقة للتحضير ثم حديث متواصل 1-2 دقيقة.' },
  3: { icon: '🎓', label_ar: 'الجزء الثالث', subtitle_ar: 'نقاش متعمّق', en: 'Two-way Discussion', color: '#4ade80', hint_ar: 'نقاش مجرد حول موضوع الجزء الثاني.' },
}

function Part1TopicCard({ row, onSelect }) {
  const qs = Array.isArray(row.questions) ? row.questions : []
  return (
    <GlassPanel
      hover
      style={{ padding: 18, cursor: 'pointer', border: '1px solid rgba(56,189,248,0.15)' }}
      onClick={() => onSelect(row.id)}
    >
      <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'sans-serif', direction: 'ltr', marginBottom: 8 }}>
        {row.topic}
      </p>
      <p style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', marginBottom: 10 }}>
        {qs.length} سؤال
      </p>
      {qs.slice(0, 2).map((q, i) => (
        <p key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'sans-serif', direction: 'ltr', lineHeight: 1.6, marginBottom: 4 }}>
          • {typeof q === 'string' ? q : q.q}
        </p>
      ))}
      {qs.length > 2 && (
        <p style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'sans-serif', direction: 'ltr' }}>
          +{qs.length - 2} more…
        </p>
      )}
      <div style={{ marginTop: 10, textAlign: 'left' }}>
        <span style={{ fontSize: 12, color: '#38bdf8', fontWeight: 700, fontFamily: 'Tajawal' }}>ابدأ →</span>
      </div>
    </GlassPanel>
  )
}

function Part2CueCard({ row, onSelect }) {
  const cc = row.cue_card || {}
  const bullets = Array.isArray(cc.bullet_points) ? cc.bullet_points : []
  return (
    <GlassPanel
      hover
      style={{ padding: 18, cursor: 'pointer', border: '1px solid rgba(167,139,250,0.15)' }}
      onClick={() => onSelect(row.id)}
    >
      <p style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', fontFamily: 'sans-serif', letterSpacing: '0.06em', marginBottom: 6 }}>
        CUE CARD
      </p>
      <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'sans-serif', direction: 'ltr', lineHeight: 1.6, marginBottom: 8 }}>
        {cc.prompt || row.topic}
      </p>
      {bullets.slice(0, 3).map((b, i) => (
        <p key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'sans-serif', direction: 'ltr', marginBottom: 3 }}>
          <span style={{ color: '#a78bfa' }}>•</span> {b}
        </p>
      ))}
      <div style={{ marginTop: 10, textAlign: 'left' }}>
        <span style={{ fontSize: 12, color: '#a78bfa', fontWeight: 700, fontFamily: 'Tajawal' }}>ابدأ →</span>
      </div>
    </GlassPanel>
  )
}

function Part3TopicCard({ row, onSelect }) {
  const qs = Array.isArray(row.questions) ? row.questions : []
  return (
    <GlassPanel
      hover
      style={{ padding: 18, cursor: 'pointer', border: '1px solid rgba(74,222,128,0.15)' }}
      onClick={() => onSelect(row.id)}
    >
      <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'sans-serif', direction: 'ltr', marginBottom: 8 }}>
        {row.topic}
      </p>
      <p style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', marginBottom: 10 }}>
        {qs.length} سؤال نقاشي
      </p>
      {qs.slice(0, 2).map((q, i) => (
        <p key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'sans-serif', direction: 'ltr', lineHeight: 1.6, marginBottom: 4 }}>
          • {typeof q === 'string' ? q : q.q}
        </p>
      ))}
      {qs.length > 2 && (
        <p style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'sans-serif', direction: 'ltr' }}>
          +{qs.length - 2} more…
        </p>
      )}
      <div style={{ marginTop: 10, textAlign: 'left' }}>
        <span style={{ fontSize: 12, color: '#4ade80', fontWeight: 700, fontFamily: 'Tajawal' }}>ابدأ →</span>
      </div>
    </GlassPanel>
  )
}

export default function SpeakingPartPicker() {
  const navigate = useNavigate()
  const { partNum } = useParams()
  const num = Number(partNum)
  const meta = PART_META[num]

  const questionsQ = useSpeakingQuestions(num)

  if (!meta) {
    navigate('/student/ielts/speaking', { replace: true })
    return null
  }

  const rows = questionsQ.data || []

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ maxWidth: 860, margin: '0 auto', padding: 16 }}
      dir="rtl"
    >
      <button
        onClick={() => navigate('/student/ielts/speaking')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-tertiary)', fontFamily: 'Tajawal', fontSize: 13, cursor: 'pointer', marginBottom: 20 }}
      >
        <ChevronLeft size={16} style={{ transform: 'rotate(180deg)' }} />
        معمل المحادثة
      </button>

      {/* Header */}
      <GlassPanel elevation={2} style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: `${meta.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${meta.color}40`, flexShrink: 0, fontSize: 24 }}>
            {meta.icon}
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 4 }}>
              {meta.label_ar}
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
              {meta.hint_ar}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'sans-serif', direction: 'ltr', marginTop: 2 }}>
              {meta.en}
            </p>
          </div>
        </div>
      </GlassPanel>

      {questionsQ.isLoading && (
        <GlassPanel style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>جاري تحميل الأسئلة…</p>
        </GlassPanel>
      )}

      {questionsQ.isError && (
        <GlassPanel style={{ padding: 24, textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: '#ef4444', fontFamily: 'Tajawal', marginBottom: 12 }}>فشل تحميل الأسئلة</p>
          <button onClick={() => questionsQ.refetch()} style={{ padding: '8px 20px', borderRadius: 10, background: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)', fontFamily: 'Tajawal', fontWeight: 700, cursor: 'pointer' }}>
            إعادة المحاولة
          </button>
        </GlassPanel>
      )}

      {!questionsQ.isLoading && !questionsQ.isError && rows.length === 0 && (
        <GlassPanel style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ fontSize: 24, marginBottom: 10 }}>🎤</p>
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 4 }}>لا توجد أسئلة منشورة بعد</p>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>ستُضاف أسئلة {meta.label_ar} قريباً</p>
        </GlassPanel>
      )}

      {rows.length > 0 && (
        <>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', marginBottom: 14, letterSpacing: '0.04em' }}>
            اختر موضوعاً
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {rows.map(row => {
              if (num === 2) return <Part2CueCard key={row.id} row={row} onSelect={id => navigate(`/student/ielts/speaking/session/${id}`)} />
              if (num === 3) return <Part3TopicCard key={row.id} row={row} onSelect={id => navigate(`/student/ielts/speaking/session/${id}`)} />
              return <Part1TopicCard key={row.id} row={row} onSelect={id => navigate(`/student/ielts/speaking/session/${id}`)} />
            })}
          </div>
        </>
      )}

      {/* Tip */}
      <GlassPanel style={{ padding: 16, marginTop: 20, background: `${meta.color}08`, border: `1px solid ${meta.color}20` }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <Mic size={14} style={{ color: meta.color, flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: meta.color, fontFamily: 'Tajawal', marginBottom: 4 }}>نصيحة</p>
            {num === 1 && <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'Tajawal', lineHeight: 1.7 }}>أجب بجمل كاملة وسِّع إجاباتك — لا تكتفِ بـ "نعم" أو "لا".</p>}
            {num === 2 && <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'Tajawal', lineHeight: 1.7 }}>استخدم دقيقة التحضير لتدوّن أفكاراً — لكنها لن تُقيَّم، فتحدّث بحرية.</p>}
            {num === 3 && <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'Tajawal', lineHeight: 1.7 }}>عبّر عن رأيك واستند إلى أمثلة — لا توجد إجابة صحيحة أو خاطئة.</p>}
          </div>
        </div>
      </GlassPanel>
    </motion.div>
  )
}
