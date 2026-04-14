# LEGENDARY-C1: SRS Engine (SM-2)

## Algorithm
SM-2 (Anki's base algorithm). Deterministic, no ML.

### Parameters
- `ease_factor`: starts 2.5, min 1.3
- `interval_days`: 0 → 1 → 6 → EF-scaled
- `repetition`: streak counter, resets on failure

### 4-Button Grading (simplified from Anki's 6)
| Button | Arabic | Quality |
|--------|--------|---------|
| ❌ | ما أعرفها | 1 |
| 🤔 | صعبة | 3 |
| ✅ | أعرفها | 4 |
| ⚡ | سهلة جداً | 5 |

### Mastery Threshold
Word is "mastered" when `repetition >= 5 AND interval_days >= 21`.
Mastered words are hidden from the active queue but visible under "أتقنتها".

## Auto-Enqueue Sources
1. **Manual save** (`source='manual'`): Student taps "احفظ" on vocab card → due immediately
2. **Unit completion** (`source='unit_complete'`): Core-tier words auto-added with staggered `next_review_at` (0/1/2 day offsets)
3. **Passage highlight** (`source='reading_passage'`): Word saved from reading tooltip → due immediately

## Integration Surfaces
- **Dashboard widget**: "N كلمة للمراجعة اليوم" pill on PersonalDictionaryWidget
- **Unit Vocabulary tab**: "للمراجعة (N)" section at top when unit has due words
- **ReviewOverlay**: Fullscreen flashcard-style review modal

## Privacy
- Student owns their data (RLS: student_id = auth.uid())
- Trainer can read their group students' vocab (for progress visibility)

## XP Economics
| Event | XP |
|-------|-----|
| Add word to dictionary | +5 |
| Review (fail, quality < 3) | +1 |
| Review (pass, quality >= 3) | +3 |
| Word mastered | +15 |

## Forward Compatibility
- LEGENDARY-F (Progress Reports) will consume `vocab_reviewed` and `vocab_mastered` events from `unified_activity_log`
- LEGENDARY-E2 (Achievements) can trigger on mastery milestones
