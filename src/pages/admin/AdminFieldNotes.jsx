// «دفتر الميدان» — trainer console.
//
// This page is the reason the feature exists. The whole point of Field Notes is that
// the trainer catches a real mistake in a real client thread and it becomes permanent
// teaching material in under a minute — WITHOUT anyone opening a terminal. If adding
// a note is slow, the notes stop arriving and the section dies.
//
// Two modes:
//   «سطر واحد»    — paste the wrong sentence + the right one, pick the student, save.
//                   A drill is derived from those two sentences automatically, and a
//                   rule line is filled from them if you don't write one.
//   «ملاحظة كاملة» — the full note: natural phrasing, rule, why it matters, and as
//                   many hand-written drills as you want.
//
// Nothing is ever hard-deleted. Retiring a note sets is_published = false, which
// hides it from the student while every attempt she made against it survives.
import { useState, useMemo, useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  NotebookPen, Plus, Trash2, Eye, EyeOff, Save, Zap, FileText, Pencil, X, Check,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { NoteCard } from '../student/FieldNotes'
import '../student/fieldNotes.css'
import './adminFieldNotes.css'

const NOTE_TYPES = [
  ['error', 'خطأ'],
  ['upgrade', 'تحسين صياغة'],
  ['spelling', 'إملاء'],
  ['register', 'درجة رسمية'],
]

const EX_KINDS = [
  ['correct_the_error', 'صحّحي الجملة'],
  ['gap_fill', 'أكملي الفراغ'],
  ['choose', 'اختيار من متعدد'],
  ['rewrite', 'أعيدي الصياغة'],
]

// theme_key → the scoped accent token that student's account actually renders with.
// Lets the preview show HER copper/cyan/brass instead of the admin's palette,
// without a single hardcoded colour.
const THEME_TOKEN = {
  studio: 'studio', control: 'control', maktaba: 'maktaba',
  insight: 'insight', fardi: 'individual', desk: 'desk',
}

const EMPTY = {
  id: null,
  occurred_on: new Date().toISOString().slice(0, 10),
  context_label: '',
  note_type: 'error',
  original_text: '',
  corrected_text: '',
  natural_text: '',
  rule_title_ar: '',
  rule_explanation_ar: '',
  why_it_matters_ar: '',
  sort_order: 0,
}

const emptyExercise = () => ({
  kind: 'correct_the_error', prompt: '', answer: '', optionsText: '', hint_ar: '',
})

const parseOptions = (text) =>
  text.split('\n').map((s) => s.trim()).filter(Boolean)

export default function AdminFieldNotes() {
  const profile = useAuthStore((s) => s.profile)
  const qc = useQueryClient()

  const [studentId, setStudentId] = useState('')
  const [mode, setMode] = useState('quick')        // quick | full
  const [form, setForm] = useState(EMPTY)
  const [rows, setRows] = useState([])
  const [msg, setMsg] = useState(null)

  const { data: students } = useQuery({
    queryKey: ['admin-fn-students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, gender, theme_key, uses_field_notes, status, profiles(full_name, email)')
        .is('deleted_at', null)
        .order('enrollment_date', { ascending: false })
      if (error) throw error
      return data || []
    },
  })

  const { data: notes } = useQuery({
    queryKey: ['admin-fn-notes', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('field_notes')
        .select('*, field_note_exercises(*)')
        .eq('student_id', studentId)
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data || []
    },
  })

  const student = useMemo(
    () => (students || []).find((s) => s.id === studentId) || null,
    [students, studentId],
  )

  // The preview must speak to HER, not to whoever is logged in as admin.
  const previewG = useCallback(
    (male, female) => (student?.gender === 'male' ? male : female),
    [student],
  )

  const accentVars = useMemo(() => {
    const t = THEME_TOKEN[student?.theme_key]
    if (!t) return undefined
    return {
      '--fnx-accent': `var(--accent-${t})`,
      '--fnx-accent-strong': `var(--accent-${t}-strong)`,
      '--fnx-glow': `var(--accent-${t}-glow)`,
    }
  }, [student])

  const entitle = useMutation({
    mutationFn: async (on) => {
      // .select() then read the row back — a "successful" update that matched no row
      // (RLS, guard trigger) returns no error at all on this platform.
      const { data, error } = await supabase
        .from('students').update({ uses_field_notes: on }).eq('id', studentId).select()
      if (error) throw error
      console.log('[field-notes] entitlement write →', data)
      if (!data || data.length === 0) throw new Error('لم تُكتب أي صفوف — تحقق من الصلاحيات')
      return data[0]
    },
    onSuccess: (row) => {
      setMsg({ ok: true, text: row.uses_field_notes ? 'القسم صار ظاهر لها' : 'القسم صار مخفي عنها' })
      qc.invalidateQueries({ queryKey: ['admin-fn-students'] })
    },
    onError: (e) => setMsg({ ok: false, text: e.message }),
  })

  const save = useMutation({
    mutationFn: async () => {
      if (!studentId) throw new Error('اختر الطالبة أولاً')
      const corrected = form.corrected_text.trim()
      if (!corrected) throw new Error('«الصح» مطلوب')

      const original = form.original_text.trim()
      // Quick mode fills the two required teaching fields from the sentences
      // themselves rather than shipping a placeholder the student would read.
      const title = form.rule_title_ar.trim() || 'تصحيح من الميدان'
      const explanation = form.rule_explanation_ar.trim()
        || (original
          ? `الصياغة الصحيحة: «${corrected}» بدل «${original}».`
          : `الصياغة الأقرب للناطق الأصلي: «${corrected}».`)

      const payload = {
        student_id: studentId,
        created_by: profile?.id || null,
        occurred_on: form.occurred_on || null,
        context_label: form.context_label.trim() || null,
        note_type: form.note_type,
        original_text: original || null,
        corrected_text: corrected,
        natural_text: form.natural_text.trim() || null,
        rule_title_ar: title,
        rule_explanation_ar: explanation,
        why_it_matters_ar: form.why_it_matters_ar.trim() || null,
        sort_order: Number(form.sort_order) || 0,
        is_published: true,
      }

      let note
      if (form.id) {
        const { data, error } = await supabase
          .from('field_notes').update(payload).eq('id', form.id).select()
        if (error) throw error
        console.log('[field-notes] note update →', data)
        if (!data?.length) throw new Error('لم تُكتب أي صفوف — تحقق من الصلاحيات')
        note = data[0]
      } else {
        const { data, error } = await supabase.from('field_notes').insert(payload).select()
        if (error) throw error
        console.log('[field-notes] note insert →', data)
        if (!data?.length) throw new Error('لم تُكتب أي صفوف — تحقق من الصلاحيات')
        note = data[0]
      }

      // Drills. Quick mode derives one from the two sentences — a real drill built
      // from real data, not an invented sentence.
      let exercises = rows
        .filter((r) => r.prompt.trim() && r.answer.trim())
        .map((r, i) => ({
          note_id: note.id,
          kind: r.kind,
          prompt: r.prompt.trim(),
          answer: r.answer.trim(),
          options: r.kind === 'choose' && r.optionsText.trim() ? parseOptions(r.optionsText) : null,
          hint_ar: r.hint_ar.trim() || null,
          sort_order: (i + 1) * 10,
        }))

      if (exercises.length === 0 && !form.id && original) {
        exercises = [{
          note_id: note.id,
          kind: 'correct_the_error',
          prompt: original,
          answer: corrected,
          options: null,
          hint_ar: title,
          sort_order: 10,
        }]
      }

      if (exercises.length) {
        const { data, error } = await supabase
          .from('field_note_exercises').insert(exercises).select()
        if (error) throw error
        console.log('[field-notes] exercises insert →', data)
        if (!data?.length) throw new Error('الملاحظة انحفظت لكن التمارين ما انحفظت')
      }

      return { note, n: exercises.length }
    },
    onSuccess: ({ note, n }) => {
      setMsg({ ok: true, text: `انحفظت «${note.rule_title_ar}» مع ${n} تمرين` })
      setForm(EMPTY); setRows([])
      qc.invalidateQueries({ queryKey: ['admin-fn-notes', studentId] })
    },
    onError: (e) => setMsg({ ok: false, text: e.message }),
  })

  const togglePublish = useMutation({
    mutationFn: async (note) => {
      // Hide, never delete: the student stops seeing it, every attempt survives.
      const { data, error } = await supabase
        .from('field_notes').update({ is_published: !note.is_published }).eq('id', note.id).select()
      if (error) throw error
      console.log('[field-notes] publish toggle →', data)
      if (!data?.length) throw new Error('لم تُكتب أي صفوف — تحقق من الصلاحيات')
      return data[0]
    },
    onSuccess: (row) => {
      setMsg({ ok: true, text: row.is_published ? 'رجعت ظاهرة' : 'انخفت عن الطالبة (ما انحذفت)' })
      qc.invalidateQueries({ queryKey: ['admin-fn-notes', studentId] })
    },
    onError: (e) => setMsg({ ok: false, text: e.message }),
  })

  const edit = useCallback((note) => {
    setMode('full')
    setForm({
      id: note.id,
      occurred_on: note.occurred_on || '',
      context_label: note.context_label || '',
      note_type: note.note_type,
      original_text: note.original_text || '',
      corrected_text: note.corrected_text || '',
      natural_text: note.natural_text || '',
      rule_title_ar: note.rule_title_ar || '',
      rule_explanation_ar: note.rule_explanation_ar || '',
      why_it_matters_ar: note.why_it_matters_ar || '',
      sort_order: note.sort_order ?? 0,
    })
    setRows([])   // existing drills stay attached; new rows here are additions
    setMsg(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const set = useCallback((k, v) => setForm((f) => ({ ...f, [k]: v })), [])

  const previewNote = useMemo(() => ({
    id: 'preview',
    rule_title_ar: form.rule_title_ar.trim() || 'تصحيح من الميدان',
    rule_explanation_ar: form.rule_explanation_ar.trim()
      || (form.original_text.trim()
        ? `الصياغة الصحيحة: «${form.corrected_text.trim()}» بدل «${form.original_text.trim()}».`
        : `الصياغة الأقرب للناطق الأصلي: «${form.corrected_text.trim()}».`),
    why_it_matters_ar: form.why_it_matters_ar.trim() || null,
    context_label: form.context_label.trim() || null,
    original_text: form.original_text.trim() || null,
    corrected_text: form.corrected_text.trim() || '—',
    natural_text: form.natural_text.trim() || null,
    status: 'new',
    field_note_exercises: rows.filter((r) => r.prompt.trim() && r.answer.trim()),
  }), [form, rows])

  // ── the role gate sits AFTER every hook above. A conditional return placed
  //    among the hooks changes the hook count between renders → React #310. ──
  if (profile && profile.role !== 'admin') return <Navigate to="/" replace />

  return (
    <div className="afn-root">
      <header className="afn-head">
        <div>
          <h1><NotebookPen size={22} aria-hidden="true" /> دفتر الميدان</h1>
          <p>ملاحظة واحدة = غلط حقيقي أو تحسين حقيقي من شغل الطالبة. الإضافة المفروض تاخذ أقل من دقيقة.</p>
        </div>
      </header>

      <div className="afn-bar">
        <label className="afn-field afn-field--grow">
          <span>الطالبة</span>
          <select value={studentId} onChange={(e) => { setStudentId(e.target.value); setMsg(null) }}>
            <option value="">— اختر —</option>
            {(students || []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.profiles?.full_name || s.profiles?.email || s.id}
                {s.uses_field_notes ? ' ✓' : ''}
              </option>
            ))}
          </select>
        </label>

        {student && (
          <button
            className={`afn-toggle${student.uses_field_notes ? ' is-on' : ''}`}
            onClick={() => entitle.mutate(!student.uses_field_notes)}
            disabled={entitle.isPending}
          >
            {student.uses_field_notes ? <Eye size={15} /> : <EyeOff size={15} />}
            {student.uses_field_notes ? 'القسم ظاهر لها' : 'القسم مخفي — فعّليه'}
          </button>
        )}
      </div>

      {msg && <div className={`afn-msg${msg.ok ? '' : ' is-bad'}`}>{msg.text}</div>}

      {!studentId ? (
        <div className="afn-blank">اختر الطالبة عشان تبدأ.</div>
      ) : (
        <>
          <div className="afn-modes">
            <button className={mode === 'quick' ? 'is-on' : ''} onClick={() => setMode('quick')}>
              <Zap size={15} aria-hidden="true" /> سطر واحد
            </button>
            <button className={mode === 'full' ? 'is-on' : ''} onClick={() => setMode('full')}>
              <FileText size={15} aria-hidden="true" /> ملاحظة كاملة
            </button>
            {form.id && (
              <button className="afn-cancel" onClick={() => { setForm(EMPTY); setRows([]) }}>
                <X size={14} aria-hidden="true" /> إلغاء التعديل
              </button>
            )}
          </div>

          <div className="afn-split">
            <section className="afn-form">
              <label className="afn-field">
                <span>اللي كتبته (الغلط)</span>
                <textarea dir="ltr" rows={2} value={form.original_text}
                  onChange={(e) => set('original_text', e.target.value)}
                  placeholder="Thank you, our products is a really high quality!" />
              </label>

              <label className="afn-field">
                <span>الصح *</span>
                <textarea dir="ltr" rows={2} value={form.corrected_text}
                  onChange={(e) => set('corrected_text', e.target.value)}
                  placeholder="Thank you, our products are really high quality!" />
              </label>

              <label className="afn-field">
                <span>القاعدة — سطر واحد</span>
                <input value={form.rule_title_ar}
                  onChange={(e) => set('rule_title_ar', e.target.value)}
                  placeholder="الجمع يأخذ are" />
              </label>

              {mode === 'full' && (
                <>
                  <label className="afn-field">
                    <span>الأطبع — كيف يقولها الناطق الأصلي</span>
                    <textarea dir="ltr" rows={2} value={form.natural_text}
                      onChange={(e) => set('natural_text', e.target.value)} />
                  </label>
                  <label className="afn-field">
                    <span>شرح القاعدة</span>
                    <textarea rows={3} value={form.rule_explanation_ar}
                      onChange={(e) => set('rule_explanation_ar', e.target.value)} />
                  </label>
                  <label className="afn-field">
                    <span>ليه يفرق</span>
                    <textarea rows={2} value={form.why_it_matters_ar}
                      onChange={(e) => set('why_it_matters_ar', e.target.value)} />
                  </label>
                  <div className="afn-grid3">
                    <label className="afn-field">
                      <span>تاريخ المحادثة</span>
                      <input type="date" value={form.occurred_on}
                        onChange={(e) => set('occurred_on', e.target.value)} />
                    </label>
                    <label className="afn-field">
                      <span>السياق</span>
                      <input value={form.context_label}
                        onChange={(e) => set('context_label', e.target.value)}
                        placeholder="محادثة عميل — واتساب" />
                    </label>
                    <label className="afn-field">
                      <span>النوع</span>
                      <select value={form.note_type} onChange={(e) => set('note_type', e.target.value)}>
                        {NOTE_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </label>
                  </div>

                  <div className="afn-ex">
                    <div className="afn-ex__head">
                      <h3>التمارين</h3>
                      <button onClick={() => setRows((r) => [...r, emptyExercise()])}>
                        <Plus size={14} aria-hidden="true" /> تمرين
                      </button>
                    </div>
                    {rows.length === 0 && (
                      <p className="afn-hint">
                        بدون تمارين مكتوبة، بيتولّد تمرين واحد تلقائياً من الغلط والصح.
                      </p>
                    )}
                    {rows.map((r, i) => (
                      <div className="afn-exrow" key={i}>
                        <div className="afn-exrow__top">
                          <select value={r.kind}
                            onChange={(e) => setRows((rs) => rs.map((x, j) => j === i ? { ...x, kind: e.target.value } : x))}>
                            {EX_KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                          </select>
                          <button className="afn-x"
                            onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
                            aria-label="حذف السطر">
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <input placeholder="السؤال" value={r.prompt}
                          onChange={(e) => setRows((rs) => rs.map((x, j) => j === i ? { ...x, prompt: e.target.value } : x))} />
                        <input dir="ltr" placeholder="الإجابة" value={r.answer}
                          onChange={(e) => setRows((rs) => rs.map((x, j) => j === i ? { ...x, answer: e.target.value } : x))} />
                        {r.kind === 'choose' && (
                          <textarea dir="ltr" rows={4} placeholder={'خيار في كل سطر\n(الإجابة لازم تطابق أحد الخيارات حرفياً)'}
                            value={r.optionsText}
                            onChange={(e) => setRows((rs) => rs.map((x, j) => j === i ? { ...x, optionsText: e.target.value } : x))} />
                        )}
                        <input placeholder="تلميح" value={r.hint_ar}
                          onChange={(e) => setRows((rs) => rs.map((x, j) => j === i ? { ...x, hint_ar: e.target.value } : x))} />
                      </div>
                    ))}
                  </div>
                </>
              )}

              <button className="afn-save" onClick={() => save.mutate()} disabled={save.isPending}>
                <Save size={16} aria-hidden="true" />
                {form.id ? 'حفظ التعديل' : 'حفظ الملاحظة'}
              </button>
            </section>

            <aside className="afn-preview">
              <span className="afn-preview__k">كذا بتشوفها في حسابها</span>
              <div className="fnx-root afn-preview__stage" style={accentVars}>
                <NoteCard note={previewNote} open onToggle={() => {}} onPractice={() => {}} g={previewG} />
              </div>
            </aside>
          </div>

          <section className="afn-list">
            <h2>ملاحظاتها ({(notes || []).length})</h2>
            {(notes || []).map((n) => (
              <div className={`afn-item${n.is_published ? '' : ' is-hidden'}`} key={n.id}>
                <div className="afn-item__t">
                  <strong>{n.rule_title_ar}</strong>
                  <span dir="ltr">{n.corrected_text}</span>
                </div>
                <span className="afn-item__n">{(n.field_note_exercises || []).length} تمرين</span>
                <span className="afn-item__s" data-s={n.status}>{n.status}</span>
                <button onClick={() => edit(n)} aria-label="تعديل"><Pencil size={14} /></button>
                <button onClick={() => togglePublish.mutate(n)} aria-label={n.is_published ? 'إخفاء' : 'إظهار'}>
                  {n.is_published ? <EyeOff size={14} /> : <Check size={14} />}
                </button>
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  )
}
