#!/usr/bin/env node
'use strict';
require('dotenv').config({ path: 'C:/Users/Dr. Ali/Desktop/fluentia-lms/.env' });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Detects ت...ين (2nd-person feminine conjugated verbs) and تسجيل forms.
// Uses word-boundary lookahead/lookbehind so it doesn't match substrings
// inside longer words like المحتفلين, البيتكوين, اقتصاديين, etc.
const FEM_VERB_RE = /(?<![\u0621-\u064A\u0671-\u06D3])ت[\u0621-\u064A]+ين(?![\u0621-\u064A\u0671-\u06D3])/;
const TASJIL_RE = /تسج[\u064A\u0651][\u0644\u064A]/;

// Form-II masdars (تفعيل where 3rd radical = ن) and other common nouns
// that match the verb regex but are not feminine verb violations.
const MASDAR_FP = new Set([
  'تحسين','تدوين','تكوين','تخمين','تمكين',
  'تزيين','تلحين','تعيين','تلوين','تبيين','تزيين',
]);

async function main() {
  const { data: units, error } = await sb
    .from('curriculum_units')
    .select('id, unit_number, why_matters, outcomes, activity_ribbons, curriculum_levels!inner(level_number)')
    .not('brief_generated_at', 'is', null);
  if (error) { console.error(error.message); process.exit(1); }

  const u = (units || []).sort((a, b) => {
    const la = a.curriculum_levels?.level_number ?? 99;
    const lb = b.curriculum_levels?.level_number ?? 99;
    return la !== lb ? la - lb : a.unit_number - b.unit_number;
  });

  let femWhy = 0, femOut = 0, tasWhy = 0, femRib = 0, tasRib = 0;
  const femWhySamples = [], femOutSamples = [], tasWhySamples = [], femRibSamples = [], tasRibSamples = [];

  function hasFemVerb(text) {
    const m = text.match(new RegExp(FEM_VERB_RE.source, 'g'));
    if (!m) return false;
    return m.some(w => !MASDAR_FP.has(w));
  }

  for (const unit of u) {
    const wm = unit.why_matters || '';
    const outText = (unit.outcomes || []).join('\n');
    const lvl = unit.curriculum_levels?.level_number;

    if (hasFemVerb(wm)) {
      femWhy++;
      if (femWhySamples.length < 4) femWhySamples.push(`L${lvl} U${unit.unit_number}: ${wm.slice(0, 100)}`);
    }
    if (hasFemVerb(outText)) {
      femOut++;
      if (femOutSamples.length < 4) {
        const badOut = (unit.outcomes || []).find(o => hasFemVerb(o));
        femOutSamples.push(`L${lvl} U${unit.unit_number}: ${(badOut || '').slice(0, 80)}`);
      }
    }
    if (TASJIL_RE.test(wm) || TASJIL_RE.test(outText)) {
      tasWhy++;
      if (tasWhySamples.length < 4) tasWhySamples.push(`L${lvl} U${unit.unit_number}: ${wm.slice(0, 100)}`);
    }
    const ribObj = unit.activity_ribbons || {};
    const ribEntries = Object.entries(ribObj);
    if (ribEntries.some(([, v]) => hasFemVerb(String(v)))) {
      femRib++;
      if (femRibSamples.length < 4) {
        const badKey = ribEntries.find(([, v]) => hasFemVerb(String(v)));
        if (badKey) femRibSamples.push(`L${lvl} U${unit.unit_number} [${badKey[0]}]: ${badKey[1].slice(0, 80)}`);
      }
    }
    if (ribEntries.some(([, v]) => TASJIL_RE.test(String(v)))) {
      tasRib++;
      if (tasRibSamples.length < 4) {
        const badKey = ribEntries.find(([, v]) => TASJIL_RE.test(String(v)));
        if (badKey) tasRibSamples.push(`L${lvl} U${unit.unit_number} [${badKey[0]}]: ${badKey[1].slice(0, 80)}`);
      }
    }
  }

  console.log('=== PHASE A DISCOVERY ===');
  console.log(`Feminine verbs in why_matters:     ${femWhy}`);
  console.log(`Feminine verbs in outcomes:        ${femOut}`);
  console.log(`"تسجيل" word in why_matters/outcomes: ${tasWhy}`);
  console.log(`Feminine verbs in activity_ribbons: ${femRib}`);
  console.log(`"تسجيل" word in ribbons:           ${tasRib}`);
  console.log(`\nTotal units: ${u.length}`);

  if (femWhySamples.length) {
    console.log('\n--- Sample: feminine verbs in why_matters ---');
    femWhySamples.forEach(s => console.log('  ' + s));
  }
  if (femOutSamples.length) {
    console.log('\n--- Sample: feminine verbs in outcomes ---');
    femOutSamples.forEach(s => console.log('  ' + s));
  }
  if (tasWhySamples.length) {
    console.log('\n--- Sample: تسجيل in why_matters/outcomes ---');
    tasWhySamples.forEach(s => console.log('  ' + s));
  }
  if (femRibSamples.length) {
    console.log('\n--- Sample: feminine verbs in ribbons ---');
    femRibSamples.forEach(s => console.log('  ' + s));
  }
  if (tasRibSamples.length) {
    console.log('\n--- Sample: تسجيل in ribbons ---');
    tasRibSamples.forEach(s => console.log('  ' + s));
  }

  if (femWhy === 0 && femOut === 0 && femRib === 0 && tasWhy === 0 && tasRib === 0) {
    console.log('\n✓ PHASE D VALIDATION PASSED — zero violations across all fields.');
  } else {
    console.log('\n✗ Violations remain. Do not commit. Investigate the samples above.');
    process.exit(1);
  }
}
main().catch(e => { console.error(e); process.exit(1); });
