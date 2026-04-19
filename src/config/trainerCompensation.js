/**
 * Fluentia Trainer Compensation Model — single source of truth.
 * Per_session_rate comes from trainers.per_session_rate (DB).
 * Base salary and bonus tiers are hardcoded here until DB stores them.
 * Edit this file to update rates.
 */

export const TRAINER_COMP = {
  base_sar: 1200,

  kpi_bonus_tiers: [
    { min_score: 90, bonus_sar: 600 },
    { min_score: 80, bonus_sar: 400 },
    { min_score: 70, bonus_sar: 200 },
    { min_score: 0,  bonus_sar: 0 },
  ],

  per_retained_student_sar: 30,

  calculate({ kpi_score, sessions_taught, retained_students_count, per_session_rate = 75 }) {
    const tier = this.kpi_bonus_tiers.find(t => kpi_score >= t.min_score)
    const kpi_bonus = tier?.bonus_sar || 0
    const session_pay = sessions_taught * per_session_rate
    const retention_bonus = kpi_score >= 70
      ? retained_students_count * this.per_retained_student_sar
      : 0
    return {
      base: this.base_sar,
      sessions: session_pay,
      kpi_bonus,
      retention_bonus,
      total: this.base_sar + session_pay + kpi_bonus + retention_bonus,
    }
  },
}
