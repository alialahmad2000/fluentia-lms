import { useState } from 'react'
import { ChevronDown, ChevronUp, Save, Loader2 } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'
import PassageEditor from './PassageEditor'
import ComprehensionEditor from './ComprehensionEditor'
import VocabularyManager from './VocabularyManager'
import VocabExerciseEditor from './VocabExerciseEditor'
import ImagePreview from './ImagePreview'
import JSONArrayEditor from './JSONArrayEditor'

function Accordion({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3"
        style={{ background: 'rgba(255,255,255,0.03)' }}
      >
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'Tajawal' }}>{title}</span>
        {open ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
      </button>
      {open && <div className="p-4 space-y-4" style={{ background: 'rgba(255,255,255,0.01)' }}>{children}</div>}
    </div>
  )
}

export default function ReadingEditor({ unitId, label = 'A', reading, comprehension = [], vocabulary = [], vocabExercises = [], onRefresh }) {
  const [data, setData] = useState(reading || {})
  const [questions, setQuestions] = useState(comprehension)
  const [vocab, setVocab] = useState(vocabulary)
  const [exercises, setExercises] = useState(vocabExercises)
  const [saving, setSaving] = useState(false)

  const inputStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'var(--text-primary)',
    fontFamily: 'Tajawal',
  }

  const update = (field, val) => setData(prev => ({ ...prev, [field]: val }))

  const save = async () => {
    setSaving(true)
    try {
      // Upsert reading
      const readingPayload = {
        unit_id: unitId,
        reading_label: label,
        title_en: data.title_en || '',
        title_ar: data.title_ar || '',
        before_read_exercise_a: data.before_read_exercise_a || null,
        before_read_exercise_b: data.before_read_exercise_b || null,
        before_read_image_url: data.before_read_image_url || null,
        before_read_caption: data.before_read_caption || '',
        passage_content: data.passage_content || { paragraphs: [] },
        passage_word_count: (data.passage_content?.paragraphs || []).join(' ').split(/\s+/).filter(Boolean).length,
        passage_footnotes: data.passage_footnotes || [],
        passage_image_urls: data.passage_image_urls || [],
        infographic_type: data.infographic_type || null,
        infographic_data: data.infographic_data || null,
        infographic_image_url: data.infographic_image_url || null,
        reading_skill_name_en: data.reading_skill_name_en || '',
        reading_skill_name_ar: data.reading_skill_name_ar || '',
        reading_skill_explanation: data.reading_skill_explanation || '',
        reading_skill_exercises: data.reading_skill_exercises || [],
        critical_thinking_type: data.critical_thinking_type || '',
        critical_thinking_prompt_en: data.critical_thinking_prompt_en || '',
        critical_thinking_prompt_ar: data.critical_thinking_prompt_ar || '',
        passage_audio_url: data.passage_audio_url || null,
      }

      let readingId = data.id
      if (readingId) {
        const { error } = await supabase.from('curriculum_readings').update(readingPayload).eq('id', readingId)
        if (error) throw error
      } else {
        const { data: inserted, error } = await supabase.from('curriculum_readings').insert(readingPayload).select('id').single()
        if (error) throw error
        readingId = inserted.id
        setData(prev => ({ ...prev, id: readingId }))
      }

      // Save comprehension questions
      if (readingId) {
        await supabase.from('curriculum_comprehension_questions').delete().eq('reading_id', readingId)
        if (questions.length > 0) {
          const qRows = questions.map((q, i) => ({
            reading_id: readingId, section: q.section || 'mcq', question_type: q.question_type || 'DETAIL',
            question_en: q.question_en, question_ar: q.question_ar, choices: q.choices || [],
            correct_answer: q.correct_answer || '', explanation_en: q.explanation_en || '',
            explanation_ar: q.explanation_ar || '', sort_order: i,
          }))
          const { error } = await supabase.from('curriculum_comprehension_questions').insert(qRows)
          if (error) throw error
        }

        // Save vocabulary
        await supabase.from('curriculum_vocabulary').delete().eq('reading_id', readingId)
        if (vocab.length > 0) {
          const vRows = vocab.map((v, i) => ({
            reading_id: readingId, word: v.word, definition_en: v.definition_en, definition_ar: v.definition_ar,
            example_sentence: v.example_sentence, part_of_speech: v.part_of_speech, pronunciation_ipa: v.pronunciation_ipa,
            audio_url: v.audio_url || null, image_url: v.image_url || null, difficulty_tier: v.difficulty_tier || 'core', sort_order: i,
          }))
          const { error } = await supabase.from('curriculum_vocabulary').insert(vRows)
          if (error) throw error
        }

        // Save vocab exercises
        await supabase.from('curriculum_vocabulary_exercises').delete().eq('reading_id', readingId)
        if (exercises.length > 0) {
          const eRows = exercises.map((ex, i) => ({
            reading_id: readingId, exercise_label: ex.exercise_label, exercise_type: ex.exercise_type,
            instructions_en: ex.instructions_en, instructions_ar: ex.instructions_ar,
            mini_passage: ex.mini_passage || null, items: ex.items || [], sort_order: i,
          }))
          const { error } = await supabase.from('curriculum_vocabulary_exercises').insert(eRows)
          if (error) throw error
        }
      }

      onRefresh?.()
    } catch (err) {
      console.error('Save reading error:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <input value={data.title_en || ''} onChange={e => update('title_en', e.target.value)} placeholder="Title (English)" className="px-3 py-2 rounded-lg text-sm" style={inputStyle} dir="ltr" />
        <input value={data.title_ar || ''} onChange={e => update('title_ar', e.target.value)} placeholder="العنوان (عربي)" className="px-3 py-2 rounded-lg text-sm" style={inputStyle} />
      </div>

      <Accordion title="قبل القراءة" defaultOpen={false}>
        <ImagePreview label="صورة قبل القراءة" value={data.before_read_image_url} onChange={v => update('before_read_image_url', v)} />
        <input value={data.before_read_caption || ''} onChange={e => update('before_read_caption', e.target.value)} placeholder="وصف الصورة" className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} />
        <JSONArrayEditor label="تمرين أ (قبل القراءة)" value={data.before_read_exercise_a || []} onChange={v => update('before_read_exercise_a', v)} />
        <JSONArrayEditor label="تمرين ب (قبل القراءة)" value={data.before_read_exercise_b || []} onChange={v => update('before_read_exercise_b', v)} />
      </Accordion>

      <Accordion title="نص القراءة" defaultOpen={true}>
        <PassageEditor value={data.passage_content} onChange={v => update('passage_content', v)} />
        <JSONArrayEditor label="حواشي" value={data.passage_footnotes || []} onChange={v => update('passage_footnotes', v)} />
        <JSONArrayEditor label="صور النص" value={data.passage_image_urls || []} onChange={v => update('passage_image_urls', v)} placeholder="رابط صورة..." />
      </Accordion>

      <Accordion title="أسئلة الفهم">
        <ComprehensionEditor questions={questions} onChange={setQuestions} />
      </Accordion>

      <Accordion title="مهارة القراءة">
        <div className="grid grid-cols-2 gap-3">
          <input value={data.reading_skill_name_en || ''} onChange={e => update('reading_skill_name_en', e.target.value)} placeholder="Skill name (EN)" className="px-3 py-2 rounded-lg text-sm" style={inputStyle} dir="ltr" />
          <input value={data.reading_skill_name_ar || ''} onChange={e => update('reading_skill_name_ar', e.target.value)} placeholder="اسم المهارة" className="px-3 py-2 rounded-lg text-sm" style={inputStyle} />
        </div>
        <textarea value={data.reading_skill_explanation || ''} onChange={e => update('reading_skill_explanation', e.target.value)} placeholder="شرح المهارة" rows={3} className="w-full px-3 py-2 rounded-lg text-sm resize-none" style={inputStyle} />
        <JSONArrayEditor label="تمارين المهارة" value={data.reading_skill_exercises || []} onChange={v => update('reading_skill_exercises', v)} />
      </Accordion>

      <Accordion title="التفكير النقدي">
        <input value={data.critical_thinking_type || ''} onChange={e => update('critical_thinking_type', e.target.value)} placeholder="Type" className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} dir="ltr" />
        <input value={data.critical_thinking_prompt_en || ''} onChange={e => update('critical_thinking_prompt_en', e.target.value)} placeholder="Prompt (English)" className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} dir="ltr" />
        <input value={data.critical_thinking_prompt_ar || ''} onChange={e => update('critical_thinking_prompt_ar', e.target.value)} placeholder="السؤال (عربي)" className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} />
      </Accordion>

      <Accordion title="المفردات">
        <VocabularyManager vocabulary={vocab} onChange={setVocab} />
      </Accordion>

      <Accordion title="تمارين المفردات">
        <VocabExerciseEditor exercises={exercises} onChange={setExercises} />
      </Accordion>

      <button
        onClick={save}
        disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium"
        style={{
          background: saving ? 'rgba(56,189,248,0.1)' : 'rgba(56,189,248,0.2)',
          color: '#38bdf8',
          fontFamily: 'Tajawal',
          border: '1px solid rgba(56,189,248,0.3)',
        }}
      >
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        {saving ? 'جارٍ الحفظ...' : 'حفظ القراءة'}
      </button>
    </div>
  )
}
