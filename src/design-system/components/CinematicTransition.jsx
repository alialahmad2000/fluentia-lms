import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useLocation, useOutlet } from 'react-router-dom'
import { cloneElement } from 'react'

export default function CinematicTransition() {
  const location = useLocation()
  const outlet = useOutlet()
  const reducedMotion = useReducedMotion()

  if (reducedMotion) {
    return outlet
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{
          duration: 0.42,
          ease: [0.22, 1, 0.36, 1],
          exit: { duration: 0.22 },
        }}
      >
        {outlet && cloneElement(outlet)}
      </motion.div>
    </AnimatePresence>
  )
}
