/**
 * plan-generator unit reasoning — 6 scenarios
 * Not a formal test runner. Reason through expected outputs.
 */

/*
Scenario 1: New student, no diagnostic
  ctx = { studentId: 'abc', currentBand: null, targetBand: 6.5, examDate: null,
          weakAreas: [], strongAreas: [], errorSummary: {total:0,due:0,hotspots:[]},
          hasDiagnostic: false, daysSinceLastMock: null }

  Expected:
  - weakestSkill = null (no diagnostic)
  - template matched: tmpl_no_diagnostic (match_criteria.weakest_skill === null)
  - next_recommended_action: from rule_no_diagnostic (priority=100, condition='no_diagnostic')
    → { skill_type:'diagnostic', title_ar:'ابدأ الاختبار التشخيصي', route_path:'/student/ielts/diagnostic' }
  - motivational_note_ar: deterministic from hash('abc:' + weekNum) % 40
  ✓ Shape: all required fields present, no DB/network calls
*/

/*
Scenario 2: Post-diagnostic, weak reading, target 6.5, currentBand 5.5, exam 60 days out
  ctx = { studentId: 'xyz', currentBand: 5.5, targetBand: 6.5, examDate: <60d from now>,
          weakAreas: [{ skill:'reading', band:4.5 }], strongAreas: [{ skill:'listening', band:6.5 }],
          errorSummary: {total:3, due:2, hotspots:[]}, hasDiagnostic:true, daysSinceLastMock:20 }

  Expected:
  - examProximity = '30-90d'
  - weakestSkill = 'reading', bandGapBucket = 'moderate' (gap=1.0)
  - template: tmpl_reading_weak_medium
  - dueErrors=2 → rule_due_errors_moderate (priority=60) fails (2 < 5)
  - weakestSkillGap = 6.5 - 4.5 = 2.0 → rule_weak_skill_wide_gap (priority=80) MATCHES (2.0 >= 1.5)
  - action: { skill_type:'reading', title_ar:'ركّز على القراءة — فجوة 2.0 نقطة', route_path:'/student/ielts/reading' }
  ✓ Reading-focused schedule, correct action
*/

/*
Scenario 3: Due errors = 15 → action prioritizes error review
  ctx = { ..., errorSummary: { total:20, due:15, hotspots:[] }, hasDiagnostic:true,
          weakAreas:[{skill:'writing',band:5.0}], ... }

  Expected:
  - rule_due_errors_high (priority=90, condition='due_errors >= 10') → 15 >= 10 → MATCHES
  - action: { title_ar:'راجع بنك الأخطاء', subtitle_ar:'عندك 15 أخطاء...',
              route_path:'/student/ielts/errors/review' }
  ✓ Error review takes priority over skill-focus
*/

/*
Scenario 4: Exam 20 days out → <30d template + high mock cadence
  ctx = { ..., examDate: <20d from now>, hasDiagnostic:true,
          weakAreas:[{skill:'listening',band:5.5}], currentBand:6.0, targetBand:6.5,
          errorSummary:{total:0,due:0,hotspots:[]}, daysSinceLastMock:30 }

  Expected:
  - examProximity = '<30d'
  - template: tmpl_listening_weak_close → wednesday + saturday have mock tasks
  - dueErrors=0, weakestSkillGap=1.0, examDaysLeft=20 → rule_exam_close (priority=75) matches (20 <= 30)
    but weakestSkillGap=1.0 >= 1.5? No → rule_weak_skill_wide_gap fails
    → rule_exam_close: action = mock with "20 يوم للامتحان"
  ✓ Close-exam mock cadence in schedule, appropriate action
*/

/*
Scenario 5: Band 6.5, target 6.5 (gap=0)
  ctx = { ..., currentBand:6.5, targetBand:6.5, hasDiagnostic:true,
          weakAreas:[], strongAreas:[{skill:'reading',band:6.5},...], errorSummary:{due:0,...} }

  Expected:
  - gap = 0 → bandGapBucket = 'minimal'
  - weakAreas=[] → weakestSkill=null? No: hasDiagnostic=true but weakAreas=[]
    → weakestSkill falls back to 'reading' (weakAreas[0]?.skill || 'reading')
  - template: reading + proximity fallback
  - hasWeakSkill=false, dueErrors=0, no exam date → all numeric rules fail → rule_default
  - action: { title_ar:'تابع تدريبك اليومي', route_path:'/student/ielts/plan' }
  - Plan still generated (no abort)
  ✓ Graceful handling of "already at target"
*/

/*
Scenario 6: Same student, same week, two calls → identical output
  call1 = generatePlan(ctx)
  call2 = generatePlan(ctx) // identical ctx

  Expected:
  - hashString(studentId + ':' + weekNum) is deterministic → same noteIdx
  - matchTemplate is deterministic → same template
  - evaluateNextActionRules is deterministic → same action
  - The only non-deterministic field is updated_at (timestamp) and last_regenerated_at
    but schema-relevant fields are identical
  ✓ Determinism confirmed; timestamps are metadata, not structural
*/

export {} // ESM marker
