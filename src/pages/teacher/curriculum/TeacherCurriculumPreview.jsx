import { Outlet } from 'react-router-dom'
import { CurriculumPreviewContext } from '@/contexts/CurriculumPreviewContext'
import PreviewBanner from '@/pages/shared/PreviewBanner'

/**
 * Mounts the live STUDENT curriculum renderer for the teacher in a read-only,
 * all-levels-unlocked preview — the "see the curriculum exactly as the student
 * sees it" requirement. readOnly is honored by the skill tabs' submit guards.
 */
const PREVIEW_VALUE = {
  previewMode: true,
  canSeeAllLevels: true,
  readOnly: true,
  basePath: '/trainer/curriculum',
}

export default function TeacherCurriculumPreview({ children }) {
  return (
    <CurriculumPreviewContext.Provider value={PREVIEW_VALUE}>
      <PreviewBanner />
      {children || <Outlet />}
    </CurriculumPreviewContext.Provider>
  )
}
