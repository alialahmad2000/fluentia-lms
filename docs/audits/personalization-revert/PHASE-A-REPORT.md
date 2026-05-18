# Phase A — Personalization Read Path Inventory
Generated: 2026-05-19
Auditor: PERSONALIZATION-REVERT-CANONICAL-DEFAULT-2026-05-18

---

## Tables involved

| Table | Role | Status |
|-------|------|--------|
| `curriculum_readings` | canonical reading rows | KEEP-AS-PRIMARY ✓ |
| `personalized_readings` | one row per canonical × bucket, 1,152 published | KEEP-IN-DB, STOP-READING |
| `user_interests` | per-student interest tags + survey state | KEEP-IN-DB, STOP-READING |
| `adaptive_question_bank` | IELTS adaptive (different feature) | OUT-OF-SCOPE |
| `ielts_adaptive_plans` | IELTS adaptive (different feature) | OUT-OF-SCOPE |
| `unit_mastery_variants` | assessment variants (not interest-based) | OUT-OF-SCOPE |

No DB schema changes will be made. All variant tables stay intact.

---

## Read paths consulting personalization

| Hook | Reads | Consumers |
|------|-------|-----------|
| `src/hooks/usePersonalizedReading.js` | `personalized_readings` (only when interests exist) | `PersonalizedReadingCard.jsx` only |
| `src/hooks/useUserInterests.js` | `user_interests` | `InterestSurveyCard`, `InterestsSettingsSection`, `usePersonalizedReading` |

**No other consumers exist.** No edge function touches these tables. No hook outside `src/hooks/usePersonalizedReading.js` and `src/hooks/useUserInterests.js` queries these tables. Confirmed via `grep -rn "personalized_readings\|user_interests"` in `src/` and `supabase/functions/`.

---

## UI mount points to hide (3 total)

| File:line | Component mounted | Effect |
|-----------|-------------------|--------|
| `src/pages/student/StudentDashboard.jsx:152` | `<InterestSurveyCard />` | Asks dashboard visitor to pick interests |
| `src/pages/student/StudentProfile.jsx:625` | `<InterestsSettingsSection />` | Lets student edit interests in profile settings |
| `src/pages/student/curriculum/tabs/ReadingTab.jsx:923` | `<PersonalizedReadingCard canonicalReadingId={reading.id} />` | Shows secondary "personalized variant" card below canonical reading; opens drawer with variant text |

---

## Text/audio/karaoke divergence sample

In this codebase, the personalized variant is **already a separate drawer** (not a replacement). Canonical text + canonical audio + canonical karaoke all resolve to the same `curriculum_readings.id` via:

- Text: `ReadingTab.jsx` line 80 → `.from('curriculum_readings')`
- Audio: `useReadingPassageAudio(reading.id)` → `reading_passage_audio` keyed by `passage_id = reading.id`
- Karaoke: same `reading_passage_audio` row → `word_timestamps` column

The only way a student could observe a text/audio mismatch is if they open the `PersonalizedReadingDrawer` and read its `variant.body` while the main page's canonical audio is still playing — but that's a separate surface, not a substitution.

**Verdict:** There is no in-flow text/audio mismatch on the default path. Hiding the 3 mount points fully implements the product decision (canonical-only default) without any read-path flattening at the hook level.

---

## Diagnosis

Personalization branches exist at exactly 3 entry points (component mounts). All three are simple component renders — no conditional logic in shared hooks, no in-flow text substitution. Hiding the mounts eliminates all personalization consultation from the default student flow.

After Phase B+C, the personalization hooks (`usePersonalizedReading`, `useUserInterests`) will remain in the codebase but will not be invoked anywhere — their `enabled` flags will keep their queries inactive (no rendered consumer = no `useQuery` registered = no DB call).

---

## What stays in the codebase

- `src/hooks/usePersonalizedReading.js` — untouched, just no consumers
- `src/hooks/useUserInterests.js` — untouched, just no consumers
- `src/components/personalization/*` — all 4 component files untouched
- `src/lib/personalization/interest-buckets.js` — untouched
- DB tables `user_interests`, `personalized_readings` — untouched, 1,152 published variants preserved for future opt-in surface
