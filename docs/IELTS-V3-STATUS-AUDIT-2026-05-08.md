# IELTS V3 Status Audit — 2026-05-08

> Generated: 2026-05-08 | HEAD: 9a57fc2 | Read-only — no commits made

---

## 1. Latest Commits (chronological, newest first)

| SHA | Message |
|---|---|
| `dd3a447` | feat(ielts-v3): Phase 2 — Theatrical Diagnostic bookends (Welcome + Results) |
| `54423f7` | feat(ielts-v2): Phase 1 — real Home + Journey pages |
| `0f47559` | feat(ielts-v2): Sunset Atlas background — dedicated atmosphere for IELTS ecosystem |
| `c304ece` | feat(admin): premium IELTS V2 preview — inline render + phase timeline |
| `76aea52` | feat(ielts-v2): Phase 0B — routing scaffold for /student/ielts-v2/* |
| `de29eae` | feat(ielts-v3): Phase 0A — 10 masterclass design system components |
| *(prior)* | feat(ielts): Adaptive Plan + Error Bank + SRS (V1) |
| *(prior)* | feat(ielts): Mock Center — full 2h 45min IELTS simulator (V1) |
| *(prior)* | feat(ielts): Speaking Lab Parts 1/2/3 (V1) |
| *(prior)* | feat(ielts-writing): Writing Lab with AI (V1) |
| *(prior)* | feat(ielts-listening): Listening Lab (V1) |
| *(prior)* | feat(ielts-reading): Reading Lab with 16 skill modules (V1) |
| *(prior)* | feat(ielts-diagnostic): End-to-end diagnostic flow (V1) |

**HEAD = origin/main = `9a57fc2` — no divergence.**

---

## 2. Page Inventory

| # | Sacred Page | Path | LOC | Status | Masterclass components | Hooks |
|---|---|---|---|---|---|---|
| 1 | Home | `ielts-v2/Home.jsx` | 453 | **real** | BandDisplay, TrainerPresence | useAdaptivePlan, useLatestResult, useSkillProgress |
| 2 | Diagnostic (welcome) | `ielts-v2/Diagnostic.jsx` | 332 | **real** | NarrativeReveal, TrainerPresence | useDiagnosticStateV2 |
| 3 | Diagnostic (results) | `ielts-v2/DiagnosticResults.jsx` | 281 | **real** | NarrativeReveal, BandDisplay | useDiagnosticResultV2 |
| 4 | Reading Lab | `ielts-v2/Reading.jsx` | 41 | **placeholder** | PlaceholderPage, StrategyModule (sample only) | none |
| 5 | Listening Lab | `ielts-v2/Listening.jsx` | 48 | **placeholder** | PlaceholderPage | none |
| 6 | Writing Lab | `ielts-v2/Writing.jsx` | 23 | **placeholder** | PlaceholderPage | none |
| 7 | Speaking Lab | `ielts-v2/Speaking.jsx` | 22 | **placeholder** | PlaceholderPage | none |
| 8 | Journey | `ielts-v2/Journey.jsx` | 439 | **real** | ExamCountdown | useAdaptivePlan, useLatestResult, useMockAttempts |
| 9 | Errors (Bank of Lessons) | `ielts-v2/Errors.jsx` | 32 | **placeholder** | PlaceholderPage | none |
| 10 | Mock | `ielts-v2/Mock.jsx` | 27 | **placeholder** | PlaceholderPage | none |
| 11 | Trainer Connection | `ielts-v2/Trainer.jsx` | 29 | **placeholder** | PlaceholderPage | none |
| 12 | Readiness (Exam Week) | `ielts-v2/Readiness.jsx` | 28 | **placeholder** | PlaceholderPage | none |

**Summary: 4 real / 8 placeholder / 0 missing.**

### Helper files shipped alongside pages

| File | Purpose |
|---|---|
| `_helpers/resolveStudentId.js` | Resolves student ID (preview mode aware) |
| `_helpers/weekPhase.js` | Maps current week to IELTS phase + week labels |
| `_helpers/todayFocus.js` | Derives today's focus skill from adaptive plan |
| `_layout/IELTSMasterclassLayout.jsx` | 133 LOC — shell with IELTSSunsetBackground + header + TrainerPresence |
| `_layout/IELTSV2Gate.jsx` | 19 LOC — feature flag gate |
| `_layout/PlaceholderPage.jsx` | 97 LOC — theatrical placeholder using NarrativeReveal |

---

## 3. Route Audit

### App.jsx V3 Routes

```
/student/ielts-v2                       → IELTSV2Gate (feature flag)
  └── IELTSGuard (package check)
      └── IELTSMasterclassLayout
          ├── index            → IELTSV2Home
          ├── diagnostic       → IELTSV2Diagnostic
          ├── diagnostic/results → IELTSV2DiagnosticResults
          ├── reading          → IELTSV2Reading
          ├── listening        → IELTSV2Listening
          ├── writing          → IELTSV2Writing
          ├── speaking         → IELTSV2Speaking
          ├── journey          → IELTSV2Journey
          ├── errors           → IELTSV2Errors
          ├── mock             → IELTSV2Mock
          ├── trainer          → IELTSV2Trainer
          └── readiness        → IELTSV2Readiness
```

All routes: lazy-loaded via `lazyRetry()` ✅ | wrapped by IELTSV2Gate ✅ | wrapped by IELTSGuard ✅

Admin preview: `/admin/ielts-v2-preview` (no gate, admin-only route) ✅

### Feature Flag — `src/lib/ieltsV2Flag.js`

| Activation method | Detail |
|---|---|
| URL param | `?ielts-v2=1` enables (persists to localStorage); `?ielts-v2=0` clears |
| localStorage | `fluentia.ielts-v2 === '1'` |
| Allowlist | `ali@fluentia.academy` only |
| Default | **OFF for all students** |

**Ali's email `alialahmad2000@gmail.com` is NOT in the allowlist** — must use URL param to enable.

### IELTSGuard — `src/components/ielts/IELTSGuard.jsx`

- Redirects non-students to `/`
- Checks `hasIELTSAccess(studentData)` — passes if `package === 'ielts'` OR `custom_access includes 'ielts'`
- Shows `IELTSLockedPanel` (not a redirect) if no access
- **Note:** Sits inside IELTSV2Gate, so both must pass

---

## 4. DB Content

| Table | Total rows | Published | Notes |
|---|---|---|---|
| `ielts_reading_passages` | **43** | **16** | Good content base |
| `ielts_writing_tasks` | **25** | **9** | Task 1 + Task 2 content available |
| `ielts_listening_sections` | **25** | **9** | Section audio available |
| `ielts_speaking_questions` | **60** | **60** | All published |
| `ielts_diagnostic_tests` | null | null | Table doesn't exist or no schema |
| `ielts_mock_tests` | **1** | **1** | One full mock test published |
| `ielts_skills` | null | null | Table doesn't exist |
| `ielts_diagnostic_attempts` | ERROR | — | **Table missing** |
| `ielts_mock_attempts` | **0** | — | Table exists, zero attempts |
| `ielts_skill_sessions` | **0** | — | Table exists, zero sessions |

### IELTS-Eligible Students

| Package | Count |
|---|---|
| `tamayuz` | **5** |
| `ielts` | **0** |

All 5 eligible students are on `tamayuz` package. **None have used IELTS V1 or V3** (0 mock attempts, 0 skill sessions).

---

## 5. Edge Functions

| Function | LOC | What it does |
|---|---|---|
| `complete-ielts-diagnostic` | 327 | Grades R+L objectively, evaluates Writing Task 2 and Speaking via Claude. Writes results + adaptive plan. |
| `complete-ielts-mock` | 425 | Full mock grading: R+L objective, Writing Task1+Task2, Speaking Parts 1+2+3 via Whisper+Claude. |
| `evaluate-ielts-speaking` | 250 | Downloads audio from `ielts-speaking-submissions` bucket, transcribes via Whisper, evaluates via Claude. Separate from foundation evaluate-speaking. |
| `evaluate-ielts-writing` | **MISSING** | Not found as standalone. Writing evaluation appears inline in `complete-ielts-diagnostic` and `complete-ielts-mock`. |

---

## 6. Active IELTS Students

**No current student has accessed IELTS V3.** Feature flag allowlist contains only `ali@fluentia.academy` — real students cannot reach `/student/ielts-v2` by default.

The 5 tamayuz-package students:
- All would land on **V1** at `/student/ielts` (standard guard passes for tamayuz)
- None have attempted diagnostic, mock, or skill sessions in V1 either
- V3 is completely behind the flag — zero real usage

---

## 7. Phase-by-Phase Status

| Phase | Description | Status | Evidence |
|---|---|---|---|
| 0A | 10 masterclass components | **shipped** | 10 files in `src/design-system/components/masterclass/` + `IELTSSunsetBackground.jsx` |
| 0B | Routing scaffold (12 placeholder pages) | **shipped** | All 12 routes in App.jsx, all files exist |
| 0C | Admin preview panel | **shipped** | `/admin/ielts-v2-preview` route + `IELTSPreviewContext` |
| 0D | Sibling nav entry | **unknown** | Not audited — IELTS V1 hub nav exists; V2 nav entry not verified |
| 1 | Home (real) | **shipped** | 453 LOC, hooks wired, BandDisplay + TrainerPresence |
| 1 | Journey (real) | **shipped** | 439 LOC, ExamCountdown, week/phase logic |
| 2 | Diagnostic Welcome (theatrical) | **shipped** | 332 LOC, checklist flow, NarrativeReveal, useDiagnosticStateV2 |
| 2 | Diagnostic Results (theatrical) | **shipped** | 281 LOC, per-skill band display, useDiagnosticResultV2 |
| 3 | Reading Lab (real) | **placeholder** | 41 LOC, PlaceholderPage + 1 StrategyModule sample |
| 3 | Listening Lab (real) | **placeholder** | 48 LOC, PlaceholderPage |
| 3 | Writing Lab (real) | **placeholder** | 23 LOC, PlaceholderPage |
| 3 | Speaking Lab (real) | **placeholder** | 22 LOC, PlaceholderPage |
| 4 | Mock theatrical | **placeholder** | 27 LOC, PlaceholderPage |
| 5 | Errors / Bank of Lessons | **placeholder** | 32 LOC, PlaceholderPage |
| 5 | Trainer Connection | **placeholder** | 29 LOC, PlaceholderPage |
| 6 | Polish + Cutover (V1→V3) | **not started** | Feature flag allowlist-only; no student has seen V3 |

---

## 8. Critical Findings

1. **`ielts_diagnostic_tests` and `ielts_skills` tables are missing** — `complete-ielts-diagnostic` likely writes to different table names. The diagnostic flow may be reading/writing to `ielts_adaptive_plans` and `ielts_diagnostic_sessions` (not audited). This needs verification before Phase 3 build to avoid schema surprises.

2. **Zero IELTS V1 usage by any student** — 0 mock attempts, 0 skill sessions despite V1 Reading/Writing/Listening/Speaking/Mock labs being fully built. This means Phase 3 V3 Skill Labs won't disrupt anyone currently mid-session in V1.

3. **16 reading passages published but no lab to surface them** — Reading has the richest published content (16 of 43 passages) but the V3 Reading Lab is a placeholder. The mismatch between content readiness and UI readiness is largest here.

4. **Feature flag allowlist gap** — `ali@fluentia.academy` is in the allowlist but Ali's actual email per memory is `alialahmad2000@gmail.com`. Testing V3 currently requires the URL param `?ielts-v2=1` rather than being automatic for Ali.

5. **No standalone `evaluate-ielts-writing` function** — Writing evaluation for V3 diagnostic/mock is handled inline within the larger functions. If the Writing Lab (Phase 3) needs incremental feedback per task attempt, a dedicated function will need to be extracted or the existing `evaluate-writing` reused with IELTS-specific prompts.

---

## 9. Recommended Next Phase

**Phase 3 — Reading Lab (real)**

**Reason:** Reading has the most published content (16 passages ready), zero student disruption risk (no V1 usage), a clear V1 reference implementation to adapt from, all supporting infrastructure exists (`ielts_reading_passages`, skill modules in V1 at `/student/ielts/reading`), and Reading is the highest-frequency IELTS skill — shipping it first delivers the most student value per build hour.

Suggested scope: Replace `Reading.jsx` placeholder with a real Skill Lab that surfaces published passages, uses the existing `ielts_reading_passages` data, wires the masterclass aesthetic (StrategyModule, NarrativeReveal), and connects to the adaptive plan.
