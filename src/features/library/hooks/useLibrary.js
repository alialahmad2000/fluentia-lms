// Data layer for the Fluentia Library. Reads go through the authenticated
// Supabase client; RLS lets staff (admin/trainer) read every book + chapter,
// and students see books gated by their level via library_chapter_visible().
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuthStudentData, useAuthRole } from '../../../stores/authStore'

// The level used for browse-gating (which of the three "rooms" a book lands in).
// Students → their own academic_level. Staff (admin/trainer) preview at level 1
// so all three rooms (My Library / Read Chapter One / Coming Soon) are visible.
export function usePreviewLevel() {
  const studentData = useAuthStudentData()
  const role = useAuthRole()
  if (studentData && studentData.academic_level != null) return Number(studentData.academic_level)
  // staff (admin/trainer) preview at max so every novel is readable for review
  return role === 'admin' || role === 'trainer' ? 99 : 0
}

// mine = current level & below (full read) · tease = exactly +1 (Chapter 1 only)
// soon = +2 and beyond (blurred "Coming Soon")
export function roomForBook(book, level) {
  const n = Number(book.level_number)
  if (n <= level) return 'mine'
  if (n === level + 1) return 'tease'
  return 'soon'
}

const THEME_LABEL = { mystery: 'MYSTERY', grief: 'A QUIET DRAMA', ambition: 'AMBITION', courage: 'COURAGE', adventure: 'AN ADVENTURE', wonder: 'A WONDER', warmth: 'A WARM TALE', discovery: 'A DISCOVERY' }
export function themeKicker(theme) { return THEME_LABEL[theme] || 'A NOVEL' }

export function useLibraryBooks() {
  return useQuery({
    queryKey: ['library-books'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('library_books')
        .select('id,title_en,title_ar,synopsis_en,synopsis_ar,theme,cefr,level_number,cover_data,author_label,total_chapters,status,sort_order')
        .is('deleted_at', null)
        .eq('status', 'published')
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data || []
    },
  })
}

export function useBook(bookId) {
  return useQuery({
    queryKey: ['library-book', bookId],
    enabled: !!bookId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: book, error } = await supabase.from('library_books').select('*').eq('id', bookId).single()
      if (error) throw error
      const { data: chapters, error: chErr } = await supabase
        .from('library_chapters')
        .select('id,chapter_number,title_en,title_ar,word_count,audio_url,audio_timing,illustrations')
        .eq('book_id', bookId)
        .order('chapter_number', { ascending: true })
      if (chErr) throw chErr
      return { book, chapters: chapters || [] }
    },
  })
}

export function useChapterContent(chapterId) {
  return useQuery({
    queryKey: ['library-chapter', chapterId],
    enabled: !!chapterId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('library_paragraphs')
        .select('id,paragraph_index, library_sentence_pairs(id,sentence_index,text_en,text_ar,is_dialogue)')
        .eq('chapter_id', chapterId)
        .order('paragraph_index', { ascending: true })
      if (error) throw error
      return (data || []).map((p) => ({
        id: p.id,
        index: p.paragraph_index,
        sentences: (p.library_sentence_pairs || [])
          .slice()
          .sort((a, b) => a.sentence_index - b.sentence_index),
      }))
    },
  })
}

// reading progress + completions for the current user (resume + gold seals)
export function useMyProgress(myId) {
  return useQuery({
    queryKey: ['library-my-progress', myId],
    enabled: !!myId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('library_reading_progress')
        .select('book_id,current_chapter_id,mode,book_completed_at,updated_at')
        .eq('student_id', myId)
        .order('updated_at', { ascending: false })
      if (error) throw error
      const rows = data || []
      const byBook = {}
      for (const r of rows) byBook[r.book_id] = r
      return { rows, byBook }
    },
  })
}

// words the user saved from novels (the «كلماتي» deck)
export function useMySavedWords(myId) {
  return useQuery({
    queryKey: ['library-my-words', myId],
    enabled: !!myId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('library_saved_vocab')
        .select('id,word,meaning,context_sentence,book_id,created_at')
        .eq('student_id', myId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
  })
}

// the mode column only allows reveal/assist — codex reads as 'reveal'
const dbMode = (m) => (m === 'assist' ? 'assist' : 'reveal')

export async function saveProgress(myId, bookId, chapterId, mode) {
  if (!myId || !bookId || !chapterId) return
  const { error } = await supabase
    .from('library_reading_progress')
    .upsert({ student_id: myId, book_id: bookId, current_chapter_id: chapterId, mode: dbMode(mode), updated_at: new Date().toISOString() }, { onConflict: 'student_id,book_id' })
    .select()
  if (error) console.warn('library saveProgress:', error.message)
}

// save a tapped word to the personal Library deck (SM-2 defaults handle the rest)
export async function saveWord(myId, bookId, chapterId, word, context) {
  const clean = String(word || '').replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, '').toLowerCase()
  if (!myId || clean.length < 2) return { ok: false, word: clean }
  const { error } = await supabase
    .from('library_saved_vocab')
    .insert({ student_id: myId, book_id: bookId || null, chapter_id: chapterId || null, word: clean, context_sentence: context || null, source: 'library' })
  // a duplicate (already in the deck) is a success from the reader's point of view
  return { ok: true, word: clean, dup: !!error }
}

export async function completeChapter(myId, bookId, chapterId, mode, isLast) {
  if (!myId || !bookId || !chapterId) return
  const { error } = await supabase
    .from('library_chapter_completions')
    .upsert({ student_id: myId, book_id: bookId, chapter_id: chapterId, mode: dbMode(mode) }, { onConflict: 'student_id,chapter_id' })
    .select()
  if (error) console.warn('library completeChapter:', error.message)
  if (isLast) {
    const { error: e2 } = await supabase
      .from('library_reading_progress')
      .upsert({ student_id: myId, book_id: bookId, current_chapter_id: chapterId, mode: dbMode(mode), book_completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: 'student_id,book_id' })
      .select()
    if (e2) console.warn('library completeBook:', e2.message)
  }
}
