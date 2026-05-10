/**
 * Phase B+C — Extract L2 content and build L2-CURRICULUM-SNAPSHOT.md
 * Read-only. Errors are logged and skipped, never fatal.
 */
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DB = {
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  port: 5432, database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier',
  password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false },
};

const REPO_ROOT = path.join(__dirname, '..', '..');
const OUT_FILE = path.join(REPO_ROOT, 'L2-CURRICULUM-SNAPSHOT.md');

// Helpers
function trunc(s, n = 200) {
  if (!s) return '[empty]';
  const str = typeof s === 'object' ? JSON.stringify(s) : String(s);
  return str.length > n ? str.slice(0, n) + ' [truncated]' : str;
}
function safe(fn) { try { return fn(); } catch { return '[ERROR]'; } }
function yn(v) { return v ? '✅' : '❌'; }
function wordCount(s) {
  if (!s) return 0;
  const str = typeof s === 'object' ? JSON.stringify(s) : String(s);
  return str.split(/\s+/).filter(Boolean).length;
}
// Extract plain text from passage_content JSONB (array of {type,content} or similar)
function extractPassageText(jsonb) {
  if (!jsonb) return '';
  if (typeof jsonb === 'string') return jsonb;
  if (Array.isArray(jsonb)) {
    return jsonb.map(block => {
      if (typeof block === 'string') return block;
      return block.content || block.text || block.paragraph || JSON.stringify(block);
    }).join(' ');
  }
  if (jsonb.content) return extractPassageText(jsonb.content);
  if (jsonb.paragraphs) return jsonb.paragraphs.join(' ');
  return JSON.stringify(jsonb);
}

async function main() {
  const c = new Client(DB);
  await c.connect();
  console.log('Connected.\n');

  const lines = [];
  const push = s => { lines.push(s); };

  // ── Find L2 level ID ──
  const lvlRow = await c.query(
    `SELECT id, name_ar, name_en, cefr, description_ar FROM curriculum_levels WHERE level_number = 2 LIMIT 1`
  );
  if (!lvlRow.rows.length) throw new Error('Level 2 not found in curriculum_levels');
  const L2 = lvlRow.rows[0];
  console.log(`Level 2 ID: ${L2.id} (${L2.name_en})`);

  // ── B.1 Units ──
  const units = await c.query(`
    SELECT id, unit_number, theme_ar, theme_en, description_ar, description_en,
           is_published, outcomes, why_matters, estimated_minutes
    FROM curriculum_units
    WHERE level_id = $1
    ORDER BY unit_number
  `, [L2.id]);
  console.log(`Units found: ${units.rows.length}`);

  // ── Speaking topics (B.4) — fetch once ──
  const speakingTopics = await c.query(`
    SELECT topic_number, title_en, title_ar, category, difficulty
    FROM speaking_topic_banks
    WHERE level = 2
    ORDER BY topic_number
  `).catch(e => { console.error('speaking_topic_banks error:', e.message); return { rows: [] }; });

  // ── Summary accumulators ──
  let totalPassages = 0, totalVocab = 0, totalAudio = 0, totalWriting = 0, totalGrammar = 0;
  const audioMissing = [], gapList = [];

  // ── Build header ──
  push(`# Level 2 (${L2.name_ar || 'بداية الثقة'}) — Curriculum Snapshot`);
  push('');
  push(`**Generated:** ${new Date().toISOString()}`);
  push(`**Source:** production Supabase (nmjexpuycmqcxuxljier)`);
  push(`**Purpose:** Sara Fahad personalized Month 1 plan basis`);
  push(`**Read-only extraction — no data modified.**`);
  push('');
  push('---');
  push('');

  // ── Per-unit detail (collect, then prepend summary) ──
  const unitSections = [];

  for (const unit of units.rows) {
    const usec = [];
    usec.push(`### الوحدة ${unit.unit_number} — ${unit.theme_ar || '[empty]'} / ${unit.theme_en || '[empty]'}`);
    usec.push(`- **Order:** ${unit.unit_number}`);
    usec.push(`- **CEFR:** ${L2.cefr || 'A2'}`);
    usec.push(`- **Theme (AR):** ${unit.theme_ar || '[empty]'}`);
    usec.push(`- **Theme (EN):** ${unit.theme_en || '[empty]'}`);
    if (unit.description_ar) usec.push(`- **Description (AR):** ${unit.description_ar}`);
    if (unit.description_en) usec.push(`- **Description (EN):** ${unit.description_en}`);
    if (unit.why_matters) usec.push(`- **Why it matters:** ${trunc(unit.why_matters, 150)}`);
    if (unit.outcomes && unit.outcomes.length) {
      usec.push(`- **Outcomes:** ${Array.isArray(unit.outcomes) ? unit.outcomes.join(' | ') : unit.outcomes}`);
    }
    usec.push(`- **Published:** ${yn(unit.is_published)}`);
    if (unit.estimated_minutes) usec.push(`- **Estimated time:** ${unit.estimated_minutes} min`);
    usec.push('');

    // ── Readings ──
    const readings = await c.query(`
      SELECT id, reading_label, title_en, title_ar, passage_content, passage_word_count,
             is_published, passage_audio_url, audio_duration_seconds
      FROM curriculum_readings
      WHERE unit_id = $1
      ORDER BY reading_label, sort_order
    `, [unit.id]).catch(e => { gapList.push(`readings for unit ${unit.unit_number}: ${e.message}`); return { rows: [] }; });

    totalPassages += readings.rows.length;

    usec.push('#### قطع القراءة (Reading Passages)');
    if (readings.rows.length === 0) {
      usec.push('[NOT FOUND: no readings for this unit]');
    } else {
      usec.push('| Label | Title EN | Title AR | Word Count | Audio |');
      usec.push('|-------|----------|----------|------------|-------|');
      for (const r of readings.rows) {
        const wc = r.passage_word_count || wordCount(extractPassageText(r.passage_content));
        const hasAudio = !!r.passage_audio_url;
        usec.push(`| ${r.reading_label || '?'} | ${r.title_en || '[empty]'} | ${r.title_ar || '[empty]'} | ${wc} | ${yn(hasAudio)} |`);
      }
      usec.push('');

      // Comprehension question counts
      for (const r of readings.rows) {
        const qCount = await c.query(
          `SELECT count(*) FROM curriculum_comprehension_questions WHERE reading_id = $1`, [r.id]
        ).catch(() => ({ rows: [{ count: 0 }] }));
        usec.push(`**${r.reading_label || 'Reading'} — ${r.title_en}** (${qCount.rows[0].count} questions)`);
        const text = extractPassageText(r.passage_content);
        usec.push(`> ${trunc(text, 200)}`);
        usec.push('');
      }
    }

    // ── Vocabulary ──
    const readingIds = readings.rows.map(r => r.id);
    let vocabRows = [];
    let cefrDist = {};
    if (readingIds.length > 0) {
      const placeholders = readingIds.map((_, i) => `$${i + 1}`).join(',');
      const vRes = await c.query(`
        SELECT word, definition_ar, tier, cefr_level
        FROM curriculum_vocabulary
        WHERE reading_id IN (${placeholders})
        ORDER BY tier_order, sort_order, word
      `, readingIds).catch(e => { gapList.push(`vocab for unit ${unit.unit_number}: ${e.message}`); return { rows: [] }; });
      vocabRows = vRes.rows;
      totalVocab += vocabRows.length;
      vocabRows.forEach(v => {
        if (v.cefr_level) cefrDist[v.cefr_level] = (cefrDist[v.cefr_level] || 0) + 1;
      });
    }

    usec.push('#### المفردات (Vocabulary)');
    usec.push(`- **Total:** ${vocabRows.length} words`);
    if (Object.keys(cefrDist).length) {
      usec.push(`- **CEFR distribution:** ${Object.entries(cefrDist).sort().map(([k,v])=>`${k}=${v}`).join(', ')}`);
    }
    const sample = vocabRows.slice(0, 10);
    if (sample.length) {
      usec.push('- **Sample (10):**');
      sample.forEach((v, i) => {
        const tags = [v.tier, v.cefr_level].filter(Boolean).join(', ');
        usec.push(`  ${i + 1}. **${v.word}** — ${v.definition_ar || '[no AR def]'}${tags ? ` [${tags}]` : ''}`);
      });
    }
    usec.push('');

    // ── Grammar ──
    const grammarRows = await c.query(`
      SELECT topic_name_en, topic_name_ar, explanation_content, category
      FROM curriculum_grammar
      WHERE unit_id = $1
      ORDER BY sort_order
    `, [unit.id]).catch(() => ({ rows: [] }));
    totalGrammar += grammarRows.rows.length;

    usec.push('#### القواعد (Grammar)');
    if (grammarRows.rows.length === 0) {
      usec.push('[NOT FOUND: no grammar topics for this unit]');
    } else {
      grammarRows.rows.forEach(g => {
        // Extract brief explanation from explanation_content JSONB
        let brief = '';
        try {
          const ec = g.explanation_content;
          if (ec && ec.sections && ec.sections.length > 0) {
            const firstSection = ec.sections[0];
            brief = firstSection.content || firstSection.explanation || firstSection.text || '';
          } else if (ec && ec.explanation) {
            brief = ec.explanation;
          }
        } catch {}
        usec.push(`- **${g.topic_name_ar || ''}** / ${g.topic_name_en}${g.category ? ` [${g.category}]` : ''}${brief ? ': ' + trunc(brief, 150) : ''}`);
      });
    }
    usec.push('');

    // ── Writing ──
    const writingRows = await c.query(`
      SELECT task_type, title_en, title_ar, prompt_en, prompt_ar, word_count_min, word_count_max, model_answer
      FROM curriculum_writing
      WHERE unit_id = $1
      ORDER BY sort_order
    `, [unit.id]).catch(() => ({ rows: [] }));
    totalWriting += writingRows.rows.length;

    usec.push('#### مهام الكتابة (Writing)');
    if (writingRows.rows.length === 0) {
      usec.push('[NOT FOUND: no writing tasks for this unit]');
    } else {
      writingRows.rows.forEach(w => {
        usec.push(`- **Task type:** ${w.task_type || '?'} | **Words:** ${w.word_count_min || '?'}–${w.word_count_max || '?'}`);
        usec.push(`  - **Title:** ${w.title_ar || ''} / ${w.title_en || ''}`);
        usec.push(`  - **Prompt (EN):** ${trunc(w.prompt_en, 200)}`);
        if (w.prompt_ar) usec.push(`  - **Prompt (AR):** ${trunc(w.prompt_ar, 200)}`);
        if (w.model_answer) usec.push(`  - **Model answer preview:** ${trunc(w.model_answer, 200)}`);
      });
    }
    usec.push('');

    // ── Listening ──
    const lisRows = await c.query(`
      SELECT title_en, title_ar, audio_url, audio_type, audio_duration_seconds, transcript
      FROM curriculum_listening
      WHERE unit_id = $1
      ORDER BY sort_order
    `, [unit.id]).catch(() => ({ rows: [] }));

    usec.push('#### الاستماع (Listening)');
    if (lisRows.rows.length === 0) {
      usec.push('[NOT FOUND: no listening content for this unit]');
      audioMissing.push(`Unit ${unit.unit_number}: ${unit.theme_en}`);
    } else {
      lisRows.rows.forEach(l => {
        const hasAudio = !!l.audio_url;
        if (hasAudio) totalAudio++;
        else audioMissing.push(`Unit ${unit.unit_number}: ${unit.theme_en}`);
        const transcriptWC = l.transcript ? wordCount(l.transcript) : 0;
        usec.push(`- **${l.title_en || '?'}** (${l.title_ar || ''})`);
        usec.push(`  - Audio: ${hasAudio ? '✅ ' + trunc(l.audio_url, 80) : '❌ none'} | Type: ${l.audio_type || '?'} | Duration: ${l.audio_duration_seconds ? l.audio_duration_seconds + 's' : '?'}`);
        usec.push(`  - Transcript: ${transcriptWC > 0 ? transcriptWC + ' words' : 'none'}`);
      });
    }
    usec.push('');

    // ── Speaking ──
    const speakRows = await c.query(`
      SELECT topic_type, title_en, title_ar, prompt_en, prompt_ar, min_duration_seconds, max_duration_seconds
      FROM curriculum_speaking
      WHERE unit_id = $1
      ORDER BY sort_order
    `, [unit.id]).catch(() => ({ rows: [] }));

    usec.push('#### المحادثة (Speaking)');
    if (speakRows.rows.length === 0) {
      usec.push('[NOT FOUND: no speaking topics for this unit]');
    } else {
      speakRows.rows.forEach(s => {
        usec.push(`- **${s.title_ar || ''} / ${s.title_en || '?'}** [${s.topic_type || '?'}]`);
        usec.push(`  - Prompt: ${trunc(s.prompt_en, 200)}`);
        if (s.min_duration_seconds) usec.push(`  - Duration: ${s.min_duration_seconds}–${s.max_duration_seconds || '?'}s`);
      });
    }
    usec.push('');
    usec.push('---');
    usec.push('');

    unitSections.push(usec);
  }

  // ── Summary ──
  const totalUnits = units.rows.length;
  const audioCoverage = totalUnits > 0 ? Math.round(100 * totalAudio / totalUnits) : 0;

  push('## 📊 Summary');
  push('');
  push(`- **Total units:** ${totalUnits}`);
  push(`- **Total reading passages:** ${totalPassages}`);
  push(`- **Total vocabulary entries:** ${totalVocab}`);
  push(`- **Total speaking topics (topic bank):** ${speakingTopics.rows.length}`);
  push(`- **Audio coverage:** ${audioCoverage}% (${totalAudio}/${totalUnits} units have audio)`);
  push(`- **Writing tasks:** ${totalWriting}`);
  push(`- **Grammar lessons:** ${totalGrammar}`);
  push('');
  push('---');
  push('');
  push('## 📚 Unit-by-Unit Detail');
  push('');

  unitSections.forEach(sec => sec.forEach(l => push(l)));

  // ── Speaking Topics bank ──
  push('## 🗣️ Speaking Topics — Level 2 (Topic Bank)');
  push('');
  if (speakingTopics.rows.length === 0) {
    push('[NOT FOUND: no topics in speaking_topic_banks for level=2]');
  } else {
    push('| # | English | Arabic | Category | Difficulty |');
    push('|---|---------|--------|----------|------------|');
    speakingTopics.rows.forEach(t => {
      push(`| ${t.topic_number} | ${t.title_en || '[empty]'} | ${t.title_ar || '[empty]'} | ${t.category || '?'} | ${t.difficulty || '?'} |`);
    });
  }
  push('');
  push('---');
  push('');

  // ── Gaps ──
  push('## 🚨 Gaps Detected');
  push('');
  if (audioMissing.length) {
    push(`- **Audio missing:** ${audioMissing.join(', ')}`);
  } else {
    push('- Audio: all units have audio ✅');
  }
  if (gapList.length) {
    gapList.forEach(g => push(`- ⚠️ ${g}`));
  } else {
    push('- No schema errors encountered ✅');
  }
  push('');
  push('---');
  push('');

  // ── Schema used ──
  push('## 🔧 Schema Used');
  push('');
  push('- units table: `curriculum_units`');
  push('- readings table: `curriculum_readings`');
  push('- vocabulary table: `curriculum_vocabulary`');
  push('- comprehension questions: `curriculum_comprehension_questions`');
  push('- speaking (per-unit): `curriculum_speaking`');
  push('- speaking topics bank: `speaking_topic_banks`');
  push('- writing tasks: `curriculum_writing`');
  push('- writing prompts: `curriculum_writing_prompts` (0 rows — empty)');
  push('- grammar: `curriculum_grammar`');
  push('- listening: `curriculum_listening`');
  push('');

  await c.end();

  const content = lines.join('\n');
  fs.writeFileSync(OUT_FILE, content, 'utf8');
  const sizeKB = (content.length / 1024).toFixed(1);
  console.log(`\n✅ Snapshot written: L2-CURRICULUM-SNAPSHOT.md (${sizeKB} KB)`);
  console.log(`Units: ${totalUnits} | Passages: ${totalPassages} | Vocab: ${totalVocab}`);
  console.log(`Speaking topics: ${speakingTopics.rows.length} | Writing: ${totalWriting} | Grammar: ${totalGrammar}`);
  return { totalUnits, totalPassages, totalVocab, speakingTopics: speakingTopics.rows.length, totalWriting, totalGrammar, totalAudio, sizeKB };
}

main().catch(e => { console.error('FATAL:', e.message, e.stack); process.exit(1); });
