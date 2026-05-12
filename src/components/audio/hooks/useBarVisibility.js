import { useState, useEffect, useRef } from 'react'

const HIDE_OFFSET = 30     // px the bar slides down when hiding
const SCROLL_THRESHOLD = 100 // px scrolled down before hiding

export function useBarVisibility() {
  const [hidden, setHidden] = useState(false)
  const lastScrollY = useRef(0)
  const lastScrollDir = useRef('down')

  useEffect(() => {
    // Only activate on mobile
    const mq = window.matchMedia('(max-width: 767px)')
    if (!mq.matches) return

    const onScroll = () => {
      const y = window.scrollY
      const dir = y > lastScrollY.current ? 'down' : 'up'
      lastScrollDir.current = dir
      lastScrollY.current = y

      if (dir === 'down' && y > SCROLL_THRESHOLD) {
        setHidden(true)
      } else if (dir === 'up') {
        setHidden(false)
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return { hidden, HIDE_OFFSET }
}
