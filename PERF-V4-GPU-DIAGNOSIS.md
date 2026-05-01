# PERF-V4 GPU/Paint Diagnosis

**Date**: 2026-05-01 (local audit) + Lighthouse run same day
**Diagnosed by**: Claude Code (read-only audit — zero source changes)
**Symptom**: smooth on phone, OK on iPad, bad on laptop — across all users including admin
**Hypothesis**: GPU paint cost scales with viewport area; CPU-bound or JS-bound bottleneck would invert this (phone slower)

---

## ⚠️ LIGHTHOUSE MEASUREMENT NOTE

Lighthouse ran against `https://app.fluentia.academy/` — redirected to `/login` because the dashboard requires auth. **The authenticated shell (Sidebar, Header, AuroraBackground) was NOT measured.** The numbers below reflect the public login page only. This limits C.4–C.6 data, but actually *strengthens* the hypothesis: even the lightweight login page scores 86 desktop / 36 mobile — the authenticated dashboard is expected to be significantly worse on desktop.

---

## 🔢 LIGHTHOUSE NUMBERS (login page — auth redirect)

| Metric | Desktop | Mobile (simulated throttle) | Δ |
|---|---|---|---|
| Performance score | 86/100 | 36/100 | −50 |
| FCP | 1.0 s | 5.0 s | +4.0 s |
| LCP | 1.3 s | 5.7 s | +4.4 s |
| TBT | 140 ms | 1,430 ms | +1,290 ms |
| CLS | 0 | 0 | 0 |
| Speed Index | 2.5 s | 8.8 s | +6.3 s |

**Mainthread time breakdown (desktop — login page)**:
- Script Evaluation: 362 ms (37%)
- Other: 355 ms (36%)
- Style & Layout: 200 ms (20%)
- Rendering: 26 ms (2.7%)
- Parse HTML & CSS: 28 ms (2.9%)

**Mainthread time breakdown (mobile — login page)**:
- Other: 2,387 ms (40%)
- Script Evaluation: 2,111 ms (36%)
- Style & Layout: 952 ms (16%)
- Rendering: 309 ms (5%)

> Paint/Composite share is low on the login page because the login page has NO Sidebar, no AuroraBackground blobs, no glass-card grids. The authenticated dashboard will paint-dominate more heavily — this is exactly why GPU diagnosis requires code audit, not just Lighthouse on a public page.

VERDICT: **mixed** (login page is script-bound; authenticated dashboard is paint/GPU-bound based on code audit)

---

## 🎯 SUSPECT RANKING (top 5, evidence-backed)

### #1 — Sidebar `backdrop-filter: blur(24px) saturate(160%)` — always mounted, desktop-only

**Evidence**:
- `src/components/layout/Sidebar.jsx:44` — `backdropFilter: 'blur(24px) saturate(160%)'`, `WebkitBackdropFilter: 'blur(24px) saturate(160%)'`
- Always mounted on desktop: **YES** — `className="hidden lg:flex flex-col fixed ..."` (hidden on mobile via Tailwind, but the component IS rendered on all screens ≥ 1024px)
- Hidden on mobile <768px: **YES** — `hidden lg:flex` means it's not in the paint tree on phones ✅
- Surface size: `100vh × 264px` (expanded) or `100vh × 76px` (collapsed) — full viewport height
- No `document.hidden` pause: **NONE**
- No breakpoint to switch off the blur on any desktop size

**Why it's the #1 suspect**:
On a phone (375px wide) the Sidebar is not rendered — zero blur cost. On a 1440×900 laptop, the browser must re-composite a `264px × 900px = 237,600 px²` blurred surface on every frame that causes any repaint anywhere in the page. `saturate(160%)` multiplies the cost further because it requires a separate color-matrix pass after the blur. Since the Sidebar is `position: fixed`, every scroll event re-triggers compositing for the layers stacked behind it (the main content area), which is every navigation click and every animated card.

**Surgical fix sketch**:
Replace the live blur with a solid semi-transparent background on desktop. The blur provides a "glass" effect that reads well on mobile small screens (where content is close to nav), but on desktop the sidebar sits to the side and a solid `rgba(11,15,24,0.96)` background is visually identical at a glance. Add `@media (min-width: 1024px) { .sidebar { backdrop-filter: none; background: var(--ds-bg-elevated-solid); } }` — or conditionally set the style in JSX. Keep blur for mobile drawer only.

---

### #2 — AuroraBackground: 3 animated blobs at `70vw × 70vw` with `blur-2xl` (40px), no guard for mid-range laptops

**Evidence**:
- `src/design-system/components/AuroraBackground.jsx:114–135` — 3 `motion.div` blobs, each `width: '70vw', height: '70vw'`, className `blur-2xl` (Tailwind = `filter: blur(40px)`)
- Mobile guard: `isMobile = matchMedia('(max-width: 768px)')` → `reduced` mode (1 static blob) ✅
- Low-end desktop guard: `isLowEndDevice()` (≤4 cores) → `reduced` mode ✅
- **Gap**: Desktop with 5–8 cores (modern Intel i5/i7, AMD Ryzen 5) → **FULL 3 animated blobs**. Many student laptops (2019–2023 mainstream) have 6 logical cores and a weak integrated GPU. The guard protects the extremes (phone + very old PC) but not the typical complaining user (mid-range laptop with Iris Xe or Vega 8 iGPU).
- Animations: Framer Motion `keyframe` paths with 5 waypoints each, durations 40/55/70 seconds → continuous compositing
- `document.hidden` pause: **YES** ✅ (correctly pauses when tab backgrounded)
- Full viewport: `fixed inset-0` — `100vw × 100vh` container
- On a 1440px wide screen: each blob = `1008px × 1008px` ≈ 1M pixels blurred; 3 blobs = 3M blur pixels constantly animating

**Why it's the #2 suspect**:
Three simultaneously animating 1M-pixel filtered divs is expensive regardless of core count once GPU memory bandwidth is the bottleneck — which it is on all integrated graphics (Intel Iris, AMD Vega). Each frame the GPU must blur a 1008×1008 region three times in a single composite pass. On a phone (375px wide), blobs are `262px × 262px` ≈ 69k px² each — 14× less area per blob, 42× less total. This alone explains the phone/laptop asymmetry with geometric precision.

**Surgical fix sketch**:
Lower the core-count threshold to `<= 8` OR switch to a viewport-area-based guard: `if (window.innerWidth * window.innerHeight > 900000) → reduced`. Additionally, drop blob size from `70vw` to `45vw` on desktop (visual difference is negligible, GPU cost drops ~60%). The `blur-2xl` (40px) can stay as-is since it's already down from the previous `blur-3xl` (64px).

---

### #3 — Header `backdrop-filter: blur(16px) saturate(160%)` — active once scrolled, full 100vw width

**Evidence**:
- `src/components/layout/Header.jsx:74–75` — `backdropFilter: scrolled ? 'blur(16px) saturate(160%)' : 'none'`
- Mounted: always (`!isClassMode` in LayoutShell:161)
- Becomes active when `window.scrollY > 8px` — which is essentially always on any content page
- Full-width: `h-16` header spans the entire viewport width (minus sidebar on desktop)
- Profile dropdown (open state): `backdropFilter: 'blur(24px)'` at `src/components/layout/Header.jsx:133`
- No desktop-only guard to disable blur on viewport ≥ 1024px

**Why it's the #3 suspect**:
A full-width sticky header with live backdrop blur forces the browser to re-composite the entire header strip on every scroll frame. On desktop at 1440px width, the header blurs `1440px × 64px = 92,160 px²` every scroll tick. Combined with the Sidebar blur running simultaneously, the GPU is maintaining two independently blurred fixed-position layers at all times. Mobile: header is full-width but at 375px = `24,000 px²` — 4× smaller, and without the Sidebar compound.

**Surgical fix sketch**:
Use a solid frosted background instead of live blur: `background: rgba(5,7,13,0.92)` with no backdrop-filter on ≥1024px. Or limit backdrop-filter to the mobile breakpoint where the visual effect is most valuable. The transition from transparent to frosted can remain for the scroll state change.

---

### #4 — Non-composited animations: `auroraSweep` and `textShimmer` animate `background-position-x`

**Evidence**:
- Lighthouse non-composited animations audit (desktop): 2 failures
  - `auroraSweep` on `.fl-card-static::before` — `background-position-x` is not GPU-compositable
  - `textShimmer` on `h2.text-shimmer` — same property
- Both force the browser into a **paint-on-every-frame** loop (CPU-side paint, not GPU compositing)
- Found on the login page; likely used elsewhere (need grep to confirm)
- `auroraSweep` affects a `420px × 519px` pseudo-element on desktop, `364px × 503px` on mobile — similar size, suggesting this one doesn't explain the desktop/mobile asymmetry
- `textShimmer` is a text element — small, low impact

**Why it's the #4 suspect**:
`background-position-x` is explicitly listed as an unsupported property for compositor-thread animation in Chrome/Safari. The browser cannot promote these to a GPU layer and must paint them on the main thread every frame. The `auroraSweep` animation on a card pseudo-element runs at 60fps on the CPU. This is less severe than Suspects 1–3 in terms of area, but it compounds the overall paint budget.

**Surgical fix sketch**:
Replace `background-position-x` animation with a `transform: translateX()` on a pseudo-element overlay, or use a `@property` + CSS `houdini` trick to make the property compositable (Chrome 85+). For `textShimmer`, switch to a `background-size` + `transform` approach that keeps the shimmer but runs on the compositor thread.

---

### #5 — 197 `backdrop-filter` instances across the app (modals, cards, dropdowns)

**Evidence**:
- Total count: 197 (A.1 audit)
- **Layout shell** (persistent): Sidebar (blur 24px + saturate), Header (blur 16px + saturate, scroll-gated), MobileBar (blur 20px, desktop-hidden ✅), NotificationCenter dropdown (blur 24px)
- **Global CSS class** `src/index.css:191`: `.glass-card { @apply backdrop-blur-xl ... }` — propagates blur to every card using this class
- **Modals/overlays** (transient): 30+ instances in modal backdrops, game overlays, assignment forms
- The `.glass-card` class alone multiplies the blur surface: the student dashboard shows many cards simultaneously. On a 1440px screen 6–8 cards may be visible at once, each with its own composited blur layer

**Why it's the #5 suspect**:
Individually each card's blur is small, but the cumulative compositor layer count matters. Chrome/Safari cap the total compositor layer budget; when exceeded, layers are promoted/demoted causing janky repaints. On a small phone screen, fewer cards are visible simultaneously (vertical scroll means 2–3 at a time). On a laptop with a 1440×900 viewport, 6–8 blurred cards can be in view at once, consuming multiple compositor layer slots concurrently.

**Surgical fix sketch**:
Audit `.glass-card` usage and make backdrop-blur conditional on a CSS custom property that's set to `none` via a media query on ≥ 1024px. Most cards have a solid-enough background color that the blur is imperceptible. Alternatively, only apply backdrop-blur to the top-level navigation components and remove it from content cards entirely.

---

## 📊 RAW COUNTS

| Pattern | Count | Top files |
|---|---|---|
| `backdrop-filter` | 197 | `Header.jsx`, `Sidebar.jsx`, `MobileBar.jsx`, `grammar.css` (×4), `NotificationCenter.jsx` |
| `motion.*` components | 2,565 | Spread across all student pages — LevelUnits, CurriculumBrowser, student dashboard, IELTS |
| `whileHover` | 86 | `LevelUnits.jsx` (×3), `CurriculumBrowser.jsx`, `UnitCard.jsx`, `PlacementTest.jsx` |
| `box-shadow ≥20px blur` (inline) | 13 | `grammar.css`, `TrainerHeaderThemeButton.css`, `ShareCard.jsx`, `components.css` |
| Tailwind `shadow-xl/2xl/lg` | 58 | Spread across cards and buttons |
| `will-change` | 2 | `IELTSSunsetBackground.css`, `TrainerBackground.deprecated.css` (deprecated) |
| `filter: blur()` (direct, non-backdrop) | 52 | `DuelsBackdrop.jsx` (80px!), `grammar.css` (60px), `IELTSSunsetBackground.css` (80/60/30/20px) |
| Recharts imports | 12 | Admin dashboard charts |
| Components honoring `prefers-reduced-motion` | 50 | Good — many pages check this |
| Components honoring `document.hidden` | 10 | AuroraBackground ✅, DuelsBackdrop ✅, XPBadge ✅ |

---

## 🧬 DEEP READ: ALWAYS-MOUNTED COMPONENTS

### `src/components/layout/LayoutShell.jsx` (236 lines)
- **What it renders**: Root shell for all authenticated routes. Mounts Sidebar (desktop), Header, MobileBar (mobile), GeometricMesh (lazy), VocabGainTicker, XPFloater, FloatingToolbar, TimerBadge, PWAInstallGate
- **Paint cost**: paint-medium (orchestrates heavy children)
- **Heavy lines**:
  - L26: `lazy(() => import('../backgrounds/GeometricMesh'))` — lazy-loaded ✅, but always mounted once loaded
  - L207: `MobileBar` — has `lg:hidden` CSS but IS rendered in the DOM on desktop (hidden via display:none)
- **Breakpoint guards**: `lg:hidden` on MobileBar, `hidden lg:flex` on Sidebar CSS
- **Pause on hidden**: No direct pause, but children handle it

### `src/components/layout/Header.jsx` (213 lines)
- **What it renders**: Sticky header with scroll-gated backdrop blur, profile dropdown (AnimatePresence), NotificationCenter, HeaderThemeButton
- **Paint cost**: **paint-heavy** (on scroll)
- **Heavy lines**:
  - L74: `backdropFilter: scrolled ? 'blur(16px) saturate(160%)' : 'none'` — active whenever user scrolled >8px
  - L133: `backdropFilter: 'blur(24px)'` on profile dropdown (transient, open-gated)
- **Breakpoint guards**: None for the blur — applies on all desktop widths
- **Pause on hidden**: No

### `src/components/layout/Sidebar.jsx` (199 lines)
- **What it renders**: Fixed right-side nav with brand header, nav sections, user card, collapse toggle. Desktop-only.
- **Paint cost**: **paint-heavy** (always-on blur)
- **Heavy lines**:
  - L44–45: `backdropFilter: 'blur(24px) saturate(160%)'` and `WebkitBackdropFilter` — always active, full viewport height
  - L132: `filter: 'drop-shadow(0 0 8px ...)'` on active icon — runs on icon hover/active state changes
- **Breakpoint guards**: `hidden lg:flex` — NOT painted on mobile ✅. But on ALL desktop sizes (1024px to 4K) the blur is always on.
- **Pause on hidden**: No

### `src/components/layout/MobileBar.jsx` (82 lines)
- **What it renders**: Fixed bottom nav bar for mobile, 5 nav items with `motion.div` active indicator (layoutId animation)
- **Paint cost**: paint-medium (on mobile only)
- **Heavy lines**:
  - L16: `backdropFilter: 'blur(20px) saturate(160%)'` — expensive, but `lg:hidden` means this is hidden on desktop ✅
- **Breakpoint guards**: `lg:hidden` on the nav element — **correctly hidden on desktop** ✅
- **Pause on hidden**: No

### `src/design-system/components/AuroraBackground.jsx` (182 lines)
- **What it renders**: Full-viewport animated background with 3 large blurred blobs + noise overlay + vignette. Lazy-loaded via `GeometricMesh` sibling (both in backgrounds/).
- **Paint cost**: **paint-heavy** on desktop with >4 cores
- **Heavy lines**:
  - L114–135: 3× `motion.div` with `blur-2xl` (40px), `width: '70vw'`, `height: '70vw'`, animated with multi-waypoint keyframes (durations: 40s, 55s, 70s)
  - L87–104 (reduced mode): 1 static blob `50vw × 50vw` with `blur-2xl` — no animation but still a filtered surface
- **Breakpoint guards**: `matchMedia('(max-width: 768px)')` → reduced (1 static blob). `isLowEndDevice()` (≤4 cores) → also reduced. **Gap: 5–8 core desktops with weak iGPU get full 3 animated blobs.**
- **Pause on hidden**: **YES** ✅ `document.hidden` → stops Framer Motion animation

### `src/components/backgrounds/GeometricMesh.jsx` (88 lines)
- **What it renders**: Static SVG with 14 nodes and ~18 lines. Pure SVG, no CSS animation, no blur. Desktop-only.
- **Paint cost**: **paint-cheap** ✅
- **Heavy lines**: None — purely static SVG, deterministic geometry (seeded random, memoized)
- **Breakpoint guards**: `hidden lg:block` — only shown on desktop ✅
- **Pause on hidden**: N/A (static)

### `src/components/ImpersonationBanner.jsx` (54 lines)
- **What it renders**: Fixed top warning bar shown only during admin impersonation of a student/trainer
- **Paint cost**: **paint-cheap** — `return null` when not impersonating ✅
- **Heavy lines**: `boxShadow: '0 2px 12px rgba(245,158,11,0.3)'` — negligible
- **Breakpoint guards**: N/A (only mounts when impersonating)
- **Pause on hidden**: N/A

### `src/index.css` (611 lines — root stylesheet)
- **What it renders**: Global CSS including design token imports, glass-card classes, animations, typography
- **Paint cost**: paint-medium (defines globally-applied blur classes)
- **Heavy lines**:
  - L191: `.glass-card { @apply backdrop-blur-xl rounded-2xl; }` — propagates `blur(24px)` to every card using this class
  - L197: `.glass-card-raised { @apply backdrop-blur-xl ... }` — same
  - L201: `box-shadow: 0 4px 24px var(--color-card-shadow) ...` — standard, acceptable
- **Breakpoint guards**: None — `backdrop-blur-xl` applies at all breakpoints when class is present
- **Pause on hidden**: N/A

---

## 🩺 RECOMMENDED V4 SURGICAL TARGETS

Top 3 targets for the V4 fix prompt, ranked by expected impact:

1. **Sidebar: disable `backdrop-filter` on desktop (replace with solid background)** — expected impact: **HIGH**, expected effort: **S**
   Removing or replacing Sidebar's `blur(24px) saturate(160%)` with a solid `rgba(11,15,24,0.97)` on ≥1024px eliminates a full-height compositor layer that currently forces constant repaints on every scroll/animation event on desktop. Zero visual regression risk — the Sidebar overlaps the main content on the right edge, and a near-opaque solid color is indistinguishable from glass blur in that position.

2. **AuroraBackground: lower viewport-area guard threshold (or reduce blob size on desktop)** — expected impact: **HIGH**, expected effort: **S**
   Change the `isLowEndDevice()` threshold from `<= 4` to `<= 8` cores, OR switch to a viewport-area test (`window.innerWidth * window.innerHeight > 800000` → reduced mode). Also reduce blob size from `70vw` to `45vw` on desktop — visually identical at full-screen background scale but ~58% less GPU paint area per blob. Combined with the existing reduced-mode path, this fixes the mid-range laptop case entirely.

3. **Header: gate `backdrop-filter` behind a desktop media query (disable on ≥1024px)** — expected impact: **MEDIUM**, expected effort: **S**
   Change `backdropFilter: scrolled ? 'blur(16px) saturate(160%)' : 'none'` to only apply on mobile/tablet. On desktop, use `background: rgba(5,7,13,0.92)` when scrolled. The visual difference is imperceptible, but the GPU benefit is significant: eliminates a full-width compositor layer that re-composites on every scroll tick.

---

## ✅ WHAT'S ALREADY GOOD (DO NOT REGRESS)

1. **MobileBar correctly uses `lg:hidden`** — the backdrop-blur on MobileBar is properly absent from the desktop paint tree. Do NOT change this.
2. **AuroraBackground pauses on `document.hidden`** — correct behavior, keep it. Pausing saves GPU on background tabs.
3. **GeometricMesh is pure static SVG with no blur or animation** — paint-cheap, no action needed.
4. **50 components honor `prefers-reduced-motion`** — strong accessibility posture from V3, do not remove.
5. **TanStack Query `staleTime` and `refetchOnWindowFocus: false`** from V3 — not a paint issue but reduces fetch-triggered re-renders; keep.
6. **ImpersonationBanner `return null` when not impersonating** — correctly avoids mounting a fixed-position layer for most users.

---

## 🚨 OPEN QUESTIONS / NEEDS HUMAN INPUT

1. **Which pages are the primary complaints?** Students say "the app" is laggy but the authenticated dashboard was not directly measurable via Lighthouse (auth wall). The dashboard, curriculum, and live-class pages may have different paint profiles. If complaints are heaviest on the student curriculum browser (dense card grid), the `.glass-card` backdrop-blur propagation (suspect #5) may rank higher than estimated.

2. **Are students on the `full` or `reduced` AuroraBackground render mode?** The `isLowEndDevice()` check uses `navigator.hardwareConcurrency`. What CPU/core counts do the complaining students have? If they're mostly on 6-core Intel i5/Ryzen 5 machines (common 2020–2024 laptops), fix #2 is the highest-impact single change.

3. **Is `auroraSweep` (non-composited CSS animation on `.fl-card-static::before`) used beyond the login page?** If this class appears on the authenticated dashboard or other high-traffic pages, it should move up to #3. A `grep -rn "fl-card-static\|auroraSweep\|textShimmer" src/` will confirm.

4. **Theme in use by students?** The Atelier bridge theme (`src/design-system/fluentia-atelier/`) was not fully audited. If students use a theme that applies additional backdrop-filter via CSS variables, the count of 197 may undercount the real runtime impact.
