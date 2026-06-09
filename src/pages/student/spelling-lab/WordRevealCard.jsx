import { motion } from 'framer-motion'
import { Volume2, BookOpen, Quote, Shuffle, ArrowLeftRight, GitBranch } from 'lucide-react'

// ── Spelling Lab — WordRevealCard (prompt: enrich the lab) ──────────────────
// Shown on the FEEDBACK screen, AFTER the student has submitted / revealed the
// word. The spelling challenge stays the hero; this card teaches the word
// *without spoiling* the challenge (it only appears once the answer is in).
//
// Renders: the word itself (Cormorant, large), an audio button (uses the
// host-provided onPlayAudio so we reuse the existing pronounceWord pipeline),
// IPA when present, a tasteful part-of-speech pill (with Arabic label), the
// Arabic meaning, and an English example sentence with the target word bolded.
// Every field is null-safe — missing IPA / example / POS simply collapse.

// Harmonized into the Constellation palette. Gold = mastery/teaching highlight;
// indigo/violet field tokens for surfaces. Falls back to the legacy --ds-* value
// outside the .vocab-cosmos scope.
const GOLD = 'var(--vc-gold-soft, var(--ds-accent-primary, #e9b949))'

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

// A small section label (icon + Arabic caption) — matches the meaning/example
// labels above so the curiosity zone reads as one calm system.
function FieldLabel({ icon: Icon, children }) {
  return (
    <div
      className="flex items-center gap-1.5 mb-1.5"
      style={{ color: 'var(--vc-text-dim, #8a92b8)' }}
    >
      <Icon size={13} style={{ color: GOLD }} />
      <span style={{ fontFamily: "'Tajawal', sans-serif", fontSize: 12, fontWeight: 600 }}>
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
        color: strong ? '#20160a' : 'var(--vc-text-soft, #c4caea)',
        background: strong ? 'var(--vc-gold, #fbbf24)' : 'var(--vc-surface-2, rgba(255,255,255,0.05))',
        border: `1px solid ${strong ? 'transparent' : 'var(--vc-border, rgba(165,180,252,0.13))'}`,
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
        background: 'var(--vc-surface-2, rgba(255,255,255,0.05))',
        border: '1px solid var(--vc-border, rgba(165,180,252,0.13))',
      }}
    >
      <span
        dir="ltr"
        style={{
          fontFamily: "'Readex Pro', sans-serif",
          fontSize: 13,
          lineHeight: 1.2,
          color: 'var(--vc-text, #eef1ff)',
        }}
      >
        {member.word}
      </span>
      {pos && (
        <span
          style={{
            fontFamily: "'Tajawal', sans-serif",
            fontSize: 10,
            color: 'var(--vc-text-dim, #8a92b8)',
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

  // ── curiosity layer (present for a meaningful slice of the lab words) ──────
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
          'linear-gradient(165deg, rgba(251,191,36,0.10), var(--vc-surface, rgba(129,140,248,0.055)) 42%)',
        border: '1px solid var(--vc-border, rgba(165,180,252,0.13))',
        boxShadow: '0 18px 48px -20px rgba(0,0,0,0.55)',
      }}
    >
      {/* hero: the word + audio + IPA + POS pill */}
      <div
        className="px-5 pt-5 pb-4"
        style={{ borderBottom: '1px solid var(--vc-border, rgba(165,180,252,0.13))' }}
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
              background: 'linear-gradient(135deg, var(--vc-gold, #fbbf24), var(--vc-gold-soft, #fcd34d))',
              color: '#20160a',
              boxShadow: '0 8px 22px -8px rgba(251,191,36,0.6)',
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
                color: 'var(--vc-text, #eef1ff)',
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
                  color: 'var(--vc-text-dim, #8a92b8)',
                  marginTop: 2,
                }}
              >
                {word.pronunciation_ipa}
              </div>
            )}
          </div>

          {posAr && (
            <span
              className="shrink-0 inline-flex items-center justify-center px-3 py-1.5 rounded-xl"
              dir="rtl"
              title={posEn || undefined}
              style={{
                background: 'rgba(251,191,36,0.14)',
                border: '1px solid rgba(251,191,36,0.32)',
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
            </span>
          )}
        </div>
      </div>

      {/* meaning + example */}
      <div className="px-5 py-4 space-y-4">
        {word.meaning_ar && (
          <div>
            <div
              className="flex items-center gap-1.5 mb-1.5"
              style={{ color: 'var(--vc-text-dim, #8a92b8)' }}
            >
              <BookOpen size={13} style={{ color: GOLD }} />
              <span
                style={{ fontFamily: "'Tajawal', sans-serif", fontSize: 12, fontWeight: 600 }}
              >
                المعنى
              </span>
            </div>
            <p
              style={{
                fontFamily: "'Tajawal', sans-serif",
                fontSize: 16,
                lineHeight: 1.5,
                color: 'var(--vc-text, #eef1ff)',
              }}
            >
              {word.meaning_ar}
            </p>
          </div>
        )}

        {word.example_en && (
          <div>
            <div
              className="flex items-center gap-1.5 mb-1.5"
              style={{ color: 'var(--vc-text-dim, #8a92b8)' }}
            >
              <Quote size={13} style={{ color: GOLD }} />
              <span
                style={{ fontFamily: "'Tajawal', sans-serif", fontSize: 12, fontWeight: 600 }}
              >
                مثال
              </span>
            </div>
            <p
              dir="ltr"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontStyle: 'italic',
                fontSize: 16,
                lineHeight: 1.55,
                color: 'var(--vc-text-soft, #c4caea)',
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
          style={{ borderTop: '1px solid var(--vc-border, rgba(165,180,252,0.13))' }}
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
                      color: 'var(--vc-text-dim, #8a92b8)',
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
                      color: 'var(--vc-gold, #fbbf24)',
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
                    color: 'var(--vc-text-soft, #c4caea)',
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
