-- Audio Generation V2: add elevenlabs_audio enum + listening_audio table

ALTER TYPE ai_usage_type ADD VALUE IF NOT EXISTS 'elevenlabs_audio';

CREATE TABLE IF NOT EXISTS public.listening_audio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_id uuid NOT NULL REFERENCES curriculum_listening(id) ON DELETE CASCADE,
  segment_index int NOT NULL,
  speaker_label text,
  voice_id text NOT NULL,
  audio_url text NOT NULL,
  audio_path text NOT NULL,
  duration_ms int,
  text_content text NOT NULL,
  word_timestamps jsonb NOT NULL DEFAULT '[]'::jsonb,
  char_count int NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(transcript_id, segment_index)
);

CREATE INDEX IF NOT EXISTS idx_listening_audio_transcript ON listening_audio(transcript_id);
ALTER TABLE listening_audio ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authed users can read listening audio" ON listening_audio FOR SELECT TO authenticated USING (true);
