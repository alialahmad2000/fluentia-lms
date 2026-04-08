#!/usr/bin/env python3
"""
PROMPT 12 — Phase C: Bucket B Intelligent Merge
Groups Bucket B entries by (reading_id, word, POS), calls Claude API to evaluate
best Arabic definition, outputs SQL for auto-merges and flags uncertain groups.
"""
import json, csv, time, sys, os, re, subprocess
from pathlib import Path
from collections import defaultdict

# ── Paths ──────────────────────────────────────────────────────────────────
ROOT = Path(__file__).parent.parent
CLEANUP = ROOT / "PHASE-2-CLEANUP"
DATA = ROOT / "audit-scripts" / "data"
BACKUP = CLEANUP / "backups" / "2026-04-08-0300"

# ── API Key ────────────────────────────────────────────────────────────────
API_KEY = None
for envfile in [ROOT / ".env.backend", ROOT / ".env"]:
    if envfile.exists():
        for line in envfile.read_text(encoding="utf-8").splitlines():
            if line.startswith("CLAUDE_API_KEY="):
                API_KEY = line.split("=", 1)[1].strip()
if not API_KEY:
    API_KEY = os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("CLAUDE_API_KEY")
if not API_KEY:
    print("ERROR: No Anthropic API key found"); sys.exit(1)
print(f"API key found: {API_KEY[:20]}...")

# ── Load helpers ───────────────────────────────────────────────────────────
def load_supabase_json(path):
    raw = Path(path).read_text(encoding="utf-8")
    idx = raw.find("{")
    if idx > 0:
        raw = raw[idx:]
    data = json.loads(raw)
    return data.get("rows", data) if isinstance(data, dict) else data

# ── Load data ──────────────────────────────────────────────────────────────
all_vocab = load_supabase_json(DATA / "vocabulary_full.json")
all_readings = load_supabase_json(DATA / "readings_full.json")
print(f"Loaded {len(all_vocab)} vocab entries, {len(all_readings)} readings")

# Build reading lookup
reading_map = {r["id"]: r for r in all_readings}

# Load Bucket A IDs (already deleted from DB)
with open(CLEANUP / "_bucket_a_ids.txt", "r") as f:
    bucket_a_ids = set(f.read().strip().replace("'", "").split(","))

# Load Bucket B IDs
with open(CLEANUP / "_bucket_b_ids.txt", "r") as f:
    bucket_b_ids = set(f.read().strip().replace("'", "").split(","))

print(f"Bucket A IDs (already deleted): {len(bucket_a_ids)}")
print(f"Bucket B IDs: {len(bucket_b_ids)}")

# Filter out Bucket A entries (already deleted from DB)
current_vocab = [v for v in all_vocab if v["id"] not in bucket_a_ids]
print(f"Current vocab (post-Bucket-A): {len(current_vocab)}")

# ── Load level mapping for CEFR labels ─────────────────────────────────────
LEVEL_CEFR = {0: "Pre-A1", 1: "A1", 2: "A2", 3: "B1", 4: "B2", 5: "C1"}
reading_level_map = {}
for r in all_readings:
    ln = r.get("level_number", 0)
    reading_level_map[r["id"]] = LEVEL_CEFR.get(ln, f"L{ln}")

# ── Group vocab by (reading_id, lower(word), POS) ─────────────────────────
groups = defaultdict(list)
for v in current_vocab:
    key = (v["reading_id"], v["word"].lower(), v.get("part_of_speech", "") or "")
    groups[key].append(v)

# Find groups that contain at least one Bucket B entry AND have 2+ entries
merge_groups = {}
singleton_keep = []  # Bucket B entries that are sole survivors — keep them

for key, entries in groups.items():
    b_entries = [e for e in entries if e["id"] in bucket_b_ids]
    if not b_entries:
        continue
    if len(entries) == 1:
        # This Bucket B entry is the only one — its sibling was in Bucket A
        singleton_keep.append(entries[0])
    else:
        merge_groups[key] = entries

print(f"\nGroups needing merge (2+ entries): {len(merge_groups)}")
print(f"Singleton Bucket B entries (keep, no merge needed): {len(singleton_keep)}")

# ── Claude API caller ─────────────────────────────────────────────────────
def call_claude(prompt_text, retry=False):
    """Call Claude Sonnet API and return parsed JSON."""
    import urllib.request

    body = json.dumps({
        "model": "claude-sonnet-4-5-20250929",
        "max_tokens": 1000,
        "messages": [{"role": "user", "content": prompt_text}]
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=body,
        headers={
            "Content-Type": "application/json",
            "x-api-key": API_KEY,
            "anthropic-version": "2023-06-01"
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            text = result["content"][0]["text"].strip()
            # Try to parse JSON from response
            # Sometimes Claude wraps in ```json ... ```
            text = re.sub(r"^```json\s*", "", text)
            text = re.sub(r"\s*```$", "", text)
            return json.loads(text)
    except json.JSONDecodeError:
        if not retry:
            return call_claude(
                "YOUR LAST RESPONSE WAS INVALID JSON. Respond ONLY with valid JSON, nothing else.\n\n" + prompt_text,
                retry=True
            )
        return None
    except Exception as e:
        print(f"  API error: {e}")
        if not retry:
            time.sleep(3)
            return call_claude(prompt_text, retry=True)
        return None

# ── Build Claude evaluation prompt ─────────────────────────────────────────
def build_eval_prompt(key, entries):
    reading_id, word, pos = key
    reading = reading_map.get(reading_id, {})

    # Get passage context (first 200 words)
    passage_raw = reading.get("passage_content", "")
    passage = ""
    if isinstance(passage_raw, dict):
        # JSON structure with paragraphs array
        paragraphs = passage_raw.get("paragraphs", [])
        passage = " ".join(paragraphs) if paragraphs else ""
    elif isinstance(passage_raw, str):
        passage = passage_raw
    if passage:
        # Strip markdown bold/italic markers
        passage = re.sub(r"[*_]+", "", passage)
        words = passage.split()[:200]
        passage_excerpt = " ".join(words)
    else:
        passage_excerpt = "(passage not available)"

    # Determine CEFR level
    level = reading_level_map.get(reading_id, "unknown")

    # Build definitions list
    defs_text = ""
    for i, entry in enumerate(entries, 1):
        def_ar = entry.get("definition_ar", "") or ""
        example = entry.get("example_sentence", "") or ""
        defs_text += f'\nDefinition {i} (id={entry["id"]}): {def_ar}'
        defs_text += f'\nExample: {example}'
        defs_text += f'\nEnglish definition: {entry.get("definition_en", "")}\n'

    return f"""You are evaluating duplicate Arabic translations of an English vocabulary word for a Saudi Arabian English language academy. The students are adult learners (mostly young women) studying at CEFR level {level}.

The English word: "{word}"
Part of speech: {pos}
Context (the reading passage where it appears): {passage_excerpt}

You have {len(entries)} Arabic definitions to evaluate:
{defs_text}
Evaluate each definition on:
1. **Accuracy** — does it match the English word's meaning in this context?
2. **Clarity** — is the Arabic clear and unambiguous?
3. **Completeness** — does it capture the full meaning, not just one aspect?
4. **Appropriateness for CEFR {level}** — is the Arabic at the right complexity for the level?
5. **Translation quality** — is it natural Saudi/Modern Standard Arabic, not awkward literal translation?

Respond with VALID JSON only, no preamble:
{{
  "best_id": "<the id of the best definition>",
  "confidence": "high" | "medium" | "low",
  "reasoning": "<one sentence in English>",
  "should_merge_examples": true | false,
  "ranking": ["<id_best>", "<id_2nd>", ...]
}}

Use confidence "high" when one definition is clearly superior.
Use "medium" when 2 are roughly equal.
Use "low" when none are good or you can't decide."""

# ── Process groups ─────────────────────────────────────────────────────────
results = []  # (key, entries, claude_result)
auto_merge = []  # high confidence
flagged = []  # medium/low/error
errors = []

total_groups = len(merge_groups)
processed = 0
auto_merged_count = 0
flagged_count = 0
error_count = 0

print(f"\n{'='*60}")
print(f"PROCESSING {total_groups} MERGE GROUPS VIA CLAUDE API")
print(f"{'='*60}\n")

for key, entries in merge_groups.items():
    processed += 1
    reading_id, word, pos = key

    prompt = build_eval_prompt(key, entries)
    result = call_claude(prompt)

    if result is None:
        error_count += 1
        errors.append((key, entries, "API returned invalid JSON twice"))
        flagged.append((key, entries, {"confidence": "error", "reasoning": "API failed"}))
        print(f"  [{processed}/{total_groups}] ERROR: {word} ({pos})")
    elif result.get("confidence") == "high":
        auto_merged_count += 1
        auto_merge.append((key, entries, result))
    else:
        flagged_count += 1
        flagged.append((key, entries, result))

    # Progress update every 10 groups
    if processed % 10 == 0 or processed == total_groups:
        print(f"[Bucket B] Processed {processed}/{total_groups} groups | Auto-merge: {auto_merged_count} | Flagged: {flagged_count} | Errors: {error_count}")

    # Rate limiting: 1 second between calls
    if processed < total_groups:
        time.sleep(1)

# ── Save results ───────────────────────────────────────────────────────────
print(f"\n{'='*60}")
print("SAVING RESULTS")
print(f"{'='*60}\n")

# Save full results as JSON for reference
all_results = {
    "auto_merge": [
        {
            "word": key[1], "pos": key[2], "reading_id": key[0],
            "best_id": r["best_id"], "confidence": r["confidence"],
            "reasoning": r.get("reasoning", ""),
            "all_ids": [e["id"] for e in entries],
            "ids_to_delete": [e["id"] for e in entries if e["id"] != r["best_id"]]
        }
        for key, entries, r in auto_merge
    ],
    "flagged": [
        {
            "word": key[1], "pos": key[2], "reading_id": key[0],
            "confidence": r.get("confidence", "error"),
            "reasoning": r.get("reasoning", ""),
            "best_id": r.get("best_id", ""),
            "all_ids": [e["id"] for e in entries],
            "entries": [
                {"id": e["id"], "definition_ar": e.get("definition_ar", ""), "definition_en": e.get("definition_en", "")}
                for e in entries
            ]
        }
        for key, entries, r in flagged
    ],
    "singleton_keep": [{"id": e["id"], "word": e["word"]} for e in singleton_keep]
}

results_path = CLEANUP / "bucket-B-claude-results.json"
with open(results_path, "w", encoding="utf-8") as f:
    json.dump(all_results, f, ensure_ascii=False, indent=2)
print(f"Full results saved to: {results_path}")

# Save flagged groups as CSV for Ali
flagged_csv = CLEANUP / "bucket-B-flagged-for-ali.csv"
with open(flagged_csv, "w", encoding="utf-8-sig", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(["group_word", "group_pos", "reading_id", "vocab_id", "definition_ar", "definition_en",
                      "claude_confidence", "claude_reasoning", "claude_best_id", "keep_id_ali_decision"])
    for key, entries, r in flagged:
        for e in entries:
            writer.writerow([
                key[1], key[2], key[0], e["id"],
                e.get("definition_ar", ""), e.get("definition_en", ""),
                r.get("confidence", "error"), r.get("reasoning", ""),
                r.get("best_id", ""), ""
            ])
print(f"Flagged CSV saved to: {flagged_csv}")

# ── Generate SQL for auto-merges ──────────────────────────────────────────
# Collect all IDs to delete and mastery migration info
ids_to_delete = []
mastery_migrations = []  # (from_id, to_id) for mastery records

MASTERY_VOCAB_IDS = {"d1bdfd11-8cc9-4ac0-ad5f-bfb737b711f2", "74a57c91-1d73-4259-b655-49bebb10cb9e"}

for key, entries, r in auto_merge:
    best_id = r["best_id"]
    other_ids = [e["id"] for e in entries if e["id"] != best_id]
    ids_to_delete.extend(other_ids)

    # Check if any of the other_ids have mastery records
    for oid in other_ids:
        if oid in MASTERY_VOCAB_IDS:
            mastery_migrations.append((oid, best_id))

# Save deletion plan
delete_plan = CLEANUP / "bucket-B-auto-delete-ids.txt"
with open(delete_plan, "w") as f:
    f.write(",".join(f"'{i}'" for i in ids_to_delete))
print(f"\nAuto-delete IDs ({len(ids_to_delete)}) saved to: {delete_plan}")

# Save mastery migration plan
if mastery_migrations:
    print(f"\nMastery migrations needed: {len(mastery_migrations)}")
    for from_id, to_id in mastery_migrations:
        print(f"  Migrate mastery from {from_id} → {to_id}")

migration_path = CLEANUP / "bucket-B-mastery-migrations.json"
with open(migration_path, "w") as f:
    json.dump(mastery_migrations, f, indent=2)

# ── Final summary ─────────────────────────────────────────────────────────
print(f"\n{'='*60}")
print("BUCKET B PROCESSING COMPLETE")
print(f"{'='*60}")
print(f"Total groups: {total_groups}")
print(f"Auto-merged (high confidence): {auto_merged_count}")
print(f"Flagged for Ali (medium/low/error): {flagged_count}")
print(f"Errors (Claude API failed): {error_count}")
print(f"Singleton entries (kept, no merge needed): {len(singleton_keep)}")
print(f"")
print(f"Auto-merge entries to delete: {len(ids_to_delete)}")
print(f"Auto-merge entries to keep: {auto_merged_count}")
print(f"Mastery records to migrate: {len(mastery_migrations)}")
if mastery_migrations:
    for from_id, to_id in mastery_migrations:
        print(f"  from {from_id} → {to_id}")
print(f"")
print(f"Flagged groups saved to: bucket-B-flagged-for-ali.csv")
print(f"Auto-delete IDs saved to: bucket-B-auto-delete-ids.txt")
print(f"Full results saved to: bucket-B-claude-results.json")
