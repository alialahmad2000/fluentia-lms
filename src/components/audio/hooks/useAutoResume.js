import { useState, useEffect, useRef } from 'react'

const lsKey = (studentId, contentId) => `fluentia:player:resume:${studentId}:${contentId}`
const MAX_AGE_MS = 24 * 60 * 60 * 1000

export function useAutoResume({ enabled, studentId, contentId, currentTime, isPlaying, seek, duration }) {
  const [resumePrompt, setResumePrompt] = useState(null) // {positionMs, label}
  const [prompted, setPrompted] = useState(false)
  const saveInterval = useRef(null)

  // On mount: check for saved position
  useEffect(() => {
    if (!enabled || !studentId || !contentId) return
    let isMounted = true
    try {
      const raw = localStorage.getItem(lsKey(studentId, contentId))
      if (!raw) return
      const saved = JSON.parse(raw)
      if (Date.now() - saved.saved_at > MAX_AGE_MS) {
        localStorage.removeItem(lsKey(studentId, contentId))
        return
      }
      if (isMounted && saved.position_ms > 5000) {
        setResumePrompt({ positionMs: saved.position_ms })
      }
    } catch {}
    return () => { isMounted = false }
  }, [enabled, studentId, contentId]) // eslint-disable-line

  // Save position every 5s while playing
  useEffect(() => {
    if (!enabled || !studentId || !contentId) return
    if (isPlaying) {
      saveInterval.current = setInterval(() => {
        try {
          localStorage.setItem(lsKey(studentId, contentId), JSON.stringify({
            position_ms: currentTime,
            saved_at: Date.now(),
          }))
        } catch {}
      }, 5000)
    } else {
      clearInterval(saveInterval.current)
    }
    return () => clearInterval(saveInterval.current)
  }, [isPlaying, enabled, studentId, contentId, currentTime])

  const acceptResume = () => {
    if (resumePrompt) seek(resumePrompt.positionMs)
    setResumePrompt(null)
    setPrompted(true)
  }
  const dismissResume = () => {
    setResumePrompt(null)
    setPrompted(true)
  }

  const clearResume = () => {
    try { localStorage.removeItem(lsKey(studentId, contentId)) } catch {}
  }

  return { resumePrompt, acceptResume, dismissResume, clearResume }
}
