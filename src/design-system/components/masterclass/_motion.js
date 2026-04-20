export const MOTION = {
  reveal: {
    duration: 0.8,
    ease: [0.16, 1, 0.3, 1],
  },
  chapter: {
    duration: 0.5,
    progressDuration: 4000,
  },
  pulse: {
    duration: 3,
    scale: [1, 1.05, 1],
  },
  bandAnimate: {
    duration: 1.2,
    ease: [0.25, 0.1, 0.25, 1],
  },
  stagger: {
    delayChildren: 0.1,
    staggerChildren: 0.08,
  },
  fadeUp: {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
  },
}
