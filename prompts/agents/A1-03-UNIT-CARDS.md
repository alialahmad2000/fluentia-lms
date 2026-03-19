# Agent 1 — Prompt 03: Level Units Page

Build the units listing page at `/student/curriculum/level/:levelNumber`.

## Create: `src/pages/student/curriculum/LevelUnits.jsx`

### What it shows:
- **Header**: Back button (→ in RTL) + Level name Arabic + CEFR badge
- **Subtitle**: Level name English + description
- **Grid/List**: 12 unit cards

### Data to fetch:
```jsx
const { levelNumber } = useParams();

// 1. Fetch the level info
const { data: level } = await supabase
  .from('curriculum_levels')
  .select('*')
  .eq('level_number', parseInt(levelNumber))
  .single();

// 2. Fetch units for this level
const { data: units } = await supabase
  .from('curriculum_units')
  .select('*')
  .eq('level_id', level.id)
  .order('unit_number');
```

### Security check:
- Get student's `academic_level`
- If `levelNumber > academic_level`, redirect to `/student/curriculum`
- Show toast: "هذا المستوى غير متاح لك حالياً"

### Each unit card displays:
1. **Unit number badge**: Circle, 36px, bg = level color, white text
2. **Theme Arabic**: Primary text, bold — from `theme_ar`
3. **Theme English**: Secondary text, muted — from `theme_en`
4. **Cover image**: If `cover_image_url` exists show it (80x80 rounded), else gradient placeholder
5. **Status indicator**: ⚪ Not started / 🟡 In progress / 🟢 Completed

### Card layout:
- **Mobile**: Full width list, horizontal card layout
- **Desktop**: 2-column grid
- Card: `rounded-xl`, surface bg, border, padding 16px
- Hover: `translateY(-1px)`, subtle border brighten

### Click action:
`navigate(/student/curriculum/unit/${unit.id})` — page doesn't exist yet, that's fine

### Empty state:
"المحتوى قيد التحضير — سيكون جاهزاً قريباً إن شاء الله"

### Back navigation:
`navigate('/student/curriculum')` — "العودة للمستويات" with → arrow

### Also create: `src/pages/student/curriculum/components/UnitCard.jsx`
Props: `unit`, `levelColor`, `status`, `onClick`
