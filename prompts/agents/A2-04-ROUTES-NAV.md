# Agent 2 — Prompt 04: Routes + Sidebar

## Step 1: Add Route
Inside student routes:
```jsx
{ path: 'vocabulary', element: <VocabularyFlashcards /> },
```

## Step 2: Add to Sidebar
```jsx
{ label: 'المفردات', path: '/student/vocabulary', icon: Languages }
```
Position: After المنهج (or 3rd if المنهج doesn't exist yet).

## Step 3: Verify
```bash
npm run dev
```
Test: page loads → level filter works → flashcard flips → audio plays → swipe works → list mode works → search works → sidebar item works → mobile OK → dark/light OK → no errors.

## DO NOT commit yet — the Manager handles the commit.
