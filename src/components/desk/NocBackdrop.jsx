// NocBackdrop — the Pro Desk atmosphere. Rebuilt (2026-07-07) from the old dim
// "server-tunnel" canvas into a calm, LUMINOUS studio backdrop: a deep warm-obsidian
// base lit by a soft brass dawn-glow high, a cool counter-tone drifting low, a fine
// grain, and a grounding vignette. Full-bleed, fixed, behind everything — content
// glows over it instead of getting lost in a muddy dark.
//
// Pure CSS layers (no canvas): cheaper, cleaner, and far more premium than the old
// perspective-grid gimmick. Drift is transform/opacity only + reduced-motion gated.
export default function NocBackdrop() {
  return (
    <div className="desk-atmo" aria-hidden="true">
      <div className="desk-atmo-base" />
      <div className="desk-atmo-warm" />
      <div className="desk-atmo-cool" />
      <div className="desk-atmo-lift" />
      <div className="desk-atmo-beam" />
      <div className="desk-atmo-grain" />
      <div className="desk-atmo-vignette" />
    </div>
  )
}
