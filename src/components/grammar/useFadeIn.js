import { useRef, useEffect } from 'react'

export function useFadeIn() {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Check for reduced motion preference
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      el.classList.add('grammar-fade-in--visible')
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('grammar-fade-in--visible')
          observer.unobserve(el)
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return ref
}
