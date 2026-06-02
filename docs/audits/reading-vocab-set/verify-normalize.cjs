#!/usr/bin/env node
/**
 * Phase C verification — proves the ArticleBody vocab-index normalization yields a
 * real Map (with working .has/.get) for EVERY shape `vocabIndex` can arrive as,
 * including the production crasher: a Map rehydrated from the localStorage persister,
 * which JSON-serializes to a plain `{}`.
 *
 * The function below mirrors the useMemo body in
 * src/components/curriculum/reading/ArticleBody.jsx exactly.
 */

function normalize(vocabIndex) {
  const s = vocabIndex
  if (s instanceof Map) return s
  const out = new Map()
  const put = (key, val) => {
    if (key == null) return
    const k = String(key).toLowerCase()
    if (k) out.set(k, val ?? null)
  }
  if (s instanceof Set) {
    s.forEach((w) => put(w, null))
  } else if (Array.isArray(s)) {
    s.forEach((w) => (typeof w === 'string' ? put(w, null) : put(w?.word ?? w?.word_en, w)))
  } else if (s && typeof s === 'object') {
    const inner = s.data
    if (inner instanceof Map) return inner
    const src = inner && typeof inner === 'object' ? inner : s
    if (Array.isArray(src)) {
      src.forEach((w) => (typeof w === 'string' ? put(w, null) : put(w?.word ?? w?.word_en, w)))
    } else {
      Object.entries(src).forEach(([k, v]) => put(k, v && typeof v === 'object' ? v : null))
    }
  }
  return out
}

let pass = 0
let fail = 0
function check(name, fn) {
  try {
    fn()
    pass++
    console.log(`  PASS  ${name}`)
  } catch (e) {
    fail++
    console.log(`  FAIL  ${name} — ${e.message}`)
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed')
}

const row = { id: 'x', word: 'cat', definition_ar: 'قطة' }

// The crash precondition: every shape must produce something with callable .has/.get.
const shapes = {
  'real Map': new Map([['cat', row]]),
  'rehydrated empty {} (THE production crasher)': {},
  'plain object keyed by word': { cat: row, dog: { word: 'dog' } },
  'Set of words': new Set(['Cat', 'DOG']),
  'array of strings': ['Cat', 'dog'],
  'array of row objects': [row, { word_en: 'Dog' }],
  '{data: Map} wrapper': { data: new Map([['cat', row]]) },
  '{data: array} wrapper': { data: ['Cat'] },
  null: null,
  undefined: undefined,
}

console.log('— every shape yields a Map with non-throwing .has/.get —')
for (const [name, input] of Object.entries(shapes)) {
  check(name, () => {
    const m = normalize(input)
    assert(m instanceof Map, 'did not return a Map')
    // The exact operations ArticleBody performs — must never throw.
    assert(typeof m.has === 'function', '.has missing')
    assert(typeof m.get === 'function', '.get missing')
    m.has('cat')
    m.get('cat')
  })
}

console.log('\n— semantics preserved (underline detection + popup row) —')
check('Map → cat detected + row returned', () => {
  const m = normalize(new Map([['cat', row]]))
  assert(m.has('cat') === true)
  assert(m.get('cat') === row)
})
check('keyed object → case-insensitive detection + row', () => {
  const m = normalize({ Cat: row })
  assert(m.has('cat') === true, 'cat not detected')
  assert(m.get('cat') === row, 'row not returned')
})
check('Set → words detected (lowercased), row null', () => {
  const m = normalize(new Set(['Cat']))
  assert(m.has('cat') === true)
  assert(m.get('cat') === null)
})
check('array of row objects → word_en detected', () => {
  const m = normalize([{ word_en: 'Dog' }])
  assert(m.has('dog') === true)
})
check('rehydrated {} → no false positives, no crash', () => {
  const m = normalize({})
  assert(m.has('cat') === false)
  assert(m.size === 0)
})
check('non-vocab word never underlined', () => {
  const m = normalize(new Map([['cat', row]]))
  assert(m.has('elephant') === false)
})

console.log(`\nRESULT: ${pass} passed, ${fail} failed`)
process.exit(fail === 0 ? 0 : 1)
