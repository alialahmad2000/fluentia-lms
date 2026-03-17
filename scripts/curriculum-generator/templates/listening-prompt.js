export function buildListeningPrompt(unit, levelConfig) {
  const avgDuration = Math.round((levelConfig.listening_duration_sec.min + levelConfig.listening_duration_sec.max) / 2);
  const wordCount = Math.round(avgDuration * 150 / 60); // ~150 words per minute

  const formatGuide = {
    0: 'monologue (simple description or narration)',
    1: 'monologue (simple story or instructions)',
    2: 'dialogue (two people conversing naturally)',
    3: 'dialogue (discussion or interview)',
    4: 'lecture or interview (academic style)',
    5: 'lecture or interview (professional/academic)',
  };

  return `Create a listening exercise script for Level ${unit.level_number} (${levelConfig.cefr}):
Unit theme: ${unit.theme_en}
Duration: approximately ${avgDuration} seconds when read aloud (~${wordCount} words at 150 wpm)

The script should:
- Be natural spoken English (not written-style)
- Format: ${formatGuide[unit.level_number] || 'dialogue'}
- Include speaker labels if dialogue
- Be culturally appropriate for Saudi students (18-34, mostly women)
- ${levelConfig.sentence_complexity}

Return ONLY valid JSON:
{
  "script_type": "monologue|dialogue|lecture|interview|news_report",
  "speakers": ["Speaker name/label"],
  "script": "Full script with speaker labels (e.g., 'Sarah: Hello...')",
  "word_count": ${wordCount},
  "estimated_duration_sec": ${avgDuration},
  "comprehension_questions": [
    {
      "question": "string",
      "type": "detail|main_idea|inference",
      "options": ["A", "B", "C"],
      "correct_answer_index": 0,
      "explanation_ar": "Arabic explanation"
    }
  ],
  "key_vocabulary": ["words students should notice"]
}`;
}
