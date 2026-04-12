# Agent 3 — Prompt 02: Verb Card + Practice Components

## Create: `src/pages/student/verbs/components/VerbCard.jsx`

### Shows 3 verb forms in a row:
```
┌─────────────────────────────────────┐
│  go        went       gone          │
│  Base      Past       Past Part.    │
│  🔊        🔊         🔊            │
│  يذهب                               │
│  "She went to the store yesterday"  │
└─────────────────────────────────────┘
```

### Layout:
- 3 columns for 3 forms, each with: English form (20-24px bold), label (small muted), audio 🔊
- Arabic meaning below (Tajawal font)
- Example sentence (muted, italic)

### Audio:
```jsx
// Each form has its own audio URL — use column names from A3-01
// Stop previous audio before playing new one
const audioRef = useRef(null);
const playAudio = (url) => {
  if (audioRef.current) audioRef.current.pause();
  if (!url) return;
  audioRef.current = new Audio(url);
  audioRef.current.play().catch(() => {});
};
```

### "Play All" button — plays 3 forms in sequence with 0.5s gap:
```jsx
const playAll = async () => {
  const urls = [baseUrl, pastUrl, ppUrl].filter(Boolean);
  for (const url of urls) {
    await new Promise(resolve => {
      const a = new Audio(url);
      a.onended = () => setTimeout(resolve, 500);
      a.onerror = resolve;
      a.play().catch(resolve);
    });
  }
};
```

### Design: rounded-xl, surface bg, border, 24px padding, audio buttons 36px circle sky-blue

---

## Create: `src/pages/student/verbs/components/VerbPractice.jsx`

### Fill-in-the-blank mode:
- Show verb with 1 blank (easy) or 2 blanks (hard)
- Student types missing form(s) in text inputs
- "تحقق" button checks answer (case insensitive, trimmed)
- ✅ Correct: green flash + "أحسنت! 🎉"
- ❌ Wrong: red flash + shake + "الإجابة الصحيحة: went"
- "التالي" loads next verb
- Score: "٧ / ١٠ صحيحة"

### Input design: 120px wide, centered, rounded-lg, 48px height, sky-blue focus border
