# Trainer Design D0 — Phase A Discovery
**Date:** 2026-04-21

---

## 1. Theme token architecture

**Primary file:** C:\Users\Dr. Ali\Desktop\fluentia-lms\src\design-system\themes.css — 235 lines

**[data-theme] blocks found:**
- `[data-theme="aurora-cinematic"]` — Deep navy + cyan/violet/gold auroras
- `[data-theme="night"]` — Deep obsidian + warm gold (fallback/default)
- `[data-theme="minimal"]` — Light neutral base (Arc Browser / Vercel aesthetic)

**First 100 lines:** (See original themes.css file, lines 1–100)

**All --ds-* variable names (32 total):**
--ds-accent-danger, --ds-accent-gold, --ds-accent-primary, --ds-accent-primary-glow, --ds-accent-secondary, --ds-accent-success, --ds-accent-warning, --ds-amber, --ds-aurora-1, --ds-aurora-2, --ds-aurora-3, --ds-aurora-opacity, --ds-bg-base, --ds-bg-elevated, --ds-bg-overlay, --ds-border-strong, --ds-border-subtle, --ds-is-dark, --ds-reveal-bg, --ds-reveal-text, --ds-shadow-glow, --ds-shadow-lg, --ds-shadow-md, --ds-shadow-sm, --ds-sky, --ds-surface-1, --ds-surface-2, --ds-surface-3, --ds-text-inverse, --ds-text-primary, --ds-text-secondary, --ds-text-tertiary

---

## 2. Theme application mechanism

**ThemeProvider:** EXISTS — src/design-system/ThemeProvider.jsx

**data-theme set via:**
- Student: `document.documentElement.setAttribute('data-theme', name)` in applyTheme() (line 44, applyTheme.js)
- Trainer: `document.body.classList.add('theme-gold-command')` + similar theme classes

**Trainer scoping:** Scoped wrapper class — `body.trainer-role` + theme class (e.g., `body.trainer-role.theme-gold-command`)

**Trainer layout wrapper:** 
- Path: src/layouts/TrainerLayout.jsx
- Root element: `<div className="trainer-layout" data-role={profile?.role || 'trainer'} onClick={() => tracker.touch()} onKeyDown={() => tracker.touch()}>`
- Key setup: `document.body.classList.add('trainer-role')` on mount (line 26)
- Theme applied: `applyTrainerTheme(profile?.theme_preference)` (line 27)

---

## 3. Theme switcher

**Path:** src/design-system/HeaderThemeButton.jsx (component for student theme switching)

**Rendered in:** Student header area

**LocalStorage keys written:**
- Student: `fluentia-theme`
- Trainer: `fluentia_trainer_theme`

---

## 4. Decorative elements

### 4a. Islamic geometric background
- **File:** src/design-system/TrainerBackground.jsx
- **Mount point:** Line 51 in TrainerLayout.jsx: `<TrainerBackground />`
- **SVG pattern:** Inline with ID `tr-geometric` (stars & circles)
- **CSS animation:** 240-second rotation

### 4b. Gold spotlight cursor
- **File:** src/design-system/TrainerBackground.jsx
- **Mount point:** Line 39: `<div className="trainer-bg__spotlight" />`
- **Listeners:** mousemove, touchmove (passive)
- **CSS vars:** Updates --sx and --sy, consumed by `var(--tr-spotlight)` in trainer-themes.css

### 4c. Auto Mission Black during live class
- **Functions:** enterMissionBlack(), exitMissionBlack() in applyTheme.js
- **Effect:** Applies class `theme-mission-black--active`, disables spotlight & pattern via CSS
- **Integration status:** Code exists but no trigger found in live class flow

---

## 5. Font loading

**index.html fonts (from head):**
- Tajawal (400, 500, 700) — Critical, sync
- Cairo (500, 700, 800) — Preload
- Inter Tight (400, 600, 800) — Async preload
- IBM Plex Sans (400, 600, 700) — Async preload
- Playfair Display (700, 800, 900) — Async preload
- Amiri (700) — Async preload

**Current Arabic chain:** Tajawal → Cairo → Amiri
**Current Latin chain:** Inter → Inter Tight → IBM Plex Sans → Playfair Display

**No @fontsource packages used** — Google Fonts exclusively

---

## 6. Hardcoded hex audit (trainer files)

**Total:** 360 hex occurrences across 39 files

**Top offenders:**
1. TrainerProgressReports.legacy.jsx — 64
2. TrainerNotesPanel.css — 29
3. AIInsightCard.css — 20
4. ConversationsSidebar.css — 17
5. Hero360Card.css — 17
6. InterventionsHistoryCard.css — 17
7. QuickActionsBar.css — 17
8. MyGrowthPage.deprecated.jsx — 15
9. SubmissionReviewModal.css — 13
10. MessageList.css — 12

---

## 7. Trainer Tailwind utilities

**tailwind.config defines trainer-* colors:** NO

**Total usages of bg-trainer-/text-trainer-/border-trainer-:** 0

Trainer theming uses CSS variables (--tr-*) via body class, not Tailwind utilities.

---

## 8. Cross-surface leakage check

**Non-trainer files using diwan-gold/deep-teal data-theme:** NONE

**Files importing TrainerLayout:** ZERO (used via routing/Outlet, not direct imports)

**Leakage risk:** NONE

---

## Phase B Implementation Preview

1. Migrate hardcoded hex colors to CSS variables or Tailwind fallbacks
2. Integrate enterMissionBlack() into live class lifecycle
3. Deprecate legacy .legacy.jsx and .deprecated.jsx files (significant hex debt)
4. Consider Tailwind trainer-* aliases if design scales
5. Document trainer theme switcher UX (none found for trainers yet)
6. Verify font loading metrics post-Migration

---

## Summary

| Metric | Value |
|--------|-------|
| Primary theme file | themes.css (235 lines) |
| Theme variants | 3 student + 4 trainer = 7 total |
| Design system variables | 32 (--ds-*) |
| Decorative elements | 3 (geometric, spotlight, mission-black) |
| Hardcoded hex in trainer files | 360 across 39 files |
| Tailwind trainer-* tokens | 0 (CSS vars only) |
| Cross-surface leakage | None |
| Fonts | 7 from Google Fonts |

