-- Migration 089: Seed 6 level cumulative assessments
-- Samples 5 questions from each of 12 unit quizzes per level = 60 questions
-- Passing score: 70%, Duration: 60 minutes, is_promotion_gate: true

DO $$
DECLARE
    l RECORD;
    sampled_questions JSONB;
    q_count INTEGER;
BEGIN
    FOR l IN SELECT id, level_number, cefr FROM curriculum_levels ORDER BY level_number
    LOOP
        -- Skip if already exists
        IF EXISTS (
            SELECT 1 FROM curriculum_assessments
            WHERE level_id = l.id
              AND assessment_type = 'level_cumulative'
        ) THEN
            CONTINUE;
        END IF;

        -- Sample questions from all unit quizzes at this level
        WITH level_units AS (
            SELECT cu.id FROM curriculum_units cu WHERE cu.level_id = l.id
        ),
        all_questions AS (
            SELECT
                ca.unit_id,
                jsonb_array_elements(ca.questions) AS q
            FROM curriculum_assessments ca
            WHERE ca.unit_id IN (SELECT id FROM level_units)
              AND ca.assessment_type = 'unit_quiz'
        ),
        sampled AS (
            SELECT unit_id, q, ROW_NUMBER() OVER (PARTITION BY unit_id ORDER BY random()) as rn
            FROM all_questions
        )
        SELECT jsonb_agg(q ORDER BY random())
        INTO sampled_questions
        FROM sampled
        WHERE rn <= 5;

        q_count := COALESCE(jsonb_array_length(sampled_questions), 0);

        -- Fail if too few questions
        IF q_count < 40 THEN
            RAISE EXCEPTION 'Level % has only % sampled questions (expected >= 40)', l.level_number, q_count;
        END IF;

        -- Insert the cumulative assessment
        INSERT INTO curriculum_assessments (
            level_id,
            unit_id,
            assessment_type,
            questions,
            passing_score,
            is_promotion_gate,
            time_limit_minutes,
            title_en,
            title_ar,
            is_published,
            created_at
        ) VALUES (
            l.id,
            NULL,
            'level_cumulative',
            sampled_questions,
            70,
            TRUE,
            60,
            'Level ' || l.level_number || ' (' || l.cefr || ') Exit Test',
            'اختبار نهاية المستوى ' || l.level_number,
            TRUE,
            NOW()
        );
    END LOOP;
END $$;

-- Verify seed
DO $$
DECLARE
    cnt INTEGER;
BEGIN
    SELECT COUNT(*) INTO cnt
    FROM curriculum_assessments
    WHERE assessment_type = 'level_cumulative';

    IF cnt != 6 THEN
        RAISE EXCEPTION 'Expected 6 level cumulative assessments, got %', cnt;
    END IF;
END $$;
