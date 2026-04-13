-- Recording tier test columns (already applied via db query, this is for migration tracking)
-- Stores exhaustive tier test results per recording per device type

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'class_recordings' AND column_name = 'tier_test_results'
  ) THEN
    ALTER TABLE class_recordings ADD COLUMN tier_test_results JSONB DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'class_recordings' AND column_name = 'last_tier_test'
  ) THEN
    ALTER TABLE class_recordings ADD COLUMN last_tier_test TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'class_recordings' AND column_name = 'requires_transcoding'
  ) THEN
    ALTER TABLE class_recordings ADD COLUMN requires_transcoding BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'class_recordings' AND column_name = 'playable'
  ) THEN
    ALTER TABLE class_recordings ADD COLUMN playable BOOLEAN DEFAULT TRUE;
  END IF;
END $$;

-- Index for quick filtering of playable recordings
CREATE INDEX IF NOT EXISTS idx_recordings_playable ON class_recordings (playable) WHERE deleted_at IS NULL;

COMMENT ON COLUMN class_recordings.tier_test_results IS 'JSON: { ios: [2,6], android: [1,2,6], desktop: [1,2,6] } — working tier numbers per device';
COMMENT ON COLUMN class_recordings.playable IS 'false = hidden from students (all tiers failed across all devices)';
