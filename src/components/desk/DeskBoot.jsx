// DeskBoot — a brief "systems online" reveal the FIRST time she enters the Desk each session.
// A tool she opens before a real call shouldn't cost her a ceremony every time, so it plays
// once per session (sessionStorage), is tap-to-skip, ~1.4s, and is skipped entirely under
// reduced-motion. Rendered inside DeskShell (over the room), fades out to hand off to the cockpit.
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'

const KEY = 'desk_booted_v1'
const STATUS = ['Booting systems…', 'Connecting to the room…', 'Ready']

export default function DeskBoot() {
  const profileId = useAuthStore((s) => s.profile?.id)
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
  const [show, setShow] = useState(() => {
    if (reduce) return false
    try { return !sessionStorage.getItem(KEY) } catch { return false }
  })
  const [leaving, setLeaving] = useState(false)
  const [statusIdx, setStatusIdx] = useState(0)

  useEffect(() => {
    if (!show) return
    try { sessionStorage.setItem(KEY, '1') } catch { /* private mode — plays once here, fine */ }
    const s1 = setTimeout(() => setStatusIdx(1), 460)
    const s2 = setTimeout(() => setStatusIdx(2), 980)
    const t1 = setTimeout(() => setLeaving(true), 1400)
    const t2 = setTimeout(() => setShow(false), 1780)
    return () => { [s1, s2, t1, t2].forEach(clearTimeout) }
  }, [show])

  const skip = () => { setLeaving(true); setTimeout(() => setShow(false), 260) }
  if (!show) return null

  return (
    <div className={`desk-boot ${leaving ? 'is-leaving' : ''}`} onClick={skip} role="presentation" aria-hidden="true">
      <div className="desk-boot-inner">
        <div className="desk-brand-mark desk-boot-mark"><img src="/brand/fluentia-mark.svg" alt="" /></div>
        <p className="desk-boot-title" dir="ltr">Fluentia · Pro Desk</p>
        <div className="desk-boot-track"><span className="desk-boot-fill" /></div>
        <p className="desk-boot-status" dir="ltr" style={statusIdx === 2 ? { color: '#6ee7b7' } : undefined}>{STATUS[statusIdx]}</p>
      </div>
    </div>
  )
}
