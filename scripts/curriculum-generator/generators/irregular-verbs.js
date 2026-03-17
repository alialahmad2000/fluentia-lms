import { buildIrregularVerbsPrompt } from '../templates/irregular-verbs-prompt.js';
import { validateIrregularVerbs } from '../validators.js';

export async function generateIrregularVerbs(unit, config, claude, db, dryRun) {
  const levelConfig = config.levels[unit.level_number];
  const verbList = config.irregularVerbsPerLevel[unit.level_number] || [];

  if (verbList.length === 0) {
    console.log('    ⏭️  No irregular verbs for this level');
    return null;
  }

  const prompt = buildIrregularVerbsPrompt(verbList, levelConfig);

  const result = await claude.generate(prompt, {
    max_tokens: 4096,
    type: 'irregular_verbs',
    unit_id: unit.id,
  });

  validateIrregularVerbs(result);

  if (!dryRun) {
    await db.upsertIrregularVerbs(unit.level_id, result.verbs);
    if (result.exercises?.length) {
      await db.upsertIrregularVerbExercises(unit.level_id, result.exercises);
    }
  }

  return result;
}
