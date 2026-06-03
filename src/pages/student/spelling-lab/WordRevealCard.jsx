import { motion } from 'framer-motion'
import { Volume2, BookOpen, Quote, Shuffle, ArrowLeftRight, GitBranch } from 'lucide-react'

// ── Spelling Lab — WordRevealCard (the teaching moment) ─────────────────────
// Shown on the FEEDBACK screen, AFTER the student has submitted / revealed the
// word, so it can teach freely without spoiling the spelling challenge.
//
// The spelling challenge stays the hero; this card turns each word into a small
// window onto the language. It renders (every field null-safe — missing data
// simply collapses):
//   • the word + audio + IPA + a tasteful part-of-speech pill
//   • the Arabic meaning
//   • an English example with the target word bolded
//   • مرادفات (synonyms) — chips, the strongest one emphasised
//   • العكس (antonyms) — chips
//   • عائلة الكلمة (word family) — derived forms + their Arabic type
//   • نطقها (a pronunciation note) — the common mistake vs the correct sound
// The relations come from curriculum_vocabulary and are present for a
// meaningful slice of the lab words; the card stays calm when they're absent.

const GOLD = 'var(--ds-accent-primary, #e9b949)'

// English POS → Arabic label. Handles the few compound values in the data
// (e.g. "noun/verb", "adjective (past participle/adjective)") by mapping the
// leading token, falling back to the raw value.
const POS_AR = {
  noun: 'اسم',
  verb: 'فعل',
  adjective: 'صفة',
  adverb: 'ظرف',
  preposition: 'حرف جر',
  conjunction: 'حرف عطف',
  pronoun: 'ضمير',
  determiner: 'أداة',
  interjection: 'تعجّب',
}

function posLabelAr(pos) {
  if (!pos) return null
  const head = String(pos).toLowerCase().split(/[\s/(]/)[0].trim()
  return POS_AR[head] || pos
}

// Bold the target word inside the example sentence (case-insensitive, word-ish).
function renderExample(example, word) {
  if (!example) return null
  if (!word) return example
  try {
    const re = new RegExp(`(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig')
    const parts = example.split(re)
    return parts.map((part, i) =>
      part.toLowerCase() === word.toLowerCase() ? (
        <strong key={i} style={{ color: GOLD, fontWeight: 700, fontStyle: 'normal' }}>
          {part}
        </strong>
      ) : (
        <span key={i}>{part}</span>
      )
    )
  } catch {
    return example
  }
}

// A small section label (icon + Arabic caption) — reused across the card.
function FieldLabel({ icon: Icon, children }) {
  return (
    <div
      className="flex items-center gap-1.5 mb-1.5"
      style={{ color: 'var(--ds-text-tertiary, #64748b)' }}
    >
      <Icon size={13} style={{ color: GOLD }} />
      <span style={{ fontFamily: "'Tajawal', sans-serif", fontSize: 11, fontWeight: 600 }}>
        {children}
      </span>
    </div>
  )
}

// One English-word chip (synonyms / antonyms). `strong` fills it gold.
function WordChip({ word, strong }) {
  return (
    <span
      dir="ltr"
      className="inline-flex items-center px-2.5 py-1 rounded-lg"
      style={{
        fontFamily: "'Readex Pro', sans-serif",
        fontSize: 13,
        lineHeight: 1.2,
        color: strong ? 'var(--ds-primary-ink, #0a0a0f)' : 'var(--ds-text-secondary, #94a3b8)',
        background: strong ? GOLD : 'var(--ds-bg-elevated, rgba(255,255,255,0.05))',
        border: `1px solid ${strong ? 'transparent' : 'var(--ds-border-subtle, rgba(255,255,255,0.10))'}`,
      }}
    >
      {word}
    </span>
  )
}

// One word-family member: English form + its Arabic part of speech.
function FamilyChip({ member }) {
  const pos = posLabelAr(member.part_of_speech || member.pos)
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
      style={{
        background: 'var(--ds-bg-elevated, rgba(255,255,255,0.05))',
        border: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.10))',
      }}
    >
      <span
        dir="ltr"
        style={{
          fontFamily: "'Readex Pro', sans-serif",
          fontSize: 13,
          lineHeight: 1.2,
          color: 'var(--ds-text-primary, #f8fafc)',
        }}
      >
        {member.word}
      </span>
      {pos && (
        <span
          style={{
            fontFamily: "'Tajawal', sans-serif",
            fontSize: 10,
            color: 'var(--ds-text-tertiary, #64748b)',
          }}
        >
          {pos}
        </span>
      )}
    </span>
  )
}

// Normalise the relation arrays — tolerate nulls / non-arrays / blank entries.
function cleanList(v) {
  return Array.isArray(v) ? v.filter((x) => x && x.word) : []
}

export default function WordRevealCard({ word, onPlayAudio }) {
  if (!word) return null

  const posAr = posLabelAr(word.part_of_speech)
  const posEn = word.part_of_speech ? String(word.part_of_speech) : null

  // ── curiosity layer ──────────────────────────────────────────────────────
  const target = String(word.word_en || '').toLowerCase()
  const synonyms = cleanList(word.synonyms).slice(0, 5)
  const antonyms = cleanList(word.antonyms).slice(0, 4)
  // the family includes the base word itself — drop it, keep the relatives
  const family = cleanList(word.word_family)
    .filter((m) => String(m.word).toLowerCase() !== target)
    .slice(0, 4)
  const alert =
    word.pronunciation_alert && word.pronunciation_alert.has_alert
      ? word.pronunciation_alert
      : null

  const hasRelated = synonyms.length || antonyms.length || family.length || alert

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1], delay: 0.12 }}
      dir="rtl"
      className="w-full max-w-md mt-6 rounded-2xl overflow-hidden"
      style={{
        background:
          'linear-gradient(165deg, rgba(233,185,73,0.10), var(--ds-card, rgba(255,255,255,0.035)) 42%)',
        border: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.10))',
        boxShadow: '0 18px 48px -20px rgba(0,0,0,0.55)',
      }}
    >
      {/* hero: the word + audio + IPA + POS pill */}
      <div
        className="px-5 pt-5 pb-4"
        style={{ borderBottom: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.07))' }}
      >
        <div className="flex items-center gap-3" dir="ltr">
          {/* audio button — reuses the host pronounce pipeline */}
          <motion.button
            type="button"
            onClick={onPlayAudio}
            whileTap={{ scale: 0.9 }}
            aria-label="استمع للكلمة"
            className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center"
            style={{
              background: GOLD,
              color: 'var(--ds-primary-ink, #0a0a0f)',
              boxShadow: '0 8px 22px -8px rgba(233,185,73,0.6)',
            }}
          >
            <Volume2 size={20} />
          </motion.button>

          <div className="flex-1 min-w-0">
            <div
              className="truncate"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontStyle: 'italic',
                fontSize: 34,
                lineHeight: 1.1,
                color: 'var(--ds-text-primary, #f8fafc)',
              }}
            >
              {word.word_en}
            </div>
            {word.pronunciation_ipa && (
              <div
                className="truncate"
                style={{
                  fontFamily: 'ui-monospace, monospace',
                  fontSize: 13,
                  color: 'var(--ds-text-tertiary, #64748b)',
                  marginTop: 2,
                }}
              >
                {word.pronunciation_ipa}
              </div>
            )}
          </div>

          {posAr && (
            <span
              className="shrink-0 inline-flex flex-col items-center justify-center px-3 py-1.5 rounded-xl"
              dir="rtl"
              style={{
                background: 'rgba(233,185,73,0.14)',
                border: '1px solid rgba(233,185,73,0.32)',
              }}
            >
              <span
                style={{
                  fontFamily: "'Tajawal', sans-serif",
                  fontSize: 13,
                  fontWeight: 700,
                  color: GOLD,
                  lineHeight: 1.1,
                }}
              >
                {posAr}
              </span>
              <span
                dir="ltr"
                style={{
                  fontFamily: "'Inter', system-ui, sans-serif",
                  fontSize: 9,
                  letterSpacing: 0.4,
                  textTransform: 'lowercase',
                  color: 'var(--ds-text-tertiary, #64748b)',
                  marginTop: 1,
                }}
              >
                {posEn}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* meaning + example */}
      <div className="px-5 py-4 space-y-4">
        {word.meaning_ar && (
          <div>
            <FieldLabel icon={BookOpen}>المعنى</FieldLabel>
            <p
              style={{
                fontFamily: "'Tajawal', sans-serif",
                fontSize: 16,
                lineHeight: 1.5,
                color: 'var(--ds-text-primary, #f8fafc)',
              }}
            >
              {word.meaning_ar}
            </p>
          </div>
        )}

        {word.example_en && (
          <div>
            <FieldLabel icon={Quote}>مثال</FieldLabel>
            <p
              dir="ltr"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontStyle: 'italic',
                fontSize: 16,
                lineHeight: 1.55,
                color: 'var(--ds-text-secondary, #94a3b8)',
                textAlign: 'left',
              }}
            >
              {renderExample(word.example_en, word.word_en)}
            </p>
          </div>
        )}
      </div>

      {/* ── curiosity layer: synonyms · antonyms · family · pronunciation ──── */}
      {hasRelated ? (
        <div
          className="px-5 py-4 space-y-4"
          style={{ borderTop: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.07))' }}
        >
          {synonyms.length > 0 && (
            <div>
              <FieldLabel icon={Shuffle}>مرادفات</FieldLabel>
              <div className="flex flex-wrap gap-1.5" dir="ltr">
                {synonyms.map((s, i) => (
                  <WordChip key={`${s.word}-${i}`} word={s.word} strong={!!s.is_strongest} />
                ))}
              </div>
            </div>
          )}

          {antonyms.length > 0 && (
            <div>
              <FieldLabel icon={ArrowLeftRight}>العكس</FieldLabel>
              <div className="flex flex-wrap gap-1.5" dir="ltr">
                {antonyms.map((a, i) => (
                  <WordChip key={`${a.word}-${i}`} word={a.word} />
                ))}
              </div>
            </div>
          )}

          {family.length > 0 && (
            <div>
              <FieldLabel icon={GitBranch}>عائلة الكلمة</FieldLabel>
              <div className="flex flex-wrap gap-1.5" dir="ltr">
                {family.map((m, i) => (
                  <FamilyChip key={`${m.word}-${i}`} member={m} />
                ))}
              </div>
            </div>
          )}

          {alert && (alert.correct_approximation_ar || alert.practice_tip_ar) && (
            <div>
              <FieldLabel icon={Volume2}>نطقها</FieldLabel>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {alert.common_mispronunciation_ar && (
                  <span
                    style={{
                      fontFamily: "'Tajawal', sans-serif",
                      fontSize: 13,
                      color: 'var(--ds-text-tertiary, #64748b)',
                      textDecoration: 'line-through',
                      textDecorationColor: 'rgba(239,68,68,0.5)',
                    }}
                  >
                    {alert.common_mispronunciation_ar}
                  </span>
                )}
                {alert.correct_approximation_ar && (
                  <span
                    style={{
                      fontFamily: "'Tajawal', sans-serif",
                      fontSize: 14,
                      fontWeight: 700,
                      color: 'var(--ds-accent-success, #4ade80)',
                    }}
                  >
                    {alert.correct_approximation_ar}
                  </span>
                )}
              </div>
              {alert.practice_tip_ar && (
                <p
                  className="mt-1"
                  style={{
                    fontFamily: "'Tajawal', sans-serif",
                    fontSize: 12.5,
                    lineHeight: 1.5,
                    color: 'var(--ds-text-secondary, #94a3b8)',
                  }}
                >
                  {alert.practice_tip_ar}
                </p>
              )}
            </div>
          )}
        </div>
      ) : null}
    </motion.div>
  )
}
