import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Volume2, ChevronDown, ChevronUp, Mic } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'

export default function PronunciationTab({ unitId }) {
  const [expandedItem, setExpandedItem] = useState(null)
  const [showPractice, setShowPractice] = useState(false)

  const { data: pronunciation, isLoading } = useQuery({
    queryKey: ['pronunciation-content', unitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curriculum_pronunciation')
        .select('*')
        .eq('unit_id', unitId)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!unitId,
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="fl-card-static p-6 animate-pulse">
            <div className="h-4 bg-white/5 rounded w-1/3 mb-3" />
            <div className="h-3 bg-white/5 rounded w-2/3" />
          </div>
        ))}
      </div>
    )
  }

  if (!pronunciation) {
    return (
      <div className="fl-card-static p-8 text-center">
        <Mic size={40} className="mx-auto mb-4 opacity-30" style={{ color: 'var(--text-tertiary)' }} />
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
          لا يوجد محتوى نطق لهذه الوحدة بعد
        </p>
      </div>
    )
  }

  const { focus_type, title_ar, title_en, description_ar, content } = pronunciation
  const items = content?.items || []
  const practiceSentences = content?.practice_sentences || []
  const ruleSummary = content?.rule_summary_ar

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="fl-card-static p-6 relative overflow-hidden">
        <div className="card-top-line shimmer" style={{ opacity: 0.3 }} />
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.1)' }}>
            <Mic size={20} strokeWidth={1.5} className="text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{title_ar}</h2>
            <p className="text-xs font-['Inter']" style={{ color: 'var(--text-tertiary)' }}>{title_en}</p>
          </div>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {description_ar}
        </p>
        {ruleSummary && (
          <div className="mt-3 px-4 py-2.5 rounded-xl" style={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.1)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--accent-sky)' }}>
              {ruleSummary}
            </p>
          </div>
        )}
      </div>

      {/* Items — rendered differently per focus_type */}
      <div className="space-y-3">
        <h3 className="text-[15px] font-bold px-1" style={{ color: 'var(--text-primary)' }}>
          التدريبات ({items.length})
        </h3>

        {focus_type?.startsWith('minimal_pairs') && (
          <MinimalPairsView items={items} expandedItem={expandedItem} onToggle={setExpandedItem} />
        )}

        {focus_type === 'word_stress' && (
          <WordStressView items={items} expandedItem={expandedItem} onToggle={setExpandedItem} />
        )}

        {focus_type?.startsWith('connected_speech') && (
          <ConnectedSpeechView items={items} expandedItem={expandedItem} onToggle={setExpandedItem} />
        )}

        {focus_type === 'intonation' && (
          <IntonationView items={items} expandedItem={expandedItem} onToggle={setExpandedItem} />
        )}
      </div>

      {/* Practice Sentences */}
      {practiceSentences.length > 0 && (
        <div>
          <button
            onClick={() => setShowPractice(!showPractice)}
            className="flex items-center gap-2 text-[15px] font-bold px-1 mb-3 cursor-pointer"
            style={{ color: 'var(--text-primary)' }}
          >
            جمل التدريب ({practiceSentences.length})
            {showPractice ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          <AnimatePresence>
            {showPractice && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-2 overflow-hidden"
              >
                {practiceSentences.map((s, i) => (
                  <div key={i} className="fl-card-static p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-['Inter'] font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                          {s.sentence_en}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          {s.translation_ar}
                        </p>
                        {s.target_words?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {s.target_words.map((w, j) => (
                              <span key={j} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--accent-gold)' }}>
                                {w}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <AudioPlaceholder />
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

// ─── Audio Placeholder ───
function AudioPlaceholder() {
  return (
    <button
      disabled
      className="p-2 rounded-lg opacity-40 cursor-not-allowed shrink-0"
      style={{ background: 'var(--surface-raised)' }}
      title="الصوت قيد الإنتاج — سيتوفر قريباً"
    >
      <Volume2 size={16} style={{ color: 'var(--text-tertiary)' }} />
    </button>
  )
}

// ─── Minimal Pairs ───
function MinimalPairsView({ items, expandedItem, onToggle }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {items.map((pair, i) => (
        <button
          key={i}
          onClick={() => onToggle(expandedItem === i ? null : i)}
          className="fl-card-static p-4 text-start transition-all cursor-pointer"
          style={expandedItem === i ? { borderColor: 'rgba(245,158,11,0.3)' } : {}}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-base font-bold font-['Inter']" style={{ color: 'var(--accent-sky)' }}>{pair.word1}</p>
                <p className="text-[10px] font-['Inter'] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{pair.ipa1}</p>
              </div>
              <span className="text-xs font-bold" style={{ color: 'var(--text-tertiary)' }}>vs</span>
              <div className="text-center">
                <p className="text-base font-bold font-['Inter']" style={{ color: 'var(--accent-violet)' }}>{pair.word2}</p>
                <p className="text-[10px] font-['Inter'] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{pair.ipa2}</p>
              </div>
            </div>
            <AudioPlaceholder />
          </div>
          {expandedItem === i && pair.hint_ar && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs mt-2 pt-2"
              style={{ color: 'var(--text-secondary)', borderTop: '1px solid var(--border-subtle)' }}
            >
              {pair.hint_ar}
            </motion.p>
          )}
        </button>
      ))}
    </div>
  )
}

// ─── Word Stress ───
function WordStressView({ items, expandedItem, onToggle }) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <button
          key={i}
          onClick={() => onToggle(expandedItem === i ? null : i)}
          className="w-full fl-card-static p-4 text-start transition-all cursor-pointer"
          style={expandedItem === i ? { borderColor: 'rgba(245,158,11,0.3)' } : {}}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <div className="flex items-center gap-0.5 text-base font-bold font-['Inter']">
                  {(item.syllables || []).map((syl, j) => (
                    <span
                      key={j}
                      className={j + 1 === item.stressed_syllable ? 'text-amber-400 text-lg underline underline-offset-4' : ''}
                      style={j + 1 !== item.stressed_syllable ? { color: 'var(--text-secondary)' } : {}}
                    >
                      {syl}
                      {j < item.syllables.length - 1 && <span style={{ color: 'var(--text-tertiary)' }}>·</span>}
                    </span>
                  ))}
                </div>
                <p className="text-[10px] font-['Inter'] mt-1" style={{ color: 'var(--text-tertiary)' }}>{item.ipa}</p>
              </div>
              <AudioPlaceholder />
            </div>
          </div>
          {expandedItem === i && item.hint_ar && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs mt-2 pt-2"
              style={{ color: 'var(--text-secondary)', borderTop: '1px solid var(--border-subtle)' }}
            >
              {item.hint_ar}
            </motion.p>
          )}
        </button>
      ))}
    </div>
  )
}

// ─── Connected Speech ───
function ConnectedSpeechView({ items, expandedItem, onToggle }) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <button
          key={i}
          onClick={() => onToggle(expandedItem === i ? null : i)}
          className="w-full fl-card-static p-4 text-start transition-all cursor-pointer"
          style={expandedItem === i ? { borderColor: 'rgba(245,158,11,0.3)' } : {}}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <p className="text-sm font-['Inter']" style={{ color: 'var(--text-tertiary)', textDecoration: 'line-through', textDecorationColor: 'rgba(255,255,255,0.15)' }}>
                  {item.written}
                </p>
                <span style={{ color: 'var(--text-tertiary)' }}>→</span>
                <p className="text-sm font-bold font-['Inter']" style={{ color: 'var(--accent-sky)' }}>
                  {item.spoken}
                </p>
              </div>
              {item.ipa_spoken && (
                <p className="text-[10px] font-['Inter']" style={{ color: 'var(--text-tertiary)' }}>{item.ipa_spoken}</p>
              )}
            </div>
            <AudioPlaceholder />
          </div>
          {expandedItem === i && item.explanation_ar && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs mt-2 pt-2"
              style={{ color: 'var(--text-secondary)', borderTop: '1px solid var(--border-subtle)' }}
            >
              {item.explanation_ar}
            </motion.p>
          )}
        </button>
      ))}
    </div>
  )
}

// ─── Intonation ───
function IntonationView({ items, expandedItem, onToggle }) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <button
          key={i}
          onClick={() => onToggle(expandedItem === i ? null : i)}
          className="w-full fl-card-static p-4 text-start transition-all cursor-pointer"
          style={expandedItem === i ? { borderColor: 'rgba(245,158,11,0.3)' } : {}}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <p className="text-sm font-bold font-['Inter']" style={{ color: 'var(--text-primary)' }}>
                  {item.sentence}
                </p>
                <span className="text-xl">{item.tone_curve}</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full capitalize" style={{ background: 'rgba(167,139,250,0.1)', color: 'var(--accent-violet)' }}>
                {item.pattern}
              </span>
            </div>
            <AudioPlaceholder />
          </div>
          {expandedItem === i && item.explanation_ar && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs mt-2 pt-2"
              style={{ color: 'var(--text-secondary)', borderTop: '1px solid var(--border-subtle)' }}
            >
              {item.explanation_ar}
            </motion.p>
          )}
        </button>
      ))}
    </div>
  )
}
