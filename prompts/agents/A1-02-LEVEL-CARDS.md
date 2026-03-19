# Agent 1 — Prompt 02: Curriculum Browser Page (Level Cards)

Build the main curriculum browsing page at `/student/curriculum`.

## Create: `src/pages/student/curriculum/CurriculumBrowser.jsx`

### What it shows:
- Page title: "المنهج الدراسي" (large, bold, Tajawal)
- Subtitle: "اختر المستوى للبدء في رحلتك التعليمية"
- Grid of 6 level cards (2 cols mobile, 3 cols desktop)

### Data to fetch:
```jsx
// 1. All active levels from curriculum_levels (ordered by level_number)
// 2. Current student's academic_level from students table
// 3. Unit completion counts per level from student_curriculum_progress (if exists)
// Use the ACTUAL column names you discovered in A1-01
```

### Level Card behavior:
- **Current level** (matches student's academic_level): Highlighted with glowing border + "مستواك الحالي" badge
- **Below current**: Unlocked, clickable, shows progress
- **Above current**: Locked, greyed out, lock icon, NOT clickable (cursor-not-allowed)

### Each card displays:
1. Color strip at top (4px, using level's `color` column)
2. Level name Arabic (large, bold) — from `name_ar`
3. Level name English (small, muted) — from `name_en`
4. CEFR badge (pill shape) — from `cefr`
5. Progress: "X / 12 وحدة مكتملة" + thin progress bar
6. Description snippet — from `description_ar` (1-2 lines, truncated)

### Fallback colors if DB color is missing:
```
Level 0: #4ade80 (green)
Level 1: #38bdf8 (sky blue)
Level 2: #a78bfa (purple)
Level 3: #f59e0b (amber)
Level 4: #ef4444 (red)
Level 5: #fbbf24 (gold)
```

### Design rules:
- Card: `rounded-2xl`, surface bg `rgba(255,255,255,0.03)`, border `rgba(255,255,255,0.06)`
- Card padding: 24px
- Hover (unlocked): `translateY(-2px)`, border brightens to level color at 30% opacity
- Locked: dark overlay + centered lock icon (from lucide-react or project's icon lib)
- Current level: border glow using level color, subtle pulsing animation
- Progress bar: 4px tall, rounded, muted bg, fill = level color
- Mobile: 2 columns, 8px gap
- Desktop: 3 columns, 16px gap
- Min card height: 180px

### Loading state:
Show 6 skeleton cards with shimmer (animate-pulse), same dimensions as real cards.

### Error state:
"حدث خطأ في تحميل المنهج — حاول مرة ثانية" + retry button

### Framer Motion:
```jsx
import { motion } from 'framer-motion';

<motion.div variants={container} initial="hidden" animate="show">
  {levels.map(level => (
    <motion.div key={level.id} variants={item}>
      <LevelCard ... />
    </motion.div>
  ))}
</motion.div>

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};
```

### Navigation:
Click unlocked card → `navigate(/student/curriculum/level/${level.level_number})`

### Also create: `src/pages/student/curriculum/components/LevelCard.jsx`
Extract the card as a reusable component. Props: `level`, `isLocked`, `isCurrent`, `completedUnits`, `totalUnits`, `onClick`

### Light mode:
Cards in light mode: white bg, subtle grey border, dark text. Must look equally premium.

### RTL:
- All text right-aligned
- Arrow icon on card points LEFT (←) in RTL for "go into level"
