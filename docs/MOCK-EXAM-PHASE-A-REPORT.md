# MOCK EXAM — Phase A Discovery Report

Generated against production Supabase ref `nmjexpuycmqcxuxljier` (via MCP).
Working dir: `/Users/dr.ali/projects/fluentia-lms`.

## A.2 Level + Unit IDs (8 units resolved — 4 L1 + 4 L3)

| Var | Value |
|---|---|
| `L1_LEVEL_ID` | `2755b494-c7ff-4bdc-96ac-7ab735dc038c` (A1, name_ar: أساسيات) |
| `L3_LEVEL_ID` | `f7e8dbfb-ec8e-4491-a62d-f54fd4c41aab` (B1, name_ar: طلاقة) |

### L1 Units (A1)
| # | id | theme_en | theme_ar |
|---|---|---|---|
| 1 | `49ed7c2c-fa1b-47b2-bb5c-34074beeafdc` | Cultural Festivals | المهرجانات الثقافية |
| 2 | `1de8e161-81eb-416e-af87-c136d93f3930` | Ocean Life | الحياة في المحيط |
| 3 | `dfefdb76-330a-4ac3-9102-95e1b792a5a6` | Space Exploration | استكشاف الفضاء |
| 4 | `95530744-5815-4ca5-bb10-756b25cc66d6` | Music & Art | الموسيقى والفن |

### L3 Units (B1)
| # | id | theme_en | theme_ar |
|---|---|---|---|
| 1 | `a5b583a4-5d9e-41b7-b95f-c07e0c44f64b` | Artificial Intelligence | الذكاء الاصطناعي |
| 2 | `55d40057-1d91-4eb0-8d78-b3f47a8d0a24` | Coral Reefs | الشعاب المرجانية |
| 3 | `85aabed1-aa8e-4ea6-9b58-bff1bbe4f9a8` | Earthquake Science | علم الزلازل |
| 4 | `738ff234-070d-4ace-9901-434e43521bdb` | Global Coffee Culture | ثقافة القهوة حول العالم |

## A.3 Content inventory (all units healthy)

| lvl | u | readings | vocabulary (in_passage) | comp Qs |
|---|---|---|---|---|
| 1 | 1 | 2 | 14 | 12 |
| 1 | 2 | 2 | 20 | 12 |
| 1 | 3 | 2 | 16 | 12 |
| 1 | 4 | 2 | 15 | 12 |
| 3 | 1 | 2 | 26 (core) | 16 |
| 3 | 2 | 2 | 27 (core) | 16 |
| 3 | 3 | 2 | 18 (core) | 16 |
| 3 | 4 | 2 | 26 (core) | 16 |

All 8 units pass the "no empty content" gate.

## A.4 Sample real content extracted

All 16 reading passages (full text) + L1 vocab list (64 in_passage words) + L3 core vocab list (97 words) extracted into the Phase C source doc.

## A.5 Target student population — and CRITICAL SCHEMA DEVIATION

- **L1 eligible students:** **12** (11 in `bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb` "المجموعة 2" + 1 ungrouped: لين الشهري)
- **L3 eligible students:** **8** (7 in `aaaaaaaa-4444-4444-4444-aaaaaaaaaaaa` "المجموعة 4" + 1 ungrouped: وعد العمران)

**Schema deviation from prompt:** the prompt assumes `profile.level_id` and `profile.group_id`. **These DO NOT exist on `profiles`.** Real schema:

- `profiles` columns: `id`, `role`, `full_name`, `display_name`, `email`, `must_change_password`, `username`, etc. NO level/group columns.
- `students` table (FK to profiles): `id`, `academic_level` (int 1..5), `group_id` (uuid), `track`, `package`, …
- `groups` table: `id`, `name`, `code`, `level` (int), `trainer_id`, …
- `curriculum_levels`: `id` (uuid), `level_number` (int), `cefr`, `name_ar/en`, …

**Resolution adopted (no schema changes to sacred tables):**
1. The RPC `mock_exam_start` resolves the student's `level_id` via:
   `students.academic_level → curriculum_levels.level_number → curriculum_levels.id`.
2. The exam's `level_id` in `mock_exams` is still a uuid pointing at `curriculum_levels.id` (as the prompt spec dictates).
3. The Sidebar filter compares `studentData.academic_level` (int) against the exam's `cl.level_number` after the join. Auth store already exposes `studentData` (loaded from `students` with `groups(*)`).
4. Test student seeding writes to BOTH `profiles` (id, role, full_name, email, must_change_password=false) AND `students` (id, academic_level, group_id, package='asas', track='foundation', status='active').

## A.6 Sidebar + routing structure

- `src/config/navigation.js` — exports `STUDENT_NAV`, `TRAINER_NAV`, `ADMIN_NAV`. Each has `sections: [{ id, label, items: [{ id, label, icon, to, requiresPackage?, showBadge?, badgeSource? }]}]` + `drawerSections` + `mobileBar`.
- `src/components/layout/Sidebar.jsx` — iterates `nav.sections` → filters items by `requiresPackage` against `studentData`. **Extension pattern:** I'll add `requiresMockExamAccess: true` and a parallel filter that calls a lightweight TanStack Query for active mock_exams rows.
- `src/App.jsx` — routes wrapped in `<ProtectedRoute allowedRoles=['student']>` → `<StudentStatusGuard>` → `<LayoutShell>`. Pattern: `<Route path="/student/…" element={<Page><Component /></Page>} />`.
- `lazyRetry()` is used for every code-split route.
- **Trainer routes:** `<Route element={<ProtectedRoute allowedRoles={['trainer','admin']}>}>` group at App.jsx:762.

## A.7 Design system

- `src/design-system/components/AuroraBackground.jsx` — canonical premium background. Accepts `variant: 'default'|'subtle'|'intense'`. Class `velvet-atmo velvet-atmo--{variant}`. Default theme "Velvet Midnight" per memory — confirmed.
- `src/design-system/components/index.js` exports: `AuroraBackground`, `GlassPanel`, `PremiumCard`, `SectionHeader`, `StatOrb`, `PrimaryButton/SecondaryButton/GhostButton`, `CinematicTransition`, `StaggeredList`, `EmptyState`, `DSLoadingSkeleton`.
- The prompt mentions `<CinematicBackground>`. That exists ONLY as a local component in `CurriculumBrowser.jsx`. **Canonical wrapper is `<AuroraBackground>`.** Will use that.
- CSS vars: `--ds-background`, `--ds-foreground`, `--ds-border`, etc. exist via `src/design-system/themes.css`.

## Auth store shape (`src/stores/authStore.js`)

- `useAuthStore.profile` → `{ id, role, full_name, email, … }` (from `profiles`).
- `useAuthStore.studentData` → `{ id, academic_level, group_id, package, track, status, groups: {...}, … }` (from `students` JOIN `groups`).
- `useAuthStore.user` → Supabase auth user (id = profile.id).
- Selector hooks already present: `useAuthProfileId`, `useAuthStudentData`.

## A.9 Blocker gate — **CLEAN**

- [x] L1 + L3 level UUIDs resolved
- [x] All 8 target units present
- [x] Every unit has ≥2 readings + 14 vocabulary words
- [x] "Highlighted vocabulary" signal: `curriculum_vocabulary.appears_in_passage=true` + `tier='core'` for L3 (95+ words available)
- [x] `profiles.role` present; `profiles.id` is the auth uid (FK to `auth.users`)
- [x] `useAuthStore.profile.id` + `useAuthStore.studentData.academic_level` exposed

```
=== PHASE A CLEAN — auto-continuing to Phase B ===
Report: docs/MOCK-EXAM-PHASE-A-REPORT.md
L1_LEVEL_ID = 2755b494-c7ff-4bdc-96ac-7ab735dc038c
L3_LEVEL_ID = f7e8dbfb-ec8e-4491-a62d-f54fd4c41aab
L1 students: 12 | L3 students: 8
Group IDs: L1=bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb / L3=aaaaaaaa-4444-4444-4444-aaaaaaaaaaaa
Proceeding to Phase B without waiting.
```
