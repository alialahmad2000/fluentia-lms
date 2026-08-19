/**
 * lesson topic → form paradigm(s).
 *
 * Ordered rules, first match wins. An EMPTY array is a deliberate, correct
 * answer: prepositions, discourse markers, register and cleft sentences have no
 * verb paradigm, and generating a forms table for them would be fabricated
 * teaching content. Those lessons get their depth from the other layers.
 *
 * Contrast lessons deliberately return TWO paradigms — a student comparing
 * past simple with present perfect should see both tables side by side.
 */
const RULES = [
  [/present perfect (continuous|cont)|perfect continuous/, ['present_perfect_continuous']],
  [/(present perfect.*(vs|versus).*past simple)|(past simple.*(vs|versus).*present perfect)/, ['past_simple_regular', 'present_perfect']],
  [/present perfect.*(\+|&|and).*present continuous/, ['present_perfect', 'present_continuous']],
  [/present perfect/, ['present_perfect']],
  [/(present continuous.*(vs|versus).*present simple)|(present simple.*(vs|versus).*present continuous)/, ['present_simple', 'present_continuous']],
  [/past continuous.*(vs|versus).*past simple/, ['past_simple_regular', 'past_continuous']],
  [/future forms|will.*going to|going to.*will|will vs going to/, ['future_will', 'future_going_to', 'present_continuous']],
  [/wish/, ['wish']],
  [/have something done|get something done/, ['have_something_done']],
  [/would like|want\/would like/, ['would_like']],
  [/first (&|and) second conditional/, ['conditional_1', 'conditional_2']],
  [/first conditional/, ['conditional_1']],
  [/second conditional/, ['conditional_2']],
  [/third conditional/, ['conditional_3']],
  [/mixed conditional/, ['mixed_conditional']],
  [/unless|as long as/, ['conditional_1']],
  [/passive.*past|past.*passive/, ['passive_past']],
  [/passive/, ['passive_present', 'passive_past']],
  [/relative clause/, ['relative_clause']],
  [/reported speech|indirect|polite question/, ['reported_speech']],
  [/have to|need to|obligation|necessity|urgency/, ['modal', 'have_to']],
  [/modal|must|should|ought to|recommendation|advice|may|might|can\b|can't|cant|ability/, ['modal']],
  [/comparative|superlative|softening|as … as|as as/, ['comparative_superlative']],
  [/gerund|infinitive/, ['gerund_infinitive']],
  [/used to/, ['used_to']],
  [/irregular/, ['past_simple_irregular']],
  [/past negative|past simple|simple past/, ['past_simple_regular']],
  [/past continuous/, ['past_continuous']],
  [/future perfect/, ['future_perfect']],
  [/future continuous/, ['future_continuous']],
  [/present continuous/, ['present_continuous']],
  [/adverbs? of frequency|present simple|simple present|facts.*routines/, ['present_simple']],
  [/going to/, ['future_going_to']],
  [/\bwill\b/, ['future_will']],
  [/there is|there are/, ['there_be']],
  [/imperative|instruction/, ['imperative']],
  [/am\/is\/are|verb to be/, ['be_present']],
  [/question (words|forms)|question form/, ['present_simple', 'past_simple_regular']],
]

// Lessons with no verb paradigm but a real spelling/form story of their own.
const EXTRA_SPELLING = [
  [/plural/, ['plurals']],
  [/comparative|superlative/, ['comparative_form']],
]

function paradigmsFor(topic) {
  const t = String(topic || '').toLowerCase()
  for (const [re, list] of RULES) if (re.test(t)) return list
  return []
}

function extraSpellingFor(topic) {
  const t = String(topic || '').toLowerCase()
  const out = []
  for (const [re, list] of EXTRA_SPELLING) if (re.test(t)) out.push(...list)
  return out
}

module.exports = { paradigmsFor, extraSpellingFor }
