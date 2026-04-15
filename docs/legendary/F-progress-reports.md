# LEGENDARY-F: Progress Reports

## Architecture

```
Student Data → build_progress_report_data() RPC (aggregator)
     ↓
generate-progress-report Edge Function
     ↓
Claude API (narrative + goals)
     ↓
progress_reports table (status: draft → trainer_review → approved → published)
     ↓
Trainer reviews + edits → publishes
     ↓
Student sees rich web view + share link (/r/:token)
```

## Data Sources

The aggregator RPC (`build_progress_report_data`) pulls from:
- `students` + `profiles` — name, level, package, group
- `unified_activity_log` — XP, skill gains, vocab reviews, unit completions
- `student_skill_state` — current skill radar (0-100)
- `student_saved_words` — vocabulary new/mastered/queue
- `student_xp_audit` — confidence band
- `attendance` + `classes` — class attendance rate

## Trainer Workflow

1. Trainer goes to `/trainer/reports` → "جميع الطلاب" tab
2. Selects group → student → period → "إنشاء التقرير"
3. Edge function generates data snapshot + AI narrative + 3 goals
4. Report appears in "يحتاج مراجعتك" tab
5. Trainer clicks "افتح للمراجعة" → review page
6. Trainer can edit narrative, add personal note (required), edit goals
7. "أوافق وأنشر" → publishes, generates share token

## Student Workflow

1. Student goes to `/student/progress-reports`
2. Sees list of published reports
3. Clicks to view full report (narrative, stats, goals, trainer note)
4. Can copy share link

## Share Flow

- Published reports get a `share_token` (12-char alphanumeric)
- Public URL: `/r/:token`
- No auth required — calls `get_shared_report(token)` RPC
- Only shows published reports

## Confidence Band

- `high`: no footnote shown
- `medium`: "بعض النقاط قبل ١٥ أبريل ٢٠٢٦ قد تكون نتيجة خطأ تقني سابق..."
- `low`: "جزء كبير من النقاط التاريخية متأثر بخطأ تقني سابق..."

Never shows raw `suspect_xp` to students.

## Edge Function Env Vars

- `CLAUDE_API_KEY` or `ANTHROPIC_API_KEY`
- `SUPABASE_URL` (auto)
- `SUPABASE_SERVICE_ROLE_KEY` (auto)

## Report Frequency

Based on student package:
- أساس (asas): monthly
- طلاقة (talaqa): biweekly
- تميّز (tamayuz): weekly
- IELTS: weekly

## Reversibility

```sql
DROP FUNCTION IF EXISTS build_progress_report_data;
DROP FUNCTION IF EXISTS get_shared_report;
-- Columns added by this migration can be dropped individually
-- Table itself from migration 029 remains
```
