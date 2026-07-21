// Immersive indigo/navy "night sky" that fills the whole vocab world:
// three parallax star layers (depth), a soft aurora band + a central gold bloom
// (so the "mastered = gold" theme lives in the atmosphere), two on-stage nebulae
// that actually drift into the content, and a legibility vignette. CSS-only
// (cheap); animation auto-disabled on reduced-motion / low-end via CSS.
// aria-hidden — purely decorative.
export default function ConstellationField() {
  return (
    <div className="vc-field" aria-hidden="true">
      <div className="vc-nebula vc-nebula-a" />
      <div className="vc-nebula vc-nebula-b" />
      <div className="vc-aurora" />
      <div className="vc-goldbloom" />
      <div className="vc-stars" />
      <div className="vc-stars-mid" />
      <div className="vc-stars-near" />
      <div className="vc-vignette" />
    </div>
  )
}
