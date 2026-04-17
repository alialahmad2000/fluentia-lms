import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, Swords, Flame, Target, Zap, BookOpen, Star, Trophy, Users, ExternalLink } from 'lucide-react'
import {
  useActiveCompetition,
  useCompetitionContext,
  useCompetitionLeaderboard,
  useCompetitionFeed,
} from '../../hooks/useCompetition'
import EncourageButton from '../../components/competition/EncourageButton'

/* ─── helpers ─────────────────────────────────────────────────── */
function plural(n, one, few, many) {
  if (n === 1) return one
  if (n >= 2 && n <= 10) return few
  return many
}

function formatSeconds(sec) {
  const days = Math.floor(sec / 86400)
  const hours = Math.floor((sec % 86400) / 3600)
  const mins = Math.floor((sec % 3600) / 60)
  if (days > 0) return { value: days, label: plural(days, 'يوم', 'أيام', 'يوم') }
  if (hours > 0) return { value: hours, label: 'ساعة' }
  return { value: mins, label: 'دقيقة' }
}

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (diff < 60) return 'الآن'
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} د`
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} س`
  return `منذ ${Math.floor(diff / 86400)} يوم`
}

function reasonLabel(reason) {
  const map = {
    xp_earned: 'نقاط XP',
    lesson_completed: 'درس مكتمل',
    streak_bonus: 'مكافأة سلسلة',
    challenge_completed: 'تحدي مكتمل',
    peer_recognition: 'تشجيع زملاء',
    weekly_goal: 'هدف أسبوعي',
    duel_win: 'فوز في مبارزة',
  }
  return map[reason] || reason
}

/* ─── CountdownHero ───────────────────────────────────────────── */
function CountdownHero({ comp }) {
  const { value, label } = formatSeconds(comp.seconds_remaining ?? 0)
  const ended = (comp.seconds_remaining ?? 0) <= 0
  const teamA = comp.team_a
  const teamB = comp.team_b

  return (
    <div
      className="rounded-2xl overflow-hidden relative"
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* glow blobs */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 60% 50% at 20% 50%, ${teamA.color}18 0%, transparent 70%),
                       radial-gradient(ellipse 60% 50% at 80% 50%, ${teamB.color}18 0%, transparent 70%)`,
        }}
      />

      <div className="relative px-6 pt-6 pb-5 text-center" dir="rtl">
        {/* title */}
        <div className="flex items-center justify-center gap-2 mb-1">
          <Swords size={20} className="text-sky-400" />
          <span className="text-sky-400 font-bold text-sm tracking-wide font-['Tajawal']">{comp.name}</span>
        </div>

        {/* countdown */}
        <div className="my-4">
          {ended ? (
            <span className="text-3xl font-black text-white font-['Tajawal']">انتهت المسابقة</span>
          ) : (
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-6xl font-black text-white tabular-nums" style={{ fontFamily: 'Tajawal, sans-serif' }}>
                {value}
              </span>
              <span className="text-2xl font-bold text-slate-400 font-['Tajawal']">{label} متبقية</span>
            </div>
          )}
        </div>

        {/* mini score bar */}
        <div className="flex items-center justify-center gap-3 mt-2">
          <span className="text-sm font-bold" style={{ color: teamA.color, fontFamily: 'Tajawal' }}>
            {teamA.emoji} {teamA.name}
          </span>
          <span className="text-lg font-black text-white tabular-nums font-['Tajawal']">
            {teamA.victory_points}
          </span>
          <span className="text-slate-500 font-bold">vs</span>
          <span className="text-lg font-black text-white tabular-nums font-['Tajawal']">
            {teamB.victory_points}
          </span>
          <span className="text-sm font-bold" style={{ color: teamB.color, fontFamily: 'Tajawal' }}>
            {teamB.emoji} {teamB.name}
          </span>
        </div>
      </div>
    </div>
  )
}

/* ─── VsArena ─────────────────────────────────────────────────── */
function VsArena({ comp, myTeam, oppTeam }) {
  const teamA = comp.team_a
  const teamB = comp.team_b
  const total = teamA.victory_points + teamB.victory_points || 1
  const aWidth = Math.round((teamA.victory_points / total) * 100)
  const bWidth = 100 - aWidth

  const leader = teamA.victory_points >= teamB.victory_points ? teamA : teamB
  const gap = Math.abs(teamA.victory_points - teamB.victory_points)

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        fontFamily: 'Tajawal, sans-serif',
      }}
      dir="rtl"
    >
      <div className="text-xs font-bold text-slate-500 mb-3 text-center">نقاط النصر (VP)</div>

      {/* score cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[teamA, teamB].map((t) => {
          const isMe = myTeam?.name === t.name
          return (
            <div
              key={t.name}
              className="rounded-xl p-4 text-center relative overflow-hidden"
              style={{
                background: `${t.color}12`,
                border: `1px solid ${t.color}${isMe ? '55' : '25'}`,
                boxShadow: isMe ? `0 0 16px ${t.color}22` : undefined,
              }}
            >
              {isMe && (
                <div
                  className="absolute top-1.5 left-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-full"
                  style={{ background: t.color, color: '#0f172a' }}
                >
                  فريقي
                </div>
              )}
              <div className="text-2xl mb-1">{t.emoji}</div>
              <div className="font-bold text-white text-sm mb-1">{t.name}</div>
              <div className="text-3xl font-black tabular-nums" style={{ color: t.color }}>{t.victory_points}</div>
              <div className="text-slate-500 text-xs mt-1">VP</div>
            </div>
          )
        })}
      </div>

      {/* progress bar */}
      <div className="h-3 rounded-full overflow-hidden flex" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <div
          className="h-full transition-all duration-700"
          style={{ width: `${aWidth}%`, background: teamA.color, minWidth: gap === 0 ? '50%' : undefined }}
        />
        <div
          className="h-full transition-all duration-700"
          style={{ width: `${bWidth}%`, background: teamB.color }}
        />
      </div>

      {/* leader text */}
      <div className="text-center mt-3 text-sm font-bold font-['Tajawal']">
        {gap === 0 ? (
          <span className="text-slate-400">تعادل تام — كل VP قيّمة!</span>
        ) : (
          <span style={{ color: leader.color }}>
            {leader.emoji} {leader.name} يتقدم بـ {gap} نقطة
          </span>
        )}
      </div>
    </div>
  )
}

/* ─── MyContributionCard ──────────────────────────────────────── */
function MyContributionCard({ ctx, myTeam }) {
  if (!ctx?.in_competition) return null
  const color = myTeam?.color ?? '#38bdf8'
  const rankLabel = ctx.my_rank
    ? `#${ctx.my_rank} من ${ctx.team_size}`
    : '—'

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: `${color}10`,
        border: `1px solid ${color}30`,
        fontFamily: 'Tajawal, sans-serif',
      }}
      dir="rtl"
    >
      <div className="text-xs font-bold text-slate-400 mb-4">مساهمتي في الفريق</div>
      <div className="grid grid-cols-2 gap-3">
        <div className="text-center">
          <div className="text-3xl font-black tabular-nums" style={{ color }}>{ctx.my_xp_this_competition ?? 0}</div>
          <div className="text-xs text-slate-500 mt-1">XP أضفته</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-black tabular-nums" style={{ color }}>{rankLabel}</div>
          <div className="text-xs text-slate-500 mt-1">ترتيبي بالفريق</div>
        </div>
      </div>
    </div>
  )
}

/* ─── TeamSpiritRow ───────────────────────────────────────────── */
function TeamSpiritRow({ ctx, myTeam }) {
  if (!ctx?.in_competition) return null
  const color = myTeam?.color ?? '#38bdf8'
  const streak = ctx.streak_days ?? 0
  const goalPct = Math.min(100, Math.round(ctx.weekly_goal_pct ?? 0))

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        fontFamily: 'Tajawal, sans-serif',
      }}
      dir="rtl"
    >
      <div className="text-xs font-bold text-slate-400 mb-4">روح الفريق</div>
      <div className="grid grid-cols-2 gap-4">
        {/* streak */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(251,146,60,0.15)' }}
          >
            <Flame size={20} style={{ color: '#fb923c' }} />
          </div>
          <div>
            <div className="text-xl font-black text-white tabular-nums">{streak}</div>
            <div className="text-xs text-slate-500">يوم متواصل</div>
          </div>
        </div>

        {/* weekly goal */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target size={16} style={{ color }} />
              <span className="text-xs text-slate-400">الهدف الأسبوعي</span>
            </div>
            <span className="text-sm font-bold" style={{ color }}>{goalPct}%</span>
          </div>
          <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${goalPct}%`, background: color }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── MVPPodium ───────────────────────────────────────────────── */
function MemberAvatar({ name, url, size = 36 }) {
  return (
    <div
      title={name}
      style={{
        width: size, height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        background: 'rgba(255,255,255,0.08)',
        border: '2px solid rgba(255,255,255,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.6)',
        flexShrink: 0,
      }}
    >
      {url ? (
        <img src={url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        (name || '?').charAt(0)
      )}
    </div>
  )
}

function RankBadge({ rank }) {
  const medals = { 1: '🥇', 2: '🥈', 3: '🥉' }
  if (medals[rank]) return <span className="text-lg">{medals[rank]}</span>
  return <span className="text-xs font-black text-slate-400 w-6 text-center">#{rank}</span>
}

function MVPPodium({ competitionId, team, teamData, defaultExpanded = true, showEncourage = false, myProfileId }) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const { data: leaders, isLoading } = useCompetitionLeaderboard(competitionId, team, 10)

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${teamData.color}25`,
        fontFamily: 'Tajawal, sans-serif',
      }}
      dir="rtl"
    >
      {/* header */}
      <button
        className="w-full flex items-center justify-between px-5 py-4"
        onClick={() => setExpanded((v) => !v)}
        style={{ background: `${teamData.color}10`, cursor: 'pointer' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">{teamData.emoji}</span>
          <span className="font-bold text-white text-sm">{teamData.name}</span>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-bold"
            style={{ background: teamData.color, color: '#0f172a' }}
          >
            {teamData.victory_points} VP
          </span>
        </div>
        {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>

      {/* list */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="list"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-4 py-3 space-y-2">
              {isLoading && (
                <div className="text-center text-slate-500 text-sm py-4">جاري التحميل...</div>
              )}
              {!isLoading && (!leaders || leaders.length === 0) && (
                <div className="text-center text-slate-500 text-sm py-4">لا توجد بيانات بعد</div>
              )}
              {(leaders || []).map((p, i) => (
                <div key={p.profile_id} className="flex items-center gap-2 py-1">
                  <RankBadge rank={i + 1} />
                  <MemberAvatar name={p.display_name} url={p.avatar_url} size={32} />
                  <span className="flex-1 text-sm text-white font-medium truncate">{p.display_name}</span>
                  <span className="text-sm font-bold tabular-nums" style={{ color: teamData.color }}>
                    {p.xp_total} XP
                  </span>
                  {showEncourage && (
                    <EncourageButton
                      studentId={p.profile_id}
                      studentName={p.display_name}
                      size="sm"
                    />
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── LiveFeed ────────────────────────────────────────────────── */
function FeedIcon({ reason }) {
  const icons = {
    lesson_completed: <BookOpen size={14} className="text-sky-400" />,
    challenge_completed: <Star size={14} className="text-yellow-400" />,
    streak_bonus: <Flame size={14} className="text-orange-400" />,
    peer_recognition: <Users size={14} className="text-purple-400" />,
    weekly_goal: <Target size={14} className="text-green-400" />,
    duel_win: <Swords size={14} className="text-red-400" />,
  }
  return icons[reason] ?? <Zap size={14} className="text-slate-400" />
}

function LiveFeed({ competitionId }) {
  const { data: feed, isLoading } = useCompetitionFeed(competitionId, 20)

  return (
    <div
      className="rounded-2xl"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        fontFamily: 'Tajawal, sans-serif',
      }}
      dir="rtl"
    >
      <div className="px-5 py-4 border-b border-white/[0.05] flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="font-bold text-white text-sm">النشاط المباشر</span>
      </div>

      <div className="divide-y divide-white/[0.04] max-h-80 overflow-y-auto">
        {isLoading && (
          <div className="text-center text-slate-500 text-sm py-8">جاري التحميل...</div>
        )}
        {!isLoading && (!feed || feed.length === 0) && (
          <div className="text-center text-slate-500 text-sm py-8">لا يوجد نشاط بعد — كن أول من يشارك!</div>
        )}
        {(feed || []).map((item) => (
          <div key={item.id} className="flex items-center gap-3 px-5 py-3">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <FeedIcon reason={item.reason} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm text-white font-medium">{item.student_name}</span>
              <span className="text-xs text-slate-400 mr-2">{item.emoji}</span>
              <span className="text-xs text-slate-500 block">{reasonLabel(item.reason)}</span>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-sm font-bold text-green-400 tabular-nums">+{item.xp_earned}</div>
              <div className="text-xs text-slate-600">{timeAgo(item.earned_at)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── HowToEarnQuickRef ───────────────────────────────────────── */
const EARN_TIPS = [
  { icon: <BookOpen size={16} />, color: '#38bdf8', label: 'أتمم درسًا', value: '+5 VP' },
  { icon: <Star size={16} />, color: '#facc15', label: 'أنهِ تحديًا يوميًا', value: '+3 VP' },
  { icon: <Flame size={16} />, color: '#fb923c', label: 'سلسلة 7 أيام', value: '+10 VP' },
  { icon: <Swords size={16} />, color: '#f43f5e', label: 'فوز في مبارزة', value: '+8 VP' },
  { icon: <Target size={16} />, color: '#34d399', label: 'هدف أسبوعي 100%', value: '+15 VP' },
  { icon: <Users size={16} />, color: '#a78bfa', label: 'تشجيع زميل', value: '+1 VP' },
]

function HowToEarnQuickRef({ onViewFull }) {
  const [open, setOpen] = useState(false)

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        fontFamily: 'Tajawal, sans-serif',
      }}
      dir="rtl"
    >
      <div className="flex items-center justify-between px-5 py-4">
        <button
          className="flex items-center gap-2"
          onClick={() => setOpen((v) => !v)}
          style={{ cursor: 'pointer', background: 'none', border: 'none' }}
        >
          <Trophy size={18} className="text-yellow-400" />
          <span className="font-bold text-white text-sm">كيف تكسب نقاط VP؟</span>
          {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </button>
        <button
          onClick={onViewFull}
          className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300"
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <ExternalLink size={12} />
          الدليل الكامل
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="tips"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 px-5 pb-5">
              {EARN_TIPS.map((tip) => (
                <div
                  key={tip.label}
                  className="rounded-xl p-3 flex flex-col gap-1.5"
                  style={{ background: `${tip.color}10`, border: `1px solid ${tip.color}20` }}
                >
                  <div style={{ color: tip.color }}>{tip.icon}</div>
                  <div className="text-xs text-slate-300 leading-snug">{tip.label}</div>
                  <div className="text-sm font-black" style={{ color: tip.color }}>{tip.value}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── NotInCompetitionBanner ──────────────────────────────────── */
function NotInCompetitionBanner({ comp }) {
  return (
    <div
      className="rounded-2xl p-6 text-center"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        fontFamily: 'Tajawal, sans-serif',
      }}
      dir="rtl"
    >
      <div className="text-3xl mb-3">👀</div>
      <div className="font-bold text-white mb-1">أنت متفرج الآن</div>
      <div className="text-sm text-slate-400">لست مسجلًا في هذه المسابقة — يمكنك متابعة المعركة!</div>
    </div>
  )
}

/* ─── Main Page ───────────────────────────────────────────────── */
export default function CompetitionHub() {
  const navigate = useNavigate()
  const { data: comp, isLoading: compLoading } = useActiveCompetition()
  const { data: ctx, isLoading: ctxLoading } = useCompetitionContext()

  const myTeam = useMemo(() => {
    if (!comp || !ctx?.in_competition) return null
    return ctx.team === 'A' ? comp.team_a : comp.team_b
  }, [comp, ctx])

  const oppTeam = useMemo(() => {
    if (!comp || !ctx?.in_competition) return null
    return ctx.team === 'A' ? comp.team_b : comp.team_a
  }, [comp, ctx])

  if (compLoading || ctxLoading) {
    return (
      <div className="flex items-center justify-center py-24" dir="rtl" style={{ fontFamily: 'Tajawal, sans-serif' }}>
        <div className="text-slate-400">جاري التحميل...</div>
      </div>
    )
  }

  if (!comp || comp.status !== 'active') {
    return (
      <div className="max-w-lg mx-auto py-24 text-center" dir="rtl" style={{ fontFamily: 'Tajawal, sans-serif' }}>
        <div className="text-4xl mb-4">⚔️</div>
        <div className="font-bold text-white text-xl mb-2">لا توجد مسابقة نشطة</div>
        <div className="text-slate-400 text-sm">ترقّب — المعركة القادمة ستكون أضخم!</div>
      </div>
    )
  }

  return (
    <div
      className="space-y-4 pb-8"
      style={{ maxWidth: 720, margin: '0 auto', fontFamily: 'Tajawal, sans-serif' }}
      dir="rtl"
    >
      {/* 1. Countdown Hero */}
      <CountdownHero comp={comp} />

      {/* 2. VS Arena */}
      <VsArena comp={comp} myTeam={myTeam} oppTeam={oppTeam} />

      {/* 3. My Contribution (if participating) */}
      {ctx?.in_competition ? (
        <MyContributionCard ctx={ctx} myTeam={myTeam} />
      ) : (
        <NotInCompetitionBanner comp={comp} />
      )}

      {/* 4. Team Spirit Row (if participating) */}
      {ctx?.in_competition && <TeamSpiritRow ctx={ctx} myTeam={myTeam} />}

      {/* 5. MVP Podiums */}
      <div className="space-y-3">
        <div className="text-xs font-bold text-slate-500 px-1">لوحة المتصدرين</div>
        {ctx?.in_competition && myTeam ? (
          <>
            <MVPPodium
              competitionId={comp.id}
              team={ctx.team}
              teamData={myTeam}
              defaultExpanded={true}
              showEncourage={true}
            />
            <MVPPodium
              competitionId={comp.id}
              team={ctx.team === 'A' ? 'B' : 'A'}
              teamData={oppTeam}
              defaultExpanded={false}
            />
          </>
        ) : (
          <>
            <MVPPodium competitionId={comp.id} team="A" teamData={comp.team_a} defaultExpanded={true} />
            <MVPPodium competitionId={comp.id} team="B" teamData={comp.team_b} defaultExpanded={false} />
          </>
        )}
      </div>

      {/* 6. Live Feed */}
      <LiveFeed competitionId={comp.id} />

      {/* 7. How to Earn */}
      <HowToEarnQuickRef onViewFull={() => navigate('/student/how-to-earn')} />

      <div className="h-2" aria-hidden="true" />
    </div>
  )
}
