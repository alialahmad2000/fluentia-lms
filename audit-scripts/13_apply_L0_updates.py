#!/usr/bin/env python3
"""
PROMPT 13 — Apply L0 passage updates to DB, one unit at a time.
Commits and pushes after each unit per Rule 14.
"""
import json, subprocess, sys, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CLEANUP = os.path.join(ROOT, "PHASE-2-CLEANUP")

# Load updates
with open(os.path.join(CLEANUP, "13-L0-updates.json"), "r", encoding="utf-8") as f:
    updates = json.load(f)

# Load schema cache for unit themes
with open(os.path.join(CLEANUP, "13-L0-schema-cache.json"), "r", encoding="utf-8") as f:
    schema = json.load(f)
unit_themes = {u["num"]: u["theme"] for u in schema["units"]}

# Group by unit
by_unit = {}
for u in updates:
    n = u["unit_num"]
    if n not in by_unit:
        by_unit[n] = []
    by_unit[n].append(u)

def run_sql(sql):
    """Run SQL via supabase CLI and return output."""
    cmd = ["npx", "supabase", "db", "query", "--linked", sql]
    result = subprocess.run(cmd, capture_output=True, text=True, cwd=ROOT, timeout=60)
    if result.returncode != 0:
        print(f"  SQL ERROR: {result.stderr[:500]}")
        return None
    return result.stdout

def apply_unit(unit_num, items):
    """Apply updates for one unit."""
    theme = unit_themes.get(unit_num, "Unknown")
    print(f"\n{'='*60}")
    print(f"UNIT {unit_num}: {theme}")
    print(f"{'='*60}")

    results = []
    for item in items:
        rid = item["reading_id"]
        label = item["label"]
        wc = item["word_count"]
        fkgl = item["metrics"]["fkgl"]

        # Escape single quotes in JSON for SQL
        pjson = item["passage_json"].replace("'", "''")

        sql = f"""UPDATE curriculum_readings
SET passage_content = '{pjson}'::jsonb,
    passage_word_count = {wc},
    updated_at = NOW()
WHERE id = '{rid}'
RETURNING id, reading_label;"""

        print(f"  Updating Reading {label} (id {rid[:8]})...")
        out = run_sql(sql)
        if out and rid[:8] in out:
            print(f"    OK: wc={wc}, fkgl={fkgl}")
            results.append(("rewritten", label, rid, wc, fkgl))
        else:
            print(f"    FAILED! Output: {out}")
            results.append(("failed", label, rid, wc, fkgl))

    # Verify
    unit_id = items[0]["reading_id"]  # need actual unit_id
    # Get unit_id from schema
    uid = None
    for u in schema["units"]:
        if u["num"] == unit_num:
            uid = u["id"]
            break

    if uid:
        verify_sql = f"SELECT id, reading_label, passage_word_count FROM curriculum_readings WHERE unit_id = '{uid}' ORDER BY reading_label;"
        print(f"\n  Verification:")
        vout = run_sql(verify_sql)
        if vout:
            # Print first few lines
            for line in vout.strip().split("\n")[:10]:
                print(f"    {line}")

    return results

# Process start unit from command line (default: 1)
start_unit = int(sys.argv[1]) if len(sys.argv) > 1 else 1

for unit_num in sorted(by_unit.keys()):
    if unit_num < start_unit:
        continue

    results = apply_unit(unit_num, by_unit[unit_num])

    # Check for failures
    failed = [r for r in results if r[0] == "failed"]
    if failed:
        print(f"\n  UNIT {unit_num} had failures. Stopping.")
        sys.exit(1)

    print(f"\n  Unit {unit_num} complete. Ready for commit+push.")
    print(f"  PAUSE: Run commit+push externally, then re-run with start_unit={unit_num+1}")

    # Only do one unit at a time
    break
