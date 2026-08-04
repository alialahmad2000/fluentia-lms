import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useG, useGenderize } from '@/i18n/gender'
import { useCinematicMotion } from '../../_premiumPrimitives'
import { SCENE_BEATS, BEAT_WHY_FALLBACK } from '../scene/sceneConfig'
import './spread.css'

/**
 * UnitSpread — the unit overview for custom-curriculum students, as a printed
 * SPREAD: a real page (paper stock, plate, editorial rule) floating over the
 * student's own dim world. Right leaf = identity (plate + title + promise);
 * left leaf = the index of stations, with the current one opened.
 *
 * Replaces SceneOverview (kept on disk, no longer mounted). Gated at the call
 * site to students.uses_custom_curriculum, so it never renders for anyone else.
 * The paper STOCK and ink change per students.theme_key — see spread.css.
 *
 * Pure/prop-driven; reuses the existing skill tabs via onSelect(key), and the
 * beat ordering + copy fallbacks from scene/sceneConfig.js.
 */

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩'
const toAr = (n) => String(n ?? '').replace(/[0-9]/g, (d) => AR_DIGITS[+d])

// The eyebrow that names the student's own world.
const TRACK_LABEL = {
  maktaba: 'مكتبتي',
  studio: 'الاستوديو',
  control: 'غرفة التحكّم',
  insight: 'رؤى',
  fardi: 'مساري',
}
const trackLabelFor = (k) => TRACK_LABEL[k] || 'مساري'

// DB ribbon text is genderized (gz); the hardcoded fallback carries explicit m/f forms.
const whyFor = (unit, key, g, gz) => {
  const ribbon = unit?.activity_ribbons?.[key]
  if (ribbon) return gz ? gz(ribbon) : ribbon
  const fb = BEAT_WHY_FALLBACK[key]
  if (!fb) return ''
  return typeof fb === 'string' ? fb : g(fb.m, fb.f)
}

function StatusMark({ status, g }) {
  if (status === 'completed') return <span className="sp-st done">مكتمل ✓</span>
  if (status === 'in_progress') return <span className="sp-st live">قيد التعلّم</span>
  return <span className="sp-st todo">{g('لم يبدأ', 'لم تبدئي')}</span>
}

function Station({ activity, num, here, onSelect, why, g, reduced, idx }) {
  const done = activity.status === 'completed'
  return (
    <motion.button
      type="button"
      className={`sp-item ${here ? 'now' : ''} ${done ? 'done' : ''}`}
      onClick={() => onSelect(activity.key)}
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, delay: idx * 0.045, ease: 'easeOut' }}
    >
      <span className="sp-n">{toAr(num)}</span>
      <span className="sp-b">
        <span className="sp-t">{activity.label}</span>
        {why && <span className="sp-s">{why}</span>}
        {here && (
          <span className="sp-go">
            {g('تابع من هنا', 'تابعي من هنا')}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m15 18-6-6 6-6" />
            </svg>
          </span>
        )}
      </span>
      <StatusMark status={activity.status} g={g} />
    </motion.button>
  )
}

export default function UnitSpread({ activities, unit, onSelect, themeKey, progress }) {
  const g = useG()
  const gz = useGenderize()
  const { reduced } = useCinematicMotion()

  const byKey = useMemo(() => {
    const m = {}
    for (const a of activities || []) m[a.key] = a
    return m
  }, [activities])

  const stations = useMemo(
    () => SCENE_BEATS.map((b) => (byKey[b.key] ? { key: b.key, activity: byKey[b.key] } : null)).filter(Boolean),
    [byKey]
  )

  if (!stations.length) return null

  const total = stations.length
  const doneCount = stations.filter((s) => s.activity.status === 'completed').length
  const hereKey = (stations.find((s) => s.activity.status !== 'completed') || {}).key || null
  const pct = progress?.percentage ?? (total ? Math.round((doneCount / total) * 100) : 0)

  const unitNo = unit?.custom_sort ?? unit?.unit_number
  const title = unit?.theme_ar || ''
  const titleEn = unit?.theme_en || ''
  const desc = unit?.description_ar || ''
  const why = unit?.why_matters ? (gz ? gz(unit.why_matters) : unit.why_matters) : ''
  const outcomes = Array.isArray(unit?.outcomes) ? unit.outcomes.filter(Boolean) : []
  const cover = unit?.cover_image_url

  return (
    <div className="spread-root" dir="rtl">
      <motion.article
        className="sp-page"
        initial={reduced ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="sp-spread">

          {/* ── LEAD LEAF: identity ── */}
          <section className="sp-lead">
            <div className="sp-kicker">
              <span className="r" aria-hidden />
              {trackLabelFor(themeKey)}
              {unitNo ? <> · الوحدة {toAr(unitNo)}</> : null}
            </div>

            {cover && (
              <div className="sp-plate">
                <img src={cover} alt="" loading="lazy" />
                {unitNo ? <span className="sp-numeral" aria-hidden>{toAr(unitNo)}</span> : null}
              </div>
            )}

            {title && <h2 className="sp-title">{title}</h2>}
            {titleEn && <div className="sp-en" dir="ltr">{titleEn}</div>}

            <div className="sp-rule" aria-hidden />

            {desc && <p className="sp-desc">{desc}</p>}
            {why && (
              <blockquote className="sp-pull">
                <p>{why}</p>
              </blockquote>
            )}

            {/* The promise belongs with the identity, not the index — it also
                balances the two leaves, which otherwise end at very different heights. */}
            {outcomes.length > 0 && (
              <div className="sp-out">
                <h4>بنهاية هذه الوحدة</h4>
                <ul>
                  {outcomes.map((o, i) => <li key={i}>{gz ? gz(o) : o}</li>)}
                </ul>
              </div>
            )}
          </section>

          {/* ── INDEX LEAF: the stations ── */}
          <section className="sp-index">
            <div className="sp-index-head">
              <h3>محطّات الوحدة</h3>
              <span className="sp-prog">{toAr(doneCount)} من {toAr(total)} محطّات</span>
            </div>
            <div className="sp-pbar" aria-hidden><i style={{ width: `${pct}%` }} /></div>

            {stations.map((s, i) => (
              <Station
                key={s.key}
                activity={s.activity}
                num={i + 1}
                here={s.key === hereKey}
                onSelect={onSelect}
                why={whyFor(unit, s.key, g, gz)}
                g={g}
                reduced={reduced}
                idx={i}
              />
            ))}
          </section>

        </div>
      </motion.article>
    </div>
  )
}
