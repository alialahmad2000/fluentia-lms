# VOCAB PREMIUM — PROMPT 02C — PRONUNCIATION ALERTS TRACK (L1 + L3)

> Parallel track C of 3. `pronunciation_alert` ONLY. Scoped to L1 and L3. Runs in its own Claude Code tab. Zero conflict with tracks A and B.

---

## 🎯 GOAL

For every L1 + L3 word, decide whether it needs a pronunciation alert for an Arabic-speaking learner. If yes, write a full alert JSON. If no, write `NULL` to the alert column but mark `pronunciation_checked_at` so the row is not re-processed on restart.

**Scope only**: `WHERE level IN (1, 3) AND pronunciation_checked_at IS NULL`

L0, L2, L4, L5 are out of scope.

Expected outcome: 20–35% of words get an alert object; the rest get NULL + checked-at timestamp.

---

## 🛠️ PRE-FLIGHT MIGRATION (idempotent)

Before the loop starts, ensure the marker column exists:

```sql
ALTER TABLE curriculum_vocabulary
ADD COLUMN IF NOT EXISTS pronunciation_checked_at TIMESTAMPTZ;
```

Apply via Supabase MCP `apply_migration` with a clean migration name like `add_pronunciation_checked_at`. Skip silently if it already exists.

---

## 🧭 INHERIT FROM PROMPT 02

Read `docs/vocab-section/PHASE-A-AUDIT.md` and `docs/vocab-section/PHASE-B-CHECKPOINT.md`.

The full schema and field rules from the original VOCAB-PREMIUM-02-ENRICHMENT-FILL.md (section B.4) apply unchanged:

```json
{
  "ipa": "/ˈnaɪt/",
  "correct_ar": "نايت",
  "wrong_ar": "كنايت",
  "problem_letters": [0],
  "explanation_ar": "<individually written Arabic explanation — no templates>",
  "practice_tip_ar": "<individually written tip>",
  "similar_words": ["knee", "know", "knife", "knock"],
  "severity": "high|medium|low",
  "rule_category": "silent_letter|th_sound|vowel_irregular|stress_shift|consonant_cluster|loan_false_friend|exception",
  "generated_at": "<ISO>",
  "model": "claude-code"
}
```

**Critical: this is the only track where Arabic prose is generated.** Each `explanation_ar` and `practice_tip_ar` must be written individually with linguistic judgment for that specific word. No templates. No "this word has a silent letter" → fill in blank. The 404 existing alerts in production set the quality bar — match it.

**Decide trap-vs-no-trap honestly.** A word like "cat" needs no alert (Arabic speakers pronounce it correctly). A word like "knight" needs `severity: high`. When in doubt → no alert. False alerts are worse than missing ones; they erode trust in the system.

---

## 🔁 LOOP

```
Pass 1: L1
  while count(L1 unchecked rows) > 0:
    fetch 30 rows ORDER BY id ASC
    for each word, decide: needs alert? yes -> generate JSON ; no -> NULL
    validate JSON shape for the "yes" cases
    UPDATE in single transaction:
      SET pronunciation_alert = <json or NULL>,
          pronunciation_checked_at = NOW()
      WHERE id = <id>
    git add -A && git commit -m "chore(vocab-enrich): pronunciation L1 batch ending id <last_id> (alerts: <n>/<30>)" && git push

Pass 2: L3
  same loop, level = 3
```

Commit message includes the alerts-per-batch count so Ali can see roughly what fraction of words trigger alerts (target 20–35%; if a batch shows >70% or <10%, investigate — the trap detection is probably off-calibration).

---

## 📊 RESUME-STATUS PRINT (on startup)

```
=== Pronunciation Alerts Track — L1 + L3 ===
L1 checked: <done>/<total>  remaining: <unchecked_count>
   alerts written so far: <n>  (<pct>%)
L3 checked: <done>/<total>  remaining: <unchecked_count>
   alerts written so far: <n>  (<pct>%)
Next: L1 batch starting at id <next_id>
============================================
```

---

## 🛑 STOP CONDITIONS

- Both L1 and L3 reach zero unchecked rows
- 50 consecutive successful batches → midpoint note, continue
- Context limit approaching → clean checkpoint, exit
- 3 consecutive validation failures → stop and report
- Alert rate goes wildly off-target (>60% or <8%) for 3 consecutive batches → stop, report, and dump 10 sample words from the last failing batch with the agent's yes/no decision and reasoning. The judgment is drifting and needs human review before continuing.

---

## 📁 OUTPUT ARTIFACTS

- Commits: `chore(vocab-enrich): pronunciation L<n> batch ending id <id> (alerts: <n>/<30>)`
- On completion: append `## Track C — Pronunciation — COMPLETE (L1 + L3)` to `PHASE-B-CHECKPOINT.md` with total checked, total alerts written, alert rate %, rule_category distribution, severity distribution.
- On checkpoint exit: append `## Track C — Pronunciation — checkpoint <ISO>` with last batch id + remaining counts + alert rate so far.

```bash
git add docs/vocab-section/PHASE-B-CHECKPOINT.md
git commit -m "docs(vocab-enrich): track C pronunciation checkpoint"
git push origin main
```

---

## ⚠️ HARD RULES

1. L1 + L3 ONLY.
2. Add the `pronunciation_checked_at` column at startup (idempotent).
3. Idempotency filter is `WHERE pronunciation_checked_at IS NULL` — NOT `WHERE pronunciation_alert IS NULL` (because legitimate NULLs mean "no alert needed for this word").
4. Every Arabic prose field is individually written. No copy-paste. No templated phrasing across multiple words.
5. When unsure if a word has a real trap → no alert. Bias toward fewer, higher-quality alerts.
6. Commit + push per batch.

Begin.
