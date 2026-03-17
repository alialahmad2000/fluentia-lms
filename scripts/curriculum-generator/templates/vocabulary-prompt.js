export function buildVocabularyPrompt(passageText, targetWords, levelConfig) {
  return `Extract and enrich the ${targetWords.length} target vocabulary words from this passage:
---
${passageText}
Target words: ${targetWords.join(', ')}
---

For each word, provide detailed information appropriate for ${levelConfig.cefr} level learners who are Arabic speakers.

Return ONLY valid JSON:
{
  "words": [
    {
      "word": "string",
      "part_of_speech": "noun|verb|adjective|adverb|preposition|conjunction",
      "definition_en": "Clear, simple definition appropriate for ${levelConfig.cefr} level",
      "definition_ar": "Arabic translation/meaning",
      "example_in_passage": "The exact sentence from the passage containing this word",
      "example_new": "A NEW example sentence at ${levelConfig.cefr} level",
      "word_family": ["related forms: noun, verb, adjective, adverb if they exist"],
      "collocations": ["2-3 common word combinations"],
      "pronunciation_note": "Any tricky pronunciation for Arabic speakers (optional, null if none)",
      "common_mistake_ar": "Common error Arabic speakers make with this word (optional, null if none)"
    }
  ]
}`;
}

export function buildVocabExercisesPrompt(wordList, levelConfig) {
  return `Create ${levelConfig.vocabulary_exercises} vocabulary exercises for these words at Level ${levelConfig.cefr}:
Words: ${wordList.join(', ')}

Exercise types (mix them evenly):
- fill_blank: Sentence with word missing, student fills in
- match: Match word to definition
- choose: Choose the correct word for a given context
- word_form: Change the word form to fit the sentence
- odd_one_out: Which word doesn't belong in a group

Return ONLY valid JSON:
{
  "exercises": [
    {
      "type": "fill_blank|match|choose|word_form|odd_one_out",
      "instruction_en": "short instruction in English",
      "instruction_ar": "Arabic instruction",
      "question": "The exercise question/prompt",
      "options": ["option1", "option2", "option3"],
      "correct_answer": "string",
      "explanation_ar": "Arabic explanation of the answer"
    }
  ]
}`;
}
