-- Phase 1A — Reading passage audio table + listening word timestamps column

-- ─── Reading passage audio ────────────────────────────────────────────────────
-- Stores full passage + per-paragraph audio with word-level timestamps.
-- Separate table (not column) so it doesn't bloat the readings row.
CREATE TABLE IF NOT EXISTS reading_passage_audio (
  passage_id          UUID        PRIMARY KEY
                                  REFERENCES curriculum_readings(id) ON DELETE CASCADE,
  full_audio_url      TEXT        NOT NULL,
  full_audio_path     TEXT        NOT NULL,
  full_duration_ms    INTEGER     NOT NULL,
  -- [{paragraph_index, audio_url, audio_path, duration_ms, text, char_count}]
  paragraph_audio     JSONB       NOT NULL DEFAULT '[]',
  -- {paragraphs: [{index, words: [{word, start_ms, end_ms}]}]}
  word_timestamps     JSONB       NOT NULL DEFAULT '{}',
  voice_id            TEXT        NOT NULL DEFAULT 'alice',
  generated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE reading_passage_audio ENABLE ROW LEVEL SECURITY;

-- Students and all authenticated users can read audio metadata
DROP POLICY IF EXISTS "read audio public" ON reading_passage_audio;
CREATE POLICY "read audio public" ON reading_passage_audio
  FOR SELECT USING (true);

-- Admin only can write
DROP POLICY IF EXISTS "admin write audio" ON reading_passage_audio;
CREATE POLICY "admin write audio" ON reading_passage_audio
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','trainer'))
  );

-- ─── Listening word timestamps ────────────────────────────────────────────────
-- Add word_timestamps column to curriculum_listening for karaoke-style highlighting.
ALTER TABLE curriculum_listening
  ADD COLUMN IF NOT EXISTS word_timestamps JSONB;

COMMENT ON COLUMN curriculum_listening.word_timestamps IS
  'Word-level timestamps for karaoke highlighting. Format: {words: [{word, start_ms, end_ms}]}.';
COMMENT ON TABLE reading_passage_audio IS
  'Full + per-paragraph audio with word timestamps for reading passages (Phase 1A).';
