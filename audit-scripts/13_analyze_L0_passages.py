"""
13_analyze_L0_passages.py
Analyze L0 reading passages against target metrics for rewriting decisions.
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PHASE2 = ROOT / "PHASE-2-CLEANUP"
DATA   = Path(__file__).resolve().parent / "data"

# ── helpers ──────────────────────────────────────────────────────────────────

def count_syllables(word: str) -> int:
    """Heuristic syllable count: vowel groups, minus trailing silent e, min 1."""
    word = word.lower()
    vowels = "aeiouy"
    count = 0
    prev_vowel = False
    for ch in word:
        if ch in vowels:
            if not prev_vowel:
                count += 1
            prev_vowel = True
        else:
            prev_vowel = False
    # subtract silent trailing e
    if word.endswith("e") and count > 1:
        count -= 1
    return max(count, 1)


def strip_asterisks(text: str) -> str:
    """Remove markdown *bold* markers."""
    return re.sub(r"\*([^*]+)\*", r"\1", text)


def extract_words(text: str) -> list[str]:
    """Return list of alphabetic-only tokens (lowered)."""
    return [w.lower() for w in re.findall(r"[A-Za-z]+", text)]


def count_sentences(text: str) -> int:
    """Count sentences by splitting on . ! ?"""
    sentences = re.split(r"[.!?]+", text)
    # filter out empty trailing splits
    return len([s for s in sentences if s.strip()])


def fkgl(words: list[str], sentence_count: int) -> float:
    if sentence_count == 0:
        return 0.0
    total_syllables = sum(count_syllables(w) for w in words)
    wc = len(words)
    return 0.39 * (wc / sentence_count) + 11.8 * (total_syllables / wc) - 15.59


# ── load data ────────────────────────────────────────────────────────────────

print("Loading schema cache …")
schema = json.loads((PHASE2 / "13-L0-schema-cache.json").read_text(encoding="utf-8"))

print("Loading vocab allowlist …")
allowlist_data = json.loads((PHASE2 / "L0-vocab-allowlist.json").read_text(encoding="utf-8"))
# Build combined set from all keys
allowlist = set(allowlist_data.get("combined", []))
# Also merge vocab_words and function_words in case combined is incomplete
allowlist |= set(allowlist_data.get("vocab_words", []))
allowlist |= set(allowlist_data.get("function_words", []))
allowlist = {w.lower() for w in allowlist}
print(f"  Allowlist size: {len(allowlist)} words")

print("Loading readings …")
raw = (DATA / "readings_full.json").read_text(encoding="utf-8")
# Strip preamble before first '{'
idx = raw.index("{")
raw = raw[idx:]
readings_data = json.loads(raw)
rows = readings_data["rows"]
print(f"  Total readings: {len(rows)}")

# ── filter L0 ────────────────────────────────────────────────────────────────

l0_rows = [r for r in rows if r["level_number"] == 0]
print(f"  L0 readings: {len(l0_rows)}\n")

# ── targets ──────────────────────────────────────────────────────────────────

TARGETS = {
    "word_count":  {"soft": (80, 150), "hard": (70, 160)},
    "fkgl":        {"soft": (0.5, 2.5), "hard": (0.0, 3.0)},
    "avg_sent_len": {"soft": (0, 10),   "hard": (0, 12)},
    "oov_pct":     {"soft": (0, 0),     "hard": (0, 0)},
}


def check_range(value, soft, hard):
    """Return 'OK', 'WARN' (outside soft but inside hard), or 'FAIL'."""
    if soft[0] <= value <= soft[1]:
        return "OK"
    if hard[0] <= value <= hard[1]:
        return "WARN"
    return "FAIL"


# ── analyze ──────────────────────────────────────────────────────────────────

needs_rewrite = []
results = []

for r in l0_rows:
    paragraphs = r["passage_content"]["paragraphs"]
    full_text = strip_asterisks(" ".join(paragraphs))
    words = extract_words(full_text)
    word_count = len(words)
    sentence_count = count_sentences(full_text)
    avg_sent_len = word_count / sentence_count if sentence_count else 0
    grade = fkgl(words, sentence_count)

    oov = sorted(set(w for w in words if w not in allowlist))
    oov_pct = (len([w for w in words if w not in allowlist]) / word_count * 100) if word_count else 0

    # Check against targets
    wc_status = check_range(word_count, TARGETS["word_count"]["soft"], TARGETS["word_count"]["hard"])
    fk_status = check_range(grade, TARGETS["fkgl"]["soft"], TARGETS["fkgl"]["hard"])
    sl_status = check_range(avg_sent_len, TARGETS["avg_sent_len"]["soft"], TARGETS["avg_sent_len"]["hard"])
    ov_status = "OK" if oov_pct == 0 else "FAIL"

    rewrite = any(s == "FAIL" for s in [wc_status, fk_status, sl_status, ov_status])
    if rewrite:
        needs_rewrite.append(r)

    result = {
        "id": r["id"],
        "unit": r["unit_number"],
        "label": r["reading_label"],
        "title": r["title_en"],
        "word_count": word_count,
        "wc_status": wc_status,
        "sentence_count": sentence_count,
        "avg_sent_len": round(avg_sent_len, 1),
        "sl_status": sl_status,
        "fkgl": round(grade, 2),
        "fk_status": fk_status,
        "oov_pct": round(oov_pct, 1),
        "ov_status": ov_status,
        "oov_words": oov,
        "rewrite": rewrite,
    }
    results.append(result)

# ── print results ────────────────────────────────────────────────────────────

print("=" * 100)
print(f"{'U':>2} {'L'} {'Title':<45} {'WC':>4} {'Sent':>4} {'ASL':>5} {'FKGL':>6} {'OOV%':>5}  Status")
print("-" * 100)

for res in sorted(results, key=lambda x: (x["unit"], x["label"])):
    flag = ">>> REWRITE" if res["rewrite"] else "    ok"
    statuses = f"{res['wc_status']}/{res['fk_status']}/{res['sl_status']}/{res['ov_status']}"
    print(
        f"{res['unit']:>2} {res['label']} {res['title']:<45} "
        f"{res['word_count']:>4} {res['sentence_count']:>4} {res['avg_sent_len']:>5} "
        f"{res['fkgl']:>6} {res['oov_pct']:>5}  {statuses:<20} {flag}"
    )
    if res["oov_words"]:
        print(f"      OOV: {', '.join(res['oov_words'])}")

# ── summary ──────────────────────────────────────────────────────────────────

print("\n" + "=" * 100)
print(f"SUMMARY")
print(f"  Total L0 passages: {len(results)}")
print(f"  Need rewriting:    {len(needs_rewrite)}  ({len(needs_rewrite)/len(results)*100:.0f}%)")
print(f"  Already OK:        {len(results) - len(needs_rewrite)}")

# Breakdown by failure type
wc_fail = sum(1 for r in results if r["wc_status"] == "FAIL")
fk_fail = sum(1 for r in results if r["fk_status"] == "FAIL")
sl_fail = sum(1 for r in results if r["sl_status"] == "FAIL")
ov_fail = sum(1 for r in results if r["ov_status"] == "FAIL")
print(f"\n  Failures by metric:")
print(f"    Word count out of hard range:   {wc_fail}")
print(f"    FKGL out of hard range:         {fk_fail}")
print(f"    Avg sentence length > 12:       {sl_fail}")
print(f"    Out-of-vocab > 0%:              {ov_fail}")

wc_warn = sum(1 for r in results if r["wc_status"] == "WARN")
fk_warn = sum(1 for r in results if r["fk_status"] == "WARN")
sl_warn = sum(1 for r in results if r["sl_status"] == "WARN")
print(f"\n  Warnings (outside soft, inside hard):")
print(f"    Word count:        {wc_warn}")
print(f"    FKGL:              {fk_warn}")
print(f"    Avg sentence len:  {sl_warn}")
