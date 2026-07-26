// Rules engine for «تحليل الطالب العميق».
// Pure functions over the facts returned by admin_student_deep_analysis — no
// queries, no AI, no randomness. Every conclusion on the page traces back to a
// rule here, so the reasoning stays reviewable and editable.
//
// Two Arabic-correctness invariants every string here must respect:
//   1) 3rd-person agreement follows students.gender — never hardcode feminine.
//   2) counted nouns: 3–10 take the plural (٣ مرات), 11+ take the singular
//      (١٥ مرة). `cnt()` below is the only place that decision lives.

export const SKILL_AR = {
  reading: 'قراءة',
  grammar: 'قواعد',
  vocabulary: 'مفردات',
  vocabulary_exercise: 'تمارين مفردات',
  writing: 'كتابة',
  listening: 'استماع',
  speaking: 'محادثة',
  assessment: 'اختبار الوحدة',
  pronunciation: 'نطق',
  recording: 'تسجيل',
}

// The six sections the platform counts toward a unit's completion percentage.
export const COUNTED_SKILLS = ['reading', 'grammar', 'vocabulary', 'writing', 'listening', 'speaking']

// Skills where the student PRODUCES language rather than just consuming it.
// A student who only reads is not actually training toward speaking fluently.
export const PRODUCTIVE_SKILLS = ['speaking', 'writing', 'listening']

export const SEVERITY = {
  critical: { label: 'حرِج',    color: '#fb7185', rank: 0 },
  high:     { label: 'مرتفع',   color: '#f59e0b', rank: 1 },
  medium:   { label: 'متوسط',   color: '#fbbf24', rank: 2 },
  low:      { label: 'منخفض',   color: '#94a3b8', rank: 3 },
  good:     { label: 'إيجابي',  color: '#34d399', rank: 4 },
}

const n = (v) => Number(v) || 0

/** Arabic counted noun: 3–10 → plural, otherwise singular. */
export function cnt(value, singular, plural) {
  const v = n(value)
  return `${v} ${v >= 3 && v <= 10 ? plural : singular}`
}

/** 3rd-person gender picker: g(feminine, masculine). Defaults to feminine —
 *  the roster is overwhelmingly female and students.gender defaults to 'female'. */
export function makeG(gender) {
  const fem = gender !== 'male'
  return (feminine, masculine) => (fem ? feminine : masculine)
}

export function daysBetween(fromISO, toISO) {
  if (!fromISO || !toISO) return null
  const a = new Date(fromISO)
  const b = new Date(toISO)
  if (isNaN(a) || isNaN(b)) return null
  return Math.floor((b - a) / 86400000)
}

// ── course shape: inventory, gaps, and progress against it ───────────────────
export function deriveCourse(units = [], g = makeG('female'), { custom = false } = {}) {
  const perUnit = units.map((u) => {
    const inv = {
      reading: n(u.reading),
      grammar: n(u.grammar),
      vocabulary: n(u.vocabulary),
      writing: n(u.writing),
      listening: n(u.listening),
      speaking: n(u.speaking),
    }
    const available = COUNTED_SKILLS.filter((k) => inv[k] > 0)
    const gaps = []

    COUNTED_SKILLS.forEach((k) => {
      if (inv[k] === 0) gaps.push({ code: `missing_${k}`, skill: k, severity: 'high', text: `لا يوجد نشاط ${SKILL_AR[k]}` })
    })
    if (n(u.listening_no_audio) > 0) {
      gaps.push({ code: 'listening_audio', skill: 'listening', severity: 'critical', text: 'مهمة الاستماع بلا صوت' })
    }
    if (n(u.reading_no_audio) > 0) {
      gaps.push({ code: 'reading_audio', skill: 'reading', severity: 'medium', text: 'نص القراءة بلا تسجيل صوتي' })
    }
    if (!u.is_published) {
      // For a custom student their OWN unit being unpublished is a hard blocker
      // we created. For a generic student it is a level-wide content state —
      // real, worth surfacing, but not this student's personal dead end.
      gaps.push(custom
        ? { code: 'unpublished', skill: null, severity: 'critical', text: `الوحدة غير منشورة — لا تظهر ${g('للطالبة', 'للطالب')}` }
        : { code: 'unpublished_level', skill: null, severity: 'medium', text: 'غير منشورة في هذا المستوى' })
    }
    if (inv.grammar > 0 && n(u.grammar_exercises) === 0) {
      gaps.push({ code: 'grammar_empty', skill: 'grammar', severity: 'high', text: 'درس قواعد بلا تمارين' })
    } else if (inv.grammar > 0 && n(u.grammar_exercises) < 10) {
      gaps.push({ code: 'grammar_thin', skill: 'grammar', severity: 'medium', text: `تمارين القواعد قليلة (${n(u.grammar_exercises)})` })
    }
    if (!u.has_cover) {
      gaps.push({ code: 'no_cover', skill: null, severity: 'low', text: 'بلا صورة غلاف' })
    }

    return {
      ...u,
      inv,
      available: available.length,
      done: n(u.numerator),
      pct: n(u.percentage),
      gaps,
      blocking: gaps.some((x) => x.severity === 'critical'),
    }
  })

  const sectionsTotal = perUnit.reduce((s, u) => s + u.available, 0)
  const sectionsDone = perUnit.reduce((s, u) => s + u.done, 0)

  return {
    units: perUnit,
    sectionsTotal,
    sectionsDone,
    coursePct: sectionsTotal > 0 ? Math.round((sectionsDone / sectionsTotal) * 100) : 0,
    unitsTotal: perUnit.length,
    unitsStarted: perUnit.filter((u) => u.done > 0).length,
    unitsFinished: perUnit.filter((u) => u.available > 0 && u.done >= u.available).length,
    unitsBlocked: perUnit.filter((u) => u.blocking),
    unpublished: perUnit.filter((u) => !u.is_published),
    gapCount: perUnit.reduce((s, u) => s + u.gaps.length, 0),
    criticalGaps: perUnit.reduce((s, u) => s + u.gaps.filter((x) => x.severity === 'critical').length, 0),
    readyPct: perUnit.length
      ? Math.round((perUnit.filter((u) => !u.blocking).length / perUnit.length) * 100)
      : 0,
  }
}

// ── signals: what the data says, with severity ───────────────────────────────
export function deriveSignals({ student = {}, engagement = {}, skills = [], course, today, g = makeG(student.gender) }) {
  const out = []
  const push = (s) => out.push(s)

  const daysEnrolled = n(student.days_enrolled)
  const activeDays = n(engagement.active_days)
  const sessions = n(engagement.sessions_total)
  const minutes = n(engagement.learning_minutes)
  const sectionsDone = n(engagement.sections_completed_rows)
  const sinceActive = daysBetween(engagement.last_active_date, today)

  const byType = Object.fromEntries(skills.map((s) => [s.section_type, s]))
  const productiveDone = PRODUCTIVE_SKILLS.reduce((s, k) => s + n(byType[k]?.completed), 0)
  const scored = skills.filter((s) => s.avg_score != null && n(s.completed) > 0)
  const avgScore = scored.length
    ? Math.round(scored.reduce((s, x) => s + n(x.avg_score) * n(x.completed), 0) / scored.reduce((s, x) => s + n(x.completed), 0))
    : null

  // — engagement —
  if (sinceActive != null && sinceActive >= 14) {
    push({ code: 'dormant', severity: 'critical', icon: 'moon',
      title: `${g('صامتة', 'صامت')} منذ ${cnt(sinceActive, 'يوم', 'أيام')}`,
      detail: 'آخر نشاط مسجَّل تجاوز أسبوعين — هذا نمط انسحاب، لا فترة انشغال.' })
  } else if (sinceActive != null && sinceActive >= 7) {
    push({ code: 'stalled', severity: 'high', icon: 'moon',
      title: `${g('متوقفة', 'متوقف')} منذ ${cnt(sinceActive, 'يوم', 'أيام')}`,
      detail: 'أسبوع كامل بلا نشاط — نافذة التدخّل الآن قبل أن تتحول لانقطاع.' })
  } else if (sinceActive != null && sinceActive >= 3) {
    push({ code: 'cooling', severity: 'medium', icon: 'moon',
      title: `آخر نشاط قبل ${cnt(sinceActive, 'يوم', 'أيام')}`,
      detail: 'الإيقاع يبرد. تذكير خفيف الآن أرخص من الاستعادة لاحقًا.' })
  }

  if (daysEnrolled >= 7 && activeDays > 0 && activeDays / Math.max(daysEnrolled, 1) < 0.35) {
    push({ code: 'sparse_days', severity: 'medium', icon: 'calendar',
      title: `${g('نشطة', 'نشط')} ${cnt(activeDays, 'يوم', 'أيام')} من ${daysEnrolled}`,
      detail: `معدل حضور ${Math.round((activeDays / daysEnrolled) * 100)}% — لا توجد عادة يومية بعد.` })
  }

  if (daysEnrolled >= 7 && minutes < 30) {
    push({ code: 'shallow_time', severity: 'high', icon: 'clock',
      title: `${cnt(minutes, 'دقيقة', 'دقائق')} تعلّم فعلي فقط`,
      detail: `الزيارات قصيرة جدًا: ${g('تفتح', 'يفتح')} المنصة، ${g('تتصفّح', 'يتصفّح')}، ثم ${g('تخرج', 'يخرج')} قبل إنجاز شيء.` })
  }

  if (sessions > 0 && student.onboarding_completed === false) {
    push({ code: 'never_onboarded', severity: 'high', icon: 'compass',
      title: `لم ${g('تُكمل', 'يُكمل')} التهيئة الأولى`,
      detail: `${g('دخلت', 'دخل')} ${cnt(sessions, 'مرة', 'مرات')} والتهيئة ما زالت غير مكتملة — على الأرجح لم تُشرح ${g('لها', 'له')} خريطة الطريق داخل المنصة.` })
  }

  if (n(student.longest_streak) <= 1) {
    push({ code: 'no_habit', severity: 'medium', icon: 'flame',
      title: `لم ${g('تبنِ', 'يبنِ')} سلسلة أيام قط`,
      detail: `أطول سلسلة ${cnt(student.longest_streak, 'يوم', 'أيام')} — لم يحدث يومان متتاليان من العمل منذ التسجيل.` })
  }

  // — production vs consumption —
  if (sectionsDone > 0 && productiveDone === 0) {
    push({ code: 'no_production', severity: 'high', icon: 'mic',
      title: 'صفر إنتاج لغوي',
      detail: `كل ما أُنجز استهلاك (قراءة/مفردات). لا محادثة ولا كتابة ولا استماع — وهي المهارات التي ${g('جاءت', 'جاء')} من أجلها.` })
  }
  if (sectionsDone === 0 && sessions > 0) {
    push({ code: 'never_started', severity: 'critical', icon: 'mic',
      title: `لم ${g('تُنجز', 'يُنجز')} أي قسم`,
      detail: `${g('دخلت', 'دخل')} المنصة ${g('لكنها', 'لكنه')} لم ${g('تُكمل', 'يُكمل')} نشاطًا واحدًا حتى الآن.` })
  }

  // — content readiness (ours, not theirs) —
  if (course.criticalGaps > 0) {
    const blocked = course.unitsBlocked
    push({ code: 'content_blocking', severity: 'critical', icon: 'alert',
      title: `${cnt(blocked.length, 'وحدة', 'وحدات')} فيها طريق مسدود`,
      detail: `الوحدات ${blocked.map((u) => u.ord).join('، ')} تحتوي نواقص تمنع الوصول إلى 100% مهما ${g('اجتهدت', 'اجتهد')}.` })
  }
  if (course.unpublished.length > 0 && !course.unitsBlocked.some((u) => u.gaps.some((x) => x.code === 'unpublished'))) {
    push({ code: 'level_unpublished', severity: 'medium', icon: 'alert',
      title: `${cnt(course.unpublished.length, 'وحدة غير منشورة', 'وحدات غير منشورة')} في هذا المستوى`,
      detail: `الوحدات ${course.unpublished.map((u) => u.ord).join('، ')} لا تظهر لأي طالب في المستوى — حالة منهج عامة، لا خاصة بهذا الحساب.` })
  }
  if (course.gapCount > course.criticalGaps) {
    push({ code: 'content_gaps', severity: 'low', icon: 'alert',
      title: `${cnt(course.gapCount - course.criticalGaps, 'ملاحظة محتوى ثانوية', 'ملاحظات محتوى ثانوية')}`,
      detail: 'صور غلاف ناقصة أو تمارين قليلة أو نصوص بلا صوت — لا تمنع التقدّم لكنها تُضعف التجربة.' })
  }

  // — access —
  const daysToExpiry = student.access_expires_at ? daysBetween(today, student.access_expires_at) : null
  if (daysToExpiry != null && daysToExpiry <= 14) {
    push({ code: 'expiring', severity: daysToExpiry <= 3 ? 'critical' : 'high', icon: 'calendar',
      title: daysToExpiry < 0 ? `انتهى ${g('اشتراكها', 'اشتراكه')}` : `الاشتراك ينتهي خلال ${cnt(daysToExpiry, 'يوم', 'أيام')}`,
      detail: `الوصول سيُغلق ويظهر ${g('لها', 'له')} جدار التجديد.` })
  }
  if (student.paused_at) {
    push({ code: 'paused', severity: 'high', icon: 'alert',
      title: 'الحساب موقوف مؤقتًا',
      detail: `لن ${g('ترى', 'يرى')} المحتوى أثناء الإيقاف.` })
  }

  // — positives: what we can rule OUT —
  if (n(engagement.client_errors) === 0 && sessions > 0) {
    push({ code: 'clean_tech', severity: 'good', icon: 'shield',
      title: `لا أعطال تقنية على ${g('حسابها', 'حسابه')}`,
      detail: 'صفر أخطاء واجهة مسجّلة — التوقّف ليس بسبب عطل في المنصة.' })
  }
  if (avgScore != null && avgScore >= 80) {
    push({ code: 'capable', severity: 'good', icon: 'target',
      title: `متوسط ${g('درجاتها', 'درجاته')} ${avgScore}%`,
      detail: `حين ${g('تعمل، تعمل', 'يعمل، يعمل')} جيدًا. المشكلة في الاستمرارية لا في القدرة.` })
  }
  if (course.readyPct === 100 && course.unpublished.length === 0 && course.unitsTotal > 0) {
    push({ code: 'course_ready', severity: 'good', icon: 'shield',
      title: `${g('مسارها', 'مساره')} جاهز بالكامل`,
      detail: `${cnt(course.unitsTotal, 'وحدة منشورة ومكتملة المكوّنات', 'وحدات منشورة ومكتملة المكوّنات')} — لا شيء ينتظر من جهتنا.` })
  }

  out.sort((a, b) => SEVERITY[a.severity].rank - SEVERITY[b.severity].rank)
  return { signals: out, avgScore, productiveDone, sinceActive }
}

// ── the one-line verdict at the top of the page ──────────────────────────────
export function deriveVerdict({ signals, course, engagement, student, g = makeG(student?.gender) }) {
  const has = (c) => signals.some((s) => s.code === c)
  const sectionsDone = n(engagement.sections_completed_rows)

  if (has('paused')) {
    return { tone: 'critical', headline: 'الحساب موقوف',
      line: 'لا يمكن الحكم على الأداء ما دام الوصول مغلقًا — أعِد التفعيل أولًا.' }
  }
  if (has('content_blocking') && sectionsDone === 0) {
    return { tone: 'critical', headline: `${g('مسارها ناقص وهي لم تبدأ', 'مساره ناقص وهو لم يبدأ')}`,
      line: `يجب إغلاق نواقص المحتوى قبل مطالبته بالالتزام — لا ${g('تُطالَب طالبة', 'يُطالَب طالب')} بطريق فيه حفرة.` }
  }
  if (has('never_started')) {
    return { tone: 'critical', headline: `${g('دخلت ولم تبدأ', 'دخل ولم يبدأ')}`,
      line: 'الحساب مفعّل والمحتوى موجود، لكن لم يُنجَز نشاط واحد. المشكلة في الإقلاع لا في المستوى.' }
  }
  if (has('no_production') && (has('stalled') || has('dormant') || has('shallow_time'))) {
    return { tone: 'high', headline: 'بداية هشّة ثم توقّف',
      line: `${g('أنجزت', 'أنجز')} أقسامًا استهلاكية بدرجات ممتازة ثم ${g('توقّفت', 'توقّف')} قبل أن ${g('تلمس', 'يلمس')} المحادثة أو الكتابة — وهي سبب ${g('التحاقها', 'التحاقه')}.` }
  }
  if (has('dormant') || has('stalled')) {
    return { tone: 'high', headline: `${g('تتباعد', 'يتباعد')} عن المنصة`,
      line: 'الفجوة بين الزيارات تتسع — تدخّل شخصي الآن.' }
  }
  if (course.coursePct >= 70) {
    return { tone: 'good', headline: 'في المسار الصحيح',
      line: `${g('أنجزت', 'أنجز')} ${course.coursePct}% من ${g('مسارها', 'مساره')} — حافظ على الإيقاع.` }
  }
  if (course.coursePct >= 25) {
    return { tone: 'medium', headline: `${g('تتقدّم', 'يتقدّم')} ببطء`,
      line: `${course.coursePct}% من المسار — الإيقاع أقل من المطلوب لكنه مستمر.` }
  }
  return { tone: 'medium', headline: 'بداية متعثّرة',
    line: `${course.coursePct}% فقط من المسار بعد ${cnt(student.days_enrolled, 'يوم', 'أيام')} من التسجيل.` }
}

// ── recommended actions, ordered by impact ───────────────────────────────────
export function deriveActions({ signals, course, student, g = makeG(student?.gender) }) {
  const has = (c) => signals.some((s) => s.code === c)
  const actions = []
  const first = (student.name || g('الطالبة', 'الطالب')).split(' ')[0]

  if (has('content_blocking')) {
    const blocked = course.unitsBlocked
    const audioUnits = blocked.filter((u) => u.gaps.some((x) => x.code === 'listening_audio'))
    const unpublished = blocked.filter((u) => u.gaps.some((x) => x.code === 'unpublished'))
    if (audioUnits.length) {
      actions.push({
        owner: 'نحن', effort: 'ساعة',
        title: `توليد صوت الاستماع للوحدات ${audioUnits.map((u) => u.ord).join('، ')}`,
        why: 'بدون الصوت لا يمكن إكمال قسم الاستماع، فتبقى الوحدة أقل من 100% مهما حدث.',
      })
    }
    if (unpublished.length) {
      actions.push({
        owner: 'نحن', effort: 'دقائق',
        title: `نشر الوحدات ${unpublished.map((u) => u.ord).join('، ')}`,
        why: `الوحدات غير المنشورة لا تظهر ${g('لها', 'له')} إطلاقًا.`,
      })
    }
  }

  if (has('never_onboarded') || has('never_started')) {
    actions.push({
      owner: 'المدرب', effort: '١٥ دقيقة',
      title: `جلسة إقلاع مباشرة مع ${first} على الشاشة`,
      why: `${g('دخلت', 'دخل')} عدة مرات بلا إنجاز — هذا نمط «لا أعرف من أين أبدأ»، ويُحلّ بمشاركة شاشة واحدة لا برسالة.`,
    })
  }

  if (has('no_production')) {
    actions.push({
      owner: 'المدرب', effort: 'مهمة واحدة',
      title: `${g('تكليفها', 'تكليفه')} بمهمة محادثة واحدة محدّدة هذا الأسبوع`,
      why: `كل ما ${g('أنجزته', 'أنجزه')} استهلاك. أول تسجيل صوتي هو نقطة التحول النفسية في هذا النوع من المسارات.`,
    })
  }

  if (has('shallow_time') || has('sparse_days') || has('no_habit')) {
    actions.push({
      owner: 'نحن', effort: 'مرة واحدة',
      title: 'خطة يومية مكتوبة: نشاط واحد محدّد لكل يوم',
      why: `${g('زياراتها', 'زياراته')} قصيرة ومتباعدة. «${g('افتحي', 'افتح')} الوحدة ٢ ${g('وأنجزي', 'وأنجز')} القراءة اليوم» يتفوّق على «${g('واصلي', 'واصل')} التعلّم».`,
    })
  }

  if (has('dormant') || has('stalled') || has('cooling')) {
    actions.push({
      owner: 'المدرب', effort: 'رسالة',
      title: 'رسالة شخصية واحدة — لا تذكير آلي',
      why: `${g('الطالبة الخاصة تستجيب لاسمها وسياقها', 'الطالب الخاص يستجيب لاسمه وسياقه')}، لا لإشعار عام.`,
    })
  }

  if (has('expiring')) {
    actions.push({
      owner: 'الإدارة', effort: 'عاجل',
      title: 'تسوية التجديد قبل إغلاق الوصول',
      why: `انقطاع الوصول أثناء تعثّر أصلًا يعني ${g('فقدانها', 'فقدانه')}.`,
    })
  }

  if (!actions.length) {
    actions.push({
      owner: 'المدرب', effort: 'متابعة',
      title: 'استمرار المتابعة الأسبوعية',
      why: 'لا توجد إشارات خطر — حافظ على الإيقاع الحالي.',
    })
  }

  return actions
}
