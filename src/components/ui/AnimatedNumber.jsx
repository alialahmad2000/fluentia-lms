import { useEffect, useState } from 'react'
import { useSpring, useMotionValue, useTransform, motion } from 'framer-motion'

export default function AnimatedNumber({ value, duration = 0.8, className = '' }) {
  const motionValue = useMotionValue(0)
  const springValue = useSpring(motionValue, { duration: duration * 1000 })
  const display = useTransform(springValue, (v) => Math.round(v))
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    motionValue.set(value)
  }, [value, motionValue])

  useEffect(() => {
    const unsubscribe = display.on('change', (v) => setDisplayValue(v))
    return unsubscribe
  }, [display])

  return (
    <motion.span className={className}>
      {displayValue}
    </motion.span>
  )
}
