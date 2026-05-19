// LISTENING-AUDIO-PLAYER-DRIFT-PROTECTION 2026-05-19
// Admin-only chip that surfaces drift between the transcript on the page and
// the hash that was stored when the audio was generated. Visible only when
// an admin/trainer is impersonating a student (so trainers catch stale audio
// before students complain). Students never see it.

import { useEffect, useState } from 'react'
import { useAuthStore } from '../../../stores/authStore'
import { sourceTextHash } from '../../../lib/textHash'

export function DriftChip({ transcript, storedHash }) {
  const impersonation = useAuthStore((s) => s.impersonation)
  const realRole = useAuthStore((s) => s._realProfile?.role)
  const [drifted, setDrifted] = useState(false)

  useEffect(() => {
    let mounted = true
    if (!transcript || !storedHash) return
    sourceTextHash(transcript).then((current) => {
      if (mounted && current && current !== storedHash) setDrifted(true)
      else if (mounted) setDrifted(false)
    })
    return () => { mounted = false }
  }, [transcript, storedHash])

  // Only show when impersonating AND the real signed-in user is admin/trainer
  const isAdminOrTrainer = realRole === 'admin' || realRole === 'trainer'
  if (!impersonation || !isAdminOrTrainer) return null
  if (!drifted) return null

  return (
    <div
      dir="rtl"
      className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-['Tajawal']"
      style={{
        background: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        color: 'rgba(252, 165, 165, 0.95)',
      }}
      title="نص المحادثة تم تعديله بعد توليد الصوت. أعد التوليد عبر سكربت 03-generate-listening.mjs."
    >
      <span>⚠️</span>
      <span>صوت قديم (drifted)</span>
    </div>
  )
}
