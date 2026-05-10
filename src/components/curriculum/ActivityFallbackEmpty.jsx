import { AlertCircle, ArrowRight } from 'lucide-react'

const MESSAGES = {
  unknown_activity: {
    title: 'نشاط غير متاح',
    body: 'هذا النشاط غير متوفر حالياً. ارجعي للوحدة للمتابعة.',
  },
  error: {
    title: 'حدث خطأ غير متوقع',
    body: 'تم تسجيل الخطأ. ارجعي للوحدة وحاولي مرة ثانية.',
  },
  empty: {
    title: 'لا يوجد محتوى لعرضه',
    body: 'تم إكمال هذا النشاط. ارجعي للوحدة لاختيار نشاط جديد.',
  },
}

export default function ActivityFallbackEmpty({ reason = 'empty', onBack }) {
  const m = MESSAGES[reason] || MESSAGES.empty
  return (
    <div
      dir="rtl"
      style={{
        minHeight: '420px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        padding: '48px 24px',
        borderRadius: '20px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid var(--border-subtle)',
        textAlign: 'center',
      }}
    >
      <AlertCircle size={48} style={{ color: 'var(--text-tertiary)', opacity: 0.5 }} />
      <h3
        className="font-['Tajawal']"
        style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}
      >
        {m.title}
      </h3>
      <p
        className="font-['Tajawal']"
        style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0, maxWidth: '320px' }}
      >
        {m.body}
      </p>
      <button
        onClick={onBack}
        className="flex items-center gap-2 font-['Tajawal']"
        style={{
          marginTop: '8px',
          padding: '10px 24px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, var(--accent-sky), var(--accent-violet))',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 700,
        }}
      >
        <ArrowRight size={16} />
        العودة للوحدة
      </button>
    </div>
  )
}
