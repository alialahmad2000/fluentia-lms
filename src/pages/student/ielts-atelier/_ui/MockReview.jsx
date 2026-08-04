import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, BookOpen, Headphones, PenLine, Mic } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { gradeQuestions, questionKey } from '@/lib/ielts/grading'
import ExamReview from './ExamReview'

/* ============================================================================
   Full review for a whole IELTS attempt (mock OR diagnostic), RETROACTIVE.
   The attempt stores only content IDs + the student's answer map, so we
   re-fetch the source (passages / sections-with-transcript / task prompts) by
   id and RE-GRADE with the stored answers → works for previously-done exams.
   ========================================================================== */

const SANS = "-apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
const TAJAWAL = "'Tajawal', sans-serif"
const POS = ['var(--iel-diff-1, #4ade80)', 'var(--iel-diff-2, #f5b042)', 'var(--iel-diff-3, #fb7185)']
const posColor = (i) => POS[i] || 'var(--iel-accent)'

async function buildAttemptReview(attempt) {
  const answers = attempt?.answers || {}
  const content = answers.content || {}
  const review = { reading: [], listening: [], writing: null, speaking: null }

  // READING — re-fetch passages by id, re-grade with the stored answer map
  const rIds = Array.isArray(content.reading) ? content.reading : []
  const rMap = answers.reading?.answers
  if (rIds.length && rMap && Object.keys(rMap).length) {
    const { data } = await supabase.from('ielts_reading_passages').select('id, title, content, questions, answer_key').in('id', rIds)
    const byId = new Map((data || []).map((p) => [p.id, p]))
    review.reading = rIds.map((id) => byId.get(id)).filter(Boolean).map((p, pi) => {
      const sa = {}
      ;(Array.isArray(p.questions) ? p.questions : []).forEach((q, idx) => { const v = rMap[`${pi}_${q.question_number}`]; if (v != null && v !== '') sa[questionKey(q, idx)] = v })
      const g = gradeQuestions({ questions: p.questions, answerKey: p.answer_key, studentAnswers: sa })
      return { title: p.title, sourceId: p.id, correct: g.correct, total: g.total, perQuestion: g.perQuestion, sourceText: p.content, sourceKind: 'passage', color: posColor(pi) }
    })
  }

  // LISTENING — re-fetch WITH transcript, re-grade
  const lIds = Array.isArray(content.listening) ? content.listening : []
  const lMap = answers.listening?.answers
  if (lIds.length && lMap && Object.keys(lMap).length) {
    const { data } = await supabase.from('ielts_listening_sections').select('id, title, transcript, questions, answer_key').in('id', lIds)
    const byId = new Map((data || []).map((s) => [s.id, s]))
    review.listening = lIds.map((id) => byId.get(id)).filter(Boolean).map((s, si) => {
      const sa = {}
      ;(Array.isArray(s.questions) ? s.questions : []).forEach((q, idx) => { const v = lMap[`${si}_${q.question_number}`]; if (v != null && v !== '') sa[questionKey(q, idx)] = v })
      const g = gradeQuestions({ questions: s.questions, answerKey: s.answer_key, studentAnswers: sa })
      return { title: s.title, sourceId: s.id, correct: g.correct, total: g.total, perQuestion: g.perQuestion, sourceText: s.transcript, sourceKind: 'transcript', color: 'var(--iel-accent)' }
    })
  }

  // WRITING — prompt + the student's essay + band + AI feedback
  const w = answers.writing
  if (w?.done && (w.task1_text || w.task2_text)) {
    const wc = content.writing || {}
    const ids = [wc.task1Id, wc.task2Id].filter(Boolean)
    let tasks = {}
    if (ids.length) { const { data } = await supabase.from('ielts_writing_tasks').select('id, task_type, title, prompt').in('id', ids); tasks = Object.fromEntries((data || []).map((t) => [t.task_type, t])) }
    review.writing = { task1_text: w.task1_text, task2_text: w.task2_text, band1: w.band1, band2: w.band2, band: w.band, feedback: w.feedback, prompts: tasks }
  }

  // SPEAKING — the part questions + band + AI feedback (+ the student's transcript if kept)
  const sp = answers.speaking
  if (sp?.done) {
    const sc = content.speaking || {}
    const ids = [sc.part1Id, sc.part2Id, sc.part3Id].filter(Boolean)
    let parts = {}
    if (ids.length) { const { data } = await supabase.from('ielts_speaking_questions').select('id, part, topic, questions, cue_card').in('id', ids); parts = Object.fromEntries((data || []).map((p) => [String(p.part), p])) }
    review.speaking = { band: sp.band, feedback: sp.feedback, transcripts: sp.transcripts, parts }
  }

  return review
}

// The band is the emotional payload of an IELTS review — render it as a chip, not throwaway text.
function BandChip({ band }) {
  if (band == null) return null
  return (
    <span style={{ flex: 'none', display: 'inline-flex', alignItems: 'baseline', gap: 5, padding: '5px 12px', borderRadius: 999, background: 'var(--iel-accent-soft)', border: '1px solid color-mix(in srgb, var(--iel-accent) 35%, transparent)' }}>
      <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--iel-accent-ink)', fontFamily: TAJAWAL, letterSpacing: '.04em' }}>Band</span>
      <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--iel-accent)', fontFamily: "'Playfair Display', serif", lineHeight: 1 }}>{Number(band).toFixed(1)}</span>
    </span>
  )
}

function GroupHead({ icon: Icon, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 2px 2px' }}>
      <span style={{ width: 30, height: 30, borderRadius: 9, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--iel-accent-soft)', color: 'var(--iel-accent)' }}><Icon size={17} /></span>
      <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--iel-ink)', fontFamily: TAJAWAL }}>{label}</span>
      <span style={{ flex: 1, height: 1, background: 'linear-gradient(to left, var(--iel-border), transparent)' }} />
    </div>
  )
}

const CARD_SHADOW = '0 1px 2px rgba(0,0,0,.4), 0 12px 30px -14px rgba(0,0,0,.6)'

function ReviewPanel({ children, rail = 'var(--iel-accent)' }) {
  return (
    <div className="iel-gcard" style={{ padding: 0, overflow: 'hidden', background: 'var(--iel-surface)', boxShadow: CARD_SHADOW, borderInlineStart: `3px solid ${rail}` }}>
      {children}
    </div>
  )
}

function TextReviewCard({ prompt, title, essay, band, feedback, rail }) {
  return (
    <ReviewPanel rail={rail}>
      <div style={{ padding: '15px 18px', borderBottom: '1px solid var(--iel-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ fontSize: 15.5, fontWeight: 800, color: 'var(--iel-ink)', fontFamily: TAJAWAL }}>{title}</span>
        <BandChip band={band} />
      </div>
      {prompt && (
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--iel-border)', direction: 'ltr' }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.06em', color: 'var(--iel-ink-3)', marginBottom: 6, direction: 'rtl' }}>السؤال</div>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--iel-ink-2)', fontFamily: SANS, lineHeight: 1.75, textAlign: 'left' }}>{prompt}</p>
        </div>
      )}
      {essay && (
        <div style={{ padding: '14px 18px', borderBottom: feedback ? '1px solid var(--iel-border)' : 0 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.06em', color: 'var(--iel-ink-3)', marginBottom: 7 }}>إجابتك</div>
          <div style={{ padding: '13px 15px', borderRadius: 12, background: 'var(--iel-surface-2)', border: '1px solid var(--iel-border)', direction: 'ltr' }}>
            <p style={{ margin: 0, fontSize: 15, color: 'var(--iel-ink)', fontFamily: SANS, lineHeight: 1.85, textAlign: 'left', whiteSpace: 'pre-wrap' }}>{essay}</p>
          </div>
        </div>
      )}
      {feedback && (
        <div style={{ padding: '14px 18px' }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.06em', color: 'var(--iel-accent-ink)', marginBottom: 6 }}>الملاحظات</div>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--iel-ink-2)', fontFamily: TAJAWAL, lineHeight: 1.85 }}>{feedback}</p>
        </div>
      )}
    </ReviewPanel>
  )
}

function WritingReview({ w }) {
  const items = []
  if (w.task2_text) items.push({ key: 't2', title: 'المهمة الثانية', prompt: w.prompts?.task2?.prompt, essay: w.task2_text, band: w.band2 ?? w.band, feedback: w.feedback?.overall_feedback_ar })
  if (w.task1_text) items.push({ key: 't1', title: 'المهمة الأولى', prompt: w.prompts?.task1?.prompt, essay: w.task1_text, band: w.band1, feedback: null })
  if (!items.length) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <GroupHead icon={PenLine} label="الكتابة" />
      {items.map((it) => <TextReviewCard key={it.key} rail="var(--iel-gold)" {...it} />)}
    </div>
  )
}

// Pull a display transcript for a given speaking part, tolerant of a few shapes.
function partTranscript(transcripts, part) {
  if (!transcripts) return null
  if (typeof transcripts === 'string') return part === 1 ? transcripts : null
  const cand = transcripts[`part${part}`] ?? transcripts[String(part)] ?? transcripts[part]
  const text = typeof cand === 'string' ? cand : cand?.text
  return text && String(text).trim() ? String(text).trim() : null
}

function SpeakingReview({ s }) {
  const parts = ['1', '2', '3'].map((p) => s.parts?.[p]).filter(Boolean)
  const fb = s.feedback || {}
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <GroupHead icon={Mic} label="المحادثة" />
      <ReviewPanel rail="var(--iel-accent)">
        <div style={{ padding: '15px 18px', borderBottom: '1px solid var(--iel-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <span style={{ fontSize: 15.5, fontWeight: 800, color: 'var(--iel-ink)', fontFamily: TAJAWAL }}>الأسئلة والملاحظات</span>
          <BandChip band={s.band} />
        </div>
        {parts.length > 0 && (
          <div style={{ padding: '14px 18px', borderBottom: fb.feedback_ar ? '1px solid var(--iel-border)' : 0 }}>
            {parts.map((p) => {
              const tr = partTranscript(s.transcripts, Number(p.part))
              return (
                <div key={p.id} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--iel-ink-3)', marginBottom: 6, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'baseline' }}>
                    <span>الجزء {p.part}</span>
                    {p.topic && <span dir="ltr" style={{ color: 'var(--iel-ink-2)', fontWeight: 700 }}>{p.topic}</span>}
                  </div>
                  <div style={{ direction: 'ltr' }}>
                    {(Array.isArray(p.questions) ? p.questions : []).slice(0, 8).map((q, i) => (
                      <p key={i} style={{ margin: '0 0 5px', fontSize: 13.5, color: 'var(--iel-ink-2)', fontFamily: SANS, lineHeight: 1.6, textAlign: 'left' }}>• {typeof q === 'string' ? q : (q?.question || q?.q || q?.text || '')}</p>
                    ))}
                  </div>
                  {tr && (
                    <div style={{ marginTop: 8, padding: '11px 14px', borderRadius: 11, background: 'var(--iel-surface-2)', border: '1px solid var(--iel-border)', direction: 'ltr' }}>
                      <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--iel-ink-3)', marginBottom: 4, direction: 'rtl' }}>إجابتك (نصياً)</div>
                      <p style={{ margin: 0, fontSize: 14, color: 'var(--iel-ink)', fontFamily: SANS, lineHeight: 1.8, textAlign: 'left', whiteSpace: 'pre-wrap' }}>{tr}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
        {fb.feedback_ar && (
          <div style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.06em', color: 'var(--iel-accent-ink)', marginBottom: 6 }}>الملاحظات</div>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--iel-ink-2)', fontFamily: TAJAWAL, lineHeight: 1.85 }}>{fb.feedback_ar}</p>
          </div>
        )}
      </ReviewPanel>
    </div>
  )
}

export default function MockReview({ attempt, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  const { data: review, isLoading } = useQuery({
    queryKey: ['ielts-attempt-review', attempt?.id],
    enabled: !!attempt?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: () => buildAttemptReview(attempt),
  })
  const hasAny = review && (review.reading.length || review.listening.length || review.writing || review.speaking)

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ width: '100%', padding: '13px 18px', borderRadius: 12, border: '1px solid var(--iel-border)', background: 'var(--iel-surface)', color: 'var(--iel-ink-2)', fontSize: 14, fontWeight: 800, fontFamily: TAJAWAL, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
      >
        <span>{open ? 'إخفاء مراجعة الاختبار' : 'مراجعة الاختبار كاملاً'}</span>
        <ChevronDown size={16} style={{ transition: 'transform .22s ease', transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} style={{ overflow: 'hidden', marginTop: 14 }}>
            {isLoading ? (
              <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--iel-ink-3)', fontFamily: TAJAWAL, fontSize: 13.5 }}>جاري تجهيز المراجعة…</div>
            ) : !hasAny ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--iel-ink-3)', fontFamily: TAJAWAL, fontSize: 13.5, border: '1px solid var(--iel-border)', borderRadius: 14, background: 'var(--iel-surface)' }}>لا تتوفّر تفاصيل كافية لمراجعة هذا الاختبار.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 34 }}>
                {review.reading.length > 0 && <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}><GroupHead icon={BookOpen} label="القراءة" /><ExamReview sections={review.reading} /></div>}
                {review.listening.length > 0 && <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}><GroupHead icon={Headphones} label="الاستماع" /><ExamReview sections={review.listening} /></div>}
                {review.writing && <WritingReview w={review.writing} />}
                {review.speaking && <SpeakingReview s={review.speaking} />}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
