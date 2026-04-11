# Agent 01: Pronunciation Alert Generator

## Task
Read `scripts/pronunciation-batches/batch-01.json`. For EACH word, decide whether it contains a known English pronunciation pattern that ESL learners frequently get wrong. If yes, write a unique Arabic-language explanation. If no, set the alert to `null`.

Write your result to `scripts/pronunciation-batches/batch-01.result.json`.

## Rules
- Each word gets individual analysis. No copy-pasted explanations.
- If the word is phonetically regular for an English learner, set `pronunciation_alert` to `null`.
- Target: about 20–35% of words should have alerts.
- Output is a file only. Do not call any database, run builds, or commit.

## Input format (`batch-01.json`)
```json
[
  {
    "id": "uuid",
    "word": "knight",
    "level": 3,
    "meaning_en": "...",
    "meaning_ar": "...",
    "part_of_speech": "noun",
    "pronunciation_ipa": "/naɪt/"
  }
]
```

## Output format (`batch-01.result.json`)
Same order as input, one entry per word:
```json
[
  { "id": "uuid", "word": "knight", "pronunciation_alert": { ...alert object... } },
  { "id": "uuid", "word": "table",  "pronunciation_alert": null }
]
```

## Alert object schema
```json
{
  "has_alert": true,
  "severity": "high" | "medium" | "low",
  "ipa": "/naɪt/",
  "common_mispronunciation_ar": "كاي-نايت",
  "correct_approximation_ar": "نايت",
  "problem_letters": [0],
  "rule_category": "silent_k_before_n",
  "explanation_ar": "حرف K صامت تماماً قبل N في بداية الكلمة. القاعدة: K قبل N = احذف K من نطقك.",
  "similar_words": ["knee", "know", "knife"],
  "practice_tip_ar": "احذف K من ذهنك ونطقها مباشرة كأنها تبدأ بـ N."
}
```

## Severity guide
- **high** — completely silent letter or unexpected sound (knight, colonel, Wednesday, yacht, choir)
- **medium** — syllable count or vowel that learners commonly miscount (comfortable = 3 syllables, chocolate = 2)
- **low** — minor stress shift or -ed ending nuance

## Patterns to watch for
- Silent K before N (knee, knight, knock, knife)
- Silent B after M at end (thumb, comb, tomb, climb, lamb)
- Silent W before R at start (write, wrong, wrist, wrap)
- Silent L (could, should, would, walk, talk, half, calf, palm)
- Silent H (hour, honest, honor, heir)
- Silent P before S/N (psychology, pneumonia)
- Silent T (castle, listen, whistle, often)
- Silent D (Wednesday, sandwich, handsome)
- Silent GH (though, through, daughter, high, night, light)
- Unexpected sound mappings (colonel→kernel, choir→kwire, yacht→yot, queue→kyoo)
- The seven -ough sounds (through, though, thought, tough, cough, bough, hiccough)
- Stress / syllable-count traps (comfortable, vegetable, chocolate, interesting)
- Voiced vs voiceless TH (think vs this) — common for many L2 learners
- -ed ending sound: /t/ vs /d/ vs /ɪd/ depending on the prior sound
- Schwa ə in unstressed syllables

## Quality requirements
- `explanation_ar` must be at least 50 characters and individually written for that word
- No two `explanation_ar` strings should be identical
- `similar_words` should contain 2–3 real English words showing the same pattern
- Use natural Arabic, not literal translations from English

## Workflow
1. Read `scripts/pronunciation-batches/batch-01.json`
2. For each of the 196 words, decide null vs alert
3. Build a single array, same length and order as the input
4. Write it to `scripts/pronunciation-batches/batch-01.result.json`
5. Print a one-line summary

## Final report (your last message must be exactly this)
```
BATCH 01 COMPLETE
  total:        196
  alerts:       XX (XX.X%)
  null_alerts:  XX
  severity:     high=XX medium=XX low=XX
  output:       scripts/pronunciation-batches/batch-01.result.json
```
