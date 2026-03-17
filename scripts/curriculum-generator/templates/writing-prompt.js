export function buildWritingPrompt(unit, levelConfig) {
  const taskGuide = {
    0: 'Simple paragraph, personal response',
    1: 'Simple paragraph, personal response',
    2: 'Short essay or structured paragraph',
    3: 'Opinion essay or comparison',
    4: 'Argumentative essay or analysis',
    5: 'Critical essay or research-based writing',
  };

  return `Create a writing task for Level ${unit.level_number} (${levelConfig.cefr}):
Unit theme: ${unit.theme_en}
Word limit: ${levelConfig.writing_word_limit.min}-${levelConfig.writing_word_limit.max} words

The task should:
- Be achievable at ${levelConfig.cefr} level
- Connect to the unit theme "${unit.theme_en}"
- Have clear instructions in both English and Arabic
- Include a model structure (outline)
- Define grading criteria
- Task style: ${taskGuide[unit.level_number] || 'essay'}

Return ONLY valid JSON:
{
  "task_type": "paragraph|email|essay|opinion|comparison|argument|analysis",
  "prompt_en": "The writing task instructions in English",
  "prompt_ar": "Task instructions in Arabic",
  "word_limit": { "min": ${levelConfig.writing_word_limit.min}, "max": ${levelConfig.writing_word_limit.max} },
  "structure_guide": ["Step 1: ...", "Step 2: ..."],
  "useful_phrases": ["phrase 1", "phrase 2"],
  "grading_criteria": [
    { "criterion": "string", "weight_percent": 25, "description": "string" }
  ],
  "model_outline": "A brief outline of what a good response looks like"
}`;
}
