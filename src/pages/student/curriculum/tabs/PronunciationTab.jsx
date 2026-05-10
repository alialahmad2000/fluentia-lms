import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Volume2, ChevronDown, ChevronUp, Mic, Check } from 'lucide-react'
import EnglishText from '../../../../components/curriculum/EnglishText'
import { supabase } from '../../../../lib/supabase'
import { useAuthStore } from '../../../../stores/authStore'
import PronunciationActivity from '../../../../components/curriculum/PronunciationActivity'
import { awardCurriculumXP } from '../../../../utils/curriculumXP'

export default function PronunciationTab({ unitId, onBack }) {
  const { profile, studentData } = useAuthStore()
  const queryClient = useQueryClient()
  const [showReference, setShowReference] = useState(false)

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

  // Check if already completed
  const { data: progressRecord } = useQuery({
    queryKey: ['pronunciation-progress', studentData?.id, unitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_curriculum_progress')
        .select('status, score, completed_at')
        .eq('student_id', studentData.id)
        .eq('unit_id', unitId)
        .eq('section_type', 'pronunciation')
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!studentData?.id && !!unitId,
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

  const isCompleted = progressRecord?.status === 'completed'
  const { focus_type, content } = pronunciation
  const items = content?.items || []
  const practiceSentences = content?.practice_sentences || []

  return (
    <div className="space-y-6">
      {/* Completed badge */}
      {isCompleted && (
        <div className="fl-card-static p-4 flex items-center gap-3" style={{ borderColor: 'rgba(74,222,128,0.2)' }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(74,222,128,0.1)' }}>
            <Check size={20} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>تم إنجاز هذا التمرين</p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              النتيجة: {progressRecord.score}%
            </p>
          </div>
        </div>
      )}

      {/* Interactive Activity */}
      {!isCompleted && (
        <PronunciationActivity
          pronunciationData={pronunciation}
          unitId={unitId}
          onComplete={() => {
            queryClient.invalidateQueries({ queryKey: ['pronunciation-progress', studentData?.id, unitId] })
            queryClient.invalidateQueries({ queryKey: ['unit-progress-comprehensive'] })
            awardCurriculumXP(studentData?.id, 'pronunciation', null, unitId)
          }}
          onBack={onBack}
        />
      )}

      {/* Reference material (always available, collapsible when completed) */}
      {isCompleted && (
        <div>
          <button
            onClick={() => setShowReference(!showReference)}
            className="flex items-center gap-2 text-sm font-bold px-1 mb-3 cursor-pointer"
            style={{ color: 'var(--text-primary)' }}
          >
            مراجعة المحتوى
            {showReference ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          <AnimatePresence>
            {showReference && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-3 overflow-hidden"
              >
                <ReferenceContent
                  focusType={focus_type}
                  items={items}
                  practiceSentences={practiceSentences}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

// ─── Reference Content (for review after completion) ───
function ReferenceContent({ focusType, items, practiceSentences }) {
  const [expandedItem, setExpandedItem] = useState(null)

  return (
    <div className="space-y-3">
      {focusType?.startsWith('minimal_pairs') && (
        <MinimalPairsView items={items} expandedItem={expandedItem} onToggle={setExpandedItem} />
      )}
      {focusType === 'word_stress' && (
        <WordStressView items={items} expandedItem={expandedItem} onToggle={setExpandedItem} />
      )}
      {focusType?.startsWith('connected_speech') && (
        <ConnectedSpeechView items={items} expandedItem={expandedItem} onToggle={setExpandedItem} />
      )}
      {focusType === 'intonation' && (
        <IntonationView items={items} expandedItem={expandedItem} onToggle={setExpandedItem} />
      )}

      {practiceSentences.length > 0 && (
        <div className="space-y-2 mt-4">
          <h4 className="text-xs font-bold px-1" style={{ color: 'var(--text-tertiary)' }}>
            جمل التدريب ({practiceSentences.length})
          </h4>
          {practiceSentences.map((s, i) => (
            <div key={i} className="fl-card-static p-3">
              <p className="text-sm font-['Inter'] font-medium" style={{ color: 'var(--text-primary)' }}>
                {s.sentence_en}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                {s.translation_ar}
              </p>
            </div>
          ))}
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
            <EnglishText as="div" className="flex items-center gap-4">
              <div className="text-center">
                <EnglishText as="p" className="text-base font-bold font-['Inter']" style={{ color: 'var(--accent-sky)' }}>{pair.word1}</EnglishText>
                <EnglishText as="p" className="text-[10px] font-['Inter'] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{pair.ipa1}</EnglishText>
              </div>
              <span className="text-xs font-bold" style={{ color: 'var(--text-tertiary)' }}>vs</span>
              <div className="text-center">
                <EnglishText as="p" className="text-base font-bold font-['Inter']" style={{ color: 'var(--accent-violet)' }}>{pair.word2}</EnglishText>
                <EnglishText as="p" className="text-[10px] font-['Inter'] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{pair.ipa2}</EnglishText>
              </div>
            </EnglishText>
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
                <EnglishText as="div" className="flex items-center gap-0.5 text-base font-bold font-['Inter']">
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
                </EnglishText>
                <EnglishText as="p" className="text-[10px] font-['Inter'] mt-1" style={{ color: 'var(--text-tertiary)' }}>{item.ipa}</EnglishText>
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
              <EnglishText as="div" className="flex items-center gap-3 mb-1">
                <EnglishText as="p" className="text-sm font-['Inter']" style={{ color: 'var(--text-tertiary)', textDecoration: 'line-through', textDecorationColor: 'rgba(255,255,255,0.15)' }}>
                  {item.written}
                </EnglishText>
                <span style={{ color: 'var(--text-tertiary)' }}>→</span>
                <EnglishText as="p" className="text-sm font-bold font-['Inter']" style={{ color: 'var(--accent-sky)' }}>
                  {item.spoken}
                </EnglishText>
              </EnglishText>
              {item.ipa_spoken && (
                <EnglishText as="p" className="text-[10px] font-['Inter']" style={{ color: 'var(--text-tertiary)' }}>{item.ipa_spoken}</EnglishText>
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
                <EnglishText as="p" className="text-sm font-bold font-['Inter']" style={{ color: 'var(--text-primary)' }}>
                  {item.sentence}
                </EnglishText>
                <span className="text-xl">{item.tone_curve}</span>
              </div>
              <EnglishText as="span" className="text-[10px] px-2 py-0.5 rounded-full capitalize" style={{ background: 'rgba(167,139,250,0.1)', color: 'var(--accent-violet)' }}>
                {item.pattern}
              </EnglishText>
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
