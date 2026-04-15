const { Pool } = require('pg');

const pool = new Pool({
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier',
  password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false }
});

// Level number -> question count
const QUESTIONS_BY_LEVEL = { 0: 10, 1: 15, 2: 15, 3: 20, 4: 20, 5: 20 };

async function run() {
  const client = await pool.connect();
  try {
    console.log('=== Seeding Unit Mastery Assessment Shells ===\n');

    // Get all units with their level number
    const { rows: units } = await client.query(`
      SELECT u.id, u.unit_number, cl.level_number
      FROM curriculum_units u
      JOIN curriculum_levels cl ON cl.id = u.level_id
      ORDER BY cl.level_number, u.unit_number
    `);
    console.log(`Found ${units.length} units\n`);

    let assessmentsInserted = 0;
    let variantsInserted = 0;

    for (const unit of units) {
      const totalQ = QUESTIONS_BY_LEVEL[unit.level_number] || 15;

      // Insert assessment shell
      const { rows: [assessment] } = await client.query(`
        INSERT INTO unit_mastery_assessments (unit_id, total_questions, is_published)
        VALUES ($1, $2, false)
        ON CONFLICT (unit_id) DO NOTHING
        RETURNING id
      `, [unit.id, totalQ]);

      if (!assessment) {
        // Already exists, get its id
        const { rows: [existing] } = await client.query(
          'SELECT id FROM unit_mastery_assessments WHERE unit_id = $1', [unit.id]
        );
        if (!existing) continue;

        // Insert variants for existing assessment
        for (const code of ['A', 'B', 'C']) {
          const { rowCount } = await client.query(`
            INSERT INTO unit_mastery_variants (assessment_id, variant_code, is_published)
            VALUES ($1, $2, false)
            ON CONFLICT (assessment_id, variant_code) DO NOTHING
          `, [existing.id, code]);
          if (rowCount > 0) variantsInserted++;
        }
        continue;
      }

      assessmentsInserted++;

      // Insert 3 variants
      for (const code of ['A', 'B', 'C']) {
        await client.query(`
          INSERT INTO unit_mastery_variants (assessment_id, variant_code, is_published)
          VALUES ($1, $2, false)
          ON CONFLICT (assessment_id, variant_code) DO NOTHING
        `, [assessment.id, code]);
        variantsInserted++;
      }
    }

    console.log(`Assessments inserted: ${assessmentsInserted}`);
    console.log(`Variants inserted: ${variantsInserted}\n`);

    // Verify
    const { rows: [counts] } = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM curriculum_units) AS units,
        (SELECT COUNT(*) FROM unit_mastery_assessments) AS assessments,
        (SELECT COUNT(*) FROM unit_mastery_variants) AS variants
    `);
    console.log('=== Verification ===');
    console.log('Units:', counts.units);
    console.log('Assessments:', counts.assessments, counts.assessments == counts.units ? '✓' : '✗');
    console.log('Variants:', counts.variants, counts.variants == counts.units * 3 ? '✓' : '✗');

  } finally {
    client.release();
    await pool.end();
  }
}
run().catch(console.error);
