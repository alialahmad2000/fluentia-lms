// Library engagement data layer: chapter comprehension questions, the per-novel
// "you understood X%" rollup, shadowing scores, and the per-novel book club.
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'

// ---- comprehension questions -------------------------------------------------
export function useChapterQuestions(chapterId) {
  return useQuery({
    queryKey: ['lib-questions', chapterId],
    enabled: !!chapterId,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('library_chapter_questions')
        .select('id,q_index,type,question_en,question_ar,options,correct_id,explanation_ar,jump_p,jump_s')
        .eq('chapter_id', chapterId)
        .order('q_index', { ascending: true })
      if (error) throw error
      return data || []
    },
  })
}

// every answer the student has given across a whole novel (drives the rollup)
export function useMyQuestionAttempts(bookId, myId) {
  return useQuery({
    queryKey: ['lib-q-attempts', bookId, myId],
    enabled: !!bookId && !!myId,
    staleTime: 20 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('library_question_attempts')
        .select('question_id,chapter_id,selected_id,text_answer,is_correct')
        .eq('book_id', bookId)
        .eq('student_id', myId)
      if (error) throw error
      return data || []
    },
  })
}

export async function saveQuestionAttempt(myId, bookId, chapterId, q, ans) {
  if (!myId || !q?.id) return
  const { error } = await supabase
    .from('library_question_attempts')
    .upsert({
      question_id: q.id, student_id: myId, chapter_id: chapterId, book_id: bookId,
      selected_id: ans.selected_id ?? null, text_answer: ans.text_answer ?? null, is_correct: ans.is_correct ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'question_id,student_id' })
    .select()
  if (error) console.warn('library saveQuestionAttempt:', error.message)
}

// ---- shadowing ---------------------------------------------------------------
export function useMyShadowScores(chapterId, myId) {
  return useQuery({
    queryKey: ['lib-shadow', chapterId, myId],
    enabled: !!chapterId && !!myId,
    staleTime: 15 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('library_shadow_attempts')
        .select('p,s,score,created_at')
        .eq('chapter_id', chapterId)
        .eq('student_id', myId)
        .order('created_at', { ascending: false })
      if (error) throw error
      // best score per sentence
      const best = {}
      for (const r of data || []) { const k = `${r.p}-${r.s}`; if (!(k in best) || r.score > best[k]) best[k] = r.score }
      return best
    },
  })
}

// ---- book club ---------------------------------------------------------------
export function useDiscussions(bookId) {
  return useQuery({
    queryKey: ['lib-discussions', bookId],
    enabled: !!bookId,
    staleTime: 10 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('library_discussions')
        .select('id,student_id,author_name,chapter_number,body,is_pinned,created_at')
        .eq('book_id', bookId)
        .is('deleted_at', null)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
  })
}

export async function postDiscussion(myId, bookId, { body, chapter_number, author_name }) {
  const clean = String(body || '').trim()
  if (!myId || !bookId || clean.length < 1) return { ok: false }
  const { data, error } = await supabase
    .from('library_discussions')
    .insert({ student_id: myId, book_id: bookId, body: clean, chapter_number: chapter_number ?? null, author_name: author_name || null })
    .select()
    .single()
  if (error) { console.warn('library postDiscussion:', error.message); return { ok: false, error } }
  return { ok: true, row: data }
}
