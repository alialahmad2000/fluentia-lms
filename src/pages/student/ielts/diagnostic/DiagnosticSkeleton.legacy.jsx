export default function DiagnosticSkeleton() {
  const pulse = { background: 'rgba(255,255,255,0.05)', borderRadius: 12, animation: 'pulse 1.5s ease-in-out infinite' }
  return (
    <div className="space-y-5" style={{ maxWidth: 760, margin: '0 auto', padding: 16 }} dir="rtl">
      <div style={{ ...pulse, height: 56, width: 220 }} />
      <div style={{ ...pulse, height: 80 }} />
      <div style={{ ...pulse, height: 320 }} />
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ ...pulse, height: 44, flex: 1 }} />
        <div style={{ ...pulse, height: 44, width: 140 }} />
      </div>
    </div>
  )
}
