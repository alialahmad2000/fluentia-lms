export function buildComprehensionPrompt(passageText, levelConfig) {
  return `Based on this reading passage:
---
${passageText}
---

Generate ${levelConfig.comprehension_questions} comprehension questions for Level ${levelConfig.cefr}:

Question types (mix them):
- Main idea (1-2 questions)
- Detail/specific information (2-3 questions)
- Vocabulary in context (1-2 questions)
- Inference (1-2 questions)
- Author's purpose (0-1 questions, only for level 2+)

Each question has ${levelConfig.mcq_choices} choices with exactly ONE correct answer.

For vocabulary-in-context questions: ask about the *marked* words from the passage.

Return ONLY valid JSON:
{
  "questions": [
    {
      "question_text": "string",
      "question_type": "main_idea|detail|vocabulary|inference|purpose",
      "choices": ["A", "B", "C"${levelConfig.mcq_choices >= 4 ? ', "D"' : ''}],
      "correct_answer_index": 0,
      "explanation_en": "Why this is correct (1 sentence)",
      "explanation_ar": "Arabic explanation for student"
    }
  ]
}`;
}
