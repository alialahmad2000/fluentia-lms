// Fluentia LMS — Batch evaluate all existing unevaluated student writings
// Run once: node scripts/evaluate-existing-writings.mjs
//
// Requires env vars (or edit inline):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CLAUDE_API_KEY

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://nmjexpuycmqcxuxljier.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || '';

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: Set SUPABASE_SERVICE_ROLE_KEY env var');
  process.exit(1);
}
if (!CLAUDE_API_KEY) {
  console.error('ERROR: Set CLAUDE_API_KEY env var');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const LEVEL_CONTEXT = {
  0: 'pre-A1 foundation — very basic words and phrases',
  1: 'A1 beginner — very simple sentences, basic vocabulary',
  2: 'A2 elementary — short paragraphs, everyday topics',
  3: 'B1 intermediate — connected paragraphs, familiar topics',
  4: 'B2 upper-intermediate — detailed text, variety of topics',
  5: 'C1 advanced — complex writing, nuanced expression',
};

const FORCE = process.argv.includes('--force');

async function evaluateWriting(writingText, level) {
  const levelCtx = LEVEL_CONTEXT[level] || LEVEL_CONTEXT[3];

  const systemPrompt = `You are an expert English teacher for Arabic-speaking students at a Saudi Arabian English academy. A student has submitted a writing exercise at ${levelCtx} level. Your job is NOT just to score — you must TEACH.

Provide comprehensive educational feedback. Respond ONLY with valid JSON (no markdown, no backticks):

{
  "overall_score": <1-10>,
  "grammar_score": <1-10>,
  "vocabulary_score": <1-10>,
  "structure_score": <1-10>,
  "fluency_score": <1-10>,

  "corrected_text": "The full student text rewritten with all corrections applied. Keep their ideas but fix grammar, vocabulary, and structure.",

  "errors": [
    {
      "type": "grammar|vocabulary|spelling|punctuation",
      "original": "exact error text from student writing",
      "correction": "fixed version",
      "explanation_ar": "شرح القاعدة بالعربي",
      "explanation_en": "English explanation"
    }
  ],

  "vocabulary_upgrades": [
    {
      "basic": "good",
      "advanced": "beneficial / advantageous",
      "example": "AI can be highly beneficial for education."
    }
  ],

  "model_sentences": [
    "Example sentence showing how to express the same idea at a higher level"
  ],

  "strengths_ar": ["نقطة قوة بالعربي"],
  "improvements_ar": ["نصيحة للتطوير بالعربي"],

  "strengths": "ملاحظة إيجابية مفصلة عن أداء الطالب بالعربي — جملتين على الأقل",
  "improvement_tip": "نصيحة واحدة محددة وعملية يقدر الطالب يطبقها فوراً بالعربي",

  "overall_comment_ar": "ملخص التقييم بالعربي — 3-4 جمل",
  "overall_comment_en": "Same summary in English"
}

RULES:
- Adapt feedback complexity to student level
- Grammar rules explained in Arabic
- Be encouraging but honest
- errors: include ALL meaningful errors (up to 10)
- vocabulary_upgrades: 2-5 basic words with better alternatives
- model_sentences: 2-3 example sentences at their level
- strengths: warm encouraging paragraph
- improvement_tip: ONE specific next step`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Writing:\n${writingText}` }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude API error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const rawText = data.content?.[0]?.text || '{}';
  const cleanJson = rawText.replace(/```json\n?|```\n?/g, '').trim();
  const feedback = JSON.parse(cleanJson);

  // Normalize backward compat fields
  if (!feedback.grammar_errors && feedback.errors) {
    feedback.grammar_errors = feedback.errors.map(e => ({
      error: e.original, correction: e.correction, rule: e.explanation_en || e.explanation_ar,
    }));
  }
  if (!feedback.overall_feedback && feedback.overall_comment_ar) {
    feedback.overall_feedback = feedback.overall_comment_ar;
  }
  if (!feedback.improvement_tips && feedback.improvements_ar) {
    feedback.improvement_tips = feedback.improvements_ar;
  }
  if (!feedback.strengths && feedback.strengths_ar) {
    feedback.strengths = feedback.strengths_ar;
  }

  const inputTokens = data.usage?.input_tokens || 0;
  const outputTokens = data.usage?.output_tokens || 0;
  const costSAR = ((inputTokens * 3 + outputTokens * 15) / 1_000_000) * 3.75;

  return { feedback, inputTokens, outputTokens, costSAR };
}

async function main() {
  console.log(`Fetching ${FORCE ? 'ALL' : 'unevaluated'} writings...`);

  let query = supabase
    .from('student_curriculum_progress')
    .select('id, student_id, unit_id, answers, score')
    .eq('section_type', 'writing')
    .not('answers', 'is', null);

  if (!FORCE) {
    query = query.is('ai_feedback', null);
  }

  const { data: writings, error } = await query;

  if (error) {
    console.error('Query error:', error.message);
    process.exit(1);
  }

  // Filter to those with actual writing text
  const toEvaluate = writings.filter(w => {
    const draft = w.answers?.draft;
    return draft && draft.trim().length >= 10;
  });

  console.log(`Found ${writings.length} writing rows without ai_feedback`);
  console.log(`${toEvaluate.length} have draft text >= 10 chars — will evaluate these\n`);

  if (toEvaluate.length === 0) {
    console.log('Nothing to evaluate. Done!');
    return;
  }

  // Get student levels for better evaluation
  const studentIds = [...new Set(toEvaluate.map(w => w.student_id))];
  const { data: students } = await supabase
    .from('students')
    .select('id, academic_level')
    .in('id', studentIds);
  const levelMap = {};
  (students || []).forEach(s => { levelMap[s.id] = s.academic_level; });

  let evaluated = 0;
  let failed = 0;

  for (const writing of toEvaluate) {
    const draft = writing.answers.draft;
    const level = levelMap[writing.student_id] || 3;

    console.log(`[${evaluated + failed + 1}/${toEvaluate.length}] student=${writing.student_id.slice(0, 8)}... unit=${writing.unit_id.slice(0, 8)}... (${draft.length} chars, level ${level})`);

    try {
      const { feedback, inputTokens, outputTokens, costSAR } = await evaluateWriting(draft, level);

      // Save ai_feedback to student_curriculum_progress
      const { error: updateErr } = await supabase
        .from('student_curriculum_progress')
        .update({
          ai_feedback: feedback,
          score: feedback.overall_score ? feedback.overall_score * 10 : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', writing.id);

      if (updateErr) {
        console.error(`  DB update error: ${updateErr.message}`);
        failed++;
        continue;
      }

      // Log AI usage
      await supabase.from('ai_usage').insert({
        type: 'writing_feedback',
        student_id: writing.student_id,
        model: 'claude-sonnet',
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        estimated_cost_sar: costSAR.toFixed(4),
      });

      console.log(`  ✅ Score: ${feedback.overall_score}/10 | Cost: ${costSAR.toFixed(4)} SAR`);
      evaluated++;

      // Rate limit: 3s between calls
      if (evaluated + failed < toEvaluate.length) {
        await new Promise(r => setTimeout(r, 3000));
      }
    } catch (err) {
      console.error(`  ❌ Failed: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone! Evaluated: ${evaluated}, Failed: ${failed}`);
}

main();
