# Hawazin (هوازن العتيبي) — Progress Diagnosis

**profile_id:** `050ebad7-0c3b-4eaa-9bd1-9eaeca44adb6`  
**Group:** المجموعة 4

## Unit "ثقافة القهوة حول العالم" (unit 4, id: `738ff234-070d-4ace-9901-434e43521bdb`)

### Content available
| Activity | Exists |
|---|---|
| Reading A+B | ✓ 2 passages |
| Grammar | ✓ |
| Vocabulary | ✓ 167 words |
| Listening | ✓ |
| Writing | ✓ |
| Speaking | ✓ |
| Pronunciation | ✓ |
| Assessment | ✓ |

### Hawazin's progress (is_best rows)
| Section | Status | Score |
|---|---|---|
| reading A | completed | 100% |
| reading B | completed | 100% |
| grammar | completed | 100% |
| pronunciation | **in_progress** | — |
| listening | **missing** | — |
| writing | **missing** | — |
| speaking | **missing** | — |
| vocabulary | **missing** (tracked via word_mastery) | — |
| assessment | **missing** | — |

### Calculated progress (useUnitProgress)
`(10+10+13+0+0+0+0+5+0)/100 = 38%`

No speaking recordings found in `speaking_recordings` table.

---

## Unit "الذكاء الاصطناعي" (unit 1, id: `a5b583a4-5d9e-41b7-b95f-c07e0c44f64b`)

### Hawazin's progress (is_best rows)
| Section | Status | Score |
|---|---|---|
| reading A | completed | 100% |
| reading B | completed | 100% |
| grammar | completed | 70% |
| writing | completed | 60% |
| vocabulary | in_progress | — |
| listening | **missing** | — |
| speaking | **missing** | — |

### Calculated progress: `(10+10+13+0+0+13+0+0+0)/100 = 46%`

---

## Conclusion

Hawazin's units are not "stuck at 95%" — she genuinely hasn't completed listening, speaking, or vocabulary in either unit. The "95% stuck" pattern likely refers to other students who have **completed all visible activities but one section's progress row was never written** — specifically the 4 students confirmed to have speaking recordings but no `student_curriculum_progress` speaking row.

**Root cause for those students:** `handleUploadComplete` in `SpeakingTab.jsx` inserts/updates the speaking progress row with no error handling. Silent INSERT failure leaves `speaking_recordings` with a recording but `student_curriculum_progress` missing the speaking completion row.
