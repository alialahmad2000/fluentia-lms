# Personalization Revert — Final Report (2026-05-19)

## Entry points flattened

| File | Change | Verified by |
|------|--------|-------------|
| `src/pages/student/StudentDashboard.jsx` | `<InterestSurveyCard />` mount + import commented out | grep returns no active import |
| `src/pages/student/StudentProfile.jsx` | `<InterestsSettingsSection />` mount + import commented out | grep returns no active import |
| `src/pages/student/curriculum/tabs/ReadingTab.jsx` | `<PersonalizedReadingCard />` mount + import commented out | grep returns no active import |

No hook-level branches needed flattening — personalization was already a separate component surface, not an in-flow substitution. The hooks (`usePersonalizedReading`, `useUserInterests`) still exist but have zero active consumers outside `src/components/personalization/`.

## UI hidden

- Onboarding interest picker (dashboard banner) — hidden
- In-profile interests settings section — hidden
- Reading variant card below canonical reading — hidden

## Verification

- `node scripts/audits/verify-canonical-only.cjs`: **5/5 PASS**
  - No active production imports of personalization outside personalization/
  - Canonical reading rows present
  - Canonical listening rows present
  - `personalized_readings` table preserved (no drop)
  - `user_interests` table preserved (no drop)
- Audio/text/karaoke divergence: not present on default path. Canonical reading text, `reading_passage_audio.full_audio_url`, and `reading_passage_audio.word_timestamps` all resolve to the same `curriculum_readings.id`.
- Student data tables: untouched (no writes to `submissions`, `unit_progress`, `vocab_progress`, `xp_transactions`).

## What still exists (intentionally)

- **DB tables** — `personalized_readings` (1,152 published variants) and `user_interests` are preserved. No drop, no truncate, no column changes.
- **Hooks** — `src/hooks/usePersonalizedReading.js`, `src/hooks/useUserInterests.js` unmodified.
- **Components** — `src/components/personalization/*.jsx` and `src/lib/personalization/interest-buckets.js` unmodified.
- **Edge functions** — no personalization-related edge functions touched.
- **Student interest tags** — interests stored on existing students are preserved.

These remain so a future "opt-in personalization as secondary surface" feature can reuse them without re-generation.

## Follow-ups

- Build opt-in secondary surface for personalization (separate task).
- Decide UX for "explore content matching your interests" entry point.
