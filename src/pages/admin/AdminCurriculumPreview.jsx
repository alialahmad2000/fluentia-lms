import { Outlet } from 'react-router-dom'
import { CurriculumPreviewContext } from '../../contexts/CurriculumPreviewContext'
import PreviewBanner from '../shared/PreviewBanner'

const PREVIEW_VALUE = {
  previewMode: true,
  canSeeAllLevels: true,
  basePath: '/admin/student-curriculum',
}

export default function AdminCurriculumPreview({ children }) {
  return (
    <CurriculumPreviewContext.Provider value={PREVIEW_VALUE}>
      <PreviewBanner />
      {children || <Outlet />}
    </CurriculumPreviewContext.Provider>
  )
}
