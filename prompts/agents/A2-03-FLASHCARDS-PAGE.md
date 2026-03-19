# Agent 2 — Prompt 03: Vocabulary Flashcards Page

## Create: `src/pages/student/vocabulary/VocabularyFlashcards.jsx`

### Page layout:

**Header:**
- Title: "المفردات" + Subtitle: "تعلّم كلمات جديدة كل يوم"

**Filters (top bar):**
- Level selector: Dropdown/tabs (only unlocked levels, default = student's current level)
- Unit selector: "كل الوحدات" + units 1-12
- Search: "ابحث عن كلمة..."

**Stats bar:**
- Total words: "٢٤٠ كلمة"
- Words with audio: "١٩٤ 🔊"

**Mode toggle (segmented control):**
- "بطاقات" (Flashcard mode) — shows FlashcardDeck
- "قائمة" (List mode) — shows all words in compact rows

**Flashcard mode:** FlashcardDeck component + card counter
**List mode:** Scrollable table — English word | Arabic meaning | 🔊 | status dot

### Data fetching:
```jsx
// Fetch vocabulary joined with reading → unit → level
// Adapt column names to what you discovered in A2-01!
const { data: vocab } = await supabase
  .from('curriculum_vocabulary')
  .select('*, reading:curriculum_readings!reading_id(unit_id, unit:curriculum_units!unit_id(unit_number, level_id))')
  .order('sort_order');
// Check actual FK column names!
```

### Audio manager:
```jsx
const audioRef = useRef(null);
const playWord = (url) => {
  if (audioRef.current) { audioRef.current.pause(); }
  if (!url) return;
  audioRef.current = new Audio(url);
  audioRef.current.play().catch(() => {});
};
```

### Empty/loading/error states:
- Loading: skeleton filter bar + skeleton flashcard
- No words: "لا توجد مفردات لهذه الوحدة بعد"
- Error: "حدث خطأ — حاول مرة ثانية" + retry

### Mobile:
- Flashcard full width, swipe works
- Filter chips scroll horizontally
- List mode: compact 56px rows, 44px audio buttons
