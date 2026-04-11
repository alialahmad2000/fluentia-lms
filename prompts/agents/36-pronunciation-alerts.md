# PROMPT 36: Pronunciation Alerts

## 🎯 Goal
Warn students about tricky pronunciation for every vocabulary word that has a genuine trap (silent letters, unexpected sounds, stress issues, ESL-specific confusions). Each alert is individually written in Arabic with specific explanation — NO templates, NO blanket rules.

## 🔍 Discovery (DO FIRST)
```bash
grep -rn "CREATE TABLE.*vocabulary\b" supabase/migrations/
find src/components/vocabulary -type f -name "*.jsx"
```

## 🗄️ Migration: `add_pronunciation_alerts.sql`

```sql
ALTER TABLE vocabulary
  ADD COLUMN IF NOT EXISTS pronunciation_alert JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pronunciation_generated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_vocab_pronunciation_pending
  ON vocabulary(id) WHERE pronunciation_generated_at IS NULL;
```

Apply: `npx supabase db push --linked`

## 📋 JSON Schema

For words with NO trap: `pronunciation_alert = NULL`

For words with a trap:
```json
{
  "has_alert": true,
  "severity": "high",
  "ipa": "/naɪt/",
  "common_mispronunciation_ar": "كاي-نايت (غلط)",
  "correct_approximation_ar": "نايت",
  "problem_letters": [0],
  "rule_category": "silent_k_before_n",
  "explanation_ar": "حرف K صامت تماماً قبل N في بداية الكلمة. قاعدة: K قبل N = احذف K من نطقك. هذا يربك المتعلم العربي لأن في العربية كل حرف يُنطق.",
  "similar_words": ["knee", "know", "knife"],
  "practice_tip_ar": "احذف K من ذهنك ونطقها مباشرة كأنها تبدأ بـ N."
}
```

**Severity levels:**
- `high` — completely silent letter or flipped sound (knight, colonel, Wednesday)
- `medium` — subtle trap ESL learners often miss (comfortable=3 syllables, chocolate=2)
- `low` — minor issue worth noting (stress shift in photograph/photography)

## 🤖 Single-Agent Sequential Generation

ONE Claude Code agent processes the entire vocabulary table in order, batching by **50 words** (most words have NO alert, so processing is fast) and committing progress between batches.

### Why single-sequential

Context, discovery, and rules are loaded ONCE for the entire run. Each batch is just: query → reason → update → commit → next. ~80-90% reduction in token usage compared to spawning many independent agents.

### Generator helper script

`scripts/generate-pronunciation.cjs` is a small DB/progress helper (NOT a generator — Claude itself generates the content):

- `node scripts/generate-pronunciation.cjs --fetch 50` → prints next 50 pending words as JSON to stdout
- `node scripts/generate-pronunciation.cjs --apply <result.json>` → batch-updates vocabulary rows from a result file
- `node scripts/generate-pronunciation.cjs --status` → prints `{ total, done, pending }` counts

### Processing Loop

The agent runs this loop until no pending rows remain:

1. **Query pending work** (batch size 50):
   ```bash
   node scripts/generate-pronunciation.cjs --fetch 50 > /tmp/pron-batch.json
   ```
   Result format: `[{ id, word, level, meaning_en, meaning_ar, pos }, ...]`
   If empty → loop is done, jump to step 5.

2. **Generate alerts for all 50 words in a single reasoning pass.** For EACH word, make individual linguistic judgment: does this word have a pronunciation trap for ESL learners (Arab learners specifically)? If yes, write an individual Arabic explanation. If no, set `pronunciation_alert: null`. Use Claude's own linguistic knowledge — NO external API.

   Output a JSON array with one entry per input word:
   ```json
   [
     { "id": "uuid-from-input", "pronunciation_alert": null },
     { "id": "uuid-from-input", "pronunciation_alert": { "has_alert": true, ... } },
     ...
   ]
   ```

   ### CRITICAL Rules
   - NO BLANKET RULES. Each word gets individual analysis.
   - NO TEMPLATED EXPLANATIONS. Write each explanation naturally.
   - If the word is phonetically regular, set `pronunciation_alert: null`. Don't invent problems.
   - Expected alert rate: 20-35% of words

   ### Per-word process

   #### Step 1: Ask yourself — does this word trap ESL/Arab learners?

   Think carefully about:

   **Silent letters:**
   - Silent K before N (knee, knight, knock, knife)
   - Silent B after M at end (thumb, comb, tomb, climb, lamb, dumb)
   - Silent W before R at start (write, wrong, wrist, wrap, wreck)
   - Silent L (could, should, would, walk, talk, half, calf, palm)
   - Silent H (hour, honest, honor, heir)
   - Silent P before S/N/T at start (psychology, pneumonia, pterodactyl)
   - Silent T in castle, listen, whistle, often (optional)
   - Silent D (Wednesday, sandwich, handsome)
   - Silent GH (though, through, daughter, high, night, light)

   **Unexpected sounds:**
   - colonel → "kernel"
   - choir → "kwire"
   - yacht → "yot"
   - queue → just "kyoo"
   - Arkansas → "ARK-an-saw"

   **-ough variants (7 different sounds):**
   - through = /uː/
   - though = /oʊ/
   - thought = /ɔː/
   - tough = /ʌf/
   - cough = /ɒf/
   - bough = /aʊ/
   - hiccough = /ʌp/

   **Stress traps:**
   - comfortable = 3 syllables (KUMF-tuh-bul) not 4
   - vegetable = 3 syllables (VEJ-tuh-bul) not 4
   - chocolate = 2 syllables (CHOK-lit) not 3
   - interesting = 3 syllables (IN-tres-ting) not 4

   **Arab-specific confusions:**
   - TH sounds — Arab learners often say /s/ or /z/ instead of /θ/ or /ð/ (think, this, thank)
   - V vs F — often merged ("very" → "fery")
   - P vs B — often merged ("people" → "beoble")
   - Schwa ə in unstressed syllables — often over-pronounced

   **-ed endings:**
   - /t/ after voiceless: walked, talked, kissed
   - /d/ after voiced: played, loved, judged
   - /ɪd/ after t/d: wanted, needed, started

   #### Step 2: If NO trap → set `pronunciation_alert: null`. Move on.
   Examples of words that DON'T need alerts: cat, dog, table, happy, friend, book, water, red. Any regular phonetic word ESL learners will pronounce correctly.

   #### Step 3: If YES trap → write individual explanation
   For each alert, provide:
   1. **severity** — high/medium/low
   2. **ipa** — accurate IPA transcription
   3. **correct_approximation_ar** — Arabic letters approximating correct sound
   4. **common_mispronunciation_ar** — the wrong way ESL learners typically say it
   5. **problem_letters** — 0-based character indices of problem letters
   6. **rule_category** — slug: `silent_k_before_n`, `silent_b_after_m`, `ough_variant`, `stress_shift`, `th_sound`, `exceptional`, etc.
   7. **explanation_ar** — 2-3 sentences in natural Arabic explaining which letter(s) are problematic, why it's tricky for Arabic speakers specifically, a memory aid or rule
   8. **similar_words** — 2-3 English words with the same pattern
   9. **practice_tip_ar** — one concrete tip for mastering the pronunciation

   ### Quality Standards
   - Every explanation is INDIVIDUALLY WRITTEN for that word
   - Natural conversational Arabic, not literal translations
   - Reference the student's Arabic background specifically when relevant
   - Don't repeat phrases across words — each explanation is unique

   Save the result array to `/tmp/pron-batch.result.json`.

3. **Apply the batch update:**
   ```bash
   node scripts/generate-pronunciation.cjs --apply /tmp/pron-batch.result.json
   ```

   The helper:
   - Validates each entry
   - Normalizes `pronunciation_alert` (or sets it to NULL)
   - Updates each row: `pronunciation_alert`, `pronunciation_generated_at = NOW()`
   - Verifies with `.select()` after the batch
   - Reports `{ updated, alerts_created, null_alerts, skipped, failed }`

4. **Commit progress** (no push):
   ```bash
   git add -A
   git commit -m "chore(pronunciation): processed words N-M"
   ```
   where N-M is the index range printed by the helper.

5. **Loop back to step 1** until `--fetch` returns an empty array.

6. **Final verification:**
   ```bash
   node scripts/verify-pronunciation.cjs
   ```

7. **Final commit + push:** see `📝 Git Commit (final)` below.

### Verification Script

`scripts/verify-pronunciation.cjs` already exists. It:
- Counts: total, with alerts, null alerts, still pending
- Alert rate should be 20-35% (flag if outside range)
- Random samples 20 alerts → prints for manual quality review
- Flags any `explanation_ar` shorter than 50 chars (likely too terse)
- Flags any alert missing `similar_words` or `practice_tip_ar`
- Checks severity distribution (expect ~30% high, ~50% medium, ~20% low)
- Flags duplicate explanation_ar text (would indicate templates being used)

Run: `node scripts/verify-pronunciation.cjs`

## 🎨 UI Component

### Create `src/components/vocabulary/PronunciationAlert.jsx`

Props: `alert: Object | null`

If `alert === null`, render nothing.

### Layout
```
┌───────────────────────────────────────────┐
│ ⚠️ انتبه للنطق!              [high]        │
│                                            │
│   k̶night        /naɪt/                    │
│                                            │
│   🔊 الصحيح:  نايت                         │
│   ❌ الخطأ:   كاي-نايت                     │
│                                            │
│  💡 حرف K صامت تماماً قبل N في بداية      │
│     الكلمة. قاعدة: K قبل N = احذف K.      │
│     هذا يربك المتعلم العربي لأن في         │
│     العربية كل حرف يُنطق.                  │
│                                            │
│  📝 احذف K من ذهنك ونطقها مباشرة كأنها    │
│     تبدأ بـ N.                             │
│                                            │
│  🔗 كلمات مشابهة: knee · know · knife      │
└───────────────────────────────────────────┘
```

### Styling
- High severity: `bg-amber-950/30 border-l-4 border-amber-500 rounded-r-xl p-4`
- Medium severity: `bg-yellow-950/20 border-l-4 border-yellow-500 rounded-r-xl p-4`
- Low severity: `bg-slate-800/40 border-l-4 border-slate-500 rounded-r-xl p-4`
- Word display: render each letter; problem_letters indices get `text-rose-400 line-through`
- IPA: `font-mono text-slate-300 text-sm`
- Correct approximation: `text-emerald-300 font-semibold text-lg`
- Wrong approximation: `text-rose-400 line-through`
- Explanation: `text-slate-200 leading-relaxed`
- Practice tip: `text-slate-300 italic`
- Similar words as chips: `bg-slate-800 text-slate-300 rounded-md px-2 py-1 text-xs hover:bg-slate-700`
- Severity badge top-right: matches severity color

### Play Audio Button
Tap "🔊 الصحيح" → plays audio via existing ElevenLabs integration. If audio not yet available for the word, hide the button.

## 🔗 Integration Points

Mount `<PronunciationAlert />` in:
1. **Flashcard back** — below example sentence, ABOVE synonyms/antonyms
2. **Vocabulary detail modal** — dedicated section near the top
3. **Anki review card back** — for HIGH severity alerts, show BEFORE meaning (prominence); for medium/low, show in normal position
4. **Quiz result screen** — only for words the student got WRONG (teaching moment)

Order on card back:
1. Arabic meaning
2. Example sentence
3. **Pronunciation Alert (if exists)** ← prominent
4. Synonyms/Antonyms (Prompt 31)
5. Word Family (Prompt 35)

## 🚫 What NOT to Change
- ❌ Do NOT modify word_family or synonyms columns
- ❌ Do NOT use blanket rules or templates
- ❌ Do NOT invent problems for regular words
- ❌ Do NOT run `vite build` locally
- ❌ Do NOT spawn sub-agents — this prompt is intentionally single-sequential

## ✅ Integration Test

1. Run `--fetch 50` → verify a JSON batch comes back
2. Generate one batch → run `--apply` → verify alerts created for ~20-35% of batch
3. Open LMS → find a word with known silent letter (e.g. "know")
4. Flashcard back shows PronunciationAlert with K highlighted in red strikethrough
5. Arabic explanation visible and natural
6. Test regular word (e.g. "table") → NO alert shown
7. Test high-severity word on Anki review → alert appears BEFORE meaning
8. Test on mobile → alert card renders correctly
9. Click similar word chips → (future navigation) at minimum no errors
10. Run `verify-pronunciation.cjs` → alert rate 20-35%, no templates, no too-terse explanations

## 🏃 How Ali Runs It

Open ONE Claude Code tab and run:

```
Read and execute prompts/agents/36-pronunciation-alerts.md
```

The agent loops internally through all batches of 50 until no pending rows remain.

## 📝 Git Commit (final)

```bash
cd C:\Users\Dr. Ali\Desktop\fluentia-lms

git add -A
git commit -m "feat(vocabulary): pronunciation alerts with individual Arabic explanations

- Added pronunciation_alert JSONB column
- Generated per-word via single sequential agent with manual linguistic judgment
- Each alert has IPA, correct/wrong Arabic approximation, problem letters,
  individual explanation, practice tip, and similar words
- Severity scale (high/medium/low) drives UI prominence
- Targets ESL-specific traps: TH sounds, V/F, P/B, silent letters,
  ough variants, stress shifts
- New PronunciationAlert component with red strikethrough on problem letters
- High-severity alerts appear BEFORE meaning on Anki review back
- Integrated into flashcard, detail modal, Anki review, quiz results

Part of Session 19 vocabulary overhaul."

git push origin main
git fetch origin
git log --oneline -1 HEAD
git log --oneline -1 origin/main
```

## ✅ Definition of Done
- [ ] Migration applied
- [ ] Single-agent loop ran to completion (helper `--status` reports `pending: 0`)
- [ ] Alert rate between 20-35%
- [ ] No templated explanations (verification script passes)
- [ ] No explanations shorter than 50 chars
- [ ] PronunciationAlert renders in all 4 integration points
- [ ] Problem letters shown with red strikethrough
- [ ] High-severity alerts appear before meaning on Anki back
- [ ] Similar words chips render correctly
- [ ] Mobile layout works
- [ ] Pushed and deployed
