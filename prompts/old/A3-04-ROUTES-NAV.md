# Agent 3 — Prompt 04: Routes + Sidebar

## Step 1: Add Route
Inside student routes:
```jsx
{ path: 'verbs', element: <IrregularVerbsPractice /> },
```

## Step 2: Add to Sidebar
```jsx
{ label: 'الأفعال الشاذة', path: '/student/verbs', icon: Shuffle }
```
Position: After المفردات (or 4th if المفردات doesn't exist yet).

## Step 3: Verify
```bash
npm run dev
```
Test: page loads → level filter with verb counts → browse mode shows verb cards → audio plays for each form → play all works → practice mode with blanks → correct/wrong feedback → score at end → search works → sidebar item → mobile OK → dark/light OK → no errors.

## DO NOT commit yet — the Manager handles the commit.
