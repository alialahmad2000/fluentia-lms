import { useNavigate } from 'react-router-dom'
import { Award, CheckCircle2, ArrowRight, MessageCircle } from 'lucide-react'

const WHATSAPP_NUMBER = '966558669974'
const WHATSAPP_MSG = encodeURIComponent('السلام عليكم، أرغب في الاشتراك بمسار IELTS')

const FEATURES = [
  'اختبار تشخيصي معتمد يحدّد مستواك الحقيقي',
  'معمل القراءة — تدريب على جميع أنواع الأسئلة',
  'معمل الاستماع — جلسات تدريبية مع تصحيح فوري',
  'معمل الكتابة — تصحيح آلي بالذكاء الاصطناعي',
  'معمل المحادثة — تدريب وتغذية راجعة صوتية',
  'اختبارات محاكاة IELTS كاملة (Mock Tests)',
  'خطة تكيّفية ذكية تتجدد أسبوعياً',
  'بنك الأخطاء بنظام المراجعة المتباعدة (SM-2)',
]

export default function IELTSLockedPanel() {
  const navigate = useNavigate()

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        background: 'var(--ds-bg-base, var(--surface-base))',
      }}
      dir="rtl"
    >
      <div style={{ maxWidth: 520, width: '100%' }}>
        {/* Icon */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 88,
              height: 88,
              borderRadius: 28,
              background: 'rgba(56,189,248,0.08)',
              border: '1.5px solid rgba(56,189,248,0.25)',
              boxShadow: '0 0 40px rgba(56,189,248,0.12)',
              marginBottom: 20,
            }}
          >
            <Award size={44} style={{ color: '#38bdf8' }} />
          </div>

          <h1
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: 'var(--ds-text-primary, var(--text-primary))',
              fontFamily: 'Tajawal, sans-serif',
              marginBottom: 10,
            }}
          >
            مسار IELTS غير متاح في باقتك الحالية
          </h1>
          <p
            style={{
              fontSize: 14,
              color: 'var(--ds-text-secondary, var(--text-secondary))',
              fontFamily: 'Tajawal, sans-serif',
              lineHeight: 1.7,
              maxWidth: 400,
              margin: '0 auto',
            }}
          >
            هذا المسار جزء من باقة IELTS أو يمكن إضافته كصلاحية مخصصة — تواصل مع الإدارة لتفعيله.
          </p>
        </div>

        {/* Feature list */}
        <div
          style={{
            background: 'var(--ds-surface-1, rgba(255,255,255,0.03))',
            border: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.07))',
            borderRadius: 18,
            padding: '20px 24px',
            marginBottom: 20,
          }}
        >
          <p
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--ds-text-tertiary, var(--text-tertiary))',
              fontFamily: 'Tajawal, sans-serif',
              marginBottom: 14,
              letterSpacing: '0.04em',
            }}
          >
            ما يشمله مسار IELTS
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <CheckCircle2
                  size={15}
                  style={{ color: '#4ade80', flexShrink: 0, marginTop: 2 }}
                />
                <span
                  style={{
                    fontSize: 13,
                    color: 'var(--ds-text-secondary, var(--text-secondary))',
                    fontFamily: 'Tajawal, sans-serif',
                    lineHeight: 1.5,
                  }}
                >
                  {f}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* CTAs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MSG}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '14px 24px',
              borderRadius: 14,
              background: 'rgba(56,189,248,0.14)',
              color: '#38bdf8',
              border: '1.5px solid rgba(56,189,248,0.35)',
              fontFamily: 'Tajawal, sans-serif',
              fontWeight: 800,
              fontSize: 15,
              textDecoration: 'none',
              cursor: 'pointer',
              transition: 'background 200ms',
            }}
          >
            <MessageCircle size={18} />
            تواصل مع الإدارة للاشتراك
          </a>

          <button
            onClick={() => navigate('/student')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '12px 24px',
              borderRadius: 14,
              background: 'rgba(255,255,255,0.04)',
              color: 'var(--ds-text-secondary, var(--text-secondary))',
              border: '1px solid rgba(255,255,255,0.08)',
              fontFamily: 'Tajawal, sans-serif',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            <ArrowRight size={15} />
            العودة للوحة الطالب
          </button>
        </div>
      </div>
    </div>
  )
}
