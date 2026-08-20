// ═══════════════════════════════════════════════════════════════════════════
// «المحادثة كاملة» — replay the entire exchange with Layla, both voices.
//
// The studio already kept everything needed; nothing was surfacing it. Per turn
// `speaking_conversation_turns` stores the text AND the audio:
//   · student turns → a PATH in the private `voice-notes` bucket (needs signing)
//   · Layla's turns → a full PUBLIC URL in `curriculum-audio/conversation-tts`
// So this is a read-only view: no migration, no edge function, no re-recording.
//
// Works for the conversation she just finished AND for every earlier one on the
// same task (picker appears from the second conversation onward).
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, ChevronDown, MessagesSquare, VolumeX } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useG } from '../../../i18n/gender'

const fmtClock = (s) => {
  if (!s && s !== 0) return ''
  const m = Math.floor(s / 60)
  return `${m}:${String(Math.round(s % 60)).padStart(2, '0')}`
}

const dateAr = (iso) =>
  new Date(iso).toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' })

// Shared so the outcome band can know a conversation exists even when the
// summary recording row is missing (a failed grade must not hide her work).
// Same query key in both places → React Query makes ONE request.
export function useSpeakingConversations(studentId, unitId, questionIndex = 0) {
  return useQuery({
    queryKey: ['speaking-convos', unitId, questionIndex, studentId],
    enabled: !!studentId && !!unitId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('speaking_conversations')
        .select('id, created_at, completed_at, turn_count, score, total_speaking_seconds, status')
        .eq('student_id', studentId)
        .eq('unit_id', unitId)
        .eq('question_index', questionIndex)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      if (error) { console.error('[ConversationPlayback] convos', error); return [] }
      // a conversation with no turns is an abandoned start — not worth showing
      return (data || []).filter((c) => (c.turn_count ?? 0) > 0 || c.status === 'completed')
    },
  })
}

export default function ConversationPlayback({ studentId, unitId, questionIndex = 0 }) {
  const g = useG()
  const [selectedId, setSelectedId] = useState(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [playingIdx, setPlayingIdx] = useState(-1)   // index into playable turns
  const [playAll, setPlayAll] = useState(false)
  const audioRef = useRef(null)
  const seqRef = useRef({ list: [], i: 0, all: false })

  // ── the conversations she has had on THIS task ──
  const { data: conversations } = useSpeakingConversations(studentId, unitId, questionIndex)

  const activeId = selectedId || conversations?.[0]?.id || null
  const active = conversations?.find((c) => c.id === activeId) || null

  // ── the turns of the selected conversation, with playable URLs ──
  const { data: turns, isLoading: turnsLoading } = useQuery({
    queryKey: ['speaking-convo-turns', activeId],
    enabled: !!activeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('speaking_conversation_turns')
        .select('id, role, content, audio_path, audio_duration_seconds, turn_index')
        .eq('conversation_id', activeId)
        .order('turn_index', { ascending: true })
      if (error) { console.error('[ConversationPlayback] turns', error); return [] }

      return Promise.all((data || []).map(async (t) => {
        if (!t.audio_path) return { ...t, url: null }
        // Layla's lines are already public URLs; the student's are private paths.
        if (/^https?:\/\//i.test(t.audio_path)) return { ...t, url: t.audio_path }
        const { data: signed } = await supabase.storage
          .from('voice-notes')
          .createSignedUrl(t.audio_path, 60 * 60 * 6)
        return { ...t, url: signed?.signedUrl || null }
      }))
    },
  })

  const playable = useMemo(() => (turns || []).filter((t) => t.url), [turns])

  // one DOM-attached <audio> for the whole panel — a detached `new Audio()` is
  // garbage-collected mid-playback on iPad (the 2026-06 audio bug).
  const stop = useCallback(() => {
    try { audioRef.current?.pause() } catch {}
    seqRef.current.all = false
    setPlayAll(false)
    setPlayingIdx(-1)
  }, [])

  const playFrom = useCallback((startIdx, all) => {
    const a = audioRef.current
    if (!a || !playable.length) return
    seqRef.current = { list: playable, i: startIdx, all }
    setPlayAll(all)
    setPlayingIdx(startIdx)
    a.src = playable[startIdx].url
    a.play().catch(() => stop())
  }, [playable, stop])

  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    const onEnded = () => {
      const s = seqRef.current
      if (!s.all) { setPlayingIdx(-1); return }
      const next = s.i + 1
      if (next >= s.list.length) { setPlayingIdx(-1); setPlayAll(false); s.all = false; return }
      s.i = next
      setPlayingIdx(next)
      a.src = s.list[next].url
      a.play().catch(() => stop())
    }
    a.addEventListener('ended', onEnded)
    return () => a.removeEventListener('ended', onEnded)
  }, [stop])

  // switching conversation must never leave audio running
  useEffect(() => { stop() }, [activeId, stop])
  useEffect(() => () => { try { audioRef.current?.pause() } catch {} }, [])

  if (!conversations?.length) return null

  const totalSecs = (turns || []).reduce((n, t) => n + (t.audio_duration_seconds || 0), 0)
  const missingAudio = (turns || []).length - playable.length

  return (
    <div className="spk-panel mb-3">
      <audio ref={audioRef} preload="none" playsInline />

      {/* header */}
      <div className="px-4 pt-3.5 pb-2 flex items-center gap-2 flex-wrap">
        <MessagesSquare size={14} style={{ color: '#7ee3f5' }} />
        <span className="text-[13px] font-bold font-['Tajawal']" style={{ color: 'rgba(238,245,255,0.85)' }}>
          {g('محادثتك كاملة مع ليلى', 'محادثتكِ كاملة مع ليلى')}
        </span>
        {active?.created_at && (
          <span className="text-[11px] font-['Tajawal']" style={{ color: 'rgba(238,245,255,0.36)' }}>
            {dateAr(active.created_at)}
          </span>
        )}
        {totalSecs > 0 && (
          <span className="text-[11px] tabular-nums mr-auto" style={{ color: 'rgba(238,245,255,0.36)', fontFamily: "'Inter Tight', Inter, system-ui, sans-serif" }}>
            {fmtClock(totalSecs)}
          </span>
        )}
      </div>

      {/* pick an earlier conversation on this same task */}
      {conversations.length > 1 && (
        <div className="px-4 pb-1">
          <button className="spk-chip" onClick={() => setPickerOpen((v) => !v)} type="button">
            <ChevronDown size={12} style={{ transform: pickerOpen ? 'rotate(180deg)' : 'none', transition: 'transform 200ms ease' }} />
            {g('محادثات سابقة', 'محادثات سابقة')} ({conversations.length})
          </button>
          <AnimatePresence>
            {pickerOpen && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                <div className="pt-2 space-y-1.5">
                  {conversations.map((c, i) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => { setSelectedId(c.id); setPickerOpen(false) }}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-[12px] font-['Tajawal']"
                      style={{
                        background: c.id === activeId ? 'rgba(245,200,66,0.10)' : 'rgba(255,255,255,0.025)',
                        border: `1px solid ${c.id === activeId ? 'rgba(245,200,66,0.3)' : 'rgba(255,255,255,0.05)'}`,
                        color: 'rgba(238,245,255,0.75)',
                      }}
                    >
                      <span>{i === 0 ? g('الأحدث', 'الأحدث') : dateAr(c.created_at)}</span>
                      <span className="flex items-center gap-2">
                        {c.turn_count ? <span style={{ color: 'rgba(238,245,255,0.4)' }}>{c.turn_count} تبادلات</span> : null}
                        {c.score != null && (
                          <span className="font-bold tabular-nums" style={{ color: c.score >= 8 ? '#34d399' : c.score >= 6 ? '#7ee3f5' : '#f6cf6a' }}>
                            {c.score}/10
                          </span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* play the whole thing, in order, both voices */}
      {playable.length > 0 && (
        <div className="px-4 pt-2 pb-1">
          <button
            type="button"
            onClick={() => (playAll ? stop() : playFrom(0, true))}
            className="flex items-center gap-2 px-4 h-11 rounded-xl text-[12.5px] font-bold font-['Tajawal'] transition-transform hover:-translate-y-0.5"
            style={{
              background: playAll ? 'rgba(251,113,133,0.14)' : 'linear-gradient(100deg,#f7cf55 0%,#ffe9b0 26%,#9fe9ff 56%,#25c9f2 100%)',
              color: playAll ? '#fda4af' : '#0b0f17',
              border: playAll ? '1px solid rgba(251,113,133,0.35)' : 'none',
            }}
          >
            {playAll ? <><Pause size={15} /> {g('إيقاف', 'إيقاف')}</> : <><Play size={15} /> {g('شغّل المحادثة كاملة', 'شغّلي المحادثة كاملة')}</>}
          </button>
        </div>
      )}

      {/* the exchange itself */}
      <div className="px-4 pb-4 pt-2 space-y-2.5">
        {turnsLoading && <p className="text-[12px] font-['Tajawal']" style={{ color: 'rgba(238,245,255,0.4)' }}>…جاري التحميل</p>}

        {(turns || []).map((t) => {
          const idx = playable.findIndex((p) => p.id === t.id)
          const isNow = idx >= 0 && idx === playingIdx
          const isAi = t.role === 'ai'
          return (
            <div
              key={t.id}
              className={`flex ${isAi ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className="px-3.5 py-2.5"
                style={{
                  maxWidth: 'min(84%, 46ch)',
                  borderRadius: isAi ? '16px 16px 6px 16px' : '16px 16px 16px 6px',
                  background: isAi
                    ? 'linear-gradient(135deg,rgba(255,255,255,0.075),rgba(0,212,255,0.06))'
                    : 'linear-gradient(135deg,rgba(0,212,255,0.20),rgba(10,126,166,0.26))',
                  border: `1px solid ${isNow ? 'rgba(245,200,66,0.55)' : isAi ? 'rgba(255,255,255,0.12)' : 'rgba(0,212,255,0.30)'}`,
                  boxShadow: isNow ? '0 0 0 1px rgba(245,200,66,0.25), 0 8px 26px -14px rgba(245,200,66,0.55)' : 'none',
                  transition: 'border-color 200ms ease, box-shadow 200ms ease',
                }}
              >
                <p className="text-[10px] font-bold font-['Tajawal'] mb-1" style={{ color: isAi ? '#7ee3f5' : '#f5c842' }}>
                  {isAi ? 'ليلى' : g('أنت', 'أنتِ')}
                </p>
                <p dir="ltr" className="text-[13.5px] leading-relaxed text-left whitespace-pre-line"
                   style={{ fontFamily: "'Inter Tight', Inter, system-ui, sans-serif", color: isAi ? 'rgba(248,250,252,0.9)' : '#fff' }}>
                  {t.content}
                </p>

                {t.url ? (
                  <button
                    type="button"
                    onClick={() => (isNow ? stop() : playFrom(idx, false))}
                    className="mt-2 flex items-center gap-1.5 text-[10.5px] font-bold font-['Tajawal']"
                    style={{ color: isNow ? '#f5c842' : 'rgba(125,211,252,0.8)' }}
                  >
                    {isNow ? <Pause size={12} /> : <Play size={12} />}
                    {isNow ? g('يشتغل الآن', 'يشتغل الآن') : g('استمع', 'استمعي')}
                    {t.audio_duration_seconds ? (
                      <span className="tabular-nums" style={{ fontFamily: "'Inter Tight', Inter, system-ui, sans-serif", opacity: 0.7 }}>
                        {fmtClock(t.audio_duration_seconds)}
                      </span>
                    ) : null}
                  </button>
                ) : (
                  <span className="mt-2 flex items-center gap-1.5 text-[10.5px] font-['Tajawal']" style={{ color: 'rgba(238,245,255,0.3)' }}>
                    <VolumeX size={12} /> النص فقط
                  </span>
                )}
              </div>
            </div>
          )
        })}

        {missingAudio > 0 && (
          <p className="text-[11px] font-['Tajawal'] pt-1" style={{ color: 'rgba(238,245,255,0.32)' }}>
            بعض ردود ليلى محفوظة نصاً بدون صوت — تظهر مكتوبة.
          </p>
        )}
      </div>
    </div>
  )
}
