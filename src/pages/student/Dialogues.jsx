import { useMemo, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'
import { useQuery } from '@tanstack/react-query'
import { motion, useReducedMotion } from 'framer-motion'
import {
  MessagesSquare, GraduationCap, Briefcase, Coffee, Play, Check, Sparkles, ArrowLeft,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import './dialogues.css'

const AR = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
const toAr = (n) => String(n ?? 0).replace(/\d/g, (d) => AR[+d])

/* Arabic counts the noun differently at 1 / 2 / 3-10 / 11+. «١٠ سطرًا» and
   «٢ دقيقة» are simply wrong; the ladder is the same one `step/_ui/primitives`
   uses for questions and degrees. */
const linesAr = (n) => (n === 1 ? 'سطر واحد' : n === 2 ? 'سطران'
  : n <= 10 ? `${toAr(n)} أسطر` : `${toAr(n)} سطرًا`)
const minutesAr = (n) => (n === 1 ? 'دقيقة واحدة' : n === 2 ? 'دقيقتان'
  : n <= 10 ? `${toAr(n)} دقائق` : `${toAr(n)} دقيقة`)

const GROUP_ICON = { uni: GraduationCap, work: Briefcase, daily: Coffee }
const GROUP_HINT = {
  uni: 'مواقف تعيشها داخل الجامعة: زميل جديد، سؤال للدكتور، مشروع جماعي، ومعاملة في التسجيل.',
  work: 'المواقف التي ستقابلك في أول وظيفة: مقابلة، اجتماع، عميل على الهاتف، مهلة تطلبها من مديرك، واعتراض تقوله بلطف.',
  daily: 'الإنجليزية التي تحتاجها خارج القاعة: مقهى، مطار، عيادة، محل، حديث خفيف مع غريب، وسؤال عن الطريق.',
}
const GROUP_ORDER = ['uni', 'work', 'daily']

/** «محادثات جاهزة» — the scene library. Each card is a whole conversation he can
 *  walk into: listen → understand → memorise → take his role. */
export default function Dialogues() {
  const { profile } = useAuthStore(useShallow((s) => ({ profile: s.profile })))
  const reduce = useReducedMotion()
  const rise = (delay) => (reduce
    ? { initial: false, animate: { opacity: 1, y: 0 } }
    : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.4 } })
  // NOT whileInView: an IntersectionObserver that never fires (odd scroll container,
  // anchor jump, print) would leave a card stuck at opacity 0. A card animating
  // off-screen is harmless; an invisible card is not.

  const { data, isLoading } = useQuery({
    queryKey: ['dialogues', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data: scenarios, error } = await supabase
        .from('dialogue_scenarios').select('*')
        .eq('student_id', profile.id).order('sort_order')
      if (error) throw error
      const ids = (scenarios || []).map((s) => s.id)
      const [{ data: lines }, { data: progress }] = await Promise.all([
        ids.length
          ? supabase.from('dialogue_lines').select('scenario_id, speaker, end_ms').in('scenario_id', ids)
          : Promise.resolve({ data: [] }),
        supabase.from('dialogue_progress').select('*').eq('student_id', profile.id),
      ])
      // plain objects only — a Set here would rehydrate from the persisted cache as {}
      const stats = {}
      for (const l of lines || []) {
        const s = (stats[l.scenario_id] ||= { turns: 0, mine: 0, ms: 0 })
        s.turns += 1
        if (l.speaker === 'A') s.mine += 1
        if (l.end_ms > s.ms) s.ms = l.end_ms
      }
      return {
        scenarios: scenarios || [],
        stats,
        progress: Object.fromEntries((progress || []).map((p) => [p.scenario_id, p])),
      }
    },
  })

  const groups = useMemo(() => {
    const map = {}
    for (const s of data?.scenarios || []) (map[s.group_key] ||= []).push(s)
    return GROUP_ORDER.filter((k) => map[k]?.length).map((k) => ({
      key: k, label_ar: map[k][0].group_label_ar, items: map[k],
    }))
  }, [data])

  const total = data?.scenarios?.length || 0
  const mastered = useMemo(
    () => Object.values(data?.progress || {}).filter((p) => p.status === 'mastered').length,
    [data],
  )
  const myLines = useMemo(
    () => Object.values(data?.stats || {}).reduce((n, s) => n + s.mine, 0),
    [data],
  )
  const pct = total ? Math.round((mastered / total) * 100) : 0
  // start at 0 and step to the real value on the NEXT frame so the ring actually sweeps
  const [ringP, setRingP] = useState(0)
  useEffect(() => {
    if (reduce) { setRingP(pct); return }
    const id = requestAnimationFrame(() => setRingP(pct))
    return () => cancelAnimationFrame(id)
  }, [pct, reduce])
  const next = useMemo(
    () => (data?.scenarios || []).find((s) => data.progress[s.id]?.status !== 'mastered') || null,
    [data],
  )

  if (isLoading) {
    return (
      <div className="dlg-root" dir="rtl">
        <Stage />
        <div className="dlg-wrap"><div className="dlg-skel" /><div className="dlg-skel sm" /><div className="dlg-skel sm" /></div>
      </div>
    )
  }

  if (!total) {
    return (
      <div className="dlg-root" dir="rtl">
        <Stage />
        <div className="dlg-wrap">
          <div className="dlg-empty">
            <MessagesSquare size={30} />
            <h2>محادثاتك في الطريق</h2>
            <p>ستظهر هنا مشاهدك الجاهزة بمجرّد أن يجهّزها لك مدرّبك.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dlg-root" dir="rtl">
      <Stage />
      <div className="dlg-wrap">
        <header className="dlg-hero">
          <span className="dlg-hero__k"><MessagesSquare size={14} /> محادثات جاهزة</span>
          <h1>تعرف ماذا تقول… وكيف تردّ</h1>
          <p>
            مشاهد كاملة من يومك ومن مجالك، بصوتين مختلفين. استمع إلى المشهد، افهم كل سطر،
            احفظ سطورك، ثم أدِّ دورك: الطرف الآخر يتكلم وأنت من يجيب.
          </p>
          <div className="dlg-hero__stat">
            <div className="dlg-ring" style={{ '--p': ringP }}><span>{toAr(pct)}٪</span></div>
            <div className="dlg-hero__nums">
              {/* a bare Arabic-Indic ٠ is a single dot and reads as a glitch */}
              {mastered === 0
                ? <><b>لم تبدأ بعد</b><em>{toAr(total)} محادثة بانتظارك</em></>
                : <><b>{toAr(mastered)}</b><em>محادثة أتقنتها من أصل {toAr(total)}</em></>}
            </div>
            <span className="dlg-hero__sep" aria-hidden />
            <div className="dlg-hero__nums">
              <b>{toAr(myLines)}</b>
              <em>سطرًا تقوله أنت</em>
            </div>
          </div>
        </header>

        {next && (
          <motion.div {...rise(0)}>
            <Link to={`/student/dialogues/${next.scenario_key}`} className="dlg-next">
              <div className="dlg-next__body">
                <span className="dlg-next__k">تابع من هنا</span>
                <h2>{next.title_ar}</h2>
                <div className="dlg-next__en" dir="ltr">{next.title_en}</div>
                <p>{next.situation_ar}</p>
                <span className="dlg-next__cta"><Play size={15} /> ادخل المشهد</span>
              </div>
              <div className="dlg-next__cast" aria-hidden>
                <span className="dlg-face me">{'أنت'}</span>
                <span className="dlg-face them">{next.b_name.slice(0, 1)}</span>
              </div>
            </Link>
          </motion.div>
        )}

        {groups.map((gr) => {
          const Icon = GROUP_ICON[gr.key] || MessagesSquare
          return (
            <section key={gr.key}>
              <div className="dlg-shead"><Icon size={16} /><h2>{gr.label_ar}</h2><span className="rule" /></div>
              <p className="dlg-shint">{GROUP_HINT[gr.key]}</p>
              <div className="dlg-grid">
                {gr.items.map((s, i) => {
                  const st = data.stats[s.id] || { turns: 0, mine: 0, ms: 0 }
                  const p = data.progress[s.id] || {}
                  const steps = [
                    !!p.listened,
                    !!p.studied,
                    (p.recall_best || 0) >= 80,
                    (p.roleplay_best || 0) >= 80,
                  ]
                  const doneCount = steps.filter(Boolean).length
                  return (
                    <motion.div key={s.id} {...rise(Math.min(i, 5) * 0.05)}>
                      <Link to={`/student/dialogues/${s.scenario_key}`} className={`dlg-card${p.status === 'mastered' ? ' mastered' : ''}`}>
                        <div className="dlg-card__top">
                          <span className="dlg-chip">{s.place_ar}</span>
                          {p.status === 'mastered' && <span className="dlg-badge"><Check size={12} /> أتقنتها</span>}
                        </div>
                        <h3>{s.title_ar}</h3>
                        <div className="dlg-card__en" dir="ltr">{s.title_en}</div>
                        <div className="dlg-cast">
                          <span className="dlg-face me sm">أنت</span>
                          <span className="dlg-face them sm">{s.b_name.slice(0, 1)}</span>
                          <span className="dlg-cast__role">{s.b_role_ar}</span>
                        </div>
                        <div className="dlg-card__foot">
                          {doneCount > 0 && (
                            <div className="dlg-steps" aria-hidden>
                              {steps.map((on, k) => <i key={k} className={on ? 'on' : ''} />)}
                            </div>
                          )}
                          <div className="dlg-meta">
                            <span>{linesAr(st.turns)}</span>
                            <span className="d">{minutesAr(Math.max(1, Math.round(st.ms / 60000)))}</span>
                          </div>
                          <span className="dlg-card__go" aria-hidden><ArrowLeft size={16} /></span>
                        </div>
                        {doneCount > 0 && doneCount < 4 && (
                          <span className="dlg-card__prog" style={{ '--w': `${(doneCount / 4) * 100}%` }} aria-hidden />
                        )}
                      </Link>
                    </motion.div>
                  )
                })}
              </div>
            </section>
          )
        })}

        <p className="dlg-foot">
          <Sparkles size={13} />
          تُحسب المحادثة «أتقنتها» حين تستعيد سطورك من ذاكرتك وتردّ في دورك ردًّا صحيحًا.
        </p>
      </div>
    </div>
  )
}

/** The living room behind everything — a warm stage, never a flat black card. */
export function Stage() {
  return (
    <div className="dlg-stage" aria-hidden>
      <span className="dlg-stage__cone" />
      <i /><i /><i />
      <span className="dlg-stage__grain" />
    </div>
  )
}
