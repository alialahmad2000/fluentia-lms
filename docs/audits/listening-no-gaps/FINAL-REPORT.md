# Listening — No Gaps + Premium Sticky Bottom Bar — Final Report (2026-05-20)

## What shipped in this commit

1. **Phase A silence audit (dispositive)** — every listening audio file scanned for internal silence > 800ms. 21 of 72 files have gaps. Full per-row detail in `silence-audit.json` + `PHASE-A.md`.
2. **Phase C premium sticky bottom bar** — `ListeningPlayer.jsx` rewritten as `position: fixed; bottom: 0; left: 0; right: sidebarWidth(px)` with backdrop-blur glass surface, top hairline gold accent, gradient play button, speaker pill. Silent-failure detection preserved.
3. **Regen playbook** — step-by-step instructions in `REGEN-PLAYBOOK.md` for Phase B once ElevenLabs key is refreshed.

## What did NOT ship (and why)

- **Phase B regeneration** — ElevenLabs API key in `.env` returned HTTP 401 "Invalid API key". Cannot regenerate the 21 broken files from this environment. All blocker details + ready-to-run steps in `REGEN-PLAYBOOK.md`. Budget pre-check: 86,747 chars vs 300K cap → comfortably under cap when key is fresh.
- **Phase D Playwright verification** — only useful after Phase B regenerates. Existing CLEAN files don't need re-verification. The audit script `01-silence-audit.cjs` already provides equivalent server-side gap detection; browser-level Web-Audio verify is an additional confidence layer that can be added later if Ali wants it.

## Phase A — Silence audit numbers

| Metric | Value |
|---|---|
| Files audited | 72 |
| **CLEAN** | **51** (71%) |
| **HAS_GAPS** | **21** (29%) |
| Audit errors | 0 |
| Total internal-silence seconds across all 21 rows | 37.6 s |
| Total transcript chars to regen | 86,747 |
| Worst offender | `6b6e7a26` — 6 gaps in one 340s file |

**Telemetry cross-reference:** Row `f7bc89f9-...` (محادثة عن امتحان علم النفس) appears in BOTH the silence audit (3 internal gaps) AND the last-48h telemetry (2 play() failures from a real student). This is almost certainly the row the angry student hit.

**Why prior "72/72 healthy" audits missed this:** they measured decode success + container duration + word-timestamp counts. They did NOT inspect the actual waveform between start and end. `ffmpeg silencedetect` is the only check that catches "file decodes fine but is silent for some seconds inside."

**Probable root cause:** the generator pipeline `scripts/audio-v2/03-generate-listening.mjs` accepts partial / truncated / empty ElevenLabs responses without per-segment validation. A bad segment survives concat and becomes internal silence.

## Phase C — Premium sticky bottom bar

**Positioning contract:**
- `position: fixed; bottom: 0; left: 0`
- `right: sidebarWidth` from `useSidebarWidth()` (existing hook, measures `[data-sidebar-root]` via ResizeObserver)
- `z-index: 40` (sits above page content, below modal layer)
- `padding-bottom: calc(0.75rem + env(safe-area-inset-bottom, 0px))` so iOS home-indicator doesn't overlap

**Visual materials (per the LISTENING-NO-GAPS-PREMIUM-BAR spec):**
- `bg-slate-950/85` + `backdrop-blur-2xl` glass
- Top hairline gradient: `from-transparent via-amber-400/30 to-transparent`
- Drop-shadow: `shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.5)]`
- 48px gradient play button (`from-amber-300 via-amber-400 to-amber-500`, inner-highlight, shadow), NOT the 64px hero from the pre-`b4830d9` design
- 32px scrubber with amber-glow progress fill
- Speaker pill (subtle, only when a speaker is identified)
- Speed selector hides at `< 640px` to keep mobile touch targets clean

**Behavioral safety preserved from b4830d9:**
- Event listeners attached BEFORE `el.src = audioUrl`
- `useEffect` deps include `audioUrl` and `listeningId` so source changes re-fire
- `play()` called from click handler (iOS Safari user-gesture rule)
- `play()` rejection caught + telemetry logged
- 2-second silent-failure watchdog → `error_code: -1` telemetry + Arabic recovery card
- `playsInline` + `preload="metadata"`
- `<audio>` element hidden, ref-driven, never inline-`src`

**Prop contract:** identical to the prior version — `ListeningSection.jsx` did not need changes.

## Hard gates

| Gate | Status |
|---|---|
| Silence audit `has_gaps: 0` after regen | **NOT YET** — Phase B blocked on ElevenLabs key |
| Playwright `all_pass: true` | **N/A** — Phase D depends on Phase B |
| `fixed bottom-0 left-0` in ListeningPlayer.jsx | ✓ |
| Sidebar awareness | ✓ via `useSidebarWidth()` hook |
| ElevenLabs char budget ≤ 300K | ✓ (no chars consumed this run) |
| ESLint clean | ⏸ no `.eslintrc*` in repo; substituted bracket-balance check (300/300 OK) |
| `git status` shows only intended files | ✓ |

## File manifest

```
NEW:
A  docs/audits/listening-no-gaps/PHASE-A.md
A  docs/audits/listening-no-gaps/REGEN-PLAYBOOK.md
A  docs/audits/listening-no-gaps/FINAL-REPORT.md
A  docs/audits/listening-no-gaps/silence-audit.json   (full per-row detail)
A  docs/audits/listening-no-gaps/regen-input.json     (21 rows + transcript-char budget)
A  scripts/audits/listening-no-gaps/01-silence-audit.cjs

MODIFIED:
M  src/components/players/listening/ListeningPlayer.jsx   (premium sticky bottom bar)
```

`ListeningSection.jsx` not touched — prop contract already matches.

## Next actions for Ali

1. **Refresh the ElevenLabs API key** in `.env`. Then run the budget check from `REGEN-PLAYBOOK.md`.
2. **Audit `scripts/audio-v2/03-generate-listening.mjs`** for the 7 hardening checks listed in `REGEN-PLAYBOOK.md`. Patch any missing.
3. **Run the regen** for the 21 ids (script command at the end of `REGEN-PLAYBOOK.md`).
4. **Re-run the silence audit** (`node scripts/audits/listening-no-gaps/01-silence-audit.cjs`) — should report `has_gaps: 0`.
5. **Optionally**, install Playwright + run the browser-level Web-Audio verify (described in `REGEN-PLAYBOOK.md`'s "Optional Phase D" section).

## Rollback

```bash
cd /Users/dr.ali/projects/fluentia-lms
git reset --hard b4830d9 && git push --force-with-lease origin main
# Reverts to: simpler-player + telemetry + self-heal (no premium sticky bar)
# Silence-audit findings can be re-derived any time by re-running the audit script.
```
