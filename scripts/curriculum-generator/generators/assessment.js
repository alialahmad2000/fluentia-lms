import { buildAssessmentPrompt } from '../templates/assessment-prompt.js';
import { validateAssessment } from '../validators.js';

export async function generateAssessment(unit, config, claude, db, dryRun) {
  const levelConfig = config.levels[unit.level_number];
  const prompt = buildAssessmentPrompt(unit, levelConfig);

  const result = await claude.generate(prompt, {
    max_tokens: 8192,
    type: 'assessment',
    unit_id: unit.id,
  });

  validateAssessment(result);

  if (!dryRun) {
    await db.upsertAssessment(unit.id, unit.level_id, result);
  }

  return result;
}
