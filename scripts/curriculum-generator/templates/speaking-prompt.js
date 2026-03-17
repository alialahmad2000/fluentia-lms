export function buildSpeakingPrompt(unit, levelConfig) {
  return `Create a speaking topic for Level ${unit.level_number} (${levelConfig.cefr}):
Unit theme: ${unit.theme_en}
Preparation time: ${levelConfig.speaking_prep_time_sec} seconds
Response time: ${levelConfig.speaking_response_sec} seconds

The topic should be appropriate for young Saudi adults (18-34, mostly women) learning English.
It should connect to the unit theme and be achievable at ${levelConfig.cefr} level.

Return ONLY valid JSON:
{
  "topic_en": "The speaking topic/question in English",
  "topic_ar": "Arabic translation of the topic",
  "category": "personal|descriptive|opinion|compare|academic|debate",
  "preparation_tips_ar": ["Arabic tip 1 for preparing", "Arabic tip 2"],
  "guiding_questions": ["Sub-question 1 to help structure response", "Sub-question 2", "Sub-question 3"],
  "useful_vocabulary": ["relevant words/phrases for this topic"],
  "model_response_outline": "Brief outline of what a good response covers",
  "evaluation_focus": ["fluency", "vocabulary", "grammar", "pronunciation", "coherence"]
}`;
}
