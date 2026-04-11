import { useEffect, useState, useMemo } from 'react'
import { Check, Star, ArrowLeftRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const LEVEL_DOT = {
  1: 'bg-emerald-400',
  2: 'bg-sky-400',
  3: 'bg-amber-400',
  4: 'bg-orange-400',
  5: 'bg-rose-400',
}

function Badge({ entry, mastered, kind }) {
  const level = entry.level || 1
  const dot = LEVEL_DOT[level] || LEVEL_DOT[1]
  const isStrongest = !!entry.is_strongest
  const isAntonym = kind === 'antonym'

  return (
    <div
      className={[
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 bg-slate-800/80',
        'border transition-colors',
        isAntonym ? 'border-rose-900/40' : 'border-slate-700',
        isStrongest ? 'ring-2 ring-amber-400/50' : '',
      ].join(' ')}
      title={mastered ? 'تعرفها' : undefined}
    >
      {isAntonym && <ArrowLeftRight size={12} className="text-rose-400/70" />}
      <span className={`w-2 h-2 rounded-full ${dot}`} />
      <span className="text-slate-100 text-sm font-medium" dir="ltr">
        {entry.word}
      </span>
      <span className="text-slate-400 text-[10px] uppercase tracking-wide">L{level}</span>
      {isStrongest && <Star size={12} className="text-amber-400 fill-amber-400" />}
      {mastered && <Check size={13} className="text-emerald-400" />}
    </div>
  )
}

/**
 * Renders synonyms + antonyms for a vocabulary word with level colors,
 * "strongest" star, and "تعرفها ✓" tag on synonyms the student has mastered.
 *
 * @param {Array} synonyms
 * @param {Array} antonyms
 * @param {string} studentId
 */
export default function WordRelationships({ synonyms, antonyms, studentId }) {
  const [masteredIds, setMasteredIds] = useState(() => new Set())

  const linkedIds = useMemo(() => {
    const ids = []
    for (const s of synonyms || []) if (s.vocabulary_id) ids.push(s.vocabulary_id)
    for (const a of antonyms || []) if (a.vocabulary_id) ids.push(a.vocabulary_id)
    return Array.from(new Set(ids))
  }, [synonyms, antonyms])

  useEffect(() => {
    let cancelled = false
    if (!studentId || linkedIds.length === 0) {
      setMasteredIds(new Set())
      return
    }
    ;(async () => {
      const { data, error } = await supabase
        .from('vocabulary_word_mastery')
        .select('vocabulary_id, mastery_level')
        .eq('student_id', studentId)
        .in('vocabulary_id', linkedIds)
        .in('mastery_level', ['learning', 'mastered'])
      if (cancelled) return
      if (error) {
        setMasteredIds(new Set())
        return
      }
      setMasteredIds(new Set((data || []).map((d) => d.vocabulary_id)))
    })()
    return () => {
      cancelled = true
    }
  }, [studentId, linkedIds.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  const hasSyns = Array.isArray(synonyms) && synonyms.length > 0
  const hasAnts = Array.isArray(antonyms) && antonyms.length > 0

  if (!hasSyns && !hasAnts) return null

  return (
    <div dir="rtl" className="flex flex-col gap-3 mt-3">
      {hasSyns && (
        <div>
          <div className="flex items-center gap-1.5 text-slate-300 text-sm font-medium mb-2">
            <span>المرادفات</span>
            {synonyms.some((s) => s.is_strongest) && (
              <Star size={12} className="text-amber-400 fill-amber-400" />
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {synonyms.map((s, i) => (
              <Badge
                key={`${s.word}_${i}`}
                entry={s}
                kind="synonym"
                mastered={s.vocabulary_id && masteredIds.has(s.vocabulary_id)}
              />
            ))}
          </div>
        </div>
      )}

      {hasAnts && (
        <div>
          <div className="text-slate-300 text-sm font-medium mb-2">الأضداد</div>
          <div className="flex flex-wrap gap-2">
            {antonyms.map((a, i) => (
              <Badge
                key={`${a.word}_${i}`}
                entry={a}
                kind="antonym"
                mastered={a.vocabulary_id && masteredIds.has(a.vocabulary_id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
