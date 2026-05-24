#!/usr/bin/env bash
# FINISH-OVERNIGHT Block 5 — bash+curl audio generator (more reliable than Node).
# Idempotent: skips files where Storage object already exists.
# Per §0.1: 3 attempts per file (curl handles connection retries internally),
# then skip+log+continue.

set -uo pipefail
MGMT_TOKEN="${SUPABASE_ACCESS_TOKEN:-}"
ELEVENLABS_KEY="${ELEVENLABS_API_KEY:-}"
PROD_SR="${PROD_SR:-}"
BRANCH_SR="${BRANCH_SR:-}"
DRY="${DRY:-0}"
TARGET="${TARGET:-prod}"  # 'prod' or 'branch'

[ -z "$MGMT_TOKEN" ] && { echo "MGMT_TOKEN missing"; exit 1; }
[ -z "$ELEVENLABS_KEY" ] && { echo "ELEVENLABS_KEY missing"; exit 1; }

if [ "$TARGET" = "prod" ]; then
  REF="nmjexpuycmqcxuxljier"; HOST="nmjexpuycmqcxuxljier.supabase.co"; SR="$PROD_SR"
elif [ "$TARGET" = "branch" ]; then
  REF="dxpkissdfuioibefozvc"; HOST="dxpkissdfuioibefozvc.supabase.co"; SR="$BRANCH_SR"
else
  echo "TARGET must be prod or branch"; exit 1
fi
[ -z "$SR" ] && { echo "SR key missing for $TARGET"; exit 1; }

NARRATOR_VOICE="EXAVITQu4vr4xnSDxMaL"
SKIPPED_FILE="docs/retention/skipped-audio-${TARGET}.log"
mkdir -p docs/retention
echo "# Audio generation skip log — $TARGET — started $(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$SKIPPED_FILE"

mgmt_query() {
  local sql="$1"
  local payload
  payload=$(python3 -c "import json,sys; print(json.dumps({'query': sys.argv[1]}))" "$sql")
  curl -sS --connect-timeout 10 --max-time 30 --retry 3 --retry-delay 2 --retry-connrefused -X POST \
    "https://api.supabase.com/v1/projects/${REF}/database/query" \
    -H "Authorization: Bearer ${MGMT_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$payload"
}

# Generate audio + upload + update DB for one row.
# args: kind ('brief' or 'turn'), id, text, voice_id, [scenario_id]
gen_one() {
  local kind="$1" id="$2" text="$3" voice="$4" scenario="${5:-}"
  local key
  if [ "$kind" = "brief" ]; then
    key="briefs/${id}.mp3"
  else
    key="dialogues/${scenario}/${id}.mp3"
  fi
  local mp3_path="/tmp/retention-audio-${kind}-${id}.mp3"

  # Skip if already in Storage (idempotent on retry)
  local exists_code
  exists_code=$(curl -sS --connect-timeout 5 --max-time 15 -o /dev/null -w "%{http_code}" \
    "https://${HOST}/storage/v1/object/info/public/retention-audio/${key}" \
    -H "Authorization: Bearer ${SR}" -H "apikey: ${SR}")
  if [ "$exists_code" = "200" ]; then
    # Just update DB
    if [ "$kind" = "brief" ]; then
      mgmt_query "UPDATE retention_lesson_briefs SET audio_path = 'https://${HOST}/storage/v1/object/public/retention-audio/${key}' WHERE id = '${id}'" >/dev/null
    else
      mgmt_query "UPDATE retention_dialogue_turns SET ai_audio_path = 'https://${HOST}/storage/v1/object/public/retention-audio/${key}' WHERE id = '${id}'" >/dev/null
    fi
    return 0
  fi

  # ElevenLabs gen — 3 attempts (curl itself retries TLS)
  local body
  body=$(python3 -c "import json,sys; print(json.dumps({'text': sys.argv[1], 'model_id': 'eleven_turbo_v2_5', 'voice_settings': {'stability': 0.55, 'similarity_boost': 0.75}}))" "$text")
  local elevenlabs_code=0
  for attempt in 1 2 3; do
    elevenlabs_code=$(curl -sS --connect-timeout 12 --max-time 45 \
      --retry 2 --retry-delay 3 --retry-connrefused \
      -X POST "https://api.elevenlabs.io/v1/text-to-speech/${voice}" \
      -H "xi-api-key: ${ELEVENLABS_KEY}" \
      -H "Content-Type: application/json" \
      -H "Accept: audio/mpeg" \
      -d "$body" \
      -o "$mp3_path" -w "%{http_code}" 2>/dev/null || echo "000")
    if [ "$elevenlabs_code" = "200" ] && [ -s "$mp3_path" ]; then break; fi
    sleep 2
  done
  if [ "$elevenlabs_code" != "200" ] || [ ! -s "$mp3_path" ]; then
    echo "  SKIP ${kind} ${id}: elevenlabs HTTP ${elevenlabs_code}" | tee -a "$SKIPPED_FILE"
    rm -f "$mp3_path"
    return 1
  fi

  # Upload to Storage
  local upload_code
  upload_code=$(curl -sS --connect-timeout 10 --max-time 30 \
    -X POST "https://${HOST}/storage/v1/object/retention-audio/${key}" \
    -H "Authorization: Bearer ${SR}" -H "apikey: ${SR}" \
    -H "Content-Type: audio/mpeg" -H "x-upsert: true" \
    --data-binary "@${mp3_path}" -o /dev/null -w "%{http_code}" 2>/dev/null || echo "000")
  rm -f "$mp3_path"
  if [ "$upload_code" != "200" ] && [ "$upload_code" != "201" ] && [ "$upload_code" != "409" ]; then
    echo "  SKIP ${kind} ${id}: upload HTTP ${upload_code}" | tee -a "$SKIPPED_FILE"
    return 1
  fi

  # Update DB
  local url="https://${HOST}/storage/v1/object/public/retention-audio/${key}"
  if [ "$kind" = "brief" ]; then
    mgmt_query "UPDATE retention_lesson_briefs SET audio_path = '${url}' WHERE id = '${id}'" >/dev/null
  else
    mgmt_query "UPDATE retention_dialogue_turns SET ai_audio_path = '${url}' WHERE id = '${id}'" >/dev/null
  fi
  return 0
}

echo "===== TARGET: ${TARGET} (${REF}) ====="

# ─── BRIEFS ─────────────────────────────────────────────────────────────────
echo ""
echo "=== Phase A: briefs ==="
BRIEFS_JSON=$(mgmt_query "SELECT id, body_ar FROM retention_lesson_briefs WHERE audio_path IS NULL ORDER BY id LIMIT 200")
BRIEF_COUNT=$(echo "$BRIEFS_JSON" | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)")
echo "  ${BRIEF_COUNT} briefs to generate"

BRIEFS_OK=0
BRIEFS_SKIP=0
for i in $(seq 0 $((BRIEF_COUNT-1))); do
  ID=$(echo "$BRIEFS_JSON" | python3 -c "import json,sys; print(json.load(sys.stdin)[${i}]['id'])")
  TEXT=$(echo "$BRIEFS_JSON" | python3 -c "import json,sys; print(json.load(sys.stdin)[${i}]['body_ar'])")
  if gen_one brief "$ID" "$TEXT" "$NARRATOR_VOICE"; then
    BRIEFS_OK=$((BRIEFS_OK+1))
  else
    BRIEFS_SKIP=$((BRIEFS_SKIP+1))
  fi
  if [ $((($i+1) % 5)) -eq 0 ]; then
    echo "  briefs: ${BRIEFS_OK} ok / ${BRIEFS_SKIP} skipped ($(($i+1))/${BRIEF_COUNT})"
  fi
done
echo ""
echo "  Phase A complete: ${BRIEFS_OK} ok / ${BRIEFS_SKIP} skipped"

# ─── DIALOGUE TURNS ─────────────────────────────────────────────────────────
echo ""
echo "=== Phase B: dialogue turns ==="
TURNS_JSON=$(mgmt_query "SELECT t.id, t.scenario_id, t.ai_text_en, p.voice_id FROM retention_dialogue_turns t JOIN retention_scenarios s ON s.id = t.scenario_id JOIN retention_personas p ON p.id = s.persona_id WHERE t.ai_audio_path IS NULL ORDER BY s.target_level, t.scenario_id, t.turn_number LIMIT 1000")
TURN_COUNT=$(echo "$TURNS_JSON" | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)")
echo "  ${TURN_COUNT} turns to generate"

TURNS_OK=0
TURNS_SKIP=0
for i in $(seq 0 $((TURN_COUNT-1))); do
  ID=$(echo "$TURNS_JSON" | python3 -c "import json,sys; print(json.load(sys.stdin)[${i}]['id'])")
  SCENARIO=$(echo "$TURNS_JSON" | python3 -c "import json,sys; print(json.load(sys.stdin)[${i}]['scenario_id'])")
  TEXT=$(echo "$TURNS_JSON" | python3 -c "import json,sys; print(json.load(sys.stdin)[${i}]['ai_text_en'])")
  VOICE=$(echo "$TURNS_JSON" | python3 -c "import json,sys; v=json.load(sys.stdin)[${i}]['voice_id']; print(v if v else 'EXAVITQu4vr4xnSDxMaL')")
  if gen_one turn "$ID" "$TEXT" "$VOICE" "$SCENARIO"; then
    TURNS_OK=$((TURNS_OK+1))
  else
    TURNS_SKIP=$((TURNS_SKIP+1))
  fi
  if [ $((($i+1) % 10)) -eq 0 ]; then
    echo "  turns: ${TURNS_OK} ok / ${TURNS_SKIP} skipped ($(($i+1))/${TURN_COUNT})"
  fi
done
echo ""
echo "  Phase B complete: ${TURNS_OK} ok / ${TURNS_SKIP} skipped"

echo ""
echo "===== ${TARGET} FINAL ====="
mgmt_query "SELECT (SELECT count(*) FROM retention_lesson_briefs WHERE audio_path IS NOT NULL) AS briefs_audio, (SELECT count(*) FROM retention_dialogue_turns WHERE ai_audio_path IS NOT NULL) AS turns_audio"
