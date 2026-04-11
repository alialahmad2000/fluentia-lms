import { useEffect, useState, useMemo } from 'react'
import { Star, ArrowLeftRight, Info, AlertTriangle, Check, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'

/**
 * Renders the word family for a vocabulary word with morphology explanations.
 * Expects a `wordFamily` array (the JSONB value from curriculum_vocabulary.word_family):
 *   [{ word, pos, level, is_base, is_opposite, vocabulary_id, morphology }]
 *
 * - Always visible (not collapsible)
 * - Desktop: table layout. Mobile: stacked cards.
 * - Click ⓘ → inline expand below the row with morphology explanation
 * - Base word highlighted. Mastered rows show "تعرفها ✓".
 */

const POS_AR = {
  verb: 'فعل',
  noun: 'اسم',
  adjective: 'صفة',
  adverb: 'ظرف',
  pronoun: 'ضمير',
  preposition: 'حرف جر',
  conjunction: 'حرف عطف',
  interjection: 'تعجب',
}

const LEVEL_CLASSES = {
  1: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  2: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  3: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  4: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  5: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
}

function posLabel(pos, isOpposite) {
  if (isOpposite) return 'صفة مضادة'
  if (!pos) return '—'
  return POS_AR[pos.toLowerCase()] || pos
}

function LevelBadge({ level }) {
  const cls = LEVEL_CLASSES[level] || LEVEL_CLASSES[1]
  return (
    <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${cls}`}>
      L{level}
    </span>
  )
}

function MasteredTag() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
      <Check size={11} />
      تعرفها
    </span>
  )
}

function MorphologyCard({ member, onClose }) {
  const morph = member.morphology || {}
  const irregular = !!morph.irregular

  if (irregular) {
    return (
      <div
        dir="rtl"
        className="mt-2 rounded-xl border border-amber-700/50 bg-amber-950/30 p-4 font-['Tajawal'] relative"
      >
        <button
          onClick={onClose}
          className="absolute top-2 left-2 text-amber-200/60 hover:text-amber-200"
          aria-label="إغلاق"
        >
          <X size={16} />
        </button>
        <div className="mb-2 flex items-center gap-2 text-amber-300">
          <AlertTriangle size={16} />
          <span className="text-sm font-semibold">صيغة غير قياسية</span>
        </div>
        <div className="text-xs uppercase tracking-wide text-amber-200/70 mb-1">
          الكلمة
        </div>
        <div className="text-base text-amber-100 mb-3" dir="ltr">
          {member.word}
        </div>
        {morph.base_word && (
          <>
            <div className="text-xs uppercase tracking-wide text-amber-200/70 mb-1">الأصل</div>
            <div className="text-sm text-amber-100 mb-3" dir="ltr">
              {morph.base_word}
              {morph.base_pos ? ` (${morph.base_pos})` : ''}
            </div>
          </>
        )}
        {morph.note_ar && (
          <>
            <div className="text-xs uppercase tracking-wide text-amber-200/70 mb-1">💡 ملاحظة</div>
            <div className="text-sm leading-relaxed text-amber-50">{morph.note_ar}</div>
          </>
        )}
      </div>
    )
  }

  if (morph.is_base) {
    return (
      <div
        dir="rtl"
        className="mt-2 rounded-xl border border-sky-500/30 bg-sky-950/40 p-4 font-['Tajawal'] relative"
      >
        <button
          onClick={onClose}
          className="absolute top-2 left-2 text-sky-200/60 hover:text-sky-200"
          aria-label="إغلاق"
        >
          <X size={16} />
        </button>
        <div className="mb-2 flex items-center gap-2 text-sky-300">
          <Star size={16} className="fill-sky-300" />
          <span className="text-sm font-semibold">الصيغة الأصلية</span>
        </div>
        <div className="text-sm leading-relaxed text-slate-200">
          {morph.note_ar || 'هذه هي الصيغة الأصلية للكلمة — منها تشتق باقي أفراد العائلة.'}
        </div>
      </div>
    )
  }

  const examples = Array.isArray(morph.similar_examples) ? morph.similar_examples : []

  return (
    <div
      dir="rtl"
      className="mt-2 rounded-xl border border-slate-700 bg-slate-900 p-4 font-['Tajawal'] relative"
    >
      <button
        onClick={onClose}
        className="absolute top-2 left-2 text-slate-500 hover:text-slate-300"
        aria-label="إغلاق"
      >
        <X size={16} />
      </button>

      <div className="mb-3 text-sm text-slate-300">
        <span>ليش </span>
        <span className="font-mono text-amber-300" dir="ltr">
          "{member.word}"
        </span>
        <span> {posLabel(member.pos, member.is_opposite)}؟</span>
      </div>

      {morph.affix && (
        <div className="mb-3">
          <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">
            📐 {morph.affix_type === 'prefix' ? 'السابقة' : 'اللاحقة'}
          </div>
          <div className="font-mono text-base text-amber-400" dir="ltr">
            {morph.affix}
          </div>
        </div>
      )}

      {morph.base_word && (
        <div className="mb-3">
          <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">📍 الأصل</div>
          <div className="text-sm text-slate-200" dir="ltr">
            {morph.base_word}
            {morph.base_pos ? (
              <span className="text-slate-400"> ({morph.base_pos})</span>
            ) : null}
          </div>
        </div>
      )}

      {morph.rule_ar && (
        <div className="mb-3">
          <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">💡 القاعدة</div>
          <div className="text-sm leading-relaxed text-slate-200">{morph.rule_ar}</div>
        </div>
      )}

      {examples.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">📚 أمثلة مشابهة</div>
          <div className="flex flex-wrap gap-1.5">
            {examples.map((ex, i) => (
              <span
                key={i}
                className="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300"
                dir="ltr"
              >
                {ex}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function DesktopRow({ member, expanded, onToggle, mastered }) {
  const isBase = !!member.is_base
  const level = member.level || 1
  return (
    <>
      <tr
        className={[
          'border-b border-slate-800/60 transition-colors',
          isBase ? 'bg-sky-950/40 ring-1 ring-sky-500/30' : 'hover:bg-slate-800/60',
        ].join(' ')}
      >
        <td className="py-2 pr-3">
          <div className="flex items-center gap-1.5">
            {isBase && <Star size={12} className="text-sky-300 fill-sky-300" />}
            {member.is_opposite && <ArrowLeftRight size={12} className="text-rose-400" />}
            <span className="text-slate-100 font-medium" dir="ltr">
              {member.word}
            </span>
          </div>
        </td>
        <td className="py-2 px-3 text-slate-300 text-sm">
          {posLabel(member.pos, member.is_opposite)}
        </td>
        <td className="py-2 px-3">
          <LevelBadge level={level} />
        </td>
        <td className="py-2 px-3">{mastered ? <MasteredTag /> : null}</td>
        <td className="py-2 pl-3 text-right">
          <button
            onClick={onToggle}
            className={[
              'rounded-full p-1 transition-colors',
              expanded
                ? 'text-amber-400 bg-amber-500/10'
                : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800',
            ].join(' ')}
            aria-label="شرح"
          >
            <Info size={15} />
          </button>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={5} className="pb-3">
            <MorphologyCard member={member} onClose={onToggle} />
          </td>
        </tr>
      )}
    </>
  )
}

function MobileCard({ member, expanded, onToggle, mastered }) {
  const isBase = !!member.is_base
  const level = member.level || 1
  return (
    <div
      className={[
        'rounded-xl border p-3 transition-colors',
        isBase
          ? 'bg-sky-950/40 border-sky-500/30 ring-1 ring-sky-500/20'
          : 'bg-slate-900/60 border-slate-700',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {isBase && <Star size={12} className="text-sky-300 fill-sky-300" />}
            {member.is_opposite && <ArrowLeftRight size={12} className="text-rose-400" />}
            <span className="text-slate-100 font-semibold text-base" dir="ltr">
              {member.word}
            </span>
            <LevelBadge level={level} />
          </div>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400">
              {posLabel(member.pos, member.is_opposite)}
            </span>
            {mastered && <MasteredTag />}
          </div>
        </div>
        <button
          onClick={onToggle}
          className={[
            'shrink-0 rounded-full p-1.5 transition-colors',
            expanded
              ? 'text-amber-400 bg-amber-500/10'
              : 'text-slate-400 bg-slate-800/70',
          ].join(' ')}
          aria-label="شرح"
        >
          <Info size={16} />
        </button>
      </div>
      {expanded && <MorphologyCard member={member} onClose={onToggle} />}
    </div>
  )
}

export default function WordFamilySection({ wordFamily, studentId }) {
  const [masteredIds, setMasteredIds] = useState(() => new Set())
  const [expandedIdx, setExpandedIdx] = useState(null)

  const family = useMemo(() => {
    if (!Array.isArray(wordFamily)) return []
    // Put base first, then other members in given order
    const base = wordFamily.filter((m) => m?.is_base)
    const rest = wordFamily.filter((m) => !m?.is_base)
    return [...base, ...rest]
  }, [wordFamily])

  const linkedIds = useMemo(() => {
    const ids = []
    for (const m of family) if (m?.vocabulary_id) ids.push(m.vocabulary_id)
    return Array.from(new Set(ids))
  }, [family])

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, linkedIds.join(',')])

  useEffect(() => {
    // Collapse expansion when family changes (new word)
    setExpandedIdx(null)
  }, [wordFamily])

  if (!family.length) return null

  const handleToggle = (idx) => {
    setExpandedIdx((prev) => (prev === idx ? null : idx))
  }

  return (
    <div
      dir="rtl"
      className="mt-4 rounded-xl border border-slate-700 bg-slate-800/40 p-4 font-['Tajawal']"
    >
      <div className="mb-3 text-sm font-medium text-slate-300">📚 عائلة الكلمة</div>

      {/* Desktop table */}
      <div className="hidden sm:block">
        <table className="w-full text-right">
          <thead>
            <tr className="border-b border-slate-700 text-[11px] uppercase tracking-wide text-slate-500">
              <th className="pb-2 pr-3 font-medium">الكلمة</th>
              <th className="pb-2 px-3 font-medium">النوع</th>
              <th className="pb-2 px-3 font-medium">المستوى</th>
              <th className="pb-2 px-3 font-medium">الحالة</th>
              <th className="pb-2 pl-3 font-medium text-left">ليش؟</th>
            </tr>
          </thead>
          <tbody>
            {family.map((m, i) => (
              <DesktopRow
                key={`${m.word}_${i}`}
                member={m}
                expanded={expandedIdx === i}
                onToggle={() => handleToggle(i)}
                mastered={!!(m.vocabulary_id && masteredIds.has(m.vocabulary_id))}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-2 sm:hidden">
        {family.map((m, i) => (
          <MobileCard
            key={`${m.word}_${i}`}
            member={m}
            expanded={expandedIdx === i}
            onToggle={() => handleToggle(i)}
            mastered={!!(m.vocabulary_id && masteredIds.has(m.vocabulary_id))}
          />
        ))}
      </div>
    </div>
  )
}
