import { buildWritingPrompt } from '../templates/writing-prompt.js';
import { validateWriting } from '../validators.js';

export async function generateWriting(unit, config, claude, db, dryRun) {
  const levelConfig = config.levels[unit.level_number];
  const prompt = buildWritingPrompt(unit, levelConfig);

  const result = await claude.generate(prompt, {
    max_tokens: 4096,
    type: 'writing',
    unit_id: unit.id,
  });

  validateWriting(result);

  if (!dryRun) {
    await db.upsertWriting(unit.id, result);
  }

  return result;
}
