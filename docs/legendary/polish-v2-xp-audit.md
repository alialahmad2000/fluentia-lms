# LEGENDARY-POLISH-V2 — XP Inflation Forensic Audit

## ملخص تنفيذي

تم إجراء تدقيق شامل لنقاط الخبرة (XP) بعد اكتشاف خلل تقني في مكوّن المفردات كان يُسجّل المراجعة تلقائياً عند تحميل الصفحة. النتيجة: **لا يوجد أي تضخم في نقاط الخبرة**. جميع الأحداث الـ 19 المسجّلة في النظام مؤكّدة وشرعية. الخلل كان موجوداً في الكود لكنه لم يُنتج أي أحداث وهمية بفضل آلية الحماية (`hasSavedComplete`) التي منعت التسجيل المكرر.

---

## Bug Window

| Field | Value |
|-------|-------|
| Bug introduced | `35247e5` — 2026-04-03 09:58:29 +0300 |
| Bug fixed | `640fb7d` — 2026-04-15 05:37:29 +0300 |
| Window length | ~12 days |
| Commit message (introduced) | `feat: save writing and vocabulary tab progress to DB` |
| Commit message (fixed) | `fix(vocabulary): add pagination + fix phantom markReviewed auto-fire` |

**What the bug did:** In `VocabularyTab.jsx`, a `useEffect` in `WordCard` and `WordListItem` called `onView()` (→ `markReviewed`) on component mount. This immediately marked ALL rendered vocabulary words as "reviewed" without actual user interaction. If `reviewed.size >= totalWords`, it triggered `awardCurriculumXP` which logged a `unit_tab_completed` / `vocabulary` event with XP.

**Why it didn't produce phantom XP:** The `hasSavedComplete.current` ref prevented re-awarding within a session. More importantly, during the 12-day window, **no student triggered a vocabulary completion event** — the `vocabulary` subtype never appeared in `unified_activity_log`.

---

## Classification Methodology

### Three Buckets

| Bucket | Definition | Heuristic |
|--------|-----------|-----------|
| `verified` | Unambiguously legitimate | Event type ≠ suspect signature, OR no burst/duplicate pattern |
| `suspect_phantom` | Most likely from the bug | Matches suspect signature + in burst (≥3 events within 60s) or duplicate sibling within 10s |
| `uncertain` | Ambiguous — could be either | Matches suspect signature in window but no burst/duplicate evidence |

### Suspect Signature

| Field | Value |
|-------|-------|
| `event_type` | `unit_tab_completed` |
| `event_subtype` | `vocabulary` |
| `xp_delta` | > 0 |
| Within bug window | 2026-04-03 to 2026-04-15 |

### Burst Detection

Sliding-window analysis: events by the same student with <60s gap grouped into bursts. Bursts of ≥3 events flagged as `suspect_phantom`.

### Duplicate Sibling Detection

Any two events with same `student_id` + `ref_id` + `event_type` + `event_subtype` within 10 seconds flagged as `suspect_phantom`.

### Limitations

- Heuristic-based: cannot prove with 100% certainty that an event was/wasn't phantom
- Only flags events matching the specific `markReviewed` code path — other potential bugs are out of scope
- The "uncertain" bucket exists to be honest about ambiguity rather than force a classification

---

## Results Summary

### Headline Numbers

| Metric | Value |
|--------|-------|
| Students audited | 6 |
| Total events in DB | 19 |
| Total XP | 290 |
| Verified XP | 290 (100%) |
| Suspect XP | 0 (0%) |
| Uncertain XP | 0 (0%) |
| Avg max inflation per student | 0.0% |

### Students by Confidence Band

| Band | Count |
|------|-------|
| High (≤10% potential inflation) | 6 |
| Medium (10-30%) | 0 |
| Low (>30%) | 0 |

### Per-Student Detail

| Student | Total XP | Verified XP | Suspect XP | Uncertain XP | Max Inflation % | Confidence |
|---------|----------|-------------|------------|--------------|-----------------|------------|
| عبدالرحمن الشمري | 75 | 75 | 0 | 0 | 0.0% | high |
| منار العتيبي | 60 | 60 | 0 | 0 | 0.0% | high |
| نورة اليامي | 50 | 50 | 0 | 0 | 0.0% | high |
| نادية القحطاني | 35 | 35 | 0 | 0 | 0.0% | high |
| سارة منصور | 35 | 35 | 0 | 0 | 0.0% | high |
| فاطمة محمد آل شريف | 35 | 35 | 0 | 0 | 0.0% | high |

### Flag Distribution

| Flag | Reason | Events | XP |
|------|--------|--------|----|
| verified | non_suspect_event_type | 19 | 290 |

---

## What We Did NOT Do

- ❌ Did not modify any `xp_delta` in `unified_activity_log`
- ❌ Did not recalculate streaks
- ❌ Did not restate any leaderboard history
- ❌ Did not notify students
- ❌ Did not delete any event
- ❌ Did not modify `student_saved_words`
- ❌ Did not modify `student_skill_state`

---

## What F Will Do With This

LEGENDARY-F reports will:
1. JOIN `student_xp_audit` view to display confidence footnotes next to XP numbers
2. Use `confidence_band` to select appropriate Arabic/English tooltip copy (see `xp-audit-copy.md`)
3. Use `verified_xp` as the "reliable" XP figure when computing rankings
4. Display a date delineation: "XP from April 15, 2026 onward is fully verified"

Since all current students have `high` confidence, F will simply display XP as-is with no caveats. The infrastructure exists for future use if new phantom patterns are discovered.

---

## Reversibility

To completely reverse this audit layer:

```sql
DROP VIEW IF EXISTS public.student_xp_audit;
DROP TABLE IF EXISTS public.xp_event_flags;
```

This removes 100% of the audit infrastructure. Zero impact on underlying data.

---

## Artifacts

| Artifact | Path |
|----------|------|
| Migration SQL | `supabase/migrations/131_polish_v2_xp_inflation_audit.sql` |
| Findings doc | `docs/legendary/polish-v2-xp-audit.md` |
| Copy strings | `docs/legendary/xp-audit-copy.md` |
| DB table | `public.xp_event_flags` |
| DB view | `public.student_xp_audit` |
