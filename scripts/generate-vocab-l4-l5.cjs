/**
 * Generate missing vocabulary for Level 4 and Level 5
 * Uses Claude API to extract vocabulary from reading passages
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function callClaude(prompt, maxTokens = 4096) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error('Claude API error ' + res.status + ': ' + err);
  }
  const data = await res.json();
  return data.content[0].text;
}

function extractJSON(text) {
  // Find JSON array in response
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('No JSON array found in response');
  return JSON.parse(match[0]);
}

async function generateVocabForReading(reading, levelNumber) {
  const passageText = reading.passage_content && reading.passage_content.paragraphs
    ? reading.passage_content.paragraphs.join('\n\n')
    : '';

  if (!passageText) {
    console.log('    WARNING: Empty passage for reading ' + reading.id);
    return [];
  }

  const levelDesc = levelNumber === 4
    ? 'B2 Upper-Intermediate (CEFR B2). Words should be academic, moderately advanced, used in formal/academic contexts.'
    : 'C1 Advanced (CEFR C1). Words should be sophisticated, academic, and nuanced — appropriate for advanced English learners.';

  const prompt = `You are a vocabulary extraction expert for an English language learning platform for Saudi Arabian students.

Reading Title: "${reading.title_en}"
Reading Label: ${reading.reading_label}
Level: ${levelNumber} — ${levelDesc}

PASSAGE:
${passageText}

TASK: Extract exactly 10 vocabulary words from this passage that are appropriate for ${levelNumber === 4 ? 'B2' : 'C1'} level learners. Choose words that:
- Actually appear in the passage (marked with * or used naturally)
- Are academically useful and worth learning
- Range from high_frequency to low_frequency for this level
- Cover different parts of speech (nouns, verbs, adjectives, adverbs)

For each word, provide:
- word: the word as it appears (base form / lemma)
- definition_en: clear English definition (1-2 sentences, appropriate for ${levelNumber === 4 ? 'B2' : 'C1'} learners)
- definition_ar: Arabic translation (2-3 equivalent terms separated by commas)
- example_sentence: a NEW example sentence (not from the passage) that clearly demonstrates the word's meaning
- part_of_speech: one of "noun", "verb", "adjective", "adverb", "phrase"
- difficulty_tier: one of "high_frequency", "academic", "low_frequency"

Return ONLY a JSON array of objects. No markdown, no explanation. Example format:
[
  {
    "word": "unprecedented",
    "definition_en": "never having happened or existed before",
    "definition_ar": "غير مسبوق، لم يحدث من قبل",
    "example_sentence": "The company achieved unprecedented growth in its first year.",
    "part_of_speech": "adjective",
    "difficulty_tier": "academic"
  }
]

Return exactly 10 words as a JSON array.`;

  const response = await callClaude(prompt);
  const words = extractJSON(response);

  if (!Array.isArray(words)) throw new Error('Response is not an array');
  return words;
}

async function main() {
  console.log('========================================');
  console.log('  Vocabulary Generator — Level 4 & 5');
  console.log('========================================\n');

  // Load lookup tables
  const { data: levels } = await sb.from('curriculum_levels').select('id, level_number, name_ar');
  const { data: units } = await sb.from('curriculum_units').select('id, level_id, unit_number');

  const levelMap = {};
  levels.forEach(l => { levelMap[l.id] = l; });

  // Get Level 4 and 5 IDs
  const level4 = levels.find(l => l.level_number === 4);
  const level5 = levels.find(l => l.level_number === 5);
  if (!level4 || !level5) throw new Error('Level 4 or 5 not found');

  const targetLevels = [level4, level5];
  let grandTotal = 0;
  const summary = {};

  for (const level of targetLevels) {
    const ln = level.level_number;
    console.log('=== Level ' + ln + ' ===\n');
    summary[ln] = { readings: 0, words: 0, errors: 0 };

    // Get units for this level
    const levelUnits = units.filter(u => u.level_id === level.id).sort((a, b) => a.unit_number - b.unit_number);

    for (const unit of levelUnits) {
      // Get readings for this unit
      const { data: readings } = await sb
        .from('curriculum_readings')
        .select('id, unit_id, reading_label, title_en, passage_content, passage_word_count')
        .eq('unit_id', unit.id)
        .order('reading_label');

      if (!readings || readings.length === 0) {
        console.log('  Unit ' + unit.unit_number + ': No readings found');
        continue;
      }

      for (const reading of readings) {
        const tag = 'L' + ln + 'U' + unit.unit_number + reading.reading_label;
        process.stdout.write('  ' + tag + ' "' + (reading.title_en || '').slice(0, 40) + '..." ');

        try {
          const words = await generateVocabForReading(reading, ln);

          // Insert into curriculum_vocabulary
          const rows = words.map((w, i) => ({
            reading_id: reading.id,
            word: w.word,
            definition_en: w.definition_en,
            definition_ar: w.definition_ar,
            example_sentence: w.example_sentence,
            part_of_speech: w.part_of_speech,
            difficulty_tier: w.difficulty_tier || 'academic',
            sort_order: i,
          }));

          const { error } = await sb.from('curriculum_vocabulary').insert(rows);
          if (error) throw new Error('Insert failed: ' + error.message);

          console.log(words.length + ' words');
          summary[ln].readings++;
          summary[ln].words += words.length;
          grandTotal += words.length;
        } catch (err) {
          console.log('ERROR: ' + err.message);
          summary[ln].errors++;
        }

        // Rate limit
        await sleep(1500);
      }
    }
    console.log('');
  }

  // Print summary
  console.log('========================================');
  console.log('  Summary');
  console.log('========================================');
  for (const ln of [4, 5]) {
    const s = summary[ln];
    console.log('  Level ' + ln + ': ' + s.words + ' words from ' + s.readings + ' readings (' + s.errors + ' errors)');
  }
  console.log('  TOTAL: ' + grandTotal + ' words');
  console.log('========================================');

  // Verify
  const { data: finalCount } = await sb.from('curriculum_vocabulary').select('id', { count: 'exact', head: true });
  console.log('\n  Total vocab in DB now: ' + (finalCount ? finalCount.length : 'unknown'));
}

main().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
