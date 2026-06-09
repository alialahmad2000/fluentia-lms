// Optional after-chapter self-check. Calm CTA → 3–4 questions with instant gentle
// feedback. A miss offers «اسمعيها من هنا» → jumps the audio back into the story.
// The opinion question can be shared straight to the novel's book club.
import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Sparkles, Check, X, Volume2, MessageCircle } from 'lucide-react'
import { useChapterQuestions, useMyQuestionAttempts, saveQuestionAttempt } from '../hooks/useLibraryEngagement'

export default function ChapterQuestions({ chapterId, bookId, myId, onJump, onShareOpinion }) {
  const qc = useQueryClient()
  const { data: questions = [], isLoading } = useChapterQuestions(chapterId)
  const { data: priorAll = [] } = useMyQuestionAttempts(bookId, myId)
  const [open, setOpen] = useState(false)
  const [ans, setAns] = useState({})      // qid -> {selected_id, is_correct, text_answer}
  const [shared, setShared] = useState({})

  const prior = useMemo(() => {
    const m = {}; for (const a of priorAll) if (a.chapter_id === chapterId) m[a.question_id] = a; return m
  }, [priorAll, chapterId])

  if (isLoading || !questions.length) return null

  const state = (q) => ans[q.id] || (prior[q.id] ? { selected_id: prior[q.id].selected_id, is_correct: prior[q.id].is_correct, text_answer: prior[q.id].text_answer } : null)
  const graded = questions.filter((q) => q.type !== 'opinion')
  const doneCount = graded.filter((q) => state(q)?.selected_id).length

  const pick = async (q, optId) => {
    if (state(q)?.selected_id) return                 // locked after answering
    const is_correct = optId === q.correct_id
    setAns((p) => ({ ...p, [q.id]: { selected_id: optId, is_correct } }))
    await saveQuestionAttempt(myId, bookId, chapterId, q, { selected_id: optId, is_correct })
    qc.invalidateQueries({ queryKey: ['lib-q-attempts', bookId, myId] })
  }
  const saveOpinion = async (q, text) => {
    setAns((p) => ({ ...p, [q.id]: { text_answer: text } }))
    await saveQuestionAttempt(myId, bookId, chapterId, q, { text_answer: text })
    qc.invalidateQueries({ queryKey: ['lib-q-attempts', bookId, myId] })
  }

  if (!open) {
    return (
      <button className="lib-q-cta" onClick={() => setOpen(true)}>
        <Sparkles size={16} />
        <span><b>اختبري فهمك</b><i>{questions.length} أسئلة قصيرة — اختياري</i></span>
      </button>
    )
  }

  return (
    <div className="lib-q-panel" dir="rtl">
      <div className="lib-q-head">
        <span>اختبري فهمك</span>
        {graded.length > 0 && <em>{doneCount} / {graded.length}</em>}
      </div>
      {questions.map((q) => {
        const st = state(q)
        const kind = { comprehension: 'فهم', inference: 'استنتاج', vocabulary: 'مفردات', opinion: 'رأيك' }[q.type]
        if (q.type === 'opinion') {
          return (
            <div key={q.id} className="lib-q-item" data-opinion>
              <div className="lib-q-kind" data-opinion>{kind}</div>
              <p className="lib-q-text" dir="ltr">{q.question_en}</p>
              {q.question_ar && <p className="lib-q-ar">{q.question_ar}</p>}
              <OpinionBox initial={st?.text_answer} onSave={(t) => saveOpinion(q, t)}
                onShare={onShareOpinion ? (t) => { onShareOpinion(t); setShared((p) => ({ ...p, [q.id]: true })) } : null}
                shared={shared[q.id]} />
            </div>
          )
        }
        return (
          <div key={q.id} className="lib-q-item">
            <div className="lib-q-kind">{kind}</div>
            <p className="lib-q-text" dir="ltr">{q.question_en}</p>
            {q.question_ar && <p className="lib-q-ar">{q.question_ar}</p>}
            <div className="lib-q-opts">
              {(q.options || []).map((o) => {
                const picked = st?.selected_id === o.id
                const isAnswer = st?.selected_id && o.id === q.correct_id
                const isWrongPick = picked && !st?.is_correct
                return (
                  <button key={o.id} className="lib-q-opt" disabled={!!st?.selected_id}
                    data-correct={isAnswer || undefined} data-wrong={isWrongPick || undefined}
                    onClick={() => pick(q, o.id)}>
                    <span className="lib-q-optid">{o.id}</span>
                    <span className="lib-q-opttext" dir="ltr">{o.en}{o.ar ? <i> — {o.ar}</i> : null}</span>
                    {isAnswer && <Check size={15} className="lib-q-mk ok" />}
                    {isWrongPick && <X size={15} className="lib-q-mk no" />}
                  </button>
                )
              })}
            </div>
            {st?.selected_id && (
              <div className="lib-q-explain" data-ok={st.is_correct || undefined}>
                {q.explanation_ar}
                {!st.is_correct && q.jump_p != null && onJump && (
                  <button className="lib-q-jump" onClick={() => onJump(q.jump_p, q.jump_s)}>
                    <Volume2 size={13} /> اسمعيها من هنا
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function OpinionBox({ initial, onSave, onShare, shared }) {
  const [text, setText] = useState(initial || '')
  const [saved, setSaved] = useState(!!initial)
  return (
    <div className="lib-q-opinion">
      <textarea value={text} onChange={(e) => { setText(e.target.value); setSaved(false) }} dir="auto"
        placeholder="اكتبي رأيك بحرّيتك…" rows={2} />
      <div className="lib-q-opinion-row">
        <button className="lib-q-save" disabled={!text.trim() || saved} onClick={() => { onSave(text.trim()); setSaved(true) }}>
          {saved ? 'تم الحفظ ✓' : 'حفظ'}
        </button>
        {onShare && (
          <button className="lib-q-share" disabled={!text.trim() || shared} onClick={() => onShare(text.trim())}>
            <MessageCircle size={13} /> {shared ? 'تمت المشاركة' : 'شاركيه مع المجموعة'}
          </button>
        )}
      </div>
    </div>
  )
}
