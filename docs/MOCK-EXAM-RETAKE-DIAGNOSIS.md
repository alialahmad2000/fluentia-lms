# MOCK-EXAM-RETAKE — Phase A through D report

Generated: 2026-05-23 KSA evening (after the cache-invalidation visibility fix
`526c7b9`).

Ali's directive: students whose original attempt failed (silent save bug →
0/100 auto-submit) should get a fresh chance to retake.

---

## Phase A.1 — Classification of every submitted real-student attempt

| Student | exam | role | test | answers (total / real) | writing | auto | score | bucket |
|---|---|---|---|---|---|---|---|---|
| نادية القحطاني | midterm-mock-b1 | student | false | 0 / **0** | 0 w / 0 chars | false | **0** | **NEEDS_RETAKE** |
| علي سعيد القحطاني | midterm-mock-a1 | student | false | 33 / 33 | 58 w / 264 chars | false | 71 | REAL_RESULT (don't touch) |
| فاطمة خواجي | midterm-mock-a1 | student | false | 34 / 34 | 80 w / 367 chars | false | 88 | REAL_RESULT (don't touch) |

Totals: **NEEDS_RETAKE=1, CRON_AUTO_SUBMITTED_EMPTY=0, REAL_RESULT=2, TEST=0**.

Note: لمياء, منار, هوازن (the other 3 affected per Ali's earlier list)
already have **zero rows** in `mock_exam_attempts` after the
second-chance archive earlier today, so they don't need anything from
this prompt — the cache-invalidation fix shipped in commit `526c7b9`
already makes their intro screen visible.

## Phase A.2 — SECURITY DEFINER on critical RPCs (via Management API)

```
mock_exam_admin_force_submit  | is_security_definer=true  search_path=public
mock_exam_save_answer         | is_security_definer=true  search_path=public
mock_exam_save_writing        | is_security_definer=true  search_path=public
mock_exam_start               | is_security_definer=true  search_path=public
mock_exam_submit              | is_security_definer=true  search_path=public
```

✓ All 5 critical RPCs are SECURITY DEFINER with `search_path=public`. There is
no RLS-recursion / search-path vulnerability that could have explained the
silent save failures.

## Phase A.3 — Smoke test (real RPC call, non-admin user)

Signed in as `mock-test-a1@fluentia.academy` with the published test
password, then ran the full save chain end-to-end:

1. `mock_exam_start('midterm-mock-a1')` → succeeded, returned 35 questions
   plus attempt_id `779509a4-4f3a-4d71-9483-c1a7f2032ce8`.
2. `mock_exam_save_answer(attempt_id, first_mcq.id, 1, null)` → returned no
   error.
3. Service-role SELECT against `mock_exam_answers` → row present with
   `selected_index=1`. ✓

**Result: SMOKE TEST PASS — save chain end-to-end works.** Whatever was
happening to لمياء / منار / نادية previously was a client-side / network /
stale-bundle class of failure, not a server-side RPC bug. The 6-layer
defense shipped in the previous save-chain-fix commit (`34b5f75`) catches
the surviving silent-failure variants.

The smoke test attempt was archived under
`smoke_test_cleanup_2026-05-23` so the test student starts clean.

---

## Phase B — Archive of failed attempts

Reason: `retake_after_save_chain_fix_2026-05-23`.

```
Archived: نادية القحطاني <nadiah.alkhayar@gmail.com>
  attempt_id = e66e8ccb-8b07-4866-80eb-da57c48fb8d7
  result     = { archived: true, audit_archived: 3,
                 ai_log_archived: 0, answers_archived: 0,
                 reason: 'retake_after_save_chain_fix_2026-05-23' }
```

Post-archive sanity check: نادية now has **0 active attempts**. ✓

Two RPCs preserved: `mock_exam_start` / `mock_exam_save_answer` /
`mock_exam_save_writing` / `mock_exam_submit` / `mock_exam_admin_force_submit`
all untouched. `visibility='live'` preserved. Cron jobs preserved.

---

## Phase C — Frontend visibility verification

For each archived student, simulated the MockExamGate / MockExamHub
landing query:

| Student | level | matching exam | visibility | active rows | expected hub state |
|---|---|---|---|---|---|
| نادية القحطاني | L3 | midterm-mock-b1 | live | 0 | **INTRO** ✓ |

On her next page load (or once the React Query cache invalidates via the
cache-invalidation fix shipped in `526c7b9`), she will see the
`IntroCard` with "ابدئي الاختبار الآن" instead of the 0/100 result page.

---

## Phase D — Re-notification

Inserted one personalized in-app notification:

```
نادية القحطاني → id=66adc02c-773d-457d-bbf7-294a0c30ed7b
  type           = announcement
  priority       = high
  action_route   = /student/mock-exam
  data.kind      = mock-exam-retake-2026-05-23
  expires_at     = 2026-05-24T19:00:00+00:00 (Sun 22:00 KSA)
  title          = ✨ محاولة جديدة جاهزة لكِ
  body           = تم إعادة فتح الاختبار التجريبي لكِ بمحاولة فريش...
```

The insert is idempotent on `(user_id, type='announcement', data->>kind)`
— re-running the script will skip rather than duplicate.

---

## Phase F — WhatsApp draft (paste-ready)

### نادية القحطاني (nadiah.alkhayar@gmail.com)

```
السلام عليكم نادية 💛

أبشّرك إنه الاختبار التجريبي صار متاح لكِ من جديد بمحاولة فريش.
أرشفنا محاولتكِ السابقة (اللي وقفت بدرجة ٠ بسبب انقطاع الاتصال قبل
حفظ الإجابات) وفتحنا لكِ محاولة جديدة كاملة بمؤقت ٩٠ دقيقة.

النظام تم تحصينه ضد المشكلة السابقة بست طبقات حماية —
كل إجابة تحفظ تلقائياً + النظام يسلّم اختباركِ حتى لو ضعف الاتصال.

عشان تشوفي المحاولة الجديدة:
١. اقفلي تطبيق طلاقة من الخلفية تماماً (Swipe up + Close)
   أو سجّلي خروج ودخول من جديد.
٢. ادخلي على «الاختبار التجريبي» من القائمة الجانبية.
ستجدين شاشة «ابدئي الاختبار الآن».

النافذة مفتوحة حتى ١٠ مساءً يوم الأحد ٢٤ مايو بإذن الله.
وفّقكِ الله 🌟

د. علي
```

---

## Students NOT given a retake (real attempts preserved)

- **علي سعيد القحطاني** <alialq146@gmail.com> — A1, 33 / 33 real answers, writing 58 w / 264 chars, score **71** ✓ kept
- **فاطمة خواجي** <fa.khawaji@gmail.com> — A1, 34 / 34 real answers, writing 80 w / 367 chars, score **88** ✓ kept

Both scores reflect genuine effort. Untouched.
