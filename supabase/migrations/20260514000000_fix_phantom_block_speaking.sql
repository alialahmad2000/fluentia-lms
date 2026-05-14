-- Fix phantom_block trigger: exempt speaking section_type.
-- Speaking completion evidence lives in speaking_recordings, not in the answers column.
-- Without this exemption, backfill and handleUploadComplete both fail to write
-- speaking progress rows because answers is legitimately NULL for voice submissions.

CREATE OR REPLACE FUNCTION block_phantom_submission()
RETURNS TRIGGER AS $$
DECLARE
  answers_empty BOOLEAN;
BEGIN
  -- Speaking completions have no answers column — evidence is in speaking_recordings.
  -- Skip the phantom check for speaking entirely.
  IF NEW.section_type = 'speaking' THEN
    RETURN NEW;
  END IF;

  IF NEW.status IN ('completed', 'submitted', 'graded') THEN
    IF NEW.answers IS NULL THEN
      answers_empty := true;
    ELSIF jsonb_typeof(NEW.answers) = 'object' THEN
      answers_empty := (NEW.answers = '{}'::jsonb);
    ELSIF jsonb_typeof(NEW.answers) = 'array' THEN
      answers_empty := (jsonb_array_length(NEW.answers) = 0);
    ELSIF NEW.answers::text IN ('null', '[]', '{}') THEN
      answers_empty := true;
    ELSE
      answers_empty := false;
    END IF;

    IF answers_empty THEN
      RAISE EXCEPTION 'PHANTOM_BLOCK: cannot mark section_type=% as % with empty answers. This is the auto-submit-on-reload guard.',
        COALESCE(NEW.section_type, '?'), NEW.status
        USING HINT = 'Student must have real answers before submission is accepted.';
    END IF;

    IF NEW.section_type = 'listening' AND jsonb_typeof(NEW.answers) = 'object'
       AND NEW.answers ? 'questions'
       AND jsonb_typeof(NEW.answers->'questions') = 'array' THEN
      IF (
        SELECT COUNT(*) FROM jsonb_array_elements(NEW.answers->'questions') q
        WHERE q->>'studentAnswer' IS NOT NULL AND q->>'studentAnswer' != 'null'
      ) = 0 THEN
        RAISE EXCEPTION 'PHANTOM_BLOCK: listening submission blocked — all %s questions have null studentAnswer',
          jsonb_array_length(NEW.answers->'questions')
          USING HINT = 'All listening answers are null — student did not actually answer.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
