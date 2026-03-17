import { buildReadingPrompt } from '../templates/reading-prompt.js';
import { validateReading } from '../validators.js';

export async function generateReading(unit, slot, config, claude, db, dryRun) {
  const levelConfig = config.levels[unit.level_number];
  const prompt = buildReadingPrompt(unit, slot, levelConfig);

  const result = await claude.generate(prompt, {
    max_tokens: 4096,
    type: `reading_${slot}`,
    unit_id: unit.id,
  });

  validateReading(result, levelConfig);

  let readingId = null;
  if (!dryRun) {
    readingId = await db.upsertReading(unit.id, slot, result);
  }

  return { ...result, readingId };
}
