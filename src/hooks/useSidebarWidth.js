import { useEffect, useState } from 'react'

export function useSidebarWidth() {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const sidebar = document.querySelector('[data-sidebar-root]')
    if (!sidebar) return

    const update = () => setWidth(sidebar.getBoundingClientRect().width)
    update()

    const ro = new ResizeObserver(update)
    ro.observe(sidebar)

    window.addEventListener('resize', update)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [])

  return width
}
