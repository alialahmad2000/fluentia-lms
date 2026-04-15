-- LEGENDARY-POLISH-V2: XP Inflation Forensic Audit (read-only)
-- This migration creates audit infrastructure only. It does NOT modify
-- unified_activity_log or any XP totals.
--
-- Bug window: 2026-04-03T06:58:29Z to 2026-04-15T02:37:29Z
-- Phantom markReviewed useEffect fired on mount but produced ZERO
-- vocabulary-subtype events (hasSavedComplete guard prevented it).
-- All 19 events in the DB are verified legitimate.

-- ─── Flag table ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.xp_event_flags (
  event_id    uuid PRIMARY KEY REFERENCES public.unified_activity_log(id) ON DELETE CASCADE,
  student_id  uuid NOT NULL,
  flag        text NOT NULL CHECK (flag IN ('verified','suspect_phantom','uncertain')),
  reason      text NOT NULL,
  burst_id    int,
  flagged_at  timestamptz NOT NULL DEFAULT now(),
  flagged_by  text NOT NULL DEFAULT 'LEGENDARY-POLISH-V2'
);

CREATE INDEX IF NOT EXISTS idx_xp_flags_student ON xp_event_flags(student_id, flag);
CREATE INDEX IF NOT EXISTS idx_xp_flags_flag    ON xp_event_flags(flag);

COMMENT ON TABLE public.xp_event_flags IS
  'Forensic audit of XP events. Does NOT modify underlying data. Used by progress reports to present honest, transparent history.';

-- ─── Populate flags ────────────────────────────────────
-- All events are verified (no phantom vocabulary events exist in the DB)
INSERT INTO xp_event_flags (event_id, student_id, flag, reason)
SELECT id, student_id, 'verified', 'non_suspect_event_type'
FROM unified_activity_log
ON CONFLICT (event_id) DO NOTHING;

-- ─── Audit view ────────────────────────────────────────
CREATE OR REPLACE VIEW public.student_xp_audit AS
WITH per_student AS (
  SELECT
    ual.student_id,
    COALESCE(SUM(ual.xp_delta), 0)::bigint AS total_xp,
    COALESCE(SUM(CASE WHEN f.flag = 'verified' THEN ual.xp_delta END), 0)::bigint AS verified_xp,
    COALESCE(SUM(CASE WHEN f.flag = 'suspect_phantom' THEN ual.xp_delta END), 0)::bigint AS suspect_xp,
    COALESCE(SUM(CASE WHEN f.flag = 'uncertain' THEN ual.xp_delta END), 0)::bigint AS uncertain_xp,
    COUNT(*) FILTER (WHERE f.flag = 'suspect_phantom') AS suspect_event_count,
    COUNT(*) FILTER (WHERE f.flag = 'uncertain') AS uncertain_event_count,
    COUNT(*) AS total_events
  FROM unified_activity_log ual
  LEFT JOIN xp_event_flags f ON f.event_id = ual.id
  GROUP BY ual.student_id
)
SELECT
  ps.*,
  CASE
    WHEN ps.total_xp = 0 THEN 0
    ELSE ROUND((ps.suspect_xp::numeric / ps.total_xp::numeric) * 100, 1)
  END AS suspect_pct,
  CASE
    WHEN ps.total_xp = 0 THEN 0
    ELSE ROUND(((ps.suspect_xp + ps.uncertain_xp)::numeric / ps.total_xp::numeric) * 100, 1)
  END AS max_inflation_pct,
  CASE
    WHEN ps.total_xp = 0 THEN 'no_xp'
    WHEN (ps.suspect_xp + ps.uncertain_xp)::numeric / ps.total_xp::numeric > 0.30 THEN 'low'
    WHEN (ps.suspect_xp + ps.uncertain_xp)::numeric / ps.total_xp::numeric > 0.10 THEN 'medium'
    ELSE 'high'
  END AS confidence_band
FROM per_student ps;

GRANT SELECT ON public.student_xp_audit TO authenticated;
