import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Fetches the student's letter for *today* (Riyadh). The letter row is fully
// self-contained: salutation, signature, gender and body are all stored, so the
// view never has to re-derive grammar. RLS limits the read to the student's own
// rows. Returns null gracefully (no letter yet → optimistic placeholder shows).

function riyadhToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Riyadh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export function useDailyLetter(studentId) {
  const date = riyadhToday()
  const query = useQuery({
    queryKey: ['daily-letter', studentId, date],
    enabled: !!studentId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_letters')
        .select('body_ar, salutation, signature, gender, source, letter_date')
        .eq('student_id', studentId)
        .eq('letter_date', date)
        .maybeSingle()
      if (error) return null
      return data || null
    },
  })
  return { letter: query.data ?? null, isLoading: query.isLoading }
}
