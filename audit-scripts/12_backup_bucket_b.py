"""
12_backup_bucket_b.py
Backs up Bucket B vocabulary rows before merge.
Reads Bucket B IDs and filters vocabulary_full.json to produce a pre-merge backup.
"""

import json
import os
import re

# Paths
IDS_FILE = os.path.join(os.path.dirname(__file__), "..", "PHASE-2-CLEANUP", "_bucket_b_ids.txt")
VOCAB_FILE = os.path.join(os.path.dirname(__file__), "data", "vocabulary_full.json")
OUTPUT_FILE = os.path.join(
    os.path.dirname(__file__), "..", "PHASE-2-CLEANUP", "backups",
    "2026-04-08-0300", "bucket-B-pre-merge.json"
)

# 1. Read and parse Bucket B IDs (comma-separated single-quoted UUIDs)
with open(IDS_FILE, "r", encoding="utf-8") as f:
    raw = f.read().strip()

bucket_b_ids = set(re.findall(r"'([^']+)'", raw))
print(f"Bucket B IDs loaded: {len(bucket_b_ids)}")

# 2. Read vocabulary JSON (has a wrapper with "rows" key)
with open(VOCAB_FILE, "r", encoding="utf-8") as f:
    # Skip the first line if it's not valid JSON (e.g. "Initialising login role...")
    content = f.read()
    # Find the start of the JSON object
    json_start = content.index("{")
    data = json.loads(content[json_start:])

rows = data.get("rows", data) if isinstance(data, dict) else data

# 3. Filter to Bucket B entries
filtered = [row for row in rows if row.get("id") in bucket_b_ids]
print(f"Matched vocabulary rows: {len(filtered)}")

# 4. Write backup
os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(filtered, f, indent=2, ensure_ascii=False)

print(f"Backup written to: {os.path.abspath(OUTPUT_FILE)}")
