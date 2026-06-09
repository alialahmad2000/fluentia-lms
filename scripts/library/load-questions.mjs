#!/usr/bin/env node
// Validate + load authored chapter questions (/tmp/lib-q/*.json) into library_chapter_questions.
import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'node:fs';

const REF = 'nmjexpuycmqcxuxljier'; const SUPA = `https://${REF}.supabase.co`;
const MGMT = (readFileSync('.mcp.json', 'utf8').match(/sbp_[A-Za-z0-9]+/) || [])[0];
const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
async function legacyKey() { return (await (await fetch(`https://api.supabase.com/v1/projects/${REF}/api-keys?reveal=true`, { headers: { Authorization: `Bearer ${MGMT}` } })).json()).find((x) => x.type === 'legacy' && x.name === 'service_role').api_key; }

const QDIR = '/tmp/lib-q'; const TDIR = '/tmp/lib-text';
const errors = []; const rows = [];
for (const f of readdirSync(QDIR).filter((x) => x.endsWith('.json'))) {
  const qd = JSON.parse(readFileSync(`${QDIR}/${f}`, 'utf8'));
  const td = JSON.parse(readFileSync(`${TDIR}/${f}`, 'utf8'));
  const bookId = td.book_id;
  const sentSet = {}; td.chapters.forEach((c) => { sentSet[c.chapter_id] = new Set(c.sentences.map((s) => `${s.p}-${s.s}`)); });
  for (const ch of qd.chapters) {
    if (!sentSet[ch.chapter_id]) { errors.push(`${f} ch${ch.ch}: chapter_id not in text`); continue; }
    if (ch.questions.length !== 4) errors.push(`${f} ch${ch.ch}: ${ch.questions.length} questions (want 4)`);
    ch.questions.forEach((q, i) => {
      const tag = `${f} ch${ch.ch} q${q.q_index ?? i + 1}`;
      if (!['comprehension', 'inference', 'vocabulary', 'opinion'].includes(q.type)) errors.push(`${tag}: bad type ${q.type}`);
      if (!q.question_en) errors.push(`${tag}: no question_en`);
      if (q.type !== 'opinion') {
        if (!Array.isArray(q.options) || q.options.length !== 4) errors.push(`${tag}: options != 4`);
        else { const ids = q.options.map((o) => o.id); if (!ids.includes(q.correct_id)) errors.push(`${tag}: correct_id ${q.correct_id} not in options`); }
      }
      if (q.jump_p != null && q.jump_s != null && !sentSet[ch.chapter_id].has(`${q.jump_p}-${q.jump_s}`)) errors.push(`${tag}: jump ${q.jump_p}-${q.jump_s} not a real sentence`);
      rows.push({ chapter_id: ch.chapter_id, book_id: bookId, q_index: q.q_index ?? i + 1, type: q.type, question_en: q.question_en, question_ar: q.question_ar ?? null, options: q.type === 'opinion' ? null : q.options, correct_id: q.type === 'opinion' ? null : q.correct_id, explanation_ar: q.explanation_ar ?? null, jump_p: q.jump_p ?? null, jump_s: q.jump_s ?? null });
    });
  }
}
console.log(`parsed ${rows.length} questions from ${readdirSync(QDIR).filter((x) => x.endsWith('.json')).length} novels`);
if (errors.length) { console.error(`\n❌ ${errors.length} VALIDATION ERRORS:`); errors.slice(0, 40).forEach((e) => console.error('  ' + e)); process.exit(1); }
console.log('✓ all valid');
if (process.argv.includes('--check')) process.exit(0);

const supa = createClient(SUPA, await legacyKey(), { auth: { persistSession: false } });
const chapterIds = [...new Set(rows.map((r) => r.chapter_id))];
const { error: delErr } = await supa.from('library_chapter_questions').delete().in('chapter_id', chapterIds);
if (delErr) { console.error('delete failed', delErr.message); process.exit(1); }
for (let i = 0; i < rows.length; i += 100) {
  const { error } = await supa.from('library_chapter_questions').insert(rows.slice(i, i + 100));
  if (error) { console.error('insert failed', error.message); process.exit(1); }
}
const { count } = await supa.from('library_chapter_questions').select('*', { count: 'exact', head: true });
console.log(`✅ loaded — library_chapter_questions now has ${count} rows`);
