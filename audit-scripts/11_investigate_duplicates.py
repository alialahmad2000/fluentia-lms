#!/usr/bin/env python3
"""
PROMPT 11 — Vocabulary Cleanup Investigation
Analyzes the extracted vocabulary data to build a deletion plan.
"""

import json
import csv
import os
from collections import defaultdict, Counter
from pathlib import Path

BASE = Path(__file__).parent / "data"
OUT = Path(__file__).parent.parent / "PHASE-2-CLEANUP"
OUT.mkdir(exist_ok=True)

def load_json(filename):
    with open(BASE / filename, 'r', encoding='utf-8') as f:
        content = f.read()
    idx = content.find('{')
    if idx > 0:
        content = content[idx:]
    data = json.loads(content)
    return data.get('rows', [])

print("Loading data...")
vocab_data = load_json("vocabulary_full.json")
print(f"  Total vocabulary entries: {len(vocab_data)}")

# Enrich with compound keys
for v in vocab_data:
    v['word_lower'] = (v.get('word') or '').lower().strip()
    v['level'] = v.get('level_number', -1)
    v['unit'] = v.get('unit_number', -1)
    v['pos'] = (v.get('part_of_speech') or 'unknown').lower().strip()
    v['def_ar'] = (v.get('definition_ar') or '').strip()
    v['example'] = (v.get('example_sentence') or '').strip()
    v['has_audio'] = bool(v.get('audio_url'))
    v['has_image'] = bool(v.get('image_url'))
    v['vid'] = v.get('id', '')

# ══════════════════════════════════════════
# PHASE A — Verify counts match audit
# ══════════════════════════════════════════
print("\n========================================")
print("SCHEMA DISCOVERY (from extracted data)")
print("========================================")

per_level = defaultdict(lambda: {'total': 0, 'unique': set()})
for v in vocab_data:
    per_level[v['level']]['total'] += 1
    per_level[v['level']]['unique'].add(v['word_lower'])

print("\nPer-level vocab counts:")
print(f"  {'Level':<8} {'Total':<8} {'Unique':<8} {'Duplicates':<12}")
for level in sorted(per_level.keys()):
    d = per_level[level]
    dupes = d['total'] - len(d['unique'])
    print(f"  L{level:<7} {d['total']:<8} {len(d['unique']):<8} {dupes:<12}")

total = len(vocab_data)
total_unique = len(set(v['word_lower'] for v in vocab_data))
print(f"\n  TOTAL: {total} entries, {total_unique} unique words, {total - total_unique} total duplicates")

# ══════════════════════════════════════════
# PHASE B — Anomaly Investigation (L4/L5)
# ══════════════════════════════════════════
print("\n========================================")
print("ANOMALY INVESTIGATION")
print("========================================")

# B1: Within-unit duplicates per unit for L4 and L5
print("\nB1: Per-unit duplicate counts (L4 and L5):")
print(f"  {'Level':<6} {'Unit':<6} {'Theme':<35} {'Duped Words':<13} {'Extra Copies':<14} {'Max Copies'}")

# Group by (level, unit, word_lower) to find within-unit duplicates
unit_word_counts = defaultdict(lambda: defaultdict(list))
for v in vocab_data:
    key = (v['level'], v['unit'])
    unit_word_counts[key][v['word_lower']].append(v)

for level in [4, 5]:
    for unit_num in range(1, 13):
        key = (level, unit_num)
        if key not in unit_word_counts:
            continue
        word_groups = unit_word_counts[key]
        duped_words = {w: entries for w, entries in word_groups.items() if len(entries) > 1}
        if not duped_words:
            continue
        extra = sum(len(entries) - 1 for entries in duped_words.values())
        max_copies = max(len(entries) for entries in duped_words.values())
        theme = word_groups[list(word_groups.keys())[0]][0].get('theme_en', '?')[:33]
        print(f"  L{level:<5} U{unit_num:<5} {theme:<35} {len(duped_words):<13} {extra:<14} {max_copies}")

# B2: Worst offenders — words with 3+ copies in a single unit
print("\nB2: Worst offenders (3+ copies in one unit, L4/L5):")
print(f"  {'Level':<6} {'Unit':<6} {'Word':<25} {'Copies':<8} {'POS':<30} {'Arabic Defs (unique)'}")

worst = []
for level in [4, 5]:
    for unit_num in range(1, 13):
        key = (level, unit_num)
        if key not in unit_word_counts:
            continue
        for word, entries in unit_word_counts[key].items():
            if len(entries) >= 3:
                pos_set = set(e['pos'] for e in entries)
                def_set = set(e['def_ar'][:40] for e in entries if e['def_ar'])
                worst.append((level, unit_num, word, len(entries), pos_set, def_set))

worst.sort(key=lambda x: -x[3])
for level, unit, word, copies, pos_set, def_set in worst[:30]:
    print(f"  L{level:<5} U{unit:<5} {word:<25} {copies:<8} {str(pos_set):<30} {len(def_set)} unique defs")

# B3: Check if duplication pattern looks like double-run
print("\nB3: Duplication pattern analysis:")
# If every word appears exactly 2x (or close), it's a double-run
for level in [4, 5]:
    copy_counts = Counter()
    for unit_num in range(1, 13):
        key = (level, unit_num)
        if key not in unit_word_counts:
            continue
        for word, entries in unit_word_counts[key].items():
            if len(entries) > 1:
                copy_counts[len(entries)] += 1

    print(f"\n  L{level} — distribution of duplicate counts:")
    for count, freq in sorted(copy_counts.items()):
        print(f"    {count} copies: {freq} words")

# B4: Check reading-level pattern
print("\nB4: Vocab count per reading (L4/L5) — looking for double-10 pattern:")
reading_counts = defaultdict(int)
reading_info = {}
for v in vocab_data:
    if v['level'] in [4, 5]:
        rid = v.get('reading_id', '')
        reading_counts[rid] += 1
        if rid not in reading_info:
            reading_info[rid] = (v['level'], v['unit'], v.get('theme_en', '?'))

count_dist = Counter(reading_counts.values())
print(f"  Distribution of vocab-per-reading:")
for count, freq in sorted(count_dist.items()):
    print(f"    {count} words/reading: {freq} readings")

# Show first few readings with exactly 20 (double-10)
print(f"\n  Readings with exactly 20 words (evidence of double-run):")
shown = 0
for rid, count in sorted(reading_counts.items(), key=lambda x: -x[1]):
    if count == 20:
        info = reading_info[rid]
        print(f"    L{info[0]} U{info[1]}: {count} words — {info[2][:40]}")
        shown += 1
        if shown >= 5:
            break

print(f"\n  Readings with exactly 10 words (single-run, correct):")
shown = 0
for rid, count in sorted(reading_counts.items(), key=lambda x: x[1]):
    if count == 10:
        info = reading_info[rid]
        print(f"    L{info[0]} U{info[1]}: {count} words — {info[2][:40]}")
        shown += 1
        if shown >= 5:
            break

# ══════════════════════════════════════════
# ROOT CAUSE SUMMARY
# ══════════════════════════════════════════
# Check if within each reading, duplicated words are identical (same def, same example)
print("\n========================================")
print("ROOT CAUSE ANALYSIS")
print("========================================")

identical_dupes = 0
diff_def_dupes = 0
diff_example_dupes = 0

for level in [4, 5]:
    for unit_num in range(1, 13):
        key = (level, unit_num)
        if key not in unit_word_counts:
            continue
        for word, entries in unit_word_counts[key].items():
            if len(entries) <= 1:
                continue
            # Group by reading_id
            by_reading = defaultdict(list)
            for e in entries:
                by_reading[e.get('reading_id', '')].append(e)
            for rid, rgroup in by_reading.items():
                if len(rgroup) <= 1:
                    continue
                # Check if all entries in this reading are identical
                defs = set(e['def_ar'] for e in rgroup)
                examples = set(e['example'] for e in rgroup)
                if len(defs) == 1 and len(examples) == 1:
                    identical_dupes += len(rgroup) - 1
                elif len(defs) == 1:
                    diff_example_dupes += len(rgroup) - 1
                else:
                    diff_def_dupes += len(rgroup) - 1

print(f"\n  Within-reading duplicate analysis (L4/L5):")
print(f"    Identical (same word + same def + same example): {identical_dupes}")
print(f"    Same def, different example: {diff_example_dupes}")
print(f"    Different definitions: {diff_def_dupes}")

if identical_dupes > diff_def_dupes and identical_dupes > diff_example_dupes:
    print(f"\n  CONCLUSION: Majority are IDENTICAL copies → script was run multiple times")
    print(f"  The generate-vocab-l4-l5.cjs script has no deduplication check.")
    print(f"  Each run inserts 10 words per reading. Running it twice = 20 words per reading.")
elif diff_example_dupes > identical_dupes:
    print(f"\n  CONCLUSION: Same words with DIFFERENT examples → Claude generated different responses each run")
    print(f"  The script was run multiple times, Claude gave different outputs each time.")
else:
    print(f"\n  CONCLUSION: Mixed pattern — some identical, some with different definitions")

# ══════════════════════════════════════════
# PHASE C — Build deletion plan
# ══════════════════════════════════════════
print("\n========================================")
print("BUILDING DELETION PLAN")
print("========================================")

bucket_a = []  # Safe to delete
bucket_b = []  # Needs review
bucket_c = []  # Legitimate, keep

# Process ALL levels, not just L4/L5
for level in range(6):
    for unit_num in range(1, 13):
        key = (level, unit_num)
        if key not in unit_word_counts:
            continue
        for word, entries in unit_word_counts[key].items():
            if len(entries) <= 1:
                continue

            # Group by (word, pos)
            by_pos = defaultdict(list)
            for e in entries:
                by_pos[e['pos']].append(e)

            if len(by_pos) > 1:
                # Different POS — legitimate
                for pos, pos_entries in by_pos.items():
                    if len(pos_entries) > 1:
                        # Still duplicates within same POS
                        # Keep the one with most data, delete rest
                        sorted_entries = sorted(pos_entries, key=lambda e: (
                            bool(e['has_audio']),
                            bool(e['has_image']),
                            len(e['example']),
                            len(e['def_ar']),
                        ), reverse=True)
                        # Keep first, classify rest
                        for e in sorted_entries[1:]:
                            defs_match = all(x['def_ar'] == sorted_entries[0]['def_ar'] for x in sorted_entries[1:])
                            if defs_match:
                                bucket_a.append({**e, 'keep_id': sorted_entries[0]['vid'], 'reason': 'same word+POS+def in unit'})
                            else:
                                bucket_b.append({**e, 'keep_id': sorted_entries[0]['vid'], 'reason': 'same word+POS, diff def in unit'})
                    # The single-per-pos entry is legitimate
                    if len(pos_entries) == 1:
                        bucket_c.append({**pos_entries[0], 'reason': f'different POS ({pos}) from other entries'})
                continue

            # Same POS for all entries
            pos = list(by_pos.keys())[0]
            all_entries = by_pos[pos]

            # Check definitions
            unique_defs = set(e['def_ar'] for e in all_entries)

            # Sort: keep the one with most data (audio > image > longer example > longer def)
            sorted_entries = sorted(all_entries, key=lambda e: (
                bool(e['has_audio']),
                bool(e['has_image']),
                len(e['example']),
                len(e['def_ar']),
            ), reverse=True)

            keep = sorted_entries[0]
            rest = sorted_entries[1:]

            if len(unique_defs) <= 1:
                # Same def — pure duplicates, safe to delete
                for e in rest:
                    bucket_a.append({**e, 'keep_id': keep['vid'], 'reason': 'same word+POS+def in unit'})
            else:
                # Different defs — needs review
                for e in rest:
                    bucket_b.append({**e, 'keep_id': keep['vid'], 'reason': 'same word+POS, diff Arabic def'})

# Cross-unit same-level duplicates
print("\n  Checking cross-unit same-level duplicates...")
level_word_units = defaultdict(lambda: defaultdict(list))
for v in vocab_data:
    level_word_units[(v['level'], v['word_lower'], v['pos'])][v['unit']].append(v)

cross_unit_dupes = 0
for (level, word, pos), units_map in level_word_units.items():
    if len(units_map) <= 1:
        continue
    # Same word+POS in multiple units of same level
    # Check if definitions are the same
    all_entries = []
    for unit_entries in units_map.values():
        all_entries.extend(unit_entries)
    unique_defs = set(e['def_ar'] for e in all_entries)
    if len(unique_defs) <= 1:
        # Same def across units — keep one per unit? No, this is cross-unit, not within-unit
        # These are separate entries in different units — flag for review but don't auto-delete
        # (they might be intentional repetition for reinforcement)
        pass
    cross_unit_dupes += len(units_map) - 1

# Already-classified IDs
classified_ids = set(e['vid'] for e in bucket_a + bucket_b + bucket_c)

print(f"\n  Bucket A (safe to delete): {len(bucket_a)} entries")
print(f"  Bucket B (needs review): {len(bucket_b)} entries")
print(f"  Bucket C (legitimate, keep): {len(bucket_c)} entries")
print(f"  Total classified: {len(bucket_a) + len(bucket_b) + len(bucket_c)}")

# Distribution by level
print(f"\n  Bucket A by level:")
a_by_level = Counter(e['level'] for e in bucket_a)
for level in sorted(a_by_level.keys()):
    print(f"    L{level}: {a_by_level[level]}")

print(f"\n  Bucket B by level:")
b_by_level = Counter(e['level'] for e in bucket_b)
for level in sorted(b_by_level.keys()):
    print(f"    L{level}: {b_by_level[level]}")

# ══════════════════════════════════════════
# Write CSV files
# ══════════════════════════════════════════
print("\n========================================")
print("WRITING CSV FILES")
print("========================================")

csv_cols = ['vocab_id', 'word', 'level', 'unit_number', 'unit_title', 'part_of_speech',
            'definition_ar', 'example_en', 'has_audio', 'has_image', 'keep_id', 'reason']

def write_bucket_csv(filename, bucket):
    path = OUT / filename
    with open(path, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=csv_cols)
        writer.writeheader()
        for e in bucket:
            writer.writerow({
                'vocab_id': e.get('vid', ''),
                'word': e.get('word', ''),
                'level': e.get('level', ''),
                'unit_number': e.get('unit', ''),
                'unit_title': e.get('theme_en', ''),
                'part_of_speech': e.get('pos', ''),
                'definition_ar': e.get('def_ar', ''),
                'example_en': e.get('example', '')[:100],
                'has_audio': e.get('has_audio', False),
                'has_image': e.get('has_image', False),
                'keep_id': e.get('keep_id', ''),
                'reason': e.get('reason', ''),
            })
    print(f"  {filename}: {len(bucket)} rows")

write_bucket_csv('bucket-A-safe-to-delete.csv', bucket_a)
write_bucket_csv('bucket-B-needs-review.csv', bucket_b)

# Bucket C uses simpler format (no keep_id)
csv_cols_c = ['vocab_id', 'word', 'level', 'unit_number', 'part_of_speech', 'definition_ar', 'reason']
path_c = OUT / 'bucket-C-legitimate.csv'
with open(path_c, 'w', encoding='utf-8-sig', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=csv_cols_c)
    writer.writeheader()
    for e in bucket_c:
        writer.writerow({
            'vocab_id': e.get('vid', ''),
            'word': e.get('word', ''),
            'level': e.get('level', ''),
            'unit_number': e.get('unit', ''),
            'part_of_speech': e.get('pos', ''),
            'definition_ar': e.get('def_ar', ''),
            'reason': e.get('reason', ''),
        })
print(f"  bucket-C-legitimate.csv: {len(bucket_c)} rows")

# ══════════════════════════════════════════
# Verification
# ══════════════════════════════════════════
print("\n========================================")
print("VERIFICATION")
print("========================================")
print(f"  Total vocab entries: {total}")
print(f"  After Bucket A cleanup: {total} - {len(bucket_a)} = {total - len(bucket_a)}")
print(f"  Bucket B (pending review): {len(bucket_b)}")
print(f"  If Bucket B also deleted: {total} - {len(bucket_a)} - {len(bucket_b)} = {total - len(bucket_a) - len(bucket_b)}")

# Save summary for the report
summary = {
    'total': total,
    'total_unique': total_unique,
    'bucket_a': len(bucket_a),
    'bucket_b': len(bucket_b),
    'bucket_c': len(bucket_c),
    'after_a': total - len(bucket_a),
    'after_ab': total - len(bucket_a) - len(bucket_b),
    'identical_dupes': identical_dupes,
    'diff_example_dupes': diff_example_dupes,
    'diff_def_dupes': diff_def_dupes,
    'a_by_level': dict(a_by_level),
    'b_by_level': dict(b_by_level),
}

with open(OUT / '_summary.json', 'w') as f:
    json.dump(summary, f, indent=2)

print(f"\n  Summary saved to PHASE-2-CLEANUP/_summary.json")
