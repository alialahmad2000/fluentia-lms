import { createContext, useContext, useMemo } from 'react'
import { useIsImpersonating } from '../stores/authStore'

const DEFAULT_STATE = {
  previewMode: false,
  canSeeAllLevels: false,
  readOnly: false,
  basePath: '/student/curriculum',
}

export const CurriculumPreviewContext = createContext(DEFAULT_STATE)

export function useCurriculumPreview() {
  const ctx = useContext(CurriculumPreviewContext)
  const isImpersonating = useIsImpersonating()

  // Admin "view as student" is a client-side PROFILE swap — the Supabase session
  // still belongs to the admin. So any progress write while impersonating either
  // gets rejected by RLS (student_id = auth.uid()) or, worse, lands on the ADMIN's
  // own row instead of the student's. Browsing as a student is therefore always
  // read-only: every `if (readOnly) return` guard now covers impersonation too.
  return useMemo(
    () => (isImpersonating && !ctx.readOnly ? { ...ctx, readOnly: true } : ctx),
    [ctx, isImpersonating]
  )
}
