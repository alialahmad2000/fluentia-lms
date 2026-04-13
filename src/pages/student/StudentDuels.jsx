import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Swords, Trophy, Clock, Zap, Shield, Crown, X, RotateCcw, ArrowLeft, Lock, Flame } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { useToast } from '../../components/Toast'
import { playTick, playCorrect, playWrong, playWin, playLose, vibrate } from '../../lib/duelSounds'

// ─── Game Types ────────────────────────────────────────
const GAME_TYPES = [
  { id: 'vocab_sprint', label: 'سباق المفردات', icon: '📝', desc: 'اختبر مفرداتك ضد خصمك', active: true },
  { id: 'irregular_verbs', label: 'الأفعال الشاذة', icon: '🔄', desc: 'تصريفات الأفعال', active: false },
  { id: 'grammar_clash', label: 'صراع القواعد', icon: '📐', desc: 'قواعد اللغة', active: false },
  { id: 'sentence_builder', label: 'بناء الجمل', icon: '🧩', desc: 'رتّب الكلمات', active: false },
  { id: 'listening_lightning', label: 'برق الاستماع', icon: '🎧', desc: 'استمع وأجب', active: false },
]

// ─── Streak Emoji ──────────────────────────────────────
function streakEmoji(streak) {
  if (streak >= 10) return '👑'
  if (streak >= 5) return '🔥🔥'
  if (streak >= 3) return '🔥'
  return ''
}

// ─── Phase: LOBBY ──────────────────────────────────────
function DuelLobby({ onStart, stats }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl" style={{ background: 'var(--glass-card)' }}>
          <Swords className="w-5 h-5 text-sky-400" />
          <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>المبارزات</span>
        </div>
        {stats && (
          <div className="flex items-center justify-center gap-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <span>🏆 {stats.wins || 0} فوز</span>
            <span>⚔️ ELO: {stats.elo || 1000}</span>
            <span>{streakEmoji(stats.current_streak)} سلسلة: {stats.current_streak || 0}</span>
          </div>
        )}
      </div>

      {/* Game Type Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {GAME_TYPES.map((game) => (
          <motion.button
            key={game.id}
            whileHover={game.active ? { scale: 1.02 } : {}}
            whileTap={game.active ? { scale: 0.98 } : {}}
            onClick={() => game.active ? onStart(game.id) : null}
            className="relative p-4 rounded-2xl text-right transition-all"
            style={{
              background: game.active ? 'var(--glass-card)' : 'var(--surface-base)',
              border: `1px solid ${game.active ? 'var(--border-default)' : 'var(--border-subtle)'}`,
              opacity: game.active ? 1 : 0.5,
              cursor: game.active ? 'pointer' : 'not-allowed',
            }}
          >
            {!game.active && (
              <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: 'var(--accent-gold)', color: '#000' }}>
                <Lock className="w-3 h-3" />
                قريباً
              </div>
            )}
            <div className="flex items-center gap-3">
              <span className="text-3xl">{game.icon}</span>
              <div>
                <div className="font-bold" style={{ color: 'var(--text-primary)' }}>{game.label}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{game.desc}</div>
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Leaderboard Preview */}
      <DuelLeaderboardWidget />
    </div>
  )
}

// ─── Leaderboard Widget ────────────────────────────────
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

  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--glass-card)', border: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>🏆 لوحة المتصدرين الأسبوعية</span>
        {myRank && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-sky)', color: '#000' }}>ترتيبك: #{myRank}</span>}
      </div>
      <div className="space-y-2">
        {leaders.map((l, i) => (
          <div key={l.id} className="flex items-center gap-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <span className="w-5 text-center font-bold" style={{ color: i === 0 ? 'var(--accent-gold)' : 'var(--text-tertiary)' }}>
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
            </span>
            <span className="flex-1" style={{ color: l.id === user?.id ? 'var(--accent-sky)' : 'var(--text-primary)' }}>
              {l.full_name} {streakEmoji(l.current_streak)}
            </span>
            <span className="text-xs">{l.elo} ELO</span>
            <span className="text-xs text-emerald-400">{l.wins}W</span>
          </div>
        ))}
      </div>
    </div>
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
    // Subscribe to personal channel for match notifications
    const channel = supabase.channel(`duel:${userId}`)
      .on('broadcast', { event: 'duel:start' }, ({ payload }) => {
        onMatched(payload)
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, onMatched])

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(e => {
        const next = e + 1
        if (next >= 8 && stage < 1) setStage(1)
        if (next >= 16 && stage < 2) setStage(2)
        if (next >= 22 && stage < 3) setStage(3)
        if (next >= 30) {
          clearInterval(timer)
          onCancel('timeout')
        }
        return next
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [stage, onCancel])

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-6">
      {/* Animated ring */}
      <motion.div
        className="w-24 h-24 rounded-full border-4 border-t-sky-400"
        style={{ borderColor: 'var(--border-subtle)', borderTopColor: 'var(--accent-sky)' }}
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
      />

      <div className="text-center space-y-2">
        <AnimatePresence mode="wait">
          <motion.p
            key={stage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-lg font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            {stages[stage]}
          </motion.p>
        </AnimatePresence>
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{elapsed} ثانية</p>
      </div>

      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => onCancel('manual')}
        className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold"
        style={{ background: 'var(--surface-raised)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
      >
        <X className="w-4 h-4" />
        إلغاء
      </motion.button>
    </div>
  )
}

// ─── Phase: LIVE DUEL ──────────────────────────────────
function DuelGame({ match, userId, onFinished }) {
  const [round, setRound] = useState(1)
  const [question, setQuestion] = useState(null)
  const [timer, setTimer] = useState(8)
  const [selected, setSelected] = useState(null)
  const [result, setResult] = useState(null) // round result from server
  const [scoreA, setScoreA] = useState(0)
  const [scoreB, setScoreB] = useState(0)
  const [opponentAnswered, setOpponentAnswered] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [interRound, setInterRound] = useState(false)
  const timerRef = useRef(null)
  const channelRef = useRef(null)
  const { toast } = useToast()

  const isPlayerA = userId === match.player_a.id
  const me = isPlayerA ? match.player_a : match.player_b
  const opponent = isPlayerA ? match.player_b : match.player_a

  // Subscribe to duel events
  useEffect(() => {
    const channel = supabase.channel(`duel:${userId}`)
      .on('broadcast', { event: 'duel:opponent_answered' }, () => {
        setOpponentAnswered(true)
      })
      .on('broadcast', { event: 'duel:round_result' }, ({ payload }) => {
        setResult(payload)
        setScoreA(payload.score_a)
        setScoreB(payload.score_b)
      })
      .on('broadcast', { event: 'duel:finished' }, ({ payload }) => {
        onFinished(payload)
      })
      .subscribe()

    channelRef.current = channel
    return () => supabase.removeChannel(channel)
  }, [userId, onFinished])

  // Load question for current round
  useEffect(() => {
    async function loadQuestion() {
      setSelected(null)
      setResult(null)
      setOpponentAnswered(false)
      setSubmitting(false)
      setInterRound(false)
      setTimer(8)

      const { data } = await supabase.functions.invoke('duel-question-next', {
        body: { duel_id: match.duel_id, round_number: round }
      })

      if (data?.question) {
        setQuestion(data.question)
      }
    }
    loadQuestion()
  }, [round, match.duel_id])

  // Countdown timer
  useEffect(() => {
    if (!question || selected !== null || result) return

    timerRef.current = setInterval(() => {
      setTimer(t => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          // Auto-submit wrong answer on timeout
          handleAnswer(-1)
          return 0
        }
        if (t <= 4) playTick()
        return t - 1
      })
    }, 1000)

    return () => clearInterval(timerRef.current)
  }, [question, selected, result])

  async function handleAnswer(index) {
    if (selected !== null || submitting) return
    setSelected(index)
    setSubmitting(true)
    clearInterval(timerRef.current)
    vibrate(30)

    const { data } = await supabase.functions.invoke('duel-answer-submit', {
      body: { duel_id: match.duel_id, round_number: round, answer: index }
    })

    if (data?.is_correct) {
      playCorrect()
      vibrate(50)
    } else {
      playWrong()
      vibrate([50, 30, 50])
    }

    setSubmitting(false)
  }

  // When round result arrives, show it then advance
  useEffect(() => {
    if (!result) return

    setInterRound(true)
    const timeout = setTimeout(() => {
      if (round < match.round_count) {
        setRound(r => r + 1)
      }
    }, 2500) // 2.5s reveal time

    return () => clearTimeout(timeout)
  }, [result, round, match.round_count])

  // Taunts
  const scoreDiff = isPlayerA ? scoreA - scoreB : scoreB - scoreA
  const taunt = scoreDiff > 15 ? 'أنت مسيطر! 🔥' : scoreDiff > 0 ? 'أنت متقدم! 💪' : scoreDiff < -15 ? 'لسه تقدر ترجع! ⚡' : scoreDiff < 0 ? 'الخصم متقدم — ركّز!' : 'متعادلين!'

  return (
    <div className="space-y-4">
      {/* Players bar */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-sky-500/20 flex items-center justify-center text-lg">
            {me.avatar_url ? <img src={me.avatar_url} className="w-10 h-10 rounded-full" alt="" /> : '👤'}
          </div>
          <div>
            <div className="text-xs font-bold" style={{ color: 'var(--accent-sky)' }}>
              {me.name} {streakEmoji(me.streak)}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>ELO: {me.elo}</div>
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
            {isPlayerA ? scoreA : scoreB} : {isPlayerA ? scoreB : scoreA}
          </div>
          <div className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>الجولة {round}/{match.round_count}</div>
        </div>
        <div className="flex items-center gap-2">
          <div>
            <div className="text-xs font-bold text-left" style={{ color: 'var(--accent-rose, #f43f5e)' }}>
              {opponent.name} {streakEmoji(opponent.streak)}
            </div>
            <div className="text-xs text-left" style={{ color: 'var(--text-tertiary)' }}>ELO: {opponent.elo}</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center text-lg">
            {opponent.avatar_url ? <img src={opponent.avatar_url} className="w-10 h-10 rounded-full" alt="" /> : '👤'}
          </div>
        </div>
      </div>

      {/* Taunt line */}
      {round > 1 && (
        <div className="text-center text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
          {taunt}
        </div>
      )}

      {/* Timer */}
      <div className="flex justify-center">
        <motion.div
          className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-black"
          style={{
            background: timer <= 3 ? 'rgba(239,68,68,0.2)' : 'var(--glass-card)',
            color: timer <= 3 ? '#ef4444' : 'var(--text-primary)',
            border: `2px solid ${timer <= 3 ? '#ef4444' : 'var(--border-subtle)'}`,
          }}
          animate={timer <= 3 ? { scale: [1, 1.1, 1] } : {}}
          transition={{ repeat: Infinity, duration: 0.5 }}
        >
          {timer}
        </motion.div>
      </div>

      {/* Question Card */}
      {question && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl p-6 text-center"
          style={{ background: 'var(--glass-elevated)', border: '1px solid var(--border-default)' }}
        >
          <div className="text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}>ما معنى هذه الكلمة؟</div>
          <div className="text-3xl font-black mb-1" style={{ color: 'var(--accent-sky)' }}>
            {question.word}
          </div>
        </motion.div>
      )}

      {/* Answer Choices */}
      {question && (
        <div className="grid grid-cols-1 gap-2.5">
          {question.choices.map((choice, i) => {
            const isSelected = selected === i
            const isRevealed = result !== null
            const isCorrectChoice = isRevealed && result.correct_index === i
            const isWrongSelected = isRevealed && isSelected && !isCorrectChoice

            let bg = 'var(--glass-card)'
            let border = 'var(--border-subtle)'
            if (isSelected && !isRevealed) { bg = 'var(--accent-sky)'; border = 'var(--accent-sky)' }
            if (isCorrectChoice && isRevealed) { bg = 'rgba(34,197,94,0.2)'; border = '#22c55e' }
            if (isWrongSelected) { bg = 'rgba(239,68,68,0.2)'; border = '#ef4444' }

            return (
              <motion.button
                key={i}
                whileTap={selected === null ? { scale: 0.97 } : {}}
                onClick={() => handleAnswer(i)}
                disabled={selected !== null}
                className="p-4 rounded-xl text-right font-bold text-base transition-all"
                style={{
                  background: bg,
                  border: `1.5px solid ${border}`,
                  color: isSelected && !isRevealed ? '#000' : 'var(--text-primary)',
                  opacity: selected !== null && !isSelected && !isCorrectChoice ? 0.5 : 1,
                }}
              >
                {choice}
              </motion.button>
            )
          })}
        </div>
      )}

      {/* Waiting for opponent / Round result */}
      {selected !== null && !result && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-3"
        >
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {opponentAnswered ? 'خصمك أجاب ✅ — في انتظار النتيجة...' : 'في انتظار خصمك...'}
          </span>
        </motion.div>
      )}

      {/* Round Result Banner */}
      <AnimatePresence>
        {interRound && result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center space-y-1 py-2"
          >
            {result.answers?.map(a => (
              <div key={a.player_id} className="text-xs" style={{ color: a.is_correct ? '#22c55e' : '#ef4444' }}>
                {a.player_id === userId ? 'أنت' : opponent.name}: {a.is_correct ? `✅ صحيح (+${a.points})` : '❌ خطأ'} — {(a.response_ms / 1000).toFixed(1)}ث
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
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

  useEffect(() => {
    if (won) { playWin(); vibrate([100, 50, 100]) }
    else if (!draw) { playLose(); vibrate(200) }
  }, [won, draw])

  // Get fastest round
  const me = isPlayerA ? match.player_a : match.player_b
  const opponent = isPlayerA ? match.player_b : match.player_a

  return (
    <div className="space-y-6 text-center">
      {/* Result Banner */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', bounce: 0.5 }}
        className="py-8"
      >
        {won && (
          <>
            <div className="text-6xl mb-3">🏆</div>
            <div className="text-2xl font-black" style={{ color: 'var(--accent-gold)' }}>فزت!</div>
            {/* Confetti dots */}
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  background: ['#fbbf24', '#38bdf8', '#22c55e', '#f43f5e'][i % 4],
                  left: `${10 + Math.random() * 80}%`,
                  top: `${Math.random() * 40}%`,
                }}
                initial={{ opacity: 0, scale: 0, y: 0 }}
                animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0], y: [0, -50 - Math.random() * 80] }}
                transition={{ duration: 1.5, delay: i * 0.1 }}
              />
            ))}
          </>
        )}
        {!won && !draw && (
          <>
            <div className="text-6xl mb-3">💪</div>
            <div className="text-2xl font-black" style={{ color: 'var(--text-secondary)' }}>حاول مرة أخرى</div>
          </>
        )}
        {draw && (
          <>
            <div className="text-6xl mb-3">🤝</div>
            <div className="text-2xl font-black" style={{ color: 'var(--accent-sky)' }}>تعادل!</div>
          </>
        )}
      </motion.div>

      {/* Final Score */}
      <div className="flex items-center justify-center gap-6">
        <div className="text-center">
          <div className="text-sm font-bold" style={{ color: 'var(--accent-sky)' }}>{me.name}</div>
          <div className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>
            {isPlayerA ? result.score_a : result.score_b}
          </div>
        </div>
        <div className="text-xl" style={{ color: 'var(--text-tertiary)' }}>:</div>
        <div className="text-center">
          <div className="text-sm font-bold" style={{ color: 'var(--accent-rose, #f43f5e)' }}>{opponent.name}</div>
          <div className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>
            {isPlayerA ? result.score_b : result.score_a}
          </div>
        </div>
      </div>

      {/* XP Delta */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.3, type: 'spring' }}
        className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl"
        style={{
          background: myXp > 0 ? 'rgba(34,197,94,0.15)' : myXp < 0 ? 'rgba(239,68,68,0.15)' : 'var(--glass-card)',
          border: `1px solid ${myXp > 0 ? '#22c55e' : myXp < 0 ? '#ef4444' : 'var(--border-subtle)'}`,
        }}
      >
        <Zap className="w-5 h-5" style={{ color: myXp > 0 ? '#22c55e' : myXp < 0 ? '#ef4444' : 'var(--text-secondary)' }} />
        <span className="text-lg font-black" style={{ color: myXp > 0 ? '#22c55e' : myXp < 0 ? '#ef4444' : 'var(--text-secondary)' }}>
          {myXp > 0 ? `+${myXp}` : myXp} XP
        </span>
        {myXp >= 0 && myGrace > 0 && (
          <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
            <Shield className="w-3 h-3" /> محمي ({myGrace} متبقية)
          </span>
        )}
      </motion.div>

      {/* ELO Change */}
      <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        ELO: {myElo} <span style={{ color: eloChange >= 0 ? '#22c55e' : '#ef4444' }}>({eloChange >= 0 ? '+' : ''}{eloChange})</span>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 max-w-xs mx-auto">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onNewOpponent}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold"
          style={{ background: 'var(--accent-sky)', color: '#000' }}
        >
          <Swords className="w-4 h-4" />
          منافس جديد
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onExit}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold"
          style={{ background: 'var(--surface-raised)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
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
  const [phase, setPhase] = useState('lobby') // lobby | searching | playing | finished
  const [gameType, setGameType] = useState(null)
  const [match, setMatch] = useState(null)
  const [finishResult, setFinishResult] = useState(null)
  const [stats, setStats] = useState(null)

  // Load player stats
  useEffect(() => {
    async function loadStats() {
      if (!user?.id) return
      const { data } = await supabase
        .from('duel_stats')
        .select('*')
        .eq('student_id', user.id)
        .maybeSingle()
      if (data) setStats(data)
    }
    loadStats()
  }, [user?.id, phase])

  const handleStartSearch = useCallback(async (type) => {
    setGameType(type)
    setPhase('searching')

    // Call enqueue
    const { data, error } = await supabase.functions.invoke('duel-enqueue', {
      body: { game_type: type }
    })

    if (error) {
      toast.error('خطأ في الاتصال')
      setPhase('lobby')
      return
    }

    if (data?.status === 'matched') {
      // Immediate match
      setMatch(data.match)
      setPhase('playing')
    }
    // If queued, searching phase stays — we wait for broadcast
  }, [toast])

  const handleCancel = useCallback(async (reason) => {
    // Remove from queue
    if (user?.id) {
      await supabase.from('duel_queue').delete().eq('student_id', user.id)
    }
    if (reason === 'timeout') {
      toast.info('لم نجد خصماً — حاول مرة أخرى')
    }
    setPhase('lobby')
    setGameType(null)
  }, [user?.id, toast])

  const handleMatched = useCallback((matchData) => {
    setMatch(matchData)
    setPhase('playing')
    vibrate(100)
  }, [])

  const handleFinished = useCallback((result) => {
    setFinishResult(result)
    setPhase('finished')
  }, [])

  const handleNewOpponent = useCallback(() => {
    setMatch(null)
    setFinishResult(null)
    handleStartSearch(gameType || 'vocab_sprint')
  }, [gameType, handleStartSearch])

  const handleExit = useCallback(() => {
    setPhase('lobby')
    setMatch(null)
    setFinishResult(null)
    setGameType(null)
  }, [])

  return (
    <div className="max-w-lg mx-auto px-4 py-6" dir="rtl">
      <AnimatePresence mode="wait">
        {phase === 'lobby' && (
          <motion.div key="lobby" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <DuelLobby onStart={handleStartSearch} stats={stats} />
          </motion.div>
        )}
        {phase === 'searching' && (
          <motion.div key="searching" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <DuelSearching
              gameType={gameType}
              onCancel={handleCancel}
              onMatched={handleMatched}
              userId={user?.id}
            />
          </motion.div>
        )}
        {phase === 'playing' && match && (
          <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <DuelGame
              match={match}
              userId={user?.id}
              onFinished={handleFinished}
            />
          </motion.div>
        )}
        {phase === 'finished' && finishResult && match && (
          <motion.div key="finished" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <DuelFinish
              result={finishResult}
              match={match}
              userId={user?.id}
              onRematch={handleNewOpponent}
              onNewOpponent={handleNewOpponent}
              onExit={handleExit}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
