// DeskCallInterface — the signature "answer a real work call" experience.
// A scenario roleplay is no longer "a chat with an AI": it RINGS like an incoming call,
// she taps to answer, the line connects, and a live-call HUD (caller presence + timer +
// signal meter) wraps the voice roleplay. The interlocutor is built from the module persona
// (e.g. the Bangalore offshore team). Everything below is presentation — the actual roleplay
// engine is the shared ConversationMode, mounted only once the line is "connected".
import { useEffect, useMemo, useRef, useState } from 'react'
import { Phone, PhoneOff, PhoneIncoming, PhoneCall, Loader2, MapPin } from 'lucide-react'
import ConversationMode from '@/components/curriculum/speaking/ConversationMode'

// Pull a human caller out of the persona instruction (rp.ai_role).
function callerFrom(rp = {}, fallbackName = 'Caller') {
  const role = rp.ai_role || ''
  const q = role.match(/['"“”‘’]([A-Z][a-zA-Z]+)['"“”‘’]/)
  const named = role.match(/\b(?:named|called)\s+([A-Z][a-zA-Z]+)/)
  const name = (q && q[1]) || (named && named[1]) || null
  let desc = ''
  if (role) {
    const tail = name ? role.split(new RegExp(`['"“”‘’]${name}['"“”‘’]`))[1] || '' : role
    desc = tail.replace(/^[\s,–-]+/, '').split(/[.!?]/)[0].trim()
    if (desc.length > 78) desc = desc.slice(0, 76).trim() + '…'
  }
  const loc = (role.match(/\bfrom ([A-Z][a-zA-Z]+)\b/) || [])[1] || null
  return { name: name || fallbackName, initial: (name || 'A')[0].toUpperCase(), desc, loc }
}

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

export default function DeskCallInterface({ module, moduleId, studentId, phrases = [], onComplete }) {
  const rp = module?.roleplay || {}
  const caller = useMemo(() => callerFrom(rp), [rp])
  const [phase, setPhase] = useState('incoming')      // incoming | connecting | connected | declined
  const [seconds, setSeconds] = useState(0)
  const [ended, setEnded] = useState(false)
  const timerRef = useRef(null)

  // live call timer
  useEffect(() => {
    if (phase !== 'connected' || ended) return
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(timerRef.current)
  }, [phase, ended])

  // connecting → connected after a short "acquiring line" beat
  useEffect(() => {
    if (phase !== 'connecting') return
    const t = setTimeout(() => setPhase('connected'), 1600)
    return () => clearTimeout(t)
  }, [phase])

  const answer = () => setPhase('connecting')
  const decline = () => setPhase('declined')
  const redial = () => { setEnded(false); setSeconds(0); setPhase('connecting') }

  const handleComplete = (payload) => {
    setEnded(true)
    onComplete?.(payload)
  }

  // ── INCOMING ───────────────────────────────────────────────────────────
  if (phase === 'incoming' || phase === 'declined') {
    const declined = phase === 'declined'
    return (
      <div className="desk-glass desk-call-panel p-8 text-center desk-rise" style={{ borderColor: 'rgba(239, 106, 67,0.24)' }}>
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="w-2 h-2 rounded-full desk-live-dot" style={{ background: declined ? '#94a3b8' : '#e2694e', boxShadow: declined ? 'none' : '0 0 10px 1px rgba(226,105,78,0.6)' }} />
          <span className="font-['Hanken_Grotesk'] font-bold text-[12px] tracking-[0.14em]" dir="ltr" style={{ color: declined ? 'rgba(42, 33, 64,0.42)' : 'var(--brass-hi)' }}>
            {declined ? 'Call ended' : 'Incoming call'}
          </span>
        </div>

        {/* avatar as a lit brass PRESENCE with a felt three-ring sonar */}
        <div className="desk-call-avatar-wrap">
          {!declined && <>
            <span className="desk-call-ring" />
            <span className="desk-call-ring" style={{ animationDelay: '0.6s' }} />
            <span className="desk-call-ring" style={{ animationDelay: '1.2s' }} />
          </>}
          <div className="desk-call-avatar" style={declined ? { filter: 'grayscale(0.7) brightness(0.8)' } : undefined}>
            <span className="font-['Hanken_Grotesk'] font-black text-[34px]" dir="ltr">{caller.initial}</span>
          </div>
        </div>

        <h3 className="font-['Hanken_Grotesk'] font-extrabold text-[28px] tracking-tight mt-6 mb-1 leading-none" dir="ltr" style={{ color: 'var(--cream)' }}>{caller.name}</h3>
        {caller.desc && <p className="font-['Hanken_Grotesk'] text-[12px] leading-relaxed max-w-xs mx-auto" dir="ltr" style={{ color: 'rgba(239, 106, 67,0.75)' }}>{caller.desc}</p>}
        {caller.loc && (
          <span className="inline-flex items-center gap-1 mt-3 px-2.5 py-1 rounded-full font-['Hanken_Grotesk'] text-[12px]" dir="ltr" style={{ color: 'rgba(42, 33, 64,0.55)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(239, 106, 67,0.14)' }}>
            <MapPin size={12} /> {caller.loc} · support
          </span>
        )}

        {!declined ? (
          <>
            <div className="flex items-center justify-center gap-1 mt-5 desk-call-dots" aria-hidden><span/><span/><span/></div>
            <div className="flex items-center justify-center gap-10 mt-7">
              <div className="flex flex-col items-center gap-2">
                <button onClick={decline} className="desk-call-btn desk-call-decline" aria-label="Decline call"><PhoneOff size={22} /></button>
                <span className="font-['Hanken_Grotesk'] text-[12px]" dir="ltr" style={{ color: 'rgba(42, 33, 64,0.45)' }}>Later</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <button onClick={answer} className="desk-call-btn desk-call-answer desk-call-answer-breathe" aria-label="Answer call"><Phone size={24} /></button>
                <span className="font-['Hanken_Grotesk'] text-[12px] font-bold" dir="ltr" style={{ color: '#6ee7b7' }}>Answer</span>
              </div>
            </div>
            <p className="font-['Hanken_Grotesk'] text-[12px] leading-relaxed max-w-sm mx-auto mt-7" dir="ltr" style={{ color: 'rgba(42, 33, 64,0.5)' }}>
              Speak with confidence. You can ask for clarification or a repeat anytime — just like a real work call.
            </p>
          </>
        ) : (
          <button onClick={redial} className="desk-cta inline-flex items-center gap-2 px-6 h-12 rounded-2xl font-['Hanken_Grotesk'] font-bold text-[14px] mt-7">
            <PhoneCall size={17} /> Call again
          </button>
        )}
      </div>
    )
  }

  // ── CONNECTING ─────────────────────────────────────────────────────────
  if (phase === 'connecting') {
    return (
      <div className="desk-glass desk-call-panel p-10 text-center desk-rise">
        <div className="desk-call-avatar-wrap">
          <span className="desk-call-ring desk-call-ring-in" />
          <div className="desk-call-avatar">
            <Loader2 size={30} className="animate-spin" style={{ color: '#fff3ee' }} />
          </div>
        </div>
        <h3 className="font-['Hanken_Grotesk'] font-bold text-[18px] mt-6" dir="ltr" style={{ color: 'var(--cream)' }}>Connecting…</h3>
        <p className="font-['Hanken_Grotesk'] text-[12px] mt-1" dir="ltr" style={{ color: 'rgba(239, 106, 67,0.7)' }}>connecting to {caller.name}</p>
        <div className="desk-signal mx-auto mt-5" aria-hidden><span/><span/><span/><span/><span/></div>
      </div>
    )
  }

  // ── CONNECTED ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* live-call HUD header */}
      <div className="desk-glass desk-call-hud flex items-center gap-3 px-4 py-3" style={{ borderColor: ended ? 'rgba(148,163,184,0.2)' : 'rgba(110,231,183,0.28)' }}>
        <div className="desk-call-hud-avatar" style={ended ? { filter: 'grayscale(0.6)' } : undefined}>
          <span className="font-['Hanken_Grotesk'] font-black text-[15px]" dir="ltr">{caller.initial}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-['Hanken_Grotesk'] font-bold text-[14px] truncate" dir="ltr" style={{ color: 'var(--cream)' }}>{caller.name}</p>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: ended ? '#94a3b8' : '#6ee7b7', boxShadow: ended ? 'none' : '0 0 6px 1px rgba(110,231,183,0.7)' }} />
            <span className="font-['Hanken_Grotesk'] font-bold text-[12px]" dir="ltr" style={{ color: ended ? 'rgba(42, 33, 64,0.5)' : '#6ee7b7' }}>{ended ? 'Call ended' : 'Connected'}</span>
          </div>
        </div>
        {!ended && <div className="desk-signal desk-signal-sm desk-signal-steady" aria-hidden><span/><span/><span/><span/></div>}
        <span className="desk-mono text-[13px] tabular-nums px-2.5 py-1 rounded-lg" dir="ltr" style={{ color: ended ? 'rgba(42, 33, 64,0.5)' : 'var(--coral-deep,#cf4a1c)', background: 'rgba(58,42,84,0.07)' }}>{fmt(seconds)}</span>
      </div>

      {/* the live roleplay — auto-starts so answering feels seamless */}
      <ConversationMode
        moduleId={moduleId}
        autoStart
        studentId={studentId}
        topic={{ title_en: rp?.title_en || module?.title_en, useful_phrases: rp?.useful_phrases || phrases.map((p) => p.en).filter(Boolean) }}
        onComplete={handleComplete}
      />
    </div>
  )
}
