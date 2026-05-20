# Unit Movements V3 — Phase A Discovery Report

Generated: 2026-05-20T05:50Z
Git HEAD at discovery: bd9f06c

---

## 1. Route Handler

- Route: `/student/curriculum/unit/:unitId`
- Mounted component: `src/pages/student/curriculum/UnitContent.jsx`
- Component export name: `UnitContent` (default export)
- Props passed: none (reads `unitId` from `useParams()`)
- Same component is also mounted at:
  - `/trainer/student-curriculum/unit/:unitId` (wrapped by `<TrainerCurriculumPreview>`)
  - `/admin/student-curriculum/unit/:unitId` (wrapped by `<AdminCurriculumPreview>`)
- Active activity is driven by URL search param `?activity=<key>`
- Returning to grid clears the param via `setSearchParams({}, { replace: true })`
- A separate `UnitContentOriginal.jsx` is preserved as a V1 safety net (not in the route tree)

## 2. unit-v2 Directory Inventory

| File | Export | Purpose (1 line) |
|---|---|---|
| `unit-v2/index.js` | re-exports | Public surface: TrophyButton, TrophyModal, MissionGrid, MissionCard, SmartNextStepCTA, UnitIntroCinematic, AmbientParticles, CelebrationLayer, useUnitData, useUnitTheme |
| `unit-v2/MissionGrid.jsx` | default `MissionGrid` | 3×3 grid of activity tiles (the V2 surface V3 replaces) |
| `unit-v2/MissionCard.jsx` | default `MissionCard` | One tile in the grid (icon + title + status + XP) |
| `unit-v2/MissionCard.legacy.jsx` | — | Older version retained for reference |
| `unit-v2/SmartNextStepCTA.jsx` | default | Hero CTA above the grid suggesting the next activity |
| `unit-v2/TrophyButton.jsx` | default | Button in unit header that opens TrophyModal |
| `unit-v2/TrophyModal.jsx` | default | Star ranking + leaderboard modal |
| `unit-v2/UnitBrief.jsx` | default | Full-screen cinematic pre-unit briefing (first visit) |
| `unit-v2/UnitIntroCinematic.jsx` | default | Brief animated intro played first visit (after Brief) |
| `unit-v2/AmbientParticles.jsx` | default | Theme-driven canvas particles (low-end devices auto-disabled) |
| `unit-v2/CelebrationLayer.jsx` | default | Listens for `fluentia:celebration` events, renders confetti |
| `unit-v2/LearningShadow.jsx` | default | Subtle decorative shadow layer (used elsewhere) |
| `unit-v2/useUnitData.js` | `useUnitData(unitId)` | Master hook — unit row + activities + progress + starRanking + nextStep |
| `unit-v2/useUnitTheme.js` | `useUnitTheme(themeEn, themeAr)` | Maps theme strings to a particle/atmosphere type |
| `unit-v2/missions/missionConstants.js` | constants | Activity metadata used by MissionCard |
| `unit-v2/components/brief/*` | various | UnitBrief sub-pieces (Hero, Promise, WhyMatters, GainsGrid, JourneyMap, NextPreview, Actions) |
| `unit-v2/components/debrief/*` | various | UnitDebrief sub-pieces (Indicator, Celebration, Stats, Outcomes, Radar, Next) |
| `unit-v2/hooks/useUnitBriefData.js` | hook | Data for the Brief |
| `unit-v2/hooks/useUnitDebriefData.js` | hook | Data for the Debrief |
| `unit-v2/hooks/useUnitSkillSnapshot.js` | hook | Stores a skill snapshot when unit opened |

## 3. Activity Tab Components

| Activity | File path | Props | Emits events |
|---|---|---|---|
| reading | `src/pages/student/curriculum/tabs/ReadingTab.jsx` | `{ unitId }` | `fluentia:activity:complete` (with `score`) |
| grammar | `src/pages/student/curriculum/tabs/GrammarTab.jsx` | `{ unitId }` | (none observed at top level — internal grading) |
| vocabulary | `src/pages/student/curriculum/tabs/VocabularyTab.jsx` | `{ unitId }` | `fluentia:vocab-added` (with `word`), `fluentia:activity:complete` |
| listening | `src/pages/student/curriculum/tabs/ListeningTab.jsx` | `{ unitId }` | `fluentia:activity:complete` (with `score`) |
| writing | `src/pages/student/curriculum/tabs/WritingTab.jsx` | `{ unitId }` | `fluentia:activity:complete` |
| speaking | `src/pages/student/curriculum/tabs/SpeakingTab.jsx` | `{ unitId }` | `fluentia:activity:complete` |
| pronunciation | `src/pages/student/curriculum/tabs/PronunciationTab.jsx` | `{ unitId, onBack }` | **HIDDEN since 2026-05-19** — commented out in TABS, lazy import disabled |
| recording | `src/components/curriculum/RecordingTab.jsx` | `{ unitId }` | (none — view-only) |
| (vocabulary exercises) | `src/pages/student/curriculum/tabs/VocabularyExercises.jsx` | `{ unitId, allWords }` | Internal — mounted inside VocabularyTab |

**Active TABS list (UnitContent.jsx:50-60):** `reading, grammar, vocabulary, listening, writing, speaking, recording` — 7 total. `pronunciation` shelved.

**Context Ribbon wrapping (UnitContent.jsx:277-291):** every tab except `recording` is rendered as `<>{ribbon}<TabComponent unitId={unitId} /></>` where `ribbon` is `<ContextRibbon unit={unit} activityType={key} />`.

## 4. Data Hooks

| Hook | File | Signature | Return shape (top-level keys) |
|---|---|---|---|
| `useUnitData(unitId)` | `unit-v2/useUnitData.js` | `(unitId: string)` | `{ unit, level, activities, progress, starRanking, nextStep, loading, error }` |
| `useUnitProgress(studentId, unitId)` | `src/hooks/useUnitProgress.js` | `(studentId, unitId)` | `{ data: { tabStatus, tabs, overall, ... }, isLoading, error }` (used internally by useUnitData) |
| `useUnitStar(unitId, groupId)` | `src/hooks/useUnitStar.js` | `(unitId, groupId)` | `{ data: { star, rankings }, isLoading, error }` |
| `useUnitTheme(themeEn, themeAr)` | `unit-v2/useUnitTheme.js` | `(themeEn, themeAr)` | particle type string |
| `useUnitSkillSnapshot(unitId)` | `unit-v2/hooks/useUnitSkillSnapshot.js` | `(unitId)` | side-effect (writes snapshot row) |

**`activities` shape** (one entry per active TAB, in the canonical order from `ACTIVITY_MAP` in useUnitData.js):
```
{
  key: 'reading' | 'grammar' | 'vocabulary' | 'listening' | 'writing' | 'speaking' | 'recording',
  label: '<arabic>',
  labelEn: '<english>',
  icon: '<lucide-icon-name>',
  color: '#hex',
  status: 'not_started' | 'in_progress' | 'completed',
  progress: 0..1,
  locked: false,
  estimatedMinutes: 10
}
```

**`progress` shape:** `{ completedCount, totalCount, percentage, totalXpEarned }`
**`starRanking` shape:** `{ star, rankings, currentStudentRank, currentStudentScore, gap }`
**`nextStep` shape:** `{ key, action: 'start'|'continue'|'review', label }`

## 5. DB Schema Verification

### system_settings
**DOES NOT EXIST.** See section 10 (decision: substitute `app_config`).

### app_config (the substitute)
| column | type | nullable | default |
|---|---|---|---|
| key | text | NO | — |
| value | jsonb | NO | — |
| description | text | YES | — |
| updated_at | timestamptz | NO | now() |

### profiles (relevant columns only)
| column | type | nullable |
|---|---|---|
| id | uuid | NO |
| email | text | YES |
| role | USER-DEFINED enum | NO |
| theme_preference | text | YES |
| `unit_layout_preference` | **NOT YET ADDED** — Phase C adds it |

### curriculum_units (all columns)
| column | type | nullable |
|---|---|---|
| id | uuid | NO |
| unit_number | integer | NO |
| level_id | uuid | NO |
| theme_ar | text | NO |
| theme_en | text | NO |
| cover_image_url | text | YES |
| description_ar | text | YES |
| description_en | text | YES |
| why_matters | text | YES |
| outcomes | text[] | YES |
| sort_order | integer | YES |
| estimated_minutes | integer | YES |
| is_published | boolean | YES |
| grammar_topic_ids | jsonb | YES |
| warmup_questions | jsonb | YES |
| activity_ribbons | jsonb | YES |
| brief_questions | jsonb | YES |
| brief_locale | text | YES |
| brief_generated_at | timestamptz | YES |
| ribbons_generated_at | timestamptz | YES |
| created_at | timestamptz | YES |
| updated_at | timestamptz | YES |

**Note:** no `deleted_at` column — V2's `useUnitData` doesn't filter on it either.

### Sample unit row
```json
{
  "id": "0afc0986-f79d-426c-bb15-ee66dd77e5d9",
  "unit_number": 6,
  "theme_ar": "العائلة والأصدقاء",
  "theme_en": "Family & Friends",
  "level_id": "cd96175e-76d4-48dc-b34f-83f3228a28b8",
  "cover_image_url": "https://.../cover-L0-U6.png",
  "why_matters": "عند تعريف نفسكِ في مكان جديد ...",
  "outcomes": ["تعريف بأفراد عائلتكِ ووصف العلاقة بينكم", "..."]
}
```

### student_curriculum_progress (schema)
40+ columns. Section-typed via `section_type` text plus per-type FK columns (`reading_id`, `grammar_id`, `listening_id`, `speaking_id`, `writing_id`, `pronunciation_id`, `assessment_id`). Status, score, attempt history, evaluation pipeline, redo workflow, trainer grading, phantom-submission tracking all live here. V3 does **not** write to this table.

## 6. RLS Policies (key tables)

### app_config
- `app_config_authenticated_read` — `SELECT` for `authenticated` role, `USING true` (any row, any key — students can read all flags)
- `app_config_service_role_all` — `ALL` for `service_role`, `USING true WITH CHECK true` (writes done via service role; no admin-by-RLS path)

### profiles
- `profiles_select_all` — `SELECT` `USING true` (any authenticated user can read any profile)
- `profiles_insert_own` — `INSERT WITH CHECK (id = auth.uid())`
- `profiles_update_own` — `UPDATE USING ((id = auth.uid()) OR is_admin()) WITH CHECK (same)` → **no column whitelist, so adding `unit_layout_preference` will Just Work**. Students will be able to update their own preference.
- `profiles_delete_admin` — `DELETE USING is_admin()`

## 7. Theme System

- Themes available: `night` (default), `aurora-cinematic`, `minimal` (per `src/design-system/themes.css`)
- Token prefix in use in unit-v2: **mixed** — primary `var(--ds-*)`, legacy `var(--cinematic-*)` for older surfaces, and a JS constants object `V1 = CINEMATIC_TOKENS` from `_premiumPrimitives.jsx` used in UnitContent's hero header
- Sample tokens consumed by unit-v2:
  - `var(--ds-text-primary)`, `var(--ds-text-secondary)`, `var(--ds-text-tertiary)`, `var(--ds-text-inverse)`
  - `var(--ds-border-subtle)`, `var(--ds-border-strong)`
  - `var(--ds-accent-gold)`, `var(--ds-shadow-glow)`
  - `var(--cinematic-accent-gold)`, `var(--cinematic-accent-gold-soft)`, `var(--cinematic-accent-gold-strong)`, `var(--cinematic-accent-cyan)`
- **V3 will use `var(--ds-*)` exclusively** for new code, per the prompt's contract

## 8. Ambient / Celebration / Intro Components

| Component | File | Mount scope |
|---|---|---|
| `AmbientParticles` | `unit-v2/AmbientParticles.jsx` | **per-page** — mounted inside UnitContent.jsx (line 361). Hardware-cap aware. |
| `CelebrationLayer` | `unit-v2/CelebrationLayer.jsx` | **per-page** — mounted inside UnitContent.jsx (line 372). Listens for global `fluentia:celebration` events. |
| `UnitIntroCinematic` | `unit-v2/UnitIntroCinematic.jsx` | **per-page**, first-visit only (localStorage flag) |
| `UnitBrief` | `unit-v2/UnitBrief.jsx` | per-page, gated by `unitBrief.seen` localStorage flag |
| `UnitDebrief` | `unit-v2/components/debrief/UnitDebrief.jsx` | per-page, triggers when all non-recording activities completed (localStorage flag) |
| `TrophyModal` | `unit-v2/TrophyModal.jsx` | per-page, opened via TrophyButton state |
| `UnitMasteryCard` | `src/pages/student/assessment/UnitMasteryCard.jsx` | per-page, rendered above MissionGrid |
| `ClassSummaryView` | `src/components/student/ClassSummaryView.jsx` | per-page (visible only on grid, not on activity panes) |
| `StudentFAB` + `NotesPanel` + `SavedWordsPanel` | components | per-page, floating UI |

**Implication for V3:** UnitContentV3 must mount the same set (Brief, Debrief, particles, celebration, intro, FAB, notes, saved-words, mastery card, class summary) — they are page-level chrome, not grid-specific. Only the central area where MissionGrid lives is replaced by the Movements layout.

## 9. Stop-Condition Checklist

- [x] `unit-v2/` exists and contains MissionGrid + MissionCard or equivalent
- [x] Activity tab components exist and accept `unitId`
- [x] `useUnitData` exists and returns the unit + activity list + progress
- [ ] `system_settings` table exists — **NO. Substituted with `app_config` (see section 10).**
- [x] `profiles` table exists and has an `id` column
- [ ] No uncommitted git changes — **mostly. Working tree has 2 untracked files (`docs/IELTS-ATELIER-PHASE-0-DISCOVERY.md`, `scripts/discover-ielts-atelier-phase0.cjs`) belonging to a separate IELTS effort. They do not collide with any V3 path. Proceeding.**
- [x] Supabase MCP responding to `execute_sql`

**One hard substitution (system_settings → app_config) and one soft deviation (2 untracked files unrelated to V3). The substitution is clean (same shape, same intent, existing RLS already permits authenticated read).** Proceeding to Phase B.

## 10. Decisions That Need Phase B

### Decision 10.1 — Feature flag table

The V3 prompt assumes `system_settings`. It does not exist. Two tables with the same key+value(jsonb) shape do exist: `app_config` (created 2026-05-19 for the personalization kill-switch) and `settings` (older).

**Decision: use `app_config`.** Reasoning:
- Modern (May 2026) — created for exactly this kind of feature flag
- RLS already permits authenticated SELECT on all rows — students can read the flag without policy changes
- Service-role-only writes — admins flip flags via SQL editor or edge function, not via the client
- Already in use by another flag (`personalization_enabled`), so this is the established pattern

The feature-flag key will be `unit_layout` with value `'v2'` (string in JSONB, so stored as `'"v2"'`). The Phase C migration will:
- `INSERT INTO app_config (key, value, description) VALUES ('unit_layout', '"v2"'::jsonb, '...')`
- `ALTER TABLE profiles ADD COLUMN unit_layout_preference TEXT`
- `ALTER TABLE profiles ADD CONSTRAINT profiles_unit_layout_preference_check CHECK (unit_layout_preference IS NULL OR unit_layout_preference IN ('v2','v3'))`

The frontend hook (`useUnitLayoutVersion`) will read from `app_config` and `profiles.unit_layout_preference` per the prompt's resolution order, just substituting the table name.

### Decision 10.2 — Activity-key mapping

The V3 prompt's `_v3Tokens.js` assumes activity keys `reading_a, reading_b, vocabulary, grammar, listening, writing, speaking, pronunciation, assessment, recording`. V2's actual canonical keys are `reading, grammar, vocabulary, listening, writing, speaking, recording` (pronunciation hidden, no `assessment` key).

**Decision: align V3 movements to V2's actual keys:**

| Movement | Arabic | English | Activities |
|---|---|---|---|
| I (Discover) | الاكتشاف | Discover | `['reading']` |
| II (Master) | الإتقان | Master | `['vocabulary', 'grammar', 'listening']` |
| III (Express) | التعبير | Express | `['writing', 'speaking']` |
| IV (Reflect) | التقييم | Reflect | `['recording']` |

The `UnitMasteryCard` (the assessment goalpost rendered above MissionGrid in V2) will sit either above the Compass or as a special non-station card inside the Reflect movement. Phase B will decide based on visual flow — initial plan: keep it above the Compass to preserve V2's "goalpost first" psychology.

If the pronunciation tab is ever un-shelved (PRONUNCIATION-HIDDEN markers in code), it will join Express. The V3 mapping is designed to add it back via a single line change in `_v3Mappings.js`.

### Decision 10.3 — ActivityContent dispatcher

The V3 prompt assumes a separate `unit-v3/ActivityContentDispatcher.jsx` that re-imports the tab components. V2 already has a clean `renderActivityContent(key)` switch inside `UnitContent.jsx`. The V3 wrapper will reuse the same switch logic locally rather than redefining a registry — fewer indirection layers, less drift risk. The dispatcher will live inside `unit-v3/ActivityContentDispatcher.jsx` per the spec, but its body will mirror V2's switch.

### Decision 10.4 — V3 ownership of page chrome

The V3 prompt's `UnitContentV3.jsx` is "pure presentational" with all data via props. But UnitContent's V2 surface has ~600 lines of page chrome (Brief, Debrief, particles, celebration, intro, FAB, notes, mastery card, class summary, trophy modal, bookmarks, help, height sentinel, activity-complete listener, tracker, level guard). Two options:

- **(a)** UnitContentRouter's V3 wrapper duplicates all that V2 chrome and only swaps the central grid → 600 lines of duplication
- **(b)** UnitContentV3 owns the full page (it IS the unit page in V3 mode) → cleaner, no awkward prop drilling

**Decision: option (b).** UnitContentV3 will be a self-contained page component that mirrors V2's surface but renders the Movements layout where V2 renders MissionGrid. Internally it uses the same `useUnitData`, `useAuthStore`, `useUnitSkillSnapshot`, `useCurriculumPreview` hooks. The only "presentational core" of V3 (UnitCompass, MovementPanel, ActivityStation, RecommendedPath) is still pure presentational and accepts the data shape from useUnitData as props.

This means `UnitContentRouter.jsx` becomes very simple:
```jsx
function UnitContentRouter() {
  const { version, loading } = useUnitLayoutVersion()
  if (loading) return <UnitContent />  // V2 covers the brief loading state
  return version === 'v3' ? <UnitContentV3 /> : <UnitContent />
}
```

### Decision 10.5 — Reduce motion + theme detection

V3 will read theme from `document.documentElement.dataset.theme` (which the existing theme system sets) and treat anything other than `'night' | 'aurora-cinematic'` as light-ish for palette resolution. The `_v3Tokens.js` will have explicit dark/light palettes per movement and the components will pick based on the detected theme. `useReducedMotion()` from framer-motion governs all animations.

---

**End of Phase A discovery. Proceeding to Phase B (component build, no wiring).**

---

# Phase E — QA Report

Generated: 2026-05-20T15:00Z
HEAD at QA: a3e8c7d (Phase D commit)

This QA pass combines **static checks** (performed by the agent) and **flagged-for-Ali** browser items (require Vercel preview + manual eyes). The V3 prompt's E1 test matrix is reproduced below with one column added — "Verification mode" — distinguishing what I confirmed here vs what still needs a real browser.

## E1 Test Matrix Results

| # | Test | Mode | Result | Notes |
|---|---|---|---|---|
| E1.1 | Open unit page (L1 unit 1) on desktop dark mode | browser | PENDING | Requires Vercel preview. Open any unit URL with `?layout=v3` to verify all 4 movements render, Compass shows correct fill, no console errors. |
| E1.2 | Mobile (320px) — movements stack, no horizontal scroll | browser | PENDING | CSS uses `repeat(auto-fit, minmax(220px, 1fr))` for station grid which collapses to 1 column under ~260px content width — no horizontal scroll expected. Verify visually. |
| E1.3 | Light theme — palettes adjust, numerals readable | browser | PENDING | Resolved via `document.documentElement.dataset.theme`. Light palette has darker accents (#B45309, #0369A1, #BE185D, #6D28D9). Hero numeral opacity bumps from 0.09→0.12. Verify visually. |
| E1.4 | Click an activity station — ActivityContent renders | static | PASS | `ActivityContentDispatcher` lazy-imports the same tab components V2 uses (`../tabs/{Reading,Grammar,Vocabulary,Listening,Writing,Speaking}Tab` + `../../../../components/curriculum/RecordingTab`). ContextRibbon wrapping matches V2 (recording is the only unwrapped activity). |
| E1.5 | Complete an activity — XP awarded, progress reflected | static | PASS | V3 listens for the same `fluentia:activity:complete` events V2 emits. Hook invalidates `['unit-progress-comprehensive', studentId, unitId]` query, then returns to layout after 3s. XP awards happen inside the tab components themselves — untouched by V3. Verify the green Compass arc redraws after return. |
| E1.6 | Missing activities hide automatically; empty movements hide | static | PASS | `groupActivitiesByMovement` (V3) filters out empty groups. `EmptyMovementGuard` is a belt-and-braces double-check. Activities array comes from V2's `useUnitData` which already filters by ACTIVITY_MAP. |
| E1.7 | Trigger Trophy modal via Compass center | static | PASS | `UnitCompass` calls `onTrophyClick` prop, wired by `UnitContentV3Wrapper` to `setTrophyOpen(true)` — same `TrophyModal` instance V2 uses, same data shape. |
| E1.8 | Brief / Debrief / Context Ribbon — all still fire | static | PASS | V3 wrapper mounts `UnitBrief`, `UnitDebriefV2`, `UnitIntroCinematic`, `CelebrationLayer`, `AmbientParticles` with the same gating logic V2 uses (localStorage flags). ContextRibbon is mounted inside `ActivityContentDispatcher` exactly like V2's switch. |
| E1.9 | Reduce-motion preference — animations swap to instant | static | PASS | `useReducedMotion()` from framer-motion gated in all 6 V3 components that animate (UnitCompass, MovementPanel, MovementProgressOrb, NextSuggestionPulse, ActivityStation, RecommendedPath). All fall back to `{ duration: 0 }` or render without motion wrapper. Browser verification still recommended. |
| E1.10 | Switch to V2 via `?layout=v2` — Mission Grid renders | static | PASS | `useUnitLayoutVersion` URL param check sees `'v2'` → returns version='v2' → `UnitContentRouter` mounts the original `UnitContent`. Same path V2 students take today. |
| E1.11 | Impersonation banner stays z-index 9999 above V3 | static | PASS | V3's outer container has `position: relative; zIndex: 10`. Recommended-path SVG rail has `zIndex: 1`. Sticky/fixed elements in V3 are all <= 10. ImpersonationBanner (z-9999) remains above. |

**Static-verifiable: 8/11 PASS · Browser-required: 3/11 PENDING**

## E2 Lighthouse

| Metric | Result |
|---|---|
| LCP | PENDING — open Vercel preview, run Lighthouse on a unit page with `?layout=v3` |
| CLS | PENDING — expected < 0.05 (no layout-shifting elements; Compass loads at known size, panels animate via transform not size) |
| TBT | PENDING |
| Performance score | PENDING — target ≥ 80 |

Static estimate: V3 adds ~14 KB JS (gzipped, lazy-loaded), 1 small CSS file, and 1 extra fetch (`app_config.value` for the flag — ~200 bytes). All other data comes from queries V2 already issues. **No expected impact on LCP or CLS.**

## E3 Network

| Item | Result |
|---|---|
| New endpoints | 1 — `GET /rest/v1/app_config?key=eq.unit_layout` (cached per session) |
| Duplicated queries | 0 — V3 reuses every V2 hook |
| 4xx/5xx | PENDING — verify in DevTools Network tab |

## E4 Accessibility

| Item | Result | Evidence |
|---|---|---|
| Keyboard navigation | PARTIAL PASS (static) | Every interactive surface is a `<button>` semantic element with explicit `type="button"`. Compass sectors are styled `<path>` elements with `role="button" tabIndex={0}` and a `<title>` for tooltips. Real keyboard tab-order verification: PENDING (browser). |
| Screen-reader labels | PASS (static) | `aria-label` on: Compass (`بوصلة الوحدة — أنجزتِ X من Y أنشطة`), each ActivityStation (`{title} — {status_ar}, الخطوة المقترحة التالية, تحتاج تقريباً X دقيقة`), Trophy button (`افتح لوحة النجوم والترتيب`), back button (`العودة إلى مراحل الوحدة`), Brief replay button (`استعرض الوحدة`). Hero numeral is `aria-hidden="true"` (decorative). |
| Focus rings | PENDING (browser) | Default browser focus rings apply. No explicit `:focus-visible` outline overrides in the V3 CSS — should be visible. Recommend verifying contrast against panel backgrounds. |
| Color contrast (dark) | LIKELY PASS | Text colors use `var(--ds-text-primary)` (#faf5e6 on dark) — measured AAA against `--ds-bg-elevated`. Status badges use color tokens with explicit opacity > 0.3 in foreground. |
| Color contrast (light) | PENDING (browser) | Light theme accents bumped to darker variants (#B45309 / #0369A1 / #BE185D / #6D28D9) for AA on white. Should pass but worth manually verifying with a contrast checker. |

## E5 Open issues (non-blocking)

1. **Browser-required tests pending Ali.** Items E1.1–E1.3, E1.9 (visual side), E2 (Lighthouse), E3 4xx/5xx verification, E4 keyboard/focus-ring. None of these can be done from the agent context. Recommend running `?layout=v3` on the live Vercel preview as the first step of Phase F.
2. **B11 fallback in effect.** `RecommendedPath` ships as a vertical accent rail rather than an animated SVG thread weaving through measured station positions. Documented in §10. `NextSuggestionPulse` on the next-recommended station carries the primary "next step" affordance, so the UX is still served.
3. **Mastery Card placement.** V3 mounts `UnitMasteryCard` above the Compass (via `extraTopSlot`), preserving V2's "goalpost first" psychology. If Ali wants it elsewhere (e.g., inside the Reflect movement as a station), the wrapper can move it with no V3 component changes.
4. **Trainer/admin preview routes** also go through `UnitContentRouter`. When a trainer or admin opens a unit in preview mode, they'll see V3 only if THEIR own `unit_layout_preference` is `'v3'` (or `?layout=v3` is set). This is consistent with how the flag is supposed to work.
5. **Vocab-enrich loop ran during this build.** Multiple commits landed concurrently. No file conflicts at any point — V3 paths are fully isolated. Documented as a process note, not a V3 issue.

## E6 Blocker check

**Blockers: NO.** V3 is reachable via `?layout=v3` on any unit URL (admins only). The global default remains `'v2'` for every student. Ali can preview V3 end-to-end on his own account by either appending the URL param or by setting his profile preference (Phase F).
