export function buildGrammarPrompt(grammarTopic, unit, levelConfig) {
  return `Create a grammar lesson for Level ${unit.level_number} (${levelConfig.cefr}):
Grammar topic: ${grammarTopic}
Unit theme: ${unit.theme_en} (use theme-related examples)

Create:
1. A clear explanation in ENGLISH with ARABIC support notes
2. ${levelConfig.grammar_exercises} practice exercises

The explanation should:
- Start with 2-3 clear example sentences
- Explain the rule simply (appropriate for ${levelConfig.cefr})
- Show the pattern/formula
- Include a "common mistakes" section (especially for Arabic speakers)
- Use the unit theme "${unit.theme_en}" in examples where natural

Return ONLY valid JSON:
{
  "topic": "${grammarTopic}",
  "explanation_en": "Full grammar explanation in English (HTML allowed: <b>, <i>, <br>)",
  "explanation_ar": "Key points in Arabic (complementary, not full translation)",
  "formula": "Pattern/formula (e.g., Subject + was/were + verb-ing)",
  "examples": [
    { "sentence": "string", "translation_ar": "string", "highlight": "the grammar part to highlight" }
  ],
  "common_mistakes": [
    { "wrong": "string", "correct": "string", "explanation_ar": "why in Arabic" }
  ],
  "exercises": [
    {
      "type": "fill_blank|choose|reorder|transform|error_correction",
      "question": "string",
      "options": ["if applicable, otherwise empty array"],
      "correct_answer": "string",
      "explanation_ar": "Arabic explanation"
    }
  ]
}`;
}
