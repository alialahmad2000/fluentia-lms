import { createContext, useContext } from 'react'

const DEFAULT_STATE = {
  previewMode: false,
  canSeeAllLevels: false,
  basePath: '/student/curriculum',
}

export const CurriculumPreviewContext = createContext(DEFAULT_STATE)

export function useCurriculumPreview() {
  return useContext(CurriculumPreviewContext)
}
