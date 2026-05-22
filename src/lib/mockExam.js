// src/lib/mockExam.js
// Shared helpers for the mock-exam student flow.
//
// IMPORTANT: countWords() must match the server-side word count exactly.
// Server (mock_exam_save_writing RPC):
//   IF length(trim(coalesce(p_writing_text,''))) = 0 THEN v_words := 0;
//   ELSE v_words := array_length(regexp_split_to_array(trim(p_writing_text), '\s+'), 1);
//
// JS equivalent:
//   trim() removes leading/trailing whitespace
//   split(/\s+/) splits on any whitespace run (POSIX \s+ matches \s+ in JS too)
//   filter(Boolean) drops the empty-string at the start if trim() left one
//   (postgres' regexp_split_to_array of a non-empty trimmed string never produces ['',…])

export function countWords(text) {
  if (!text || typeof text !== 'string') return 0
  const trimmed = text.trim()
  if (trimmed.length === 0) return 0
  return trimmed.split(/\s+/).filter(Boolean).length
}
