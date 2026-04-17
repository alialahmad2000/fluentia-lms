import { supabase } from '../lib/supabase'

// ─── Auto-Welcome Message ─────────────────────────────────────
// Call this when a new student completes onboarding
export async function sendWelcomeMessage(studentId, groupId, studentName) {
  // System message in group chat
  await supabase.from('group_messages').insert({
    group_id: groupId,
    sender_id: studentId,
    channel: 'general',
    type: 'system',
    content: `${studentName} انضم للمجموعة — أهلاً وسهلاً! 👋`,
  })

  // Notification to student
  await supabase.from('notifications').insert({
    user_id: studentId,
    type: 'system',
    title: 'أهلاً بك في Fluentia! 🎉',
    body: 'مرحباً بك في أكاديمية طلاقة. استكشف النظام وابدأ رحلتك في تعلم الإنجليزية!',
    data: { link: '/student' },
  })

  // Activity feed entry
  await supabase.from('activity_feed').insert({
    group_id: groupId,
    student_id: studentId,
    type: 'new_member',
    title: 'انضم للمجموعة',
    description: `${studentName} عضو جديد — رحّبوا فيه!`,
  })
}

// ─── Assignment Deadline Reminders ─────────────────────────────
// Run periodically (cron) to check upcoming deadlines
export async function checkAssignmentDeadlines() {
  const now = new Date()

  // 1 day before deadline
  const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const oneDayStart = new Date(oneDayLater)
  oneDayStart.setMinutes(oneDayStart.getMinutes() - 30)
  const oneDayEnd = new Date(oneDayLater)
  oneDayEnd.setMinutes(oneDayEnd.getMinutes() + 30)

  const { data: upcomingAssignments } = await supabase
    .from('assignments')
    .select('id, title, deadline, group_id')
    .eq('is_visible', true)
    .is('deleted_at', null)
    .gte('deadline', oneDayStart.toISOString())
    .lte('deadline', oneDayEnd.toISOString())

  for (const assignment of (upcomingAssignments || [])) {
    // Get students in group who haven't submitted
    const { data: students } = await supabase
      .from('students')
      .select('id')
      .eq('group_id', assignment.group_id)
      .eq('status', 'active')
      .is('deleted_at', null)

    const { data: submitted } = await supabase
      .from('submissions')
      .select('student_id')
      .eq('assignment_id', assignment.id)
      .is('deleted_at', null)

    const submittedIds = new Set((submitted || []).map(s => s.student_id))
    const pendingStudents = (students || []).filter(s => !submittedIds.has(s.id))

    // Send deadline reminder to pending students
    const notifications = pendingStudents.map(s => ({
      user_id: s.id,
      type: 'assignment_deadline',
      title: 'موعد تسليم قريب ⏰',
      body: `واجب "${assignment.title}" موعد تسليمه غداً!`,
      data: { link: '/student/assignments', assignment_id: assignment.id },
    }))

    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications)
    }
  }

  // 2 hours before deadline
  const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000)
  const twoHoursStart = new Date(twoHoursLater)
  twoHoursStart.setMinutes(twoHoursStart.getMinutes() - 15)
  const twoHoursEnd = new Date(twoHoursLater)
  twoHoursEnd.setMinutes(twoHoursEnd.getMinutes() + 15)

  const { data: urgentAssignments } = await supabase
    .from('assignments')
    .select('id, title, deadline, group_id')
    .eq('is_visible', true)
    .is('deleted_at', null)
    .gte('deadline', twoHoursStart.toISOString())
    .lte('deadline', twoHoursEnd.toISOString())

  for (const assignment of (urgentAssignments || [])) {
    const { data: students } = await supabase
      .from('students')
      .select('id')
      .eq('group_id', assignment.group_id)
      .eq('status', 'active')
      .is('deleted_at', null)

    const { data: submitted } = await supabase
      .from('submissions')
      .select('student_id')
      .eq('assignment_id', assignment.id)
      .is('deleted_at', null)

    const submittedIds = new Set((submitted || []).map(s => s.student_id))
    const pendingStudents = (students || []).filter(s => !submittedIds.has(s.id))

    const notifications = pendingStudents.map(s => ({
      user_id: s.id,
      type: 'assignment_deadline',
      title: 'موعد تسليم عاجل! ⏰',
      body: `واجب "${assignment.title}" موعد تسليمه خلال ساعتين!`,
      data: { link: '/student/assignments', assignment_id: assignment.id },
    }))

    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications)
    }
  }
}

// ─── Class Reminders ───────────────────────────────────────────
export async function checkClassReminders() {
  const now = new Date()

  // 30 minutes before class
  const thirtyMinLater = new Date(now.getTime() + 30 * 60 * 1000)
  const today = now.toISOString().split('T')[0]

  const { data: classes } = await supabase
    .from('classes')
    .select('id, title, group_id, start_time, google_meet_link, groups(name)')
    .eq('date', today)
    .eq('status', 'scheduled')

  for (const cls of (classes || [])) {
    // Check if class starts in ~30 min
    const classTime = new Date(`${today}T${cls.start_time}`)
    const diff = classTime - now
    const minutesUntil = diff / (1000 * 60)

    if (minutesUntil > 25 && minutesUntil < 35) {
      const { data: students } = await supabase
        .from('students')
        .select('id')
        .eq('group_id', cls.group_id)
        .eq('status', 'active')
        .is('deleted_at', null)

      const notifications = (students || []).map(s => ({
        user_id: s.id,
        type: 'class_reminder',
        title: 'تذكير بالحصة 🔔',
        body: `حصتك تبدأ خلال ٣٠ دقيقة${cls.google_meet_link ? ' — جهّز الرابط!' : ''}`,
        data: { link: '/student', class_id: cls.id, meet_link: cls.google_meet_link },
      }))

      if (notifications.length > 0) {
        await supabase.from('notifications').insert(notifications)
      }
    }

    // 5 minutes before class
    if (minutesUntil > 2 && minutesUntil < 8) {
      const { data: students } = await supabase
        .from('students')
        .select('id')
        .eq('group_id', cls.group_id)
        .eq('status', 'active')
        .is('deleted_at', null)

      const notifications = (students || []).map(s => ({
        user_id: s.id,
        type: 'class_reminder',
        title: 'الحصة تبدأ الآن! 🚀',
        body: cls.google_meet_link ? 'ادخل رابط الحصة الآن!' : 'الحصة تبدأ خلال دقائق!',
        data: { link: '/student', class_id: cls.id, meet_link: cls.google_meet_link },
      }))

      if (notifications.length > 0) {
        await supabase.from('notifications').insert(notifications)
      }
    }
  }
}

// ─── Streak Warnings ───────────────────────────────────────────
export async function checkStreakWarnings() {
  // Find students with active streaks who haven't been active in 22+ hours
  const twentyTwoHoursAgo = new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString()
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: atRiskStudents } = await supabase
    .from('students')
    .select('id, current_streak')
    .gt('current_streak', 0)
    .lt('last_active_at', twentyTwoHoursAgo)
    .gt('last_active_at', twentyFourHoursAgo)
    .eq('status', 'active')
    .is('deleted_at', null)

  const notifications = (atRiskStudents || []).map(s => ({
    user_id: s.id,
    type: 'streak_warning',
    title: `تحذير الـ Streak 🔥`,
    body: `سلسلتك ${s.current_streak} يوم — لا تضيّعها! سلّم واجب أو أكمل التحدي اليومي`,
    data: { link: '/student' },
  }))

  if (notifications.length > 0) {
    await supabase.from('notifications').insert(notifications)
  }
}

// ─── Payment Reminders ─────────────────────────────────────────
export async function checkPaymentReminders() {
  const now = new Date()
  const today = now.toISOString().split('T')[0]

  // Find pending/overdue payments
  const { data: pendingPayments } = await supabase
    .from('payments')
    .select('id, student_id, amount, period_start, period_end, status')
    .in('status', ['pending', 'overdue'])
    .is('deleted_at', null)

  for (const payment of (pendingPayments || [])) {
    const periodEnd = new Date(payment.period_end)
    const daysUntil = Math.ceil((periodEnd - now) / (1000 * 60 * 60 * 24))

    let shouldNotify = false
    let title = ''
    let body = ''

    if (daysUntil === 3) {
      shouldNotify = true
      title = 'تذكير بالدفع 💳'
      body = `موعد الدفع بعد ٣ أيام — ${payment.amount} ريال`
    } else if (daysUntil === 0) {
      shouldNotify = true
      title = 'موعد الدفع اليوم 💳'
      body = `اليوم موعد الدفع — ${payment.amount} ريال`
    } else if (daysUntil === -3) {
      shouldNotify = true
      title = 'تأخر الدفع ⚠️'
      body = `الدفع متأخر ٣ أيام — ${payment.amount} ريال`
    } else if (daysUntil === -7) {
      shouldNotify = true
      title = 'تأخر الدفع ⚠️'
      body = `الدفع متأخر أسبوع — ${payment.amount} ريال. يرجى التواصل مع الإدارة.`
    }

    if (shouldNotify) {
      await supabase.from('notifications').insert({
        user_id: payment.student_id,
        type: 'payment_reminder',
        title,
        body,
        data: { link: '/student/profile', payment_id: payment.id },
      })
    }
  }
}

// ─── Run All Auto-Checks ───────────────────────────────────────
// Call this from a cron job or Supabase Edge Function
export async function runAutoMessages() {
  await Promise.allSettled([
    checkAssignmentDeadlines(),
    checkClassReminders(),
    checkStreakWarnings(),
    checkPaymentReminders(),
  ])
}
