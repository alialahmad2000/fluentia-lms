import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import 'dotenv/config';

const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const ai = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

const BATCH_SIZE = 20;

async function run() {
  // Fetch all exercises with their grammar topic
  const { data: rows, error } = await sb
    .from('curriculum_grammar_exercises')
    .select('id, grammar_id, exercise_type, items, curriculum_grammar(topic_name_en, topic_name_ar)')
    .order('id');
  if (error) throw error;

  const needWork = rows.filter(r => {
    const it = r.items?.[0];
    return it && (!it.instruction_ar || it.instruction_ar.length < 8);
  });
  console.log(`Total needing instructions: ${needWork.length}`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < needWork.length; i += BATCH_SIZE) {
    const batch = needWork.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(batch.map(processOne));

    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) successCount++;
      else failCount++;
    }

    console.log(`Processed ${Math.min(i + BATCH_SIZE, needWork.length)} / ${needWork.length} (ok: ${successCount}, fail: ${failCount})`);

    // Small delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < needWork.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log(`\nDONE. Updated: ${successCount}, Failed: ${failCount}`);
}

async function processOne(row) {
  const it = row.items[0];
  const grammarTopic = row.curriculum_grammar?.topic_name_en || 'grammar';

  const prompt = `You are writing ONE clear Arabic instruction for an English grammar exercise.
Grammar topic: ${grammarTopic}
Exercise type: ${row.exercise_type}
Question shown to student: "${it.question}"
Correct answer: "${it.correct_answer}"
${it.options ? `Options: ${JSON.stringify(it.options)}` : ''}

Write ONE Arabic sentence (max 12 words) that tells the student EXACTLY what transformation or form the answer requires. Be specific — mention tense, polarity (نفي/إثبات), form (سؤال/خبر), or word type if relevant.

Examples of good instructions:
- "اكتبي الفعل في صيغة النفي الماضي (didn't + base form)"
- "ابدئي السؤال بأداة الماضي المناسبة"
- "ضعي الفعل بين القوسين في الماضي البسيط"
- "اختاري الفعل المساعد المناسب للماضي البسيط"
- "صحّحي الخطأ في صيغة الفعل"

Return ONLY the Arabic sentence, no quotes, no preamble.`;

  const resp = await ai.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 100,
    messages: [{ role: 'user', content: prompt }],
  });

  const instruction_ar = resp.content[0].text.trim().replace(/^["'،]+|["'،]+$/g, '');

  const newItems = [...row.items];
  newItems[0] = { ...it, instruction_ar };

  const { error: updErr } = await sb
    .from('curriculum_grammar_exercises')
    .update({ items: newItems })
    .eq('id', row.id);

  if (updErr) {
    console.error('Update failed for', row.id, updErr.message);
    return false;
  }
  return true;
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) });
