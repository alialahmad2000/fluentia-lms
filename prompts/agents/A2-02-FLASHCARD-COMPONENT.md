# Agent 2 — Prompt 02: Flashcard Components

Build the core flashcard component with flip animation and audio.

## Create: `src/pages/student/vocabulary/components/Flashcard.jsx`

### Front side:
- English word (large, centered, 28-32px, bold)
- Part of speech badge (noun, verb, adj...) — pill shape, muted
- Audio play button (🔊) — plays pronunciation audio
- Tap hint: "اضغط للقلب" (small, muted, bottom)

### Back side:
- Arabic meaning (large, centered, bold, Tajawal)
- English definition (medium, muted)
- Example sentence (italic, with the word **bolded**)
- Audio button (same pronunciation)

### Flip animation (Framer Motion):
```jsx
// 3D flip on Y axis: Front rotateY(0) → Back rotateY(180)
// backfaceVisibility: 'hidden' on both sides
// Transition: 0.4s ease
// Click/tap to toggle
```

### Audio playback:
```jsx
const playAudio = (e, url) => {
  e.stopPropagation(); // Don't flip the card
  if (!url) return;
  const audio = new Audio(url);
  audio.play().catch(() => {});
};
// If no audio URL → hide the play button entirely
```

### Card design:
- Size: 320px × 200px (mobile full width), 380px × 240px (desktop)
- Background: rgba(255,255,255,0.05), border rgba(255,255,255,0.08)
- Border radius: 20px
- Audio button: 44px circle, sky-blue bg, white icon

---

## Also create: `src/pages/student/vocabulary/components/FlashcardDeck.jsx`

Manages a deck of flashcards with swipe/navigation:
- Shows one card at a time
- **Swipe left/right** (mobile) or **arrow buttons** (desktop) to navigate
- Progress: "كلمة 5 من 20"
- **Keyboard**: Space to flip, ← → to navigate

### Swipe (Framer Motion drag):
```jsx
<motion.div
  drag="x"
  dragConstraints={{ left: 0, right: 0 }}
  onDragEnd={(e, info) => {
    if (info.offset.x > 100) goToPrevious();
    if (info.offset.x < -100) goToNext();
  }}
>
```

### Slide animation on card change (direction-aware)
