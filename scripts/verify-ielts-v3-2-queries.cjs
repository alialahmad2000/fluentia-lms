require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ALI_ID = 'e36e877c-003e-4a8d-a505-ce8c18c15bd5';

async function runWelcomeHookQuery(profileId) {
  // Step 1: get diagnostic mock test id
  const { data: mock, error: me } = await supabase
    .from('ielts_mock_tests')
    .select('id')
    .eq('test_number', 0)
    .single();
  if (me) return { error: me.message };

  // Step 2: get latest in_progress or completed attempt
  const { data: attempt, error: ae } = await supabase
    .from('ielts_mock_attempts')
    .select('id, status, result_id, completed_at')
    .eq('student_id', profileId)
    .eq('mock_test_id', mock.id)
    .in('status', ['in_progress', 'completed'])
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (ae) return { error: ae.message };

  let state = 'none';
  if (attempt?.status === 'in_progress') state = 'in_progress';
  else if (attempt?.status === 'completed') state = 'completed';

  return { state, attempt: attempt || null };
}

async function runResultsHookQuery(profileId) {
  const { data, error } = await supabase
    .from('ielts_student_results')
    .select('id, result_type, overall_band, reading_score, listening_score, writing_score, speaking_score, strengths, weaknesses, created_at')
    .eq('student_id', profileId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { hasResult: false };

  const overall = data.overall_band;
  const skills = {
    listening: data.listening_score,
    reading:   data.reading_score,
    writing:   data.writing_score,
    speaking:  data.speaking_score,
  };
  const strengthSkills = Object.entries(skills).filter(([,b]) => b != null && overall != null && b >= overall + 0.5).map(([k]) => k);
  const weaknessSkills = Object.entries(skills).filter(([,b]) => b != null && overall != null && b <= overall - 0.5).map(([k]) => k);

  return { hasResult: true, overallBand: overall, skills, strengthSkills, weaknessSkills, completedAt: data.created_at };
}

async function main() {
  // Use admin profile id (Ali's actual id)
  const { data: ali } = await supabase.from('profiles').select('id, full_name').eq('email', 'alialahmad2000@gmail.com').maybeSingle();
  const profileId = ali?.id || ALI_ID;

  console.log(`Profile: ${JSON.stringify(ali)}\n`);

  console.log('=== Welcome Hook Query (useDiagnosticStateV2) ===');
  const welcomeResult = await runWelcomeHookQuery(profileId);
  console.log(JSON.stringify(welcomeResult, null, 2));
  console.log('');

  console.log('=== Results Hook Query (useDiagnosticResultV2) ===');
  const resultsResult = await runResultsHookQuery(profileId);
  console.log(JSON.stringify(resultsResult, null, 2));
  console.log('');

  const welcomeOk = !welcomeResult.error;
  const resultsOk = !resultsResult.error;
  console.log(`Welcome query: ${welcomeOk ? '✓' : '✗'} ${welcomeResult.error || ''}`);
  console.log(`Results query: ${resultsOk ? '✓' : '✗'} ${resultsResult.error || ''}`);
  console.log(`\n${welcomeOk && resultsOk ? '✓ All queries passed' : '✗ Some queries failed'}`);
  process.exit(welcomeOk && resultsOk ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
