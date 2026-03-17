// ─── Content Validators ───────────────────────────────────────────────

class ValidationError extends Error {
  constructor(errors) {
    super(`Validation failed:\n  - ${errors.join('\n  - ')}`);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

const AI_ARTIFACTS = [
  'As an AI', 'as an AI', 'I\'d be happy to', 'Here is', 'Here are',
  'I\'ll create', 'I\'ll generate', 'Sure!', 'Certainly!', 'Of course!',
];

function checkAIArtifacts(text) {
  for (const artifact of AI_ARTIFACTS) {
    if (text.includes(artifact)) return `Contains AI artifact: "${artifact}"`;
  }
  return null;
}

function checkCopyright(text) {
  const banned = ['©', 'National Geographic', 'Cambridge', 'Oxford University Press', 'Pearson', 'All rights reserved'];
  for (const term of banned) {
    if (text.includes(term)) return `Contains potential copyright reference: "${term}"`;
  }
  return null;
}

function hasArabic(text) {
  return /[\u0600-\u06FF]/.test(text);
}

export function validateReading(result, levelConfig) {
  const errors = [];

  if (!result.title) errors.push('Missing title');
  if (!result.content) errors.push('Missing content');

  // Word count (±20% tolerance)
  if (result.word_count < levelConfig.reading_words.min * 0.8)
    errors.push(`Too short: ${result.word_count} words (min: ${levelConfig.reading_words.min})`);
  if (result.word_count > levelConfig.reading_words.max * 1.2)
    errors.push(`Too long: ${result.word_count} words (max: ${levelConfig.reading_words.max})`);

  // Vocabulary count
  if (!result.target_vocabulary || result.target_vocabulary.length < levelConfig.vocabulary_per_reading * 0.7)
    errors.push(`Not enough vocabulary: ${result.target_vocabulary?.length || 0} (need ~${levelConfig.vocabulary_per_reading})`);

  const copyright = checkCopyright(result.content);
  if (copyright) errors.push(copyright);

  const artifact = checkAIArtifacts(result.content);
  if (artifact) errors.push(artifact);

  if (errors.length > 0) throw new ValidationError(errors);
}

export function validateComprehension(result, levelConfig) {
  const errors = [];

  if (!result.questions || !Array.isArray(result.questions))
    errors.push('Missing questions array');
  else {
    if (result.questions.length < levelConfig.comprehension_questions * 0.7)
      errors.push(`Not enough questions: ${result.questions.length} (need ~${levelConfig.comprehension_questions})`);

    for (const [i, q] of result.questions.entries()) {
      if (!q.question_text) errors.push(`Question ${i + 1}: missing text`);
      if (!q.choices || q.choices.length < 3) errors.push(`Question ${i + 1}: too few choices`);
      if (q.correct_answer_index == null || q.correct_answer_index < 0 || q.correct_answer_index >= (q.choices?.length || 0))
        errors.push(`Question ${i + 1}: invalid correct_answer_index`);
      if (!q.explanation_ar || !hasArabic(q.explanation_ar))
        errors.push(`Question ${i + 1}: missing Arabic explanation`);
    }
  }

  if (errors.length > 0) throw new ValidationError(errors);
}

export function validateVocabulary(result, levelConfig) {
  const errors = [];

  if (!result.words || !Array.isArray(result.words))
    errors.push('Missing words array');
  else {
    if (result.words.length < levelConfig.vocabulary_per_reading * 0.7)
      errors.push(`Not enough words: ${result.words.length}`);

    for (const [i, w] of result.words.entries()) {
      if (!w.word) errors.push(`Word ${i + 1}: missing word`);
      if (!w.definition_en) errors.push(`Word ${i + 1}: missing English definition`);
      if (!w.definition_ar || !hasArabic(w.definition_ar))
        errors.push(`Word ${i + 1}: missing Arabic definition`);
    }
  }

  if (errors.length > 0) throw new ValidationError(errors);
}

export function validateVocabExercises(result, levelConfig) {
  const errors = [];

  if (!result.exercises || !Array.isArray(result.exercises))
    errors.push('Missing exercises array');
  else {
    if (result.exercises.length < levelConfig.vocabulary_exercises * 0.7)
      errors.push(`Not enough exercises: ${result.exercises.length}`);

    for (const [i, ex] of result.exercises.entries()) {
      if (!ex.question) errors.push(`Exercise ${i + 1}: missing question`);
      if (!ex.correct_answer) errors.push(`Exercise ${i + 1}: missing correct_answer`);
    }
  }

  if (errors.length > 0) throw new ValidationError(errors);
}

export function validateGrammar(result, levelConfig) {
  const errors = [];

  if (!result.topic) errors.push('Missing topic');
  if (!result.explanation_en) errors.push('Missing English explanation');
  if (!result.formula) errors.push('Missing formula');
  if (!result.examples || result.examples.length < 2) errors.push('Need at least 2 examples');
  if (!result.exercises || result.exercises.length < levelConfig.grammar_exercises * 0.7)
    errors.push(`Not enough exercises: ${result.exercises?.length || 0}`);

  for (const [i, ex] of (result.exercises || []).entries()) {
    if (!ex.question) errors.push(`Exercise ${i + 1}: missing question`);
    if (!ex.correct_answer) errors.push(`Exercise ${i + 1}: missing correct_answer`);
  }

  if (errors.length > 0) throw new ValidationError(errors);
}

export function validateWriting(result) {
  const errors = [];

  if (!result.task_type) errors.push('Missing task_type');
  if (!result.prompt_en) errors.push('Missing prompt_en');
  if (!result.prompt_ar || !hasArabic(result.prompt_ar)) errors.push('Missing Arabic prompt');
  if (!result.word_limit) errors.push('Missing word_limit');
  if (!result.grading_criteria || result.grading_criteria.length < 2)
    errors.push('Need at least 2 grading criteria');

  if (errors.length > 0) throw new ValidationError(errors);
}

export function validateListening(result) {
  const errors = [];

  if (!result.script_type) errors.push('Missing script_type');
  if (!result.script) errors.push('Missing script');
  if (!result.comprehension_questions || result.comprehension_questions.length < 3)
    errors.push('Need at least 3 comprehension questions');

  for (const [i, q] of (result.comprehension_questions || []).entries()) {
    if (!q.question) errors.push(`Question ${i + 1}: missing question`);
    if (!q.options || q.options.length < 3) errors.push(`Question ${i + 1}: too few options`);
  }

  if (errors.length > 0) throw new ValidationError(errors);
}

export function validateSpeaking(result) {
  const errors = [];

  if (!result.topic_en) errors.push('Missing topic_en');
  if (!result.topic_ar || !hasArabic(result.topic_ar)) errors.push('Missing Arabic topic');
  if (!result.guiding_questions || result.guiding_questions.length < 2)
    errors.push('Need at least 2 guiding questions');

  if (errors.length > 0) throw new ValidationError(errors);
}

export function validateIrregularVerbs(result) {
  const errors = [];

  if (!result.verbs || !Array.isArray(result.verbs))
    errors.push('Missing verbs array');
  else {
    for (const [i, v] of result.verbs.entries()) {
      if (!v.base) errors.push(`Verb ${i + 1}: missing base`);
      if (!v.past) errors.push(`Verb ${i + 1}: missing past`);
      if (!v.past_participle) errors.push(`Verb ${i + 1}: missing past_participle`);
      if (!v.meaning_ar || !hasArabic(v.meaning_ar)) errors.push(`Verb ${i + 1}: missing Arabic meaning`);
    }
  }

  if (!result.exercises || result.exercises.length < 3)
    errors.push('Need at least 3 exercises');

  if (errors.length > 0) throw new ValidationError(errors);
}

export function validateAssessment(result) {
  const errors = [];

  if (!result.questions || !Array.isArray(result.questions))
    errors.push('Missing questions array');
  else {
    for (const [i, q] of result.questions.entries()) {
      if (!q.question_text) errors.push(`Question ${i + 1}: missing question_text`);
      if (!q.correct_answer) errors.push(`Question ${i + 1}: missing correct_answer`);
    }
  }

  if (errors.length > 0) throw new ValidationError(errors);
}
