import { useState, useRef, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Gift,
  Copy,
  Check,
  Share2,
  Users,
  Trophy,
  Star,
  Crown,
  Zap,
  Medal,
  ExternalLink,
  MessageCircle,
  Twitter,
  Link2,
  Camera,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Deterministic code from profile id: first 5 chars of UUID (uppercased) + 3-digit suffix */
function buildReferralCode(profileId) {
  if (!profileId) return '...'
  const clean = profileId.replace(/-/g, '')
  return clean.slice(0, 5).toUpperCase() + clean.slice(-3).toUpperCase()
}

const BASE_URL = 'https://fluentia-site.vercel.app'

const TIERS = [
  {
    count: 1,
    xp: 200,
    badge: null,
    title: null,
    reward: '200 XP',
    color: 'sky',
    Icon: Zap,
  },
  {
    count: 3,
    xp: 500,
    badge: 'سفير طلاقة',
    title: null,
    reward: '500 XP + شارة "سفير طلاقة"',
    color: 'emerald',
    Icon: Star,
  },
  {
    count: 5,
    xp: 1000,
    badge: null,
    title: null,
    reward: '1000 XP + شهر مجاني',
    color: 'gold',
    Icon: Gift,
  },
  {
    count: 10,
    xp: 2000,
    badge: null,
    title: 'أسطورة الإحالات',
    reward: '2000 XP + لقب "أسطورة الإحالات"',
    color: 'violet',
    Icon: Crown,
  },
]

const TIER_STYLES = {
  sky:    { card: 'bg-sky-500/10 border-sky-500/30',    text: 'text-sky-400',    badge: 'badge-sky' },
  emerald:{ card: 'bg-emerald-500/10 border-emerald-500/30', text: 'text-emerald-400', badge: 'badge-emerald' },
  gold:   { card: 'bg-gold-500/10 border-gold-500/30',  text: 'text-gold-400',   badge: 'badge-gold' },
  violet: { card: 'bg-violet-500/10 border-violet-500/30', text: 'text-violet-400', badge: 'badge-violet' },
}

// ─── copy hook ────────────────────────────────────────────────────────────────

function useCopy(timeout = 2000) {
  const [copied, setCopied] = useState(false)
  const copy = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), timeout)
    } catch {
      // fallback for older browsers
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), timeout)
    }
  }, [timeout])
  return { copied, copy }
}

// ─── sub-components ────────────────────────────────────────────────────────────

function CopyButton({ text, label = 'نسخ', labelDone = 'تم النسخ', size = 'md' }) {
  const { copied, copy } = useCopy()
  const base = 'inline-flex items-center gap-1.5 rounded-xl font-medium transition-all active:scale-95'
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-sm',
  }
  return (
    <button
      onClick={() => copy(text)}
      className={`${base} ${sizes[size]} ${
        copied
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          : 'bg-[var(--surface-raised)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:bg-[var(--sidebar-hover-bg)]'
      }`}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? labelDone : label}
    </button>
  )
}

// ─── Referral Card (visual screenshot-able card) ──────────────────────────────

function ReferralCard({ name, code, referralLink }) {
  const [screenshotMsg, setScreenshotMsg] = useState(false)

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'أكاديمية طلاقة | Fluentia Academy',
          text: `انضم إلى أكاديمية طلاقة لتعلم الإنجليزية — احجز لقاءك المبدئي المجاني مع المدرب الآن!\n\n${referralLink}`,
          url: referralLink,
        })
      } catch { /* user cancelled */ }
    } else {
      setScreenshotMsg(true)
      setTimeout(() => setScreenshotMsg(false), 3000)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.15 }}
      className="space-y-3"
    >
      {/* The card itself */}
      <div
        id="referral-card"
        className="relative overflow-hidden rounded-3xl p-6 select-none"
        style={{
          background: 'var(--hero-card-bg)',
          border: '1px solid rgba(251,191,36,0.25)',
          boxShadow: '0 0 60px rgba(251,191,36,0.08), 0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Gold shimmer top stripe */}
        <div
          className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl"
          style={{ background: 'linear-gradient(90deg, transparent, #fbbf24, #fde68a, #fbbf24, transparent)' }}
        />

        {/* Background glow blobs */}
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #fbbf24 0%, transparent 70%)' }} />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full opacity-8"
          style={{ background: 'radial-gradient(circle, #38bdf8 0%, transparent 70%)' }} />

        {/* Academy header */}
        <div className="relative flex items-center justify-between mb-6">
          <div>
            <p className="text-xs font-medium text-gold-400 tracking-widest uppercase">أكاديمية</p>
            <h2
              className="text-2xl font-black tracking-tight"
              style={{ background: 'linear-gradient(90deg, #fbbf24, #fde68a, #fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              طلاقة
            </h2>
            <p className="text-xs text-[var(--text-secondary)] -mt-0.5">Fluentia Academy</p>
          </div>
          <div className="text-left">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black"
              style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.2), rgba(251,191,36,0.05))', border: '1px solid rgba(251,191,36,0.3)' }}
            >
              🎓
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="relative h-px mb-5" style={{ background: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.3), transparent)' }} />

        {/* Invitation text */}
        <div className="relative mb-5">
          <p className="text-[var(--text-secondary)] text-xs mb-1">دعوة شخصية من</p>
          <p className="text-white text-xl font-bold">{name || 'الطالب'}</p>
          <p className="text-[var(--text-secondary)] text-xs mt-2 leading-relaxed">
            احجز <span className="text-gold-400 font-semibold">لقاءً مبدئياً مجانياً مع المدرب</span> وابدأ رحلتك في تعلم الإنجليزية
          </p>
        </div>

        {/* Referral Code Box */}
        <div
          className="relative rounded-2xl p-4 mb-5"
          style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)' }}
        >
          <p className="text-gold-400/70 text-xs font-medium tracking-widest uppercase mb-1">كود الإحالة</p>
          <p
            className="text-3xl font-black tracking-[0.2em] text-center"
            style={{ background: 'linear-gradient(90deg, #fbbf24, #fde68a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
          >
            {code}
          </p>
        </div>

        {/* Social links */}
        <div className="relative flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <div className="space-y-0.5">
            <p>📱 +966 55 866 9974</p>
            <p>🎵 TikTok: @fluentia_</p>
          </div>
          <div className="space-y-0.5 text-left">
            <p>📸 Instagram: @fluentia__</p>
            <p className="text-muted truncate max-w-[130px]">{referralLink}</p>
          </div>
        </div>

        {/* Gold bottom stripe */}
        <div
          className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-3xl"
          style={{ background: 'linear-gradient(90deg, transparent, #fbbf24, #fde68a, #fbbf24, transparent)' }}
        />
      </div>

      {/* Card actions */}
      <div className="flex gap-2">
        <button
          onClick={handleShare}
          className="flex-1 btn-gold flex items-center justify-center gap-2 py-2.5 text-sm"
        >
          <Share2 size={16} />
          مشاركة البطاقة
        </button>
        <button
          onClick={() => {
            setScreenshotMsg(true)
            setTimeout(() => setScreenshotMsg(false), 3500)
          }}
          className="btn-secondary flex items-center gap-2 py-2.5 px-4 text-sm"
        >
          <Camera size={16} />
          لقطة شاشة
        </button>
      </div>

      <AnimatePresence>
        {screenshotMsg && (
          <motion.p
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center text-xs text-gold-400"
          >
            خذ لقطة شاشة وشاركها مع أصدقائك ✨
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function StudentReferral() {
  const { profile } = useAuthStore()
  const [activeTab, setActiveTab] = useState('share') // 'share' | 'card' | 'leaderboard'
  const { copied: codeCopied, copy: copyCode } = useCopy()
  const { copied: linkCopied, copy: copyLink } = useCopy()

  const referralCode = buildReferralCode(profile?.id)
  const referralLink = `${BASE_URL}?ref=${referralCode}`
  const displayName  = profile?.full_name || profile?.display_name || 'الطالب'

  // ── My referral count ──
  const { data: myReferrals, isLoading: loadingMine } = useQuery({
    queryKey: ['my-referrals', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('students')
        .select('id, profiles(full_name, display_name)')
        .eq('referred_by', referralCode)
        .is('deleted_at', null)
      return data || []
    },
    enabled: !!profile?.id,
  })

  // ── Referral leaderboard (top referrers across academy) ──
  const { data: leaderboard, isLoading: loadingLB } = useQuery({
    queryKey: ['referral-leaderboard'],
    queryFn: async () => {
      // Fetch all students with a referred_by code (non-null) + their referrer profile
      const { data: referred } = await supabase
        .from('students')
        .select('referred_by')
        .not('referred_by', 'is', null)
        .is('deleted_at', null)

      if (!referred || referred.length === 0) return []

      // Count per code
      const countMap = {}
      referred.forEach(r => {
        if (r.referred_by) {
          countMap[r.referred_by] = (countMap[r.referred_by] || 0) + 1
        }
      })

      // Get top 10 sorted
      const sorted = Object.entries(countMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)

      // We don't have a direct code→profile lookup without a dedicated column,
      // so we fetch profiles that have a matching referral_code if it exists,
      // otherwise fall back to building the code from profile id.
      const { data: allStudents } = await supabase
        .from('students')
        .select('id, referred_by, profiles(full_name, display_name)')
        .is('deleted_at', null)

      // Build code→name map by computing the code for each student
      const codeToName = {}
      ;(allStudents || []).forEach(s => {
        const code = buildReferralCode(s.id)
        const sp = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles
        codeToName[code] = sp?.full_name || sp?.display_name || 'طالب'
      })

      return sorted.map(([code, count], i) => ({
        code,
        count,
        rank: i + 1,
        name: codeToName[code] || 'طالب',
        isMe: code === referralCode,
      }))
    },
    enabled: !!profile?.id,
  })

  const referralCount = myReferrals?.length || 0

  // Determine unlocked tiers
  const unlockedTiers = TIERS.filter(t => referralCount >= t.count)
  const nextTier = TIERS.find(t => referralCount < t.count)

  // Share handlers
  const shareWhatsApp = () => {
    const text = encodeURIComponent(
      `🎓 انضم إلى أكاديمية طلاقة وابدأ رحلتك مع اللغة الإنجليزية!\n\nاحجز لقاءً مبدئياً مجانياً مع المدرب الآن 👇\n${referralLink}\n\nكود الإحالة: ${referralCode}`
    )
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener')
  }

  const shareTwitter = () => {
    const text = encodeURIComponent(
      `🎓 انضم إلى أكاديمية طلاقة لتعلم الإنجليزية!\nاحجز لقاءً مبدئياً مجانياً مع المدرب: ${referralLink} #طلاقة #تعلم_الإنجليزية`
    )
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank', 'noopener')
  }

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'أكاديمية طلاقة | Fluentia Academy',
          text: `احجز لقاءك المبدئي المجاني مع المدرب الآن! كود الإحالة: ${referralCode}`,
          url: referralLink,
        })
      } catch { /* cancelled */ }
    }
  }

  const TABS = [
    { value: 'share',       label: 'المشاركة',   Icon: Share2  },
    { value: 'card',        label: 'البطاقة',    Icon: Camera  },
    { value: 'leaderboard', label: 'المتصدرون',  Icon: Trophy  },
  ]

  const LEADERBOARD_RANK_STYLES = {
    0: { bg: 'bg-gold-500/10',   border: 'border-gold-500/30',   text: 'text-gold-400',   Icon: Crown  },
    1: { bg: 'bg-slate-300/10',  border: 'border-slate-300/30',  text: 'text-slate-300',  Icon: Medal  },
    2: { bg: 'bg-amber-600/10',  border: 'border-amber-600/30',  text: 'text-amber-500',  Icon: Medal  },
  }

  return (
    <div className="space-y-12">

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-page-title flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold-500/10 flex items-center justify-center">
            <Gift size={20} className="text-gold-400" />
          </div>
          برنامج الإحالة
        </h1>
        <p className="text-muted text-sm mt-1">ادعُ أصدقاءك واكسب نقاط XP وجوائز حصرية</p>
      </motion.div>

      {/* ── Stats strip ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6"
      >
        {/* Total referrals */}
        <div className="fl-card-static p-4 text-center hover:translate-y-[-2px] transition-all duration-200">
          <p className="text-2xl font-black text-gold-400">
            {loadingMine ? <span className="skeleton inline-block w-8 h-7 rounded" /> : referralCount}
          </p>
          <p className="text-xs text-muted mt-1">إحالة ناجحة</p>
        </div>

        {/* XP earned */}
        <div className="fl-card-static p-4 text-center hover:translate-y-[-2px] transition-all duration-200">
          <p className="text-2xl font-black text-sky-400">
            {unlockedTiers.length > 0
              ? unlockedTiers[unlockedTiers.length - 1].xp
              : 0}
          </p>
          <p className="text-xs text-muted mt-1">XP مكتسب</p>
        </div>

        {/* Next milestone */}
        <div className="fl-card-static p-4 text-center hover:translate-y-[-2px] transition-all duration-200">
          <p className="text-2xl font-black text-emerald-400">
            {nextTier ? nextTier.count - referralCount : '✓'}
          </p>
          <p className="text-xs text-muted mt-1">
            {nextTier ? `حتى المكافأة التالية` : 'أكملت الجميع!'}
          </p>
        </div>
      </motion.div>

      {/* ── Next tier progress banner ── */}
      {nextTier && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="fl-card-static p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-[var(--text-primary)] font-medium">المكافأة القادمة</p>
            <span className="badge-gold">{nextTier.reward}</span>
          </div>
          <div className="w-full rounded-full h-2" style={{ background: 'var(--surface-raised)' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((referralCount / nextTier.count) * 100, 100)}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
              className="h-2 rounded-full"
              style={{ background: 'linear-gradient(90deg, #fbbf24, #fde68a)' }}
            />
          </div>
          <p className="text-xs text-muted mt-1.5">
            {referralCount} / {nextTier.count} إحالات
          </p>
        </motion.div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-2">
        {TABS.map(t => (
          <button
            key={t.value}
            onClick={() => setActiveTab(t.value)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === t.value
                ? 'bg-gold-500/10 text-gold-400 border border-gold-500/20'
                : 'text-muted hover:text-[var(--text-primary)] border border-transparent'
            }`}
            style={activeTab !== t.value ? { background: 'var(--surface-raised)' } : undefined}
          >
            <t.Icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══════════════ TAB: SHARE ═══════════════ */}
      <AnimatePresence mode="wait">
        {activeTab === 'share' && (
          <motion.div
            key="share"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-4"
          >
            {/* Referral code */}
            <div className="fl-card-static p-7">
              <p className="text-xs text-muted mb-2 flex items-center gap-1">
                <Link2 size={12} />
                كود الإحالة الخاص بك
              </p>
              <div className="flex items-center justify-between gap-3">
                <p
                  className="text-3xl font-black tracking-[0.15em]"
                  style={{ background: 'linear-gradient(90deg, #fbbf24, #fde68a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
                >
                  {referralCode}
                </p>
                <button
                  onClick={() => copyCode(referralCode)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all active:scale-95 ${
                    codeCopied
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'btn-gold'
                  }`}
                >
                  {codeCopied ? <Check size={15} /> : <Copy size={15} />}
                  {codeCopied ? 'تم!' : 'نسخ'}
                </button>
              </div>
            </div>

            {/* Referral link */}
            <div className="fl-card-static p-7">
              <p className="text-xs text-muted mb-2 flex items-center gap-1">
                <ExternalLink size={12} />
                رابط الإحالة
              </p>
              <div className="flex items-center gap-2">
                <p className="flex-1 text-sm text-[var(--text-secondary)] font-mono truncate rounded-xl px-3 py-2 border border-[var(--border-subtle)]" style={{ background: 'var(--surface-raised)' }}>
                  {referralLink}
                </p>
                <CopyButton text={referralLink} size="sm" />
              </div>
            </div>

            {/* CTA note */}
            <div className="fl-card-static p-4 border-gold-500/20" style={{ borderColor: 'rgba(251,191,36,0.15)' }}>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed text-center">
                أرسل لأصدقائك رابطك واطلب منهم حجز{' '}
                <span className="text-gold-400 font-semibold">لقاء مبدئي مجاني مع المدرب</span>{' '}
                — وعندما ينضمون تربح XP 🎉
              </p>
            </div>

            {/* Share buttons */}
            <div className="space-y-2">
              <p className="text-xs text-muted">خيارات المشاركة</p>
              <div className="grid grid-cols-2 gap-6">

                {/* WhatsApp */}
                <button
                  onClick={shareWhatsApp}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all active:scale-95 bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20 hover:bg-[#25D366]/20"
                >
                  <MessageCircle size={16} />
                  واتساب
                </button>

                {/* Twitter / X */}
                <button
                  onClick={shareTwitter}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all active:scale-95 bg-[var(--surface-raised)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:bg-[var(--sidebar-hover-bg)]"
                >
                  <Twitter size={16} />
                  تويتر / X
                </button>

                {/* Copy link */}
                <button
                  onClick={() => copyLink(referralLink)}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all active:scale-95 ${
                    linkCopied
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-[var(--surface-raised)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:bg-[var(--sidebar-hover-bg)]'
                  }`}
                >
                  {linkCopied ? <Check size={16} /> : <Copy size={16} />}
                  {linkCopied ? 'تم النسخ' : 'نسخ الرابط'}
                </button>

                {/* Native share */}
                {typeof navigator !== 'undefined' && navigator.share && (
                  <button
                    onClick={shareNative}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all active:scale-95 bg-sky-500/10 text-sky-400 border border-sky-500/20 hover:bg-sky-500/20"
                  >
                    <Share2 size={16} />
                    مشاركة
                  </button>
                )}
              </div>
            </div>

            {/* Rewards tiers */}
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-1.5">
                <Zap size={15} className="text-gold-400" />
                مستويات المكافآت
              </h2>
              <div className="space-y-2">
                {TIERS.map((tier, i) => {
                  const unlocked = referralCount >= tier.count
                  const style = TIER_STYLES[tier.color]
                  return (
                    <motion.div
                      key={tier.count}
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 + i * 0.06 }}
                      className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                        unlocked
                          ? `${style.card}`
                          : 'bg-[var(--surface-raised)] border-[var(--border-subtle)] opacity-60'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        unlocked ? `${style.card}` : ''
                      }`}
                        style={!unlocked ? { background: 'var(--surface-raised)' } : undefined}
                      >
                        <tier.Icon size={18} className={unlocked ? style.text : 'text-muted'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-[var(--text-primary)]">
                            {tier.count} {tier.count === 1 ? 'إحالة' : 'إحالات'}
                          </span>
                          {tier.badge && (
                            <span className={style.badge}>
                              {tier.badge}
                            </span>
                          )}
                          {tier.title && (
                            <span className={style.badge}>
                              {tier.title}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted mt-0.5">{tier.reward}</p>
                      </div>
                      <div className="shrink-0">
                        {unlocked ? (
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center ${style.card}`}>
                            <Check size={14} className={style.text} />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'var(--surface-raised)' }}>
                            <span className="text-xs font-bold text-muted">{tier.count - referralCount}</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>

            {/* Who used your code */}
            {referralCount > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-1.5">
                  <Users size={15} className="text-sky-400" />
                  من انضم بإحالتك ({referralCount})
                </h2>
                <div className="space-y-2">
                  {myReferrals?.map((r, i) => {
                    const rProfile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles
                    const rName = rProfile?.full_name || rProfile?.display_name || 'طالب جديد'
                    return (
                      <motion.div
                        key={r.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="fl-card-static p-3 flex items-center gap-3"
                      >
                        <div className="w-9 h-9 rounded-full bg-sky-500/20 border border-sky-500/20 flex items-center justify-center text-sky-400 font-bold text-sm shrink-0">
                          {rName?.[0]}
                        </div>
                        <p className="text-sm text-[var(--text-primary)]">{rName}</p>
                        <span className="mr-auto badge-emerald">انضم</span>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ═══════════════ TAB: CARD ═══════════════ */}
        {activeTab === 'card' && (
          <motion.div
            key="card"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
          >
            <ReferralCard
              name={displayName}
              code={referralCode}
              referralLink={referralLink}
            />
          </motion.div>
        )}

        {/* ═══════════════ TAB: LEADERBOARD ═══════════════ */}
        {activeTab === 'leaderboard' && (
          <motion.div
            key="leaderboard"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-3"
          >
            <p className="text-xs text-muted">أكثر الطلاب إحالةً في الأكاديمية</p>

            {loadingLB ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="skeleton h-16 w-full rounded-2xl" />
                ))}
              </div>
            ) : leaderboard && leaderboard.length > 0 ? (
              leaderboard.map((entry, index) => {
                const style = LEADERBOARD_RANK_STYLES[index] || {}
                const RankIcon = style.Icon || null
                return (
                  <motion.div
                    key={entry.code}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.06 }}
                    className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                      entry.isMe
                        ? 'bg-sky-500/10 border-sky-500/20 ring-1 ring-sky-500/10'
                        : style.bg
                          ? `${style.bg} ${style.border}`
                          : 'border-border-subtle'
                    }`}
                    style={!entry.isMe && !style.bg ? { background: 'var(--surface-raised)' } : undefined}
                  >
                    {/* Rank badge */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                      style.text || 'text-muted'
                    } ${style.bg || ''}`}
                      style={!style.bg ? { background: 'var(--surface-raised)' } : undefined}
                    >
                      {RankIcon ? <RankIcon size={15} /> : entry.rank}
                    </div>

                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-bold shrink-0 ${
                      entry.isMe
                        ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                        : 'bg-[var(--surface-raised)] text-muted'
                    }`}>
                      {(entry.name || 'ط')[0]}
                    </div>

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {entry.name}
                        {entry.isMe && <span className="text-xs text-sky-400 mr-1">(أنت)</span>}
                      </p>
                      <p className="text-xs text-muted">{entry.code}</p>
                    </div>

                    {/* Count */}
                    <div className="text-left shrink-0">
                      <p className={`text-sm font-bold ${index === 0 ? 'text-gold-400' : 'text-[var(--text-primary)]'}`}>
                        {entry.count}
                      </p>
                      <p className="text-xs text-muted">إحالة</p>
                    </div>
                  </motion.div>
                )
              })
            ) : (
              <div className="fl-card-static p-10 text-center">
                <Trophy size={40} className="text-muted mx-auto mb-3 opacity-30" />
                <p className="text-muted">لا توجد إحالات بعد</p>
                <p className="text-xs text-muted mt-1">كن أول من يدعو صديقاً!</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
