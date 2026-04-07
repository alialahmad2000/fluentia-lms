-- Migration 087: RPCs for curriculum map page

CREATE OR REPLACE FUNCTION get_vocab_counts_per_unit()
RETURNS TABLE (
  unit_id uuid,
  vocab_count bigint,
  unique_vocab_count bigint
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    cr.unit_id,
    COUNT(cv.id) as vocab_count,
    COUNT(DISTINCT LOWER(cv.word)) as unique_vocab_count
  FROM curriculum_readings cr
  JOIN curriculum_vocabulary cv ON cv.reading_id = cr.id
  GROUP BY cr.unit_id;
$$;

CREATE OR REPLACE FUNCTION get_vocab_for_unit(p_unit_id uuid)
RETURNS TABLE (
  word text,
  definition_en text,
  definition_ar text,
  example_sentence text,
  part_of_speech text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT cv.word, cv.definition_en, cv.definition_ar,
         cv.example_sentence, cv.part_of_speech
  FROM curriculum_vocabulary cv
  JOIN curriculum_readings cr ON cr.id = cv.reading_id
  WHERE cr.unit_id = p_unit_id
  ORDER BY cv.word;
$$;

GRANT EXECUTE ON FUNCTION get_vocab_counts_per_unit() TO authenticated;
GRANT EXECUTE ON FUNCTION get_vocab_for_unit(uuid) TO authenticated;
