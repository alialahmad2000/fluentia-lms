export function buildIrregularVerbsPrompt(verbList, levelConfig) {
  return `Create irregular verb content for Level ${levelConfig.cefr}:
Verbs for this level: ${verbList.join(', ')}

For each verb provide all three forms, Arabic meaning, and example sentences.
Then create ${Math.max(6, verbList.length)} practice exercises mixing different types.

Return ONLY valid JSON:
{
  "verbs": [
    {
      "base": "string",
      "past": "string",
      "past_participle": "string",
      "meaning_ar": "Arabic meaning",
      "example_present": "Example sentence using base form",
      "example_past": "Example sentence using past form",
      "example_perfect": "Example sentence using past participle"
    }
  ],
  "exercises": [
    {
      "type": "fill_form|choose_correct|sentence_complete|error_find",
      "question": "string",
      "correct_answer": "string",
      "options": ["option1", "option2", "option3"],
      "explanation_ar": "Arabic explanation"
    }
  ]
}`;
}
