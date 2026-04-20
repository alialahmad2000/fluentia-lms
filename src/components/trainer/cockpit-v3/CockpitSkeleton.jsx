export default function CockpitSkeleton() {
  return (
    <div className="daily-brief" aria-busy="true" aria-label="جارٍ التحميل">
      {[180, 220, 160].map((h, i) => (
        <div key={i} style={{
          height: h,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 16,
          animation: 'tr-pulse 1.8s ease-in-out infinite',
          animationDelay: `${i * 0.15}s`,
        }} />
      ))}
      <style>{`@keyframes tr-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  )
}
