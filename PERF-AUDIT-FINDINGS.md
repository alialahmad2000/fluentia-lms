# PERF-AUDIT-FINDINGS — Evidence-Based Performance Pass (2026-06-11)

Scope: measure → protect → optimize, **zero behavior change** to protected surfaces
(activity auto-save/submit, auth, listening pipeline, push/SW handlers, DB).
Baseline commit: `4a27601` (origin/main). All numbers measured, not estimated.

## Baseline (BEFORE)

Build: `vite build`, production mode. Runtime: Playwright vs `vite preview` (localhost,
service workers **blocked** so the app is measured, not the SW cache), viewport 1280×800,
student `mock-test-a1`.

| Metric | Chromium | WebKit |
|---|---|---|
| Login page load → content | 1,821 ms | 1,506 ms |
| Login click → dashboard interactive | 1,255 ms | 1,040 ms |
| Dashboard full load | 644 ms | 640 ms |
| Curriculum full load | 533 ms | 456 ms |
| SPA route-nav avg (6 navs) | 210 ms | 70 ms |
| JS heap after 10 rapid navs | 12.8 → 12.8 MB (flat) | n/a (no API) |
| Long tasks ≥ 200 ms (whole session) | 1 (249 ms) | 0 |

Bundle (minified on disk; gz from build log):

| Chunk | Size | gz | In initial load? |
|---|---|---|---|
| entry `index` | 500 kB | 147 kB | YES |
| vendor-supabase | 166 kB | 45 kB | YES (preload) |
| vendor-react | 154 kB | 52 kB | YES (preload) |
| vendor-motion | 118 kB | 40 kB | YES (preload) |
| vendor-query | 51 kB | 16 kB | YES (preload) |
| vendor-dates / zustand / clsx | 23 kB | — | YES (preload) |
| **TOTAL INITIAL JS** | **1,030 kB** | **≈ 320 kB** | |
| UnitContentRouter (lazy) | 737 kB | 141 kB | loads on EVERY unit open |
| vendor-charts (recharts) | 433 kB | 117 kB | lazy ✓ (admin/charts only) |
| eruda | 506 kB | 160 kB | lazy ✓ (`?debug=1` only) |

Entry-chunk composition (rollup-plugin-visualizer, rendered bytes):
App.jsx routes 104 kB · i18next+locales ≈ 145 kB · **layout 70 kB** ·
**ts-fsrs 56 kB** · **components/trainer 51 kB** · lucide (tree-shaken) 39 kB ·
**canvas-confetti 24 kB** · bug-report 19 kB · GlobalSearch 14 kB.

## Ranked bottlenecks (evidence → fix → risk)

1. **`import * as LucideIcons from 'lucide-react'` in `ActivityStation.jsx:3`**
   bundles the ENTIRE icon library (650 kB of UnitContentRouter's 737 kB) into the
   chunk loaded on every unit open. The dynamic lookup only ever receives 7 fixed
   names from `ACTIVITY_MAP` (`useUnitData.js:13-20`): BookOpen, PenLine, Sparkles,
   Headphones, FileEdit, Mic, Video (+Volume2 commented).
   → Fix: static icon map, same fallback (Sparkles). **Risk: LOW** (pure import change).

2. **Trainer-only components eagerly imported by LayoutShell** (`LayoutShell.jsx:18-19`):
   `FloatingToolbar` + `TimerBadge` pull ~51 kB of `components/trainer` into the entry
   chunk for every student. Both render `null` for students (FloatingToolbar gates on
   role internally; TimerBadge reads local-only `classModeStore`, which only a trainer
   device can set — no realtime sync, verified).
   → Fix: lazy + role-gate at the render site. **Risk: LOW** (render-null parity).

3. **`Sidebar.jsx:13` imports `@/services/vocab` for one badge count**, dragging the
   whole vocab service + **ts-fsrs (56 kB)** into the entry chunk.
   → Fix: `import('…/vocab')` inside the badge's `queryFn`. **Risk: LOW** (read path).

4. **`lib/celebrations.js` statically imports canvas-confetti (24 kB)** and is itself
   imported eagerly via GamificationProvider.
   → Fix: dynamic-import confetti on first celebration. **Risk: LOW** (fire-and-forget
   visual; first confetti arrives ~100 ms later, identical visuals).

5. **Render-blocking Google-Fonts stylesheets in `index.html`** for fonts students
   never use on first paint: the 5-family "Atelier" link (preview routes only),
   IBM Plex Sans Arabic (trainer portal), Cormorant Garamond. Each blocks first
   render on cellular.
   → Fix: switch to the async `preload onload` pattern already used for secondary
   fonts (same URLs, same fonts, just non-blocking). **Risk: LOW-MEDIUM** (brief FOUT
   possible on trainer portal first visit; student primary font Tajawal stays blocking).

6. *(report-only)* Duplicate `mock_exam_attempts` read fired twice during boot
   (seen in WebKit network log). Two mounts of `useActiveExamAttempt`; TanStack
   dedupes concurrent identical keys, so these were sequential mounts within
   staleTime-expiry. Harmless reads; not worth risk.

## HIGH-risk items — documented, NOT implemented (protected surfaces / visual)

- **GPU paint cost of backdrop-filter stack** (Sidebar blur(24px), Header blur(16px),
  ~197 `backdrop-filter` uses) and AuroraBackground's 3×70vw animated blobs on
  mid-core desktops — fully diagnosed in `PERF-V4-GPU-DIAGNOSIS.md`. Every proposed
  fix (solid backgrounds, blob-count gates) changes rendered visuals on some devices,
  which this pass forbids ("no visual design changes"). Needs Dr. Ali's design call.
- **i18next + both locale JSONs (~145 kB rendered) in entry.** Splitting `en.json`
  out is possible but touches the i18n bootstrap that gender-aware Arabic depends
  on; deferred as MEDIUM-risk-for-modest-gain.
- **StudentDashboard chunk 216 kB / GrammarTab 236 kB** — already lazy per-route;
  internal splitting would touch activity-tab code adjacent to the protected
  save/submit flow. Documented, skipped.

## Safety net

`tests/perf-safety/` Playwright suite (Chromium + WebKit), runs against a local
`vite preview` of the production build with the designated test account
`mock-test-a1@fluentia.academy` (the project's standing test student — writes are
confined to that account's own rows; no new prod users, no other students touched).
Gate: must be green before AND after every individual optimization commit.

## AFTER (filled in Phase E)

_TBD_
