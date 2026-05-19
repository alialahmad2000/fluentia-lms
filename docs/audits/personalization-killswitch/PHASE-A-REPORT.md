# Phase A — Personalization Kill-Switch Forensic Audit

Date: 2026-05-19

## Test setup

- **Test student (has 3 interests):** `0c8112f5-2617-4bc7-8b99-771f395db58f` — `layan88700@gmail.com`
- **Control student (no interests, no survey):** `f8d2f203-975f-4b0f-a607-ad1a05694f42` — `sarashrahili22@gmail.com`
- **Test units:** 5 multi-article units (every multi-article unit in the corpus has exactly 2 readings):
  - `00ca3625-46ee-4e38-95da-2255f522aff8`
  - `0afc0986-f79d-426c-bb15-ee66dd77e5d9`
  - `170ce97d-b211-4b25-b19e-fe9fc22fb71b`
  - `1de8e161-81eb-416e-af87-c136d93f3930`
  - `2105dec8-575b-4a6a-8456-261b98a9d6c2`

Total student count with `has_completed_survey = true`: **10**. Total `personalized_readings` rows: **1152** (data preserved per prompt rules — NOT deleted).

## Impersonation comparison (`scripts/audits/personalization-killswitch/02-impersonate-and-compare.cjs`)

JWT sessions minted via `auth.admin.generateLink({type:'magiclink'})` → `verifyOtp({token_hash, type:'magiclink'})`. These are **real authenticated student sessions**, not service-role.

| Unit | Service rows | Test student rows | Control student rows | Test differs? | Control differs? |
|------|--------------|-------------------|----------------------|---------------|------------------|
| `00ca3625…` | 2 | 2 | 2 | NO | NO |
| `0afc0986…` | 2 | 2 | 2 | NO | NO |
| `170ce97d…` | 2 | 2 | 2 | NO | NO |
| `1de8e161…` | 2 | 2 | 2 | NO | NO |
| `2105dec8…` | 2 | 2 | 2 | NO | NO |

- **Test student rows differ from service-role:** 🟢 **NO** (0 field-level diffs across 10 article reads)
- **Control student rows differ from service-role:** 🟢 **NO** (0 field-level diffs)

**Verdict:** **Personalization is NOT active at the data layer for `curriculum_readings`.** No RLS policy, view, function, or RPC is performing interest-based row substitution.

## Sweep across related tables (`scripts/audits/personalization-killswitch/03-sweep-related-tables.cjs`)

Same authenticated-vs-service-role check, 20-row sample per table:

| Table | Service | Test | Control | Test == Service | Control == Service |
|-------|---------|------|---------|------------------|---------------------|
| `curriculum_readings` | 20 | 20 | 20 | YES | YES |
| `curriculum_listening` | 20 | 20 | 20 | YES | YES |
| `curriculum_vocabulary` | 20 | 20 | 20 | YES | YES |
| `reading_passage_audio` | 20 | 20 | 20 | YES | YES |
| `curriculum_grammar` | 20 | 20 | 20 | YES | YES |

🟢 **All 5 tables: zero divergence between authenticated student and service-role reads.**

## Mechanism found

**NONE at the data layer.** No RLS policy, view, function, or edge function performs interest-based content substitution. The previous personalization-revert audit (`ecbd0d1` on 2026-05-19, see `docs/audits/personalization-revert/PHASE-A-REPORT.md`) was correct.

## Layers checked (for completeness)

### 1) RLS policies
Cannot enumerate `pg_policies` via PostgREST without a helper RPC. **Substituted with the dispositive test above** — authenticated student reads return the same rows as service-role. If any RLS were doing row substitution, the rows would differ.

### 2) Views with personalization keywords
`information_schema.views` is not exposed via PostgREST. Dispositive test rules out any view-level substitution affecting `curriculum_readings`.

### 3) Functions/RPCs
Same — not directly queryable via PostgREST. Dispositive test rules out function-based substitution on the canonical tables.

### 4) Edge functions
Five edge functions match the keyword "personali" (`cron-streak-check`, `generate-targeted-exercises`, `generate-ai-student-profile`, `generate-task-briefing`, `smart-nudges`). On inspection, **none reference `personalized_readings` or `user_interests`**:
- "personalized nudge" / "personalized exercises" / "personalized tips" — these are AI-output adjective uses, not the personalization feature.

### 5) Client-side state hydration

```
src/hooks/useUserInterests.js          queryKey: ['user-interests', userId]
src/hooks/usePersonalizedReading.js    queryKey: ['personalized-reading', canonicalReadingId, interests.join(',')]
```

These two hooks **are not invoked anywhere** — the 3 mount points that called them were commented out by the 2026-05-19 revert commit `ecbd0d1`. Confirmed by grepping `src/`:

```
$ grep -rn "InterestSurveyCard\|InterestsSettingsSection\|PersonalizedReadingCard" src/ --include="*.jsx"
src/components/personalization/InterestsSettingsSection.jsx:6:  (DEFINITION)
src/components/personalization/PersonalizedReadingCard.jsx:5:    (DEFINITION + INTERNAL USE)
src/pages/student/curriculum/tabs/ReadingTab.jsx:10: // import PersonalizedReadingCard … (COMMENTED)
src/pages/student/curriculum/tabs/ReadingTab.jsx:931: {/* <PersonalizedReadingCard … */} (COMMENTED)
src/pages/student/StudentProfile.jsx:5: // import InterestsSettingsSection … (COMMENTED)
src/pages/student/StudentProfile.jsx:629: {/* <InterestsSettingsSection /> */} (COMMENTED)
src/pages/student/StudentDashboard.jsx:5: // import InterestSurveyCard … (COMMENTED)
src/pages/student/StudentDashboard.jsx:154: {/* <InterestSurveyCard /> */} (COMMENTED)
```

So `useUserInterests` and `usePersonalizedReading` cannot be invoked from the default flow. No `localStorage`/`sessionStorage` keys with `variant`/`personali`/`interest` exist outside the personalization components themselves.

### 6) URL/router params
No `useSearchParams` / `useParams` reference includes `variant` or `personali` in src/.

## Diagnosis

**Personalization is fully OFF in the default student flow.** The prior personalization-revert (`ecbd0d1`) and audio fix (`e4ef9f7`) together eliminated:
- Every UI mount point that invokes personalization hooks
- Every read-path component (PersonalizedReadingCard / Drawer)
- The audio-engine stale-source bug that was masquerading as a personalization symptom

No additional layer is doing interest-based substitution. The dispositive authenticated-JWT test confirms this with a real student session.

## Fix plan (Phase B — belt-and-suspenders per prompt strict rule)

Even with rows_differ = NO, the prompt requires the global kill-switch and client purge to ship. Plan:

1. **DB:** Create `app_config` table (key/value JSONB). Seed `('personalization_enabled', 'false'::jsonb)`. RLS: authenticated SELECT only. (Service-role can manage.)
2. **Helper:** `src/lib/featureFlags.js` exposing `isPersonalizationEnabled()` with module-level cache and fail-safe default `false`.
3. **Defensive guard in hooks:** Modify `usePersonalizedReading` and `useUserInterests` to short-circuit via `enabled: false` when the flag is off. Even though they aren't invoked, this protects against any future caller.
4. **Client-side state purge:** In `src/main.jsx`, before React renders, scan + remove any cached `fluentia:variant*`, `fluentia:personali*`, `fluentia:interest*`, `fluentia:selectedVariant*` keys from `localStorage` + `sessionStorage`. Run once per page load; idempotent.
5. **QueryClient purge:** Add `queryClient.removeQueries({ queryKey: ['personalized-reading'] })` and `['user-interests']` to app bootstrap so any cached stale entry from previous sessions is discarded.

NOT changing: edge functions (none reference personalization tables), variant data rows, audio files, personalization component files.
