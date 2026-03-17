import { buildVocabularyPrompt, buildVocabExercisesPrompt } from '../templates/vocabulary-prompt.js';
import { validateVocabulary, validateVocabExercises } from '../validators.js';

export async function generateVocabulary(unit, slot, reading, config, claude, db, dryRun) {
  const levelConfig = config.levels[unit.level_number];
  const prompt = buildVocabularyPrompt(reading.content, reading.target_vocabulary, levelConfig);

  const result = await claude.generate(prompt, {
    max_tokens: 4096,
    type: `vocabulary_${slot}`,
    unit_id: unit.id,
  });

  validateVocabulary(result, levelConfig);

  if (!dryRun && reading.readingId) {
    await db.upsertVocabulary(reading.readingId, result.words);
  }

  return result;
}

export async function generateVocabExercises(unit, slot, vocab, config, claude, db, dryRun) {
  const levelConfig = config.levels[unit.level_number];
  const wordList = vocab.words.map(w => w.word);
  const prompt = buildVocabExercisesPrompt(wordList, levelConfig);

  const result = await claude.generate(prompt, {
    max_tokens: 4096,
    type: `vocab_exercises_${slot}`,
    unit_id: unit.id,
  });

  validateVocabExercises(result, levelConfig);

  if (!dryRun && vocab.words[0]) {
    // Get reading_id from the first word's context
    const readingId = unit[`reading_${slot}_id`] || null;
    // We need the reading_id — pass it through
    if (unit._readingIds?.[slot]) {
      await db.upsertVocabExercises(unit._readingIds[slot], result.exercises);
    }
  }

  return result;
}
