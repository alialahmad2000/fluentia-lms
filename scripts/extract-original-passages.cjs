const fs = require('fs');
const raw = fs.readFileSync('./PHASE-2-CLEANUP/rollback-staging/readings_full_original.json', 'utf8');
// Strip any preamble before the JSON
const jsonStart = raw.indexOf('{');
const parsed = JSON.parse(raw.substring(jsonStart));
const data = parsed.rows || parsed;

console.log('Total readings:', data.length);
const l0 = data.filter(r => r.level_number === 0);
const l1 = data.filter(r => r.level_number === 1);
console.log('L0:', l0.length, '| L1:', l1.length);
console.log('L0 fields:', Object.keys(l0[0]).join(', '));
console.log('L0 sample title:', l0[0].title_en);
console.log('L1 sample title:', l1[0].title_en);
console.log('Has passage_content:', Boolean(l0[0].passage_content));
console.log('Has passage_word_count:', Boolean(l0[0].passage_word_count));

// Save just L0+L1
const l0l1 = data.filter(r => r.level_number === 0 || r.level_number === 1);
fs.writeFileSync('./PHASE-2-CLEANUP/rollback-staging/l0_l1_passages_original.json', JSON.stringify(l0l1, null, 2));
console.log('Saved l0_l1_passages_original.json:', l0l1.length, 'rows');
