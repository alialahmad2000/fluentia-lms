/**
 * WordArtPlate — the top of a vocabulary card that has no photo.
 *
 * WHY THIS EXISTS
 * Only ~11% of `curriculum_vocabulary` rows carry an `image_url` (1,657 / 15,191).
 * The old fallback drew an empty box with the word ghosted at 6% opacity, which
 * read as a broken/unloaded image — an unfinished card, 89% of the time.
 *
 * The fix is NOT a prettier filler for a photo well. A card with no photo should
 * not pretend to have one, so the word itself becomes the subject: a type
 * specimen set in the app's display serif, with its IPA under a hairline rule,
 * on a plate whose hue is keyed to the PART OF SPEECH (colour teaches grammar at
 * a glance). Bloom position, hue jitter and hatching angle are hashed from the
 * word, so a word always looks like ITSELF — a stable visual hook for recall —
 * while neighbouring cards never look identical.
 *
 * The word is drawn as SVG <text> so it scales with the card at any grid width
 * and can never overflow (the size is derived from the character count). That is
 * safe HERE because the word and its IPA are always LATIN — never put Arabic in
 * SVG <text>, it does not apply Arabic shaping.
 *
 * Pure CSS/SVG: no images to fetch, no storage cost, no runtime animation.
 */

import { useMemo } from 'react'

// Hue per part of speech — colour becomes a grammatical signal.
const POS_HUE = {
  noun: 258,          // indigo → violet
  verb: 172,          // deep teal
  adjective: 42,      // amber
  adverb: 344,        // rose
  pronoun: 288,       // fuchsia
  preposition: 208,   // steel blue
  conjunction: 208,
  determiner: 208,
  phrase: 194,        // cyan
  idiom: 194,
}
const DEFAULT_HUE = 214

// Fine film grain so the surface has tooth instead of reading as a flat wash.
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E\")"

function hashOf(str = '') {
  let h = 5381
  for (let i = 0; i < str.length; i += 1) h = ((h << 5) + h + str.charCodeAt(i)) | 0
  return Math.abs(h)
}

// The plate is drawn in a 160×100 user-space box. Keep the word inside a 132-unit
// measure: Playfair's average advance is ~0.55em, so 132 / (0.55 · len) is the
// largest size that always fits — capped so short words don't become billboards.
const MEASURE = 132
const MAX_WORD_SIZE = 30

function wordSizeFor(word = '') {
  const len = Math.max(String(word).trim().length, 1)
  return Math.max(11, Math.min(MAX_WORD_SIZE, MEASURE / (0.55 * len)))
}

/**
 * @param variant 'specimen' — the full plate: label, rule, word (cards with no photo).
 *                'ground'   — art only, no type: the lit ground a photo sits on.
 */
export default function WordArtPlate({ word, partOfSpeech, ipa, variant = 'specimen', className = '', style }) {
  const isSpecimen = variant === 'specimen'
  const art = useMemo(() => {
    const h = hashOf(String(word || '').toLowerCase())
    const base = POS_HUE[String(partOfSpeech || '').toLowerCase()] ?? DEFAULT_HUE
    // Warm hues turn to mud fast, so they jitter less and carry more chroma than
    // the cool families at the same value.
    const isWarm = base > 18 && base < 82
    // Jitter inside the family: same POS stays recognisable, cards stay varied.
    const hue = (base + (((h >> 5) % 5) - 2) * (isWarm ? 5 : 9) + 360) % 360
    const hue2 = (hue + 16) % 360
    const hue3 = (hue - 28 + 360) % 360
    const bx = 22 + (h % 5) * 15          // 22 → 82
    const by = 16 + ((h >> 3) % 4) * 8    // 16 → 40
    const tilt = 148 + (h % 3) * 7        // 148 → 162
    const hatch = 104 + ((h >> 7) % 3) * 14 // 104 → 132: hatching angle
    // Greens/teals (the VERB family) lose chroma fastest as they darken, so at
    // the cool ground values they read as unlit next to a violet noun plate.
    // Lift only that band — the families must look equally alive side by side.
    const isGreen = hue > 140 && hue < 200
    const ground = isWarm
      ? { s: 44, l: 13 }
      : isGreen ? { s: 40, l: 17 } : { s: 32, l: 15 }
    const bloom = isWarm
      ? { a: 0.16, s: 58, l: 56 }
      : isGreen ? { a: 0.30, s: 66, l: 50 } : { a: 0.24, s: 62, l: 48 }
    return { hue, hue2, hue3, bx, by, tilt, hatch, ground, bloom, wordSize: wordSizeFor(word) }
  }, [word, partOfSpeech])

  const { hue, hue2, hue3, bx, by, tilt, hatch, ground, bloom, wordSize } = art
  const hasIpa = Boolean(ipa && String(ipa).trim())

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        overflow: 'hidden',
        // Layer 1 — the ground: ink, tinted by part of speech. Low saturation on
        // purpose; the plate should read as printed stock, not as a colour blob.
        background: `linear-gradient(${tilt}deg,
          hsl(${hue} ${ground.s}% ${ground.l}%) 0%,
          hsl(${hue2} ${ground.s - 3}% ${ground.l - 4}%) 58%,
          hsl(${hue3} ${ground.s - 8}% ${ground.l - 7}%) 100%)`,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
        ...style,
      }}
    >
      {/* Layer 2 — one restrained directional bloom + a cool counter-light. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(circle at ${bx}% ${by}%, hsla(${hue2} ${bloom.s}% ${bloom.l}% / ${bloom.a}) 0%, transparent 60%),
            radial-gradient(circle at ${100 - bx}% 92%, hsla(${hue3} 46% 34% / 0.18) 0%, transparent 56%)`,
        }}
      />

      {/* Layer 3 — engraved hatching. Gives the surface tooth so it reads as a
          printed plate rather than a soft gradient. Skipped behind a photo,
          where it would moiré against the artwork. */}
      {isSpecimen && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `repeating-linear-gradient(${hatch}deg,
              rgba(255,255,255,0.045) 0px, rgba(255,255,255,0.045) 1px,
              transparent 1px, transparent 7px)`,
            opacity: 0.7,
          }}
        />
      )}

      {/* Layer 4 — the specimen: the word, a hairline rule, its IPA, and a ring
          motif bleeding off the corner. Drawn in SVG so the type scales with the
          card and can never overflow. Latin only — Arabic must never go in
          SVG <text> (no shaping). */}
      {/* On a specimen card the word lives only inside the SVG above, which
          assistive tech cannot be trusted to read — so expose it as real text. */}
      {isSpecimen && (
        <span
          style={{
            position: 'absolute', width: 1, height: 1, padding: 0, margin: -1,
            overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0,
          }}
        >
          {word}
        </span>
      )}

      <svg
        aria-hidden="true"
        viewBox="0 0 160 100"
        // The plate is 16:10, so `slice` scales uniformly here — and if the card
        // aspect ever drifts, the type crops instead of stretching. xMin keeps
        // the start edge (where the type sits) anchored.
        preserveAspectRatio="xMinYMid slice"
        // direction:ltr is REQUIRED — the app renders dir="rtl", and SVG <text>
        // inherits it, which flows these Latin strings off the start edge.
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', direction: 'ltr' }}
      >
        {/* hairline ring, bleeding off the top corner */}
        <circle cx="140" cy="8" r="34" fill="none" stroke={`hsla(${hue2} 70% 76% / 0.16)`} strokeWidth="0.7" />
        <circle cx="140" cy="8" r="1.6" fill={`hsla(${hue2} 80% 82% / 0.32)`} />

        {/* specimen label + rule + word. `pronunciation_ipa` is NULL for every
            row today, so the no-IPA composition is the real one. */}
        {isSpecimen && (
        <>
        <text
          x="13" y="27"
          fontFamily="'Inter', system-ui, sans-serif"
          fontWeight="600"
          fontSize="7.4"
          letterSpacing="1.7"
          fill={`hsla(${hue2} 72% 86% / 0.72)`}
          style={{ userSelect: 'none' }}
        >
          {String(partOfSpeech || 'word').toUpperCase()}
        </text>
        <path d="M13 33 H147" stroke="rgba(255,255,255,0.10)" strokeWidth="0.6" fill="none" />

        {/* the word — the subject of the card */}
        <text
          x="13"
          y={hasIpa ? 66 : 72}
          fontFamily="'Playfair Display', Georgia, serif"
          fontWeight="700"
          fontSize={wordSize}
          fill="rgba(255,255,255,0.95)"
          style={{ userSelect: 'none' }}
        >
          {word}
        </text>

        {hasIpa && (
          <text
            x="13" y="82"
            fontFamily="'Inter', system-ui, sans-serif"
            fontWeight="400"
            fontSize="8.5"
            letterSpacing="0.2"
            fill="rgba(255,255,255,0.5)"
            style={{ userSelect: 'none' }}
          >
            {String(ipa).trim()}
          </text>
        )}
        </>
        )}
      </svg>

      {/* Layer 5 — a single glass sheen so the plate catches light like the app's glass. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(102deg, transparent 38%, rgba(255,255,255,0.05) 48%, transparent 58%)',
        }}
      />

      {/* Layer 6 — grain. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: GRAIN,
          opacity: 0.14,
          mixBlendMode: 'overlay',
        }}
      />

      {/* Layer 7 — scrim, so the plate marries the card body exactly like a photo does. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, transparent 46%, rgba(6,14,28,0.66) 100%)',
        }}
      />
    </div>
  )
}
