import scheduleTemplates from './plan-templates/schedule-templates.json'
import motivationalNotes from './plan-templates/motivational-notes.json'
import nextActionRules from './plan-templates/next-action-rules.json'

const SKILL_LABEL_AR = {
  reading: 'القراءة',
  listening: 'الاستماع',
  writing: 'الكتابة',
  speaking: 'المحادثة',
}

/**
 * Pure, deterministic function. Same inputs → same output.
 * No network calls, no DB calls, no external IO.
 * Runs in < 50ms.
 */
export function generatePlan(ctx) {
  const {
    studentId,
    currentBand,
    targetBand,
    examDate,
    weakAreas = [],
    strongAreas = [],
    errorSummary = { total: 0, due: 0, hotspots: [] },
    hasDiagnostic = false,
    daysSinceLastMock = null,
  } = ctx

  const target = targetBand || 6.5
  const examProximity = computeExamProximity(examDate)
  const weakestSkill = hasDiagnostic ? (weakAreas[0]?.skill || 'reading') : null
  const gap = currentBand != null ? target - currentBand : 1.0
  const bandGapBucket = gap < 0.5 ? 'minimal' : gap < 1.5 ? 'moderate' : 'wide'

  const template = matchTemplate(weakestSkill, examProximity, bandGapBucket)
  const weeklySchedule = template.weekly_schedule

  const daysLeft = computeDaysLeft(examDate)
  const weakestSkillGap = weakAreas[0] && currentBand != null
    ? target - (weakAreas[0].band || currentBand)
    : (currentBand != null ? target - currentBand : 1.0)

  const action = evaluateNextActionRules({
    hasDiagnostic,
    dueErrors: errorSummary.due,
    examDaysLeft: daysLeft,
    weakestSkillGap,
    weakestSkill,
    daysSinceLastMock,
    hasWeakSkill: weakAreas.length > 0,
  })

  const weekNum = currentISOWeek()
  const noteIdx = hashString(`${studentId}:${weekNum}`) % motivationalNotes.length
  const motivationalNoteAr = motivationalNotes[noteIdx].text_ar

  return {
    weekly_schedule: weeklySchedule,
    next_recommended_action: action,
    weak_areas: weakAreas,
    strong_areas: strongAreas,
    current_band_estimate: currentBand,
    last_regenerated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    // Not persisted (column doesn't exist in DB) — used only in-memory by Plan View
    _motivational_note_ar: motivationalNoteAr,
  }
}

// ─── Template matching ───────────────────────────────────────

function matchTemplate(weakestSkill, proximity, bandGapBucket) {
  // 1. Exact match on skill + proximity
  let match = scheduleTemplates.find(t =>
    t.match_criteria.weakest_skill === weakestSkill &&
    t.match_criteria.exam_proximity === proximity
  )
  if (match) return match

  // 2. Fallback: skill only
  match = scheduleTemplates.find(t =>
    t.match_criteria.weakest_skill === weakestSkill
  )
  if (match) return match

  // 3. No diagnostic / null skill
  match = scheduleTemplates.find(t => t.match_criteria.weakest_skill === null)
  if (match) return match

  // 4. Universal fallback: first reading template
  return scheduleTemplates.find(t => t.match_criteria.weakest_skill === 'reading') || scheduleTemplates[0]
}

// ─── Next-action rule evaluation ────────────────────────────

function evaluateNextActionRules(facts) {
  const sorted = [...nextActionRules].sort((a, b) => b.priority - a.priority)

  for (const rule of sorted) {
    if (conditionMatches(rule.condition, facts)) {
      return substituteAction(rule.action, facts)
    }
  }

  // Should never reach here — rule_default covers "always"
  return nextActionRules[nextActionRules.length - 1].action
}

function conditionMatches(condition, facts) {
  if (condition === 'always') return true
  if (condition === 'no_diagnostic') return !facts.hasDiagnostic
  if (condition === 'has_weak_skill') return facts.hasWeakSkill

  // Numeric conditions: "due_errors >= 10", "exam_days_left <= 30", etc.
  const numMatch = condition.match(/^(\w+)\s*(>=|<=|>|<|==)\s*(\d+)$/)
  if (numMatch) {
    const [, key, op, val] = numMatch
    const factKey = snakeToCamel(key)
    const factVal = facts[factKey]
    if (factVal == null) return false
    const v = Number(val)
    if (op === '>=') return factVal >= v
    if (op === '<=') return factVal <= v
    if (op === '>') return factVal > v
    if (op === '<') return factVal < v
    if (op === '==') return factVal === v
  }
  return false
}

function substituteAction(action, facts) {
  const skillAr = SKILL_LABEL_AR[facts.weakestSkill] || 'القراءة'
  const substitute = (s) => {
    if (typeof s !== 'string') return s
    return s
      .replace(/\$DUE/g, String(facts.dueErrors || 0))
      .replace(/\$DAYS_LEFT/g, String(facts.examDaysLeft || ''))
      .replace(/\$DAYS_SINCE_MOCK/g, String(facts.daysSinceLastMock || ''))
      .replace(/\$WEAKEST_SKILL_AR/g, skillAr)
      .replace(/\$WEAKEST_SKILL_GAP/g, facts.weakestSkillGap != null ? Number(facts.weakestSkillGap).toFixed(1) : '')
      .replace(/\$WEAKEST_SKILL/g, facts.weakestSkill || 'reading')
  }
  return Object.fromEntries(
    Object.entries(action).map(([k, v]) => [k, substitute(v)])
  )
}

// ─── Utilities ───────────────────────────────────────────────

export function computeExamProximity(examDate) {
  const days = computeDaysLeft(examDate)
  if (days == null) return 'none'
  if (days < 0) return 'none'
  if (days <= 30) return '<30d'
  if (days <= 90) return '30-90d'
  return '>90d'
}

export function computeDaysLeft(examDate) {
  if (!examDate) return null
  const d = new Date(examDate)
  if (isNaN(d.getTime())) return null
  return Math.ceil((d.getTime() - Date.now()) / 86400000)
}

export function currentISOWeek() {
  const now = new Date()
  const jan4 = new Date(now.getFullYear(), 0, 4)
  const startOfWeek1 = new Date(jan4)
  startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7))
  const diff = now.getTime() - startOfWeek1.getTime()
  return Math.floor(diff / (7 * 86400000)) + 1
}

export function hashString(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function snakeToCamel(s) {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

export function selectMotivationalNote(studentId) {
  const weekNum = currentISOWeek()
  const idx = hashString(`${studentId}:${weekNum}`) % motivationalNotes.length
  return motivationalNotes[idx].text_ar
}
