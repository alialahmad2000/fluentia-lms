# Dashboard 100× — Phase C

Date: 2026-05-25 · Branch: `dashboard-100x-variants`

## Built
| Piece | Status |
|---|---|
| `useStudentDashboard` hook — 14-domain unified feed, resilient per-domain | BUILT |
| Routing switch (`StudentDashboard.jsx`) — `?design=v1/v2/v3`, default = Original | BUILT |
| Original preserved as `StudentDashboardOriginal.jsx` (untouched) | BUILT |
| V1 Editorial — magazine, Playfair-italic display, editorial copy, restrained motion | BUILT |
| V2 Cinematic — glass cards, drifting gradient, orchestrated motion, animated chart | BUILT |
| V3 Atelier-Minimal — Bauhaus typographic blocks, gold hairlines only, quiet motion | BUILT |
| Babel parse (6 files) | PASS |
| Default-export wiring matches switch imports | PASS |
| Data feed unified (variants don't fetch) | PASS |
| Reduced-motion (`useReducedMotion`) in each variant | BUILT |
| Empty states per widget per variant | BUILT |
| Production default route unchanged (no `?design` → Original) | PASS (by construction) |
| `?design=invalid` → Original (no crash) | PASS (switch default) |
| **Aesthetics validated in browser** | **NOT DONE — headless; review preview** |
| **Runtime render (no console errors) on a live student** | **PENDING preview** |
| Lighthouse mobile ≥ 75 / CLS ≤ 0.05 measured | NOT RUN (needs deployed preview) |

## Honest status
All 6 files parse, the prop contract is wired, and the data hook degrades gracefully per domain. **Visual quality and runtime behavior were NOT validated** — that's headless-impossible and is exactly what the preview is for.

## How to choose (open on iPhone Safari first)
- `https://app.fluentia.academy/student?design=v1` → Editorial
- `https://app.fluentia.academy/student?design=v2` → Cinematic
- `https://app.fluentia.academy/student?design=v3` → Atelier-Minimal
- `https://app.fluentia.academy/student` → current default (unchanged)

Per variant ask: Would Hanouf screenshot it? Does it say "Fluentia" at a glance? Where does your eye land first? Calm to live in for 6 months? Does the Arabic feel designed-for, not translated-into? Then say "I pick V[n]" and a cleanup pass makes it default + removes the rest.

## Known data caveats (variants show empty states for these)
- `daily_challenge: null` — the `daily_challenges` table is empty in prod.
- `next_class.starts_at: null` — `groups.schedule` parsing to a concrete next occurrence was deferred; meet link is surfaced, countdown shows empty until schedule parsing is added.
- `assignments: []`, `trainer_note: null` — not wired this pass (no confident single source); empty states render.
- `level.percent` is an approximate within-level value (no XP-threshold table); treat the ring/bar as indicative.
- `team.rank/size` = 0 (not computed).

## Deviation
- **Cormorant Garamond not loaded** → Editorial/Cinematic use the loaded **Playfair Display** for display type (no new deps / no global CSS, per rules).
