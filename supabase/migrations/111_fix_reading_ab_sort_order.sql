-- ════════════════════════════════════════════════════════════════
-- 111: Fix Reading A/B sort_order
-- All 144 readings currently have sort_order=0.
-- This causes B to appear before A in 41/72 units (UUID ordering).
-- Fix: A → sort_order=0, B → sort_order=1 for ALL readings.
-- ════════════════════════════════════════════════════════════════

-- Set A passages to sort_order 0
UPDATE curriculum_readings
SET sort_order = 0, updated_at = now()
WHERE reading_label = 'A';

-- Set B passages to sort_order 1
UPDATE curriculum_readings
SET sort_order = 1, updated_at = now()
WHERE reading_label = 'B';

-- Verify: every unit should have A=0 and B=1
DO $$
DECLARE
  v_a_count integer;
  v_b_count integer;
BEGIN
  SELECT count(*) INTO v_a_count FROM curriculum_readings WHERE reading_label = 'A' AND sort_order = 0;
  SELECT count(*) INTO v_b_count FROM curriculum_readings WHERE reading_label = 'B' AND sort_order = 1;
  ASSERT v_a_count = 72, 'Expected 72 A-passages with sort_order=0, got ' || v_a_count;
  ASSERT v_b_count = 72, 'Expected 72 B-passages with sort_order=1, got ' || v_b_count;
  RAISE NOTICE '✓ Fixed sort_order: % A-passages → 0, % B-passages → 1', v_a_count, v_b_count;
END $$;
