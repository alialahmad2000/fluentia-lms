const i = require('./batch-01.json');
const o = require('./batch-01.result.json');
console.log('input length:', i.length);
console.log('output length:', o.length);
const iIds = new Set(i.map(x => x.id));
const oIds = new Set(o.map(x => x.id));
const missing = [];
for (const id of iIds) if (!oIds.has(id)) missing.push(id);
const extra = [];
for (const id of oIds) if (!iIds.has(id)) extra.push(id);
console.log('missing in output:', missing.length);
console.log('extra in output:', extra.length);
if (missing.length > 0) {
  const missingWords = missing.map(id => i.find(x => x.id === id).word);
  console.log('missing words:', missingWords);
}
const emptyS = o.filter(x => !x.synonyms || x.synonyms.length === 0).length;
const emptyA = o.filter(x => !x.antonyms || x.antonyms.length === 0).length;
console.log('empty synonyms:', emptyS);
console.log('empty antonyms:', emptyA);
