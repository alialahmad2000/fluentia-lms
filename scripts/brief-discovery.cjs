// scripts/brief-discovery.cjs
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log('=== UNIT BRIEF DISCOVERY ===\n');

  // A.1 — curriculum_units columns (inferred from sample)
  const { data: sample, error: sampleErr } = await supabase.from('curriculum_units').select('*').limit(1).single();
  if (sampleErr) {
    console.log('curriculum_units sample ERROR:', sampleErr.message);
  } else {
    console.log('curriculum_units columns:', Object.keys(sample));
  }

  // A.2 — sample unit shape
  console.log('\nSample unit (full):', JSON.stringify(sample, null, 2));

  // A.3 — count units per level
  const { data: levelCounts } = await supabase
    .from('curriculum_units')
    .select('level_id, curriculum_levels!inner(level_number, cefr)');
  const byLevel = {};
  for (const u of levelCounts || []) {
    const key = `L${u.curriculum_levels.level_number} (${u.curriculum_levels.cefr})`;
    byLevel[key] = (byLevel[key] || 0) + 1;
  }
  console.log('\nUnits per level:', byLevel);

  // A.4 — hero image column?
  console.log('\nHero image column present?',
    sample && ('hero_image_url' in sample || 'image_url' in sample || 'cover_image' in sample));

  // A.5 — vocab count strategy for first 5 units
  const { data: unitsForVocab } = await supabase
    .from('curriculum_units')
    .select('id, unit_number, level_id')
    .order('unit_number')
    .limit(5);
  console.log('\nVocab counts for first 5 units:');
  for (const u of unitsForVocab || []) {
    const { count: directCount } = await supabase
      .from('curriculum_vocabulary')
      .select('*', { count: 'exact', head: true })
      .eq('unit_id', u.id);
    if (!directCount) {
      const { data: readings } = await supabase
        .from('curriculum_readings')
        .select('id')
        .eq('unit_id', u.id);
      let viaReadings = 0;
      for (const r of readings || []) {
        const { count } = await supabase
          .from('curriculum_vocabulary')
          .select('*', { count: 'exact', head: true })
          .eq('reading_id', r.id);
        viaReadings += count || 0;
      }
      console.log(`  Unit ${u.unit_number} (${u.id.slice(0,8)}): ${viaReadings} vocab (via readings)`);
    } else {
      console.log(`  Unit ${u.unit_number} (${u.id.slice(0,8)}): ${directCount} vocab (direct)`);
    }
  }

  // A.6 — existing brief-related columns
  const existingBriefCols = sample ? Object.keys(sample).filter(k =>
    k.includes('brief') || k.includes('outcome') || k.includes('why_matters') || k.includes('theme')
  ) : [];
  console.log('\nExisting brief/theme related columns:', existingBriefCols);

  // A.7 — unit-v2 folder structure
  const { execSync } = require('child_process');
  console.log('\n=== FILE STRUCTURE ===');
  try {
    const files = execSync('dir /B "src\\pages\\student\\curriculum\\unit-v2\\"', { cwd: 'C:\\Users\\Dr. Ali\\Desktop\\fluentia-lms', encoding: 'utf-8' });
    console.log('unit-v2 contents:\n', files);
  } catch (e) {
    console.log('unit-v2 path error:', e.message.slice(0, 100));
    try {
      const files2 = execSync('dir /B /S "src\\pages\\student\\curriculum\\"', { cwd: 'C:\\Users\\Dr. Ali\\Desktop\\fluentia-lms', encoding: 'utf-8' });
      console.log('curriculum folder tree:\n', files2);
    } catch (e2) {
      console.log('Fallback error:', e2.message.slice(0, 100));
    }
  }

  // A.8 — student_unit_progress columns
  const { data: progressSample } = await supabase
    .from('student_unit_progress')
    .select('*')
    .limit(1);
  console.log('\nstudent_unit_progress columns:', progressSample?.[0] ? Object.keys(progressSample[0]) : 'EMPTY OR NOT FOUND');

  // A.9 — ANTHROPIC_API_KEY
  console.log('\nANTHROPIC_API_KEY set:', !!process.env.ANTHROPIC_API_KEY);
  console.log('Key prefix:', process.env.ANTHROPIC_API_KEY?.slice(0, 12) || 'MISSING');

  // A.10 — Check curriculum_units title/theme columns
  console.log('\nHas title_ar?', sample && 'title_ar' in sample);
  console.log('Has theme_ar?', sample && 'theme_ar' in sample);
  console.log('Has grammar_topic?', sample && 'grammar_topic' in sample);

  // A.11 — Total unit count
  const { count: totalUnits } = await supabase
    .from('curriculum_units')
    .select('*', { count: 'exact', head: true });
  console.log('\nTotal curriculum_units:', totalUnits);

  // A.12 — curriculum_readings sample
  const { data: readingSample } = await supabase
    .from('curriculum_readings')
    .select('*')
    .limit(1).single();
  console.log('\ncurriculum_readings columns:', readingSample ? Object.keys(readingSample) : 'EMPTY');

  // A.13 — curriculum_vocabulary sample
  const { data: vocabSample } = await supabase
    .from('curriculum_vocabulary')
    .select('*')
    .limit(1).single();
  console.log('\ncurriculum_vocabulary columns:', vocabSample ? Object.keys(vocabSample) : 'EMPTY');

  // A.14 — curriculum_levels full list
  const { data: levels } = await supabase
    .from('curriculum_levels')
    .select('id, level_number, cefr, name_ar')
    .order('level_number');
  console.log('\ncurriculum_levels:', levels);

  console.log('\n=== DISCOVERY COMPLETE ===');
}

main().catch(console.error);
