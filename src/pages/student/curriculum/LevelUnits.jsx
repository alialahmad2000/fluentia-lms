import { useSearchParams } from 'react-router-dom'
import { lazy, Suspense } from 'react'

const LevelUnitsOriginal = lazy(() => import('./LevelUnitsOriginal'))
const LevelUnitsV1 = lazy(() => import('./variants/LevelUnitsV1'))
const LevelUnitsV2 = lazy(() => import('./variants/LevelUnitsV2'))
const LevelUnitsV3 = lazy(() => import('./variants/LevelUnitsV3'))

export default function LevelUnits() {
  const [params] = useSearchParams()
  const design = params.get('design')

  let Component = LevelUnitsOriginal
  if (design === 'v1') Component = LevelUnitsV1
  else if (design === 'v2') Component = LevelUnitsV2
  else if (design === 'v3') Component = LevelUnitsV3

  return (
    <Suspense fallback={<div style={{ minHeight: '60vh' }} />}>
      <Component />
    </Suspense>
  )
}
