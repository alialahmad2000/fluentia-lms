import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { MOTION } from './_motion'

const ARABIC_RE = /[\u0600-\u06FF]/

function isArabic(str) {
  return ARABIC_RE.test(str)
}

export default function NarrativeReveal({
  lines = [],
  delayBetweenLines = 1500,
  onComplete,
  pauseAfterLast = 1500,
  showBreathBreaks = true,
  className = '',
}) {
  const reducedMotion = useReducedMotion()
  const [visibleCount, setVisibleCount] = useState(reducedMotion ? lines.filter(l => l !== '').length : 0)
  const [done, setDone] = useState(false)
  const timers = useRef([])

  useEffect(() => {
    if (reducedMotion) {
      setVisibleCount(lines.filter(l => l !== '').length)
      const t = setTimeout(() => { setDone(true); onComplete?.() }, pauseAfterLast)
      timers.current.push(t)
      return
    }

    let elapsed = 0
    let contentIdx = 0

    lines.forEach((line) => {
      if (line === '') {
        elapsed += showBreathBreaks ? 3000 : 0
        return
      }
      elapsed += delayBetweenLines
      const idx = ++contentIdx
      const t = setTimeout(() => setVisibleCount(idx), elapsed)
      timers.current.push(t)
    })

    const totalContent = lines.filter(l => l !== '').length
    const t = setTimeout(() => {
      setDone(true)
      onComplete?.()
    }, elapsed + pauseAfterLast)
    timers.current.push(t)
    void totalContent

    return () => timers.current.forEach(clearTimeout)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const contentLines = lines.filter(l => l !== '')

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-5)',
        maxWidth: 600,
        margin: '0 auto',
        padding: 'var(--space-6)',
        minHeight: 200,
      }}
    >
      <AnimatePresence>
        {contentLines.slice(0, visibleCount).map((line, i) => {
          const arabic = isArabic(line)
          return (
            <motion.p
              key={i}
              initial={reducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={MOTION.reveal}
              style={{
                margin: 0,
                fontSize: 20,
                lineHeight: 1.7,
                textAlign: 'center',
                color: 'var(--ds-reveal-text)',
                fontFamily: arabic
                  ? "'Tajawal', sans-serif"
                  : "'Playfair Display', Georgia, serif",
                fontStyle: arabic ? 'normal' : 'italic',
                fontWeight: arabic ? 500 : 400,
                direction: arabic ? 'rtl' : 'ltr',
              }}
            >
              {line}
            </motion.p>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
