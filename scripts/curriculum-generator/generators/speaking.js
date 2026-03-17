import { buildSpeakingPrompt } from '../templates/speaking-prompt.js';
import { validateSpeaking } from '../validators.js';

export async function generateSpeaking(unit, config, claude, db, dryRun) {
  const levelConfig = config.levels[unit.level_number];
  const prompt = buildSpeakingPrompt(unit, levelConfig);

  const result = await claude.generate(prompt, {
    max_tokens: 4096,
    type: 'speaking',
    unit_id: unit.id,
  });

  validateSpeaking(result);

  if (!dryRun) {
    await db.upsertSpeaking(unit.id, result);
  }

  return result;
}
