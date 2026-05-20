/**
 * Polish-pass skeleton loaders for the VocabularyTab (Prompt 08).
 *
 * The HeroSection and ChunkLane already shipped their own skeletons
 * in Prompts 05/06. This file adds:
 *   - WordLibrarySkeleton — grid/list ghost word cards
 *   - DetailSheetSectionSkeleton — generic ghost block for any
 *     lazy-loaded Detail Sheet section (used by Suspense fallback)
 *
 * All animations use the existing `skeleton-wave` class from animations.css
 * which is gated on prefers-reduced-motion via the existing CSS rule.
 */

const ROW_HEIGHT = 170 // matches WordCard height
const ROW_GAP = 12

/**
 * Word library ghost — N cards in grid or list view.
 *
 * Props:
 *   viewMode: 'cards' | 'list'
 *   count: number of ghost rows (default 6)
 */
export function WordLibrarySkeleton({ viewMode = 'cards', count = 6 }) {
  if (viewMode === 'list') {
    return (
      <div className="space-y-1" aria-hidden="true">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="skeleton-wave"
            style={{
              height: 56,
              borderRadius: 10,
              opacity: 0.5,
            }}
          />
        ))}
      </div>
    )
  }
  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
      style={{ gap: ROW_GAP }}
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="skeleton-wave"
          style={{
            height: ROW_HEIGHT,
            borderRadius: 14,
            opacity: 0.5,
          }}
        />
      ))}
    </div>
  )
}

/**
 * Generic ghost block — used as the Suspense fallback for the
 * lazy-loaded Detail Sheet sections (Pronunciation, WordFamily).
 *
 * Props:
 *   linesCount: how many short ghost lines to render (default 3)
 *   showTitle: render a wider title-shaped line first (default true)
 */
export function DetailSheetSectionSkeleton({ linesCount = 3, showTitle = true }) {
  return (
    <div className="space-y-2" style={{ marginBottom: 20 }} aria-hidden="true">
      {showTitle && (
        <div
          className="skeleton-wave"
          style={{
            width: 110,
            height: 14,
            borderRadius: 6,
            opacity: 0.45,
          }}
        />
      )}
      {Array.from({ length: linesCount }).map((_, i) => (
        <div
          key={i}
          className="skeleton-wave"
          style={{
            width: i === linesCount - 1 ? '70%' : '100%',
            height: 12,
            borderRadius: 6,
            opacity: 0.4,
          }}
        />
      ))}
      <div
        className="skeleton-wave"
        style={{
          height: 64,
          borderRadius: 12,
          opacity: 0.35,
          marginTop: 6,
        }}
      />
    </div>
  )
}

/**
 * Smaller variant for chip rows (e.g., synonyms while loading).
 */
export function ChipRowSkeleton({ count = 5 }) {
  return (
    <div className="flex flex-wrap gap-1.5" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="skeleton-wave"
          style={{
            width: 60 + (i % 3) * 18,
            height: 24,
            borderRadius: 9999,
            opacity: 0.4,
          }}
        />
      ))}
    </div>
  )
}
