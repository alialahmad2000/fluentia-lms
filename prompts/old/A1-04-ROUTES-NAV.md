# Agent 1 — Prompt 04: Routes + Sidebar Navigation

Wire up the pages to the router and sidebar.

## Step 1: Add Routes
Find the router config and add inside student routes:
```jsx
{ path: 'curriculum', element: <CurriculumBrowser /> },
{ path: 'curriculum/level/:levelNumber', element: <LevelUnits /> },
```

## Step 2: Add to Student Sidebar
```jsx
{
  label: 'المنهج',
  path: '/student/curriculum',
  icon: BookOpen, // from lucide-react or project's icon lib
}
```
Position: **2nd item** after dashboard/home.

## Step 3: Verify
```bash
npm run dev
```

Test: 6 level cards load → click one → 12 unit cards → back button works → sidebar item works → mobile responsive → dark/light mode → no errors.

## DO NOT commit yet — the Manager prompt handles the final commit.
