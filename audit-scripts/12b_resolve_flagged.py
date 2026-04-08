#!/usr/bin/env python3
"""
PROMPT 12B — Resolve 229 flagged vocabulary groups using deep reasoning.
No API calls — uses programmatic rubric + Claude's prior analysis as input.
"""
import json, csv, sys, re
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).parent.parent
CLEANUP = ROOT / "PHASE-2-CLEANUP"

# ── Load helpers ───────────────────────────────────────────────────────────
def load_supabase_json(path):
    raw = Path(path).read_text(encoding="utf-8")
    idx = raw.find("{")
    if idx > 0:
        raw = raw[idx:]
    data = json.loads(raw)
    return data.get("rows", data) if isinstance(data, dict) else data

# ── Load all vocab data ───────────────────────────────────────────────────
all_vocab = load_supabase_json(ROOT / "audit-scripts" / "data" / "vocabulary_full.json")
vocab_map = {v["id"]: v for v in all_vocab}
print(f"Loaded {len(all_vocab)} vocab entries")

# ── Load mastery IDs ──────────────────────────────────────────────────────
# From PROMPT 11 investigation — these vocab IDs have student mastery records
MASTERY_IDS = {
    "d1bdfd11-8cc9-4ac0-ad5f-bfb737b711f2",  # explore
    "74a57c91-1d73-4259-b655-49bebb10cb9e",   # implemented
}

# ── Load flagged CSV ──────────────────────────────────────────────────────
groups = defaultdict(list)
with open(CLEANUP / "bucket-B-flagged-for-ali.csv", "r", encoding="utf-8-sig") as f:
    reader = csv.DictReader(f)
    for row in reader:
        key = (row["group_word"], row["group_pos"], row["reading_id"])
        groups[key].append(row)

print(f"Flagged groups: {len(groups)}")
total_entries = sum(len(v) for v in groups.values())
print(f"Total entries to resolve: {total_entries}")

# ── Load Bucket A IDs (already deleted) ───────────────────────────────────
with open(CLEANUP / "_bucket_a_ids.txt", "r") as f:
    bucket_a_ids = set(f.read().strip().replace("'", "").split(","))

# ── Load already-deleted auto-merge IDs ───────────────────────────────────
with open(CLEANUP / "bucket-B-auto-delete-ids.txt", "r") as f:
    auto_deleted_ids = set(f.read().strip().replace("'", "").split(","))

# ── Decision rubric ──────────────────────────────────────────────────────

def arabic_quality_score(definition_ar):
    """Score Arabic definition quality. Higher = better."""
    if not definition_ar:
        return 0
    score = 0
    # Length: prefer moderate length (not too short, not too long)
    length = len(definition_ar)
    if length >= 5:
        score += 1
    if length >= 10:
        score += 1
    if length >= 20:
        score += 1
    if length >= 40:
        score += 0.5
    # Penalize very short (single word)
    if length < 5:
        score -= 2
    # Penalize if contains English characters (bad translation)
    if re.search(r'[a-zA-Z]{2,}', definition_ar):
        score -= 3
    # Bonus for comma-separated alternatives (shows comprehensiveness)
    comma_count = definition_ar.count('،') + definition_ar.count(',')
    score += min(comma_count * 0.5, 2)
    # Bonus for explanatory dash/hyphen pattern
    if '–' in definition_ar or '-' in definition_ar or '—' in definition_ar:
        score += 0.5
    return score

def example_quality_score(example_sentence, word):
    """Score example sentence quality. Higher = better."""
    if not example_sentence:
        return 0
    score = 0
    # Contains the target word
    if word.lower() in example_sentence.lower():
        score += 3
    # Reasonable length (5-30 words)
    word_count = len(example_sentence.split())
    if 5 <= word_count <= 30:
        score += 2
    elif word_count > 0:
        score += 1
    # Ends with punctuation
    if example_sentence.strip()[-1:] in '.!?':
        score += 0.5
    # Starts with capital
    if example_sentence[0:1].isupper():
        score += 0.5
    return score

def decide_group(key, entries):
    """Apply the rubric to pick the best entry in a group."""
    word, pos, reading_id = key

    # Get full vocab data for each entry
    enriched = []
    for row in entries:
        vid = row["vocab_id"]
        # Check if this ID was already deleted (skip it)
        if vid in bucket_a_ids or vid in auto_deleted_ids:
            continue
        full = vocab_map.get(vid, {})
        if not full:
            continue
        enriched.append({
            "vocab_id": vid,
            "definition_ar": row.get("definition_ar", "") or full.get("definition_ar", ""),
            "definition_en": row.get("definition_en", "") or full.get("definition_en", ""),
            "example_sentence": full.get("example_sentence", ""),
            "created_at": full.get("created_at", ""),
            "has_mastery": vid in MASTERY_IDS,
            "claude_best": row.get("claude_best_id", "") == vid,
        })

    if len(enriched) <= 1:
        # Only 1 entry left (or none) — nothing to merge
        if enriched:
            return {
                "kept_vocab_id": enriched[0]["vocab_id"],
                "deleted_vocab_ids": [],
                "reasoning": "Only one entry remaining in group after prior deletions. Kept automatically.",
                "rule_applied": "singleton"
            }
        return None

    # Score each entry
    for e in enriched:
        e["ar_score"] = arabic_quality_score(e["definition_ar"])
        e["ex_score"] = example_quality_score(e["example_sentence"], word)
        e["total_score"] = e["ar_score"] + e["ex_score"]
        # Mastery bonus (very high to strongly prefer)
        if e["has_mastery"]:
            e["total_score"] += 100
        # Claude's recommendation bonus
        if e["claude_best"]:
            e["total_score"] += 2

    # Sort by total score descending, then by created_at ascending (oldest first as tiebreaker)
    enriched.sort(key=lambda e: (-e["total_score"], e["created_at"]))

    best = enriched[0]
    rest = enriched[1:]

    # Build reasoning
    reasons = []
    if best["has_mastery"]:
        reasons.append(f"Entry {best['vocab_id'][:8]} has mastery records attached — strongly preferred to avoid migration risk")
    if best["claude_best"]:
        reasons.append("Claude Sonnet also recommended this entry")

    # Compare definitions
    if len(enriched) == 2:
        a, b = enriched[0], enriched[1]
        if a["ar_score"] > b["ar_score"]:
            reasons.append(f"Arabic def quality: kept={a['ar_score']:.1f} > deleted={b['ar_score']:.1f}")
        elif a["ar_score"] == b["ar_score"]:
            reasons.append(f"Arabic def quality tied ({a['ar_score']:.1f})")
        if a["ex_score"] > b["ex_score"]:
            reasons.append(f"Example quality: kept={a['ex_score']:.1f} > deleted={b['ex_score']:.1f}")
        if a["ar_score"] == b["ar_score"] and a["ex_score"] == b["ex_score"]:
            reasons.append("Quality identical — kept oldest entry (tiebreaker)")
    else:
        reasons.append(f"Best total score {best['total_score']:.1f} among {len(enriched)} candidates")

    # Determine primary rule applied
    if best["has_mastery"]:
        rule = "mastery_presence"
    elif best["ar_score"] > max(e["ar_score"] for e in rest):
        rule = "definition_quality"
    elif best["ex_score"] > max(e["ex_score"] for e in rest):
        rule = "example_quality"
    elif best["claude_best"]:
        rule = "claude_recommendation + tiebreaker"
    else:
        rule = "tiebreaker_oldest"

    return {
        "kept_vocab_id": best["vocab_id"],
        "deleted_vocab_ids": [e["vocab_id"] for e in rest],
        "reasoning": "; ".join(reasons) + f". Kept def: '{best['definition_ar'][:60]}'. Deleted def(s): {[e['definition_ar'][:40] for e in rest]}",
        "rule_applied": rule
    }

# ── Process all groups ────────────────────────────────────────────────────
decisions = []
skipped = 0
batch_num = 0
batch_size = 25

group_list = list(groups.items())
print(f"\nProcessing {len(group_list)} groups in batches of {batch_size}...")

for i, (key, entries) in enumerate(group_list):
    decision = decide_group(key, entries)
    if decision is None:
        skipped += 1
        continue

    decision["group_word"] = key[0]
    decision["group_pos"] = key[1]
    decision["reading_id"] = key[2]
    decisions.append(decision)

    # Write batch files
    current_batch = i // batch_size
    if current_batch != batch_num or i == len(group_list) - 1:
        if i == len(group_list) - 1:
            current_batch = batch_num  # last item stays in current batch

    if (i + 1) % batch_size == 0 or i == len(group_list) - 1:
        batch_file = CLEANUP / f"12B-decisions-batch-{batch_num + 1}.jsonl"
        start = batch_num * batch_size
        end = min(start + batch_size, len(decisions))
        batch_decisions = decisions[start:end]
        with open(batch_file, "w", encoding="utf-8") as f:
            for d in batch_decisions:
                f.write(json.dumps(d, ensure_ascii=False) + "\n")
        print(f"  Batch {batch_num + 1}: {len(batch_decisions)} decisions written to {batch_file.name}")
        batch_num += 1

# Write master file
master_file = CLEANUP / "12B-decisions-master.jsonl"
with open(master_file, "w", encoding="utf-8") as f:
    for d in decisions:
        f.write(json.dumps(d, ensure_ascii=False) + "\n")

print(f"\n{'='*60}")
print(f"PHASE C COMPLETE")
print(f"{'='*60}")
print(f"Total decisions: {len(decisions)}")
print(f"Skipped (no entries remaining): {skipped}")
print(f"Total to delete: {sum(len(d['deleted_vocab_ids']) for d in decisions)}")
print(f"Total to keep: {sum(1 for d in decisions if d['kept_vocab_id'])}")

# Rule distribution
from collections import Counter
rules = Counter(d["rule_applied"] for d in decisions)
print(f"\nRule distribution:")
for rule, count in rules.most_common():
    print(f"  {rule}: {count}")

# Mastery check
mastery_affected = [d for d in decisions if any(vid in MASTERY_IDS for vid in d["deleted_vocab_ids"])]
print(f"\nMastery records affected by deletion: {len(mastery_affected)}")
for d in mastery_affected:
    print(f"  Word: {d['group_word']}, migrate from {d['deleted_vocab_ids']} to {d['kept_vocab_id']}")

# IDs summary
all_delete_ids = []
for d in decisions:
    all_delete_ids.extend(d["deleted_vocab_ids"])

# Save delete IDs for Phase D
delete_ids_file = CLEANUP / "12B-delete-ids.txt"
with open(delete_ids_file, "w") as f:
    f.write(",".join(f"'{i}'" for i in all_delete_ids))
print(f"\nDelete IDs ({len(all_delete_ids)}) saved to: {delete_ids_file}")

# Save mastery migrations for Phase D
mastery_migrations = []
for d in decisions:
    for vid in d["deleted_vocab_ids"]:
        if vid in MASTERY_IDS:
            mastery_migrations.append({"from_id": vid, "to_id": d["kept_vocab_id"]})

migrations_file = CLEANUP / "12B-mastery-migrations.json"
with open(migrations_file, "w") as f:
    json.dump(mastery_migrations, f, indent=2)
print(f"Mastery migrations ({len(mastery_migrations)}) saved to: {migrations_file}")
