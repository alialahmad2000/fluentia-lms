import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Swords, Trophy, Clock, Zap, Shield, Crown, X, RotateCcw, ArrowLeft, Lock, Flame, Search, BookOpen, Languages, PenTool, Headphones, Blocks } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { useToast } from '../../components/Toast'
import { playTick, playCorrect, playWrong, playWin, playLose, vibrate } from '../../lib/duelSounds'
import DuelsBackdrop from '../../components/duels/DuelsBackdrop'

// ─── Google Font for numeric display ─────────────────
const FONT_LINK = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&display=swap'

// ─── Game Types ────────────────────────────────────────
const GAME_TYPES = [
  { id: 'vocab_sprint', label: 'سباق المفردات', icon: BookOpen, desc: 'اختبر مفرداتك ضد خصمك', active: true, gradient: 'from-violet-500 to-cyan-400', accent: 'violet' },
  { id: 'irregular_verbs', label: 'الأفعال الشاذة', icon: RotateCcw, desc: 'تصريفات الأفعال', active: false, gradient: 'from-amber-500 to-red-500', accent: 'amber' },
  { id: 'grammar_clash', label: 'صراع القواعد', icon: PenTool, desc: 'قواعد اللغة', active: false, gradient: 'from-emerald-500 to-teal-400', accent: 'emerald' },
  { id: 'sentence_builder', label: 'بناء الجمل', icon: Blocks, desc: 'رتّب الكلمات', active: false, gradient: 'from-blue-500 to-indigo-500', accent: 'blue' },
  { id: 'listening_lightning', label: 'برق الاستماع', icon: Headphones, desc: 'استمع وأجب', active: false, gradient: 'from-pink-500 to-purple-500', accent: 'pink' },
]

// ─── Helpers ────────────────────────────────────────────
function streakEmoji(streak) {
  if (streak >= 10) return '👑'
  if (streak >= 5) return '🔥🔥'
  if (streak >= 3) return '🔥'
  return ''
}

function GlassCard({ children, className = '', style = {}, ...props }) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
}

function DisplayNum({ children, className = '' }) {
  return (
    <span className={className} style={{ fontFamily: "'Space Grotesk', sans-serif", fontVariantNumeric: 'tabular-nums' }}>
      {children}
    </span>
  )
}

// ─── Phase: LOBBY ──────────────────────────────────────
function DuelLobby({ onStart, stats }) {
  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="text-center space-y-4 pt-4">
        <h1 className="text-5xl md:text-7xl font-black leading-tight">
          <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
            قاعة التحدي
          </span>
        </h1>
        <p className="text-sm md:text-base text-slate-400 font-medium">
          اربح نقاطك، اهزم خصومك، اصعد لوحة الشرف
        </p>

        {/* Stats strip */}
        {stats && (
          <GlassCard className="inline-flex items-center gap-4 md:gap-6 px-5 py-3">
            <div className="text-center">
              <DisplayNum className="text-2xl md:text-3xl font-bold text-white">{stats.elo || 1000}</DisplayNum>
              <div className="text-[10px] text-slate-500 mt-0.5">ELO</div>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <DisplayNum className="text-lg font-bold text-emerald-400">{stats.wins || 0}</DisplayNum>
              <span className="text-lg text-slate-500 mx-0.5">/</span>
              <DisplayNum className="text-lg font-bold text-red-400">{stats.losses || 0}</DisplayNum>
              <div className="text-[10px] text-slate-500 mt-0.5">فوز / خسارة</div>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <div className="text-lg font-bold text-amber-400">
                {streakEmoji(stats.current_streak)} {stats.current_streak || 0}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">سلسلة</div>
            </div>
          </GlassCard>
        )}
      </div>

      {/* Game Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {GAME_TYPES.map((game) => {
          const Icon = game.icon
          return (
            <motion.button
              key={game.id}
              whileHover={game.active ? { y: -4 } : {}}
              whileTap={game.active ? { scale: 0.98 } : {}}
              onClick={() => game.active && onStart(game.id)}
              className={`relative rounded-2xl p-5 text-right transition-all aspect-[4/5] flex flex-col justify-between overflow-hidden ${
                game.active ? 'cursor-pointer' : 'cursor-not-allowed'
              }`}
              style={{
                background: game.active
                  ? 'rgba(255,255,255,0.05)'
                  : 'rgba(255,255,255,0.02)',
                backdropFilter: game.active ? 'blur(20px)' : 'blur(4px)',
                border: `1px solid ${game.active ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)'}`,
                opacity: game.active ? 1 : 0.5,
              }}
            >
              {/* Gradient accent line at top */}
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${game.gradient}`} style={{ opacity: game.active ? 1 : 0.3 }} />

              {/* Icon */}
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br ${game.gradient} mb-auto`} style={{ opacity: game.active ? 0.9 : 0.4 }}>
                <Icon className="w-7 h-7 text-white" />
              </div>

              <div>
                <div className="text-lg font-bold text-white mb-1">{game.label}</div>
                <div className="text-xs text-slate-400">{game.desc}</div>
              </div>

              {/* Locked badge */}
              {!game.active && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-black/60 backdrop-blur-sm border border-white/10">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs font-bold text-amber-400">قريباً</span>
                  </div>
                </div>
              )}

              {/* CTA for active */}
              {game.active && (
                <div className="mt-4">
                  <div className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r ${game.gradient} text-white font-bold text-sm shadow-lg`}
                    style={{ boxShadow: '0 0 20px rgba(139,92,246,0.3)' }}>
                    <Swords className="w-4 h-4" />
                    ابدأ الآن
                  </div>
                </div>
              )}
            </motion.button>
          )
        })}
      </div>

      {/* Leaderboard Preview */}
      <DuelLeaderboardWidget />
    </div>
  )
}

// ─── Leaderboard Widget (Podium) ────────────────────────
function DuelLeaderboardWidget() {
  const [leaders, setLeaders] = useState([])
  const [myRank, setMyRank] = useState(null)
  const { user, studentData } = useAuthStore()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('duel_leaderboard_weekly')
        .select('*')
        .eq('group_id', studentData?.group_id)
        .order('elo', { ascending: false })
        .limit(5)

      if (data) {
        setLeaders(data)
        const rank = data.findIndex(d => d.id === user?.id)
        setMyRank(rank >= 0 ? rank + 1 : null)
      }
    }
    if (studentData?.group_id) load()
  }, [studentData?.group_id, user?.id])

  if (leaders.length === 0) return null

  const podiumOrder = leaders.length >= 3 ? [leaders[1], leaders[0], leaders[2]] : leaders
  const podiumHeights = ['h-20', 'h-28', 'h-16']
  const medals = ['🥈', '🥇', '🥉']

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="font-bold text-sm text-white">🏆 لوحة المتصدرين الأسبوعية</span>
        {myRank && (
          <span className="text-xs px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
            ترتيبك: #{myRank}
          </span>
        )}
      </div>

      {/* Podium visual (top 3) */}
      {leaders.length >= 3 && (
        <div className="flex items-end justify-center gap-3 mb-4">
          {podiumOrder.map((l, i) => (
            <div key={l.id} className="flex flex-col items-center">
              <div className="text-lg mb-1">{medals[i]}</div>
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold text-white border border-white/10 mb-2">
                {l.full_name?.[0] || '?'}
              </div>
              <div className={`w-16 ${podiumHeights[i]} rounded-t-lg flex flex-col items-center justify-start pt-2`}
                style={{
                  background: i === 1
                    ? 'linear-gradient(to top, rgba(139,92,246,0.3), rgba(139,92,246,0.1))'
                    : 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderBottom: 'none',
                }}>
                <DisplayNum className="text-xs font-bold text-white">{l.elo}</DisplayNum>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List */}
      <div className="space-y-2">
        {leaders.map((l, i) => (
          <div key={l.id} className="flex items-center gap-3 text-sm py-1.5">
            <span className="w-6 text-center font-bold text-slate-500">
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
            </span>
            <span className={`flex-1 font-medium ${l.id === user?.id ? 'text-violet-300' : 'text-white'}`}>
              {l.full_name} {streakEmoji(l.current_streak)}
            </span>
            <DisplayNum className="text-xs text-slate-400">{l.elo}</DisplayNum>
            <span className="text-xs text-emerald-400">{l.wins}W</span>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}

// ─── Phase: SEARCHING ──────────────────────────────────
function DuelSearching({ gameType, onCancel, onMatched, userId }) {
  const [stage, setStage] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const channelRef = useRef(null)

  const stages = [
    'نبحث في فريقك...',
    'نوسّع البحث لقروبك...',
    'نبحث في نفس مستواك...',
    'نبحث عن أي خصم...',
  ]

  useEffect(() => {
    const channel = supabase.channel(`duel:${userId}`)
      .on('broadcast', { event: 'duel:start' }, ({ payload }) => {
        onMatched(payload)
      })
      .subscribe()
    channelRef.current = channel
    return () => { supabase.removeChannel(channel) }
  }, [userId, onMatched])

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(e => {
        const next = e + 1
        if (next >= 8 && stage < 1) setStage(1)
        if (next >= 16 && stage < 2) setStage(2)
        if (next >= 22 && stage < 3) setStage(3)
        if (next >= 30) { clearInterval(timer); onCancel('timeout') }
        return next
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [stage, onCancel])

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-8">
      {/* Pulsing rings */}
      <div className="relative w-32 h-32">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="absolute inset-0 rounded-full duels-search-ring"
            style={{
              border: '2px solid rgba(139,92,246,0.3)',
              animationDelay: `${i * 0.8}s`,
            }}
          />
        ))}
        {/* Avatar center */}
        <div className="absolute inset-4 rounded-full bg-gradient-to-br from-violet-500/30 to-pink-500/30 flex items-center justify-center border-2 border-violet-400/40">
          <Search className="w-8 h-8 text-violet-300" />
        </div>
      </div>

      <div className="text-center space-y-3">
        <AnimatePresence mode="wait">
          <motion.p
            key={stage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-xl font-bold text-white"
          >
            {stages[stage]}
          </motion.p>
        </AnimatePresence>
        <DisplayNum className="text-3xl font-bold text-violet-300">{elapsed}</DisplayNum>
        <p className="text-xs text-slate-500">ثانية</p>
      </div>

      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => onCancel('manual')}
        className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm text-slate-400 border border-white/10 hover:bg-white/5 transition-colors"
      >
        <X className="w-4 h-4" />
        إلغاء
      </motion.button>

      <style>{`
        .duels-search-ring {
          animation: duels-ripple 2.4s ease-out infinite;
        }
        @keyframes duels-ripple {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .duels-search-ring { animation: none !important; opacity: 0.2; }
        }
      `}</style>
    </div>
  )
}

// ─── Phase: LIVE DUEL ──────────────────────────────────
function DuelGame({ match, userId, onFinished }) {
  const [round, setRound] = useState(1)
  const [question, setQuestion] = useState(null)
  const [timer, setTimer] = useState(8)
  const [selected, setSelected] = useState(null)
  const [result, setResult] = useState(null)
  const [scoreA, setScoreA] = useState(0)
  const [scoreB, setScoreB] = useState(0)
  const [opponentAnswered, setOpponentAnswered] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [interRound, setInterRound] = useState(false)
  const timerRef = useRef(null)
  const { toast } = useToast()

  const isPlayerA = userId === match.player_a.id
  const me = isPlayerA ? match.player_a : match.player_b
  const opponent = isPlayerA ? match.player_b : match.player_a
  const myScore = isPlayerA ? scoreA : scoreB
  const oppScore = isPlayerA ? scoreB : scoreA

  useEffect(() => {
    const channel = supabase.channel(`duel:${userId}`)
      .on('broadcast', { event: 'duel:opponent_answered' }, () => setOpponentAnswered(true))
      .on('broadcast', { event: 'duel:round_result' }, ({ payload }) => {
        setResult(payload)
        setScoreA(payload.score_a)
        setScoreB(payload.score_b)
      })
      .on('broadcast', { event: 'duel:finished' }, ({ payload }) => onFinished(payload))
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [userId, onFinished])

  useEffect(() => {
    async function loadQuestion() {
      setSelected(null); setResult(null); setOpponentAnswered(false)
      setSubmitting(false); setInterRound(false); setTimer(8)
      const { data } = await supabase.functions.invoke('duel-question-next', {
        body: { duel_id: match.duel_id, round_number: round }
      })
      if (data?.question) setQuestion(data.question)
    }
    loadQuestion()
  }, [round, match.duel_id])

  useEffect(() => {
    if (!question || selected !== null || result) return
    timerRef.current = setInterval(() => {
      setTimer(t => {
        if (t <= 1) { clearInterval(timerRef.current); handleAnswer(-1); return 0 }
        if (t <= 4) playTick()
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [question, selected, result])

  async function handleAnswer(index) {
    if (selected !== null || submitting) return
    setSelected(index); setSubmitting(true)
    clearInterval(timerRef.current); vibrate(30)
    const { data } = await supabase.functions.invoke('duel-answer-submit', {
      body: { duel_id: match.duel_id, round_number: round, answer: index }
    })
    if (data?.is_correct) { playCorrect(); vibrate(50) }
    else { playWrong(); vibrate([50, 30, 50]) }
    setSubmitting(false)
  }

  useEffect(() => {
    if (!result) return
    setInterRound(true)
    const timeout = setTimeout(() => {
      if (round < match.round_count) setRound(r => r + 1)
    }, 2500)
    return () => clearTimeout(timeout)
  }, [result, round, match.round_count])

  // Timer percentage for SVG circle
  const timerPct = (timer / 8) * 100
  const circumference = 2 * Math.PI * 22

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* Round indicator pills */}
      <div className="flex items-center justify-center gap-1.5">
        {Array.from({ length: match.round_count }, (_, i) => {
          const r = i + 1
          const isCurrent = r === round
          const isPast = r < round
          return (
            <div
              key={r}
              className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                isCurrent ? 'bg-violet-500 text-white scale-110 shadow-lg shadow-violet-500/40' :
                isPast ? 'bg-white/10 text-white/60' : 'bg-white/5 text-white/20'
              }`}
            >
              <DisplayNum>{r}</DisplayNum>
            </div>
          )
        })}
      </div>

      {/* Top HUD — Players */}
      <div className="flex items-center justify-between">
        {/* Me (right in RTL) */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-violet-500/40 to-cyan-500/40 flex items-center justify-center text-lg border-2 border-violet-400/50">
              {me.avatar_url ? <img src={me.avatar_url} className="w-full h-full rounded-full object-cover" alt="" /> : '👤'}
            </div>
            {/* Animated ring */}
            <div className="absolute -inset-1 rounded-full border-2 border-violet-400/30 duels-player-ring" />
          </div>
          <div>
            <div className="text-sm font-bold text-violet-300">{me.name}</div>
            <div className="text-[10px] text-slate-500">ELO {me.elo}</div>
          </div>
        </div>

        {/* VS + Score */}
        <div className="text-center px-4">
          <div className="flex items-center gap-3">
            <DisplayNum className="text-3xl md:text-4xl font-black text-white">{myScore}</DisplayNum>
            <div className="relative">
              <span className="text-sm md:text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-pink-400 duels-vs-glow">
                VS
              </span>
            </div>
            <DisplayNum className="text-3xl md:text-4xl font-black text-white">{oppScore}</DisplayNum>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">الجولة {round}/{match.round_count}</div>
        </div>

        {/* Opponent (left in RTL) */}
        <div className="flex items-center gap-3">
          <div>
            <div className="text-sm font-bold text-pink-300 text-left">{opponent.name}</div>
            <div className="text-[10px] text-slate-500 text-left">ELO {opponent.elo}</div>
          </div>
          <div className="relative">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-pink-500/40 to-red-500/40 flex items-center justify-center text-lg border-2 border-pink-400/50">
              {opponent.avatar_url ? <img src={opponent.avatar_url} className="w-full h-full rounded-full object-cover" alt="" /> : '👤'}
            </div>
            <div className="absolute -inset-1 rounded-full border-2 border-pink-400/30 duels-player-ring" style={{ animationDelay: '-1s' }} />
          </div>
        </div>
      </div>

      {/* Timer — SVG circular */}
      <div className="flex justify-center">
        <div className="relative w-16 h-16 md:w-20 md:h-20">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="22" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
            <circle
              cx="24" cy="24" r="22" fill="none"
              stroke={timer <= 3 ? '#ef4444' : 'rgba(139,92,246,0.8)'}
              strokeWidth="3"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - (timerPct / 100) * circumference}
              strokeLinecap="round"
              className="transition-all duration-1000 linear"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              animate={timer <= 3 ? { scale: [1, 1.15, 1] } : {}}
              transition={{ repeat: Infinity, duration: 0.5 }}
            >
              <DisplayNum className={`text-2xl md:text-3xl font-black ${timer <= 3 ? 'text-red-400' : 'text-white'}`}>
                {timer}
              </DisplayNum>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Question Card */}
      {question && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-3xl p-6 md:p-8 text-center relative overflow-hidden"
          style={{
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.1), rgba(255,255,255,0.04))',
            backdropFilter: 'blur(30px)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.1), 0 8px 32px rgba(0,0,0,0.3)',
          }}
        >
          <div className="text-xs text-slate-500 mb-3">ما معنى هذه الكلمة؟</div>
          <div className="text-3xl md:text-5xl font-black text-white" dir="ltr" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {question.word}
          </div>
        </motion.div>
      )}

      {/* Answer buttons */}
      {question && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {question.choices.map((choice, i) => {
            const isSelected = selected === i
            const isRevealed = result !== null
            const isCorrectChoice = isRevealed && result.correct_index === i
            const isWrongSelected = isRevealed && isSelected && !isCorrectChoice

            let bg = 'rgba(255,255,255,0.05)'
            let border = 'rgba(255,255,255,0.08)'
            let glow = 'none'
            if (isSelected && !isRevealed) { bg = 'rgba(139,92,246,0.3)'; border = 'rgba(139,92,246,0.6)'; glow = '0 0 20px rgba(139,92,246,0.3)' }
            if (isCorrectChoice && isRevealed) { bg = 'rgba(34,197,94,0.2)'; border = 'rgba(34,197,94,0.6)'; glow = '0 0 20px rgba(34,197,94,0.2)' }
            if (isWrongSelected) { bg = 'rgba(239,68,68,0.2)'; border = 'rgba(239,68,68,0.6)'; glow = '0 0 20px rgba(239,68,68,0.2)' }

            return (
              <motion.button
                key={i}
                whileTap={selected === null ? { scale: 0.97 } : {}}
                whileHover={selected === null ? { scale: 1.01 } : {}}
                onClick={() => handleAnswer(i)}
                disabled={selected !== null}
                className="p-4 md:p-5 rounded-2xl text-right font-bold text-base transition-all backdrop-blur-xl"
                style={{
                  background: bg,
                  border: `1.5px solid ${border}`,
                  boxShadow: glow,
                  color: isWrongSelected ? '#fca5a5' : isCorrectChoice ? '#86efac' : 'white',
                  opacity: selected !== null && !isSelected && !isCorrectChoice ? 0.4 : 1,
                }}
              >
                <span className="text-xs text-slate-600 ml-2" dir="ltr">{i + 1}</span>
                {choice}
              </motion.button>
            )
          })}
        </div>
      )}

      {/* Waiting for opponent */}
      {selected !== null && !result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-3">
          <span className="text-sm text-slate-400">
            {opponentAnswered ? 'خصمك أجاب ✅ — في انتظار النتيجة...' : 'في انتظار خصمك...'}
          </span>
        </motion.div>
      )}

      {/* Round result */}
      <AnimatePresence>
        {interRound && result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center space-y-1 py-2"
          >
            {result.answers?.map(a => (
              <div key={a.player_id} className={`text-xs ${a.is_correct ? 'text-emerald-400' : 'text-red-400'}`}>
                {a.player_id === userId ? 'أنت' : opponent.name}: {a.is_correct ? `✅ صحيح (+${a.points})` : '❌ خطأ'} — <DisplayNum>{(a.response_ms / 1000).toFixed(1)}</DisplayNum>ث
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .duels-player-ring {
          animation: duels-ring-spin 3s linear infinite;
        }
        @keyframes duels-ring-spin {
          to { transform: rotate(360deg); }
        }
        .duels-vs-glow {
          text-shadow: 0 0 20px rgba(139,92,246,0.5), 0 0 40px rgba(236,72,153,0.3);
        }
        @media (prefers-reduced-motion: reduce) {
          .duels-player-ring { animation: none !important; }
        }
      `}</style>
    </div>
  )
}

// ─── Phase: FINISH ─────────────────────────────────────
function DuelFinish({ result, match, userId, onRematch, onNewOpponent, onExit }) {
  const isPlayerA = userId === match.player_a.id
  const won = result.winner_id === userId
  const draw = !result.winner_id
  const myXp = isPlayerA ? result.xp_delta_a : result.xp_delta_b
  const myElo = isPlayerA ? result.elo_a : result.elo_b
  const eloChange = isPlayerA ? result.elo_change_a : result.elo_change_b
  const myGrace = isPlayerA ? result.grace_a : result.grace_b
  const myScoreFinal = isPlayerA ? result.score_a : result.score_b
  const oppScoreFinal = isPlayerA ? result.score_b : result.score_a
  const me = isPlayerA ? match.player_a : match.player_b
  const opponent = isPlayerA ? match.player_b : match.player_a

  useEffect(() => {
    if (won) { playWin(); vibrate([100, 50, 100]) }
    else if (!draw) { playLose(); vibrate(200) }
  }, [won, draw])

  return (
    <div className="space-y-8 text-center max-w-lg mx-auto pt-8">
      {/* Confetti particles for winner */}
      {won && (
        <div className="fixed inset-0 pointer-events-none z-10">
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                background: ['#fbbf24', '#38bdf8', '#22c55e', '#f43f5e', '#a78bfa', '#ec4899'][i % 6],
                left: `${5 + Math.random() * 90}%`,
                top: '-5%',
              }}
              animate={{
                y: [0, window.innerHeight + 100],
                x: [0, (Math.random() - 0.5) * 200],
                rotate: [0, Math.random() * 720],
                opacity: [1, 1, 0],
              }}
              transition={{ duration: 2 + Math.random() * 2, delay: Math.random() * 1.5, ease: 'easeIn' }}
            />
          ))}
        </div>
      )}

      {/* Result banner */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', bounce: 0.5 }}
      >
        {won && (
          <>
            <motion.div
              className="text-7xl md:text-8xl mb-4"
              animate={{ rotateY: [0, 360] }}
              transition={{ duration: 1, delay: 0.3 }}
            >
              🏆
            </motion.div>
            <h2 className="text-4xl md:text-5xl font-black">
              <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
                انتصار!
              </span>
            </h2>
          </>
        )}
        {!won && !draw && (
          <>
            <div className="text-6xl mb-4">💪</div>
            <h2 className="text-2xl font-bold text-slate-300">قريب من الفوز!</h2>
            <p className="text-sm text-slate-500 mt-1">المرة الجاية لك 💪</p>
          </>
        )}
        {draw && (
          <>
            <div className="text-6xl mb-4">🤝</div>
            <h2 className="text-3xl font-black text-cyan-400">تعادل!</h2>
          </>
        )}
      </motion.div>

      {/* Final Score */}
      <div className="flex items-center justify-center gap-8">
        <div className="text-center">
          <div className="text-sm font-bold text-violet-300 mb-1">{me.name}</div>
          <DisplayNum className="text-4xl md:text-5xl font-black text-white">{myScoreFinal}</DisplayNum>
        </div>
        <div className="text-xl text-slate-600">:</div>
        <div className="text-center">
          <div className="text-sm font-bold text-pink-300 mb-1">{opponent.name}</div>
          <DisplayNum className="text-4xl md:text-5xl font-black text-white">{oppScoreFinal}</DisplayNum>
        </div>
      </div>

      {/* XP + ELO cards */}
      <div className="flex items-center justify-center gap-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring' }}
        >
          <GlassCard className="px-5 py-3 text-center" style={{
            border: `1px solid ${myXp > 0 ? 'rgba(34,197,94,0.3)' : myXp < 0 ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.08)'}`,
          }}>
            <Zap className={`w-5 h-5 mx-auto mb-1 ${myXp > 0 ? 'text-emerald-400' : myXp < 0 ? 'text-red-400' : 'text-slate-400'}`} />
            <DisplayNum className={`text-xl font-black ${myXp > 0 ? 'text-emerald-400' : myXp < 0 ? 'text-red-400' : 'text-slate-400'}`}>
              {myXp > 0 ? `+${myXp}` : myXp} XP
            </DisplayNum>
            {myGrace > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1">
                <Shield className="w-3 h-3" /> محمي ({myGrace})
              </div>
            )}
          </GlassCard>
        </motion.div>

        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5, type: 'spring' }}>
          <GlassCard className="px-5 py-3 text-center">
            <div className="text-[10px] text-slate-500 mb-1">ELO</div>
            <DisplayNum className="text-xl font-black text-white">{myElo}</DisplayNum>
            <div className={`text-xs font-bold ${eloChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {eloChange >= 0 ? '+' : ''}{eloChange}
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 max-w-xs mx-auto pt-4">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onNewOpponent}
          className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-white text-sm"
          style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.8), rgba(236,72,153,0.8))',
            boxShadow: '0 0 24px rgba(139,92,246,0.3)',
            border: '1px solid rgba(255,255,255,0.15)',
          }}
        >
          <Search className="w-4 h-4" />
          منافس جديد
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onExit}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm text-slate-400 border border-white/10 hover:bg-white/5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          خروج
        </motion.button>
      </div>
    </div>
  )
}

// ─── Main Duels Page ───────────────────────────────────
export default function StudentDuels() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const [phase, setPhase] = useState('lobby')
  const [gameType, setGameType] = useState(null)
  const [match, setMatch] = useState(null)
  const [finishResult, setFinishResult] = useState(null)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    async function loadStats() {
      if (!user?.id) return
      const { data } = await supabase.from('duel_stats').select('*').eq('student_id', user.id).maybeSingle()
      if (data) setStats(data)
    }
    loadStats()
  }, [user?.id, phase])

  const handleStartSearch = useCallback(async (type) => {
    setGameType(type); setPhase('searching')
    const { data, error } = await supabase.functions.invoke('duel-enqueue', { body: { game_type: type } })
    if (error) { toast.error('خطأ في الاتصال'); setPhase('lobby'); return }
    if (data?.status === 'matched') { setMatch(data.match); setPhase('playing') }
  }, [toast])

  const handleCancel = useCallback(async (reason) => {
    if (user?.id) await supabase.from('duel_queue').delete().eq('student_id', user.id)
    if (reason === 'timeout') toast.info('لم نجد خصماً — حاول مرة أخرى')
    setPhase('lobby'); setGameType(null)
  }, [user?.id, toast])

  const handleMatched = useCallback((matchData) => {
    setMatch(matchData); setPhase('playing'); vibrate(100)
  }, [])

  const handleFinished = useCallback((result) => {
    setFinishResult(result); setPhase('finished')
  }, [])

  const handleNewOpponent = useCallback(() => {
    setMatch(null); setFinishResult(null)
    handleStartSearch(gameType || 'vocab_sprint')
  }, [gameType, handleStartSearch])

  const handleExit = useCallback(() => {
    setPhase('lobby'); setMatch(null); setFinishResult(null); setGameType(null)
  }, [])

  return (
    <>
      {/* Google Font */}
      <link rel="stylesheet" href={FONT_LINK} />

      {/* Duels-specific backdrop — overrides the app background */}
      <DuelsBackdrop />

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-6 pb-24" dir="rtl">
        <AnimatePresence mode="wait">
          {phase === 'lobby' && (
            <motion.div key="lobby" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.2 }}>
              <DuelLobby onStart={handleStartSearch} stats={stats} />
            </motion.div>
          )}
          {phase === 'searching' && (
            <motion.div key="searching" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.2 }}>
              <DuelSearching gameType={gameType} onCancel={handleCancel} onMatched={handleMatched} userId={user?.id} />
            </motion.div>
          )}
          {phase === 'playing' && match && (
            <motion.div key="playing" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.2 }}>
              <DuelGame match={match} userId={user?.id} onFinished={handleFinished} />
            </motion.div>
          )}
          {phase === 'finished' && finishResult && match && (
            <motion.div key="finished" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.2 }}>
              <DuelFinish result={finishResult} match={match} userId={user?.id} onRematch={handleNewOpponent} onNewOpponent={handleNewOpponent} onExit={handleExit} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
