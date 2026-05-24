#!/usr/bin/env bash
# FINISH-100 Block 7 — verification suite
# Usage: source /tmp/retention-env.sh && bash scripts/retention/verify-100.sh
set -e
test -n "$SUPABASE_ACCESS_TOKEN" || { echo "SUPABASE_ACCESS_TOKEN required"; exit 1; }
PROD_REF=nmjexpuycmqcxuxljier

run_sql() {
  curl -s -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "Content-Type: application/json" \
    -X POST "https://api.supabase.com/v1/projects/$PROD_REF/database/query" \
    -d "$(jq -nc --arg q "$1" '{query: $q}')"
}

echo "===== FINISH-100 §7 VERIFICATION SUITE ====="
echo ""

echo "=== §7.1 Content volume ==="
run_sql "SELECT 'personas' AS t, count(*)::int FROM retention_personas
UNION ALL SELECT 'weekly_challenges', count(*)::int FROM retention_weekly_challenges
UNION ALL SELECT 'exercises', count(*)::int FROM retention_exercises
UNION ALL SELECT 'lesson_briefs', count(*)::int FROM retention_lesson_briefs
UNION ALL SELECT 'lesson_brief_audio', count(*)::int FROM retention_lesson_briefs WHERE audio_path IS NOT NULL
UNION ALL SELECT 'scenarios', count(*)::int FROM retention_scenarios
UNION ALL SELECT 'turns', count(*)::int FROM retention_dialogue_turns
UNION ALL SELECT 'turns_audio', count(*)::int FROM retention_dialogue_turns WHERE ai_audio_path IS NOT NULL
UNION ALL SELECT 'feedback_templates', count(*)::int FROM retention_feedback_templates
UNION ALL SELECT 'report_templates', count(*)::int FROM retention_report_templates
ORDER BY t" | jq -r '.[] | "  \(.t): \(.count)"'

echo ""
echo "=== §7.2 Schema integrity ==="
echo "  retention_* tables:"
run_sql "SELECT count(*)::int FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'retention_%'" | jq -r '.[0].count' | xargs -I {} echo "    {}"
echo "  retention RPCs SECURITY DEFINER:"
run_sql "SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid WHERE n.nspname='public' AND p.proname LIKE 'retention_%' AND p.prosecdef=true" | jq -r '.[0].count' | xargs -I {} echo "    {}"

echo ""
echo "=== §7.3 Cron + gating safety ==="
echo "  retention cron jobs (total):"
run_sql "SELECT count(*)::int FROM cron.job WHERE jobname LIKE 'retention-%'" | jq -r '.[0].count' | xargs -I {} echo "    {}"
echo "  retention cron jobs ACTIVE (should be 0):"
run_sql "SELECT count(*)::int FROM cron.job WHERE jobname LIKE 'retention-%' AND active=true" | jq -r '.[0].count' | xargs -I {} echo "    {}"
echo "  retention_modules.enabled=true (should be 0):"
run_sql "SELECT count(*)::int FROM retention_modules WHERE enabled=true" | jq -r '.[0].count' | xargs -I {} echo "    {}"

echo ""
echo "=== §7.4 Sacred tables protection ==="
echo "  curriculum_* mutations in migrations on this branch (should be 0):"
cd /Users/dr.ali/projects/fluentia-lms
git diff main..HEAD -- supabase/migrations/ 2>/dev/null | grep -i 'curriculum_' | grep -v 'REFERENCES' | wc -l | xargs -I {} echo "    {}"

echo ""
echo "=== §7.5 Browser TTS removal (retention namespace) ==="
echo "  browser TTS refs in retention src paths (should be 0):"
grep -ri 'speechsynthesis\|webspeech\|SpeechSynthesisUtterance' \
  src/pages/student/retention/ src/components/retention/ \
  src/design-system/retention/ src/lib/retention/ \
  supabase/functions/retention-*/ 2>/dev/null | wc -l | xargs -I {} echo "    {}"

echo ""
echo "=== §7.6 Runtime AI audit (retention diffs vs main) ==="
echo "  new api.anthropic.com lines in retention paths (should be 0):"
git diff main..HEAD -- 'supabase/functions/retention-*' 'src/pages/student/retention/' 'src/components/retention/' 'src/lib/retention/' 2>/dev/null | grep '^+' | grep -E 'api\.(anthropic|openai)\.com' | wc -l | xargs -I {} echo "    {}"

echo ""
echo "===== END §7 ====="
