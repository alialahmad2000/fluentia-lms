/**
 * Smart Encouraging Messages System
 * Returns contextual Arabic encouragement based on student stats.
 */

const TIME_GREETINGS = {
  morning: [
    'صباح الإنجازات! 🌅',
    'يوم جديد مليء بالفرص!',
    'صباح النشاط والتعلم!',
  ],
  afternoon: [
    'استمر في التألق! ☀️',
    'نصف اليوم انتهى وأنت رائع!',
    'وقت مثالي للتعلم!',
  ],
  evening: [
    'مساء الإنجاز! 🌙',
    'اختم يومك بإنجاز جديد!',
    'مساء التميز والإبداع!',
  ],
}

const STREAK_MESSAGES = {
  none: [
    'ابدأ سلسلتك اليوم! كل رحلة تبدأ بخطوة 💪',
    'لا تنسى تسجيل دخولك اليومي!',
    'حان وقت بناء عادة التعلم اليومية!',
  ],
  starting: [ // 1-3 days
    'بداية رائعة! حافظ على السلسلة 🔥',
    'أنت تبني عادة جديدة، استمر!',
    'كل يوم يقربك من هدفك!',
  ],
  building: [ // 4-6 days
    'سلسلة قوية! لا تكسرها 💪',
    'أنت في الطريق الصحيح!',
    'الاستمرارية سر النجاح!',
  ],
  weekly: [ // 7-13 days
    'أسبوع كامل! أنت بطل 🏆',
    'سلسلة أسبوعية مذهلة!',
    'التزامك يثمر نتائج رائعة!',
  ],
  strong: [ // 14-29 days
    'سلسلة أسطورية! لا يوقفك شيء 🌟',
    'أنت من القلائل الملتزمين!',
    'نصف شهر من التميز المتواصل!',
  ],
  legendary: [ // 30+ days
    'أنت أسطورة! شهر كامل من الالتزام 👑',
    'التميز أصبح عادتك اليومية!',
    'ملك الاستمرارية بلا منازع!',
  ],
}

const XP_MESSAGES = {
  beginner: [ // 0-99
    'كل نقطة XP تقربك من القمة!',
    'رحلتك بدأت للتو، استمتع بالتعلم!',
    'أنت تتعلم وتنمو كل يوم!',
  ],
  rising: [ // 100-499
    'تقدم ملحوظ! اجمع المزيد من XP 📈',
    'أنت في صعود مستمر!',
    'نجم صاعد في الأكاديمية!',
  ],
  intermediate: [ // 500-999
    'مستوى متقدم! أنت تتألق ✨',
    'خبرتك تزداد يوماً بعد يوم!',
    'أنت من المميزين في مجموعتك!',
  ],
  advanced: [ // 1000-2499
    'خبير حقيقي! مستواك يلهم الآخرين 🌟',
    'ألف نقطة وأكثر — إنجاز يستحق الاحتفال!',
    'أنت قدوة لزملائك!',
  ],
  expert: [ // 2500+
    'أنت في القمة! استمر بالتميز 👑',
    'مستوى استثنائي يستحق الإعجاب!',
    'من أبرز طلاب الأكاديمية!',
  ],
}

const TASK_MESSAGES = {
  none: [
    'لديك مهام جديدة بانتظارك!',
    'ابدأ بمهامك الأسبوعية لتحصد XP!',
  ],
  partial: [
    'أحسنت! أكمل بقية المهام 💪',
    'في منتصف الطريق، لا تتوقف!',
    'كل مهمة تكملها = تقدم حقيقي!',
  ],
  complete: [
    'أنجزت كل المهام! أنت نجم الأسبوع ⭐',
    'مهام الأسبوع مكتملة — تستحق الراحة!',
    'إنجاز مبهر! استعد للأسبوع القادم!',
  ],
}

const ASSIGNMENT_MESSAGES = {
  none: [
    'لا واجبات معلقة — استمتع بوقتك!',
    'كل شيء منجز، أنت منظم!',
  ],
  pending: [
    'لديك واجبات — لا تؤجلها!',
    'أنجز واجباتك مبكراً لتتفوق!',
    'الواجبات فرصة لتطوير مهاراتك!',
  ],
}

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────
function pick(arr) {
  // Use date-based seed so the message stays consistent within the same day
  const today = new Date()
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()
  return arr[seed % arr.length]
}

function getTimeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

function getStreakTier(streak) {
  if (!streak || streak === 0) return 'none'
  if (streak <= 3) return 'starting'
  if (streak <= 6) return 'building'
  if (streak <= 13) return 'weekly'
  if (streak <= 29) return 'strong'
  return 'legendary'
}

function getXpTier(xp) {
  if (!xp || xp < 100) return 'beginner'
  if (xp < 500) return 'rising'
  if (xp < 1000) return 'intermediate'
  if (xp < 2500) return 'advanced'
  return 'expert'
}

// ──────────────────────────────────────────────────────────────
// Main export
// ──────────────────────────────────────────────────────────────
/**
 * Get a contextual encouraging message based on student stats.
 * @param {Object} stats
 * @param {number} stats.streak - current streak days
 * @param {number} stats.xp - total XP
 * @param {number} stats.tasksCompleted - completed tasks this week
 * @param {number} stats.tasksTotal - total tasks this week
 * @param {number} stats.pendingAssignments - pending assignment count
 * @returns {{ greeting: string, motivation: string, tip: string }}
 */
export function getEncouragement(stats = {}) {
  const { streak = 0, xp = 0, tasksCompleted = 0, tasksTotal = 0, pendingAssignments = 0 } = stats

  const greeting = pick(TIME_GREETINGS[getTimeOfDay()])

  // Pick the most relevant motivation based on priority
  let motivation
  const streakTier = getStreakTier(streak)
  const xpTier = getXpTier(xp)

  // Priority: streak achievement > task progress > xp milestone
  if (streakTier === 'legendary' || streakTier === 'strong') {
    motivation = pick(STREAK_MESSAGES[streakTier])
  } else if (tasksTotal > 0 && tasksCompleted >= tasksTotal) {
    motivation = pick(TASK_MESSAGES.complete)
  } else if (tasksTotal > 0 && tasksCompleted > 0) {
    motivation = pick(TASK_MESSAGES.partial)
  } else if (xpTier === 'expert' || xpTier === 'advanced') {
    motivation = pick(XP_MESSAGES[xpTier])
  } else if (streakTier !== 'none') {
    motivation = pick(STREAK_MESSAGES[streakTier])
  } else {
    motivation = pick(XP_MESSAGES[xpTier])
  }

  // Tip based on actionable next step
  let tip
  if (pendingAssignments > 0) {
    tip = pick(ASSIGNMENT_MESSAGES.pending)
  } else if (tasksTotal > 0 && tasksCompleted < tasksTotal) {
    tip = pick(TASK_MESSAGES.partial)
  } else if (streakTier === 'none') {
    tip = pick(STREAK_MESSAGES.none)
  } else {
    tip = pick(ASSIGNMENT_MESSAGES.none)
  }

  return { greeting, motivation, tip }
}

/**
 * Get a single-line encouraging message (simplified).
 */
export function getMotivation(stats = {}) {
  const { motivation } = getEncouragement(stats)
  return motivation
}
