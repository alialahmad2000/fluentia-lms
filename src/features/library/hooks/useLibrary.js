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
  return role === 'admin' || role === 'trainer' ? 1 : 0
}

// mine = current level & below (full read) · tease = exactly +1 (Chapter 1 only)
// soon = +2 and beyond (blurred "Coming Soon")
export function roomForBook(book, level) {
  const n = Number(book.level_number)
  if (n <= level) return 'mine'
  if (n === level + 1) return 'tease'
  return 'soon'
}

const THEME_LABEL = { mystery: 'MYSTERY', grief: 'A QUIET DRAMA', ambition: 'AMBITION' }
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
        .select('id,chapter_number,title_en,title_ar,word_count,audio_url,illustrations')
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
