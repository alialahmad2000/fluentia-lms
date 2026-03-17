import { buildComprehensionPrompt } from '../templates/comprehension-prompt.js';
import { validateComprehension } from '../validators.js';

export async function generateComprehension(unit, slot, reading, config, claude, db, dryRun) {
  const levelConfig = config.levels[unit.level_number];
  const prompt = buildComprehensionPrompt(reading.content, levelConfig);

  const result = await claude.generate(prompt, {
    max_tokens: 4096,
    type: `comprehension_${slot}`,
    unit_id: unit.id,
  });

  validateComprehension(result, levelConfig);

  if (!dryRun && reading.readingId) {
    await db.upsertComprehension(reading.readingId, result.questions);
  }

  return result;
}
