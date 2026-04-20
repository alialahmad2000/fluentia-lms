# IELTS V3 Phase 0A — Discovery Report

| Check | Result |
|---|---|
| Existing masterclass folder | CREATED (new) |
| --ds-* tokens count | 24 tokens in :root |
| Tokens to add | `--ds-sky`, `--ds-amber`, `--ds-reveal-bg`, `--ds-reveal-text` |
| Framer Motion version | ^11.12.0 |
| RTL pattern | Per-component `dir="rtl"` attribute |
| Typography | Tajawal (Arabic), Playfair Display (English display), inline font-family strings |
| Admin routes section in App.jsx | Lazy imports ~line 180, routes ~line 754 |

## Token Inventory (existing)

Backgrounds: `--ds-bg-base`, `--ds-bg-elevated`, `--ds-bg-overlay`
Surfaces: `--ds-surface-1`, `--ds-surface-2`, `--ds-surface-3`
Borders: `--ds-border-subtle`, `--ds-border-strong`
Text: `--ds-text-primary`, `--ds-text-secondary`, `--ds-text-tertiary`, `--ds-text-inverse`
Accents: `--ds-accent-primary`, `--ds-accent-primary-glow`, `--ds-accent-secondary`, `--ds-accent-gold`, `--ds-accent-success`, `--ds-accent-warning`, `--ds-accent-danger`
Aurora: `--ds-aurora-1`, `--ds-aurora-2`, `--ds-aurora-3`, `--ds-aurora-opacity`
Shadows: `--ds-shadow-sm`, `--ds-shadow-md`, `--ds-shadow-lg`, `--ds-shadow-glow`
Flag: `--ds-is-dark`
Motion: `--motion-fast(150ms)`, `--motion-base(240ms)`, `--motion-slow(420ms)`, `--motion-cinematic(680ms)`
Easing: `--ease-out`, `--ease-in-out`, `--ease-bounce`
Radius: `--radius-sm/md/lg/xl/full`
Space: `--space-1` through `--space-9`

## New Tokens Added

- `--ds-sky` — sky/cyan color for positive delta indicators
- `--ds-amber` — amber color for negative delta / warnings
- `--ds-reveal-bg` — near-opaque overlay for NarrativeReveal / ChapterTransition
- `--ds-reveal-text` — calm foreground text in reveal overlays

## Motion Conventions

- `useReducedMotion()` hook respected in all animated components
- `whileInView + viewport={{ once: true }}` for scroll-triggered reveals
- Easing: `[0.22, 1, 0.36, 1]` (ease-out-expo equivalent)
- Pattern: `AnimatePresence mode="wait"` for overlay enter/exit

## RTL Pattern

- Per-component: `dir="rtl"` on root element for Arabic-content components
- Mixed content (English + Arabic): `dir="auto"` per text block
- No global RTL (app serves both languages)
- Icons with direction (chevron, arrow): mirrored via `transform: scaleX(-1)` in RTL where needed

## Export Pattern

- Default exports for all 10 components
- Named re-exports from `index.js`
- Showcase page: lazy-loaded in App.jsx admin routes
