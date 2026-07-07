import { useState, Suspense } from 'react'
import { useShallow } from 'zustand/react/shallow'
import lazyRetry from '../../utils/lazyRetry'
// PERSONALIZATION-REVERT 2026-05-19: hidden from default flow.
// import InterestsSettingsSection from '../../components/personalization/InterestsSettingsSection'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Zap, Flame, Trophy, Award, Save, Loader2, Clock, Gift, CreditCard, Palette, GraduationCap, Moon, Sun, Sparkles, Check, SwatchBook, Mail, CalendarDays, Medal, KeyRound, Copy, AtSign, RefreshCw, Camera, ImageIcon, Trash2, ChevronDown, Bell } from 'lucide-react'
import { useAuthStore, useAuthUser } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { tracker } from '../../services/activityTracker'
import { GAMIFICATION_LEVELS, ACADEMIC_LEVELS, PACKAGES } from '../../lib/constants'
import { timeAgo } from '../../utils/dateHelpers'
import NotificationSettings from '../../components/layout/NotificationSettings'
import ImmersionToggle from '../../components/ImmersionToggle'
import SubTabs from '../../components/common/SubTabs'
import StudentAIProfile from '../../components/ai/StudentAIProfile'
import { useG } from '@/i18n/gender'
import './profile/profileJourney.css'

// Lazy-load sub-tab content
const StudentAvatar = lazyRetry(() => import('./StudentAvatar'))
const StudentBilling = lazyRetry(() => import('./StudentBilling'))
const StudentReferral = lazyRetry(() => import('./StudentReferral'))
const StudentCertificate = lazyRetry(() => import('./StudentCertificate'))

/* chapter order tells the student's story: who I am → how the AI sees me →
   what I earned → how I look → my subscription */
const TABS = [
  { key: 'profile', label: 'ملفي', icon: User },
  { key: 'ai-profile', label: 'ملفي الذكي', icon: Trophy },
  { key: 'certificates', label: 'شهاداتي', icon: GraduationCap },
  { key: 'avatar', label: 'الأفاتار', icon: Palette },
  { key: 'appearance', label: 'المظهر', icon: SwatchBook },
  { key: 'billing', label: 'الفواتير', icon: CreditCard },
  { key: 'referral', label: 'دعوة صديق', icon: Gift },
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
    <div className="sj-root">
      {/* warm gold atmosphere — same world as the Atlas home and the Library */}
      <div className="sj-atmo" aria-hidden="true">
        <div className="sj-atmo__beam" />
        <div className="sj-atmo__blob" />
      </div>

      <div className="sj-content">
        <IdentityHero />

        <div className="sj-tabs" role="tablist">
          {TABS.map((t) => {
            const Icon = t.icon
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={activeTab === t.key}
                onClick={() => setActiveTab(t.key)}
                className={`sj-tab ${activeTab === t.key ? 'is-active' : ''}`}
              >
                {activeTab === t.key && (
                  <motion.span
                    layoutId="sj-tab-pill"
                    className="sj-tab__pill"
                    style={{ zIndex: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <Icon size={15} strokeWidth={2} />
                <span>{t.label}</span>
              </button>
            )
          })}
        </div>

        <div className="mt-6">
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
      </div>
    </div>
  )
}

/* ── Identity hero — the student's face, level ring, and story stats ── */
function IdentityHero() {
  const { profile, studentData, fetchProfile, user } = useAuthStore(useShallow((s) => ({ profile: s.profile, studentData: s.studentData, fetchProfile: s.fetchProfile, user: s.user })))
  const g = useG()

  const xp = studentData?.xp_total || 0
  const streak = studentData?.current_streak || 0
  const currentLevel = getLevel(xp)
  const nextLevel = getNextLevel(xp)
  const xpRange = nextLevel ? (nextLevel.xp - currentLevel.xp) : 0
  const xpProgress = nextLevel && xpRange > 0 ? ((xp - currentLevel.xp) / xpRange) * 100 : 100
  const academicLevel = ACADEMIC_LEVELS[studentData?.academic_level] || ACADEMIC_LEVELS[1]
  const pkg = PACKAGES[studentData?.package] || PACKAGES.asas

  const { data: classRank } = useQuery({
    queryKey: ['student-class-rank', profile?.id],
    queryFn: async () => {
      const groupId = studentData?.group_id
      if (!groupId) return null
      const { data } = await supabase
        .from('students')
        .select('id, xp_total')
        .eq('group_id', groupId)
        .eq('is_active', true)
        .order('xp_total', { ascending: false })
      if (!data) return null
      const rank = data.findIndex(s => s.id === profile?.id) + 1
      return { rank, total: data.length }
    },
    enabled: !!profile?.id && !!studentData?.group_id,
  })

  // Avatar upload (moved here from the old profile body — identity lives in the hero)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoMsg, setPhotoMsg] = useState(null)
  const [showPhotoSheet, setShowPhotoSheet] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deletingPhoto, setDeletingPhoto] = useState(false)

  async function handlePhotoUpload(file) {
    if (!file || !profile?.id) return
    setUploadingPhoto(true)
    setPhotoMsg(null)
    try {
      const blob = await new Promise((resolve) => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        const img = new Image()
        img.onload = () => {
          const maxSize = 800
          const w = img.width, h = img.height
          const side = Math.min(w, h)
          const sx = (w - side) / 2
          const sy = (h - side) / 2
          const outSize = Math.min(side, maxSize)
          canvas.width = outSize
          canvas.height = outSize
          ctx.drawImage(img, sx, sy, side, side, 0, 0, outSize, outSize)
          canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.8)
        }
        img.src = URL.createObjectURL(file)
      })

      const fileName = `${profile.id}/${Date.now()}.jpg`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true })
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName)
      const avatarUrl = urlData.publicUrl

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', profile.id)
      if (updateError) throw updateError

      setPhotoMsg({ type: 'success', text: 'تم تحديث الصورة' })
      if (user) fetchProfile(user)
      setShowPhotoSheet(false)
      setTimeout(() => setPhotoMsg(null), 3000)
    } catch (err) {
      console.error('Avatar upload error:', err)
      setPhotoMsg({ type: 'error', text: g('فشل في رفع الصورة — حاول مرة أخرى', 'فشل في رفع الصورة — حاولي مرة أخرى') })
      setTimeout(() => setPhotoMsg(null), 4000)
    } finally {
      setUploadingPhoto(false)
    }
  }

  async function handleDeletePhoto() {
    if (!profile?.id || !profile?.avatar_url) return
    setDeletingPhoto(true)
    try {
      const url = profile.avatar_url
      const match = url.match(/\/avatars\/(.+)$/)
      if (match) {
        await supabase.storage.from('avatars').remove([decodeURIComponent(match[1])])
      }
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', profile.id)
      if (error) throw error
      setPhotoMsg({ type: 'success', text: 'تم حذف الصورة' })
      if (user) fetchProfile(user)
      setConfirmDelete(false)
      setShowPhotoSheet(false)
      setTimeout(() => setPhotoMsg(null), 3000)
    } catch (err) {
      console.error('Delete avatar error:', err)
      setPhotoMsg({ type: 'error', text: 'فشل حذف الصورة' })
      setTimeout(() => setPhotoMsg(null), 4000)
    } finally {
      setDeletingPhoto(false)
    }
  }

  const R = 56
  const CIRC = 2 * Math.PI * R

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="sj-hero"
    >
      <div className="sj-hero__grid">
        {/* avatar */}
        <div className="sj-ava">
          <div className="sj-ava__frame" onClick={() => setShowPhotoSheet(true)} title="تغيير الصورة">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="sj-ava__img" />
            ) : (
              <div className="sj-ava__fallback">{(profile?.full_name || profile?.display_name)?.[0] || '؟'}</div>
            )}
          </div>
          <button className="sj-ava__cam" onClick={() => setShowPhotoSheet(true)} aria-label="تغيير الصورة">
            {uploadingPhoto ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
          </button>
          {photoMsg && (
            <p className={`absolute -bottom-6 start-0 text-xs whitespace-nowrap ${photoMsg.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
              {photoMsg.text}
            </p>
          )}
        </div>

        {/* who */}
        <div className="sj-hero__who">
          <h1 className="sj-hero__name">{profile?.display_name || profile?.full_name}</h1>
          {user?.email && <div className="sj-hero__mail">{user.email}</div>}
          <div className="sj-hero__chips">
            <span className="sj-chip gold">{academicLevel.cefr} · {academicLevel.name_ar}</span>
            <span className="sj-chip">{pkg.name_ar}</span>
            {studentData?.created_at && (
              <span className="sj-chip">
                <CalendarDays size={12} strokeWidth={1.75} />
                {g('انضم', 'انضمت')} {timeAgo(studentData.created_at)}
              </span>
            )}
          </div>
        </div>

        {/* XP ring toward the next gamification level */}
        <div className="sj-ring" aria-label={`المستوى ${currentLevel.level}`}>
          <svg width="128" height="128" viewBox="0 0 128 128">
            <circle cx="64" cy="64" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="7" />
            <motion.circle
              cx="64" cy="64" r={R} fill="none"
              stroke="url(#sjRingGrad)" strokeWidth="7" strokeLinecap="round"
              strokeDasharray={CIRC}
              initial={{ strokeDashoffset: CIRC }}
              animate={{ strokeDashoffset: CIRC - (CIRC * Math.min(xpProgress, 100)) / 100 }}
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
            />
            <defs>
              <linearGradient id="sjRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fde68a" />
                <stop offset="55%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
            </defs>
          </svg>
          <div className="sj-ring__center">
            <span className="sj-ring__num">{currentLevel.level}</span>
            <span className="sj-ring__cap">{currentLevel.title_ar}</span>
            {nextLevel && (
              <span className="text-xs mt-0.5" style={{ color: 'var(--ds-text-tertiary, #64748b)' }}>
                باقي {nextLevel.xp - xp} XP
              </span>
            )}
          </div>
        </div>
      </div>

      {/* story stats */}
      <div className="sj-gems">
        {(() => {
          const xpGem = { label: 'نقاط الخبرة', value: xp.toLocaleString('en-US'), icon: Zap, c: '#fbbf24', bg: 'rgba(251,191,36,0.12)' }
          const streakGem = { label: 'أيام متواصلة', value: streak > 0 ? `${streak} 🔥` : g('ابدأ سلسلتك اليوم', 'ابدئي سلسلتك اليوم'), cta: streak === 0, icon: Flame, c: '#fb923c', bg: 'rgba(251,146,60,0.12)' }
          const rankGem = classRank ? { label: 'ترتيبي في مجموعتي', value: `${classRank.rank} من ${classRank.total}`, icon: Medal, c: '#4ade80', bg: 'rgba(74,222,128,0.12)' } : null
          const levelGem = { label: 'مستواي الدراسي', value: academicLevel.cefr, icon: GraduationCap, c: '#7dd3fc', bg: 'rgba(125,211,252,0.12)' }
          // with no rank (3 gems), streak goes last so the odd-item full-width
          // slot on mobile lands on the gem that earns the emphasis
          return rankGem ? [xpGem, streakGem, rankGem, levelGem] : [xpGem, levelGem, streakGem]
        })().map((s7, i) => (
          <motion.div
            key={s7.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.07, ease: [0.16, 1, 0.3, 1] }}
            className="sj-gem"
          >
            <div className="sj-gem__icon" style={{ background: s7.bg, color: s7.c }}>
              <s7.icon size={17} strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <div className="sj-gem__value" style={s7.cta ? { fontSize: 13, color: '#fbbf24', whiteSpace: 'normal' } : undefined}>{s7.value}</div>
              <div className="sj-gem__label">{s7.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Photo sheet */}
      <AnimatePresence>
        {showPhotoSheet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowPhotoSheet(false)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 25 }}
              className="w-full max-w-sm rounded-2xl p-6 space-y-3"
              style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-semibold text-center mb-4" style={{ color: 'var(--text-primary)' }}>
                تغيير الصورة الشخصية
              </h3>

              <label className="flex items-center gap-3 p-4 rounded-xl cursor-pointer hover:bg-white/[0.03] transition-colors" style={{ border: '1px solid var(--border-subtle)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(251,191,36,0.1)' }}>
                  <ImageIcon size={18} style={{ color: '#fbbf24' }} />
                </div>
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{g('اختر من المعرض', 'اختاري من المعرض')}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])}
                />
              </label>

              <label className="flex items-center gap-3 p-4 rounded-xl cursor-pointer hover:bg-white/[0.03] transition-colors" style={{ border: '1px solid var(--border-subtle)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <Camera size={18} style={{ color: 'var(--text-secondary)' }} />
                </div>
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{g('التقط صورة', 'التقطي صورة')}</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="user"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])}
                />
              </label>

              {profile?.avatar_url && !confirmDelete && (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-3 p-4 rounded-xl w-full hover:bg-red-500/[0.05] transition-colors text-start"
                  style={{ border: '1px solid rgba(239,68,68,0.15)' }}
                >
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                    <Trash2 size={18} className="text-red-400" />
                  </div>
                  <span className="text-sm font-medium text-red-400">حذف الصورة</span>
                </button>
              )}

              {confirmDelete && (
                <div className="rounded-xl p-4 space-y-3" style={{ border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)' }}>
                  <p className="text-sm text-center font-medium" style={{ color: 'var(--text-primary)' }}>
                    هل {g('تريد', 'تريدين')} حذف صورة الملف الشخصي؟
                  </p>
                  <div className="flex items-center gap-2 justify-center">
                    <button
                      onClick={handleDeletePhoto}
                      disabled={deletingPhoto}
                      className="px-5 py-2 rounded-xl text-sm font-bold bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 transition-colors flex items-center gap-1.5"
                    >
                      {deletingPhoto ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      حذف
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="px-5 py-2 rounded-xl text-sm font-medium transition-colors"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={() => { setShowPhotoSheet(false); setConfirmDelete(false) }}
                className="w-full py-3 rounded-xl text-sm text-muted hover:text-[var(--text-primary)] transition-colors text-center"
              >
                إلغاء
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  )
}

function transliterateArabic(str) {
  const map = { 'ا':'a','أ':'a','إ':'e','آ':'a','ب':'b','ت':'t','ث':'th','ج':'j','ح':'h','خ':'kh','د':'d','ذ':'dh','ر':'r','ز':'z','س':'s','ش':'sh','ص':'s','ض':'d','ط':'t','ظ':'z','ع':'a','غ':'gh','ف':'f','ق':'q','ك':'k','ل':'l','م':'m','ن':'n','ه':'h','و':'w','ي':'y','ى':'a','ة':'a','ء':'','ئ':'y','ؤ':'w' }
  return str.split('').map(c => map[c] ?? c).join('')
}

function generateUsername(displayName) {
  const base = transliterateArabic(displayName || '').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()
  const digits = Math.floor(100 + Math.random() * 900)
  return (base || 'user') + digits
}

/* the notification category list is long — keep it one calm collapsed card */
function NotificationDisclosure() {
  const [open, setOpen] = useState(false)
  return (
    <div className={`sj-card sj-disclose ${open ? 'is-open' : ''}`}>
      <button className="sj-disclose__head" onClick={() => setOpen(v => !v)} aria-expanded={open}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(251,191,36,0.1)' }}>
          <Bell size={16} style={{ color: '#fbbf24' }} strokeWidth={1.75} />
        </div>
        <div className="text-start">
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>إعدادات الإشعارات</p>
          <p className="text-xs" style={{ color: 'var(--ds-text-tertiary, #64748b)' }}>تحكم في أنواع الإشعارات التي تصلك</p>
        </div>
        <ChevronDown size={16} className="sj-disclose__chev" />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="pt-4">
              <NotificationSettings />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ProfileContent() {
  const { profile, studentData, fetchProfile, user } = useAuthStore(useShallow((s) => ({ profile: s.profile, studentData: s.studentData, fetchProfile: s.fetchProfile, user: s.user })))
  const queryClient = useQueryClient()
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [editing, setEditing] = useState(false)

  // (avatar upload moved to IdentityHero — identity lives in the hero now)

  // Username state
  const [usernameValue, setUsernameValue] = useState(profile?.username || '')
  const [editingUsername, setEditingUsername] = useState(false)
  const [usernameMsg, setUsernameMsg] = useState(null)
  const [savingUsername, setSavingUsername] = useState(false)
  const [copiedUsername, setCopiedUsername] = useState(false)

  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/

  async function handleSaveUsername() {
    const val = usernameValue.trim().toLowerCase()
    if (!usernameRegex.test(val)) {
      setUsernameMsg({ type: 'error', text: 'اسم المستخدم يجب أن يكون 3-20 حرف (أحرف إنجليزية، أرقام، _)' })
      setTimeout(() => setUsernameMsg(null), 4000)
      return
    }
    setSavingUsername(true)
    try {
      // Check uniqueness
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', val)
        .neq('id', profile?.id)
        .maybeSingle()
      if (existing) {
        setUsernameMsg({ type: 'error', text: 'اسم المستخدم مستخدم بالفعل' })
        setTimeout(() => setUsernameMsg(null), 4000)
        setSavingUsername(false)
        return
      }
      const { error } = await supabase.from('profiles').update({ username: val }).eq('id', profile?.id)
      if (error) throw error
      tracker.track('profile_updated', { fields_changed: ['username'] })
      setUsernameMsg({ type: 'success', text: 'تم حفظ اسم المستخدم' })
      setEditingUsername(false)
      if (user) fetchProfile(user)
      setTimeout(() => setUsernameMsg(null), 4000)
    } catch (err) {
      setUsernameMsg({ type: 'error', text: err.message })
      setTimeout(() => setUsernameMsg(null), 4000)
    } finally {
      setSavingUsername(false)
    }
  }

  function handleCopyUsername() {
    navigator.clipboard.writeText(profile?.username || usernameValue)
    setCopiedUsername(true)
    setTimeout(() => setCopiedUsername(false), 2000)
  }

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

  const [showAllMedals, setShowAllMedals] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState(null)

  const changePassword = useMutation({
    mutationFn: async () => {
      if (!currentPassword) throw new Error('أدخل كلمة المرور الحالية')
      if (newPassword.length < 8 || !/\d/.test(newPassword)) throw new Error('كلمة المرور يجب أن تكون ٨ أحرف على الأقل وتحتوي رقم')
      if (newPassword !== confirmPassword) throw new Error('كلمات المرور غير متطابقة')

      // Verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email,
        password: currentPassword,
      })
      if (signInError) throw new Error('كلمة المرور الحالية غير صحيحة')

      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
    },
    onSuccess: () => {
      setPasswordMsg({ type: 'success', text: 'تم تغيير كلمة المرور بنجاح' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setChangingPassword(false)
      setTimeout(() => setPasswordMsg(null), 4000)
    },
    onError: (err) => {
      setPasswordMsg({ type: 'error', text: err.message })
      setTimeout(() => setPasswordMsg(null), 4000)
    },
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
    <div className="space-y-6">
      {/* بيانات الحساب — الاسم المعروض واسم المستخدم */}
      <div className="sj-eyebrow" style={{ marginTop: 4 }}>
        <span className="sj-eyebrow__spark" />
        <span className="sj-eyebrow__label">بيانات الحساب</span>
        <span className="sj-eyebrow__rule" />
      </div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="sj-card">
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
          <div className="min-w-0">
            <div>
              <div className="flex items-center gap-1.5 text-sm mb-2">
                <User size={13} strokeWidth={1.75} style={{ color: '#fbbf24' }} />
                <span style={{ color: 'var(--text-secondary)' }}>الاسم المعروض</span>
              </div>
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
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{profile?.display_name || 'لم يُحدد'}</span>
                  <button onClick={() => setEditing(true)} className="text-xs font-bold transition-colors" style={{ color: '#fbbf24' }}>
                    تعديل
                  </button>
                </div>
              )}
            </div>

          </div>
          {/* Username — second column */}
          <div className="min-w-0">
            <div>
              <div className="flex items-center gap-1.5 text-sm mb-2">
                <AtSign size={13} strokeWidth={1.75} style={{ color: '#fbbf24' }} />
                <span style={{ color: 'var(--text-secondary)' }}>اسم المستخدم</span>
              </div>
              {editingUsername ? (
                <div className="flex items-center gap-2">
                  <input
                    className="input-field text-sm py-1.5 flex-1"
                    value={usernameValue}
                    onChange={(e) => setUsernameValue(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                    placeholder="username"
                    dir="ltr"
                    maxLength={20}
                  />
                  <button
                    type="button"
                    onClick={() => setUsernameValue(generateUsername(profile?.display_name))}
                    className="btn-ghost text-xs p-1.5"
                    title="اقتراح تلقائي"
                  >
                    <RefreshCw size={14} />
                  </button>
                  <button onClick={handleSaveUsername} disabled={savingUsername} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1">
                    {savingUsername ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                    حفظ
                  </button>
                  <button onClick={() => { setEditingUsername(false); setUsernameValue(profile?.username || '') }} className="btn-ghost text-xs">إلغاء</button>
                </div>
              ) : profile?.username ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono" dir="ltr" style={{ color: 'var(--text-primary)' }}>@{profile.username}</span>
                  <button onClick={handleCopyUsername} className="btn-ghost text-xs p-1" title="نسخ">
                    {copiedUsername ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  </button>
                  <button onClick={() => { setEditingUsername(true); setUsernameValue(profile.username) }} className="text-xs font-bold transition-colors" style={{ color: '#fbbf24' }}>
                    تعديل
                  </button>
                </div>
              ) : (
                <button onClick={() => { setEditingUsername(true); setUsernameValue(generateUsername(profile?.display_name)) }} className="text-xs font-bold transition-colors" style={{ color: '#fbbf24' }}>
                  إضافة اسم مستخدم
                </button>
              )}
              {usernameMsg && (
                <p className={`text-xs mt-1.5 ${usernameMsg.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {usernameMsg.text}
                </p>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* التفضيلات */}
      <div className="sj-eyebrow">
        <span className="sj-eyebrow__spark" />
        <span className="sj-eyebrow__label">التفضيلات</span>
        <span className="sj-eyebrow__rule" />
      </div>
      <ImmersionToggle />
      <NotificationDisclosure />

      {/* PERSONALIZATION-REVERT 2026-05-19: hidden from default flow.
          Canonical curriculum is the single default for every student. */}
      {/* <InterestsSettingsSection /> */}

      {/* الأمان */}
      <div className="sj-eyebrow">
        <span className="sj-eyebrow__spark" />
        <span className="sj-eyebrow__label">الأمان</span>
        <span className="sj-eyebrow__rule" />
      </div>
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="sj-card">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center">
            <KeyRound size={16} className="text-rose-400" strokeWidth={1.5} />
          </div>
          <h3 className="text-section-title" style={{ color: 'var(--text-primary)' }}>تغيير كلمة المرور</h3>
        </div>
        {changingPassword ? (
          <div className="space-y-3">
            <input
              type="password"
              className="input-field text-sm py-2.5 w-full"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="كلمة المرور الحالية"
              autoComplete="current-password"
            />
            <input
              type="password"
              className="input-field text-sm py-2.5 w-full"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="كلمة المرور الجديدة"
              autoComplete="new-password"
            />
            <input
              type="password"
              className="input-field text-sm py-2.5 w-full"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="تأكيد كلمة المرور الجديدة"
              autoComplete="new-password"
            />
            <p className="text-xs text-muted">٨ أحرف على الأقل + رقم واحد</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => changePassword.mutate()}
                disabled={changePassword.isPending}
                className="btn-primary text-sm py-2.5 px-5 flex items-center gap-1"
              >
                {changePassword.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                تحديث كلمة المرور
              </button>
              <button onClick={() => { setChangingPassword(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword('') }} className="btn-ghost text-sm">إلغاء</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setChangingPassword(true)} className="btn-ghost text-sm flex items-center gap-2">
            <KeyRound size={14} />
            تحديث الآن
          </button>
        )}
        {passwordMsg && (
          <p className={`text-xs mt-2 ${passwordMsg.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
            {passwordMsg.text}
          </p>
        )}
      </motion.div>

      {/* سجل الرحلة */}
      <div className="sj-eyebrow">
        <span className="sj-eyebrow__spark" />
        <span className="sj-eyebrow__label">سجل الرحلة</span>
        <span className="sj-eyebrow__rule" />
      </div>
      <div className="grid lg:grid-cols-2 gap-5 items-start">
        {/* Achievements */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="sj-card">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(251,191,36,0.1)' }}>
              <Award size={16} style={{ color: '#fbbf24' }} strokeWidth={1.5} />
            </div>
            <h3 className="text-section-title" style={{ color: 'var(--text-primary)' }}>الإنجازات</h3>
            <span className="sj-chip gold" style={{ padding: '2px 10px' }}>{achievements?.earned?.length || 0} من {achievements?.all?.length || 0}</span>
          </div>
          {(() => {
            const medals = achievements?.all || []
            const earnedCount = achievements?.earned?.length || 0
            // a brand-new student shouldn't face a 20-tile locked graveyard —
            // show the nearest goal + a small taste, expandable
            const collapsed = earnedCount === 0 && !showAllMedals
            const visible = collapsed ? medals.slice(0, 6) : medals
            return (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {visible.map((a, i) => {
                    const isNearest = earnedCount === 0 && i === 0
                    return (
                      <div
                        key={a.id}
                        className={`sj-medal ${a.isEarned ? 'is-earned' : ''}`}
                        style={isNearest ? { opacity: 1, filter: 'none', borderColor: 'rgba(251,191,36,0.4)', background: 'linear-gradient(160deg, rgba(251,191,36,0.12), rgba(251,191,36,0.03))' } : undefined}
                      >
                        {isNearest && (
                          <span className="block text-[12px] font-bold mb-1" style={{ color: '#fbbf24' }}>أقرب إنجاز لك ✦</span>
                        )}
                        <span className="text-2xl">{a.icon}</span>
                        <p className="text-xs font-bold mt-1.5" style={{ color: 'var(--text-primary)' }}>{a.name_ar}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--ds-text-tertiary, #64748b)' }}>{a.description_ar}</p>
                      </div>
                    )
                  })}
                </div>
                {earnedCount === 0 && medals.length > 6 && (
                  <button
                    onClick={() => setShowAllMedals(v => !v)}
                    className="mt-3 text-xs font-bold transition-colors"
                    style={{ color: '#fbbf24' }}
                  >
                    {showAllMedals ? 'عرض أقل' : `عرض كل الإنجازات (${medals.length})`}
                  </button>
                )}
                {!medals.length && <p className="text-muted text-sm text-center">لا توجد إنجازات</p>}
              </>
            )
          })()}
        </motion.div>

        {/* XP History */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="sj-card">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <Clock size={16} style={{ color: 'var(--ds-text-secondary, #cbd5e1)' }} strokeWidth={1.5} />
            </div>
            <h3 className="text-section-title" style={{ color: 'var(--text-primary)' }}>سجل النقاط</h3>
          </div>
          {xpHistory?.length > 0 ? (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {xpHistory.map((tx) => (
                <div key={tx.id} className="sj-tx">
                  <div>
                    <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{XP_REASON_LABELS[tx.reason] || tx.reason}</p>
                    <p className="text-xs" style={{ color: 'var(--ds-text-tertiary, #64748b)' }}>{timeAgo(tx.created_at)}</p>
                  </div>
                  <span className="text-sm font-bold tabular-nums" style={{ color: tx.amount > 0 ? '#fbbf24' : '#f87171' }}>
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

const DS_THEME_OPTIONS = [
  {
    key: 'night',
    label: 'ليل الذهب',
    description: 'فخامة ذهبية هادئة، مثالية للتركيز الليلي',
    icon: Moon,
    bg: '#05070d',
    accent: '#e9b949',
    accentSecondary: '#8c95b8',
    colors: ['#e9b949', '#5a4a8c', '#1f3a5f'],
  },
  {
    key: 'aurora-cinematic',
    label: 'الشفق السينمائي',
    description: 'أجواء سينمائية بألوان السماء والبنفسج',
    icon: Sparkles,
    bg: '#060e1c',
    accent: '#38bdf8',
    accentSecondary: '#a78bfa',
    colors: ['#38bdf8', '#a78bfa', '#fbbf24'],
  },
  {
    key: 'minimal',
    label: 'الحد الأدنى',
    description: 'مظهر فاتح نظيف ومريح للعين',
    icon: Sun,
    bg: '#f8f9fb',
    accent: '#0284c7',
    accentSecondary: '#7c3aed',
    colors: ['#0284c7', '#7c3aed', '#d97706'],
  },
]

function AppearanceContent() {
  const g = useG()
  const user = useAuthUser()
  const impersonation = useAuthStore((s) => s.impersonation)
  const isImpersonating = !!impersonation
  const [currentTheme, setCurrentTheme] = useState(() =>
    document.documentElement.getAttribute('data-theme') || 'night'
  )
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('fluentia_sounds') !== 'off')
  const [saving, setSaving] = useState(false)

  const handleThemeChange = async (themeId) => {
    const { applyTheme, saveThemePreference } = await import('../../design-system/applyTheme')
    applyTheme(themeId)
    setCurrentTheme(themeId)

    // Save to DB — only if NOT impersonating
    const effectiveUserId = isImpersonating ? null : user?.id
    if (effectiveUserId) {
      setSaving(true)
      await saveThemePreference(supabase, effectiveUserId, themeId)
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>مظهر المنصة</h2>
        <p className="text-sm text-muted mt-1">{g('اختر', 'اختاري')} الثيم اللي يريحك — يُحفظ ويتبعك على كل أجهزتك</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {DS_THEME_OPTIONS.map((t, i) => {
          const isActive = currentTheme === t.key
          return (
            <motion.button
              key={t.key}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              onClick={() => handleThemeChange(t.key)}
              className={`relative text-right p-5 rounded-2xl border-2 transition-all duration-300 cursor-pointer ${
                isActive ? 'ring-2 ring-offset-2' : 'hover:scale-[1.02]'
              }`}
              style={{
                background: isActive ? 'var(--glass-card-active)' : 'var(--glass-card)',
                borderColor: isActive ? t.accent : 'var(--border-default)',
                '--tw-ring-color': t.accent,
                '--tw-ring-offset-color': 'var(--surface-base)',
              }}
            >
              {isActive && (
                <div className="absolute top-3 left-3 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: t.accent }}>
                  <Check size={14} className="text-white" />
                </div>
              )}

              {/* Color dots */}
              <div className="flex gap-1.5 mb-4">
                {t.colors.map((color, ci) => (
                  <div key={ci} className="w-8 h-8 rounded-lg" style={{ background: color, border: '1px solid rgba(128,128,128,0.2)' }} />
                ))}
              </div>

              {/* Mini preview */}
              <div className="rounded-xl p-3 mb-4" style={{ background: t.bg, border: `1px solid ${t.accent}22` }}>
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

              {isActive && (
                <span className="mt-2 inline-block text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${t.accent}20`, color: t.accent }}>
                  مفعّل
                </span>
              )}
            </motion.button>
          )
        })}
      </div>

      {saving && <p className="text-xs text-muted text-center">جاري الحفظ...</p>}

      {/* Sound Effects Toggle */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="fl-card-static p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <span className="text-lg">🔊</span>
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>تأثيرات صوتية</p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>أصوات عند كسب XP والإنجازات</p>
            </div>
          </div>
          <button
            onClick={() => {
              const next = !soundEnabled
              setSoundEnabled(next)
              localStorage.setItem('fluentia_sounds', next ? 'on' : 'off')
            }}
            className="relative w-11 h-6 rounded-full transition-colors duration-200"
            style={{ background: soundEnabled ? 'var(--accent-sky)' : 'var(--surface-overlay)' }}
          >
            <span
              className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
              style={{ transform: soundEnabled ? 'translateX(20px)' : 'translateX(0)' }}
            />
          </button>
        </div>
      </motion.div>
    </div>
  )
}
