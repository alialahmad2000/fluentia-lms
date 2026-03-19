# Agent 3 — Prompt 03: Irregular Verbs Practice Page

## Create: `src/pages/student/verbs/IrregularVerbsPractice.jsx`

### Header:
- Title: "الأفعال الشاذة"
- Subtitle: "تدرّب على الأفعال غير المنتظمة"

### Mode toggle (segmented control):
- "تصفّح" (Browse) — see all verb cards, scroll through
- "تدريب" (Practice) — fill-in-the-blank quiz

### Filters:
- Level selector (only unlocked levels, default = current level)
  - Show verb count: "المستوى ١ (١٥ فعل)"
- Search: "ابحث عن فعل..."

### Browse Mode:
- VerbCard components in scrollable grid (1 col mobile, 2 col desktop)
- Framer Motion stagger entry

### Practice Mode:
- Difficulty: "سهل" (1 blank) / "صعب" (2 blanks)
- VerbPractice component
- Session: 10 verbs per round
- Progress bar through 10 verbs
- Results at end: score + percentage (🟢80%+ / 🟡60-79% / 🔴<60%)
- "أعد المحاولة" (Retry) + "جولة جديدة" (New Round)

### Data:
```jsx
const { data: verbs } = await supabase
  .from('curriculum_irregular_verbs')
  .select('*')
  .eq('level_id', selectedLevelId)
  .order('sort_order');
// Use ACTUAL column names from A3-01!
```

### States:
- Loading: skeleton verb cards
- Empty: "لا توجد أفعال شاذة لهذا المستوى بعد"
- Mobile responsive, dark/light mode
