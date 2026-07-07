// «يومي» daily engine — the habit driver. Per-student localStorage:
//   • vocab spaced-repetition (Leitner-lite boxes → due dates)
//   • grammar «قاعدة اليوم» rotation + awareness state
//   • a daily streak (return-driver)
// Creditless, offline. Swappable to a server table later (read/write here only).
import { useSyncExternalStore, useCallback, useMemo } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { DESK_VOCAB } from '@/data/desk/vocab'
import { DESK_GRAMMAR } from '@/data/desk/grammar'

const KEY = (id) => `desk_daily_v1_${id || 'anon'}`
const DAY = 86400000
const NEW_PER_DAY = 5
const DAILY_CAP = 15
const INTERVALS = { 1: 1, 2: 3, 3: 7, 4: 16, 5: 45 } // days a word waits after reaching each box

const cache = new Map()
const listeners = new Set()
const subscribe = (cb) => { listeners.add(cb); return () => listeners.delete(cb) }

function blank() { return { vocab: {}, grammar: {}, streak: { count: 0, lastDate: null }, daily: {}, introducedToday: {} } }
function load(id) {
  if (cache.has(id)) return cache.get(id)
  let s = blank()
  try { const raw = localStorage.getItem(KEY(id)); if (raw) s = { ...blank(), ...JSON.parse(raw) } } catch { /* start fresh */ }
  cache.set(id, s); return s
}
function persist(id, s) {
  cache.set(id, { ...s })
  try { localStorage.setItem(KEY(id), JSON.stringify(s)) } catch { /* in-memory holds */ }
  listeners.forEach((fn) => fn())
}

const dstr = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

export function useDailyProgress() {
  const studentId = useAuthStore((s) => s.profile?.id) || 'anon'
  const state = useSyncExternalStore(subscribe, () => load(studentId), () => load(studentId))

  // ── SRS session ──────────────────────────────────────────────────────────
  const buildSession = useCallback(() => {
    const now = Date.now(); const s = load(studentId); const today = dstr(now)
    const due = DESK_VOCAB.filter((w) => s.vocab[w.id]?.seen && (s.vocab[w.id].due || 0) <= now)
      .sort((a, b) => (s.vocab[a.id].due || 0) - (s.vocab[b.id].due || 0))
    const introduced = s.introducedToday?.date === today ? (s.introducedToday.count || 0) : 0
    const newAllowed = Math.max(0, NEW_PER_DAY - introduced)
    const fresh = DESK_VOCAB.filter((w) => !s.vocab[w.id]?.seen).slice(0, newAllowed)
    return [...due, ...fresh].slice(0, DAILY_CAP).map((w) => w.id)
  }, [studentId])

  const rateWord = useCallback((wordId, knew) => {
    const now = Date.now(); const s = { ...load(studentId) }
    s.vocab = { ...s.vocab }; s.introducedToday = { ...s.introducedToday }
    const cur = s.vocab[wordId] || { box: 0, due: 0, seen: false }
    const wasNew = !cur.seen
    const box = knew ? Math.min((cur.box || 0) + 1, 5) : 1
    s.vocab[wordId] = { box, due: now + (INTERVALS[box] || 1) * DAY, seen: true }
    const today = dstr(now)
    if (wasNew) s.introducedToday = s.introducedToday?.date === today ? { date: today, count: (s.introducedToday.count || 0) + 1 } : { date: today, count: 1 }
    persist(studentId, s)
  }, [studentId])

  // called when a daily vocab session is finished → streak + daily flag
  const completeVocabDay = useCallback(() => {
    const now = Date.now(); const today = dstr(now); const s = { ...load(studentId) }
    if (s.daily?.date === today && s.daily.vocabDone) return
    const prev = s.streak || { count: 0, lastDate: null }
    let count
    if (prev.lastDate === today) count = prev.count
    else if (prev.lastDate === dstr(now - DAY)) count = (prev.count || 0) + 1
    else count = 1
    s.streak = { count, lastDate: today }
    s.daily = { ...(s.daily?.date === today ? s.daily : {}), date: today, vocabDone: true }
    persist(studentId, s)
  }, [studentId])

  // ── grammar «قاعدة اليوم» ──────────────────────────────────────────────────
  const grammarToday = useMemo(() => {
    if (!DESK_GRAMMAR.length) return null
    const idx = Math.floor(Date.now() / DAY) % DESK_GRAMMAR.length
    return DESK_GRAMMAR[idx]
  }, [])
  const markGrammarDone = useCallback((pointId) => {
    const now = Date.now(); const today = dstr(now); const s = { ...load(studentId) }
    s.grammar = { ...s.grammar, [pointId]: { done: true, at: now } }
    if (grammarToday?.id === pointId) s.daily = { ...(s.daily?.date === today ? s.daily : {}), date: today, grammarDone: true }
    persist(studentId, s)
  }, [studentId, grammarToday])
  const isGrammarDone = useCallback((pointId) => !!state.grammar?.[pointId]?.done, [state])

  // ── derived ────────────────────────────────────────────────────────────────
  const derived = useMemo(() => {
    const now = Date.now(); const today = dstr(now)
    const dueCount = DESK_VOCAB.filter((w) => state.vocab[w.id]?.seen && (state.vocab[w.id].due || 0) <= now).length
    const introduced = state.introducedToday?.date === today ? (state.introducedToday.count || 0) : 0
    const newLeft = Math.max(0, NEW_PER_DAY - introduced)
    const newAvail = Math.min(newLeft, DESK_VOCAB.filter((w) => !state.vocab[w.id]?.seen).length)
    const todayCount = Math.min(dueCount + newAvail, DAILY_CAP)
    const learning = DESK_VOCAB.filter((w) => state.vocab[w.id]?.seen && (state.vocab[w.id].box || 0) < 4).length
    const mastered = DESK_VOCAB.filter((w) => (state.vocab[w.id]?.box || 0) >= 4).length
    const streakAlive = state.streak?.lastDate === today || state.streak?.lastDate === dstr(now - DAY)
    const grammarMastered = Object.values(state.grammar || {}).filter((g) => g.done).length
    return {
      todayCount, dueCount, newAvail,
      vocab: { total: DESK_VOCAB.length, learning, mastered, seen: learning + mastered },
      grammar: { total: DESK_GRAMMAR.length, done: grammarMastered },
      streak: streakAlive ? (state.streak?.count || 0) : 0,
      todayVocabDone: state.daily?.date === today && !!state.daily?.vocabDone,
      todayGrammarDone: state.daily?.date === today && !!state.daily?.grammarDone,
    }
  }, [state])

  const wordState = useCallback((id) => state.vocab?.[id] || null, [state])

  return { buildSession, rateWord, completeVocabDay, grammarToday, markGrammarDone, isGrammarDone, wordState, ...derived }
}
