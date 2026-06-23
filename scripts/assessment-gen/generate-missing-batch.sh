#!/bin/bash
# Generate + publish unit-mastery exams for the units that are missing questions.
# Levels 2, 4, 5 (12 units each = 36). The generator is idempotent-safe: it ABORTS a unit
# if questions already exist, and only publishes after all 3 variants insert cleanly.
# Continues past a failed unit and reports failures at the end.
set -u
cd /Users/dr.ali/projects/fluentia-ee || exit 1
LOG=scripts/assessment-gen/batch-run.log
: > "$LOG"
FAILED=()
OK=0
for LVL in 2 4 5; do
  for U in $(seq 1 12); do
    echo "================ L$LVL U$U  $(date +%H:%M:%S) ================" | tee -a "$LOG"
    if node scripts/assessment-gen/generate-mastery-questions.cjs --level "$LVL" --unit "$U" >> "$LOG" 2>&1; then
      echo ">>> OK   L$LVL U$U" | tee -a "$LOG"
      OK=$((OK+1))
    else
      echo ">>> FAIL L$LVL U$U" | tee -a "$LOG"
      FAILED+=("L$LVL-U$U")
    fi
  done
done
echo "================ BATCH DONE: $OK ok, ${#FAILED[@]} failed: ${FAILED[*]:-none} ================" | tee -a "$LOG"
