// Ambient indigo "night sky" — twinkling starfield + two drifting nebulae.
// CSS-only (cheap); animation auto-disabled on reduced-motion / low-end via CSS.
export default function ConstellationField() {
  return (
    <div className="vc-field" aria-hidden="true">
      <div className="vc-stars" />
      <div className="vc-nebula vc-nebula-a" />
      <div className="vc-nebula vc-nebula-b" />
    </div>
  )
}
