/**
 * Deterministic IELTS reading/listening question classifier.
 * No AI API calls. Pure pattern matching on question structure + answer shape.
 *
 * Returns { type: string, confidence: number (0-1), reasons: string[] }
 * confidence < 0.8 → caller should mark as 'unclassified'
 *
 * CANONICAL_TYPES must match ielts_reading_skills.question_type values exactly.
 */
const CANONICAL_TYPES = [
  'multiple_choice',
  'true_false_not_given',
  'yes_no_not_given',
  'matching_headings',
  'matching_information',
  'matching_features',
  'matching_sentence_endings',
  'sentence_completion',
  'summary_completion',
  'table_completion',
  'note_table_flowchart',
  'diagram_label',
  'diagram_labelling',
  'short_answer',
  'list_selection',
  'paragraph_matching',
];

function normalizeText(v) {
  return String(v ?? '').toLowerCase().trim();
}

function asArray(v) {
  if (Array.isArray(v)) return v;
  if (v == null) return [];
  return [v];
}

// Handle both object {A:"...", B:"..."} and array shapes
function hasMCQShape(q) {
  const opts = q.options || q.choices || q.answers_list;
  if (!opts) return false;
  if (Array.isArray(opts) && opts.length >= 2) return true;
  if (typeof opts === 'object' && !Array.isArray(opts) && Object.keys(opts).length >= 2) return true;
  return false;
}

function countMCQOptions(q) {
  const opts = q.options || q.choices || q.answers_list;
  if (!opts) return 0;
  if (Array.isArray(opts)) return opts.length;
  if (typeof opts === 'object') return Object.keys(opts).length;
  return 0;
}

// TRUE/FALSE/NOT GIVEN — handles uppercase and lowercase
function matchesTFNG(answer) {
  const n = normalizeText(answer);
  return ['true', 'false', 'not given', 't', 'f', 'ng', 'n.g.'].includes(n);
}

// YES/NO/NOT GIVEN
function matchesYNNG(answer) {
  const n = normalizeText(answer);
  return ['yes', 'no', 'not given', 'y', 'n', 'ng'].includes(n)
    && !['true', 'false'].includes(n); // must not be TFNG
}

// Single letter answer (A/B/C/D/E) — MCQ or matching
function isSingleLetter(answer) {
  return /^[a-zA-Z]$/.test(String(answer ?? '').trim());
}

function countGaps(text) {
  if (!text) return 0;
  const m = String(text).match(/_{2,}|\[\s*\d*\s*\]|\(\s*\d+\s*\)|\.\.\.+/g);
  return m ? m.length : 0;
}

/**
 * Classify a single question.
 * @param {object} q - question object from DB
 * @param {string|null} qIdAnswer - resolved answer from answer_key (optional; q.correct_answer preferred)
 * @param {object} context - optional hints: { is_table, is_diagram, is_flowchart, is_summary, has_headings }
 */
export function classifyQuestion(q, qIdAnswer = null, context = {}) {
  const reasons = [];

  // Resolve answer: prefer embedded correct_answer over answer_key lookup
  const answer = q.correct_answer ?? qIdAnswer;
  const answerStr = String(answer ?? '').trim();
  const qText = normalizeText(q.question_text || q.question || q.text || q.prompt || q.statement || '');
  const qType = normalizeText(q.type || q.question_type || '');

  // Signal 1: explicit type already present
  if (qType && CANONICAL_TYPES.includes(qType)) {
    return { type: qType, confidence: 1.0, reasons: ['explicit type field'] };
  }
  // Map common shorthand types that are NOT canonical but already exist in data
  if (qType === 'mcq') return { type: 'multiple_choice', confidence: 1.0, reasons: ['mcq → multiple_choice'] };
  if (qType === 'tfng') return { type: 'true_false_not_given', confidence: 1.0, reasons: ['tfng → true_false_not_given'] };
  if (qType === 'completion') {
    // Too ambiguous — leave as-is, will be caught by gap detection below
    // But don't overwrite existing type — just note it
  }

  // Signal 2: MCQ via options shape (highest priority — very reliable)
  if (hasMCQShape(q)) {
    const optCount = countMCQOptions(q);
    const answerArr = asArray(answer).filter(Boolean);
    if (answerArr.length > 1) {
      reasons.push(`options present (${optCount}) + ${answerArr.length} answers`);
      return { type: 'multiple_choice', confidence: 0.9, reasons }; // no multiple_choice_multiple_answers in skill table
    }
    reasons.push(`options object/array present (${optCount} choices), single answer`);
    return { type: 'multiple_choice', confidence: 0.95, reasons };
  }

  // Signal 3: TFNG via answer text
  if (matchesTFNG(answerStr)) {
    reasons.push(`answer "${answerStr}" matches T/F/NG pattern`);
    return { type: 'true_false_not_given', confidence: 0.95, reasons };
  }

  // Signal 4: YNNG via answer text
  if (matchesYNNG(answerStr)) {
    reasons.push(`answer "${answerStr}" matches Y/N/NG pattern`);
    return { type: 'yes_no_not_given', confidence: 0.9, reasons };
  }

  // Signal 4a: correct_paragraph field → paragraph matching (student matches statement to paragraph)
  if (q.correct_paragraph != null) {
    reasons.push('correct_paragraph field present');
    return { type: 'matching_information', confidence: 0.95, reasons };
  }
  // Signal 4b: statement field + no options → likely matching/TFNG/YNNG
  if (q.statement && !hasMCQShape(q) && !answerStr) {
    reasons.push('statement field without options or answer — likely matching_information');
    return { type: 'matching_information', confidence: 0.85, reasons };
  }

  // Signal 5a: Explicit incomplete_sentence field → sentence_completion
  if (q.incomplete_sentence || q.sentence_stem) {
    reasons.push('incomplete_sentence / sentence_stem field present');
    return { type: 'sentence_completion', confidence: 0.95, reasons };
  }

  // Signal 5: Gap-based completion
  const gaps = countGaps(qText);
  const answerWords = answerStr ? answerStr.split(/\s+/).filter(Boolean).length : 0;

  if (gaps >= 1 && answerWords <= 4) {
    if (context.is_table || q.table || q.is_table) {
      reasons.push('gap + table context');
      return { type: 'table_completion', confidence: 0.85, reasons };
    }
    if (context.is_diagram || q.diagram || q.image) {
      reasons.push('gap + diagram context');
      return { type: 'diagram_labelling', confidence: 0.85, reasons };
    }
    if (context.is_flowchart || q.flow || q.flow_chart || q.flowchart) {
      reasons.push('gap + flow chart context');
      return { type: 'note_table_flowchart', confidence: 0.85, reasons };
    }
    if (context.is_summary || q.summary || qText.includes('summary')) {
      reasons.push('gap + summary context');
      return { type: 'summary_completion', confidence: 0.85, reasons };
    }
    if (q.note || q.notes || qText.includes('note')) {
      reasons.push('gap + notes context');
      return { type: 'note_table_flowchart', confidence: 0.85, reasons };
    }
    reasons.push(`${gaps} gap(s) in question text + short answer (${answerWords} words)`);
    return { type: 'sentence_completion', confidence: 0.82, reasons };
  }

  // Signal 6: Matching — single-letter answer not from MCQ options
  if (isSingleLetter(answerStr) && !hasMCQShape(q)) {
    if (qText.includes('heading') || context.has_headings) {
      reasons.push('single-letter answer + heading context');
      return { type: 'matching_headings', confidence: 0.85, reasons };
    }
    if (qText.includes('paragraph') || qText.includes('section')) {
      reasons.push('single-letter answer + paragraph/section reference');
      return { type: 'matching_information', confidence: 0.82, reasons };
    }
    reasons.push(`single-letter answer "${answerStr}" without options (likely matching)`);
    return { type: 'matching_information', confidence: 0.65, reasons };
  }

  // Signal 7: Short answer (1-3 word answer, no MCQ, no gaps, no incomplete_sentence)
  if (answerWords >= 1 && answerWords <= 3) {
    reasons.push(`short word answer (${answerWords} word(s)), no options, no gaps`);
    return { type: 'short_answer', confidence: 0.85, reasons };
  }

  // Fallback
  reasons.push('no strong signal matched');
  return { type: 'unclassified', confidence: 0, reasons };
}

export { CANONICAL_TYPES };
