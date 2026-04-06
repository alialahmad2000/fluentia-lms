import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Trash2, Search, ChevronDown, ChevronUp } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { toast } from '../ui/FluentiaToast'

export default function SavedWordsPanel({ unitId, onClose }) {
  const { studentData } = useAuthStore()
  const studentId = studentData?.id
  const queryClient = useQueryClient()
  const [newWord, setNewWord] = useState('')
  const [newMeaning, setNewMeaning] = useState('')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  // Fetch all saved words
  const { data: words = [] } = useQuery({
    queryKey: ['saved-words', studentId],
    queryFn: async () => {
      const { data } = await supabase
        .from('student_saved_words')
        .select('*, unit:source_unit_id(unit_number, theme_ar)')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
      return data || []
    },
    enabled: !!studentId,
  })

  // Add word
  const addMutation = useMutation({
    mutationFn: async ({ word, meaning }) => {
      const { error } = await supabase.from('student_saved_words').insert({
        student_id: studentId,
        word,
        meaning,
        source_unit_id: unitId,
      })
      if (error) {
        if (error.code === '23505') throw new Error('duplicate')
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-words', studentId] })
      setNewWord('')
      setNewMeaning('')
      toast({ type: 'success', title: 'تم حفظ الكلمة' })
    },
    onError: (err) => {
      if (err.message === 'duplicate') {
        toast({ type: 'error', title: 'الكلمة محفوظة مسبقاً' })
      }
    },
  })

  // Delete word
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('student_saved_words').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-words', studentId] }),
  })

  const handleAdd = () => {
    if (!newWord.trim()) return
    addMutation.mutate({ word: newWord.trim(), meaning: newMeaning.trim() || null })
  }

  const filtered = search
    ? words.filter(w => w.word.toLowerCase().includes(search.toLowerCase()) || w.meaning?.includes(search))
    : words

  return (
    <>
      {/* Backdrop (mobile) */}
      <div className="fixed inset-0 z-[41] bg-black/30 lg:hidden" onClick={onClose} />

      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 400 }}
        className="fixed z-[42] lg:top-0 lg:right-0 lg:w-[340px] lg:h-full bottom-0 left-0 right-0 lg:left-auto lg:bottom-auto max-h-[60vh] lg:max-h-full rounded-t-2xl lg:rounded-none overflow-hidden"
        style={{
          background: 'var(--surface-raised)',
          borderInlineStart: '1px solid var(--border-subtle)',
          backdropFilter: 'blur(20px)',
        }}
        dir="rtl"
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center py-2 lg:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border-default)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h3 className="text-sm font-bold font-['Tajawal'] flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <span>📚</span> كلماتي
            <span className="text-[10px] font-normal" style={{ color: 'var(--text-muted)' }}>
              {words.length} كلمة
            </span>
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors">
            <X size={16} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        {/* Add new word */}
        <div className="px-4 py-3 space-y-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex gap-2">
            <input
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              placeholder="الكلمة بالإنجليزي..."
              dir="ltr"
              className="flex-1 rounded-lg px-3 py-2 text-sm font-['Inter'] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-sky-500/30"
              style={{ background: 'var(--surface-overlay)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <button
              onClick={handleAdd}
              disabled={!newWord.trim()}
              className="px-3 py-2 rounded-lg text-sm font-bold font-['Tajawal'] transition-colors disabled:opacity-30"
              style={{ background: 'rgba(56,189,248,0.15)', color: 'var(--accent-sky)' }}
            >
              أضف
            </button>
          </div>
          <input
            value={newMeaning}
            onChange={(e) => setNewMeaning(e.target.value)}
            placeholder="المعنى بالعربي (اختياري)..."
            className="w-full rounded-lg px-3 py-2 text-sm font-['Tajawal'] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-sky-500/30"
            style={{ background: 'var(--surface-overlay)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
        </div>

        {/* Search */}
        {words.length > 3 && (
          <div className="px-4 py-2">
            <div className="relative">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث..."
                className="w-full rounded-lg pr-9 pl-3 py-2 text-sm font-['Tajawal'] placeholder:text-[var(--text-muted)] focus:outline-none"
                style={{ background: 'var(--surface-overlay)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
              />
            </div>
          </div>
        )}

        {/* Words list */}
        <div className="overflow-y-auto px-4 py-3 space-y-2" style={{ maxHeight: 'calc(60vh - 220px)' }}>
          {filtered.length === 0 && (
            <p className="text-xs text-center py-6 font-['Tajawal']" style={{ color: 'var(--text-muted)' }}>
              {search ? 'لا توجد نتائج' : 'لم تحفظ كلمات بعد'}
            </p>
          )}
          {filtered.map((w) => (
            <div
              key={w.id}
              className="group rounded-xl px-3 py-2.5 transition-colors cursor-pointer"
              style={{ background: 'var(--surface-overlay)', border: '1px solid var(--border-subtle)' }}
              onClick={() => setExpandedId(expandedId === w.id ? null : w.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold font-['Inter'] text-white" dir="ltr">{w.word}</span>
                    {w.meaning && (
                      <span className="text-xs font-['Tajawal']" style={{ color: 'var(--text-secondary)' }}>— {w.meaning}</span>
                    )}
                  </div>
                  {w.unit && (
                    <p className="text-[10px] font-['Tajawal'] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      من الوحدة {w.unit.unit_number}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(w.id) }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded flex items-center justify-center hover:bg-red-500/10"
                  >
                    <Trash2 size={12} className="text-red-400" />
                  </button>
                  {w.context_sentence && (
                    expandedId === w.id ? <ChevronUp size={12} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={12} style={{ color: 'var(--text-muted)' }} />
                  )}
                </div>
              </div>
              {expandedId === w.id && w.context_sentence && (
                <p className="text-[11px] font-['Inter'] mt-2 pt-2 italic leading-relaxed" dir="ltr" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)' }}>
                  "{w.context_sentence}"
                </p>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </>
  )
}
