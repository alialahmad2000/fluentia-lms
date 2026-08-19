import { buildSession, advanceSession, sessionHasNext, sessionCovered } from '../../src/lib/vocabSession.js'
const words = Array.from({ length: 84 }, (_, i) => ({ id: `w${i}` }))
const mastered = new Set(['w0', 'w1'])
const isMastered = (w) => mastered.has(w.id)
let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : (fail++, console.log('FAIL:', m)) }

const s0 = buildSession(words, isMastered, 10, 2)
ok(s0.ids.length === 10, 'queue is exactly 10')
ok(s0.ids[0] === 'w2', 'skips mastered words')
ok(sessionHasNext(s0), 'has next at start')

// walk the whole queue
let s = s0, steps = 0, ended = false
while (steps < 50) {
  const r = advanceSession(s, words)
  s = r.session; steps++
  if (s.finished) { ended = true; break }
  ok(!!r.word, `step ${steps} returns a word`)
}
ok(ended, 'the queue ENDS')
ok(steps === 10, `ends after exactly 10 steps (got ${steps})`)
ok(!sessionHasNext(s), 'no next once finished')
ok(sessionCovered(s) === 10, 'covered = 10')

// a short unit must not over-promise
const few = words.slice(0, 5)
const s1 = buildSession(few, () => false, 10, 0)
ok(s1.ids.length === 5, 'queue clamps to the words available')
let s2 = s1, n = 0
while (!s2.finished && n < 20) { s2 = advanceSession(s2, few).session; n++ }
ok(n === 5, `short unit ends after 5 (got ${n})`)

// nothing left to study
ok(buildSession(words, () => true, 10, 0) === null, 'no session when everything is mastered')
// partial session reports what it covered
const s3 = { ids: ['a','b','c','d'], i: 1, startMastered: 0, finished: true }
ok(sessionCovered(s3) === 2, 'partial session reports 2 covered')

console.log(`vocabSession: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
