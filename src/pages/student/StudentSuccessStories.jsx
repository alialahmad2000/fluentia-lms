import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Star, Trophy, Flame, Zap, BookOpen, Award,
  TrendingUp, Calendar, Target, Share2, Check, Copy,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import {
  shareToWhatsApp,
  shareToTwitter,
  copyToClipboard,
  generateShareText,
} from '../../utils/socialShare'

const ACHIEVEMENT_COLOR_CLASSES = {
  gold: { border: 'border-gold-500/30', bg: 'bg-gold-500/10', text: 'text-gold-400' },
  red: { border: 'border-red-500/30', bg: 'bg-red-500/10', text: 'text-red-400' },
  violet: { border: 'border-violet-500/30', bg: 'bg-violet-500/10', text: 'text-violet-400' },
  sky: { border: 'border-sky-500/30', bg: 'bg-sky-500/10', text: 'text-sky-400' },
  emerald: { border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
}

const ACHIEVEMENT_CONFIG = {
  streak_7: { title: 'سلسلة أسبوعية', icon: Flame, color: 'gold', desc: 'حققت سلسلة 7 أيام متتالية' },
  streak_30: { title: 'سلسلة شهرية', icon: Flame, color: 'red', desc: 'حققت سلسلة 30 يوم!' },
  xp_100: { title: 'جامع النقاط', icon: Zap, color: 'violet', desc: 'جمعت أكثر من 100 نقطة' },
  xp_500: { title: 'محترف النقاط', icon: Zap, color: 'gold', desc: 'جمعت أكثر من 500 نقطة' },
  xp_1000: { title: 'أسطورة النقاط', icon: Zap, color: 'red', desc: 'جمعت أكثر من 1000 نقطة!' },
  perfect_grade: { title: 'درجة كاملة', icon: Star, color: 'gold', desc: 'حصلت على A+ في واجب' },
  all_submitted: { title: 'ملتزم', icon: BookOpen, color: 'sky', desc: 'سلّمت كل واجباتك في الوقت' },
  level_up: { title: 'ترقية', icon: TrendingUp, color: 'emerald', desc: 'ارتقيت لمستوى جديد' },
  top_3: { title: 'من الأوائل', icon: Trophy, color: 'gold', desc: 'كنت ضمن أفضل 3 في مجموعتك' },
  first_assignment: { title: 'البداية', icon: Target, color: 'sky', desc: 'أكملت أول واجب لك' },
}

// ─── Share Dropdown ────────────────────────────────────────────────────────────
function ShareDropdown({ shareText, onClose }) {
  const [copied, setCopied] = useState(false)
  const ref = useRef(null)

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  async function handleCopy() {
    const ok = await copyToClipboard(shareText)
    if (ok) {
      setCopied(true)
      setTimeout(() => {
        setCopied(false)
        onClose()
      }, 1500)
    }
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.88, y: -6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.88, y: -6 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="absolute top-full left-0 mt-1.5 z-50 w-44 rounded-xl overflow-hidden shadow-xl"
      style={{
        background: 'rgba(15, 15, 30, 0.97)',
        border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(12px)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* WhatsApp */}
      <button
        onClick={() => { shareToWhatsApp(shareText); onClose() }}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-white hover:bg-[var(--sidebar-hover-bg)] transition-colors text-right"
      >
        <span className="text-base leading-none">💬</span>
        <span>WhatsApp</span>
      </button>

      {/* Twitter / X */}
      <button
        onClick={() => { shareToTwitter(shareText); onClose() }}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-white hover:bg-[var(--sidebar-hover-bg)] transition-colors border-t border-[var(--border-subtle)] text-right"
      >
        <span className="text-base leading-none font-bold" style={{ fontFamily: 'monospace' }}>𝕏</span>
        <span>Twitter / X</span>
      </button>

      {/* Copy */}
      <button
        onClick={handleCopy}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs border-t border-[var(--border-subtle)] hover:bg-[var(--sidebar-hover-bg)] transition-colors text-right"
        style={{ color: copied ? '#10b981' : 'rgba(255,255,255,0.85)' }}
      >
        {copied
          ? <Check size={13} className="text-emerald-400 shrink-0" />
          : <Copy size={13} className="text-muted shrink-0" />
        }
        <span>{copied ? 'تم النسخ!' : 'نسخ الرسالة'}</span>
      </button>
    </motion.div>
  )
}

// ─── Achievement Card with Share Button ───────────────────────────────────────
function AchievementCard({ achievement, index, studentData }) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const Icon = achievement.icon
  const colors = ACHIEVEMENT_COLOR_CLASSES[achievement.color] || {}

  // Build share text for this achievement
  function getShareText() {
    const key = achievement.key
    if (key === 'streak_7') return generateShareText('streak', { days: 7 })
    if (key === 'streak_30') return generateShareText('streak', { days: 30 })
    if (key === 'level_up') return generateShareText('level_up', { level: achievement.title })
    return generateShareText('badge', { badge: achievement.title })
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      className={`fl-card p-4 text-center relative hover:translate-y-[-2px] transition-all duration-200 ${
        achievement.earned
          ? (colors.border || '')
          : 'opacity-40 grayscale'
      }`}
    >
      {/* Share button — only for earned achievements */}
      {achievement.earned && (
        <div className="absolute top-2 left-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setDropdownOpen((v) => !v)
            }}
            className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--sidebar-hover-bg)]"
            style={{ background: 'rgba(255,255,255,0.07)' }}
            title="مشاركة الإنجاز"
          >
            <Share2 size={12} className="text-muted" />
          </button>

          <AnimatePresence>
            {dropdownOpen && (
              <ShareDropdown
                shareText={getShareText()}
                onClose={() => setDropdownOpen(false)}
              />
            )}
          </AnimatePresence>
        </div>
      )}

      <div className={`w-12 h-12 rounded-xl mx-auto mb-2 flex items-center justify-center ${
        achievement.earned ? (colors.bg || 'bg-[var(--surface-raised)]') : 'bg-[var(--surface-raised)]'
      }`}>
        <Icon size={24} className={achievement.earned ? (colors.text || 'text-muted') : 'text-muted'} />
      </div>
      <h3 className="text-sm font-bold text-[var(--text-primary)] mb-0.5">{achievement.title}</h3>
      <p className="text-xs text-muted">{achievement.desc}</p>
      {achievement.earned && (
        <span className="text-xs text-emerald-400 mt-1 block">✓ حققته</span>
      )}
    </motion.div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function StudentSuccessStories() {
  const { profile, studentData } = useAuthStore()

  // Compute achievements
  const { data: achievements, isLoading } = useQuery({
    queryKey: ['student-achievements'],
    queryFn: async () => {
      const earned = []

      // Streak achievements
      const streak = studentData?.current_streak || 0
      if (streak >= 7) earned.push({ ...ACHIEVEMENT_CONFIG.streak_7, key: 'streak_7', date: null })
      if (streak >= 30) earned.push({ ...ACHIEVEMENT_CONFIG.streak_30, key: 'streak_30', date: null })

      // XP achievements
      const xp = studentData?.xp_total || 0
      if (xp >= 100) earned.push({ ...ACHIEVEMENT_CONFIG.xp_100, key: 'xp_100' })
      if (xp >= 500) earned.push({ ...ACHIEVEMENT_CONFIG.xp_500, key: 'xp_500' })
      if (xp >= 1000) earned.push({ ...ACHIEVEMENT_CONFIG.xp_1000, key: 'xp_1000' })

      // Grade achievements
      const { data: submissions } = await supabase
        .from('submissions')
        .select('grade, grade_numeric, submitted_at')
        .eq('student_id', profile?.id)
        .eq('status', 'graded')

      if (submissions?.length > 0) {
        earned.push({ ...ACHIEVEMENT_CONFIG.first_assignment, key: 'first_assignment', date: submissions[submissions.length - 1]?.submitted_at })
        const hasPerfect = submissions.some(s => s.grade === 'A+' || s.grade_numeric >= 97)
        if (hasPerfect) earned.push({ ...ACHIEVEMENT_CONFIG.perfect_grade, key: 'perfect_grade' })
      }

      // Top 3 in group
      if (studentData?.group_id) {
        const { data: groupStudents } = await supabase
          .from('students')
          .select('id, xp_total')
          .eq('group_id', studentData.group_id)
          .eq('status', 'active')
          .order('xp_total', { ascending: false })
          .limit(3)

        if (groupStudents?.some(s => s.id === profile?.id)) {
          earned.push({ ...ACHIEVEMENT_CONFIG.top_3, key: 'top_3' })
        }
      }

      return earned
    },
    enabled: !!profile?.id,
  })

  // Journey stats
  const { data: stats } = useQuery({
    queryKey: ['student-journey-stats'],
    queryFn: async () => {
      const [submissionsRes, attendanceRes, vocabRes] = await Promise.all([
        supabase.from('submissions').select('id', { count: 'exact', head: true })
          .eq('student_id', profile?.id).eq('status', 'graded'),
        supabase.from('attendance').select('id', { count: 'exact', head: true })
          .eq('student_id', profile?.id).eq('status', 'present'),
        supabase.from('vocabulary_bank').select('id', { count: 'exact', head: true })
          .eq('student_id', profile?.id).eq('mastery', 'mastered'),
      ])
      return {
        totalGraded: submissionsRes.count || 0,
        totalPresent: attendanceRes.count || 0,
        vocabMastered: vocabRes.count || 0,
      }
    },
    enabled: !!profile?.id,
  })

  const allAchievements = Object.entries(ACHIEVEMENT_CONFIG).map(([key, config]) => {
    const earned = achievements?.find(a => a.key === key)
    return { ...config, key, earned: !!earned }
  })

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-page-title flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold-500/10 flex items-center justify-center">
            <Award size={20} className="text-gold-400" />
          </div>
          قصة نجاحي
        </h1>
        <p className="text-muted text-sm mt-1">رحلتك في تعلم الإنجليزية وإنجازاتك</p>
      </div>

      {/* Journey summary */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="fl-card-static p-7 border-gold-500/20">
        <div className="text-center mb-4">
          <div className="w-16 h-16 rounded-xl bg-gold-500/10 flex items-center justify-center mx-auto mb-3">
            <Star size={28} className="text-gold-400" />
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">{profile?.full_name || profile?.display_name}</h2>
          <p className="text-sm text-muted">
            عضو منذ {new Date(profile?.created_at || Date.now()).toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          {[
            { label: 'واجبات مكتملة', value: stats?.totalGraded || 0, icon: BookOpen },
            { label: 'حصص حضور', value: stats?.totalPresent || 0, icon: Calendar },
            { label: 'مفردات متقنة', value: stats?.vocabMastered || 0, icon: Target },
            { label: 'إنجازات', value: achievements?.length || 0, icon: Trophy },
          ].map((stat, i) => (
            <div key={i} className="text-center p-3 rounded-xl" style={{ background: 'var(--surface-raised)' }}>
              <stat.icon size={16} className="text-gold-400 mx-auto mb-1" />
              <p className="text-lg font-bold text-[var(--text-primary)]">{stat.value}</p>
              <p className="text-xs text-muted">{stat.label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Earned achievements */}
      <div>
        <h2 className="text-section-title mb-3" style={{ color: 'var(--text-primary)' }}>الإنجازات</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
          {allAchievements.map((achievement, i) => (
            <AchievementCard
              key={achievement.key}
              achievement={achievement}
              index={i}
              studentData={studentData}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
