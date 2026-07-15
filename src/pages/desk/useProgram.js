// useProgram — the brain that turns the Desk into a guided program.
//
// It answers three questions for the whole account, all derived from the progress
// stores that already exist (no new storage):
//   • currentStep  — the ONE next thing to do (the next lesson in program order)
//   • stages[]     — per-stage progress + which stage she's on ("you are here")
//   • todaySession — the small daily checklist (continue a lesson + review words + a rule)
//
// It reuses useCurriculumProgress (lesson completion), useDailyProgress (SRS vocab +
// grammar-of-day + streak), useReadingProgress and useClassProgress for the review hub.
import { useMemo } from 'react'
import { PROGRAM_STAGES, PROGRAM_LESSONS, TOTAL_PROGRAM_LESSONS } from '@/data/desk/program'
import { useCurriculumProgress } from './useCurriculumProgress'
import { useDailyProgress } from './useDailyProgress'
import { useReadingProgress } from './useReadingProgress'
import { useClassProgress } from './useClassProgress'

export function useProgram() {
  const { isCompleted, markComplete } = useCurriculumProgress()
  const daily = useDailyProgress()
  const reading = useReadingProgress()
  const classes = useClassProgress()

  const derived = useMemo(() => {
    // program-ordered "current" = first incomplete lesson in the studied sequence
    const currentLesson = PROGRAM_LESSONS.find((l) => !isCompleted(l.id)) || null
    const doneCount = PROGRAM_LESSONS.filter((l) => isCompleted(l.id)).length
    const overall = {
      done: doneCount,
      total: TOTAL_PROGRAM_LESSONS,
      pct: TOTAL_PROGRAM_LESSONS ? Math.round((doneCount / TOTAL_PROGRAM_LESSONS) * 100) : 0,
    }

    const currentStageId = currentLesson?.stageId
      || PROGRAM_STAGES[PROGRAM_STAGES.length - 1].id // all done → the final stage

    const stages = PROGRAM_STAGES.map((stage) => {
      const lessons = PROGRAM_LESSONS.filter((l) => l.stageId === stage.id)
      const done = lessons.filter((l) => isCompleted(l.id)).length
      const total = lessons.length
      const allDone = total > 0 && done === total
      const current = lessons.find((l) => !isCompleted(l.id)) || null
      const isCurrent = stage.id === currentStageId && !allDone
      const status = allDone ? 'done' : isCurrent ? 'current' : done > 0 ? 'current' : 'upcoming'
      return {
        ...stage,
        done,
        total,
        pct: total ? Math.round((done / total) * 100) : 0,
        allDone,
        isCurrent,
        current,
        status,
        // per-track breakdown for the expanded stage view
        trackRows: stage.tracks.map((t) => {
          const tl = t.lessons || []
          const td = tl.filter((l) => isCompleted(l.id)).length
          return { id: t.id, en: t.en, ar: t.ar, icon: t.icon, lessons: tl, done: td, total: tl.length }
        }),
      }
    })
    const currentStageIndex = stages.findIndex((s) => s.id === currentStageId)

    return { currentLesson, overall, stages, currentStageId, currentStageIndex, allComplete: doneCount === TOTAL_PROGRAM_LESSONS && TOTAL_PROGRAM_LESSONS > 0 }
  }, [isCompleted])

  // ── today's session — the small daily HABIT (2 self-checking micro-tasks). The
  // lesson itself is the hero on Today (the "path"), so it deliberately is NOT a
  // checklist row here — this keeps the daily goal an honest 2/2 and removes the
  // "continue this lesson" duplication with the hero.
  const session = useMemo(() => {
    const grammar = daily.grammarToday
    const items = [
      {
        key: 'vocab',
        kind: 'vocab',
        en: 'Review your words',
        ar: 'راجعي كلماتك',
        detail: daily.todayVocabDone ? 'Done for today' : `${daily.todayCount || 0} word${daily.todayCount === 1 ? '' : 's'} to review`,
        detail_ar: daily.todayVocabDone ? 'خلّصتِ اليوم' : `${daily.todayCount || 0} كلمة للمراجعة`,
        to: '/desk/daily/vocab',
        done: !!daily.todayVocabDone,
      },
      {
        key: 'grammar',
        kind: 'grammar',
        en: 'Grammar rule of the day',
        ar: 'قاعدة اليوم',
        detail: daily.todayGrammarDone ? 'Done for today' : (grammar?.en || 'Today’s rule'),
        detail_ar: daily.todayGrammarDone ? 'خلّصتِ اليوم' : (grammar?.ar || 'قاعدة اليوم'),
        to: grammar ? `/desk/daily/grammar/${grammar.id}` : '/desk/daily/grammar',
        done: !!daily.todayGrammarDone,
      },
    ]
    const goalDone = items.filter((i) => i.done).length
    return {
      items,
      goalTotal: items.length,
      goalDone,
      allGoalDone: goalDone === items.length,
      streak: daily.streak || 0,
    }
  }, [daily.grammarToday, daily.todayVocabDone, daily.todayGrammarDone, daily.todayCount, daily.streak])

  return {
    ...derived,
    markComplete,
    session,
    // pass-through slices the review hub / today card want
    reading: { done: reading.done, total: reading.total, next: reading.next },
    classes: { done: classes.done, total: classes.total },
    vocabStats: daily.vocab,
    grammarStats: daily.grammar,
  }
}
