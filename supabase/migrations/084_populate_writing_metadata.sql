-- Migration 084: Populate vocabulary_to_use and grammar_to_use on curriculum_writing
-- Closes audit finding: these fields were empty on all 72 rows

-- Step 1: ALTER grammar_to_use from text to jsonb (currently NULL text)
ALTER TABLE curriculum_writing ALTER COLUMN grammar_to_use TYPE jsonb USING CASE WHEN grammar_to_use IS NULL THEN NULL ELSE grammar_to_use::jsonb END;

-- Step 2: Populate vocabulary_to_use and grammar_to_use
DO $$
DECLARE
    w RECORD;
    target_vocab JSONB;
    target_grammar JSONB;
    vocab_limit INTEGER;
BEGIN
    FOR w IN
        SELECT cw.id, cw.unit_id, cl.level_number
        FROM curriculum_writing cw
        JOIN curriculum_units cu ON cu.id = cw.unit_id
        JOIN curriculum_levels cl ON cl.id = cu.level_id
        ORDER BY cl.level_number, cu.unit_number
    LOOP
        -- Determine vocab count by level
        IF w.level_number <= 1 THEN vocab_limit := 8;
        ELSIF w.level_number <= 3 THEN vocab_limit := 10;
        ELSE vocab_limit := 12;
        END IF;

        -- Build vocab array: prefer nouns > verbs > adjectives > rest
        SELECT COALESCE(jsonb_agg(sub.v), '[]'::jsonb)
        INTO target_vocab
        FROM (
            SELECT jsonb_build_object(
                'word', cv.word,
                'definition_ar', cv.definition_ar,
                'definition_en', cv.definition_en,
                'example', cv.example_sentence,
                'pos', cv.part_of_speech
            ) AS v
            FROM curriculum_vocabulary cv
            JOIN curriculum_readings cr ON cr.id = cv.reading_id
            WHERE cr.unit_id = w.unit_id
            ORDER BY
              CASE
                WHEN cv.part_of_speech = 'noun' THEN 1
                WHEN cv.part_of_speech = 'verb' THEN 2
                WHEN cv.part_of_speech = 'adjective' THEN 3
                ELSE 4
              END,
              cv.sort_order
            LIMIT vocab_limit
        ) sub;

        -- Build grammar object from unit's grammar topic
        SELECT jsonb_build_object(
            'topic_name_en', cg.topic_name_en,
            'topic_name_ar', cg.topic_name_ar,
            'explanation_summary', COALESCE(
                cg.explanation_content->'sections'->0->>'content_ar',
                cg.topic_name_ar
            ),
            'example_sentence', COALESCE(
                cg.explanation_content->'sections'->1->>'content_en',
                ''
            )
        )
        INTO target_grammar
        FROM curriculum_grammar cg
        WHERE cg.unit_id = w.unit_id
        LIMIT 1;

        -- Update the writing row
        UPDATE curriculum_writing
        SET vocabulary_to_use = target_vocab,
            grammar_to_use = COALESCE(target_grammar, '{}'::jsonb)
        WHERE id = w.id;
    END LOOP;

    RAISE NOTICE 'Populated vocabulary_to_use and grammar_to_use for all curriculum_writing rows';
END $$;
