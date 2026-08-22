// A band inside a unit section: a seam, a scroll anchor, and a group.
//
// WHY THIS EXISTS
// The reading tab was a stack of identically-weighted rounded cards — article,
// vocabulary, reading skill, study sheet, questions — separated by nothing but
// equal gaps. With no hierarchy the eye has no place to rest and everything
// reads as "one more box", which is exactly what the owner saw: too much piled
// on top of itself.
//
// Note what this deliberately does NOT do: add a title. Every card in the
// reading tab already carries its own header («مفردات القراءة»، «ورقة المذاكرة»،
// «أسئلة الفهم»), so a band label would print the same thing twice. The problem
// was never missing labels — it was missing SEAMS. A band supplies the seam,
// the breathing room, and the scroll anchor that SectionJumper targets,
// including the scroll margin: a jump target with no scroll margin lands
// underneath the fixed header.
import { forwardRef } from 'react'

/**
 * @param {string}  id        anchor id — must match the SectionJumper entry
 * @param {boolean} [seam]    draw the separating rule above this band
 * @param {'default'|'feature'} [tone]
 *        'feature' warms the seam and widens the gap, so a block of a different
 *        KIND (the study sheet is a paper, not another info card) reads as a
 *        section of its own rather than the next box down.
 * @param {string}  [label]   optional eyebrow, for a band grouping cards that
 *                            do NOT each carry a header of their own
 */
const SectionBand = forwardRef(function SectionBand(
  { id, label, hint, seam = true, tone = 'default', className = '', children },
  ref
) {
  const feature = tone === 'feature'
  // Colours come from the --ds-* token layer, like every other surface in the
  // reading tab. The first version drew the default seam in cold slate
  // (rgba(148,163,184,…)) and the feature seam in a second gold (amber #fbbf24)
  // beside the theme's own #e9b949 — two golds and a cold neutral on the same
  // screen is what made this chrome read as muddy rather than lit.
  const seamRule = 'var(--ds-accent-rule, rgba(233,185,73,.42))'
  const seamNeutral = 'rgba(255,255,255,0.09)'
  return (
    <section
      id={id}
      ref={ref}
      dir="rtl"
      // Clears everything stacked above the content — the impersonation banner
      // when staff are viewing as a student, the header, and the sticky jump
      // rail — so a jump never lands with the band's own heading hidden
      // underneath them. This was a hardcoded 132px, which was a banner's
      // height wrong for anyone impersonating.
      style={{ scrollMarginTop: 'calc(var(--impersonation-banner-height, 0px) + var(--header-height, 64px) + 68px)' }}
      className={`${feature ? 'pt-2' : ''} ${className}`}
    >
      {seam && (
        <div
          aria-hidden
          className={feature ? 'mb-7 flex items-center gap-3' : 'mb-6 h-px w-full'}
          style={
            feature
              ? undefined
              : {
                  background: `linear-gradient(to left, transparent, ${seamNeutral} 20%, ${seamNeutral} 80%, transparent)`,
                }
          }
        >
          {feature && (
            <>
              <span
                className="h-px flex-1"
                style={{ background: `linear-gradient(to left, transparent, ${seamRule})` }}
              />
              <span
                className="h-1 w-1 rounded-full"
                style={{ background: 'var(--ds-accent-primary, #e9b949)' }}
              />
              <span
                className="h-px flex-1"
                style={{ background: `linear-gradient(to right, transparent, ${seamRule})` }}
              />
            </>
          )}
        </div>
      )}
      {label && (
        <div className="mb-3 flex items-baseline gap-3">
          <h3
            className="font-['Tajawal'] text-[13px] font-bold tracking-wide"
            style={{ color: 'var(--ds-text-primary, #faf5e6)' }}
          >
            {label}
          </h3>
          <span
            aria-hidden
            className="h-px flex-1"
            style={{ background: 'var(--ds-border-subtle, rgba(255,255,255,0.07))' }}
          />
          {hint && (
            <span
              className="font-['Tajawal'] text-[11.5px]"
              style={{ color: 'var(--ds-text-tertiary, #8b8578)' }}
            >
              {hint}
            </span>
          )}
        </div>
      )}
      <div className="space-y-4">{children}</div>
    </section>
  )
})

export default SectionBand
