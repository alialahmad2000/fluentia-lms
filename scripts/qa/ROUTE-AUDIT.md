# Trainer Portal Route Audit
Generated: 2026-04-20 | Quality pass after commit b13c8a9

## Summary
| Route | File | Hooks Order | Loading | Empty State | Verdict |
|---|---|---|---|---|---|
| /trainer | v2/CockpitPage.jsx | ✅ | ✅ skeleton | ✅ sections hide | ✅ FIXED |
| /trainer/interventions | v2/InterventionsPage.jsx | ✅ | ✅ | ✅ | ✅ READY |
| /trainer/prep | v2/ClassPrepPage.jsx | ✅ | ✅ | ✅ | ✅ READY |
| /trainer/live | v2/LiveClassPage.jsx | ✅ | ✅* | ✅* | ✅ READY |
| /trainer/grading | v2/GradingStationPage.jsx | ✅ | ✅ | ✅ | ✅ READY |
| /trainer/students | TrainerStudentView.legacy.jsx | ✅ | ⚠️ | ⚠️ | ⚠️ legacy |
| /trainer/student/:id | v2/Student360Page.jsx | ✅ | ✅ | ✅* | ✅ READY |
| /trainer/curriculum | TrainerCurriculum.jsx | ✅ | ✅ | ✅ | ✅ READY |
| /trainer/competition | v2/CompetitionCommandPage.jsx | ✅ | ✅ | ✅ | ✅ READY |
| /trainer/my-growth | v2/MyGrowthPage.jsx | ✅ | ✅ | ✅ | ✅ READY |
| /trainer/nabih | v2/NabihPage.jsx | ✅ | ✅* | ✅ | ✅ READY |
| /trainer/help | v2/HelpPage.jsx | ✅ | N/A | ✅ | ✅ READY |

*minor: acceptable for context

---

## Phase A — Root Cause Diagnosis

**Route /trainer imports:** `./pages/trainer/v2/CockpitPage`
**File at that path:** EXISTS ✅
**Path mismatch:** NO — prime suspect eliminated

**Data trace (Mohammed — e8e64b7c):**
- groups: 1 (المجموعة 2)
- students (active): 7
- activity_feed 7d: 767 rows
- open interventions: 0 (badge may use different count)
- grading queue: 5 items

**Data trace (Ali — e5528ced):**
- groups: 3 (المجموعة 4, Level 2 - Group B, Level 1 - Group A)
- students (active): 7
- activity_feed 7d: 260 rows
- open interventions: 0
- grading queue: 5 items

**Diagnosis:** Data flows for both trainers. Black screen is a rendering issue — not a data or file path issue. Secondary causes: all 4 data sections (interventions/pulse/grading/nabih) return null when empty simultaneously, AND CockpitHero may throw if hero state is undefined. Fix: TrainerErrorBoundary + CockpitSkeleton + defensive props.

---

## Route Details

### /trainer — CockpitPage V3 ✅ FIXED
- **Hooks order:** All 7 hooks before role gate ✅
- **Loading state:** CockpitSkeleton while `!profile || (cockpitLoading && pulseLoading)` ✅
- **Empty state:** Each section independently hides when empty ✅
- **Error boundary:** TrainerErrorBoundary wraps each section ✅
- **Fix applied:** Added CockpitSkeleton, TrainerErrorBoundary per section, defensive props

### /trainer/interventions — InterventionsPage ✅ READY
- Full RTL queue with severity tiers, filter tabs
- Loading: InterventionSkeleton ✅
- Empty: Arabic message per filter type ✅
- Realtime: `supabase.channel` with `removeChannel` cleanup ✅

### /trainer/prep — ClassPrepPage ✅ READY
- Context-aware prep with group/class detection
- Loading: Skeleton ✅ | Empty: "لا توجد حصص قادمة" ✅
- staleTime: 5 min (static-ish) ✅

### /trainer/live — LiveClassPage ✅ READY
- Redirects to /trainer/prep if no active session
- Students query: staleTime 30s added ✅
- Main content shows only when class is active — no blank state possible

### /trainer/grading — GradingStationPage ✅ READY
- AI-assisted grading queue
- Loading: QueueSkeleton ✅ | Empty: "لا توجد تسليمات معلقة" ✅
- IELTS extension merged with standard queue ✅

### /trainer/students — TrainerStudentView (legacy) ⚠️
- Legacy file — acceptable, not being actively developed
- Missing loading skeleton but functionally correct
- Will not regress — no changes applied

### /trainer/student/:id — Student360Page ✅ READY
- Components handle their own loading states via props
- Hero360Card, ActivityTimeline, SkillsRadar all accept loading prop ✅

### /trainer/curriculum — TrainerCurriculum ✅ READY
- Complex multi-level curriculum browser
- Admin vs trainer scope handled correctly ✅

### /trainer/competition — CompetitionCommandPage ✅ READY
- Loading skeleton + "لا توجد مسابقة نشطة" empty state ✅

### /trainer/my-growth — MyGrowthPage ✅ READY
- All sections have loading + empty states ✅
- staleTime 5 min for static data, 1 hour for XP events ✅

### /trainer/nabih — NabihPage ✅ READY
- Welcome screen when no active conversation ✅
- Message streaming works ✅

### /trainer/help — HelpPage ✅ READY
- Static content + search, no data fetching ✅

---

## Performance Findings

| Hook | staleTime | Correct? |
|---|---|---|
| useTrainerCockpit | 30s | ✅ |
| useStudentPulse | 60s | ✅ |
| useInterventionPreview | 30s | ✅ |
| useGradingQueue | 60s | ✅ |
| useTrainerOnboarding | Infinity | ✅ |
| useClassPrep | 5 min | ✅ |
| useClassPrepContext | 60s | ✅ |
| useCompetitionView | 60s | ✅ |
| useMyGrowth (dashboard) | 5 min | ✅ |
| useMyGrowth (timeline) | 5 min | ✅ |
| useStudent360 (overview) | 60s | ✅ |
| useNabih (conversations) | 30s | ✅ |
| LiveClassPage students | 30s | ✅ ADDED |

Realtime subscriptions: InterventionsPage has 1 channel with proper cleanup ✅

## Fixes Applied in Quality Pass

1. `src/components/shared/TrainerErrorBoundary.jsx` — CREATED
2. `src/components/trainer/cockpit-v3/CockpitSkeleton.jsx` — CREATED
3. `src/pages/trainer/v2/CockpitPage.jsx` — REWRITTEN (defensive, skeleton, per-section EB)
4. `src/pages/trainer/v2/LiveClassPage.jsx` — staleTime added
5. `src/components/trainer/cockpit-v3/DailyBrief.css` — mobile pass (already has @media 480px)
