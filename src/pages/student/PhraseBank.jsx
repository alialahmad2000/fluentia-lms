import { useState, useMemo, useCallback } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquareQuote, Volume2, ArrowLeft, Check, X, Sparkles,
  Briefcase, Coffee, Target, RotateCcw,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { useG } from '../../i18n/gender'
import './phraseBank.css'

const AR = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
const toAr = (n) => String(n ?? 0).replace(/\d/g, (d) => AR[+d])

/** Free device TTS — no ElevenLabs spend for a 37-phrase bank. */
function speak(text) {
  try {
    window.speechSynthesis?.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-US'
    u.rate = 0.92
    window.speechSynthesis.speak(u)
  } catch { /* device without speech synthesis — the text is still on screen */ }
}

const shuffle = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

export default function PhraseBank() {
  const { profile } = useAuthStore(useShallow((s) => ({ profile: s.profile })))
  const g = useG()
  const qc = useQueryClient()
  const [openGroup, setOpenGroup] = useState(null)
  const [drill, setDrill] = useState(null) // { groupKey, queue, idx, picked, correct }

  const { data, isLoading } = useQuery({
    queryKey: ['phrase-bank', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const [{ data: phrases, error: pErr }, { data: progress }] = await Promise.all([
        supabase.from('phrase_bank_phrases').select('*').eq('student_id', profile.id).order('sort_order'),
        supabase.from('phrase_bank_progress').select('phrase_id, status, correct_count').eq('student_id', profile.id),
      ])
      if (pErr) throw pErr
      const byId = Object.fromEntries((progress || []).map((r) => [r.phrase_id, r]))
      return { phrases: phrases || [], progress: byId }
    },
  })

  const record = useMutation({
    mutationFn: async ({ phraseId, correct }) => {
      const { error } = await supabase.rpc('phrase_bank_record', { p_phrase_id: phraseId, p_correct: correct })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['phrase-bank', profile?.id] }),
  })

  const groups = useMemo(() => {
    const map = new Map()
    for (const p of data?.phrases || []) {
      if (!map.has(p.group_key)) {
        map.set(p.group_key, { key: p.group_key, label_ar: p.group_label_ar, label_en: p.group_label_en, register: p.register, items: [] })
      }
      map.get(p.group_key).items.push(p)
    }
    return [...map.values()]
  }, [data])

  const known = useMemo(
    () => Object.values(data?.progress || {}).filter((r) => r.status === 'known').length,
    [data],
  )
  const total = data?.phrases?.length || 0
  const pct = total ? Math.round((known / total) * 100) : 0

  // ── drill: show the situation, pick the phrase ────────────────────────────
  const startDrill = useCallback((group) => {
    const queue = shuffle(group.items).map((item) => {
      const distractors = shuffle(group.items.filter((x) => x.id !== item.id)).slice(0, 3)
      return { item, options: shuffle([item, ...distractors]) }
    })
    setDrill({ groupKey: group.key, label: group.label_ar, queue, idx: 0, picked: null, correct: 0 })
  }, [])

  const pick = (opt) => {
    if (!drill || drill.picked) return
    const cur = drill.queue[drill.idx]
    const isRight = opt.id === cur.item.id
    setDrill((d) => ({ ...d, picked: opt.id, correct: d.correct + (isRight ? 1 : 0) }))
    record.mutate({ phraseId: cur.item.id, correct: isRight })
  }
  const next = () => setDrill((d) => (d.idx + 1 >= d.queue.length ? { ...d, done: true } : { ...d, idx: d.idx + 1, picked: null }))

  if (isLoading) {
    return (
      <div className="pb-root" dir="rtl">
        <div className="pb-world" aria-hidden><i /><i /><i /></div>
        <div className="pb-wrap"><div className="pb-skel" /><div className="pb-skel sm" /><div className="pb-skel sm" /></div>
      </div>
    )
  }

  if (!total) {
    return (
      <div className="pb-root" dir="rtl">
        <div className="pb-world" aria-hidden><i /><i /><i /></div>
        <div className="pb-wrap">
          <div className="pb-empty">
            <MessageSquareQuote size={30} />
            <h2>لم تُضَف عباراتك بعد</h2>
            <p>سيظهر هنا بنك العبارات الخاص بك فور إعداده من مدرّبك.</p>
          </div>
        </div>
      </div>
    )
  }

  // ── drill view ────────────────────────────────────────────────────────────
  if (drill) {
    const cur = drill.queue[drill.idx]
    if (drill.done) {
      const score = Math.round((drill.correct / drill.queue.length) * 100)
      return (
        <div className="pb-root" dir="rtl">
          <div className="pb-world" aria-hidden><i /><i /><i /></div>
          <div className="pb-wrap pb-wrap--narrow">
            <motion.div className="pb-done" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
              <div className={`pb-done__score ${score >= 80 ? 'good' : score >= 50 ? 'mid' : 'low'}`} dir="ltr">{toAr(score)}٪</div>
              <p className="pb-done__sub">{toAr(drill.correct)} من {toAr(drill.queue.length)} في «{drill.label}»</p>
              <p className="pb-done__msg">
                {score >= 80 ? g('ممتاز — صارت هذه العبارات جاهزة في لسانك.', 'ممتاز — صارت هذه العبارات جاهزة على لسانكِ.')
                  : score >= 50 ? g('تقدّم جيد. أعِد الجولة مرة أخرى وستثبت.', 'تقدّم جيد. أعيدي الجولة مرة أخرى وستثبت.')
                  : g('لا بأس — ارجع للبطاقات واقرأ «متى تستخدمها»، ثم أعِد الاختبار.', 'لا بأس — ارجعي للبطاقات واقرئي «متى تستخدمها»، ثم أعيدي الاختبار.')}
              </p>
              <div className="pb-done__acts">
                <button className="pb-btn primary" onClick={() => startDrill(groups.find((x) => x.key === drill.groupKey))}>
                  <RotateCcw size={15} /> {g('أعِد الجولة', 'أعيدي الجولة')}
                </button>
                <button className="pb-btn" onClick={() => setDrill(null)}><ArrowLeft size={15} /> العودة للعبارات</button>
              </div>
            </motion.div>
          </div>
        </div>
      )
    }
    return (
      <div className="pb-root" dir="rtl">
        <div className="pb-world" aria-hidden><i /><i /><i /></div>
        <div className="pb-wrap pb-wrap--narrow">
          <button className="pb-back" onClick={() => setDrill(null)}>→ إنهاء الاختبار</button>
          <div className="pb-prog"><span style={{ width: `${((drill.idx) / drill.queue.length) * 100}%` }} /></div>
          <p className="pb-step"><span dir="ltr">{toAr(drill.idx + 1)}/{toAr(drill.queue.length)}</span> · {drill.label}</p>

          <motion.div key={cur.item.id} className="pb-sit" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <span className="pb-sit__k"><Target size={13} /> الموقف</span>
            <p>{cur.item.situation_ar}</p>
          </motion.div>

          <div className="pb-choices">
            {cur.options.map((o) => {
              const isAnswer = o.id === cur.item.id
              let cls = 'pb-choice'
              if (drill.picked) {
                if (isAnswer) cls += ' right'
                else if (o.id === drill.picked) cls += ' wrongp'
                else cls += ' dim'
              }
              return (
                <button key={o.id} className={cls} onClick={() => pick(o)} disabled={!!drill.picked} dir="ltr">
                  <span>{o.phrase_en}</span>
                  {drill.picked && isAnswer && <Check size={16} />}
                  {drill.picked && !isAnswer && o.id === drill.picked && <X size={16} />}
                </button>
              )
            })}
          </div>

          <AnimatePresence>
            {drill.picked && (
              <motion.div className="pb-why" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <p className="pb-why__ar">{cur.item.meaning_ar}</p>
                <p className="pb-why__use">{cur.item.when_to_use_ar}</p>
                {cur.item.example_en && (
                  <p className="pb-why__ex" dir="ltr">
                    {cur.item.example_en}
                    <button className="pb-mini" onClick={() => speak(cur.item.example_en)} aria-label="استمع"><Volume2 size={13} /></button>
                  </p>
                )}
                <button className="pb-btn primary wide" onClick={next}>
                  {drill.idx + 1 >= drill.queue.length ? 'إنهاء' : 'التالي'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    )
  }

  // ── group view ────────────────────────────────────────────────────────────
  if (openGroup) {
    const group = groups.find((x) => x.key === openGroup)
    return (
      <div className="pb-root" dir="rtl">
        <div className="pb-world" aria-hidden><i /><i /><i /></div>
        <div className="pb-wrap">
          <button className="pb-back" onClick={() => setOpenGroup(null)}>→ كل المجموعات</button>
          <header className="pb-ghead">
            <div>
              <h1>{group.label_ar}</h1>
              {group.label_en && <div className="en" dir="ltr">{group.label_en}</div>}
            </div>
            <button className="pb-btn primary" onClick={() => startDrill(group)}><Target size={15} /> {g('اختبرني', 'اختبريني')}</button>
          </header>

          <div className="pb-cards">
            {group.items.map((p, i) => {
              const st = data.progress[p.id]
              return (
                <motion.article
                  key={p.id} className={`pb-card${st?.status === 'known' ? ' known' : ''}`}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 8) * 0.04, duration: 0.35 }}
                >
                  <div className="pb-card__top">
                    <h3 dir="ltr">{p.phrase_en}</h3>
                    <button className="pb-mini" onClick={() => speak(p.phrase_en)} aria-label="استمع"><Volume2 size={15} /></button>
                  </div>
                  <p className="pb-card__ar">{p.meaning_ar}</p>
                  <div className="pb-card__use"><span>متى تستخدمها</span><p>{p.when_to_use_ar}</p></div>
                  {p.example_en && (
                    <div className="pb-card__ex">
                      <p dir="ltr">{p.example_en}</p>
                      {p.example_ar && <p className="ar">{p.example_ar}</p>}
                    </div>
                  )}
                  {st?.status === 'known' && <span className="pb-badge"><Check size={12} /> أتقنتها</span>}
                </motion.article>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ── home ──────────────────────────────────────────────────────────────────
  const work = groups.filter((x) => x.register === 'work')
  const life = groups.filter((x) => x.register === 'life')
  const Section = ({ title, icon, list, hint }) => (
    <>
      <div className="pb-shead">{icon}<h2>{title}</h2><span className="rule" /></div>
      <p className="pb-shint">{hint}</p>
      <div className="pb-grid">
        {list.map((gr, i) => {
          const gKnown = gr.items.filter((p) => data.progress[p.id]?.status === 'known').length
          return (
            <motion.button
              key={gr.key} className="pb-gcard" onClick={() => setOpenGroup(gr.key)}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 6) * 0.05, duration: 0.4 }}
            >
              <h3>{gr.label_ar}</h3>
              {gr.label_en && <div className="en" dir="ltr">{gr.label_en}</div>}
              <div className="pb-gcard__bar"><span style={{ width: `${(gKnown / gr.items.length) * 100}%` }} /></div>
              <div className="pb-gcard__meta">
                <span>{toAr(gr.items.length)} عبارات</span>
                <span className="k">{toAr(gKnown)} أتقنتها</span>
              </div>
            </motion.button>
          )
        })}
      </div>
    </>
  )

  return (
    <div className="pb-root" dir="rtl">
      <div className="pb-world" aria-hidden><i /><i /><i /></div>
      <div className="pb-wrap">
        <header className="pb-hero">
          <span className="pb-hero__k"><MessageSquareQuote size={14} /> عبارات جاهزة</span>
          <h1>عبارات تقولها بثقة</h1>
          <p>
            ليست كلمات مفردة — بل جُملٌ كاملة جاهزة، كلٌّ منها بمعناها وموضع استعمالها.
            {g(' احفظها، ثم اختبر نفسك على «متى أقولها».', ' احفظيها، ثم اختبري نفسك على «متى أقولها».')}
          </p>
          <div className="pb-hero__stat">
            <div className="pb-ring" style={{ '--p': pct }}>
              <span dir="ltr">{toAr(pct)}٪</span>
            </div>
            <div className="pb-hero__nums">
              <b dir="ltr">{toAr(known)} / {toAr(total)}</b>
              <em>عبارة أتقنتها</em>
            </div>
          </div>
        </header>

        <Section
          title="عبارات مجالك" icon={<Briefcase size={16} />} list={work}
          hint="عبارات تستعملها في الاجتماعات والمتابعة والعرض — من صميم دراستك في إدارة الأعمال."
        />
        <Section
          title="عبارات الحياة اليومية" icon={<Coffee size={16} />} list={life}
          hint="عبارات تحتاجها مع الناس كل يوم: التحية، الطلب بأدب، وحين تحتاج وقتًا للتفكير."
        />

        <p className="pb-foot"><Sparkles size={13} /> العبارة تصبح «أتقنتها» بعد أن تختارها صحيحةً مرّتين في الاختبار.</p>
      </div>
    </div>
  )
}
