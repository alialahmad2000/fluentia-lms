import { motion, useReducedMotion } from 'framer-motion'
import { Children } from 'react'

const container = (stagger) => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger } },
})

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
}

export default function StaggeredList({ stagger = 0.06, children, className = '' }) {
  const reducedMotion = useReducedMotion()

  if (reducedMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      variants={container(stagger)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-30px' }}
    >
      {Children.map(children, (child) =>
        child ? (
          <motion.div variants={item}>{child}</motion.div>
        ) : null
      )}
    </motion.div>
  )
}
