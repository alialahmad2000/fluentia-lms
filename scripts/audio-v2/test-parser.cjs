'use strict';
const { parseTranscript, assertNoLabelResidue } = require('./lib/speaker-map.cjs');

const cases = [
  {
    name: 'simple dialogue',
    input: 'Sara: Hi, how are you?\nAhmed: I am fine, thanks.',
    expect: 2,
    expectFirst: { speaker: 'Sara', text: 'Hi, how are you?' },
  },
  {
    name: 'multi-line speaker turn',
    input: 'Sara: Hi.\nNice to see you.\nHow have you been?\nAhmed: Great, you?',
    expect: 2,
    expectFirst: { speaker: 'Sara', text: 'Hi. Nice to see you. How have you been?' },
  },
  {
    name: 'speaker with role',
    input: 'John (Manager): The report is ready.\nLisa: Thanks.',
    expect: 2,
    expectFirst: { speaker: 'John', text: 'The report is ready.' },
  },
  {
    name: 'monologue (no labels)',
    input: 'Today we will talk about climate change. It is the biggest issue of our time.',
    expect: 1,
    expectFirst: { speaker: '_narrator', text: 'Today we will talk about climate change. It is the biggest issue of our time.' },
  },
  {
    name: 'interview with Host/Guest pattern',
    input: 'Host: Welcome to the show.\nGuest: Thank you.\nHost: Tell us about yourself.\nGuest: I am a teacher.',
    expect: 4,
  },
  {
    name: 'tricky: colon inside content (time)',
    input: 'Sara: The meeting is at 10:30 AM.\nAhmed: OK.',
    expect: 2,
    expectFirst: { text: 'The meeting is at 10:30 AM.' },
  },
];

let pass = 0, fail = 0;
for (const c of cases) {
  const out = parseTranscript(c.input);
  let ok = out.length === c.expect;
  if (ok && c.expectFirst) {
    if (c.expectFirst.speaker && out[0].speaker_name !== c.expectFirst.speaker) ok = false;
    if (c.expectFirst.text && out[0].text !== c.expectFirst.text) ok = false;
  }
  try { assertNoLabelResidue(out); } catch (e) { ok = false; console.log(`  assertNoLabelResidue: ${e.message}`); }

  if (ok) { console.log(`✓ ${c.name}`); pass++; }
  else { console.log(`✗ ${c.name}`); console.log('  got:', JSON.stringify(out)); fail++; }
}

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail === 0 ? 0 : 1);
