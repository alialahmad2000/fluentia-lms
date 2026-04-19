/**
 * Mastery assessment question generator — sequential anti-dup edition.
 * Usage: node generate-mastery-questions.cjs --level 0 --unit <N> [--dry-run]
 *
 * Uses multi-turn conversations for retries (Claude fixes its own prior output).
 * Sequential A→B→C with inter/intra-variant duplicate detection. Retry budget: 6/variant.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
require('dotenv').config({ path: require('path').join(__dirname, '../../.env.backend'), override: false });

const Anthropic = require('@anthropic-ai/sdk');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// ── CLI args ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (f) => { const i = args.indexOf(f); return i !== -1 ? args[i+1] : null; };
const DRY_RUN = args.includes('--dry-run');
const LEVEL = parseInt(getArg('--level') ?? '0', 10);
const UNIT  = parseInt(getArg('--unit')  ?? '1', 10);

console.log(`\n🚀 Mastery Question Generator — L${LEVEL} Unit ${UNIT}${DRY_RUN ? ' [DRY-RUN]' : ''}\n`);

// ── Config ──────────────────────────────────────────────────────────────────
const MODEL       = 'claude-sonnet-4-6';
const MAX_TOKENS  = 4096;
const TEMPERATURE = 0.7;
const MAX_RETRIES = 6;
const OUTPUT_DIR  = path.join(__dirname, 'output');

const DB_CONFIG = {
  host: 'aws-1-eu-central-1.pooler.supabase.com', port: 5432, database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier', password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false }
};

const ANTHROPIC_API_KEY = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) { console.error('❌ No CLAUDE_API_KEY found'); process.exit(1); }

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
const db = new Client(DB_CONFIG);

// ── Auto-discover: build snapshot from DB ─────────────────────────────────
async function discoverSnapshot() {
  console.log(`  Discovering content for L${LEVEL} Unit ${UNIT}...`);
  const lvl = (await db.query(`SELECT id, level_number, name_en FROM curriculum_levels WHERE level_number = $1`, [LEVEL])).rows[0];
  if (!lvl) throw new Error(`Level ${LEVEL} not found`);

  const unit = (await db.query(
    `SELECT id, unit_number, theme_en, theme_ar FROM curriculum_units WHERE level_id = $1 AND unit_number = $2`, [lvl.id, UNIT]
  )).rows[0];
  if (!unit) throw new Error(`Unit ${UNIT} not found`);

  const assessment = (await db.query(`SELECT id FROM unit_mastery_assessments WHERE unit_id = $1`, [unit.id])).rows[0];
  if (!assessment) throw new Error(`No assessment for unit ${unit.id}`);

  const variants = (await db.query(
    `SELECT id, variant_code FROM unit_mastery_variants WHERE assessment_id = $1 ORDER BY variant_code`, [assessment.id]
  )).rows;

  const readings = (await db.query(
    `SELECT id, reading_label, title_en, passage_content, passage_word_count FROM curriculum_readings WHERE unit_id = $1 ORDER BY sort_order`, [unit.id]
  )).rows;

  const readingIds = readings.map(r => r.id);
  let vocab = [];
  if (readingIds.length > 0) {
    vocab = (await db.query(
      `SELECT id, word, part_of_speech, definition_ar, example_sentence, tier FROM curriculum_vocabulary WHERE reading_id = ANY($1::uuid[]) ORDER BY sort_order, id`, [readingIds]
    )).rows;
  }

  const grammar = (await db.query(
    `SELECT id, topic_name_en, topic_name_ar, explanation_content FROM curriculum_grammar WHERE unit_id = $1 ORDER BY sort_order LIMIT 1`, [unit.id]
  )).rows[0] || null;

  const snapshot = {
    unit: { id: unit.id, title_en: unit.theme_en, title_ar: unit.theme_ar, unit_number: unit.unit_number },
    level: { id: lvl.id, level_number: lvl.level_number, name_en: lvl.name_en },
    assessment: { id: assessment.id },
    variants: variants.map(v => ({ id: v.id, variant_code: v.variant_code })),
    vocabulary: vocab.map(w => ({ id: w.id, word: w.word, pos: w.part_of_speech, meaning_ar: w.definition_ar, example_sentence: w.example_sentence, tier: w.tier })),
    passages: readings.map(p => ({ id: p.id, label: p.reading_label, title: p.title_en, content: p.passage_content, word_count: p.passage_word_count })),
    grammar: grammar ? { title: grammar.topic_name_en, title_ar: grammar.topic_name_ar, explanation: grammar.explanation_content } : null,
  };

  const sp = path.join(__dirname, `L${LEVEL}-unit${UNIT}-content-snapshot.json`);
  fs.writeFileSync(sp, JSON.stringify(snapshot, null, 2));
  console.log(`  ✅ Snapshot → ${sp}`);
  return snapshot;
}

async function loadOrDiscover() {
  const sp = path.join(__dirname, `L${LEVEL}-unit${UNIT}-content-snapshot.json`);
  if (fs.existsSync(sp)) { console.log(`  Loaded snapshot: ${sp}`); return JSON.parse(fs.readFileSync(sp, 'utf8')); }
  return discoverSnapshot();
}

// ── System prompt ─────────────────────────────────────────────────────────
function buildSystemPrompt(snapshot, hasGrammar) {
  const vocabList = snapshot.vocabulary.slice(0, 30)
    .map(w => `  - "${w.word}" (${w.pos}) → ${w.meaning_ar} | e.g. "${w.example_sentence}"`).join('\n');

  const passageList = snapshot.passages.map(p => {
    const text = typeof p.content === 'string' ? p.content : (p.content?.paragraphs || []).join('\n\n');
    return `PASSAGE ${p.label}: "${p.title}"\n${text}`;
  }).join('\n\n---\n\n');

  const grammarSection = hasGrammar ? (() => {
    const g = snapshot.grammar;
    const expl = typeof g.explanation === 'string' ? g.explanation
      : (g.explanation?.sections || []).map(s => s.content_en || s.content || (s.items ? s.items.map(i => i.sentence || `${i.wrong} → ${i.correct}`).join('; ') : '')).filter(Boolean).join('\n');
    return `GRAMMAR RULE: "${g.title}"\n${expl}`;
  })() : 'GRAMMAR: none — use 5 vocab + 5 reading instead.';

  const dist = hasGrammar ? '4 vocabulary + 3 grammar + 3 reading' : '5 vocabulary + 0 grammar + 5 reading';

  return `You generate end-of-unit mastery assessment questions for Arabic-speaking English learners at CEFR Pre-A1.

LEARNER: Native Arabic speaker, Pre-A1 English, adult (Saudi Arabia).

UNIT CONTENT:
VOCABULARY:
${vocabList}

${passageList}

${grammarSection}

TASK: Generate EXACTLY 10 questions for the variant requested.

TYPE MIX — EXACTLY THIS, COUNT CAREFULLY BEFORE RESPONDING:
  6 MCQ (multiple choice, 4 options, 1 correct)
  2 true_false
  1 fill_blank (student types a word)
  1 matching (4 pairs, English→Arabic)
  TOTAL: 10

SKILL DISTRIBUTION:
  ${dist}

RULES:
1. Question text in English.
2. One concept per question.
3. MCQ distractors: same POS, plausible, not obviously wrong.
4. fill_blank: 2-4 accepted answer forms.
5. matching: EXACTLY 4 pairs. left=English, right=Arabic.
6. Every question: 1-sentence Arabic explanation in explanation_ar.
7. CEFR Pre-A1: ≤10 words per question stem.
8. MCQ correct_answer: option id string ("a","b","c","d").
9. true_false correct_answer: boolean true or false (NOT string).
10. fill_blank correct_answer: the correct word (string).
11. matching correct_answer: [{left,right}] array of 4 pairs.
12. matching options: {"left_items":[4 items],"right_items":[4 items, shuffled]}.
13. COUNT YOUR QUESTIONS BEFORE RESPONDING. Must be exactly 10: 6 MCQ + 2 TF + 1 FB + 1 Match.

OUTPUT: Return ONLY valid JSON. No markdown fence. No preamble.

{"variant_label":"A","questions":[{"order_index":1,"skill_tag":"vocabulary","question_type":"mcq","question_text":"What does 'morning' mean?","question_context":null,"options":[{"id":"a","text":"الصباح","is_correct":true},{"id":"b","text":"الليل","is_correct":false},{"id":"c","text":"الظهر","is_correct":false},{"id":"d","text":"المساء","is_correct":false}],"correct_answer":"a","accepted_answers":null,"points":1,"explanation_ar":"كلمة morning تعني الصباح."},{"order_index":2,"skill_tag":"grammar","question_type":"true_false","question_text":"'She are at home' is correct.","question_context":null,"options":null,"correct_answer":false,"accepted_answers":null,"points":1,"explanation_ar":"خاطئة. مع she نستخدم is."},{"order_index":9,"skill_tag":"vocabulary","question_type":"fill_blank","question_text":"I eat ____ every morning.","question_context":null,"options":null,"correct_answer":"breakfast","accepted_answers":["breakfast","Breakfast"],"points":1,"explanation_ar":"breakfast تعني الإفطار."},{"order_index":10,"skill_tag":"vocabulary","question_type":"matching","question_text":"Match each English word to its Arabic meaning:","question_context":null,"options":{"left_items":["morning","sleep","work","home"],"right_items":["المنزل","العمل","الصباح","ينام"]},"correct_answer":[{"left":"morning","right":"الصباح"},{"left":"sleep","right":"ينام"},{"left":"work","right":"العمل"},{"left":"home","right":"المنزل"}],"accepted_answers":null,"points":1,"explanation_ar":"مفردات أساسية."}]}`;
}

// ── Avoid block ───────────────────────────────────────────────────────────
function buildAvoidBlock(previousVariants) {
  if (!previousVariants.length) return '';
  let b = '\n\n━━━ AVOID: QUESTIONS FROM PRIOR VARIANTS ━━━\n';
  b += 'Use COMPLETELY DIFFERENT questions, words, and sentence patterns.\n\n';
  for (const v of previousVariants) {
    b += `VARIANT ${v.label}:\n`;
    for (const q of v.questions) {
      b += `  [${q.skill_tag}/${q.question_type}] ${q.question_text}\n`;
      if (q.question_type === 'fill_blank') b += `     target: "${q.correct_answer}"\n`;
      if (q.question_type === 'matching' && Array.isArray(q.correct_answer))
        b += `     pairs: ${q.correct_answer.map(p => `${p.left}`).join(', ')}\n`;
    }
  }
  b += '\nHARD RULES:\n1. No vocab word as answer in >1 variant.\n2. No repeated sentence patterns.\n3. Matching: entirely different word sets.\n4. Fill-blank targets differ across variants.\n5. Within this variant: each vocab question tests a DIFFERENT word.\n6. Within this variant: fill_blank answer appears only once.\n';
  return b;
}

// ── Validation ────────────────────────────────────────────────────────────
function validate(data, hasGrammar) {
  const errors = [];
  const qs = data?.questions;
  if (!Array.isArray(qs) || qs.length !== 10) { errors.push(`Need exactly 10 questions, got ${qs?.length ?? 'none'}`); return errors; }

  const tc = { mcq:0, true_false:0, fill_blank:0, matching:0 };
  const sc = { vocabulary:0, grammar:0, reading:0 };

  for (let i = 0; i < qs.length; i++) {
    const q = qs[i], L = `Q${i+1}`;
    if (!['mcq','true_false','fill_blank','matching'].includes(q.question_type)) { errors.push(`${L}: bad type`); continue; }
    tc[q.question_type]++;
    if (['vocabulary','grammar','reading'].includes(q.skill_tag)) sc[q.skill_tag]++;
    else errors.push(`${L}: bad skill_tag "${q.skill_tag}"`);
    if (!q.question_text) errors.push(`${L}: missing question_text`);
    if (!q.explanation_ar) errors.push(`${L}: missing explanation_ar`);
    if (q.order_index == null) errors.push(`${L}: missing order_index`);
    if (q.question_type === 'mcq') {
      if (!Array.isArray(q.options) || q.options.length !== 4) errors.push(`${L}: need 4 options`);
      else if (q.options.filter(o => o.is_correct === true).length !== 1) errors.push(`${L}: need 1 correct option`);
      if (!q.correct_answer) errors.push(`${L}: missing correct_answer`);
    }
    if (q.question_type === 'true_false' && q.correct_answer !== true && q.correct_answer !== false)
      errors.push(`${L}: correct_answer must be boolean (got ${typeof q.correct_answer})`);
    if (q.question_type === 'fill_blank') {
      if (!q.correct_answer) errors.push(`${L}: missing correct_answer`);
      if (!Array.isArray(q.accepted_answers) || !q.accepted_answers.length) errors.push(`${L}: need accepted_answers array`);
    }
    if (q.question_type === 'matching') {
      if (!Array.isArray(q.correct_answer) || q.correct_answer.length !== 4) errors.push(`${L}: correct_answer needs 4 pairs`);
      if (!q.options?.left_items || q.options.left_items.length !== 4 || !q.options?.right_items || q.options.right_items.length !== 4)
        errors.push(`${L}: options needs left_items[4] + right_items[4]`);
    }
  }

  if (tc.mcq !== 6)       errors.push(`Type: 6 MCQ required, got ${tc.mcq}`);
  if (tc.true_false !== 2) errors.push(`Type: 2 true_false required, got ${tc.true_false}`);
  if (tc.fill_blank !== 1) errors.push(`Type: 1 fill_blank required, got ${tc.fill_blank}`);
  if (tc.matching !== 1)   errors.push(`Type: 1 matching required, got ${tc.matching}`);

  if (hasGrammar) {
    if (sc.vocabulary !== 4) errors.push(`Skill: 4 vocab required, got ${sc.vocabulary}`);
    if (sc.grammar !== 3)    errors.push(`Skill: 3 grammar required, got ${sc.grammar}`);
    if (sc.reading !== 3)    errors.push(`Skill: 3 reading required, got ${sc.reading}`);
  } else {
    if (sc.vocabulary !== 5) errors.push(`Skill: 5 vocab required, got ${sc.vocabulary}`);
    if (sc.grammar !== 0)    errors.push(`Skill: 0 grammar required, got ${sc.grammar}`);
    if (sc.reading !== 5)    errors.push(`Skill: 5 reading required, got ${sc.reading}`);
  }
  return errors;
}

// ── Duplicate detection ───────────────────────────────────────────────────
const STOP_WORDS = new Set(['what','does','mean','which','choose','correct','the','this','that','sentence','word','each','match','english','arabic','meaning','true','false','complete','fill','blank','statement','passage','text','answer','question','are','was','were','has','have']);

function norm(s) { return (s||'').toLowerCase().replace(/[^\w\s]/g,' ').replace(/\s+/g,' ').trim(); }
function cWords(t) { return norm(t).split(' ').filter(w => w.length >= 3 && !STOP_WORDS.has(w)); }
function testedWord(q) {
  const m = (q.question_text||'').match(/'([^']+)'/);
  if (m) return norm(m[1]);
  if (q.question_type === 'fill_blank') return norm(String(q.correct_answer||''));
  return '';
}

function detectDuplicates(newQs, previousVariants) {
  const dups = [];

  // Intra-variant: same vocab word tested twice, or same fill_blank target
  for (let i = 0; i < newQs.length; i++) {
    for (let j = i+1; j < newQs.length; j++) {
      const a = newQs[i], b = newQs[j];
      if (a.question_type === 'fill_blank' && b.question_type === 'fill_blank') {
        const at = norm(String(a.correct_answer||'')), bt = norm(String(b.correct_answer||''));
        if (at && at === bt) dups.push({ newQ: b, priorQ: {...a, variantLabel:'SELF'}, reason: `intra: same fill_blank target "${at}"` });
      }
      if (a.skill_tag === 'vocabulary' && b.skill_tag === 'vocabulary') {
        const aw = testedWord(a), bw = testedWord(b);
        if (aw && bw && aw === bw) dups.push({ newQ: b, priorQ: {...a, variantLabel:'SELF'}, reason: `intra: vocab "${aw}" tested twice` });
      }
    }
  }

  // Inter-variant
  const prior = previousVariants.flatMap(v => v.questions.map(q => ({variantLabel:v.label, ...q})));
  for (const nq of newQs) {
    for (const pq of prior) {
      if (nq.question_type !== 'matching' && pq.question_type !== 'matching') {
        if (norm(nq.question_text) === norm(pq.question_text))
          { dups.push({newQ:nq, priorQ:pq, reason:'identical question_text'}); continue; }
      }
      if (nq.question_type === 'fill_blank' && pq.question_type === 'fill_blank') {
        const nt = norm(String(nq.correct_answer||'')), pt = norm(String(pq.correct_answer||''));
        if (nt && nt === pt) { dups.push({newQ:nq, priorQ:pq, reason:`same fill_blank target "${nt}"`}); continue; }
      }
      if (nq.question_type === 'matching' && pq.question_type === 'matching') {
        if (Array.isArray(nq.correct_answer) && Array.isArray(pq.correct_answer)) {
          const nL = new Set(nq.correct_answer.map(p=>norm(p.left)));
          const pL = new Set(pq.correct_answer.map(p=>norm(p.left)));
          const shared = [...nL].filter(w=>pL.has(w));
          if (shared.length >= 2) dups.push({newQ:nq, priorQ:pq, reason:`matching shares ${shared.length} words: ${shared.join(',')}`});
        }
        continue;
      }
      const nc = cWords(nq.question_text), pc = cWords(pq.question_text);
      if (nc.length >= 5 && pc.length >= 5) {
        const ns = new Set(nc), ps = new Set(pc);
        const ov = [...ns].filter(w=>ps.has(w)).length / Math.min(ns.size, ps.size);
        if (ov >= 0.8) dups.push({newQ:nq, priorQ:pq, reason:`content overlap ${(ov*100).toFixed(0)}%`});
      }
    }
  }
  return dups;
}

// ── Parse JSON from Claude response ──────────────────────────────────────
function parseJSON(raw) {
  const s = raw.indexOf('{'), e = raw.lastIndexOf('}');
  if (s === -1 || e === -1) throw new Error('No JSON in response');
  return JSON.parse(raw.slice(s, e+1));
}

// ── Generate one variant with multi-turn conversation ─────────────────────
async function generateVariant(systemPrompt, label, avoidBlock, previousVariants, hasGrammar) {
  const dist = hasGrammar ? '4V/3G/3R' : '5V/0G/5R';
  const messages = [{ role: 'user', content: `Generate variant ${label} now.${avoidBlock}` }];

  let totalIn = 0, totalOut = 0, retries = 0, dupsFound = 0;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`  call #${attempt}...`);
    const t0 = Date.now();

    const resp = await anthropic.messages.create({
      model: MODEL, max_tokens: MAX_TOKENS, temperature: TEMPERATURE,
      system: systemPrompt, messages,
    });
    totalIn  += resp.usage.input_tokens;
    totalOut += resp.usage.output_tokens;
    const elapsed = Date.now() - t0;
    const raw = resp.content[0]?.text || '';

    // Add assistant turn to conversation
    messages.push({ role: 'assistant', content: raw });

    let data;
    try { data = parseJSON(raw); }
    catch (e) {
      const msg = `Could not parse JSON: ${e.message}. Return ONLY valid JSON for variant ${label}, no preamble.`;
      messages.push({ role: 'user', content: msg });
      retries++; if (attempt >= MAX_RETRIES) throw new Error(`Max retries (JSON parse)`); continue;
    }

    const schemaErrs = validate(data, hasGrammar);
    if (schemaErrs.length > 0) {
      console.log(`  ⚠️  Schema (${schemaErrs.length}): ${schemaErrs.slice(0,3).join(' | ')}`);
      messages.push({ role: 'user', content: `Your response has schema errors. Fix them and return the COMPLETE corrected JSON for variant ${label}. REMINDER: exactly 6 MCQ + 2 true_false + 1 fill_blank + 1 matching = 10 questions total. Skill: ${dist}.\n\nErrors:\n${schemaErrs.join('\n')}` });
      retries++; if (attempt >= MAX_RETRIES) throw new Error(`Max retries (schema)`); continue;
    }

    const dups = detectDuplicates(data.questions, previousVariants);
    if (dups.length > 0) {
      dupsFound += dups.length;
      console.log(`  ⚠️  Dups (${dups.length}): ${dups.slice(0,2).map(d=>d.reason).join(' | ')}`);
      const dupList = dups.map((d,i) => `${i+1}. ${d.reason}: "${d.newQ.question_text}"`).join('\n');
      messages.push({ role: 'user', content: `Duplicate questions found. Replace ONLY the flagged questions with entirely new ones (different words, different concepts). Keep all other questions unchanged. Keep the type mix: 6 MCQ + 2 TF + 1 FB + 1 matching.\n\n${dupList}\n\nReturn FULL corrected JSON for variant ${label}.` });
      retries++; if (attempt >= MAX_RETRIES) throw new Error(`Max retries (dups)`); continue;
    }

    console.log(`  ✅ ${label} OK (${elapsed}ms, out=${totalOut}tok)`);
    return { data, inputTokens: totalIn, outputTokens: totalOut, retries, dupsFound };
  }
  throw new Error(`Exceeded MAX_RETRIES for variant ${label}`);
}

// ── Main ─────────────────────────────────────────────────────────────────
async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  await db.connect();
  const snapshot = await loadOrDiscover();
  const hasGrammar = !!snapshot.grammar;
  const systemPrompt = buildSystemPrompt(snapshot, hasGrammar);

  if (snapshot.variants.length !== 3) { console.error('❌ Expected 3 variants'); process.exit(1); }

  const generated = {}, previousVariants = [], perVariantStats = {};
  let totalIn = 0, totalOut = 0;
  const genStart = Date.now();

  for (const vMeta of snapshot.variants) {
    const label = vMeta.variant_code;
    console.log(`\n─── Variant ${label} ───${previousVariants.length ? ` (${previousVariants.length} prior)` : ''}`);
    const avoidBlock = previousVariants.length ? buildAvoidBlock(previousVariants) : '';

    let result;
    try {
      result = await generateVariant(systemPrompt, label, avoidBlock, previousVariants, hasGrammar);
    } catch (err) {
      console.error(`❌ Variant ${label} failed: ${err.message}`); await db.end(); process.exit(1);
    }

    totalIn  += result.inputTokens;
    totalOut += result.outputTokens;
    perVariantStats[label] = { retries: result.retries, dupsFound: result.dupsFound };

    const outPath = path.join(OUTPUT_DIR, `L${LEVEL}-unit${UNIT}-variant-${label}.json`);
    fs.writeFileSync(outPath, JSON.stringify(result.data, null, 2));
    generated[label] = { data: result.data, variantId: vMeta.id };
    previousVariants.push({ label, questions: result.data.questions });
  }

  const genElapsed = Math.round((Date.now() - genStart) / 1000);
  const estCost = (totalIn * 3.0 + totalOut * 15.0) / 1_000_000;
  const retryStr = Object.entries(perVariantStats).map(([l,v])=>`${l}:${v.retries}`).join(',');
  const dupTotal = Object.values(perVariantStats).reduce((s,v)=>s+v.dupsFound,0);

  console.log(`\n✅ All 3 variants done | tokens in=${totalIn} out=${totalOut} | cost=$${estCost.toFixed(2)} | ${Math.floor(genElapsed/60)}m${genElapsed%60}s`);

  if (DRY_RUN) {
    console.log('[DRY-RUN] Skipping insert/publish.');
    console.log(`[Unit ${UNIT}/12] DRY-RUN | retries=${retryStr} | dups=${dupTotal} | ${Math.floor(genElapsed/60)}m${genElapsed%60}s | $${estCost.toFixed(2)}`);
    await db.end(); return;
  }

  // ── Insert ──────────────────────────────────────────────────────────────
  const preN = (await db.query(
    `SELECT COUNT(*)::int AS n FROM unit_mastery_questions WHERE variant_id IN (SELECT id FROM unit_mastery_variants WHERE assessment_id = $1)`,
    [snapshot.assessment.id]
  )).rows[0].n;
  if (preN > 0) { console.error(`❌ ABORT — ${preN} questions already exist!`); await db.end(); process.exit(1); }

  for (const [label, { data, variantId }] of Object.entries(generated)) {
    const rows = data.questions.map(q => ({
      variant_id: variantId, order_index: q.order_index, question_type: q.question_type,
      skill_tag: q.skill_tag, question_text: q.question_text, question_context: q.question_context||null,
      options: q.options != null ? JSON.stringify(q.options) : null,
      correct_answer: JSON.stringify(q.correct_answer),
      accepted_answers: q.accepted_answers != null ? JSON.stringify(q.accepted_answers) : null,
      points: q.points||1, explanation_ar: q.explanation_ar||null,
    }));
    const cols = Object.keys(rows[0]);
    const ph = rows.map((_,ri) => `(${cols.map((_,ci)=>`$${ri*cols.length+ci+1}`).join(',')})`).join(',');
    const res = await db.query(`INSERT INTO unit_mastery_questions (${cols.join(',')}) VALUES ${ph} RETURNING id`, rows.flatMap(r=>cols.map(c=>r[c])));
    if (res.rows.length !== 10) { console.error(`❌ ABORT — variant ${label}: ${res.rows.length} inserted`); await db.end(); process.exit(1); }
    console.log(`  ✅ ${label}: 10 inserted`);
  }

  const postRows = (await db.query(
    `SELECT v.variant_code, COUNT(q.id)::int AS n FROM unit_mastery_variants v LEFT JOIN unit_mastery_questions q ON q.variant_id = v.id WHERE v.assessment_id = $1 GROUP BY v.variant_code ORDER BY v.variant_code`,
    [snapshot.assessment.id]
  )).rows;
  if (postRows.length !== 3 || !postRows.every(r=>r.n===10)) { console.error('❌ ABORT count mismatch:', postRows); await db.end(); process.exit(1); }

  const pub = (await db.query(`UPDATE unit_mastery_assessments SET is_published=true WHERE unit_id=$1 RETURNING is_published`, [snapshot.unit.id])).rows[0];
  if (!pub?.is_published) { console.error('❌ Publish failed'); await db.end(); process.exit(1); }

  await db.end();
  console.log(`[Unit ${UNIT}/12] OK | A=10 B=10 C=10 | published | retries=${retryStr} | dups=${dupTotal} | ${Math.floor(genElapsed/60)}m${genElapsed%60}s | $${estCost.toFixed(2)}`);
}

main().catch(err => { console.error('❌ Fatal:', err.message); process.exit(1); });
