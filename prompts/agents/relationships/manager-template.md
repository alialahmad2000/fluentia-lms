# Vocabulary Relationships Generator — Shared Template

## Task
Read `scripts/agent-batches/batch-{N}.json` and generate synonyms + antonyms
for every word in the batch, writing the output to
`scripts/agent-batches/batch-{N}.result.json`.

## Input Format
Each entry in `batch-{N}.json`:
```json
{ "id": "uuid", "word": "furious", "level": 4, "part_of_speech": "adjective",
  "definition_en": "...", "definition_ar": "..." }
```

## Output Format
Write an array to `batch-{N}.result.json`, one entry per input word:
```json
[
  {
    "id": "uuid-of-source-word",
    "synonyms": [
      { "word": "angry",    "level": 1 },
      { "word": "mad",      "level": 1 },
      { "word": "enraged",  "level": 4 }
    ],
    "antonyms": [
      { "word": "calm",     "level": 2 },
      { "word": "peaceful", "level": 2 }
    ]
  }
]
```

The loader script will handle `vocabulary_id` linking and `is_strongest`
flagging automatically, so your output only needs `word` + `level`.

## Rules
1. **Exactly 3 synonyms** per word (fewer only if the word truly has fewer)
2. **2-3 antonyms** per word (0 allowed for words with no antonym, e.g. "table")
3. **CEFR levels: 1-5** (never 0, never 6+)
4. **Quality over quantity**: each synonym must genuinely share ≥80% meaning in
   at least one context. No loose associations.
5. **Level accuracy** via CEFR-J knowledge: `happy`=L1, `joyful`=L2, `elated`=L4,
   `ecstatic`=L5. If unsure, bias toward commonly-taught level.
6. **POS match**: synonym must share part of speech with the original word
7. **No self-reference**: the word itself can't be its own synonym
8. **No duplicates** within synonyms or antonyms arrays
9. If a word has no good synonyms (e.g. proper nouns, highly technical terms),
   output an empty array `[]`. Same for antonyms.

## Process
1. Read `scripts/agent-batches/batch-{N}.json` (use Read tool)
2. For each word, apply your linguistic knowledge to generate the relationships
3. Collect all results into one array matching the output format
4. Write the full array to `scripts/agent-batches/batch-{N}.result.json`
   (use Write tool)
5. Report: total words processed, any words where you returned empty arrays

## Important
- NO external API calls — use your own linguistic knowledge only
- Do NOT write to the database — the loader script handles that
- Do NOT modify any other files
