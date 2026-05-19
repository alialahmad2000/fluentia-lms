const { stripSpeakerLabel } = require('./strip-speaker-label.cjs')

const cases = [
  // English labels — should strip
  ['Dr. Ali: Hey Mohammed, how are you?', 'Hey Mohammed, how are you?'],
  ['Mohammed: I am good doctor Ali, what about you?', 'I am good doctor Ali, what about you?'],
  ['Speaker A: This is a test.', 'This is a test.'],
  ['Doctor Mohammed Sharbat: Welcome to class.', 'Welcome to class.'],
  ['[Mohammed]: I agree.', 'I agree.'],
  ['(Dr. Ali) Hey there', 'Hey there'],

  // Arabic labels — should strip
  ['د. علي: مرحبا', 'مرحبا'],
  ['محمد: أنا بخير', 'أنا بخير'],
  ['الدكتور علي: كيف حالك', 'كيف حالك'],

  // Should NOT strip
  ['I have three options: red, blue, and green.', 'I have three options: red, blue, and green.'],
  ['The time is 3:45 PM.', 'The time is 3:45 PM.'],
  ['No label here at all.', 'No label here at all.'],
  ['', ''],
]

let pass = 0, fail = 0
const failures = []
for (const [input, expected] of cases) {
  const actual = stripSpeakerLabel(input)
  if (actual === expected) {
    pass++
    console.log(`✓ "${input}" → "${actual}"`)
  } else {
    fail++
    failures.push({ input, expected, actual })
    console.log(`✗ "${input}"\n  expected: "${expected}"\n  actual:   "${actual}"`)
  }
}
console.log(`\n${pass}/${pass + fail} passed`)
if (fail > 0) process.exit(1)
