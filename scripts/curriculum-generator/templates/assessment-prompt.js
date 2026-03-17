export function buildAssessmentPrompt(unit, levelConfig) {
  return `Create a unit assessment quiz for Level ${unit.level_number} (${levelConfig.cefr}):
Unit theme: ${unit.theme_en}
Number of questions: ${levelConfig.assessment_questions}

The assessment should cover ALL skills from this unit:
- Reading comprehension (30%)
- Grammar (25%)
- Vocabulary (25%)
- Listening comprehension (10%)
- Writing (10% — short answer)

Questions should be at ${levelConfig.cefr} difficulty level.
The grammar focus for this level is: ${levelConfig.grammar_focus}
The vocabulary type is: ${levelConfig.vocabulary_type}

Return ONLY valid JSON:
{
  "title_en": "Unit ${unit.unit_number} Assessment: ${unit.theme_en}",
  "title_ar": "اختبار الوحدة ${unit.unit_number}: ${unit.theme_ar}",
  "time_limit_minutes": ${Math.round(levelConfig.assessment_questions * 1.5)},
  "passing_score_percent": 60,
  "questions": [
    {
      "question_number": 1,
      "skill": "reading|grammar|vocabulary|listening|writing",
      "type": "mcq|true_false|fill_blank|short_answer|reorder",
      "question_text": "string",
      "options": ["A", "B", "C"${levelConfig.mcq_choices >= 4 ? ', "D"' : ''}],
      "correct_answer": "string",
      "points": 1,
      "explanation_ar": "Arabic explanation"
    }
  ],
  "total_points": ${levelConfig.assessment_questions}
}`;
}
