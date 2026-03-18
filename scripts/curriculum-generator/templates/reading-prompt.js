export function buildReadingPrompt(unit, slot, levelConfig) {
  return `You are an expert English language content creator for a Saudi Arabian English academy.

Generate an ORIGINAL reading passage for:
- Level: ${unit.level_number} (${levelConfig.cefr})
- Unit: ${unit.unit_number} of 12
- Unit Theme: ${unit.theme_en} / ${unit.theme_ar}
- Reading: ${slot.toUpperCase()} (each unit has 2 readings)
- Word count: MINIMUM ${levelConfig.reading_words.min} words, target ${levelConfig.reading_words.max} words. CRITICAL: You MUST write at least ${levelConfig.reading_words.min} words. Count carefully. Shorter passages will be rejected.

STYLE REQUIREMENTS:
- Written like a National Geographic article — informative, engaging, real-world topics
- Appropriate for young Saudi adults (18-34, mostly women)
- Culturally sensitive — respectful of Saudi/Islamic culture
- NO controversial political, religious, or sexual content
- Include factual information (real places, real science, real statistics where possible)
- ${levelConfig.sentence_complexity}

STRUCTURE:
- Title (engaging, 3-7 words)
- Optional subtitle (1 line)
- 3-5 paragraphs depending on length
- Each paragraph has a clear topic sentence
- Include 1-2 interesting facts or statistics

VOCABULARY INTEGRATION:
- Naturally embed ${levelConfig.vocabulary_per_reading} target vocabulary words (mark them with *asterisks*)
- Vocabulary should be: ${levelConfig.vocabulary_type}
- Words should be inferable from context (context clues strategy)

Reading A focus: introduces the unit theme broadly
Reading B focus: explores a specific aspect or angle of the same theme
This is Reading ${slot.toUpperCase()}.

Return ONLY valid JSON:
{
  "title": "string",
  "subtitle": "string or null",
  "content": "Full passage text with *target words* marked",
  "word_count": number,
  "target_vocabulary": ["word1", "word2", ...],
  "reading_skill_focus": "main idea / detail / inference / vocabulary in context / etc.",
  "critical_thinking_question": "One higher-order question about the passage"
}`;
}
