// Inserts the authored Environment Track content (10 stages / 30 lessons) into the DB. Idempotent (upsert on slug).
// Content lives IN-REPO at scripts/env-track-content/stage-<N>.json (authored per SPEC.md there).
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DIR = path.join(__dirname, 'env-track-content');
const sb = createClient(URL, SVC, { auth: { persistSession: false } });

(async () => {
  let stageN = 0, lessonN = 0;
  const seenSlugs = new Set();
  for (let n = 1; n <= 10; n++) {
    const j = JSON.parse(fs.readFileSync(`${DIR}/stage-${n}.json`, 'utf8'));
    const s = j.stage;
    // sanity: every MCQ `correct` must appear verbatim in its options
    for (const l of j.lessons) {
      for (const q of l.content?.comprehension || []) {
        if (!Array.isArray(q.options) || !q.options.includes(q.correct)) {
          throw new Error(`stage ${n} lesson ${l.slug}: MCQ correct not in options → "${q.correct}"`);
        }
      }
    }
    const { data: st, error: se } = await sb.from('env_track_stages')
      .upsert({
        slug: s.slug, sort_order: s.sort_order, title_en: s.title_en, title_ar: s.title_ar,
        subtitle_ar: s.subtitle_ar || null, cefr: s.cefr || null,
        accent: s.accent || '#22c55e', icon: s.icon || 'Leaf',
      }, { onConflict: 'slug' })
      .select('id, slug').single();
    if (se) throw new Error(`stage ${s.slug}: ${se.message}`);
    stageN++;
    for (const l of j.lessons) {
      if (seenSlugs.has(l.slug)) throw new Error(`DUPLICATE lesson slug: ${l.slug}`);
      seenSlugs.add(l.slug);
      const { error: le } = await sb.from('env_track_lessons')
        .upsert({
          stage_id: st.id, slug: l.slug, sort_order: l.sort_order,
          title_en: l.title_en, title_ar: l.title_ar, cefr: l.cefr || null, content: l.content,
        }, { onConflict: 'slug' });
      if (le) throw new Error(`lesson ${l.slug}: ${le.message}`);
      lessonN++;
    }
    console.log(`  ✅ stage ${s.sort_order} «${s.title_ar}» + ${j.lessons.length} lessons`);
  }
  const { count: sc } = await sb.from('env_track_stages').select('id', { count: 'exact', head: true });
  const { count: lc } = await sb.from('env_track_lessons').select('id', { count: 'exact', head: true });
  console.log(`\n✅ inserted. DB now has ${sc} stages / ${lc} lessons (this run: ${stageN} stages, ${lessonN} lessons)`);
})().catch((e) => { console.error('💥', e.message); process.exit(1); });
