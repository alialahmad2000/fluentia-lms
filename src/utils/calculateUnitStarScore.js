/**
 * نظام نجم/ة الوحدة — Comprehensive Unit Star Scoring
 *
 * Components:
 * 1. Completion (30%) — overall unit progress
 * 2. Quality (30%) — AI evaluation scores (writing + speaking)
 * 3. Vocabulary Mastery (15%) — mastered / total words
 * 4. Speed (15%) — how early vs classmates
 * 5. Effort (10%) — reattempts, improvements
 *
 * Bonuses (additive, on top of 100):
 * - First to submit any activity: +5 each (max 15)
 * - 9+/10 avg on writing or speaking: +3 each
 * - 100% completion: +10
 * - Improved on re-attempt: +3
 */

export function calculateUnitStarScore({
  unitProgress,
  aiScores,
  vocabularyMastery,
  submissionTimestamps,
  allStudentTimestamps,
  studentId,
  reattempts,
  improvements,
}) {
  let score = 0
  const breakdown = {}
  const bonuses = []

  // 1. COMPLETION (30 pts)
  const completionPct = unitProgress?.overall || 0
  const completionScore = (completionPct / 100) * 30
  breakdown.completion = {
    score: Math.round(completionScore * 10) / 10,
    max: 30,
    detail: `${completionPct}% مكتمل`,
  }
  score += completionScore

  if (completionPct === 100) {
    bonuses.push({ type: 'full_completion', points: 10, label: 'أكمل جميع الأنشطة' })
    score += 10
  }

  // 2. QUALITY — AI Scores (30 pts)
  const scoreValues = []

  if (aiScores?.writing) {
    const w = aiScores.writing
    const writingAvg = ((w.grammar_score || 0) + (w.vocabulary_score || 0) + (w.structure_score || 0) + (w.fluency_score || 0)) / 4
    scoreValues.push(writingAvg)
    if (writingAvg >= 9) {
      bonuses.push({ type: 'excellence_writing', points: 3, label: 'تقييم ممتاز في الكتابة' })
      score += 3
    }
  }

  if (aiScores?.speaking) {
    const s = aiScores.speaking
    const parts = [s.grammar_score || 0, s.vocabulary_score || 0, s.fluency_score || 0]
    if (s.confidence_score) parts.push(s.confidence_score)
    const speakingAvg = parts.reduce((a, b) => a + b, 0) / parts.length
    scoreValues.push(speakingAvg)
    if (speakingAvg >= 9) {
      bonuses.push({ type: 'excellence_speaking', points: 3, label: 'تقييم ممتاز في المحادثة' })
      score += 3
    }
  }

  const avgQuality = scoreValues.length > 0 ? scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length : 0
  const qualityScore = (avgQuality / 10) * 30
  breakdown.quality = {
    score: Math.round(qualityScore * 10) / 10,
    max: 30,
    detail: scoreValues.length > 0 ? `متوسط ${avgQuality.toFixed(1)}/10` : 'لم يُقيَّم بعد',
  }
  score += qualityScore

  // 3. VOCABULARY MASTERY (15 pts)
  const vocabRatio = vocabularyMastery?.totalWords > 0 ? vocabularyMastery.masteredCount / vocabularyMastery.totalWords : 0
  const vocabScore = vocabRatio * 15
  breakdown.vocabulary = {
    score: Math.round(vocabScore * 10) / 10,
    max: 15,
    detail: vocabularyMastery?.totalWords > 0
      ? `${vocabularyMastery.masteredCount}/${vocabularyMastery.totalWords} كلمة`
      : 'لا توجد مفردات',
  }
  score += vocabScore

  // 4. SPEED (15 pts)
  let speedScore = 0
  let firstSubmissions = 0

  if (submissionTimestamps?.length > 0 && allStudentTimestamps?.length > 0) {
    const activityTypes = [...new Set(submissionTimestamps.map(s => s.section_type))]

    for (const type of activityTypes) {
      const mySubmission = submissionTimestamps.find(s => s.section_type === type)
      if (!mySubmission) continue

      const allForType = allStudentTimestamps
        .filter(s => s.section_type === type)
        .sort((a, b) => new Date(a.submitted_at) - new Date(b.submitted_at))

      if (allForType.length === 0) continue

      const myRank = allForType.findIndex(s => s.student_id === studentId) + 1
      const total = allForType.length

      if (total <= 1) {
        speedScore += 15 / activityTypes.length
      } else {
        const ratio = 1 - ((myRank - 1) / (total - 1)) * 0.7
        speedScore += (15 / activityTypes.length) * ratio
      }

      if (myRank === 1) firstSubmissions++
    }
  }

  speedScore = Math.min(speedScore, 15)
  breakdown.speed = {
    score: Math.round(speedScore * 10) / 10,
    max: 15,
    detail: firstSubmissions > 0 ? `أول من سلّم ${firstSubmissions} نشاط` : 'ترتيب التسليم',
  }
  score += speedScore

  if (firstSubmissions > 0) {
    const pts = Math.min(firstSubmissions * 5, 15)
    bonuses.push({ type: 'first_submit', points: pts, label: `أول من سلّم ${firstSubmissions} ${firstSubmissions === 1 ? 'نشاط' : 'أنشطة'}` })
    score += pts
  }

  // 5. EFFORT (10 pts)
  let effortScore = 0
  const totalReattempts = (reattempts?.writing || 0) + (reattempts?.speaking || 0)
  effortScore += Math.min(totalReattempts * 2, 6)
  if (improvements?.writing) effortScore += 2
  if (improvements?.speaking) effortScore += 2
  effortScore = Math.min(effortScore, 10)

  breakdown.effort = {
    score: Math.round(effortScore * 10) / 10,
    max: 10,
    detail: totalReattempts > 0 ? `${totalReattempts} إعادة محاولة` : 'لا إعادات',
  }
  score += effortScore

  if (improvements?.writing || improvements?.speaking) {
    bonuses.push({ type: 'improved', points: 3, label: 'تحسّن بعد الإعادة' })
    score += 3
  }

  return {
    totalScore: Math.round(score * 10) / 10,
    baseScore: Math.round((score - bonuses.reduce((s, b) => s + b.points, 0)) * 10) / 10,
    maxBaseScore: 100,
    breakdown,
    bonuses,
    completionPercent: completionPct,
  }
}
