import { createClient } from '@supabase/supabase-js';

const VITE_SUPABASE_URL = 'https://nmjexpuycmqcxuxljier.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tamV4cHV5Y21xY3h1eGxqaWVyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzEyNTYxOCwiZXhwIjoyMDg4NzAxNjE4fQ.Abbt3bzmud1B55ym_UW_3kEUMyVkhOiQ_iiLpHo1tfs';

const supabase = createClient(VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function probe() {
  try {
    // 1. Get trainer profile by email
    console.log('=== Trainer Probe: goldmohmmed@gmail.com ===\n');
    
    const { data: trainer, error: trainerError } = await supabase
      .from('trainers')
      .select('*')
      .eq('email', 'goldmohmmed@gmail.com')
      .single();

    if (trainerError) {
      console.log('Trainer not found:', trainerError.message);
      process.exit(0);
    }

    console.log('Trainer found:');
    console.log('  ID:', trainer.id);
    console.log('  Name:', trainer.name);
    console.log('  Email:', trainer.email);

    // 2. Get their groups
    console.log('\nGroups:');
    const { data: groups, error: groupError } = await supabase
      .from('groups')
      .select('*')
      .eq('trainer_id', trainer.id);

    if (groupError) {
      console.log('  Error:', groupError.message);
    } else {
      console.log(`  Found ${groups.length} group(s)`);
      groups.forEach(g => {
        console.log(`    - ${g.id}: ${g.name}`);
      });

      // 3. Get student IDs in those groups
      const groupIds = groups.map(g => g.id);
      if (groupIds.length > 0) {
        console.log('\nStudents in groups:');
        const { data: enrollments, error: enrollError } = await supabase
          .from('enrollments')
          .select('student_id, group_id')
          .in('group_id', groupIds);

        if (enrollError) {
          console.log('  Error:', enrollError.message);
        } else {
          const studentIds = [...new Set(enrollments.map(e => e.student_id))];
          console.log(`  Found ${studentIds.length} unique student(s)`);

          // 4. Count pending in speaking_recordings (trainer_reviewed = false or NULL)
          console.log('\nPending speaking_recordings (trainer_reviewed = false/NULL):');
          const { data: pendingSpeaking, error: spError } = await supabase
            .from('speaking_recordings')
            .select('id')
            .in('student_id', studentIds)
            .or('trainer_reviewed.is.false,trainer_reviewed.is.null');

          if (spError) {
            console.log('  Error:', spError.message);
          } else {
            console.log(`  Count: ${pendingSpeaking.length}`);
          }

          // 5. Count pending in student_curriculum_progress (trainer_graded_by IS NULL)
          console.log('\nPending student_curriculum_progress (trainer_graded_by IS NULL):');
          const { data: pendingProgress, error: progError } = await supabase
            .from('student_curriculum_progress')
            .select('id')
            .in('student_id', studentIds)
            .is('trainer_graded_by', null)
            .neq('evaluation_status', 'not_required');

          if (progError) {
            console.log('  Error:', progError.message);
          } else {
            console.log(`  Count: ${pendingProgress.length}`);
          }
        }
      }
    }

  } catch (err) {
    console.error('Error:', err.message);
  }
  process.exit(0);
}

probe();
