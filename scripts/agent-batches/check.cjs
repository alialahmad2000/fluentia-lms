const input = require('./batch-10.json');
const d = require('./batch-10.result.json');
console.log('Input:', input.length, 'Output:', d.length);
console.log('Empty syns:', d.filter(x => x.synonyms.length === 0).length);
console.log('Empty ants:', d.filter(x => x.antonyms.length === 0).length);
let bad = 0;
for (const e of d) {
  for (const s of e.synonyms) {
    if (!s.word || !s.level) { console.log('BAD SYN', e.id, s); bad++; }
  }
  for (const a of e.antonyms) {
    if (!a.word || !a.level) { console.log('BAD ANT', e.id, a); bad++; }
  }
}
console.log('Bad entries:', bad);
const outIds = new Set(d.map(x => x.id));
for (const item of input) {
  if (!outIds.has(item.id)) console.log('MISSING:', item.id, item.word);
}
