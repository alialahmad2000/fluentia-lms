import { buildGrammarPrompt } from '../templates/grammar-prompt.js';
import { validateGrammar } from '../validators.js';

export async function generateGrammar(unit, config, claude, db, dryRun) {
  const levelConfig = config.levels[unit.level_number];
  const grammarTopics = config.grammarMapping[unit.level_number] || [];
  const topicIndex = (unit.unit_number - 1) % grammarTopics.length;
  const grammarTopic = grammarTopics[topicIndex] || `Grammar topic ${unit.unit_number}`;

  const prompt = buildGrammarPrompt(grammarTopic, unit, levelConfig);

  const result = await claude.generate(prompt, {
    max_tokens: 4096,
    type: 'grammar',
    unit_id: unit.id,
  });

  validateGrammar(result, levelConfig);

  if (!dryRun) {
    const grammarId = await db.upsertGrammar(unit.level_id, unit.id, result);
    if (result.exercises?.length) {
      await db.upsertGrammarExercises(grammarId, result.exercises);
    }
  }

  return result;
}
