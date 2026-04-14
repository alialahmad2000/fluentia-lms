import { useState, lazy, Suspense } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Zap, Flame, Trophy, Award, Save, Loader2, Clock, Gift, CreditCard, Palette, GraduationCap, Moon, Sun, Sparkles, Check, SwatchBook, Mail, CalendarDays, Medal, KeyRound, Copy, AtSign, RefreshCw, Camera, ImageIcon, Trash2 } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { tracker } from '../../services/activityTracker'
import { GAMIFICATION_LEVELS, ACADEMIC_LEVELS, PACKAGES } from '../../lib/constants'
import { timeAgo } from '../../utils/dateHelpers'
import NotificationSettings from '../../components/layout/NotificationSettings'
import ImmersionToggle from '../../components/ImmersionToggle'
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

function transliterateArabic(str) {
  const map = { 'ا':'a','أ':'a','إ':'e','آ':'a','ب':'b','ت':'t','ث':'th','ج':'j','ح':'h','خ':'kh','د':'d','ذ':'dh','ر':'r','ز':'z','س':'s','ش':'sh','ص':'s','ض':'d','ط':'t','ظ':'z','ع':'a','غ':'gh','ف':'f','ق':'q','ك':'k','ل':'l','م':'m','ن':'n','ه':'h','و':'w','ي':'y','ى':'a','ة':'a','ء':'','ئ':'y','ؤ':'w' }
  return str.split('').map(c => map[c] ?? c).join('')
}

function generateUsername(displayName) {
  const base = transliterateArabic(displayName || '').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()
  const digits = Math.floor(100 + Math.random() * 900)
  return (base || 'user') + digits
}

function ProfileContent() {
  const { profile, studentData, fetchProfile, user } = useAuthStore()
  const queryClient = useQueryClient()
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [editing, setEditing] = useState(false)

  // Avatar upload state
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoMsg, setPhotoMsg] = useState(null)
  const [showPhotoSheet, setShowPhotoSheet] = useState(false)

  async function handlePhotoUpload(file) {
    if (!file || !profile?.id) return
    setUploadingPhoto(true)
    setPhotoMsg(null)
    try {
      // Compress image client-side
      const blob = await new Promise((resolve) => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        const img = new Image()
        img.onload = () => {
          const maxSize = 800
          let w = img.width, h = img.height
          // Square crop from center
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
      setPhotoMsg({ type: 'error', text: 'فشل في رفع الصورة — حاول مرة أخرى' })
      setTimeout(() => setPhotoMsg(null), 4000)
    } finally {
      setUploadingPhoto(false)
    }
  }

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deletingPhoto, setDeletingPhoto] = useState(false)

  async function handleDeletePhoto() {
    if (!profile?.id || !profile?.avatar_url) return
    setDeletingPhoto(true)
    try {
      // Extract the file path from the URL (everything after /avatars/)
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

  const { data: classRank } = useQuery({
    queryKey: ['student-class-rank', profile?.id],
    queryFn: async () => {
      // Get all students in same group, ordered by XP descending
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
    <div className="space-y-8">
      {/* Profile Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="fl-card-static p-7" style={{ borderColor: 'var(--border-glow)' }}>
        <div className="flex items-start gap-4">
          {/* Avatar with photo upload */}
          <div className="relative shrink-0">
            <div
              onClick={() => setShowPhotoSheet(true)}
              className="w-16 h-16 rounded-2xl overflow-hidden cursor-pointer group"
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 text-2xl font-bold">
                  {(profile?.full_name || profile?.display_name)?.[0] || '?'}
                </div>
              )}
              <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                {uploadingPhoto ? (
                  <Loader2 size={18} className="text-white animate-spin" />
                ) : (
                  <Camera size={18} className="text-white" />
                )}
              </div>
            </div>
            {photoMsg && (
              <p className={`absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] whitespace-nowrap ${photoMsg.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                {photoMsg.text}
              </p>
            )}

            {/* Photo upload bottom sheet */}
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
                      <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
                        <ImageIcon size={18} className="text-sky-400" />
                      </div>
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>اختر من المعرض</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])}
                      />
                    </label>

                    <label className="flex items-center gap-3 p-4 rounded-xl cursor-pointer hover:bg-white/[0.03] transition-colors" style={{ border: '1px solid var(--border-subtle)' }}>
                      <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                        <Camera size={18} className="text-violet-400" />
                      </div>
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>التقط صورة</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="user"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])}
                      />
                    </label>

                    {/* Delete photo */}
                    {profile?.avatar_url && !confirmDelete && (
                      <button
                        onClick={() => setConfirmDelete(true)}
                        className="flex items-center gap-3 p-4 rounded-xl w-full hover:bg-red-500/[0.05] transition-colors text-left"
                        style={{ border: '1px solid rgba(239,68,68,0.15)' }}
                      >
                        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                          <Trash2 size={18} className="text-red-400" />
                        </div>
                        <span className="text-sm font-medium text-red-400">حذف الصورة</span>
                      </button>
                    )}

                    {/* Delete confirm */}
                    {confirmDelete && (
                      <div className="rounded-xl p-4 space-y-3" style={{ border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)' }}>
                        <p className="text-sm text-center font-medium" style={{ color: 'var(--text-primary)' }}>
                          هل تريد حذف صورة الملف الشخصي؟
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
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{profile?.full_name}</h2>
            {user?.email && (
              <div className="flex items-center gap-1.5 text-sm text-muted mt-0.5">
                <Mail size={13} className="text-muted" strokeWidth={1.5} />
                <span>{user.email}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm text-muted mt-1.5 flex-wrap">
              <span className="badge-blue">{pkg.name_ar}</span>
              <span className="badge-muted">{academicLevel.name_ar} ({academicLevel.cefr})</span>
              {studentData?.created_at && (
                <span className="flex items-center gap-1 text-xs text-muted">
                  <CalendarDays size={12} strokeWidth={1.5} />
                  انضم {timeAgo(studentData.created_at)}
                </span>
              )}
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

            {/* Username */}
            <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-default)' }}>
              <div className="flex items-center gap-1.5 text-sm mb-2">
                <AtSign size={13} className="text-violet-400" strokeWidth={1.5} />
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
                  <button onClick={() => { setEditingUsername(true); setUsernameValue(profile.username) }} className="text-xs text-sky-400 hover:text-sky-300 transition-colors">
                    تعديل
                  </button>
                </div>
              ) : (
                <button onClick={() => { setEditingUsername(true); setUsernameValue(generateUsername(profile?.display_name)) }} className="text-xs text-sky-400 hover:text-sky-300 transition-all duration-200">
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

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'XP', value: xp, icon: Zap, variant: 'sky' },
          { label: 'السلسلة', value: `${streak} يوم`, icon: Flame, variant: 'amber' },
          { label: 'المستوى', value: currentLevel.level, icon: Trophy, variant: 'violet' },
          { label: 'الترتيب', value: classRank ? `${classRank.rank}/${classRank.total}` : '—', icon: Medal, variant: 'emerald' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className={`fl-stat-card ${stat.variant}`}>
            <stat.icon size={22} className={`mb-2 ${stat.variant === 'sky' ? 'text-sky-400' : stat.variant === 'amber' ? 'text-amber-400' : stat.variant === 'emerald' ? 'text-emerald-400' : 'text-violet-400'}`} strokeWidth={1.5} />
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

      {/* Change Password */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="fl-card-static p-6">
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
            تغيير كلمة المرور
          </button>
        )}
        {passwordMsg && (
          <p className={`text-xs mt-2 ${passwordMsg.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
            {passwordMsg.text}
          </p>
        )}
      </motion.div>

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
  const { user } = useAuthStore()
  const isImpersonating = useAuthStore((s) => s.isImpersonating())
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
        <p className="text-sm text-muted mt-1">اختاري الثيم اللي يريحك — يُحفظ ويتبعك على كل أجهزتك</p>
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
                <span className="mt-2 inline-block text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${t.accent}20`, color: t.accent }}>
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
