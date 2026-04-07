import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, Award, Loader2, ArrowLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { ACADEMIC_LEVELS, ACADEMY, GAMIFICATION_LEVELS } from '../../lib/constants'
import { formatDateAr } from '../../utils/dateHelpers'

// ─── Replicate the deterministic cert ID generator from StudentCertificate ────
function certId(studentId, type, date) {
  const raw = `${studentId}-${type}-${date}`
  let hash = 0
  for (let i = 0; i < raw.length; i++) {
    hash = (hash << 5) - hash + raw.charCodeAt(i)
    hash |= 0
  }
  const hex = Math.abs(hash).toString(16).toUpperCase().padStart(8, '0')
  return `FL-${hex}`
}

function getGamLevel(xp) {
  for (let i = GAMIFICATION_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= GAMIFICATION_LEVELS[i].xp) return GAMIFICATION_LEVELS[i]
  }
  return GAMIFICATION_LEVELS[0]
}

// ─── Reconstruct all certificates for a student (same logic as StudentCertificate) ──
function buildCertificates({ profile, studentData, assessments, xpHistory }) {
  const studentId = profile?.id || 'unknown'
  const certs = []

  // 1) Academic level completion certificates
  const currentLevel = studentData?.academic_level || 1
  for (let lvl = 1; lvl < currentLevel; lvl++) {
    const info = ACADEMIC_LEVELS[lvl]
    if (!info) continue
    const joinDate = new Date(studentData?.created_at || profile?.created_at || Date.now())
    const issued = new Date(joinDate)
    issued.setMonth(issued.getMonth() + (lvl * 4))
    const id = certId(studentId, `level_${lvl}`, issued.toISOString().split('T')[0])
    certs.push({
      id,
      type: 'level',
      typeLabel: 'إتمام المستوى',
      icon: '🎓',
      title: `إتمام مستوى ${info.name_ar} (${info.cefr})`,
      description: `أتمّ الطالب بنجاح مستوى ${info.name_ar} الموافق لمستوى ${info.cefr} وفق الإطار الأوروبي المرجعي.`,
      issuedAt: issued.toISOString(),
    })
  }

  // 2) Quiz / assessment excellence certificates (overall_score >= 90)
  const ASSESSMENT_TYPE_LABELS = { placement: 'تقييم أولي', periodic: 'تقييم دوري', self: 'تقييم ذاتي' }
  ;(assessments || []).forEach((a) => {
    const id = certId(studentId, `quiz_${a.id}`, a.created_at?.split('T')[0] || '')
    certs.push({
      id,
      type: 'quiz',
      typeLabel: 'تميّز في التقييم',
      icon: '⭐',
      title: `تميّز في ${ASSESSMENT_TYPE_LABELS[a.type] || 'التقييم'} — ${a.overall_score}%`,
      description: `حقّق الطالب درجة استثنائية بلغت ${a.overall_score}% في ${ASSESSMENT_TYPE_LABELS[a.type] || 'التقييم'}.`,
      issuedAt: a.created_at,
    })
  })

  // 3) Streak achievement certificates
  const maxStreak = studentData?.longest_streak || studentData?.current_streak || 0
  const STREAK_MILESTONES = [
    { days: 30, icon: '🔥', label: 'سلسلة 30 يوماً' },
    { days: 60, icon: '💫', label: 'سلسلة 60 يوماً' },
    { days: 100, icon: '🏆', label: 'سلسلة 100 يوماً' },
  ]
  STREAK_MILESTONES.forEach(({ days, icon, label }) => {
    if (maxStreak >= days) {
      const streakTx = (xpHistory || []).find((tx) => tx.reason === 'streak_bonus')
      const issued = streakTx?.created_at || studentData?.created_at || new Date().toISOString()
      const id = certId(studentId, `streak_${days}`, issued.split('T')[0])
      certs.push({
        id,
        type: 'streak',
        typeLabel: 'إنجاز الاستمرارية',
        icon,
        title: label,
        description: `حافظ الطالب على سلسلة تعلّم متواصلة لمدة ${days} يوماً متتالية.`,
        issuedAt: issued,
      })
    }
  })

  // 4) Gamification level 20
  const gamLevel = getGamLevel(studentData?.xp_total || 0)
  if (gamLevel.level >= 20) {
    const id = certId(studentId, 'fluentia_master', new Date().toISOString().split('T')[0])
    certs.push({
      id,
      type: 'special',
      typeLabel: 'إنجاز استثنائي',
      icon: '👑',
      title: 'طلاقة كاملة — المستوى الأسطوري',
      description: 'وصل الطالب إلى قمة نظام التقدم في أكاديمية طلاقة.',
      issuedAt: new Date().toISOString(),
    })
  }

  return certs
}

// ─── Main Verification Page ──────────────────────────────────────────────────
export default function CertificateVerification() {
  const { certId: urlCertId } = useParams()
  const [status, setStatus] = useState('loading') // loading | found | not_found
  const [certData, setCertData] = useState(null)
  const [studentName, setStudentName] = useState('')

  useEffect(() => {
    if (!urlCertId) {
      setStatus('not_found')
      return
    }

    async function verify() {
      setStatus('loading')

      try {
        // Fetch all students with their profiles to reconstruct certificates
        const { data: students, error: studentsErr } = await supabase
          .from('students')
          .select('id, user_id, academic_level, created_at, longest_streak, current_streak, xp_total')

        if (studentsErr || !students?.length) {
          setStatus('not_found')
          return
        }

        // Fetch profiles for display names
        const userIds = students.map((s) => s.user_id)
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, full_name, created_at')
          .in('id', userIds)

        const profileMap = {}
        ;(profiles || []).forEach((p) => { profileMap[p.id] = p })

        // For each student, reconstruct certificates and check for a match
        for (const student of students) {
          const profile = profileMap[student.user_id]
          if (!profile) continue

          // Fetch assessments with score >= 90 for this student
          const { data: assessments } = await supabase
            .from('assessments')
            .select('id, type, overall_score, created_at')
            .eq('student_id', profile.id)
            .gte('overall_score', 90)

          // Fetch xp history for streak dates
          const { data: xpHistory } = await supabase
            .from('xp_transactions')
            .select('id, reason, created_at')
            .eq('student_id', profile.id)
            .in('reason', ['streak_bonus'])
            .order('created_at', { ascending: false })
            .limit(10)

          const certs = buildCertificates({
            profile,
            studentData: student,
            assessments: assessments || [],
            xpHistory: xpHistory || [],
          })

          const match = certs.find((c) => c.id === urlCertId)
          if (match) {
            setCertData(match)
            setStudentName(profile.full_name || profile.display_name || 'الطالب')
            setStatus('found')
            return
          }
        }

        setStatus('not_found')
      } catch (err) {
        console.error('Certificate verification error:', err)
        setStatus('not_found')
      }
    }

    verify()
  }, [urlCertId])

  return (
    <div
      dir="rtl"
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #0a0a1a 0%, #0f0c29 40%, #1a1040 70%, #0d1b2a 100%)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* ─── Header ─────────────────────────────────────────── */}
        <div className="text-center mb-6">
          <div
            className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))',
              border: '1px solid rgba(212,175,55,0.3)',
            }}
          >
            <Award size={28} style={{ color: '#D4AF37' }} />
          </div>
          <h1
            className="text-lg font-bold tracking-wider"
            style={{ color: '#D4AF37' }}
          >
            {ACADEMY.name}
          </h1>
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
            التحقق من الشهادات
          </p>
        </div>

        {/* ─── Card ───────────────────────────────────────────── */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Loading */}
          {status === 'loading' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16 px-6"
            >
              <Loader2
                size={36}
                className="animate-spin mb-4"
                style={{ color: '#D4AF37' }}
              />
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                جاري التحقق من الشهادة...
              </p>
              <p
                className="text-xs mt-2 font-mono"
                style={{ color: 'rgba(212,175,55,0.5)' }}
              >
                {urlCertId}
              </p>
            </motion.div>
          )}

          {/* ─── Found ────────────────────────────────────────── */}
          {status === 'found' && certData && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="p-6"
            >
              {/* Verified Badge */}
              <div className="flex flex-col items-center mb-6">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
                  style={{
                    background: 'rgba(16,185,129,0.12)',
                    border: '2px solid rgba(16,185,129,0.4)',
                  }}
                >
                  <CheckCircle size={32} style={{ color: '#10b981' }} />
                </div>
                <h2
                  className="text-lg font-bold"
                  style={{ color: '#10b981' }}
                >
                  شهادة موثقة
                </h2>
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Verified Certificate
                </p>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, transparent, rgba(212,175,55,0.3))' }} />
                <span style={{ color: 'rgba(212,175,55,0.5)', fontSize: 10 }}>✦</span>
                <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(212,175,55,0.3))' }} />
              </div>

              {/* Certificate Details */}
              <div className="space-y-4">
                {/* Student Name */}
                <div
                  className="rounded-xl p-4 text-center"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    اسم الطالب
                  </p>
                  <p className="text-base font-bold text-white">
                    {studentName}
                  </p>
                </div>

                {/* Cert Type + Title */}
                <div className="grid grid-cols-2 gap-3">
                  <div
                    className="rounded-xl p-3"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      نوع الشهادة
                    </p>
                    <p className="text-sm font-semibold" style={{ color: '#D4AF37' }}>
                      {certData.icon} {certData.typeLabel}
                    </p>
                  </div>
                  <div
                    className="rounded-xl p-3"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      تاريخ الإصدار
                    </p>
                    <p className="text-sm font-semibold text-white">
                      {formatDateAr(certData.issuedAt)}
                    </p>
                  </div>
                </div>

                {/* Title */}
                <div
                  className="rounded-xl p-4"
                  style={{
                    background: 'rgba(212,175,55,0.05)',
                    border: '1px solid rgba(212,175,55,0.15)',
                  }}
                >
                  <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    عنوان الشهادة
                  </p>
                  <p className="text-sm font-semibold text-white leading-relaxed">
                    {certData.title}
                  </p>
                </div>

                {/* Cert ID */}
                <div className="text-center">
                  <p
                    className="text-xs font-mono"
                    style={{ color: 'rgba(212,175,55,0.5)' }}
                  >
                    رقم الشهادة: {certData.id}
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, transparent, rgba(212,175,55,0.3))' }} />
                <span style={{ color: 'rgba(212,175,55,0.5)', fontSize: 10 }}>✦</span>
                <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(212,175,55,0.3))' }} />
              </div>

              {/* Academy Confirmation */}
              <div className="text-center">
                <p
                  className="text-sm font-medium mb-1"
                  style={{ color: 'rgba(255,255,255,0.7)' }}
                >
                  هذه الشهادة صادرة من أكاديمية طلاقة
                </p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {ACADEMY.name} — {ACADEMY.name_ar}
                </p>
              </div>
            </motion.div>
          )}

          {/* ─── Not Found ────────────────────────────────────── */}
          {status === 'not_found' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center py-16 px-6"
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
                style={{
                  background: 'rgba(239,68,68,0.12)',
                  border: '2px solid rgba(239,68,68,0.4)',
                }}
              >
                <XCircle size={32} style={{ color: '#ef4444' }} />
              </div>
              <h2
                className="text-lg font-bold mb-2"
                style={{ color: '#ef4444' }}
              >
                شهادة غير موجودة
              </h2>
              <p className="text-sm text-center leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
                لم يتم العثور على شهادة بهذا الرقم
              </p>
              <p
                className="text-xs mt-3 font-mono"
                style={{ color: 'rgba(255,255,255,0.25)' }}
              >
                {urlCertId}
              </p>
            </motion.div>
          )}
        </div>

        {/* ─── Footer ─────────────────────────────────────────── */}
        <div className="text-center mt-6">
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
            {ACADEMY.name_ar} &copy; {new Date().getFullYear()}
          </p>
        </div>
      </motion.div>
    </div>
  )
}
