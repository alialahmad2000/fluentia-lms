#!/usr/bin/env bash
# FINISH-OVERNIGHT Block 6 — verification suite against PROD.
# Returns exit 0 on all-green, exit 1 on any §3 check failure.

set -u
MGMT_TOKEN="${SUPABASE_ACCESS_TOKEN:-}"
PROD_REF="nmjexpuycmqcxuxljier"
[ -z "$MGMT_TOKEN" ] && { echo "MGMT_TOKEN missing"; exit 1; }

q() {
  local payload
  payload=$(python3 -c "import json,sys; print(json.dumps({'query': sys.argv[1]}))" "$1")
  curl -sS --connect-timeout 15 --max-time 45 --retry 3 --retry-delay 2 -X POST \
    "https://api.supabase.com/v1/projects/${PROD_REF}/database/query" \
    -H "Authorization: Bearer ${MGMT_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$payload"
}

PASS=0
FAIL=0
check() {
  local name="$1" expected="$2" got="$3"
  if [ "$got" = "$expected" ]; then
    echo "  ✓ ${name}: ${got}"; PASS=$((PASS+1))
  else
    echo "  ✗ ${name}: got=${got} expected=${expected}"; FAIL=$((FAIL+1))
  fi
}

echo "===== §3 VERIFICATION SUITE — PROD ====="
echo ""

echo "=== §3.1 Schema integrity ==="
TABLES=$(q "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'retention_%'" | python3 -c "import json,sys; print(json.load(sys.stdin)[0]['count'])")
check "retention_* tables" "17" "$TABLES"
SECDEF=$(q "SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prosecdef=true AND proname LIKE 'retention_%'" | python3 -c "import json,sys; print(json.load(sys.stdin)[0]['count'])")
check "retention RPCs SECURITY DEFINER" "6" "$SECDEF"

echo ""
echo "=== §3.5 Cron + gating ==="
CRON_TOTAL=$(q "SELECT count(*) FROM cron.job WHERE jobname LIKE 'retention-%'" | python3 -c "import json,sys; print(json.load(sys.stdin)[0]['count'])")
check "retention cron jobs (total)" "4" "$CRON_TOTAL"
CRON_ACTIVE=$(q "SELECT count(*) FROM cron.job WHERE jobname LIKE 'retention-%' AND active=true" | python3 -c "import json,sys; print(json.load(sys.stdin)[0]['count'])")
check "retention cron jobs (active)" "0" "$CRON_ACTIVE"
MODULES_ON=$(q "SELECT count(*) FROM retention_modules WHERE enabled=true" | python3 -c "import json,sys; print(json.load(sys.stdin)[0]['count'])")
check "retention_modules.enabled=true" "0" "$MODULES_ON"

echo ""
echo "=== §3.3 Browser TTS removal (retention namespace) ==="
TTS_HITS=$(grep -rE "speechSynthesis|SpeechSynthesisUtterance" \
  src/pages/student/retention/ \
  src/components/retention/ \
  src/design-system/retention/ \
  src/lib/retention/ \
  supabase/functions/retention-* 2>/dev/null | wc -l | tr -d ' ')
check "browser TTS refs in retention paths" "0" "$TTS_HITS"

echo ""
echo "=== §3.2 Runtime AI audit (retention diffs vs main pre-build) ==="
AI_HITS=$(git diff f26cd22..HEAD -- src/ supabase/functions/ 2>/dev/null | grep -E "api\\.anthropic\\.com|api\\.openai\\.com" | wc -l | tr -d ' ')
check "new runtime LLM call lines" "0" "$AI_HITS"

echo ""
echo "=== Content counts (informational) ==="
COUNTS=$(q "SELECT
  (SELECT count(*) FROM retention_personas) AS personas,
  (SELECT count(*) FROM retention_scenarios) AS scenarios,
  (SELECT count(*) FROM retention_dialogue_turns) AS turns,
  (SELECT count(*) FROM retention_dialogue_turns WHERE ai_audio_path IS NOT NULL) AS turns_audio,
  (SELECT count(*) FROM retention_feedback_templates) AS feedback,
  (SELECT count(*) FROM retention_exercises) AS exercises,
  (SELECT count(*) FROM retention_lesson_briefs) AS briefs,
  (SELECT count(*) FROM retention_lesson_briefs WHERE audio_path IS NOT NULL) AS briefs_audio,
  (SELECT count(*) FROM retention_weekly_challenges) AS challenges,
  (SELECT count(*) FROM retention_report_templates) AS report_templates")
echo "$COUNTS" | python3 -c "import json,sys; d=json.load(sys.stdin)[0]; [print(f'  {k}: {v}') for k,v in d.items()]"

echo ""
echo "===== RESULT: ${PASS} pass / ${FAIL} fail ====="
exit $FAIL
