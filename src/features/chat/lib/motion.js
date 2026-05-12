// Shared Framer Motion transitions for premium chat UI.
// Use ONLY these three — no bespoke transitions anywhere in features/chat.

export const ease = [0.16, 1, 0.3, 1] // out-expo

export const fadeRise = {
  initial:    { opacity: 0, y: 8 },
  animate:    { opacity: 1, y: 0 },
  exit:       { opacity: 0, y: -4 },
  transition: { duration: 0.32, ease },
}

export const popIn = {
  initial:    { opacity: 0, scale: 0.94 },
  animate:    { opacity: 1, scale: 1 },
  exit:       { opacity: 0, scale: 0.96 },
  transition: { duration: 0.18, ease },
}

export const slideIn = {
  initial:    { opacity: 0, x: -8 },
  animate:    { opacity: 1, x: 0 },
  exit:       { opacity: 0, x: 8 },
  transition: { duration: 0.24, ease },
}
