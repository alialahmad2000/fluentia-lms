# DASH-V2 Discovery Results

Generated: 2026-04-13

---

## A. Existing Dashboard Inventory

- **Main file:** `src/pages/student/StudentDashboard.jsx`
- **Route:** `/student` → `<StudentDashboard />` (inside `LayoutShell`, protected for role `student`)
- **`/student/my-dictionary` route exists:** NO

### Currently Mounted Children (with paths)

| Component | Path | Purpose |
|-----------|------|---------|
| DailyChallenge | `src/components/gamification/DailyChallenge` | Daily challenge widget |
| SrsReviewCard | `src/components/gamification/SrsReviewCard` | SRS daily review card |
| LevelExitTestCard | `src/components/gamification/LevelExitTestCard` | Level exit test CTA |
| EnableNotificationsPrompt | `src/components/notifications/EnableNotificationsPrompt` | Push notification opt-in |
| MysteryBox | `src/components/gamification/MysteryBox` | Mystery box reward |
| StudentWowMoments | `src/components/ai/StudentWowMoments` | AI-powered highlights |
| FloatingParticles | `src/components/illustrations/FloatingParticles` | Hero background particles |
| AnimatedNumber | `src/components/ui/AnimatedNumber` | XP/streak animated counter |
| DashboardSkeleton | `src/components/ui/PageSkeleton` | Loading skeleton |
| SmartNudgesWidget | *(inline in file)* | Smart nudges/reminders |
| ExercisesCTA | *(inline in file)* | Targeted exercises CTA |

### Current Dashboard Sections (render order)

1. **Hero Section** — greeting, package level, XP badge (AnimatedNumber), streak badge, level badge, XP progress bar
2. **Weekly Tasks Progress** — "المهام الأسبوعية", progress bar, horizontal scrollable task mini-cards, link to `/student/weekly-tasks`
3. **Push Notifications Prompt** — `EnableNotificationsPrompt`
4. **Level Exit Test Card** — `LevelExitTestCard`
5. **SRS Daily Review** — `SrsReviewCard`
6. **Next Class** — group name, schedule, countdown timer, Google Meet link
7. **Smart Stats Row** — 4 cards: XP Level, Streak Days, Pending Assignments, Academic Level
8. **Encouraging Message** — dynamic motivational text
9. **Smart Nudges** — up to 3 nudges from `smart_nudges` table
10. **Quick Access Grid** — 4 cards: Weekly Tasks, Assignments, Level Test, Smart Insights
11. **Wow Moments** — `StudentWowMoments`
12. **Community Grid** — left: activity preview (3 items from `activity_feed`), right: leaderboard preview (top 3 by XP)
13. **Daily Challenge & Mystery Box** — side by side
14. **Payment Status** — conditional, shows pending/overdue payments
15. **Exercises CTA** — conditional, shows pending exercise count
16. **Motivational Footer** — English quote

### Dashboard Supabase Queries

| queryKey | Table |
|----------|-------|
| `dashboard-weekly-progress` | `weekly_task_sets` |
| `dashboard-weekly-tasks-detail` | `weekly_tasks` |
| `student-pending-assignments` | `assignments` |
| `student-next-payment` | `payments` |
| `dashboard-activity-preview` | `activity_feed` |
| `dashboard-leaderboard-preview` | `students` |
| `dashboard-nudges` | `smart_nudges` |
| `pending-exercises-count` | `targeted_exercises` |

### Sidebar Nav (student)

- الرئيسية → `/student`
- المنهج → `/student/curriculum`
- المفردات → `/student/flashcards` *(closest to "dictionary")*
- الأفعال الشاذة → `/student/verbs`
- تقدّمي → `/student/progress`
- المبارزات → `/student/duels`
- تحدي المبدعين → `/student/creator-challenge`
- المحادثة → `/student/conversation`
- المساعد الذكي → `/student/ai-chat` (talaqa)
- رؤى ذكية → `/student/ai-insights` (talaqa)
- نشاط المجموعة → `/student/group-activity` (talaqa)

No "قاموسي" or "my-dictionary" in sidebar. The FAB has "قاموسي" as a quick action pointing to `onWords`.

---

## B. Vocabulary Tables

### Table: `student_saved_words` (22 rows)

Personal dictionary — words saved from reading passages or unit vocab.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| student_id | uuid | NO | — |
| word | text | NO | — |
| meaning | text | YES | — |
| context_sentence | text | YES | — |
| source_unit_id | uuid | YES | — |
| source | text | YES | — |
| source_reference | text | YES | — |
| created_at | timestamptz | YES | now() |

**"Source" attribution column: YES** — `source` column exists. Values observed: needs verification but the column is present.

### Table: `curriculum_vocabulary` (1,954 rows)

Master word bank tied to curriculum readings.

| Column | Type |
|--------|------|
| id | uuid |
| reading_id | uuid |
| word | text |
| definition_en | text |
| definition_ar | text |
| example_sentence | text |
| part_of_speech | text |
| audio_url | text |
| image_url | text |
| sort_order | integer |
| created_at | timestamptz |
| synonyms | jsonb |
| antonyms | jsonb |
| word_family | jsonb |
| difficulty_level | text |
| ipa_transcription | text |
| usage_notes | text |
| collocations | jsonb |

### Table: `vocabulary_word_mastery` (354 rows)

Per-word mastery tracking across exercise types.

| Column | Type |
|--------|------|
| id | uuid |
| student_id | uuid |
| word_id | uuid |
| mastery_level | USER-DEFINED (enum) |
| meaning_correct | integer |
| meaning_attempts | integer |
| sentence_correct | integer |
| sentence_attempts | integer |
| listening_correct | integer |
| listening_attempts | integer |
| last_practiced_at | timestamptz |
| created_at | timestamptz |
| updated_at | timestamptz |

**Mastery levels (enum):** `new`, `learning`, `mastered` (3-tier system)

### Table: `curriculum_vocabulary_srs` (97 rows)

SM-2 spaced repetition cards.

| Column | Type |
|--------|------|
| id | uuid |
| student_id | uuid |
| word_id | uuid |
| ease_factor | numeric |
| interval_days | integer |
| repetitions | integer |
| next_review_at | timestamptz |
| last_review_at | timestamptz |
| created_at | timestamptz |

### Table: `vocabulary_bank` (0 rows — legacy/unused)

Has built-in `vocab_mastery` enum and review scheduling. Not used in code.

### Table: `vocabulary_quiz_attempts` (0 rows)

Quiz attempt tracking per unit/chunk. Not populated yet.

### FSRS/Anki Tables (both empty)

| Table | Rows | Purpose |
|-------|------|---------|
| `anki_cards` | 0 | FSRS-style cards (state, stability, difficulty, due_at) |
| `anki_review_logs` | 0 | Review history (rating, state transitions, duration_ms) |

### Reading-Passage Save Flow

- **File:** `src/components/student/TextSelectionTooltip.jsx`
- **Function:** `handleSaveWord` (inside component)
- **Insert:** `supabase.from('student_saved_words').insert({ student_id, word, meaning, context_sentence, source_unit_id, source, source_reference })`
- **Delete:** `supabase.from('student_saved_words').delete().eq('student_id', ...).eq('word', ...)`

**Other files using `student_saved_words`:**
- `src/components/student/SavedWordsPanel.jsx` — fetches, inserts, deletes
- `src/pages/student/curriculum/tabs/VocabularyTab.jsx` — upserts saved words via `saveWordMutation`
- `src/pages/student/curriculum/tabs/ReadingTab.jsx` — queries saved words for highlighting

---

## C. Daily/Weekly Activity Sources

### `xp_transactions` Schema (8 columns)

| Column | Type |
|--------|------|
| id | uuid |
| student_id | uuid |
| amount | integer |
| reason | USER-DEFINED (enum) |
| description | text |
| related_id | uuid |
| awarded_by | uuid |
| created_at | timestamptz |

### Distinct Activity Types (last 14 days)

| reason | Typical Amount | Example Description |
|--------|---------------|---------------------|
| `daily_challenge` | 5 | Daily challenge completion |
| `achievement` | 20 | Achievement unlocked |
| `voice_note_bonus` | — | Voice note XP |
| `correct_answer` | — | Correct answer in exercise |
| `challenge` | 5-25 | Vocabulary games |
| `custom` | — | Conversation practice |
| `assignment_on_time` | — | On-time assignment submission |

### Unit Completion Source

**Table:** `student_curriculum_progress` (31 columns, active data)

| Key Columns | Type |
|-------------|------|
| id | uuid |
| student_id | uuid |
| unit_id | uuid |
| section_type | text (reading, grammar, vocabulary, writing, listening, speaking, pronunciation, assessment) |
| status | text |
| score | numeric |
| answers | jsonb |
| time_spent_seconds | integer |
| attempt_number | integer |
| attempt_history | jsonb |
| is_latest | boolean |
| is_best | boolean |
| trainer_grade | numeric |
| trainer_notes | text |
| created_at | timestamptz |
| updated_at | timestamptz |

### Other Progress Tables (all empty)

| Table | Purpose |
|-------|---------|
| `submissions` / `active_submissions` | Assignment submissions |
| `student_speaking_progress` | Speaking completion |
| `student_spelling_progress` | Spelling mastery |
| `student_verb_progress` | Verb conjugation mastery |
| `creator_submissions` | Creator challenge |

### Streak Data on `profiles`

Only `last_active_at` (timestamptz) exists. **No dedicated streak counter column.** Streak is currently computed client-side or not tracked persistently.

### Recommendation for Daily Aggregation

**Direct query** on `xp_transactions WHERE created_at::date = CURRENT_DATE AND student_id = ?` is sufficient for daily view. For weekly, filter `created_at >= date_trunc('week', CURRENT_DATE)`. Row volume is low enough (~50-100 per student per week) that no materialized view is needed.

Cross-reference with `student_curriculum_progress` for "units touched today/this week" by filtering `updated_at::date`.

---

## D. Peer Feed Sources

### CEFR Level Column

- **Table.Column:** `students.academic_level` (integer)
- **Also:** `students.gamification_level` (integer, separate game progression)
- **No level columns on `profiles` table**

### Student Count per Level

| academic_level | count |
|----------------|-------|
| 1 | 8 |
| 2 | 1 |
| 3 | 8 |

### Existing Activity/Feed Tables

| Table | Status |
|-------|--------|
| `activity_feed` | EXISTS — used by `StudentActivityFeed.jsx` |
| `activity_events` | EXISTS |
| `analytics_events` | EXISTS — page_view, login, tab_switched events |
| `notifications` | EXISTS |
| `seasonal_events` | EXISTS |
| `event_participants` | EXISTS |
| `notification_preferences` | EXISTS |

### `analytics_events` Schema (9 columns)

| Column | Type |
|--------|------|
| id | uuid |
| user_id | uuid |
| event | text |
| properties | jsonb |
| session_id | uuid |
| device | text |
| browser | text |
| created_at | timestamptz |
| page_path | text |

Events observed: `page_view`, `login`, `tab_switched`. Properties include page title, unit_id, tab_name.

### Existing GroupActivity Component

- **Container:** `src/pages/student/StudentGroupActivity.jsx`
  - Route: `/student/group-activity` (requires talaqa package)
  - Tabs: Activity | Challenges | Leaderboard | Recognition
- **Feed:** `src/pages/student/StudentActivityFeed.jsx`
  - Queries `activity_feed` table
  - Has **real-time Supabase subscription** (INSERT events on `activity_feed`)
  - Shows activity items with type icons (submission, achievement, streak, level_up, team_rank, peer_recognition)
  - Displays group stats (submissions this month, active students)

### Recommendation

The `activity_feed` table already exists and is actively used. For the new dashboard "Live Level Activity Feed":
- **Option A:** Query `activity_feed` filtered by students at same `academic_level` (requires a JOIN with `students` table)
- **Option B:** Create a `SECURITY DEFINER` function that returns feed items for same-level peers
- **Recommended:** Option B — avoids RLS complexity and keeps the query efficient

---

## E. Display Names & Privacy

### Name Fields on `profiles`

| Column | Type |
|--------|------|
| full_name | text |
| display_name | text |
| username | text |
| avatar_url | text |
| avatar_customization | jsonb |

**Best field for peer display:** `display_name` (falls back to `full_name`, then `username`)

### Privacy Opt-Out

**EXISTS: NO** — No `show_in_leaderboard`, `privacy`, `hide_from_feed`, or similar column on `profiles`.

**Recommendation:** V2 backend prompt should add:
```sql
ALTER TABLE profiles ADD COLUMN show_in_leaderboard BOOLEAN DEFAULT TRUE;
```

---

## F. RLS Audit

### `profiles` Policies

| Policy | Command | Qualifier |
|--------|---------|-----------|
| SELECT | ALL | `true` (open read to all authenticated) |
| UPDATE | ALL | own row OR admin |
| DELETE | ALL | admin only |

**Concern:** SELECT is fully open — peer feed can read any profile's `display_name`, `avatar_url`. This is fine for the feed widget.

### `student_saved_words` Policies

| Policy | Command | Qualifier |
|--------|---------|-----------|
| SELECT/INSERT/UPDATE/DELETE | ALL | `student_id = auth.uid()` OR admin |

**No concern:** Students can only see their own saved words. Perfect for dictionary widget.

### `xp_transactions` Policies

| Policy | Command | Qualifier |
|--------|---------|-----------|
| SELECT | ALL | own student OR trainer's group students OR admin |
| INSERT | ALL | open |
| UPDATE/DELETE | ALL | admin only |

**Concern for peer feed:** A student can only SELECT their own XP transactions, not peers'. If we want to show "Top 3 most active today" from XP, we need a `SECURITY DEFINER` function.

### `vocabulary_word_mastery` / `student_vocabulary`

No RLS policies found. Tables may lack RLS entirely or have it disabled.

### Recommendations

Create these `SECURITY DEFINER` functions to safely expose peer data:
1. `get_level_activity_feed(p_student_id UUID)` — returns recent activity_feed items for students at same academic_level
2. `get_level_leaderboard_today(p_student_id UUID)` — returns top 3 students by XP today at same academic_level
3. `get_level_leaderboard_week(p_student_id UUID)` — returns top students by XP this week at same academic_level

---

## G. Libraries & Patterns

| Library | Version | Status |
|---------|---------|--------|
| framer-motion | ^11.12.0 | ✅ Installed |
| recharts | ^2.13.3 | ✅ Installed |
| chart.js | — | ❌ Not installed |
| d3 | — | ❌ Not installed |
| @tanstack/react-query | ^5.62.0 | ✅ Installed |

### Realtime Usage

- `src/pages/student/StudentActivityFeed.jsx` — Supabase `.channel()` with `postgres_changes` INSERT subscription on `activity_feed` table. Properly cleans up with `supabase.removeChannel()`.

### Reusable UI Components

| Component | Path | Status |
|-----------|------|--------|
| AnimatedNumber | `src/components/ui/AnimatedNumber` | ✅ Imported in dashboard |
| glass-card | `src/index.css` (lines 158-193) | ✅ Used in 40+ files |
| gradient-header | `src/styles/animations.css` (line 286) | ✅ Defined & used |

### useQuery Pattern

Uses `isLoading` (not `isPending`) for query loading states. `isPending` is used for mutations only. Follow this convention.

### Charts Recommendation

**recharts v2.13.3** is installed and available. Use it for Daily/Weekly progress bars if bar charts are needed. For simple progress bars, pure CSS/Tailwind + framer-motion is lighter and more consistent with the existing dashboard style.

---

## H. GAPS & PROPOSED V2 SCHEMA CHANGES

### 1. Source Attribution on `student_saved_words` — ✅ EXISTS

The `source` column already exists with `source_reference` for linking back. **No schema change needed.**

### 2. Today's Activity Aggregation — ✅ DIRECT QUERY SUFFICIENT

`xp_transactions` filtered by `created_at::date = CURRENT_DATE` works. Low row volume per student. No materialized view needed.

For "units touched today," query `student_curriculum_progress WHERE updated_at::date = CURRENT_DATE`.

### 3. Peer Feed — ✅ `activity_feed` TABLE EXISTS

Already used by `StudentActivityFeed.jsx` with real-time subscriptions. For same-level filtering:

```sql
-- PROPOSED: SECURITY DEFINER function
CREATE OR REPLACE FUNCTION get_level_activity_feed(p_student_id UUID, p_limit INT DEFAULT 20)
RETURNS SETOF activity_feed
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT af.*
  FROM activity_feed af
  JOIN students s1 ON s1.id = p_student_id
  JOIN students s2 ON s2.id = af.student_id AND s2.academic_level = s1.academic_level
  WHERE af.created_at > NOW() - INTERVAL '7 days'
  ORDER BY af.created_at DESC
  LIMIT p_limit;
$$;
```

### 4. Realtime for Level Feed — ✅ PATTERN EXISTS

Copy the pattern from `StudentActivityFeed.jsx` — subscribe to INSERT on `activity_feed`, filter client-side by level.

### 5. CEFR Level Peer Scope — ✅ CLEAN

`students.academic_level` (integer, values 1-3 currently). JOIN `students` to get peers at same level.

### 6. Privacy Opt-Out — ⚠️ MISSING

```sql
-- PROPOSED
ALTER TABLE profiles ADD COLUMN show_in_leaderboard BOOLEAN NOT NULL DEFAULT TRUE;
```

### 7. "Mastered" Definition — ✅ DEFINED

From `vocabulary_word_mastery` table:
- `mastery_level` is a 3-tier enum: `new` → `learning` → `mastered`
- A word is **mastered** when `mastery_level = 'mastered'`
- Progression is based on correct answers across 3 exercise types (meaning, sentence, listening)

### 8. Top 3 Leaderboard Today — ⚠️ NEEDS SECURITY DEFINER

```sql
-- PROPOSED
CREATE OR REPLACE FUNCTION get_level_top_today(p_student_id UUID)
RETURNS TABLE(student_id UUID, display_name TEXT, avatar_url TEXT, xp_today BIGINT)
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT
    xt.student_id,
    COALESCE(p.display_name, p.full_name, 'طالب') AS display_name,
    p.avatar_url,
    SUM(xt.amount)::BIGINT AS xp_today
  FROM xp_transactions xt
  JOIN students s1 ON s1.id = p_student_id
  JOIN students s2 ON s2.id = xt.student_id AND s2.academic_level = s1.academic_level
  JOIN profiles p ON p.id = xt.student_id
  WHERE xt.created_at::date = CURRENT_DATE
    AND (p.show_in_leaderboard IS NULL OR p.show_in_leaderboard = TRUE)
  GROUP BY xt.student_id, p.display_name, p.full_name, p.avatar_url
  ORDER BY xp_today DESC
  LIMIT 3;
$$;
```

### Summary of Schema Changes for V2 Backend Prompt

| # | Change | Type | Table |
|---|--------|------|-------|
| 1 | `ALTER TABLE profiles ADD COLUMN show_in_leaderboard BOOLEAN NOT NULL DEFAULT TRUE` | ALTER | profiles |
| 2 | `CREATE FUNCTION get_level_activity_feed(...)` | CREATE | — |
| 3 | `CREATE FUNCTION get_level_top_today(...)` | CREATE | — |
| 4 | `CREATE FUNCTION get_level_top_week(...)` | CREATE | — |

---

## I. Mastery Definition (proposed)

A vocabulary word is **"mastered"** when:
- `vocabulary_word_mastery.mastery_level = 'mastered'`
- This is determined by the app's existing logic based on `meaning_correct`, `sentence_correct`, and `listening_correct` attempt counts across 3 exercise types

For the dictionary widget stats:
- **"Added this week"**: `student_saved_words WHERE created_at >= date_trunc('week', CURRENT_DATE)`
- **"Mastered"**: `vocabulary_word_mastery WHERE mastery_level = 'mastered' AND student_id = ?`
- **"Reviewing"**: `vocabulary_word_mastery WHERE mastery_level = 'learning' AND student_id = ?`
- **"Last 6 words"**: `student_saved_words ORDER BY created_at DESC LIMIT 6`
