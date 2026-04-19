# IELTS Adaptive Discovery Report

## A.1 ielts_adaptive_plans
- Rows: 0
- Found: id, student_id, test_variant, target_band, target_exam_date, current_band_estimate, weak_areas, strong_areas, weekly_schedule, next_recommended_action, last_regenerated_at, updated_at, created_at
- MISSING: motivational_note_ar, motivational_note

### Sample row
```json
null
```

## A.3 ielts_error_bank
- Total: 0 | Mastered: 0 | Due: 0
- Found: id, student_id, skill_type, question_type, source_table, source_id, question_text, student_answer, correct_answer, explanation, times_seen, times_correct, mastered, next_review_at
- MISSING: created_at, updated_at

### Sample rows
```json
[]
```

## A.4 Hub Widget Contracts

**NextActionCard** reads from plan.next_recommended_action:
- title_ar
- subtitle_ar
- cta_ar
- route_path
- skill_type

**WeeklyScheduleStrip** reads from ielts_skill_sessions (NOT weekly_schedule field)

**ErrorBankMini** reads count from useErrorBankCount (mastered=false)

## A.5 Lab Error Payload Shape
Both Reading + Listening labs insert:
```json
{
  "student_id": "<uuid>",
  "skill_type": "reading|listening",
  "question_type": "<string>",
  "source_table": "ielts_reading_passages|ielts_listening_sections",
  "source_id": "<uuid>",
  "question_text": "<string max 500>",
  "student_answer": "<string>",
  "correct_answer": "<string>",
  "explanation": "<string max 500>",
  "times_seen": 1,
  "times_correct": 0,
  "mastered": false,
  "next_review_at": "<ISO +24h>"
}
```

## A.6 useSubmitMock Extension Point
onSuccess in useMockCenter.js currently invalidates queries. We extend it to call regen.mutate({ studentId }) after invalidations.

## A.6b useCompleteDiagnostic Extension Point
onSuccess in useDiagnostic.js invalidates ['ielts-plan']. We extend to call regen.mutate({ studentId }) in background.

## Summary
| Check | Result |
|---|---|

| ielts_adaptive_plans rows | 0 |

| motivational_note_ar column | MISSING — compute on frontend only |

| weekly_schedule shape | JSONB — confirmed writable |

| next_recommended_action shape | {skill_type,title_ar,subtitle_ar,cta_ar,route_path} |

| weak_areas / strong_areas shape | array of objects {skill,band} |

| ielts_error_bank rows total | 0 |

| Due-for-review count | 0 |

| Mastered count | 0 |

| error_bank has created_at | MISSING (no timestamp column) |

| Reading Lab error payload | {student_id,skill_type,question_type,source_table,source_id,question_text,student_answer,correct_answer,explanation,times_seen,times_correct,mastered,next_review_at} |

| useSubmitMock onSuccess hook | EXISTS — extend to call regen.mutate |

| useCompleteDiagnostic onSuccess | EXISTS — extend similarly |

| ABORT? | NO — all core columns present; motivational_note_ar handled frontend-only |
