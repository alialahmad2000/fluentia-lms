/**
 * Phase D verification: confirm reading/listening default path resolves to canonical
 * regardless of student interest state.
 *
 * This is a static-analysis verification (the runtime hooks aren't invoked here).
 * It asserts that:
 *   1. No production code outside src/components/personalization/ imports a personalization hook/component.
 *   2. Sample canonical reading + listening rows exist and have the columns the default flow needs.
 *
 * Run: node scripts/audits/verify-canonical-only.cjs
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');

const sb = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

let fail = 0;
let pass = 0;
function check(name, ok, detail = '') {
  if (ok) { console.log(`✓ ${name}`); pass++; }
  else { console.log(`✗ ${name}${detail ? '\n  ' + detail : ''}`); fail++; }
}

(async () => {
  console.log('=== Phase D — verify canonical-only ===\n');

  // 1. No active (uncommented) production imports of personalization
  // grep -n returns "file:line:content"; filter out lines starting with // after optional whitespace
  const grepRaw = (() => {
    try {
      return execSync(
        `grep -rn "from.*personalization\\|from.*hooks/usePersonalizedReading\\|from.*hooks/useUserInterests" src/`,
        { encoding: 'utf8' }
      ).trim().split('\n').filter(Boolean);
    } catch { return []; }
  })();
  const offendingMatches = grepRaw.filter(line => {
    const [filePath, , ...rest] = line.split(':');
    const content = rest.join(':');
    if (filePath.startsWith('src/components/personalization/')) return false;
    if (filePath === 'src/hooks/usePersonalizedReading.js') return false;
    if (filePath === 'src/hooks/useUserInterests.js') return false;
    // Exclude comment lines (// or *)
    if (/^\s*(\/\/|\*)/.test(content)) return false;
    return true;
  });
  check(
    'No active production imports of personalization outside personalization/',
    offendingMatches.length === 0,
    offendingMatches.length ? `Offending:\n  ${offendingMatches.join('\n  ')}` : ''
  );

  // 2. Sample 5 random canonical reading rows
  const { data: readings, error: re } = await sb
    .from('curriculum_readings')
    .select('id, unit_id, title_en, passage_content')
    .limit(5);
  check('Canonical reading rows fetched', !re && readings && readings.length === 5, re?.message);

  // 3. Sample 5 random canonical listening rows
  const { data: listenings, error: le } = await sb
    .from('curriculum_listening')
    .select('id, unit_id, title_ar, audio_url')
    .not('audio_url', 'is', null)
    .limit(5);
  check('Canonical listening rows fetched', !le && listenings && listenings.length === 5, le?.message);

  // 4. Personalized variant tables still exist (we did NOT drop them)
  const { data: variants, error: ve } = await sb
    .from('personalized_readings')
    .select('id')
    .limit(1);
  check('personalized_readings table preserved (no drop)', !ve, ve?.message);

  const { data: interests, error: ie } = await sb
    .from('user_interests')
    .select('user_id')
    .limit(1);
  check('user_interests table preserved (no drop)', !ie, ie?.message);

  // 5. (No DB migration check here — negative assertion is via git diff in Phase E.1.6)

  console.log(`\n${pass}/${pass + fail} checks passed`);
  process.exit(fail > 0 ? 1 : 0);
})();
