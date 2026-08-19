// Home entry point to «دفتر الميدان».
//
// Renders NOTHING unless the student is entitled AND actually has notes — a card
// that says "٠ للمراجعة" on an empty notebook is a dead tile, and this home has a
// standing rule against those. When nothing is due it shows what she has mastered
// instead, so the card always carries a real number.
import { Link } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'
import { useQuery } from '@tanstack/react-query'
import { NotebookPen } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { isNoteDue } from '../../pages/student/FieldNotes'
import './fieldNotesCard.css'

const AR = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
const toAr = (n) => String(n ?? 0).replace(/\d/g, (d) => AR[+d])

export default function FieldNotesHomeCard() {
  // profile.id, never user.id — under impersonation user.id is still the admin.
  const { profile, studentData } = useAuthStore(useShallow((s) => ({
    profile: s.profile, studentData: s.studentData,
  })))
  const entitled = studentData?.uses_field_notes === true

  const { data } = useQuery({
    queryKey: ['field-notes-due', profile?.id],
    enabled: !!profile?.id && entitled,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('field_notes')
        .select('id, status, next_review_at')
        .eq('student_id', profile.id)
        .eq('is_published', true)
      if (error) throw error
      return data || []
    },
  })

  // ── all hooks above every conditional return ──
  if (!entitled) return null
  const notes = data || []
  if (notes.length === 0) return null

  const due = notes.filter(isNoteDue).length
  const mastered = notes.filter((n) => n.status === 'mastered').length
  const showDue = due > 0

  return (
    <Link to="/student/field-notes" className="fnc-card">
      <span className="fnc-card__ico"><NotebookPen size={21} aria-hidden="true" /></span>
      <span className="fnc-card__t">
        <strong>دفتر الميدان</strong>
        <span>
          {showDue
            ? 'ملاحظات من شغلك تنتظر المراجعة'
            : 'ملاحظاتك من محادثاتك الحقيقية'}
        </span>
      </span>
      <span className="fnc-card__n" data-kind={showDue ? 'due' : 'mastered'}>
        <b>{toAr(showDue ? due : mastered)}</b>
        <i>{showDue ? 'للمراجعة' : 'أتقنتها'}</i>
      </span>
    </Link>
  )
}
