export default function FloatingOrbs({ visible = true }) {
  if (!visible) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      <div
        className="absolute w-[300px] h-[300px] rounded-full blur-[80px] animate-float-slow"
        style={{ background: 'var(--accent-sky)', top: '10%', right: '15%', opacity: 0.12 }}
      />
      <div
        className="absolute w-[300px] h-[300px] rounded-full blur-[80px] animate-float-slow-reverse"
        style={{ background: 'var(--accent-violet)', bottom: '15%', left: '10%', opacity: 0.10 }}
      />
      <div
        className="absolute w-[300px] h-[300px] rounded-full blur-[80px] animate-float-slow"
        style={{ background: 'var(--accent-gold)', top: '50%', left: '55%', opacity: 0.08 }}
      />
    </div>
  )
}
