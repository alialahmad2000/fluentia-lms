# LEGENDARY-A: Shared Core Foundation

## Discovery Summary

### Existing Tables (pre-LEGENDARY-A)
| Table | Rows | Purpose |
|-------|------|---------|
| xp_transactions | 309 | XP awards (amount, reason enum, related_id) |
| activity_feed | 112 | Social feed per group (triggers on xp/words/sections) |
| activity_events | 516 | Analytics/telemetry events |
| skill_snapshots | 0 | Weekly skill radar (6 skills, 0-100) |
| student_streaks | 0 | **UNUSED** — streak is on students table |
| vocabulary_bank | 0 | **UNUSED** — replaced by student_saved_words |
| curriculum_vocabulary | 1954 | Canonical per-unit vocabulary |
| curriculum_vocabulary_srs | 97 | SM-2 based SRS tracking |
| student_saved_words | 24 | Personal dictionary |
| anki_cards | 0 | FSRS-based SRS (not yet populated) |
| vocabulary_word_mastery | 386 | Per-word exercise pass tracking |

### Decision Matrix
- **Unified activity ledger:** NEW `unified_activity_log` table (none of existing tables >70% aligned)
- **Skill state:** NEW `student_skill_state` (fast single-row reads) + keep `skill_snapshots` for weekly trends
- **Streak:** COMPUTED from `unified_activity_log` via `get_student_streak()` RPC
- **Soft-retired:** `student_streaks` (0 rows), `vocabulary_bank` (0 rows)

---

## Canonical Event Types

| event_type | event_subtype | xp_delta | skill_impact | Description |
|-----------|---------------|----------|--------------|-------------|
| `unit_completed` | — | 50 | {reading:1, vocabulary:1, grammar:1} | All tabs in a unit done |
| `unit_tab_completed` | reading/writing/grammar/vocabulary/speaking/listening/pronunciation/assessment | 5-25 | {[skill]:2} | Single section completed |
| `reading_submitted` | — | 5 | {reading:2} | Reading passage answered |
| `writing_submitted` | — | 10 | {writing:2} | Writing task submitted |
| `speaking_submitted` | — | 10 | {speaking:2} | Speaking recording submitted |
| `speaking_graded` | — | 0 | {speaking:1} | Trainer graded speaking |
| `writing_graded` | — | 0 | {writing:1} | Trainer graded writing |
| `vocab_added` | — | 1 | {vocabulary:1} | Word saved to personal dictionary |
| `vocab_reviewed` | — | 1 | {vocabulary:1} | SRS review completed. metadata: {quality, interval_days, ease_factor} |
| `vocab_mastered` | — | 5 | {vocabulary:2} | SRS moved word to mastered |
| `class_attended` | — | 5 | {} | Attended a live class |
| `peer_recognition_received` | — | 3 | {} | Received a peer recognition |
| `peer_recognition_given` | — | 1 | {} | Gave a peer recognition |
| `achievement_unlocked` | — | varies | {} | Unlocked an achievement |
| `streak_milestone` | 7/14/30/60/90 | varies | {} | Hit a streak milestone |
| `streak_freeze_used` | — | 0 | {} | Used a streak freeze |
| `streak_broken` | — | 0 | {} | Streak was broken |
| `level_promoted` | — | 100 | {} | Promoted to next CEFR level |
| `daily_challenge_completed` | — | 10 | varies | Completed daily challenge |
| `placement_test_completed` | — | 0 | {} | Completed placement test |
| `recording_completed` | — | 25 | {} | Watched class recording fully |

---

## Skill Impact Conventions

Each `skill_impact` is a JSON object with integer deltas for: `vocabulary`, `reading`, `writing`, `speaking`, `listening`, `grammar`. Values are clamped to [0, 100] in `student_skill_state`.

Recommended deltas:
- **Primary skill activity** (e.g., writing submission): +2 on the primary skill
- **Secondary/grading**: +1
- **Assessment**: +1 on each tested skill
- **Non-skill events** (streak, achievement): empty `{}`

---

## How Future Prompts Consume This Core

| Prompt | Consumes |
|--------|----------|
| **LEGENDARY-B** (Vocabulary Expansion) | `log_activity` for vocab_added/reviewed/mastered, `student_skill_state.vocabulary` |
| **LEGENDARY-C** (AI Progress Reports) | `unified_activity_log` for per-student activity analysis, `student_skill_state` for radar |
| **LEGENDARY-E** (Streak/Teams/Leaderboard) | `get_student_streak()`, `get_group_leaderboard()`, `get_student_xp()` |
| **LEGENDARY-F** (Future) | Extends event_type list, writes through `log_activity` |

---

## Architecture

```
Frontend → supabase.rpc('log_activity', {...})
              ↓
    unified_activity_log (INSERT)
              ↓
    trg_apply_skill_impact (TRIGGER)
              ↓
    student_skill_state (UPDATE)

Reads:
    get_student_xp()     → SUM(xp_delta) from unified_activity_log
    get_student_streak() → consecutive days from unified_activity_log (Asia/Riyadh)
    get_skill_radar()    → SELECT from student_skill_state
    get_group_leaderboard() → JOIN students + profiles + unified_activity_log
```

All writes go through `log_activity()` RPC (SECURITY DEFINER). No client-side INSERT allowed (RLS blocks it).
