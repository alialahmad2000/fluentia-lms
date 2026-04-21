# Trainer Curriculum Unification — Phase A Discovery
Date: 2026-04-21

## 1. Trainer Nav — current "المنهج" entry

File: src/config/trainerNavigation.js

Label: المنهج  
Path: /trainer/curriculum  
Icon: BookOpen  

Duplicate "معاينة منهج الطالب" entry exists? YES

The duplicate entry exists in src/config/navigation.js (legacy):
- Path: /trainer/student-curriculum
- Label: معاينة منهج الطالب
- Icon: FileText

### TRAINER_NAV_V3:
```
{
  section: 'main',
  label: null,
  items: [
    { id: 'cockpit', href: '/trainer', label: 'غرفة القيادة', icon: LayoutDashboard, primary: true },
    { id: 'grading', href: '/trainer/grading', label: 'محطة التصحيح', icon: FileCheck, badgeKey: 'pending_grading' },
    { id: 'students', href: '/trainer/students', label: 'ملفات الطلاب', icon: Users },
    { id: 'curriculum', href: '/trainer/curriculum', label: 'المنهج', icon: BookOpen },
    { id: 'help', href: '/trainer/help', label: 'مساعدة', icon: Sparkles },
  ],
}
```

### TRAINER_MOBILE_BAR:
```
[
  { id: 'cockpit', href: '/trainer', label: 'القيادة', icon: LayoutDashboard },
  { id: 'grading', href: '/trainer/grading', label: 'التصحيح', icon: FileCheck, badgeKey: 'pending_grading' },
  { id: 'students', href: '/trainer/students', label: 'الطلاب', icon: Users },
  { id: 'curriculum', href: '/trainer/curriculum', label: 'المنهج', icon: BookOpen },
  { id: 'help', href: '/trainer/help', label: 'مساعدة', icon: Sparkles },
]
```

---

## 2. Router — /trainer/* routes

All /trainer/* routes in App.jsx:

Active curriculum routes:
- Route path="/trainer/curriculum" → TrainerCurriculum component
- Route path="/trainer/student-curriculum" → TrainerCurriculumPreview wrapping CurriculumBrowser
- Route path="/trainer/student-curriculum/level/:levelNumber" → TrainerCurriculumPreview wrapping LevelUnits
- Route path="/trainer/student-curriculum/unit/:unitId" → TrainerCurriculumPreview wrapping UnitContent

Redirects:
- /trainer/interventions → /trainer/students
- /trainer/prep → /trainer
- /trainer/live → /trainer
- /trainer/competition → /trainer
- /trainer/my-growth → /trainer
- /trainer/nabih → /trainer
- /trainer/nabih/:conversationId → /trainer

---

## 3. Old trainer curriculum files (to deprecate)

### TrainerCurriculum.jsx
Path: src/pages/trainer/TrainerCurriculum.jsx
Line count: 1438 lines
Importers:
  - src/App.jsx line 129
  - src/App.jsx line 697

### StudentCurriculum.jsx (deprecated student version)
Path: src/pages/student/StudentCurriculum.jsx
Line count: 627 lines
Status: Deprecated, replaced by CurriculumBrowser

---

## 4. New preview wrapper

File: src/pages/trainer/TrainerCurriculumPreview.jsx

Source:
```
import { Outlet } from 'react-router-dom'
import { CurriculumPreviewContext } from '../../contexts/CurriculumPreviewContext'
import PreviewBanner from '../shared/PreviewBanner'

const PREVIEW_VALUE = {
  previewMode: true,
  canSeeAllLevels: true,
  basePath: '/trainer/student-curriculum',
}

export default function TrainerCurriculumPreview({ children }) {
  return (
    <CurriculumPreviewContext.Provider value={PREVIEW_VALUE}>
      <PreviewBanner />
      {children || <Outlet />}
    </CurriculumPreviewContext.Provider>
  )
}
```

Wraps CurriculumPreviewContext.Provider? YES

Confirm suppressCompletionWrites: true? NO - NOT PRESENT in PREVIEW_VALUE

CRITICAL ISSUE: suppressCompletionWrites is not provided. This is a critical gap for Phase B.

---

## 5. PreviewBanner

File: src/pages/shared/PreviewBanner.jsx

Arabic copy: "وضع المعاينة — تستعرض المنهج كما يراه الطالب. التقدم لا يُحفظ، وجميع المستويات متاحة."

Dismiss mechanism: sessionStorage-backed. Clicking X sets sessionStorage.setItem('preview-banner-dismissed', '1'). Persists until page reload.

---

## 6. Cross-references

/trainer/curriculum references: 6 matches
  - src/config/trainerNavigation.js: 3 (TRAINER_NAV_V3, TRAINER_NAV_V2, TRAINER_MOBILE_BAR)
  - src/config/navigation.js: 1 (TRAINER_NAV legacy)
  - src/App.jsx: 1 (Route definition)
  - src/components/layout/NotificationCenter.jsx: 1 (legacy redirect mapping)

/trainer/student-curriculum references: 5 matches
  - src/App.jsx: 3 (three routes for base, level, unit)
  - src/config/navigation.js: 1 (TRAINER_NAV legacy)
  - src/pages/trainer/TrainerCurriculumPreview.jsx: 1 (basePath definition)

---

## 7. Student curriculum entry

Top-level files in src/pages/student/curriculum/:
- CurriculumBrowser.jsx
- LevelUnits.jsx
- UnitContent.jsx
- UnitContentOriginal.jsx (backup)
- StylePreview.jsx
- _premiumPrimitives.jsx
- _useCurriculumData.js
- components/ subdirectory
- tabs/ subdirectory
- unit-v2/ subdirectory

All three top-level components use useCurriculumPreview():
- CurriculumBrowser line 11
- LevelUnits line 8
- UnitContent line 5

---

## 8. Preview-mode plumbing

CurriculumPreviewContext provides:
- previewMode (boolean)
- canSeeAllLevels (boolean)
- basePath (string)

Consumers count: 5

Consumer behaviors:
1. CurriculumBrowser: Uses canSeeAllLevels to skip auto-nav, uses basePath for links
2. LevelUnits: Uses basePath for unit links
3. UnitContent: Uses basePath for navigation, canSeeAllLevels for conditional rendering
4. TrainerCurriculumPreview: Sets previewMode:true, canSeeAllLevels:true
5. AdminCurriculumPreview: Sets previewMode:true, canSeeAllLevels:true

CRITICAL: suppressCompletionWrites is NOT implemented anywhere. No completion-write suppression is currently active in preview mode. Phase B must add this.

---

## 9. Theme inheritance

All /trainer/* routes inherit TrainerLayout wrapper (line 691 in App.jsx).

TrainerLayout applies trainer theme via applyTrainerTheme(profile?.theme_preference):
- Default: 'theme-gold-command' (Diwan Gold)
- Options: theme-gold-command, theme-deep-teal, theme-daylight-study, theme-mission-black

Does /trainer/curriculum use Diwan Gold layout? YES - All trainer routes inherit TrainerLayout which applies gold-command theme by default.

Layout component: src/layouts/TrainerLayout.jsx

CSS classes: .trainer-layout, .trainer-layout__frame, .trainer-layout__main, .trainer-layout__content

---

## Phase B plan preview

1. Add suppressCompletionWrites: true to both preview wrappers PREVIEW_VALUE
2. Update CurriculumPreviewContext DEFAULT_STATE to include suppressCompletionWrites
3. Audit completion handlers in all three student curriculum components
4. Audit child components in unit-v2, components, tabs for write operations
5. Deprecate TrainerCurriculum.jsx once /trainer/curriculum is proven equivalent
6. Remove legacy navigation entries from navigation.js
7. Consider consolidating TRAINER_NAV_V3 and TRAINER_NAV to single source
8. Add E2E tests for preview mode (no progress writes)
9. Verify layout inheritance applies correctly
10. Update trainer docs to clarify curriculum entry points post-unification

---

## Summary

Current state: Two parallel trainer curriculum entry points
- /trainer/curriculum: TrainerCurriculum.jsx (1438 lines, trainer-specific view)
- /trainer/student-curriculum: Preview-wrapped CurriculumBrowser (student-facing, but in preview mode)

Critical gap: suppressCompletionWrites not implemented - preview mode does NOT currently prevent progress saves

Theme: All trainer routes use gold-command (Diwan Gold) theme via TrainerLayout

Action for Phase B: Implement suppressCompletionWrites plumbing to close the write-suppression gap
