import { useEffect, useState } from 'react'

/**
 * Detects current pointer type at runtime.
 * Returns 'mouse' | 'touch' | 'pen' | 'unknown'
 * Updates on first pointer event — handles hybrid devices (iPad + trackpad).
 */
export function usePointerType() {
  const [type, setType] = useState(() => {
    if (typeof window === 'undefined') return 'unknown'
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) return 'mouse'
    if (window.matchMedia('(hover: none) and (pointer: coarse)').matches) return 'touch'
    return 'unknown'
  })

  useEffect(() => {
    const onPointer = (e) => {
      if (e.pointerType === 'mouse' || e.pointerType === 'touch' || e.pointerType === 'pen') {
        setType(e.pointerType)
      }
    }
    window.addEventListener('pointerdown', onPointer, { passive: true })
    window.addEventListener('pointermove', onPointer, { passive: true })
    return () => {
      window.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('pointermove', onPointer)
    }
  }, [])

  return type
}
