const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://nmjexpuycmqcxuxljier.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tamV4cHV5Y21xY3h1eGxqaWVyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzEyNTYxOCwiZXhwIjoyMDg4NzAxNjE4fQ.Abbt3bzmud1B55ym_UW_3kEUMyVkhOiQ_iiLpHo1tfs'
);

(async () => {
  // Get a test student
  const { data: testStudent } = await supabase
    .from('students')
    .select('id')
    .limit(1)
    .single();

  if (!testStudent) { console.error('No student found'); process.exit(1); }
  console.log('Testing with student_id:', testStudent.id);

  // Insert a test highlight
  const { data: inserted, error: insErr } = await supabase
    .from('student_word_highlights')
    .insert({
      student_id: testStudent.id,
      content_id: '00000000-0000-0000-0000-000000000000',
      content_type: 'reading',
      segment_index: 0,
      word_index_start: 0,
      word_index_end: 0,
      word_text: '__test_remove_bug__',
      color: 'yellow',
    })
    .select()
    .single();

  if (insErr) { console.error('✗ INSERT failed:', insErr.message); process.exit(1); }
  console.log('✓ Inserted:', inserted.id);

  // Soft-delete it (same call as removeHighlight in the hook)
  const { data: deleted, error: delErr } = await supabase
    .from('student_word_highlights')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', inserted.id)
    .select('id');

  if (delErr) {
    console.log('✗ UPDATE failed:', delErr.message);
  } else {
    console.log(deleted?.length ? `✓ Updated ${deleted.length} row(s)` : '✗ UPDATE affected 0 rows');
  }

  // Refetch with filter — should NOT include the deleted row
  const { data: refetched } = await supabase
    .from('student_word_highlights')
    .select('id, word_text, deleted_at')
    .eq('student_id', testStudent.id)
    .is('deleted_at', null);

  const found = refetched?.find(r => r.word_text === '__test_remove_bug__');
  console.log(found
    ? '✗ FAIL — soft-deleted row still appears in filtered query!'
    : '✓ PASS — soft-deleted row correctly excluded from filtered query');

  // Clean up — hard-delete
  await supabase.from('student_word_highlights').delete().eq('id', inserted.id);
  console.log('✓ Cleanup complete');
})();
