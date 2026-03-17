// ─── Supabase Database Client for Curriculum Content ──────────────────
import { createClient } from '@supabase/supabase-js';

export default class DbClient {
  constructor() {
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    this.supabase = createClient(url, key);
  }

  // ── Fetch levels ──
  async getLevels() {
    const { data, error } = await this.supabase
      .from('curriculum_levels')
      .select('*')
      .order('level_number');
    if (error) throw new Error(`getLevels: ${error.message}`);
    return data;
  }

  // ── Fetch units ──
  async getUnits(levelId = null) {
    let query = this.supabase
      .from('curriculum_units')
      .select('*, curriculum_levels!inner(level_number, name_en, cefr)')
      .order('unit_number');
    if (levelId) query = query.eq('level_id', levelId);
    const { data, error } = await query;
    if (error) throw new Error(`getUnits: ${error.message}`);
    // Flatten level info
    return data.map(u => ({
      ...u,
      level_number: u.curriculum_levels.level_number,
      level_name: u.curriculum_levels.name_en,
      level_cefr: u.curriculum_levels.cefr,
    }));
  }

  // ── Upsert Reading ──
  async upsertReading(unitId, slot, data) {
    const row = {
      unit_id: unitId,
      reading_label: slot.toUpperCase(),
      title_en: data.title,
      passage_content: { paragraphs: data.content.split('\n\n').filter(Boolean) },
      passage_word_count: data.word_count,
      reading_skill_name_en: data.reading_skill_focus,
      critical_thinking_prompt_en: data.critical_thinking_question,
      is_published: false,
    };
    if (data.subtitle) row.title_ar = data.subtitle; // Use subtitle field

    const { error } = await this.supabase
      .from('curriculum_readings')
      .upsert(row, { onConflict: 'unit_id,reading_label' });
    if (error) throw new Error(`upsertReading: ${error.message}`);

    // Return reading id for dependent inserts
    const { data: reading } = await this.supabase
      .from('curriculum_readings')
      .select('id')
      .eq('unit_id', unitId)
      .eq('reading_label', slot.toUpperCase())
      .single();
    return reading?.id;
  }

  // ── Upsert Comprehension Questions ──
  async upsertComprehension(readingId, questions) {
    // Delete existing questions for this reading
    await this.supabase
      .from('curriculum_comprehension_questions')
      .delete()
      .eq('reading_id', readingId);

    const rows = questions.map((q, i) => ({
      reading_id: readingId,
      section: 'mcq',
      question_type: q.question_type,
      question_en: q.question_text,
      choices: q.choices,
      correct_answer: q.choices[q.correct_answer_index],
      explanation_en: q.explanation_en,
      explanation_ar: q.explanation_ar,
      sort_order: i,
    }));

    const { error } = await this.supabase
      .from('curriculum_comprehension_questions')
      .insert(rows);
    if (error) throw new Error(`upsertComprehension: ${error.message}`);
  }

  // ── Upsert Vocabulary ──
  async upsertVocabulary(readingId, words) {
    // Delete existing vocab for this reading
    await this.supabase
      .from('curriculum_vocabulary')
      .delete()
      .eq('reading_id', readingId);

    const rows = words.map((w, i) => ({
      reading_id: readingId,
      word: w.word,
      definition_en: w.definition_en,
      definition_ar: w.definition_ar,
      example_sentence: w.example_new || w.example_in_passage,
      part_of_speech: w.part_of_speech,
      sort_order: i,
    }));

    const { error } = await this.supabase
      .from('curriculum_vocabulary')
      .insert(rows);
    if (error) throw new Error(`upsertVocabulary: ${error.message}`);
  }

  // ── Upsert Vocabulary Exercises ──
  async upsertVocabExercises(readingId, exercises) {
    // Delete existing exercises for this reading
    await this.supabase
      .from('curriculum_vocabulary_exercises')
      .delete()
      .eq('reading_id', readingId);

    const rows = exercises.map((ex, i) => ({
      reading_id: readingId,
      exercise_label: `Exercise ${i + 1}`,
      exercise_type: ex.type,
      instructions_en: ex.instruction_en,
      instructions_ar: ex.instruction_ar,
      items: [{
        question: ex.question,
        options: ex.options || [],
        correct_answer: ex.correct_answer,
        explanation_ar: ex.explanation_ar,
      }],
      sort_order: i,
    }));

    const { error } = await this.supabase
      .from('curriculum_vocabulary_exercises')
      .insert(rows);
    if (error) throw new Error(`upsertVocabExercises: ${error.message}`);
  }

  // ── Upsert Grammar ──
  async upsertGrammar(levelId, unitId, data) {
    const row = {
      level_id: levelId,
      unit_id: unitId,
      topic_name_en: data.topic,
      topic_name_ar: data.topic, // Will be Arabic in the generated content
      category: 'grammar',
      explanation_content: {
        sections: [
          { type: 'explanation', content_en: data.explanation_en, content_ar: data.explanation_ar },
          { type: 'formula', content: data.formula },
          { type: 'examples', items: data.examples },
          { type: 'common_mistakes', items: data.common_mistakes },
        ]
      },
      is_published: false,
    };

    const { error } = await this.supabase
      .from('curriculum_grammar')
      .upsert(row, { onConflict: 'unit_id' })
      .select('id')
      .single();

    // Handle case where upsert doesn't have onConflict on unit_id
    // First check if one exists
    const { data: existing } = await this.supabase
      .from('curriculum_grammar')
      .select('id')
      .eq('unit_id', unitId)
      .single();

    let grammarId;
    if (existing) {
      await this.supabase.from('curriculum_grammar').update(row).eq('id', existing.id);
      grammarId = existing.id;
    } else {
      const { data: inserted, error: insertErr } = await this.supabase
        .from('curriculum_grammar')
        .insert(row)
        .select('id')
        .single();
      if (insertErr) throw new Error(`upsertGrammar: ${insertErr.message}`);
      grammarId = inserted.id;
    }

    return grammarId;
  }

  // ── Upsert Grammar Exercises ──
  async upsertGrammarExercises(grammarId, exercises) {
    await this.supabase
      .from('curriculum_grammar_exercises')
      .delete()
      .eq('grammar_id', grammarId);

    const rows = exercises.map((ex, i) => ({
      grammar_id: grammarId,
      exercise_type: ex.type,
      instructions_en: ex.question,
      items: [{
        question: ex.question,
        options: ex.options || [],
        correct_answer: ex.correct_answer,
        explanation_ar: ex.explanation_ar,
      }],
      sort_order: i,
    }));

    const { error } = await this.supabase
      .from('curriculum_grammar_exercises')
      .insert(rows);
    if (error) throw new Error(`upsertGrammarExercises: ${error.message}`);
  }

  // ── Upsert Writing ──
  async upsertWriting(unitId, data) {
    const row = {
      unit_id: unitId,
      task_type: data.task_type,
      title_en: data.prompt_en.slice(0, 100),
      prompt_en: data.prompt_en,
      prompt_ar: data.prompt_ar,
      hints: data.useful_phrases || [],
      word_count_min: data.word_limit.min,
      word_count_max: data.word_limit.max,
      rubric: data.grading_criteria ? Object.fromEntries(
        data.grading_criteria.map(c => [c.criterion, c.weight_percent])
      ) : undefined,
      model_answer: data.model_outline,
      is_published: false,
    };

    const { data: existing } = await this.supabase
      .from('curriculum_writing')
      .select('id')
      .eq('unit_id', unitId)
      .single();

    if (existing) {
      const { error } = await this.supabase.from('curriculum_writing').update(row).eq('id', existing.id);
      if (error) throw new Error(`upsertWriting: ${error.message}`);
    } else {
      const { error } = await this.supabase.from('curriculum_writing').insert(row);
      if (error) throw new Error(`upsertWriting: ${error.message}`);
    }
  }

  // ── Upsert Listening ──
  async upsertListening(unitId, data) {
    const exercises = (data.comprehension_questions || []).map((q, i) => ({
      type: 'mcq',
      question_en: q.question,
      question_type: q.type,
      options: q.options,
      correct_answer_index: q.correct_answer_index,
      explanation_ar: q.explanation_ar,
      sort_order: i,
    }));

    const row = {
      unit_id: unitId,
      title_en: `Listening: ${data.script_type}`,
      transcript: data.script,
      audio_type: data.script_type,
      audio_duration_seconds: data.estimated_duration_sec,
      exercises,
      is_published: false,
    };

    const { data: existing } = await this.supabase
      .from('curriculum_listening')
      .select('id')
      .eq('unit_id', unitId)
      .single();

    if (existing) {
      const { error } = await this.supabase.from('curriculum_listening').update(row).eq('id', existing.id);
      if (error) throw new Error(`upsertListening: ${error.message}`);
    } else {
      const { error } = await this.supabase.from('curriculum_listening').insert(row);
      if (error) throw new Error(`upsertListening: ${error.message}`);
    }
  }

  // ── Upsert Speaking ──
  async upsertSpeaking(unitId, data) {
    const row = {
      unit_id: unitId,
      topic_type: data.category,
      title_en: data.topic_en,
      title_ar: data.topic_ar,
      prompt_en: data.topic_en,
      prompt_ar: data.topic_ar,
      preparation_notes: data.preparation_tips_ar || [],
      useful_phrases: data.useful_vocabulary || [],
      min_duration_seconds: 30,
      max_duration_seconds: 240,
      evaluation_criteria: data.evaluation_focus ? Object.fromEntries(
        data.evaluation_focus.map(f => [f, 20])
      ) : undefined,
      is_published: false,
    };

    const { data: existing } = await this.supabase
      .from('curriculum_speaking')
      .select('id')
      .eq('unit_id', unitId)
      .single();

    if (existing) {
      const { error } = await this.supabase.from('curriculum_speaking').update(row).eq('id', existing.id);
      if (error) throw new Error(`upsertSpeaking: ${error.message}`);
    } else {
      const { error } = await this.supabase.from('curriculum_speaking').insert(row);
      if (error) throw new Error(`upsertSpeaking: ${error.message}`);
    }
  }

  // ── Upsert Irregular Verbs ──
  async upsertIrregularVerbs(levelId, verbs) {
    // Delete existing for this level
    await this.supabase
      .from('curriculum_irregular_verbs')
      .delete()
      .eq('level_id', levelId);

    const rows = verbs.map((v, i) => ({
      level_id: levelId,
      verb_base: v.base,
      verb_past: v.past,
      verb_past_participle: v.past_participle,
      meaning_ar: v.meaning_ar,
      example_sentence: v.example_present,
      sort_order: i,
    }));

    const { error } = await this.supabase
      .from('curriculum_irregular_verbs')
      .insert(rows);
    if (error) throw new Error(`upsertIrregularVerbs: ${error.message}`);
  }

  // ── Upsert Irregular Verb Exercises ──
  async upsertIrregularVerbExercises(levelId, exercises) {
    await this.supabase
      .from('curriculum_irregular_verb_exercises')
      .delete()
      .eq('level_id', levelId);

    const rows = exercises.map((ex, i) => ({
      level_id: levelId,
      exercise_type: ex.type,
      items: [{
        question: ex.question,
        options: ex.options || [],
        correct_answer: ex.correct_answer,
        explanation_ar: ex.explanation_ar,
      }],
      sort_order: i,
    }));

    const { error } = await this.supabase
      .from('curriculum_irregular_verb_exercises')
      .insert(rows);
    if (error) throw new Error(`upsertIrregularVerbExercises: ${error.message}`);
  }

  // ── Upsert Assessment ──
  async upsertAssessment(unitId, levelId, data) {
    const row = {
      unit_id: unitId,
      level_id: levelId,
      assessment_type: 'unit_quiz',
      title_en: data.title_en,
      title_ar: data.title_ar,
      questions: data.questions,
      passing_score: data.passing_score_percent || 60,
      time_limit_minutes: data.time_limit_minutes || 30,
      is_published: false,
    };

    const { data: existing } = await this.supabase
      .from('curriculum_assessments')
      .select('id')
      .eq('unit_id', unitId)
      .single();

    if (existing) {
      const { error } = await this.supabase.from('curriculum_assessments').update(row).eq('id', existing.id);
      if (error) throw new Error(`upsertAssessment: ${error.message}`);
    } else {
      const { error } = await this.supabase.from('curriculum_assessments').insert(row);
      if (error) throw new Error(`upsertAssessment: ${error.message}`);
    }
  }
}
