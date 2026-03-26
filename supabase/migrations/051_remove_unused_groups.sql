-- ============================================
-- 051: Remove unused test groups — keep only 1A, 1B, 2A, 2B
-- ============================================

-- Delete any group not in the active set
DELETE FROM groups
WHERE code NOT IN ('1A', '1B', '2A', '2B');
