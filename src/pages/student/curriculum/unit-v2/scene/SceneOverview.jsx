import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Languages, PenLine, Headphones, Mic, Send, Star } from 'lucide-react'
import { useG } from '@/i18n/gender'
import { useCinematicMotion } from '../../_premiumPrimitives'
import { SCENE_BEATS, CAPSTONE_PREREQS, BEAT_WHY_FALLBACK, sceneLabelFor } from './sceneConfig'
import './scene.css'

/**
 * SceneOverview — the custom-curriculum unit "scene": one marketing moment lived
 * front-to-back. The six skills become ordered BEATS on a path (read the situation →
 * the words → the grammar move → hear the other side → PERFORM = capstone → follow up).
 * Pure/prop-driven; reuses the existing skill tabs via onSelect(key). Gated at the call
 * site to students.uses_custom_curriculum, so it never renders for anyone else.
 */

const ICONS = { BookOpen, Languages, PenLine, Headphones, Mic, Send }
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩'
const toAr = (n) => String(n ?? '').replace(/[0-9]/g, (d) => AR_DIGITS[+d])
const whyFor = (unit, key) => unit?.activity_ribbons?.[key] || BEAT_WHY_FALLBACK[key] || ''

function StatusChip({ status }) {
  if (status === 'completed') return <span className="scene-chip c-done">مكتمل ✓</span>
  if (status === 'in_progress') return <span className="scene-chip c-live"><span className="pulse" />قيد التعلّم</span>
  return <span className="scene-chip c-todo">لم يبدأ</span>
}

function SceneBeat({ beat, activity, num, here, onSelect, reduced, g, unit, idx }) {
  const Icon = ICONS[beat.icon] || BookOpen
  const done = activity.status === 'completed'
  const state = done ? 'done' : here ? 'live' : 'todo'
  const why = whyFor(unit, beat.key)
  return (
    <motion.div
      className={`scene-beat ${state}`}
      initial={reduced ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: idx * 0.05, ease: 'easeOut' }}
    >
      <div className="scene-node">{toAr(num)}</div>
      <button type="button" className="scene-card" onClick={() => onSelect(beat.key)}>
        <div className="scene-card-top">
          <span className="scene-ic"><Icon size={19} /></span>
          <div className="scene-role">
            <div className="r1">{beat.role}{here && <span className="scene-here">{g('أنت هنا', 'أنتِ هنا')}</span>}</div>
            <div className="r2">{activity.label}</div>
          </div>
          <StatusChip status={activity.status} />
        </div>
        {why && <div className="scene-why">{why}</div>}
        {here && <span className="scene-go">{g('تابع من هنا ←', 'تابعي من هنا ←')}</span>}
      </button>
    </motion.div>
  )
}

function SceneCapstone({ beat, activity, num, earned, onSelect, reduced, g, unit, idx }) {
  const done = activity.status === 'completed'
  const ignited = earned || done
  const sub = whyFor(unit, 'speaking')
  return (
    <motion.div
      className={`scene-beat scene-capstone ${ignited ? 'earned' : ''} ${done ? 'done' : ''}`}
      initial={reduced ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: idx * 0.05, ease: 'easeOut' }}
    >
      <div className="scene-node">
        <span className="star"><Star size={14} fill="currentColor" strokeWidth={0} /></span>
        <span className="n5">{toAr(num)}</span>
      </div>
      <button type="button" className="scene-cap" onClick={() => onSelect(beat.key)}>
        <div className="scene-cap-tag"><Star size={12} fill="currentColor" strokeWidth={0} /> ذروة المشهد · الأداء</div>
        <div className="scene-cap-title">{beat.role}</div>
        {sub && <div className="scene-cap-sub">{sub}</div>}
        <span className="scene-cap-cta">{done ? g('راجع أداءك', 'راجعي أداءك') : g('ابدأ الأداء ←', 'ابدئي الأداء ←')}</span>
      </button>
    </motion.div>
  )
}

export default function SceneOverview({ activities, unit, onSelect, themeKey }) {
  const g = useG()
  const { reduced } = useCinematicMotion()

  const byKey = useMemo(() => {
    const m = {}
    for (const a of activities || []) m[a.key] = a
    return m
  }, [activities])

  const beats = useMemo(
    () => SCENE_BEATS.map((b) => (byKey[b.key] ? { ...b, activity: byKey[b.key] } : null)).filter(Boolean),
    [byKey]
  )

  if (!beats.length) return null

  const nonCapstone = beats.filter((b) => !b.capstone)
  const doneCount = beats.filter((b) => b.activity.status === 'completed').length
  const total = beats.length
  const hereKey = (nonCapstone.find((b) => b.activity.status !== 'completed') || {}).key || null
  const capstoneEarned = CAPSTONE_PREREQS.every((k) => !byKey[k] || byKey[k].status === 'completed')

  const pct = total ? Math.round((doneCount / total) * 100) : 0
  const hereIdx = hereKey ? beats.findIndex((b) => b.key === hereKey) : total - 1
  const spineFill = total ? Math.min(100, Math.round(((hereIdx + 0.5) / total) * 100)) : 0

  const title = unit?.theme_ar || g('المشهد', 'المشهد')
  const outcome = unit?.description_ar || (Array.isArray(unit?.outcomes) ? unit.outcomes[0] : '') || ''
  const sceneNo = unit?.custom_sort

  return (
    <div className="scene-root" dir="rtl">
      <motion.section
        className="scene-slate"
        initial={reduced ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="scene-eyebrow">
          <span className="d" /> {sceneLabelFor(themeKey)}
          {sceneNo ? <span className="num"> · المشهد {toAr(sceneNo)}</span> : null}
        </div>
        <h2 className="scene-title">{title}</h2>
        {outcome && <p className="scene-outcome">بنهاية هذا المشهد، <b>{outcome}</b></p>}
        <div className="scene-foot">
          <div className="scene-bar"><i style={{ width: `${pct}%` }} /></div>
          <span className="scene-steps">{toAr(doneCount)} من {toAr(total)} خطوات</span>
        </div>
      </motion.section>

      <div className="scene-path">
        <div className="scene-spine"><i style={{ height: `${spineFill}%` }} /></div>
        {beats.map((b, i) =>
          b.capstone ? (
            <SceneCapstone key={b.key} beat={b} activity={b.activity} num={i + 1} earned={capstoneEarned} onSelect={onSelect} reduced={reduced} g={g} unit={unit} idx={i} />
          ) : (
            <SceneBeat key={b.key} beat={b} activity={b.activity} num={i + 1} here={b.key === hereKey} onSelect={onSelect} reduced={reduced} g={g} unit={unit} idx={i} />
          )
        )}
      </div>

      <p className="scene-foot-note">{g('مشهدٌ واحد متكامل — تعيشه من القراءة إلى الأداء.', 'مشهدٌ واحد متكامل — تعيشينه من القراءة إلى الأداء.')}</p>
    </div>
  )
}
