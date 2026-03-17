import { buildListeningPrompt } from '../templates/listening-prompt.js';
import { validateListening } from '../validators.js';

export async function generateListening(unit, config, claude, db, dryRun) {
  const levelConfig = config.levels[unit.level_number];
  const prompt = buildListeningPrompt(unit, levelConfig);

  const result = await claude.generate(prompt, {
    max_tokens: 4096,
    type: 'listening',
    unit_id: unit.id,
  });

  validateListening(result);

  if (!dryRun) {
    await db.upsertListening(unit.id, result);
  }

  return result;
}
