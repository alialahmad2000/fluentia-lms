export default function BriefWhyMatters({ text }) {
  if (!text) return null

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(233, 185, 73, 0.06), rgba(233, 185, 73, 0.02))',
      border: '1px solid rgba(233, 185, 73, 0.2)',
      borderRight: '4px solid var(--ds-accent-gold)',
      borderRadius: '16px',
      padding: 'clamp(18px, 4vw, 28px)',
    }}>
      <div style={{
        fontSize: '11px',
        fontWeight: 700,
        color: 'var(--ds-accent-gold)',
        letterSpacing: '1.5px',
        textTransform: 'uppercase',
        marginBottom: '12px',
        fontFamily: "'Tajawal', sans-serif",
      }}>
        ليش هذي الوحدة مهمة؟
      </div>

      <p style={{
        fontSize: 'clamp(14px, 2.8vw, 17px)',
        color: 'var(--ds-text-primary)',
        lineHeight: 1.8,
        fontFamily: "'Tajawal', sans-serif",
        margin: 0,
      }}>
        {text}
      </p>

      <div style={{
        marginTop: '16px',
        fontSize: '12px',
        color: 'var(--ds-text-tertiary)',
        fontStyle: 'italic',
      }}>
        — د. علي الأحمد، مؤسس أكاديمية طلاقة
      </div>
    </div>
  )
}
