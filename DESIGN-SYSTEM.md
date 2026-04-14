# Fluentia Design System

> Source of truth for the Fluentia OS visual language. Phase 0 Foundation.

## 1. Principles

1. **Cinematic** — Every surface, transition, and animation should feel like a premium experience. Think Apple keynotes, MasterClass UI.
2. **Purposeful** — Motion and ornamentation serve comprehension, never decoration alone. If it doesn't help the learner, remove it.
3. **RTL-native** — Arabic-first. Use logical properties (`margin-inline-start`, `padding-block-end`). Never assume LTR.
4. **Accessible** — Respect `prefers-reduced-motion`, maintain WCAG AA contrast ratios, support screen readers.

## 2. Themes

### Aurora Cinematic (`aurora-cinematic`) — Default
Deep navy base with animated cyan/violet/gold auroras. Premium tech feel.
- Best for: immersive learning, focus sessions, evening study
- Primary accent: Cyan `#38bdf8`

### Night Sky Luxurious (`night`)
Obsidian black with warm gold warmth and faint constellation stars. Editorial luxury.
- Best for: reading-heavy content, assessments, formal contexts
- Primary accent: Gold `#e9b949`

### Modern Minimal (`minimal`)
Light neutral base, sharp typography, confident cyan accent. Clean productivity.
- Best for: daytime use, content creation, admin workflows
- Primary accent: Deep cyan `#0284c7`

## 3. CSS Variables (Full Contract)

All variables are prefixed with `--ds-` to avoid collision with the legacy token system.

```
/* Backgrounds */
--ds-bg-base, --ds-bg-elevated, --ds-bg-overlay

/* Surfaces */
--ds-surface-1, --ds-surface-2, --ds-surface-3

/* Borders */
--ds-border-subtle, --ds-border-strong

/* Text */
--ds-text-primary, --ds-text-secondary, --ds-text-tertiary, --ds-text-inverse

/* Accents */
--ds-accent-primary, --ds-accent-primary-glow, --ds-accent-secondary
--ds-accent-gold, --ds-accent-success, --ds-accent-warning, --ds-accent-danger

/* Aurora layer */
--ds-aurora-1, --ds-aurora-2, --ds-aurora-3, --ds-aurora-opacity

/* Shadows */
--ds-shadow-sm, --ds-shadow-md, --ds-shadow-lg, --ds-shadow-glow

/* Motion (shared, theme-independent) */
--motion-fast (150ms), --motion-base (240ms), --motion-slow (420ms), --motion-cinematic (680ms)
--ease-out, --ease-in-out, --ease-bounce

/* Radii */
--radius-sm (8px), --radius-md (14px), --radius-lg (20px), --radius-xl (28px), --radius-full

/* Spacing */
--space-1 (4px) through --space-9 (96px)
```

## 4. Components

### `<AuroraBackground />`
Fixed full-screen animated background with three blobs, noise grain, and vignette. Shows constellation dots only in `night` theme.

### `<GlassPanel elevation={1|2|3} padding="sm|md|lg|xl" glow hover>`
Foundational surface with backdrop blur (dark themes), theme-aware borders, optional hover lift and glow.

### `<PremiumCard header footer accent="primary|gold|success|warning|danger">`
Opinionated card wrapping GlassPanel. Supports accent strip on inline-start edge.

### `<SectionHeader kicker title subtitle align="start|center" />`
Cinematic section title with staggered reveal. Auto-detects Arabic for font selection.

### `<StatOrb label value icon trend glow="primary|gold|success" />`
Stat display with counting-up animation and glow orb.

### `<PrimaryButton />` / `<SecondaryButton />` / `<GhostButton />`
Props: `size="sm|md|lg"`, `disabled`, `loading`, `icon`, `children`

### `<CinematicTransition>`
AnimatePresence wrapper for route-level page transitions. Fade+slide, keyed by pathname.

### `<StaggeredList stagger={0.06}>`
Wraps children in staggered fade+slide-in animations.

### `<EmptyState message actionLabel onAction icon />`
Centered empty state with optional CTA button.

### `<DSLoadingSkeleton rows={3} />`
Theme-aware shimmer loading skeleton.

## 5. Motion Principles

| Token | Duration | Use case |
|-------|----------|----------|
| `--motion-fast` | 150ms | Micro-interactions (hover, press) |
| `--motion-base` | 240ms | Standard transitions (tab switch, dropdown) |
| `--motion-slow` | 420ms | Reveals (card entry, section appear) |
| `--motion-cinematic` | 680ms | Hero animations, page transitions |

**Easings:**
- `--ease-out` — Most animations (decelerate into rest)
- `--ease-in-out` — Symmetrical moves (modals, drawers)
- `--ease-bounce` — Playful feedback (achievement unlocks)

**Reduced motion:** All durations become `0ms` when `prefers-reduced-motion: reduce` is active.

## 6. RTL & Typography

- Global `direction: rtl` on `<html>`
- Use logical properties: `margin-inline-start`, `padding-block-end`, `inset-inline-start`
- Primary font: **Tajawal** (Arabic), system sans-serif fallback
- Heading font: **Tajawal 800** (Arabic) or **Playfair Display** (English)
- SectionHeader auto-detects Arabic content for font selection

## 7. Migration Guide

To migrate an existing page to the design system:

1. Replace hardcoded `bg-[#060e1c]` → use `var(--ds-bg-base)` or remove (body already has it)
2. Replace `text-[#f0f4f8]` → `var(--ds-text-primary)`
3. Wrap stat cards in `<StatOrb>` or `<GlassPanel>`
4. Wrap card lists in `<StaggeredList>`
5. Replace section titles with `<SectionHeader>`
6. Use `<PrimaryButton>` / `<SecondaryButton>` for CTAs
7. Test all three themes via ThemeSwitcher

## 8. ThemeSwitcher

- **Visible only to admin UUIDs** (gated in component)
- Floating pill: top-left desktop, bottom-right mobile
- Three swatches with color dots + active checkmark
- Persists to `localStorage` key: `fluentia-theme`
- Default theme: `aurora-cinematic`
- Toast confirmation in Arabic on switch

## 9. Changelog

### v0.1.0 — Phase 0 Foundation (2026-04-14)
- Three swappable themes: aurora-cinematic, night, minimal
- Component library: AuroraBackground, GlassPanel, PremiumCard, SectionHeader, StatOrb, Buttons, CinematicTransition, StaggeredList, EmptyState, DSLoadingSkeleton
- Admin-only ThemeSwitcher with localStorage persistence
- AuroraBackground mounted at app root
- ThemeProvider restores theme on boot
- No existing pages modified
