import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import AnimatedNumber from '../../components/ui/AnimatedNumber'
import { Users, UserCheck, Layers, CreditCard, TrendingUp, AlertCircle, Calendar, ArrowUpRight, ArrowDownRight, Brain, Activity, Smartphone, ChevronLeft, ShieldCheck, Wallet } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { getGreeting } from '../../utils/dateHelpers'
import { PACKAGES } from '../../lib/constants'
import { DashboardSkeleton } from '../../components/ui/PageSkeleton'
import { Link } from 'react-router-dom'
import UserAvatar from '../../components/common/UserAvatar'
import CurriculumActivityCard from '../../components/dashboard/CurriculumActivityCard'
import EnableNotificationsPrompt from '../../components/notifications/EnableNotificationsPrompt'
import DeviceInstallStatusWidget from '../../components/admin/DeviceInstallStatusWidget'
import EvaluationHealthWidget from '../../components/admin/EvaluationHealthWidget'
import PlacementQueueWidget from './PlacementQueueWidget'
import AtelierLauncher from './atelier-preview/AtelierLauncher'
import './adminDashboard.css'

const EASE = [0.16, 1, 0.3, 1]
const sectionReveal = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.5, ease: EASE },
}
const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.08 } },
}
const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
}

function Eyebrow({ label, hint }) {
  return (
    <div className="adx-eyebrow">
      <span className="adx-eyebrow__spark" />
      <span className="adx-eyebrow__label">{label}</span>
      {hint && <span className="adx-eyebrow__hint">{hint}</span>}
      <span className="adx-eyebrow__rule" />
    </div>
  )
}

export default function AdminDashboard() {
  const profile = useAuthStore((s) => s.profile)
  const firstName = profile?.full_name || profile?.display_name || ''

  // Total active students
  const { data: studentStats } = useQuery({
    queryKey: ['admin-student-stats'],
    queryFn: async () => {
      const { data } = await supabase
        .from('students')
        .select('status, package')
        .is('deleted_at', null)
      if (!data) return { total: 0, active: 0, byPackage: {} }

      const active = data.filter(s => s.status === 'active').length
      const byPackage = {}
      data.forEach(s => {
        byPackage[s.package] = (byPackage[s.package] || 0) + 1
      })
      return { total: data.length, active, byPackage }
    },
  })

  // Groups count
  const { data: groupCount } = useQuery({
    queryKey: ['admin-group-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('groups')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
      return count || 0
    },
  })

  // Pending payments
  const { data: paymentStats } = useQuery({
    queryKey: ['admin-payment-stats'],
    queryFn: async () => {
      const { data } = await supabase
        .from('payments')
        .select('status, amount')
        .in('status', ['pending', 'overdue'])
        .is('deleted_at', null)
      const total = data?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0
      return { count: data?.length || 0, total }
    },
  })

  // Recent system errors
  const { data: recentErrors } = useQuery({
    queryKey: ['admin-recent-errors'],
    queryFn: async () => {
      const { data } = await supabase
        .from('system_errors')
        .select('id, error_type, service, error_message, created_at')
        .order('created_at', { ascending: false })
        .limit(5)
      return data || []
    },
  })

  // Recent students list
  const { data: recentStudents } = useQuery({
    queryKey: ['admin-recent-students'],
    queryFn: async () => {
      const { data } = await supabase
        .from('students')
        .select('id, status, package, xp_total, profiles(full_name, avatar_url, is_test_account)')
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('enrollment_date', { ascending: false })
        .limit(12)
      // the owner's bridge shouldn't look like staging — hide test/demo accounts
      return (data || []).filter(s => !s.profiles?.is_test_account).slice(0, 6)
    },
  })

  // Revenue stats (this month vs last month)
  const { data: revenueStats } = useQuery({
    queryKey: ['admin-revenue-stats'],
    queryFn: async () => {
      const now = new Date()
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()

      const [thisMonthRes, lastMonthRes, allPaidRes] = await Promise.all([
        supabase.from('payments').select('amount').eq('status', 'paid').gte('paid_at', thisMonthStart).lt('paid_at', nextMonthStart).is('deleted_at', null),
        supabase.from('payments').select('amount').eq('status', 'paid').gte('paid_at', lastMonthStart).lt('paid_at', thisMonthStart).is('deleted_at', null),
        supabase.from('payments').select('amount, status').is('deleted_at', null),
      ])

      const thisMonth = thisMonthRes.data?.reduce((s, p) => s + (p.amount || 0), 0) || 0
      const lastMonth = lastMonthRes.data?.reduce((s, p) => s + (p.amount || 0), 0) || 0
      const growth = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : 0
      const totalPaid = allPaidRes.data?.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0) || 0
      const totalAll = allPaidRes.data?.reduce((s, p) => s + (p.amount || 0), 0) || 0
      const collectionRate = totalAll > 0 ? Math.round((totalPaid / totalAll) * 100) : 0

      return { thisMonth, lastMonth, growth, collectionRate }
    },
  })

  // Empty seats per group
  const { data: groupSeats } = useQuery({
    queryKey: ['admin-group-seats'],
    queryFn: async () => {
      const { data: groups } = await supabase
        .from('groups')
        .select('id, name, code, max_students, level')
        .eq('is_active', true)

      if (!groups) return []

      const results = await Promise.all(groups.map(async (g) => {
        const { count } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', g.id)
          .eq('status', 'active')
          .is('deleted_at', null)
        return { ...g, students: count || 0, empty: (g.max_students || 7) - (count || 0) }
      }))

      return results.filter(g => g.empty > 0).sort((a, b) => b.empty - a.empty)
    },
  })

  // All groups (for activity card)
  const { data: allGroups } = useQuery({
    queryKey: ['admin-all-groups-activity'],
    queryFn: async () => {
      const { data } = await supabase.from('groups').select('id, name, code').eq('is_active', true)
      return data || []
    },
  })

  // All student IDs (for activity card)
  const { data: allStudentIds } = useQuery({
    queryKey: ['admin-all-student-ids'],
    queryFn: async () => {
      const { data } = await supabase.from('students').select('id').eq('status', 'active').is('deleted_at', null)
      return (data || []).map(s => s.id)
    },
  })

  // Upcoming payment renewals (next 7 days)
  const { data: upcomingRenewals } = useQuery({
    queryKey: ['admin-upcoming-renewals'],
    queryFn: async () => {
      const today = new Date()
      // Get students whose payment_day is within the next 7 days
      const days = []
      for (let i = 0; i < 7; i++) {
        const d = new Date(today)
        d.setDate(d.getDate() + i)
        days.push(d.getDate())
      }
      const { data } = await supabase
        .from('students')
        .select('id, payment_day, custom_price, package, profiles(full_name)')
        .eq('status', 'active')
        .is('deleted_at', null)
        .in('payment_day', days)
      return data || []
    },
  })

  // Students who entered today (live ops pulse for the hero)
  const { data: activeToday } = useQuery({
    queryKey: ['admin-active-today-count'],
    queryFn: async () => {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const { count } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .is('deleted_at', null)
        .gte('last_active_at', todayStart.toISOString())
      return count || 0
    },
    refetchInterval: 2 * 60 * 1000,
  })

  // PWA install stats
  const { data: pwaStats } = useQuery({
    queryKey: ['admin-pwa-stats'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, pwa_installed')
        .eq('role', 'student')
      if (!data) return { installed: 0, total: 0, notInstalled: [] }
      return {
        installed: data.filter(s => s.pwa_installed).length,
        total: data.length,
        notInstalled: data.filter(s => !s.pwa_installed).map(s => s.full_name),
      }
    },
    staleTime: 60000,
  })

  // Loading state
  const isInitialLoading = !profile
  if (isInitialLoading) return <DashboardSkeleton />

  const todayLine = new Intl.DateTimeFormat('ar-u-ca-gregory-nu-latn', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date())

  // ── Attention items (merged quick-actions + alerts) ──────────────
  const attentionItems = [
    paymentStats?.count > 0 && {
      to: '/admin/packages',
      title: `${paymentStats.count} دفعة معلقة`,
      sub: paymentStats.total ? `بقيمة ${paymentStats.total.toLocaleString()} ر.س` : 'بانتظار التحصيل',
      icon: CreditCard,
      tint: { bg: 'rgba(245,158,11,0.12)', fg: '#fbbf24' },
    },
    recentErrors?.length > 0 && {
      to: '/admin/settings',
      title: `${recentErrors.length} خطأ في النظام`,
      sub: recentErrors[0]?.service ? `آخرها في ${recentErrors[0].service}` : 'راجع التفاصيل',
      icon: AlertCircle,
      tint: { bg: 'rgba(239,68,68,0.12)', fg: '#f87171' },
    },
    upcomingRenewals?.length > 0 && {
      to: '/admin/packages',
      title: `${upcomingRenewals.length} تجديد خلال ٧ أيام`,
      sub: 'جهّز رسائل التذكير',
      icon: Calendar,
      tint: { bg: 'rgba(52,211,153,0.12)', fg: '#34d399' },
    },
    pwaStats?.total > 0 && (pwaStats.total - pwaStats.installed) > 0 && {
      to: '/admin/students',
      title: `${pwaStats.total - pwaStats.installed} طالب بدون التطبيق`,
      sub: 'لم يثبّتوا التطبيق بعد',
      icon: Smartphone,
      tint: { bg: 'rgba(56,189,248,0.12)', fg: '#38bdf8' },
    },
  ].filter(Boolean)

  const allClear = attentionItems.length === 0

  // Data-aware pulse chips: never lead the hero with a dead zero.
  const seatsAvailable = groupSeats?.reduce((sum, g) => sum + g.empty, 0) ?? 0
  const revenueAlive = (revenueStats?.thisMonth || 0) > 0 || (revenueStats?.lastMonth || 0) > 0
  const pulseChips = [
    revenueAlive && {
      label: 'إيرادات هذا الشهر',
      value: revenueStats?.thisMonth ?? 0,
      unit: 'ر.س',
      icon: Wallet,
      tint: { bg: 'rgba(251,191,36,0.13)', fg: '#fbbf24' },
      delta: revenueStats && revenueStats.growth !== 0 ? revenueStats.growth : null,
    },
    {
      label: `${studentStats?.active ?? 0} نشط الآن`,
      value: studentStats?.total ?? 0,
      unit: 'طالب',
      icon: Users,
      tint: { bg: 'rgba(251,191,36,0.13)', fg: '#fbbf24' },
    },
    {
      label: 'مجموعة نشطة',
      value: groupCount ?? 0,
      unit: '',
      icon: Layers,
      tint: { bg: 'rgba(167,139,250,0.13)', fg: '#a78bfa' },
    },
    seatsAvailable > 0 && {
      label: 'مقعد متاح للتسجيل',
      value: seatsAvailable,
      unit: '',
      icon: UserCheck,
      tint: { bg: 'rgba(52,211,153,0.13)', fg: '#34d399' },
    },
    (activeToday ?? 0) > 0 && {
      label: 'دخلوا المنصة اليوم',
      value: activeToday,
      unit: 'طالب',
      icon: Activity,
      tint: { bg: 'rgba(56,189,248,0.13)', fg: '#38bdf8' },
    },
    // only when everyone installed (otherwise the attention rail already carries this fact)
    pwaStats?.total > 0 && pwaStats.installed === pwaStats.total && {
      label: 'ثبّتوا التطبيق — الجميع',
      value: pwaStats.installed,
      unit: `من ${pwaStats.total}`,
      icon: Smartphone,
      tint: { bg: 'rgba(56,189,248,0.13)', fg: '#38bdf8' },
    },
    revenueAlive && {
      label: 'معدل التحصيل',
      value: revenueStats?.collectionRate ?? 0,
      unit: '%',
      icon: TrendingUp,
      tint: { bg: 'rgba(52,211,153,0.13)', fg: '#34d399' },
    },
  ].filter(Boolean).slice(0, 4)

  return (
    <div className="adx-root">
      {/* atmosphere */}
      <div className="adx-atmo" aria-hidden="true">
        <div className="adx-atmo__beam" />
        <div className="adx-atmo__blob adx-atmo__blob--gold" />
        <div className="adx-atmo__blob adx-atmo__blob--steel" />
        <div className="adx-atmo__grain" />
      </div>

      <div className="adx-content">
        {/* ── Hero ─────────────────────────────────────────────── */}
        <motion.section
          className="adx-hero"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: EASE }}
        >
          <div className="adx-hero__eyebrow">غرفة عمليات الأكاديمية</div>
          <h1 className="adx-hero__title">
            {getGreeting()}، <span className="adx-name">{firstName}</span>
          </h1>
          <p className="adx-hero__date">{todayLine}</p>
          <p className="adx-hero__status">
            <span className={`adx-dot ${allClear ? '' : 'warn'}`} />
            {allClear
              ? 'كل شيء يعمل بسلاسة — لا شيء عاجل اليوم'
              : `${attentionItems.length} ${attentionItems.length === 1 ? 'أمر يحتاج' : 'أمور تحتاج'} انتباهك اليوم`}
          </p>

          <motion.div className="adx-pulse" variants={staggerContainer} initial="hidden" animate="show">
            {pulseChips.map((c) => (
              <motion.div key={c.label} className="adx-pulse__chip" variants={staggerItem}>
                <div className="adx-pulse__icon" style={{ background: c.tint.bg }}>
                  <c.icon size={17} strokeWidth={1.8} style={{ color: c.tint.fg }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p className="adx-pulse__value" dir="auto">
                    <AnimatedNumber value={typeof c.value === 'number' ? c.value : 0} duration={0.9} />
                    {c.unit && <small>{c.unit}</small>}
                    {c.delta != null && (
                      <span className="adx-chip" style={{
                        marginInlineStart: 8,
                        background: c.delta > 0 ? 'rgba(52,211,153,0.12)' : 'rgba(239,68,68,0.12)',
                        color: c.delta > 0 ? '#34d399' : '#f87171',
                      }}>
                        {c.delta > 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                        {Math.abs(c.delta)}%
                      </span>
                    )}
                  </p>
                  <p className="adx-pulse__label">{c.label}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        <div style={{ marginTop: 20 }}>
          <EnableNotificationsPrompt />
        </div>

        {/* ── يحتاج انتباهك ─────────────────────────────────────── */}
        <motion.section className="adx-section" {...sectionReveal}>
          <Eyebrow
            label={allClear ? 'يحتاج انتباهك' : `يحتاج انتباهك · ${attentionItems.length}`}
            hint="أولويات اليوم"
          />
          <div className="space-y-4">
            {allClear ? (
              <div className="adx-clear">
                <div className="adx-attn__icon" style={{ background: 'rgba(74,222,128,0.12)' }}>
                  <ShieldCheck size={19} style={{ color: '#4ade80' }} />
                </div>
                <div>
                  <p className="adx-attn__title">كل شيء تحت السيطرة</p>
                  <p className="adx-attn__sub">لا مدفوعات معلقة، لا أخطاء، لا تجديدات وشيكة</p>
                </div>
              </div>
            ) : (
              <div className="adx-attn">
                {attentionItems.map((a) => (
                  <Link key={a.title} to={a.to} className="adx-attn__item">
                    <div className="adx-attn__icon" style={{ background: a.tint.bg }}>
                      <a.icon size={19} strokeWidth={1.8} style={{ color: a.tint.fg }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p className="adx-attn__title">{a.title}</p>
                      <p className="adx-attn__sub">{a.sub}</p>
                    </div>
                    <ChevronLeft size={15} className="adx-attn__arrow" />
                  </Link>
                ))}
              </div>
            )}
            <EvaluationHealthWidget />
            <PlacementQueueWidget />
          </div>
        </motion.section>

        {/* ── نبض الأكاديمية ────────────────────────────────────── */}
        <motion.section className="adx-section" {...sectionReveal}>
          <Eyebrow label="نبض الأكاديمية" hint="نشاط الطلاب لحظة بلحظة" />
          <div className="space-y-5">
            <AdminActivityWidget />
            <CurriculumActivityCard studentIds={allStudentIds} groups={allGroups} mode="admin" delay={0} />
          </div>
        </motion.section>

        {/* ── المالية ──────────────────────────────────────────── */}
        <motion.section className="adx-section" {...sectionReveal}>
          <Eyebrow label="المالية" hint="الإيرادات والتحصيل" />
          <div className="grid lg:grid-cols-2 gap-5 items-start">
            {/* Revenue */}
            <div className="adx-card adx-card--pad">
              {!revenueAlive ? (
                <>
                  <p className="adx-tile__label" style={{ marginBottom: 14 }}>إيرادات هذا الشهر</p>
                  <div className="adx-clear" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="adx-attn__icon" style={{ background: 'rgba(251,191,36,0.1)' }}>
                      <Wallet size={18} style={{ color: 'var(--ds-accent-gold, #fbbf24)' }} />
                    </div>
                    <div>
                      <p className="adx-attn__title">لا مدفوعات مسجلة هذا الشهر</p>
                      <p className="adx-attn__sub">المدفوعات تُدار حالياً خارج المنصة — سجّلها من صفحة المالية لتظهر هنا</p>
                    </div>
                  </div>
                  {paymentStats?.count > 0 && (
                    <p className="adx-tile__sub" dir="auto" style={{ marginTop: 14 }}>
                      {paymentStats.count} دفعة معلقة بقيمة {paymentStats.total.toLocaleString()} ر.س
                    </p>
                  )}
                </>
              ) : (
                <RevenueBody revenueStats={revenueStats} paymentStats={paymentStats} />
              )}
            </div>

            {/* Package distribution */}
            <div className="adx-card adx-card--pad">
              <div className="flex items-center justify-between mb-5">
                <p className="adx-tile__label">توزيع الباقات</p>
                <TrendingUp size={16} style={{ color: 'var(--ds-text-tertiary, #64748b)' }} />
              </div>
              <div className="space-y-4">
                {Object.entries(PACKAGES).map(([key, pkg]) => {
                  const count = studentStats?.byPackage?.[key] || 0
                  const total = studentStats?.total || 0
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-text-primary, #f8fafc)' }}>{pkg.name_ar}</span>
                        <span style={{ fontSize: 12, color: 'var(--ds-text-tertiary, #64748b)' }} dir="auto">{count} طالب ({pct}%)</span>
                      </div>
                      <div className="adx-meter">
                        <div className="adx-meter__fill" style={{ width: `${pct}%`, background: 'linear-gradient(to left, #fde68a, #d9a13c)' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Upcoming renewals */}
          {upcomingRenewals?.length > 0 && (
            <div className="adx-card adx-card--pad" style={{ marginTop: 20 }}>
              <div className="flex items-center gap-2.5 mb-4">
                <Calendar size={16} style={{ color: 'var(--ds-accent-gold, #fbbf24)' }} />
                <p className="adx-tile__label" style={{ color: 'var(--ds-text-primary, #f8fafc)', fontSize: 13, fontWeight: 700 }}>تجديدات قادمة (٧ أيام)</p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {upcomingRenewals.map((s) => {
                  const pkgInfo = PACKAGES[s.package]
                  const amount = s.custom_price || pkgInfo?.price || 0
                  return (
                    <div key={s.id} className="adx-row">
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-text-primary, #f8fafc)' }}>{s.profiles?.full_name}</p>
                        <p className="adx-tile__sub" dir="auto">يوم {s.payment_day} من الشهر</p>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--ds-accent-gold, #fbbf24)' }} dir="auto">{amount} ر.س</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </motion.section>

        {/* ── الطلاب ───────────────────────────────────────────── */}
        <motion.section className="adx-section" {...sectionReveal}>
          <Eyebrow label="الطلاب والمجموعات" hint="آخر المنضمّين والمقاعد" />
          <div className="grid lg:grid-cols-2 gap-5 items-start">
            {/* Active students */}
            <div className="adx-card adx-card--pad">
              <div className="flex items-center gap-2.5 mb-4">
                <UserCheck size={16} style={{ color: 'var(--ds-accent-gold, #fbbf24)' }} />
                <p className="adx-tile__label" style={{ color: 'var(--ds-text-primary, #f8fafc)', fontSize: 13, fontWeight: 700 }}>أحدث الطلاب النشطين</p>
              </div>
              {recentStudents?.length > 0 ? (
                <div className="space-y-2">
                  {recentStudents.map((s) => {
                    const pkgInfo = PACKAGES[s.package]
                    return (
                      <div key={s.id} className="adx-row">
                        <div className="flex items-center gap-3" style={{ minWidth: 0 }}>
                          <UserAvatar user={s.profiles} size={34} rounded="full" gradient="linear-gradient(135deg, rgba(251,191,36,0.3), rgba(56,189,248,0.15))" />
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-text-primary, #f8fafc)' }} className="truncate">{s.profiles?.full_name}</p>
                            <p className="adx-tile__sub">{pkgInfo?.name_ar || 'بدون باقة'}</p>
                          </div>
                        </div>
                        <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--ds-accent-gold, #fbbf24)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }} dir="auto">
                          {(s.xp_total || 0).toLocaleString()} XP
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="adx-tile__sub">لا يوجد طلاب حتى الآن</p>
              )}
            </div>

            {/* Empty seats */}
            <div className="adx-card adx-card--pad">
              <div className="flex items-center gap-2.5 mb-4">
                <Layers size={16} style={{ color: '#f59e0b' }} />
                <p className="adx-tile__label" style={{ color: 'var(--ds-text-primary, #f8fafc)', fontSize: 13, fontWeight: 700 }}>المقاعد المتاحة</p>
              </div>
              {groupSeats?.length > 0 ? (
                <div className="space-y-3">
                  {groupSeats.map((g) => {
                    const max = g.max_students || 7
                    const occupancy = Math.round((g.students / max) * 100)
                    return (
                      <div key={g.id} className="adx-row" style={{ display: 'block' }}>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-text-primary, #f8fafc)' }}>{g.name || g.code}</p>
                            <p className="adx-tile__sub" dir="auto">المستوى {g.level} · {g.students} من {max} طلاب</p>
                          </div>
                          <span style={{
                            fontSize: 15, fontWeight: 800, flexShrink: 0, fontVariantNumeric: 'tabular-nums',
                            color: g.empty >= 3 ? '#34d399' : g.empty >= 1 ? '#fbbf24' : '#f87171',
                          }} dir="auto">
                            {g.empty} {g.empty === 1 ? 'مقعد' : 'مقاعد'}
                          </span>
                        </div>
                        <div className="adx-meter" style={{ marginTop: 10, height: 5 }}>
                          <div className="adx-meter__fill" style={{ width: `${occupancy}%`, background: 'linear-gradient(to left, #fde68a, #d9a13c)' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="adx-tile__sub">جميع المجموعات مكتملة</p>
              )}
            </div>
          </div>

          {/* Device install status — collapsed behind a designed summary */}
          <DeviceStatusDisclosure pwaStats={pwaStats} />
        </motion.section>

        {/* ── النظام ───────────────────────────────────────────── */}
        <motion.section className="adx-section" style={{ paddingBottom: 8 }} {...sectionReveal}>
          <Eyebrow label="النظام والذكاء الاصطناعي" hint="صحة المنصة" />
          <div className="space-y-5">
            <AIOverviewCard />

            {recentErrors?.length > 0 && (
              <div className="adx-card adx-card--pad" style={{ borderColor: 'rgba(239, 68, 68, 0.22)' }}>
                <div className="flex items-center gap-2.5 mb-4">
                  <AlertCircle size={16} style={{ color: '#f87171' }} />
                  <p className="adx-tile__label" style={{ color: 'var(--ds-text-primary, #f8fafc)', fontSize: 13, fontWeight: 700 }}>أخطاء النظام الأخيرة</p>
                </div>
                <div className="space-y-2.5">
                  {recentErrors.map((e) => (
                    <div key={e.id} style={{
                      fontSize: 12, borderRadius: 12, padding: '10px 12px',
                      background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.12)',
                    }}>
                      <div className="flex items-center justify-between">
                        <span style={{ color: '#f87171', fontWeight: 600 }}>{e.service}</span>
                        <span className="adx-tile__sub">{e.error_type}</span>
                      </div>
                      <p className="adx-tile__sub truncate" style={{ marginTop: 4 }}>{e.error_message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <AtelierLauncher />
          </div>
        </motion.section>
      </div>
    </div>
  )
}

function RevenueBody({ revenueStats, paymentStats }) {
  return (
    <>
      <p className="adx-tile__label" style={{ marginBottom: 10 }}>إيرادات هذا الشهر</p>
      <div className="flex items-end gap-3 flex-wrap">
        <p className="adx-money" dir="auto">
          {(revenueStats?.thisMonth || 0).toLocaleString()} <small>ر.س</small>
        </p>
        {revenueStats && revenueStats.growth !== 0 && (
          <span className="adx-chip" style={{
            marginBottom: 6,
            background: revenueStats.growth > 0 ? 'rgba(52,211,153,0.12)' : 'rgba(239,68,68,0.12)',
            color: revenueStats.growth > 0 ? '#34d399' : '#f87171',
          }}>
            {revenueStats.growth > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(revenueStats.growth)}% عن الشهر الماضي
          </span>
        )}
      </div>
      <p className="adx-tile__sub" dir="auto" style={{ marginTop: 8 }}>
        الشهر الماضي: {(revenueStats?.lastMonth || 0).toLocaleString()} ر.س
      </p>

      <div style={{ marginTop: 24 }}>
        <div className="flex items-center justify-between mb-2">
          <span className="adx-tile__label">معدل التحصيل</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--ds-text-primary, #f8fafc)' }} dir="auto">
            {revenueStats?.collectionRate || 0}%
          </span>
        </div>
        <div className="adx-meter">
          <div
            className="adx-meter__fill"
            style={{
              width: `${revenueStats?.collectionRate || 0}%`,
              background: (revenueStats?.collectionRate || 0) >= 80
                ? 'linear-gradient(to left, #34d399, #10b981)'
                : (revenueStats?.collectionRate || 0) >= 50
                  ? 'linear-gradient(to left, #fbbf24, #f59e0b)'
                  : 'linear-gradient(to left, #f87171, #ef4444)',
            }}
          />
        </div>
        {paymentStats?.count > 0 && (
          <p className="adx-tile__sub" dir="auto" style={{ marginTop: 10 }}>
            {paymentStats.count} دفعة معلقة بقيمة {paymentStats.total.toLocaleString()} ر.س
          </p>
        )}
      </div>
    </>
  )
}

function DeviceStatusDisclosure({ pwaStats }) {
  const [open, setOpen] = useState(false)
  if (!pwaStats || pwaStats.total === 0) return null
  const pct = Math.round((pwaStats.installed / pwaStats.total) * 100)
  const missing = pwaStats.total - pwaStats.installed

  return (
    <div className="adx-card" style={{ marginTop: 20, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full text-start"
        style={{ padding: 26, background: 'transparent', border: 'none', cursor: 'pointer' }}
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <Smartphone size={16} style={{ color: 'var(--ds-text-tertiary, #64748b)' }} />
            <p className="adx-tile__label" style={{ color: 'var(--ds-text-primary, #f8fafc)', fontSize: 13, fontWeight: 700 }}>
              تثبيت التطبيق والإشعارات
            </p>
          </div>
          <div className="flex items-center gap-3">
            <p className="adx-tile__sub" dir="auto" style={{ margin: 0 }}>
              {pwaStats.installed} من {pwaStats.total} ثبّتوا ({pct}%){missing > 0 ? ` · ${missing} بدون التطبيق` : ''}
            </p>
            <span
              className="adx-chip"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--ds-text-secondary, #cbd5e1)' }}
            >
              {open ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
              <ChevronLeft size={12} style={{ transform: open ? 'rotate(-90deg)' : 'none', transition: 'transform 0.25s cubic-bezier(0.16,1,0.3,1)' }} />
            </span>
          </div>
        </div>
        <div className="adx-meter" style={{ marginTop: 14 }}>
          <div
            className="adx-meter__fill"
            style={{ width: `${pct}%`, background: 'linear-gradient(to left, #fde68a, #d9a13c)' }}
          />
        </div>
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
          style={{ padding: '0 18px 18px' }}
        >
          <DeviceInstallStatusWidget />
        </motion.div>
      )}
    </div>
  )
}

function AdminActivityWidget() {
  const { data: activityData, isLoading } = useQuery({
    queryKey: ['admin-student-activity-today'],
    queryFn: async () => {
      const { data: students } = await supabase
        .from('students')
        .select('id, last_active_at, group_id, groups(name, code), profiles(full_name, display_name, avatar_url)')
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('last_active_at', { ascending: false, nullsFirst: false })
        .limit(12)

      if (!students?.length) return []

      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const studentIds = students.map(s => s.id)

      const { data: todaySessions } = await supabase
        .from('user_sessions')
        .select('user_id, started_at, ended_at, duration_minutes')
        .in('user_id', studentIds)
        .gte('started_at', todayStart.toISOString())

      const { data: todayTasks } = await supabase
        .from('student_weekly_tasks')
        .select('student_id')
        .in('student_id', studentIds)
        .eq('status', 'completed')
        .gte('updated_at', todayStart.toISOString())

      const sessionMap = {}
      const taskMap = {}
      ;(todaySessions || []).forEach(s => {
        if (!sessionMap[s.user_id]) sessionMap[s.user_id] = 0
        const mins = s.duration_minutes || (s.ended_at ? Math.round((new Date(s.ended_at) - new Date(s.started_at)) / 60000) : 0)
        sessionMap[s.user_id] += mins
      })
      ;(todayTasks || []).forEach(t => {
        taskMap[t.student_id] = (taskMap[t.student_id] || 0) + 1
      })

      return students.map(s => {
        const now = Date.now()
        const lastActive = s.last_active_at ? new Date(s.last_active_at).getTime() : 0
        const daysSince = lastActive ? (now - lastActive) / (1000 * 60 * 60 * 24) : 999
        let status = 'inactive'
        if (daysSince < 1) status = 'active'
        else if (daysSince < 3) status = 'idle'

        return {
          id: s.id,
          name: s.profiles?.full_name || s.profiles?.display_name || 'طالب',
          avatar_url: s.profiles?.avatar_url,
          groupName: s.groups?.code || s.groups?.name || '',
          status,
          timeToday: sessionMap[s.id] || 0,
          tasksToday: taskMap[s.id] || 0,
        }
      })
    },
  })

  const STATUS_TINT = {
    active:   { dot: '#4ade80', ring: 'rgba(74,222,128,0.2)' },
    idle:     { dot: '#fbbf24', ring: 'rgba(251,191,36,0.2)' },
    inactive: { dot: '#64748b', ring: 'rgba(100,116,139,0.2)' },
  }

  const withSignal = (activityData || []).filter(s => s.status === 'active' || s.timeToday > 0 || s.tasksToday > 0)
  const quiet = (activityData || []).filter(s => !withSignal.includes(s))

  return (
    <div className="adx-card adx-card--pad">
      <div className="flex items-center gap-2.5 mb-4">
        <Activity size={16} style={{ color: '#34d399' }} />
        <p className="adx-tile__label" style={{ color: 'var(--ds-text-primary, #f8fafc)', fontSize: 13, fontWeight: 700 }}>نشاط الطلاب اليوم</p>
      </div>
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-12 rounded-xl" />)}
        </div>
      ) : !activityData?.length ? (
        <p className="adx-tile__sub text-center py-4">لا يوجد طلاب</p>
      ) : withSignal.length === 0 ? (
        <div className="adx-clear" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="adx-attn__icon" style={{ background: 'rgba(100,116,139,0.12)' }}>
            <Activity size={18} style={{ color: '#94a3b8' }} />
          </div>
          <div>
            <p className="adx-attn__title">هدوء حتى الآن</p>
            <p className="adx-attn__sub">لم يدخل أحد اليوم بعد — عادةً يبدأ النشاط مساءً</p>
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-2">
          {withSignal.map(s => {
            const tint = STATUS_TINT[s.status]
            return (
              <Link key={s.id} to={`/admin/student/${s.id}/progress`} className="adx-row" style={{ justifyContent: 'flex-start' }}>
                <span style={{ position: 'relative', flexShrink: 0, display: 'inline-flex' }}>
                  <UserAvatar user={{ display_name: s.name, avatar_url: s.avatar_url }} size={34} rounded="full" />
                  <span style={{
                    position: 'absolute', bottom: -1, insetInlineStart: -1,
                    width: 10, height: 10, borderRadius: '50%',
                    background: tint.dot, border: '2px solid var(--ds-bg-elevated, #0b0f18)',
                  }} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-text-primary, #f8fafc)' }} className="truncate">{s.name}</p>
                  <p className="adx-tile__sub" dir="auto">
                    {s.groupName && `${s.groupName} · `}{s.timeToday > 0 ? `${s.timeToday} دقيقة اليوم` : 'دخل اليوم'}{s.tasksToday > 0 ? ` · ${s.tasksToday} مهمة` : ''}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
      {!isLoading && withSignal.length > 0 && quiet.length > 0 && (
        <p className="adx-tile__sub" dir="auto" style={{ marginTop: 12 }}>
          و{quiet.length} {quiet.length === 1 ? 'طالب لم يدخل' : 'طلاب لم يدخلوا'} اليوم بعد
        </p>
      )}
    </div>
  )
}

function AIOverviewCard() {
  const { data: aiStats } = useQuery({
    queryKey: ['admin-ai-overview'],
    queryFn: async () => {
      const [profilesRes, studentsRes, usageRes] = await Promise.all([
        supabase.from('ai_student_profiles').select('student_id, generated_at', { count: 'exact' }),
        supabase.from('students').select('id', { count: 'exact' }).eq('status', 'active').is('deleted_at', null),
        supabase.from('ai_usage').select('estimated_cost_sar').order('created_at', { ascending: false }).limit(100),
      ])
      const analyzed = profilesRes.count || 0
      const total = studentsRes.count || 0
      const totalCost = (usageRes.data || []).reduce((s, r) => s + (r.estimated_cost_sar || 0), 0)
      return { analyzed, total, totalCost: Math.round(totalCost * 100) / 100 }
    },
  })

  if (!aiStats) return null

  const cells = [
    { value: aiStats.analyzed, label: 'ملفات محللة', color: 'var(--ds-text-primary, #f8fafc)' },
    { value: aiStats.total, label: 'إجمالي الطلاب', color: 'var(--ds-text-primary, #f8fafc)' },
    { value: `${aiStats.totalCost}`, label: 'تكلفة AI (ر.س)', color: 'var(--ds-accent-gold, #fbbf24)' },
  ]

  return (
    <div className="adx-card adx-card--pad">
      <div className="flex items-center gap-2.5 mb-4">
        <Brain size={16} style={{ color: '#a78bfa' }} />
        <p className="adx-tile__label" style={{ color: 'var(--ds-text-primary, #f8fafc)', fontSize: 13, fontWeight: 700 }}>الذكاء الاصطناعي</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {cells.map((c) => (
          <div key={c.label} className="adx-row" style={{ justifyContent: 'center', flexDirection: 'column', gap: 4, padding: '16px 12px' }}>
            <p style={{ fontSize: 24, fontWeight: 800, color: c.color, fontVariantNumeric: 'tabular-nums' }} dir="auto">{c.value}</p>
            <p className="adx-tile__sub">{c.label}</p>
          </div>
        ))}
      </div>
      {aiStats.analyzed < aiStats.total && (
        <p className="adx-tile__sub text-center" style={{ marginTop: 12 }} dir="auto">
          {aiStats.total - aiStats.analyzed} طالب لم يتم تحليلهم بعد — افتح صفحة الطالب من &quot;الطلاب&quot; لتحليل ملفه
        </p>
      )}
    </div>
  )
}
