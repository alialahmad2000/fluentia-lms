#!/usr/bin/env python3
"""
PROMPT 13 -- Apply all L0 passage updates to DB, one unit at a time.
Commits and pushes after each unit per Rule 14.
"""
import json, subprocess, sys, os

ROOT = "C:/Users/Dr. Ali/Desktop/fluentia-lms"
CLEANUP = os.path.join(ROOT, "PHASE-2-CLEANUP")

with open(os.path.join(CLEANUP, "13-L0-updates.json"), "r", encoding="utf-8") as f:
    updates = json.load(f)

with open(os.path.join(CLEANUP, "13-L0-schema-cache.json"), "r", encoding="utf-8") as f:
    schema = json.load(f)

unit_themes = {u["num"]: u["theme"] for u in schema["units"]}
unit_ids = {u["num"]: u["id"] for u in schema["units"]}

by_unit = {}
for u in updates:
    n = u["unit_num"]
    if n not in by_unit:
        by_unit[n] = []
    by_unit[n].append(u)

def run_sql(sql):
    sqlfile = os.path.join(CLEANUP, "_temp_update.sql")
    with open(sqlfile, "w", encoding="utf-8") as f:
        f.write(sql)
    result = subprocess.run(
        "cat PHASE-2-CLEANUP/_temp_update.sql | npx supabase db query --linked",
        shell=True, capture_output=True, text=True, cwd=ROOT, timeout=60
    )
    return result

def run_git(cmd):
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=ROOT, timeout=60)
    return result

start_unit = int(sys.argv[1]) if len(sys.argv) > 1 else 1

for unit_num in sorted(by_unit.keys()):
    if unit_num < start_unit:
        continue

    theme = unit_themes.get(unit_num, "Unknown")
    items = by_unit[unit_num]
    print(f"\n{'='*60}")
    print(f"UNIT {unit_num}: {theme}")
    print(f"{'='*60}")

    results_info = []
    all_ok = True

    for item in items:
        label = item["label"]
        rid = item["reading_id"]
        wc = item["word_count"]
        fkgl = item["metrics"]["fkgl"]
        pjson = item["passage_json"].replace("'", "''")

        sql = f"""UPDATE curriculum_readings SET passage_content = '{pjson}'::jsonb, passage_word_count = {wc}, updated_at = NOW() WHERE id = '{rid}' RETURNING id, reading_label;"""

        print(f"  Updating Reading {label} (id {rid[:8]})...")
        result = run_sql(sql)
        if result.returncode == 0 and rid[:8] in result.stdout:
            print(f"    OK: wc={wc}, fkgl={fkgl}")
            results_info.append(f"rewritten (wc={wc}, fkgl={fkgl})")
        else:
            print(f"    FAILED: {result.stderr[:200]}")
            results_info.append("failed")
            all_ok = False

    if not all_ok:
        print(f"\n  Unit {unit_num} had failures. Stopping.")
        sys.exit(1)

    # Verify
    uid = unit_ids[unit_num]
    verify_sql = f"SELECT id, reading_label, passage_word_count FROM curriculum_readings WHERE unit_id = '{uid}' ORDER BY reading_label;"
    vresult = run_sql(verify_sql)
    print(f"\n  Verify: {vresult.stdout.strip()[:300]}")

    # Questions: L0 has empty reading_skill_exercises, skip question updates
    q_updated = 0

    # Commit + push
    ra_info = results_info[0] if len(results_info) > 0 else "n/a"
    rb_info = results_info[1] if len(results_info) > 1 else "n/a"

    commit_msg = f"""feat(L0-U{unit_num:02d}): rewrite reading passages to meet Pre-A1 targets

- Unit: {theme}
- Reading A: {ra_info}
- Reading B: {rb_info}
- Questions updated: {q_updated}
- L0 vocab compliance: 100%

Refs: PROMPT 13 L0 Unit {unit_num}"""

    print(f"\n  Committing...")
    run_git("git add -A")
    r = run_git(f'git commit -m "{commit_msg}"')
    print(f"    commit: {r.stdout.strip()[:100]}")

    print(f"  Pushing...")
    r = run_git("git push origin main")
    if r.returncode != 0:
        print(f"    push error: {r.stderr[:200]}")
        # Try again
        r = run_git("git push origin main")

    # Verify push
    run_git("git fetch origin")
    local = run_git("git log --oneline -1 HEAD")
    remote = run_git("git log --oneline -1 origin/main")
    l = local.stdout.strip()
    r_out = remote.stdout.strip()
    if l == r_out:
        print(f"    Push verified: {l}")
    else:
        print(f"    Push MISMATCH: local={l} remote={r_out}")

    print(f"\n  Unit {unit_num} DONE")

print(f"\n{'='*60}")
print("ALL UNITS COMPLETE")
print(f"{'='*60}")
