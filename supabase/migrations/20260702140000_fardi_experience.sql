-- Fardi "Built for Her" experience — goal-framed dashboard hero + purple accent.
-- Applied live via the Management API on 2026-07-02; this file is the repo record.

-- 1. Per-student mission line shown as the focal headline of a custom student's home.
ALTER TABLE students ADD COLUMN IF NOT EXISTS custom_mission_ar text;
-- Sara's mission is set by scripts/provision-sara-alasmari-experience (data, not schema):
--   UPDATE students SET custom_mission_ar =
--     'هدفك: تشرحين أي مشكلة تقنية على مكالمة بطلاقة — بدون توقّف أو ترجمة.'
--   WHERE id = (SELECT id FROM profiles WHERE email='sarahasmari6@gmail.com');

-- 2. Let a 1:1 student read her OWN private sessions on the dashboard.
--    RLS was enabled on private_sessions with ZERO policies (deny-all for JWT users;
--    the scheduling tooling uses the service role). This is purely additive.
DROP POLICY IF EXISTS student_read_own_private_sessions ON private_sessions;
CREATE POLICY student_read_own_private_sessions ON private_sessions FOR SELECT TO public
USING (student_id = auth.uid());

-- The purple Fardi accent is a pure design-token remap (src/styles/design-tokens.css,
-- --accent-individual + html[data-track="fardi"]), scoped to custom students only — no DB.
