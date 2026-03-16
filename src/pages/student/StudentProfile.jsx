import { useState, lazy, Suspense } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { User, Zap, Flame, Trophy, Award, Save, Loader2, Clock, Gift, CreditCard, Palette, GraduationCap, Moon, Sun, Sparkles, Check, SwatchBook } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { GAMIFICATION_LEVELS, ACADEMIC_LEVELS, PACKAGES } from '../../lib/constants'
import { timeAgo } from '../../utils/dateHelpers'
import NotificationSettings from '../../components/layout/NotificationSettings'
import ImmersionToggle from '../../components/ImmersionToggle'
import { useThemeStore } from '../../stores/themeStore'
import SubTabs from '../../components/common/SubTabs'
import StudentAIProfile from '../../components/ai/StudentAIProfile'

// Lazy-load sub-tab content
const StudentAvatar = lazy(() => import('./StudentAvatar'))
const StudentBilling = lazy(() => import('./StudentBilling'))
const StudentReferral = lazy(() => import('./StudentReferral'))
const StudentCertificate = lazy(() => import('./StudentCertificate'))

const TABS = [
  { key: 'profile', label: 'الملف الشخصي', icon: User },
  { key: 'ai-profile', label: 'ملفي الذكي', icon: Trophy },
  { key: 'avatar', label: 'تخصيص الأفاتار', icon: Palette },
  { key: 'billing', label: 'الفواتير', icon: CreditCard },
  { key: 'referral', label: 'دعوة صديق', icon: Gift },
  { key: 'certificates', label: 'شهاداتي', icon: GraduationCap },
  { key: 'appearance', label: 'المظهر', icon: SwatchBook },
]

function getLevel(xp) {
  for (let i = GAMIFICATION_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= GAMIFICATION_LEVELS[i].xp) return GAMIFICATION_LEVELS[i]
  }
  return GAMIFICATION_LEVELS[0]
}

function getNextLevel(xp) {
  for (const lvl of GAMIFICATION_LEVELS) {
    if (xp < lvl.xp) return lvl
  }
  return null
}

const TabFallback = () => <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-20 w-full" />)}</div>

export default function StudentProfile() {
  const [activeTab, setActiveTab] = useState('profile')

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-page-title flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
            <User size={20} className="text-sky-400" strokeWidth={1.5} />
          </div>
          حسابي
        </h1>
        <p className="text-muted text-sm mt-1">ملفك الشخصي وإعداداتك</p>
      </motion.div>

      <SubTabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      <Suspense fallback={<TabFallback />}>
        {activeTab === 'profile' && <ProfileContent />}
        {activeTab === 'ai-profile' && <StudentAIProfile studentId={useAuthStore.getState().profile?.id} />}
        {activeTab === 'avatar' && <StudentAvatar />}
        {activeTab === 'billing' && <StudentBilling />}
        {activeTab === 'referral' && <StudentReferral />}
        {activeTab === 'certificates' && <StudentCertificate />}
        {activeTab === 'appearance' && <AppearanceContent />}
      </Suspense>
    </div>
  )
}

function ProfileContent() {
  const { profile, studentData, fetchProfile, user } = useAuthStore()
  const queryClient = useQueryClient()
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [editing, setEditing] = useState(false)

  const xp = studentData?.xp_total || 0
  const streak = studentData?.current_streak || 0
  const currentLevel = getLevel(xp)
  const nextLevel = getNextLevel(xp)
  const xpRange = nextLevel ? (nextLevel.xp - currentLevel.xp) : 0
  const xpProgress = nextLevel && xpRange > 0 ? ((xp - currentLevel.xp) / xpRange) * 100 : 100
  const academicLevel = ACADEMIC_LEVELS[studentData?.academic_level] || ACADEMIC_LEVELS[1]
  const pkg = PACKAGES[studentData?.package] || PACKAGES.asas

  const { data: xpHistory } = useQuery({
    queryKey: ['student-xp-history'],
    queryFn: async () => {
      const { data } = await supabase
        .from('xp_transactions')
        .select('id, amount, reason, description, created_at')
        .eq('student_id', profile?.id)
        .order('created_at', { ascending: false })
        .limit(20)
      return data || []
    },
    enabled: !!profile?.id,
  })

  const { data: achievements } = useQuery({
    queryKey: ['student-achievements'],
    queryFn: async () => {
      const { data: earned } = await supabase
        .from('student_achievements')
        .select('achievement_id, earned_at, achievements(code, name_ar, icon, description_ar, xp_reward)')
        .eq('student_id', profile?.id)
      const { data: all } = await supabase
        .from('achievements')
        .select('id, code, name_ar, icon, description_ar, xp_reward')
        .eq('is_active', true)
        .order('xp_reward')
      const earnedIds = new Set((earned || []).map(e => e.achievement_id))
      return {
        earned: earned || [],
        all: (all || []).map(a => ({ ...a, isEarned: earnedIds.has(a.id) })),
      }
    },
    enabled: !!profile?.id,
  })

  const updateName = useMutation({
    mutationFn: async () => {
      const trimmed = displayName.trim()
      if (!trimmed) throw new Error('الاسم مطلوب')
      const { error } = await supabase.from('profiles').update({ display_name: trimmed }).eq('id', profile?.id).select()
      if (error) throw error
    },
    onSuccess: () => {
      setEditing(false)
      if (user) fetchProfile(user)
    },
  })

  const XP_REASON_LABELS = {
    assignment_on_time: 'واجب في الوقت',
    assignment_late: 'واجب متأخر',
    class_attendance: 'حضور حصة',
    correct_answer: 'إجابة صحيحة',
    helped_peer: 'مساعدة زميل',
    shared_summary: 'مشاركة ملخص',
    streak_bonus: 'مكافأة سلسلة',
    achievement: 'إنجاز',
    peer_recognition: 'تقدير زميل',
    challenge: 'تحدي',
    voice_note_bonus: 'مكافأة صوتية',
    writing_bonus: 'مكافأة كتابة',
    daily_challenge: 'تحدي يومي',
    early_bird: 'حضور مبكر',
    custom: 'مخصص',
    penalty_absent: 'غياب',
    penalty_unknown_word: 'كلمة غير معروفة',
    penalty_pronunciation: 'نطق خاطئ',
  }

  return (
    <div className="space-y-8">
      {/* Profile Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="fl-card-static p-7" style={{ borderColor: 'var(--border-glow)' }}>
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 text-2xl font-bold shrink-0">
            {(profile?.display_name || profile?.full_name)?.[0] || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{profile?.full_name}</h2>
            <div className="flex items-center gap-3 text-sm text-muted mt-1">
              <span className="badge-blue">{pkg.name_ar}</span>
              <span className="badge-muted">{academicLevel.name_ar} ({academicLevel.cefr})</span>
            </div>
            <div className="mt-3">
              {editing ? (
                <div className="flex items-center gap-2">
                  <input className="input-field text-sm py-1.5 flex-1" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="الاسم المعروض..." />
                  <button onClick={() => updateName.mutate()} disabled={updateName.isPending} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1">
                    {updateName.isPending ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                    حفظ
                  </button>
                  <button onClick={() => { setEditing(false); setDisplayName(profile?.display_name || '') }} className="btn-ghost text-xs">إلغاء</button>
                </div>
              ) : (
                <button onClick={() => setEditing(true)} className="text-xs text-sky-400 hover:text-sky-300 transition-all duration-200">
                  تعديل الاسم المعروض: {profile?.display_name || 'لم يُحدد'}
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'XP', value: xp, icon: Zap, variant: 'sky' },
          { label: 'السلسلة', value: `${streak} يوم`, icon: Flame, variant: 'amber' },
          { label: 'المستوى', value: currentLevel.level, icon: Trophy, variant: 'violet' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className={`fl-stat-card ${stat.variant}`}>
            <stat.icon size={22} className={`mb-2 ${stat.variant === 'sky' ? 'text-sky-400' : stat.variant === 'amber' ? 'text-amber-400' : 'text-violet-400'}`} strokeWidth={1.5} />
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stat.value}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Level Progress */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="fl-card-static p-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>المستوى {currentLevel.level} — <span className="text-gradient">{currentLevel.title_ar}</span></p>
          {nextLevel && <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{nextLevel.xp - xp} XP للتالي</p>}
        </div>
        <div className="fl-progress-track" style={{ height: '10px' }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(xpProgress, 100)}%` }} transition={{ delay: 0.4, duration: 0.8 }} className="fl-progress-fill" />
        </div>
      </motion.div>

      <ImmersionToggle />
      <NotificationSettings />

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Achievements */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="fl-card-static p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-gold-500/10 flex items-center justify-center">
              <Award size={16} className="text-gold-400" strokeWidth={1.5} />
            </div>
            <h3 className="text-section-title" style={{ color: 'var(--text-primary)' }}>الإنجازات</h3>
            <span className="badge-muted text-xs">{achievements?.earned?.length || 0}/{achievements?.all?.length || 0}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {achievements?.all?.map((a) => (
              <div key={a.id} className={`rounded-xl p-3 text-center ${a.isEarned ? 'bg-gold-500/10 border border-gold-500/20' : 'border border-border-subtle opacity-40'}`}>
                <span className="text-2xl">{a.icon}</span>
                <p className="text-xs font-medium mt-1" style={{ color: 'var(--text-primary)' }}>{a.name_ar}</p>
                <p className="text-xs text-muted mt-0.5">{a.description_ar}</p>
              </div>
            ))}
          </div>
          {(!achievements?.all?.length) && <p className="text-muted text-sm text-center">لا توجد إنجازات</p>}
        </motion.div>

        {/* XP History */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="fl-card-static p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 flex items-center justify-center">
              <Clock size={16} className="text-sky-400" strokeWidth={1.5} />
            </div>
            <h3 className="text-section-title" style={{ color: 'var(--text-primary)' }}>سجل النقاط</h3>
          </div>
          {xpHistory?.length > 0 ? (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {xpHistory.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between rounded-xl p-3" style={{ background: 'var(--surface-raised)' }}>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--text-primary)' }}>{XP_REASON_LABELS[tx.reason] || tx.reason}</p>
                    <p className="text-xs text-muted">{timeAgo(tx.created_at)}</p>
                  </div>
                  <span className={`text-sm font-bold ${tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted text-sm text-center">لا توجد نقاط حتى الآن</p>
          )}
        </motion.div>
      </div>
    </div>
  )
}

const THEME_OPTIONS = [
  {
    key: 'deep-space',
    label: 'الفضاء العميق',
    labelEn: 'Deep Space',
    description: 'تجربة داكنة مع لمسات سماوية',
    icon: Moon,
    bg: '#060e1c',
    accent: '#38bdf8',
    accentSecondary: '#818cf8',
    preview: ['#060e1c', '#0a1225', '#38bdf8', '#818cf8'],
  },
  {
    key: 'frost-white',
    label: 'الجليد الأبيض',
    labelEn: 'Frost White',
    description: 'مظهر فاتح نظيف ومريح للعين',
    icon: Sun,
    bg: '#f8f9fc',
    accent: '#6366f1',
    accentSecondary: '#8b5cf6',
    preview: ['#f8f9fc', '#ffffff', '#6366f1', '#8b5cf6'],
  },
  {
    key: 'aurora',
    label: 'الشفق القطبي',
    labelEn: 'Aurora',
    description: 'تجربة داكنة فاخرة بألوان بنفسجية',
    icon: Sparkles,
    bg: '#0c0a1d',
    accent: '#a78bfa',
    accentSecondary: '#38bdf8',
    preview: ['#0c0a1d', '#1a1538', '#a78bfa', '#38bdf8'],
  },
]

function AppearanceContent() {
  const { theme, setTheme } = useThemeStore()

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>اختر المظهر</h2>
        <p className="text-sm text-muted mt-1">اختر الثيم المفضل لتجربتك</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {THEME_OPTIONS.map((t, i) => {
          const isActive = theme === t.key
          return (
            <motion.button
              key={t.key}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              onClick={() => setTheme(t.key)}
              className={`relative text-right p-5 rounded-2xl border-2 transition-all duration-300 cursor-pointer ${
                isActive
                  ? 'ring-2 ring-offset-2'
                  : 'hover:scale-[1.02]'
              }`}
              style={{
                background: isActive ? 'var(--glass-card-active)' : 'var(--glass-card)',
                borderColor: isActive ? t.accent : 'var(--border-default)',
                '--tw-ring-color': t.accent,
                '--tw-ring-offset-color': 'var(--surface-base)',
              }}
            >
              {/* Active check */}
              {isActive && (
                <div
                  className="absolute top-3 left-3 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: t.accent }}
                >
                  <Check size={14} className="text-white" />
                </div>
              )}

              {/* Theme preview strip */}
              <div className="flex gap-1.5 mb-4">
                {t.preview.map((color, ci) => (
                  <div
                    key={ci}
                    className="w-8 h-8 rounded-lg"
                    style={{ background: color, border: '1px solid rgba(128,128,128,0.2)' }}
                  />
                ))}
              </div>

              {/* Mini preview card */}
              <div
                className="rounded-xl p-3 mb-4"
                style={{ background: t.bg, border: `1px solid ${t.accent}22` }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-4 rounded-full" style={{ background: t.accent }} />
                  <div className="h-2 rounded-full flex-1" style={{ background: `${t.accent}30` }} />
                </div>
                <div className="flex gap-1.5">
                  <div className="h-2 w-12 rounded-full" style={{ background: `${t.accent}20` }} />
                  <div className="h-2 w-8 rounded-full" style={{ background: `${t.accentSecondary}20` }} />
                </div>
              </div>

              <div className="flex items-center gap-2 mb-1">
                <t.icon size={16} style={{ color: t.accent }} />
                <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{t.label}</span>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{t.description}</p>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
