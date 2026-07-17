import { useState, useEffect, useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Target, CheckCircle2, Clock, Zap, ArrowLeft, AlertCircle,
  Loader2, BookOpen, Trophy, ArrowUpRight, ClipboardList,
  PenLine, Languages, Mic, Headphones, FileText,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { validateAnswer } from '../../utils/answerValidator'
import { useG } from '../../i18n/gender'
import './studentExercises.css'

// Western → Arabic-Indic digits (this student reads Arabic-Indic).
const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
const toAr = (n) => String(n ?? 0).replace(/\d/g, (d) => AR_DIGITS[+d])

// Per-skill accent (drives card glow, medallion, tags) — explicit rgba, self-contained.
const SKILL_THEME = {
  grammar:    { ic: PenLine,   a: '#38bdf8', soft: 'rgba(56,189,248,.12)',  bd: 'rgba(56,189,248,.32)' },
  vocabulary: { ic: Languages, a: '#4ade80', soft: 'rgba(74,222,128,.12)',  bd: 'rgba(74,222,128,.32)' },
  speaking:   { ic: Mic,       a: '#c4b5fd', soft: 'rgba(196,181,253,.14)', bd: 'rgba(196,181,253,.34)' },
  listening:  { ic: Headphones,a: '#f5c842', soft: 'rgba(245,200,66,.12)',  bd: 'rgba(245,200,66,.32)' },
  reading:    { ic: BookOpen,  a: '#fb7185', soft: 'rgba(251,113,133,.12)', bd: 'rgba(251,113,133,.32)' },
  writing:    { ic: FileText,  a: '#fbbf24', soft: 'rgba(251,191,36,.12)',  bd: 'rgba(251,191,36,.32)' },
}
const skillTheme = (s) => SKILL_THEME[s] || { ic: Target, a: '#a78bfa', soft: 'rgba(139,124,246,.12)', bd: 'rgba(139,124,246,.32)' }

// ─── General Exercises ──────────────────────────────────
const GENERAL_EXERCISES = [
  // ── Grammar (5) ──
  {
    id: 'general-grammar-1',
    title: 'Present Simple vs Present Continuous',
    title_ar: 'المضارع البسيط والمستمر',
    skill: 'grammar',
    difficulty: 'easy',
    xp_reward: 10,
    instructions: 'Choose the correct verb form to complete each sentence.',
    content: {
      type: 'multiple_choice',
      questions: [
        { id: 'q1', question: 'She ___ to school every day.', options: ['go', 'goes', 'going', 'is going'], correct_answer: 'goes', explanation: 'Use "goes" for third person singular (he/she/it) in Present Simple.' },
        { id: 'q2', question: 'Look! The children ___ in the park right now.', options: ['play', 'plays', 'are playing', 'is playing'], correct_answer: 'are playing', explanation: 'Use Present Continuous (are + -ing) for actions happening right now.' },
        { id: 'q3', question: 'I usually ___ coffee in the morning.', options: ['drink', 'drinks', 'am drinking', 'drinking'], correct_answer: 'drink', explanation: 'Use the base form "drink" with "I" in Present Simple for habits.' },
        { id: 'q4', question: 'Be quiet! The baby ___.', options: ['sleeps', 'sleep', 'is sleeping', 'are sleeping'], correct_answer: 'is sleeping', explanation: 'Use Present Continuous (is + -ing) for an action happening at this moment.' },
        { id: 'q5', question: 'Water ___ at 100 degrees Celsius.', options: ['boils', 'is boiling', 'boil', 'are boiling'], correct_answer: 'boils', explanation: 'Use Present Simple for scientific facts and general truths.' },
      ],
    },
  },
  {
    id: 'general-grammar-2',
    title: 'Articles: a / an / the',
    title_ar: 'أدوات التعريف والتنكير: a / an / the',
    skill: 'grammar',
    difficulty: 'easy',
    xp_reward: 10,
    instructions: 'Choose the correct article to complete the sentence.',
    content: {
      type: 'multiple_choice',
      questions: [
        { id: 'q1', question: 'I saw ___ elephant at the zoo yesterday.', options: ['a', 'an', 'the', '(no article)'], correct_answer: 'an', explanation: 'Use "an" before words that start with a vowel sound. "Elephant" starts with /e/.' },
        { id: 'q2', question: '___ sun rises in the east.', options: ['A', 'An', 'The', '(no article)'], correct_answer: 'The', explanation: 'Use "the" for unique things — there is only one sun.' },
        { id: 'q3', question: 'She is ___ honest person.', options: ['a', 'an', 'the', '(no article)'], correct_answer: 'an', explanation: 'Use "an" because "honest" starts with a silent "h" — the first sound is the vowel /ɒ/.' },
        { id: 'q4', question: 'Can you pass me ___ salt, please?', options: ['a', 'an', 'the', '(no article)'], correct_answer: 'the', explanation: 'Use "the" when both speaker and listener know which specific thing is meant.' },
        { id: 'q5', question: 'He wants to be ___ doctor when he grows up.', options: ['a', 'an', 'the', '(no article)'], correct_answer: 'a', explanation: 'Use "a" before consonant sounds when mentioning something for the first time or talking about a profession in general.' },
      ],
    },
  },
  {
    id: 'general-grammar-3',
    title: 'Prepositions: in / on / at',
    title_ar: 'حروف الجر: in / on / at',
    skill: 'grammar',
    difficulty: 'easy',
    xp_reward: 10,
    instructions: 'Choose the correct preposition to complete each sentence.',
    content: {
      type: 'multiple_choice',
      questions: [
        { id: 'q1', question: 'The meeting is ___ Monday.', options: ['in', 'on', 'at', 'to'], correct_answer: 'on', explanation: 'Use "on" with days of the week (on Monday, on Friday).' },
        { id: 'q2', question: 'She was born ___ 1999.', options: ['in', 'on', 'at', 'to'], correct_answer: 'in', explanation: 'Use "in" with years, months, and long periods (in 1999, in July).' },
        { id: 'q3', question: 'The class starts ___ 9 o\'clock.', options: ['in', 'on', 'at', 'to'], correct_answer: 'at', explanation: 'Use "at" with specific times (at 9 o\'clock, at noon).' },
        { id: 'q4', question: 'We go on holiday ___ summer.', options: ['in', 'on', 'at', 'to'], correct_answer: 'in', explanation: 'Use "in" with seasons (in summer, in winter).' },
        { id: 'q5', question: 'I\'ll see you ___ the weekend.', options: ['in', 'on', 'at', 'to'], correct_answer: 'at', explanation: 'Use "at" with the weekend (British English). "On the weekend" is also accepted in American English.' },
      ],
    },
  },
  {
    id: 'general-grammar-4',
    title: 'Past Simple: Regular Verbs',
    title_ar: 'الماضي البسيط: الأفعال المنتظمة',
    skill: 'grammar',
    difficulty: 'easy',
    xp_reward: 10,
    instructions: 'Choose the correct past simple form of the verb.',
    content: {
      type: 'multiple_choice',
      questions: [
        { id: 'q1', question: 'Yesterday, I ___ (walk) to the park.', options: ['walk', 'walked', 'walking', 'walks'], correct_answer: 'walked', explanation: 'Add "-ed" to regular verbs to form the Past Simple: walk → walked.' },
        { id: 'q2', question: 'She ___ (study) English last night.', options: ['study', 'studyed', 'studied', 'studying'], correct_answer: 'studied', explanation: 'When a verb ends in consonant + y, change "y" to "i" and add "-ed": study → studied.' },
        { id: 'q3', question: 'They ___ (stop) the car suddenly.', options: ['stoped', 'stopped', 'stop', 'stopping'], correct_answer: 'stopped', explanation: 'When a short verb ends in consonant-vowel-consonant, double the last consonant: stop → stopped.' },
        { id: 'q4', question: 'We ___ (play) football last weekend.', options: ['plaied', 'plaid', 'played', 'playing'], correct_answer: 'played', explanation: 'When a verb ends in vowel + y, just add "-ed": play → played.' },
        { id: 'q5', question: 'He ___ (not/like) the movie.', options: ['didn\'t like', 'didn\'t liked', 'not liked', 'doesn\'t like'], correct_answer: 'didn\'t like', explanation: 'In negative Past Simple, use "didn\'t" + base form: didn\'t like (NOT didn\'t liked).' },
      ],
    },
  },
  {
    id: 'general-grammar-5',
    title: 'Subject-Verb Agreement',
    title_ar: 'التوافق بين الفاعل والفعل',
    skill: 'grammar',
    difficulty: 'medium',
    xp_reward: 10,
    instructions: 'Choose the correct verb form that agrees with the subject.',
    content: {
      type: 'multiple_choice',
      questions: [
        { id: 'q1', question: 'Everyone in the class ___ ready for the test.', options: ['is', 'are', 'were', 'be'], correct_answer: 'is', explanation: '"Everyone" is a singular pronoun, so it takes a singular verb: "is".' },
        { id: 'q2', question: 'The news ___ very surprising.', options: ['is', 'are', 'were', 'have been'], correct_answer: 'is', explanation: '"News" is an uncountable noun — it looks plural but takes a singular verb.' },
        { id: 'q3', question: 'Neither the teacher nor the students ___ happy about the change.', options: ['is', 'are', 'was', 'has been'], correct_answer: 'are', explanation: 'With "neither…nor", the verb agrees with the nearest subject: "students" is plural → "are".' },
        { id: 'q4', question: 'The team ___ playing very well this season.', options: ['is', 'are', 'have', 'were'], correct_answer: 'is', explanation: 'Collective nouns like "team" usually take a singular verb when acting as one unit.' },
        { id: 'q5', question: 'Mathematics ___ my favourite subject.', options: ['is', 'are', 'were', 'have been'], correct_answer: 'is', explanation: 'Subjects and fields of study ending in "-s" (mathematics, physics) are singular.' },
      ],
    },
  },

  // ── Vocabulary (5) ──
  {
    id: 'general-vocab-1',
    title: 'Common Daily Vocabulary',
    title_ar: 'مفردات يومية شائعة',
    skill: 'vocabulary',
    difficulty: 'easy',
    xp_reward: 10,
    instructions: 'Choose the correct word to complete each sentence.',
    content: {
      type: 'multiple_choice',
      questions: [
        { id: 'q1', question: 'I need to ___ my teeth before I go to bed.', options: ['wash', 'brush', 'clean', 'sweep'], correct_answer: 'brush', explanation: 'The correct collocation is "brush your teeth" — we use "brush" with teeth.' },
        { id: 'q2', question: 'Please ___ the door when you leave.', options: ['shut', 'close', 'lock', 'All of these are correct'], correct_answer: 'All of these are correct', explanation: 'You can "shut", "close", or "lock" a door — all are natural, though "lock" implies using a key.' },
        { id: 'q3', question: 'She ___ the bus to work every morning.', options: ['rides', 'drives', 'takes', 'goes'], correct_answer: 'takes', explanation: 'We say "take the bus" — this is a common collocation for public transport.' },
        { id: 'q4', question: 'Can I ___ a photo of you?', options: ['make', 'do', 'take', 'get'], correct_answer: 'take', explanation: 'The correct collocation is "take a photo/picture" (NOT make a photo).' },
        { id: 'q5', question: 'He ___ a shower and then had breakfast.', options: ['made', 'took', 'did', 'got'], correct_answer: 'took', explanation: 'We say "take a shower" (or "have a shower" in British English).' },
      ],
    },
  },
  {
    id: 'general-vocab-2',
    title: 'Opposites (Antonyms)',
    title_ar: 'المتضادات',
    skill: 'vocabulary',
    difficulty: 'easy',
    xp_reward: 10,
    instructions: 'Choose the word that is the opposite (antonym) of the given word.',
    content: {
      type: 'multiple_choice',
      questions: [
        { id: 'q1', question: 'What is the opposite of "brave"?', options: ['strong', 'cowardly', 'kind', 'angry'], correct_answer: 'cowardly', explanation: '"Brave" means showing courage; "cowardly" means lacking courage — they are antonyms.' },
        { id: 'q2', question: 'What is the opposite of "ancient"?', options: ['old', 'modern', 'broken', 'large'], correct_answer: 'modern', explanation: '"Ancient" means very old; "modern" means new or recent — they are antonyms.' },
        { id: 'q3', question: 'What is the opposite of "generous"?', options: ['kind', 'wealthy', 'selfish', 'gentle'], correct_answer: 'selfish', explanation: '"Generous" means willing to give; "selfish" means caring only about oneself.' },
        { id: 'q4', question: 'What is the opposite of "shallow"?', options: ['wide', 'narrow', 'deep', 'tall'], correct_answer: 'deep', explanation: '"Shallow" means not deep; "deep" is its antonym.' },
        { id: 'q5', question: 'What is the opposite of "temporary"?', options: ['permanent', 'short', 'quick', 'sudden'], correct_answer: 'permanent', explanation: '"Temporary" means lasting a short time; "permanent" means lasting forever.' },
      ],
    },
  },
  {
    id: 'general-vocab-3',
    title: 'Family & Relationships',
    title_ar: 'العائلة والعلاقات',
    skill: 'vocabulary',
    difficulty: 'easy',
    xp_reward: 10,
    instructions: 'Choose the correct family or relationship word.',
    content: {
      type: 'multiple_choice',
      questions: [
        { id: 'q1', question: 'My mother\'s sister is my ___.', options: ['cousin', 'aunt', 'niece', 'grandmother'], correct_answer: 'aunt', explanation: 'Your mother\'s (or father\'s) sister is your aunt.' },
        { id: 'q2', question: 'My brother\'s daughter is my ___.', options: ['cousin', 'niece', 'nephew', 'sister'], correct_answer: 'niece', explanation: 'Your brother\'s (or sister\'s) daughter is your niece.' },
        { id: 'q3', question: 'My father\'s father is my ___.', options: ['uncle', 'grandfather', 'father-in-law', 'stepfather'], correct_answer: 'grandfather', explanation: 'Your parent\'s father is your grandfather.' },
        { id: 'q4', question: 'My uncle\'s children are my ___.', options: ['nephews', 'siblings', 'cousins', 'nieces'], correct_answer: 'cousins', explanation: 'The children of your uncle or aunt are your cousins.' },
        { id: 'q5', question: 'My wife\'s mother is my ___.', options: ['grandmother', 'stepmother', 'mother-in-law', 'aunt'], correct_answer: 'mother-in-law', explanation: 'Your spouse\'s mother is your mother-in-law.' },
      ],
    },
  },
  {
    id: 'general-vocab-4',
    title: 'Food & Restaurant Vocabulary',
    title_ar: 'مفردات الطعام والمطاعم',
    skill: 'vocabulary',
    difficulty: 'easy',
    xp_reward: 10,
    instructions: 'Choose the correct word to complete each sentence about food or restaurants.',
    content: {
      type: 'multiple_choice',
      questions: [
        { id: 'q1', question: 'Can I see the ___, please? I\'d like to order.', options: ['recipe', 'menu', 'bill', 'plate'], correct_answer: 'menu', explanation: 'A "menu" is the list of food and drinks available at a restaurant. A "recipe" is instructions for cooking.' },
        { id: 'q2', question: 'The steak was ___. It was cooked perfectly!', options: ['delicious', 'disgusting', 'raw', 'spicy'], correct_answer: 'delicious', explanation: '"Delicious" means the food tastes extremely good.' },
        { id: 'q3', question: 'I\'m allergic to nuts, so I always check the ___.', options: ['ingredients', 'portions', 'courses', 'dishes'], correct_answer: 'ingredients', explanation: '"Ingredients" are the individual items that make up a dish.' },
        { id: 'q4', question: 'Could we have the ___, please? We\'re ready to pay.', options: ['menu', 'tip', 'bill', 'order'], correct_answer: 'bill', explanation: 'The "bill" (or "check" in American English) is what you pay at the end of a meal.' },
        { id: 'q5', question: 'For ___, I\'ll have the chocolate cake.', options: ['starter', 'main course', 'dessert', 'appetizer'], correct_answer: 'dessert', explanation: '"Dessert" is the sweet course served at the end of a meal.' },
      ],
    },
  },
  {
    id: 'general-vocab-5',
    title: 'Feelings & Emotions',
    title_ar: 'المشاعر والعواطف',
    skill: 'vocabulary',
    difficulty: 'easy',
    xp_reward: 10,
    instructions: 'Choose the word that best describes the feeling in each situation.',
    content: {
      type: 'multiple_choice',
      questions: [
        { id: 'q1', question: 'She got the highest grade in the exam. She feels very ___.', options: ['proud', 'jealous', 'embarrassed', 'anxious'], correct_answer: 'proud', explanation: '"Proud" means feeling pleased about an achievement.' },
        { id: 'q2', question: 'He has a job interview tomorrow. He feels ___.', options: ['bored', 'nervous', 'relieved', 'disappointed'], correct_answer: 'nervous', explanation: '"Nervous" means feeling worried or anxious about something that might happen.' },
        { id: 'q3', question: 'The movie was three hours long with no action. I felt ___.', options: ['excited', 'terrified', 'bored', 'confused'], correct_answer: 'bored', explanation: '"Bored" means feeling uninterested because something is dull or tedious.' },
        { id: 'q4', question: 'She finally finished her exams. She feels ___.', options: ['anxious', 'exhausted', 'relieved', 'furious'], correct_answer: 'relieved', explanation: '"Relieved" means feeling happy because something stressful is over.' },
        { id: 'q5', question: 'He said something rude to his friend and now feels ___.', options: ['proud', 'guilty', 'delighted', 'curious'], correct_answer: 'guilty', explanation: '"Guilty" means feeling bad because you did something wrong.' },
      ],
    },
  },
]

const SKILL_LABELS = {
  grammar: 'القواعد',
  vocabulary: 'المفردات',
  speaking: 'المحادثة',
  listening: 'الاستماع',
  reading: 'القراءة',
  writing: 'الكتابة',
}

const SKILL_COLORS = {
  grammar: 'sky',
  vocabulary: 'emerald',
  speaking: 'violet',
  listening: 'gold',
  reading: 'rose',
  writing: 'amber',
}

const DIFFICULTY_LABELS = { easy: 'سهل', medium: 'متوسط', hard: 'صعب' }

const SKILL_COLOR_CLASSES = {
  sky: { iconBox: 'bg-sky-500/10 text-sky-400', badge: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
  emerald: { iconBox: 'bg-emerald-500/10 text-emerald-400', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  violet: { iconBox: 'bg-violet-500/10 text-violet-400', badge: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
  gold: { iconBox: 'bg-gold-500/10 text-gold-400', badge: 'bg-gold-500/10 text-gold-400 border-gold-500/20' },
  rose: { iconBox: 'bg-rose-500/10 text-rose-400', badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  amber: { iconBox: 'bg-amber-500/10 text-amber-400', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
}

// ─── localStorage helpers for general exercise completion tracking ────
const GENERAL_COMPLETED_KEY = 'fluentia_general_exercises_completed'

function getCompletedGeneralExercises() {
  try {
    const raw = localStorage.getItem(GENERAL_COMPLETED_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function markGeneralExerciseCompleted(exerciseId, resultData) {
  const completed = getCompletedGeneralExercises()
  completed[exerciseId] = { ...resultData, completedAt: new Date().toISOString() }
  localStorage.setItem(GENERAL_COMPLETED_KEY, JSON.stringify(completed))
}

export default function StudentExercises() {
  const { profile, studentData } = useAuthStore(useShallow((s) => ({ profile: s.profile, studentData: s.studentData })))
  const g = useG()
  const queryClient = useQueryClient()
  const [activeExercise, setActiveExercise] = useState(null)
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState(null)
  const [isGeneralExercise, setIsGeneralExercise] = useState(false)
  const [completedGeneral, setCompletedGeneral] = useState(() => getCompletedGeneralExercises())
  const [skillFilter, setSkillFilter] = useState('all')

  const { data: exercises, isLoading } = useQuery({
    queryKey: ['student-exercises'],
    queryFn: async () => {
      const { data } = await supabase
        .from('targeted_exercises')
        .select('*, error_patterns(pattern_type, description, skill)')
        .eq('student_id', profile?.id)
        .order('created_at', { ascending: false })
      return data || []
    },
    enabled: !!profile?.id,
  })

  const { data: stats } = useQuery({
    queryKey: ['exercise-stats'],
    queryFn: async () => {
      const all = exercises || []
      return {
        total: all.length,
        completed: all.filter(e => e.status === 'completed').length,
        pending: all.filter(e => e.status === 'pending').length,
        avgScore: all.filter(e => e.score).reduce((acc, e) => acc + Number(e.score), 0) / (all.filter(e => e.score).length || 1),
        totalXp: all.reduce((acc, e) => acc + (e.xp_awarded || 0), 0),
      }
    },
    enabled: !!exercises,
  })

  const submitMutation = useMutation({
    mutationFn: async ({ exerciseId, answers: studentAnswers }) => {
      const exercise = exercises.find(e => e.id === exerciseId)
      if (!exercise) throw new Error('Exercise not found')

      const questions = exercise.content?.questions || []
      if (questions.length === 0) throw new Error('No questions in exercise')
      let correct = 0
      for (const q of questions) {
        const accepted = q.accepted_answers || [q.correct_answer]
        if (validateAnswer(studentAnswers[q.id], accepted)) correct++
      }
      const score = Math.round((correct / questions.length) * 100)
      const xp = score >= 80 ? 15 : score >= 60 ? 10 : 5

      await supabase
        .from('targeted_exercises')
        .update({
          status: 'completed',
          score,
          student_answers: studentAnswers,
          xp_awarded: xp,
          completed_at: new Date().toISOString(),
        })
        .eq('id', exerciseId)

      // Award XP
      await supabase.from('xp_transactions').insert({
        student_id: profile?.id,
        amount: xp,
        reason: 'custom',
        description: `إكمال تمرين مخصص: ${exercise.title}`,
      })

      // DB trigger on xp_transactions auto-increments students.xp_total

      // If score >= 80, mark pattern as potentially resolved
      if (score >= 80 && exercise.pattern_id) {
        const { data: patternExercises } = await supabase
          .from('targeted_exercises')
          .select('score')
          .eq('pattern_id', exercise.pattern_id)
          .eq('status', 'completed')

        const avgScore = patternExercises?.reduce((acc, e) => acc + Number(e.score), 0) / (patternExercises?.length || 1)
        if (avgScore >= 85 && (patternExercises?.length || 0) >= 2) {
          await supabase
            .from('error_patterns')
            .update({ resolved: true, resolved_at: new Date().toISOString() })
            .eq('id', exercise.pattern_id)
        }
      }

      return { score, xp, correct, total: questions.length }
    },
    onSuccess: (data) => {
      setResult(data)
      setSubmitted(true)
      queryClient.invalidateQueries({ queryKey: ['student-exercises'] })
    },
  })

  // ─── General exercise submission (XP only, no DB update for targeted_exercises) ───
  const submitGeneralMutation = useMutation({
    mutationFn: async ({ exerciseId, answers: studentAnswers }) => {
      const exercise = GENERAL_EXERCISES.find(e => e.id === exerciseId)
      if (!exercise) throw new Error('General exercise not found')

      const questions = exercise.content?.questions || []
      if (questions.length === 0) throw new Error('No questions in exercise')
      let correct = 0
      for (const q of questions) {
        const accepted = q.accepted_answers || [q.correct_answer]
        if (validateAnswer(studentAnswers[q.id], accepted)) correct++
      }
      const score = Math.round((correct / questions.length) * 100)
      const xp = score >= 80 ? (exercise.xp_reward || 10) : score >= 60 ? Math.round((exercise.xp_reward || 10) * 0.7) : Math.round((exercise.xp_reward || 10) * 0.4)

      // Award XP in the database
      await supabase.from('xp_transactions').insert({
        student_id: profile?.id,
        amount: xp,
        reason: 'custom',
        description: `إكمال تمرين عام: ${exercise.title_ar}`,
      })

      // DB trigger on xp_transactions auto-increments students.xp_total

      return { score, xp, correct, total: questions.length }
    },
    onSuccess: (data) => {
      setResult(data)
      setSubmitted(true)
      // Mark in localStorage
      if (activeExercise) {
        markGeneralExerciseCompleted(activeExercise.id, data)
        setCompletedGeneral(getCompletedGeneralExercises())
      }
    },
  })

  function handleSubmit() {
    if (!activeExercise) return
    if (isGeneralExercise) {
      submitGeneralMutation.mutate({ exerciseId: activeExercise.id, answers })
    } else {
      submitMutation.mutate({ exerciseId: activeExercise.id, answers })
    }
  }

  function resetExercise() {
    setActiveExercise(null)
    setAnswers({})
    setSubmitted(false)
    setResult(null)
    setIsGeneralExercise(false)
  }

  function openGeneralExercise(exercise) {
    setActiveExercise(exercise)
    setIsGeneralExercise(true)
    setAnswers({})
    setSubmitted(false)
    setResult(null)
  }

  const pendingExercises = exercises?.filter(e => e.status === 'pending') || []
  const completedExercises = exercises?.filter(e => e.status === 'completed') || []
  const hasNoTargetedExercises = pendingExercises.length === 0 && completedExercises.length === 0

  // ─── Derived for the redesigned landing ───
  const generalCounts = useMemo(() => {
    const c = {}
    for (const e of GENERAL_EXERCISES) c[e.skill] = (c[e.skill] || 0) + 1
    return c
  }, [])
  const filteredGeneral = useMemo(
    () => (skillFilter === 'all' ? GENERAL_EXERCISES : GENERAL_EXERCISES.filter(e => e.skill === skillFilter)),
    [skillFilter]
  )

  if (activeExercise) {
    return (
      <ExerciseView
        exercise={activeExercise}
        answers={answers}
        setAnswers={setAnswers}
        submitted={submitted}
        result={result}
        onSubmit={handleSubmit}
        onBack={resetExercise}
        submitting={isGeneralExercise ? submitGeneralMutation.isPending : submitMutation.isPending}
      />
    )
  }

  return (
    <div className="pex-root" dir="rtl">
      <PexWorld />
      <div className="pex-wrap">

        {/* ── HERO ── */}
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
          <span className="pex-eyebrow">مهامّ من مدرّبك</span>
          <h1 className="pex-title">تمارين مخصّصة</h1>
          <p className="pex-title-en" dir="ltr">Your Assigned Tasks</p>
          <p className="pex-lead">
            {g('مهامّ اختارها لك مدرّبك لتقوية مهارات محدّدة — أنجِزها واحدةً تلو الأخرى، ونتيجتك تُحسب فورًا.',
               'مهامّ اختارها لكِ مدرّبكِ لتقوية مهارات محدّدة — أنجِزيها واحدةً تلو الأخرى، ونتيجتكِ تُحسب فورًا.')}
          </p>
        </motion.div>

        {/* ── STAT CONSOLE ── */}
        <div className="pex-stats">
          {[
            { label: 'مهامّ متاحة', value: toAr(pendingExercises.length), Icon: Clock, a: '#38bdf8', glow: 'rgba(56,189,248,.5)' },
            { label: 'مكتملة', value: toAr(stats?.completed || 0), Icon: CheckCircle2, a: '#4ade80', glow: 'rgba(74,222,128,.5)' },
            { label: 'متوسط الدرجة', value: `${toAr(Math.round(stats?.avgScore || 0))}٪`, Icon: Trophy, a: '#f5c842', glow: 'rgba(245,200,66,.5)' },
            { label: 'نقاط الخبرة', value: toAr(stats?.totalXp || 0), Icon: Zap, a: '#a78bfa', glow: 'rgba(139,124,246,.55)' },
          ].map((c, i) => (
            <motion.div
              key={c.label}
              className="pex-stat"
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 + i * 0.06, duration: 0.4 }}
            >
              <div className="pex-stat__glow" style={{ background: `radial-gradient(circle, ${c.glow}, transparent 70%)` }} />
              <div className="pex-stat__top">
                <span className="pex-stat__label">{c.label}</span>
                <span className="pex-stat__ic" style={{ background: `${c.a}1f`, color: c.a, border: `1px solid ${c.a}44` }}>
                  <c.Icon size={16} />
                </span>
              </div>
              <p className="pex-stat__val" dir="ltr">{c.value}</p>
            </motion.div>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={26} className="animate-spin" style={{ color: '#a78bfa' }} />
          </div>
        ) : hasNoTargetedExercises ? (
          <>
            {/* No assigned tasks yet — warm note + optional extra practice */}
            <motion.div
              className="pex-note" style={{ marginTop: 26 }}
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4 }}
            >
              <div className="pex-note__ic"><ClipboardList size={26} /></div>
              <h3 className="pex-note__title">{g('لم يُسنِد لك مدرّبك مهامّ بعد', 'لم يُسنِد لكِ مدرّبكِ مهامّ بعد')}</h3>
              <p className="pex-note__text">
                {g('ستظهر مهامّك المخصّصة هنا فور إسنادها. حتى ذلك الحين، يمكنك التدرّب بتمارين إضافية:',
                   'ستظهر مهامّكِ المخصّصة هنا فور إسنادها. حتى ذلك الحين، يمكنكِ التدرّب بتمارين إضافية:')}
              </p>
            </motion.div>

            {/* Optional extra practice library */}
            <div className="pex-sec-head">
              <span className="pex-sec-ic" style={{ background: 'rgba(56,189,248,.1)', color: '#38bdf8', border: '1px solid rgba(56,189,248,.28)' }}><BookOpen size={17} /></span>
              <span className="pex-sec-title">تدريب إضافي</span>
              <span className="pex-sec-count" dir="ltr">{toAr(filteredGeneral.length)}</span>
              <span className="pex-sec-rule" />
            </div>

            <SkillFilters counts={generalCounts} active={skillFilter} onChange={setSkillFilter} />

            <div className="pex-grid">
              {filteredGeneral.map((exercise, i) => (
                <ExerciseCard
                  key={exercise.id}
                  i={i}
                  skill={exercise.skill}
                  difficulty={exercise.difficulty}
                  xp={exercise.xp_reward}
                  titleAr={exercise.title_ar}
                  titleEn={exercise.title}
                  done={!!completedGeneral[exercise.id]}
                  doneScore={completedGeneral[exercise.id]?.score}
                  onOpen={() => openGeneralExercise(exercise)}
                />
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Assigned tasks (pending) */}
            {pendingExercises.length > 0 && (
              <>
                <div className="pex-sec-head">
                  <span className="pex-sec-ic" style={{ background: 'rgba(139,124,246,.12)', color: '#a78bfa', border: '1px solid rgba(139,124,246,.3)' }}><ClipboardList size={17} /></span>
                  <span className="pex-sec-title">مهامّك</span>
                  <span className="pex-sec-count" dir="ltr">{toAr(pendingExercises.length)}</span>
                  <span className="pex-sec-rule" />
                </div>
                <div className="pex-grid">
                  {pendingExercises.map((exercise, i) => (
                    <ExerciseCard
                      key={exercise.id}
                      i={i}
                      skill={exercise.skill}
                      difficulty={exercise.difficulty}
                      titleAr={exercise.title}
                      subtitle={exercise.error_patterns?.description}
                      onOpen={() => { setActiveExercise(exercise); setAnswers({}); setSubmitted(false); setResult(null) }}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Completed */}
            {completedExercises.length > 0 && (
              <>
                <div className="pex-sec-head">
                  <span className="pex-sec-ic" style={{ background: 'rgba(74,222,128,.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,.3)' }}><CheckCircle2 size={17} /></span>
                  <span className="pex-sec-title">مكتملة</span>
                  <span className="pex-sec-count" dir="ltr">{toAr(completedExercises.length)}</span>
                  <span className="pex-sec-rule" />
                </div>
                <div className="pex-grid" style={{ gap: 9 }}>
                  {completedExercises.slice(0, 12).map((exercise) => {
                    const good = exercise.score >= 80, ok = exercise.score >= 60
                    const c = good ? '#4ade80' : ok ? '#f5c842' : '#fb7185'
                    return (
                      <div key={exercise.id} className="pex-done-row">
                        <div className="pex-done-row__l">
                          <CheckCircle2 size={15} style={{ color: '#4ade80', flexShrink: 0 }} />
                          <span className="pex-done-row__title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exercise.title}</span>
                          <span className="pex-done-row__skill">{SKILL_LABELS[exercise.skill]}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="pex-score-badge" dir="ltr" style={{ color: c, background: `${c}1f`, border: `1px solid ${c}44` }}>{toAr(exercise.score)}٪</span>
                          <span className="pex-meta pex-meta--xp" dir="ltr"><Zap size={11} /> +{toAr(exercise.xp_awarded)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── The immersive Intelligence-Lab world (fixed, behind content) ───
function PexWorld() {
  return (
    <div className="pex-world" aria-hidden>
      <div className="pex-world__rings" />
      <div className="pex-world__grid" />
      <div className="pex-world__bloom" />
      <div className="pex-world__motes" />
      <div className="pex-world__scrim" />
      <div className="pex-world__grain" />
    </div>
  )
}

// ─── Skill filter chips ───
function SkillFilters({ counts, active, onChange }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  const skills = Object.keys(counts).filter((k) => counts[k] > 0)
  if (skills.length <= 1) return null
  return (
    <div className="pex-filters">
      <button className={`pex-chip${active === 'all' ? ' is-active' : ''}`} onClick={() => onChange('all')}>
        الكل <span className="pex-chip__count" dir="ltr">{toAr(total)}</span>
      </button>
      {skills.map((s) => (
        <button key={s} className={`pex-chip${active === s ? ' is-active' : ''}`} onClick={() => onChange(s)}>
          {SKILL_LABELS[s] || s} <span className="pex-chip__count" dir="ltr">{toAr(counts[s])}</span>
        </button>
      ))}
    </div>
  )
}

// ─── Premium exercise card (targeted + general) ───
function ExerciseCard({ i, skill, difficulty, xp, titleAr, titleEn, subtitle, done, doneScore, onOpen }) {
  const t = skillTheme(skill)
  const Icon = t.ic
  const handleKey = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() } }
  return (
    <motion.div
      className={`pex-card${done ? ' is-done' : ''}`}
      style={{ '--pex-accent': t.a, '--pex-accent-soft': t.soft, '--pex-accent-bd': t.bd }}
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(i, 8) * 0.04, duration: 0.4 }}
      onClick={onOpen} onKeyDown={handleKey} tabIndex={0} role="button"
    >
      <span className="pex-card__medal"><Icon size={22} strokeWidth={1.8} /></span>
      <div className="pex-card__body">
        <div className="pex-card__chips">
          <span className="pex-tag">{SKILL_LABELS[skill] || skill}</span>
          {difficulty && <span className="pex-meta">{DIFFICULTY_LABELS[difficulty]}</span>}
          {xp != null && <span className="pex-meta pex-meta--xp" dir="ltr"><Zap size={11} /> {toAr(xp)} XP</span>}
          {done && doneScore != null && <span className="pex-meta pex-meta--score" dir="ltr"><CheckCircle2 size={11} /> {toAr(doneScore)}٪</span>}
        </div>
        <h3 className="pex-card__title">{titleAr}</h3>
        {titleEn && <p className="pex-card__en" dir="ltr">{titleEn}</p>}
        {subtitle && <p className="pex-card__en" dir="rtl" style={{ direction: 'rtl', color: 'rgba(236,233,246,.6)' }}>{subtitle}</p>}
      </div>
      {done ? (
        <span className="pex-card__done"><CheckCircle2 size={18} /></span>
      ) : (
        <span className="pex-card__go"><ArrowUpRight size={17} style={{ transform: 'scaleX(-1)' }} /></span>
      )}
    </motion.div>
  )
}

// ─── Exercise View ──────────────────────────────────────

function ExerciseView({ exercise, answers, setAnswers, submitted, result, onSubmit, onBack, submitting }) {
  // Hooks first (React #310 discipline) — used by the manually-authored "learn then test" exercises.
  const g = useG()
  const [checked, setChecked] = useState({}) // q.id -> true/false (per-question check mode)
  const [stage, setStage] = useState(() => (exercise.content?.learn ? 'learn' : 'test'))

  const questions = exercise.content?.questions || []
  const type = exercise.content?.type || 'multiple_choice'
  const learn = exercise.content?.learn || null
  const perQuestion = exercise.content?.check_mode === 'per_question'
  const allAnswered = questions.every(q => answers[q.id] !== undefined && answers[q.id] !== '')
  const checkedCount = Object.keys(checked).length
  const allChecked = !perQuestion || questions.every(q => checked[q.id] !== undefined)

  function checkOne(q) {
    const accepted = q.accepted_answers || [q.correct_answer]
    const ok = validateAnswer(answers[q.id], accepted)
    setChecked(prev => ({ ...prev, [q.id]: ok }))
  }

  // Score-templated encouragement (rule-based, never an API call; neutral phrasing reads for both genders)
  const encouragement = result
    ? result.score >= 90 ? 'ممتاز! إتقان واضح 👏'
      : result.score >= 80 ? 'أداء قوي! مراجعة سريعة للأسئلة الحمراء وتكتمل الصورة.'
        : result.score >= 60 ? 'جيد — مراجعة قسم التعلّم بالأعلى سترفع نتيجتك أكثر.'
          : 'بداية طيبة — قسم التعلّم يشرح كل قاعدة خطوة بخطوة، والإعادة تصنع الفرق.'
    : null

  const t = skillTheme(exercise.skill)
  return (
    <div className="pex-root" dir="rtl">
      <PexWorld />
      <div className="pex-run space-y-12">
      {/* Header */}
      <div className="pex-run__head">
        <button onClick={onBack} className="pex-back" aria-label="رجوع">
          <ArrowLeft size={19} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="pex-title" style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', marginBottom: 2 }}>{exercise.title_ar || exercise.title}</h1>
          {exercise.content?.title_en && <p className="pex-card__en" dir="ltr" style={{ fontSize: '0.8125rem' }}>{exercise.content.title_en}</p>}
          {exercise.instructions && <p style={{ color: 'rgba(236,233,246,.62)', fontSize: '0.875rem', marginTop: 4 }}>{exercise.instructions}</p>}
        </div>
        <span className="pex-tag" style={{ '--pex-accent': t.a, '--pex-accent-soft': t.soft, '--pex-accent-bd': t.bd, padding: '4px 12px', fontSize: '0.75rem', flexShrink: 0 }}>
          {SKILL_LABELS[exercise.skill]}
        </span>
      </div>

      {/* Learn ⇄ Test stage toggle (only for exercises that ship a learn section) */}
      {learn && (
        <div className="flex items-center gap-2">
          {[{ k: 'learn', label: 'تعلّم' }, { k: 'test', label: g('اختبر نفسك', 'اختبري نفسكِ') }].map(t => (
            <button
              key={t.k}
              onClick={() => setStage(t.k)}
              className={`text-sm px-4 py-2 rounded-xl border transition-all ${
                stage === t.k
                  ? 'bg-sky-500/10 border-sky-500/30 text-sky-400 font-bold'
                  : 'border-border-subtle text-muted hover:text-[var(--text-primary)]'
              }`}
            >
              {t.label}
            </button>
          ))}
          {perQuestion && stage === 'test' && (
            <span className="text-xs text-muted mr-auto">تم فحص {checkedCount} من {questions.length}</span>
          )}
        </div>
      )}

      {/* Learn stage */}
      {learn && stage === 'learn' && (
        <>
          <LearnSection learn={learn} />
          <button onClick={() => setStage('test')} className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2">
            <Target size={14} /> {g('ابدأ الاختبار', 'ابدئي الاختبار')} — {questions.length} سؤالًا
          </button>
        </>
      )}

      {/* Result banner */}
      {stage === 'test' && submitted && result && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`fl-card-static p-7 text-center ${result.score >= 80 ? 'border-emerald-500/30' : result.score >= 60 ? 'border-gold-500/30' : 'border-red-500/30'}`}
        >
          <div className={`text-4xl font-bold mb-2 ${result.score >= 80 ? 'text-emerald-400' : result.score >= 60 ? 'text-gold-400' : 'text-red-400'}`}>
            {result.score}%
          </div>
          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
            {result.correct} من {result.total} صحيحة
          </p>
          <div className="flex items-center justify-center gap-1 mt-2 text-violet-400">
            <Zap size={14} />
            <span className="text-sm font-bold">+{result.xp} XP</span>
          </div>
          {perQuestion && encouragement && (
            <p className="text-sm mt-3" style={{ color: 'var(--text-primary)' }}>{encouragement}</p>
          )}
          <button onClick={onBack} className="btn-primary mt-4 text-sm">
            العودة للتمارين
          </button>
        </motion.div>
      )}

      {/* Questions */}
      {stage === 'test' && (
      <div className="space-y-4">
        {questions.map((q, i) => {
          const userAnswer = answers[q.id]
          const acceptedList = q.accepted_answers || [q.correct_answer]
          const checkedState = perQuestion ? checked[q.id] : undefined
          const isCorrect = submitted ? validateAnswer(userAnswer, acceptedList) : checkedState === true
          const isWrong = submitted ? (userAnswer && !validateAnswer(userAnswer, acceptedList)) : checkedState === false
          const locked = submitted || (perQuestion && checkedState !== undefined)

          return (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 8) * 0.05 }}
              className={`fl-card-static p-4 ${isCorrect ? 'border-emerald-500/30' : isWrong ? 'border-red-500/30' : ''}`}
            >
              {/* Item divider (e.g. «1 · المضارع البسيط — Present Simple») */}
              {q.divider && (
                <div className="flex items-center gap-2 mb-3 -mt-1">
                  <span className="text-xs font-bold text-sky-400">{q.divider}</span>
                  <span className="flex-1 h-px bg-[var(--border-subtle)]" />
                </div>
              )}

              <div className="flex items-start gap-2 mb-3">
                <span className="text-xs bg-[var(--surface-raised)] text-[var(--text-primary)] w-6 h-6 rounded-full flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  {/* Read-only seed sentence (reference context) */}
                  {q.context && (
                    <div className="mb-2 p-2.5 rounded-lg bg-[var(--surface-raised)] border border-[var(--border-subtle)]">
                      <p className="text-[11px] text-muted mb-0.5">{q.context_form_ar || 'الجملة المُعطاة'}</p>
                      <p className="text-sm font-medium" dir="ltr" style={{ color: 'var(--text-primary)', textAlign: 'left' }}>{q.context}</p>
                    </div>
                  )}
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{q.question}</p>
                </div>
              </div>

              {type === 'multiple_choice' || q.options ? (
                <div className="grid gap-2 mr-8">
                  {(q.options || []).map((opt, oi) => {
                    const selected = userAnswer === opt
                    const correctOpt = submitted && validateAnswer(opt, acceptedList)
                    return (
                      <button
                        key={oi}
                        onClick={() => !submitted && setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                        disabled={submitted}
                        className={`text-right text-sm px-3 py-2 rounded-xl border transition-all ${
                          correctOpt
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : selected && isWrong
                              ? 'bg-red-500/10 border-red-500/30 text-red-400'
                              : selected
                                ? 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                                : 'border-border-subtle text-muted hover:border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {opt}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="mr-8">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={userAnswer || ''}
                      onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                      disabled={locked}
                      dir={type === 'rewrite' ? 'ltr' : undefined}
                      className={`input-field text-sm w-full ${isCorrect ? 'border-emerald-500/30' : isWrong ? 'border-red-500/30' : ''}`}
                      style={type === 'rewrite' ? { textAlign: 'left' } : undefined}
                      placeholder={type === 'rewrite' ? 'Write the sentence…' : g('اكتب إجابتك...', 'اكتبي إجابتكِ...')}
                    />
                    {/* Per-question instant check (manually-authored exercises) */}
                    {perQuestion && !locked && (
                      <button
                        onClick={() => checkOne(q)}
                        disabled={!userAnswer || userAnswer.trim() === ''}
                        className="text-xs px-3 py-2 rounded-xl border border-sky-500/30 bg-sky-500/10 text-sky-400 font-bold shrink-0 disabled:opacity-40 transition-all hover:translate-y-[-1px]"
                      >
                        {g('تحقق', 'تحققي')}
                      </button>
                    )}
                    {perQuestion && checkedState !== undefined && !submitted && (
                      checkedState
                        ? <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                        : <AlertCircle size={18} className="text-red-400 shrink-0" />
                    )}
                  </div>
                  {/* Instant feedback: student's answer stays; correct answer shown separately (green) */}
                  {perQuestion && checkedState === false && !submitted && (
                    <div className="mt-2 text-xs p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                      <p className="text-muted mb-0.5">الإجابة الصحيحة:</p>
                      <p className="text-emerald-400 font-medium" dir="ltr" style={{ textAlign: 'left' }}>{q.correct_answer}</p>
                    </div>
                  )}
                  {perQuestion && checkedState === true && !submitted && (
                    <p className="mt-1.5 text-xs text-emerald-400">إجابة صحيحة ✓</p>
                  )}
                </div>
              )}

              {/* Explanation after submit */}
              {submitted && q.explanation && (
                <div className={`mt-2 mr-8 text-xs p-2 rounded-lg ${isCorrect ? 'bg-emerald-500/5 text-emerald-400' : 'bg-red-500/5 text-red-400'}`}>
                  {isWrong && <p className="mb-1">الإجابة الصحيحة: <strong>{q.correct_answer}</strong></p>}
                  <p>{q.explanation}</p>
                </div>
              )}
              {/* Correct answer after final submit for wrong typed answers without explanation */}
              {submitted && !q.explanation && isWrong && !q.options && (
                <div className="mt-2 mr-8 text-xs p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                  <p className="text-muted mb-0.5">الإجابة الصحيحة:</p>
                  <p className="text-emerald-400 font-medium" dir="ltr" style={{ textAlign: 'left' }}>{q.correct_answer}</p>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
      )}

      {/* Submit button */}
      {stage === 'test' && !submitted && (
        <button
          onClick={onSubmit}
          disabled={!allAnswered || !allChecked || submitting}
          className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2"
        >
          {submitting ? (
            <><Loader2 size={14} className="animate-spin" /> جاري التقييم...</>
          ) : perQuestion && !allChecked ? (
            <><CheckCircle2 size={14} /> {g('تحقق من جميع الأسئلة أولًا', 'تحققي من جميع الأسئلة أولًا')} ({checkedCount}/{questions.length})</>
          ) : (
            <><CheckCircle2 size={14} /> تسليم الإجابات</>
          )}
        </button>
      )}
      </div>
    </div>
  )
}

// ─── Learn section (structured teaching content for manually-authored exercises) ───
function LearnSection({ learn }) {
  return (
    <div className="space-y-6">
      {/* Intro */}
      {learn.intro_ar && (
        <div className="fl-card-static p-5">
          <p className="text-sm leading-7" style={{ color: 'var(--text-primary)' }}>{learn.intro_ar}</p>
        </div>
      )}

      {/* The four forms */}
      {Array.isArray(learn.forms) && learn.forms.length > 0 && (
        <div className="fl-card-static p-5">
          <h3 className="text-section-title mb-3" style={{ color: 'var(--text-primary)' }}>الصيغ الأربع</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {learn.forms.map((f) => (
              <div key={f.en} className="p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--border-subtle)]">
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  <span dir="ltr">{f.en}</span> — {f.ar}
                </p>
                <p className="text-xs text-muted mt-1 leading-6">{f.desc_ar}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tenses */}
      {(learn.tenses || []).map((t, ti) => (
        <div key={t.title_en} className="fl-card-static p-5 space-y-4">
          <h3 className="text-section-title" style={{ color: 'var(--text-primary)' }}>
            {ti + 1}) <span dir="ltr">{t.title_en}</span> — {t.title_ar}
          </h3>

          {/* Uses */}
          {Array.isArray(t.uses_ar) && (
            <div>
              <p className="text-xs font-bold text-sky-400 mb-1.5">الاستخدام (Uses)</p>
              <ul className="space-y-1">
                {t.uses_ar.map((u, i) => (
                  <li key={i} className="text-sm text-muted leading-7 pr-3 border-r-2 border-[var(--border-subtle)]">{u}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Formation table */}
          {Array.isArray(t.formation) && (
            <div>
              <p className="text-xs font-bold text-sky-400 mb-1.5">التكوين (Formation)</p>
              <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
                <table className="w-full text-sm" dir="ltr">
                  <thead>
                    <tr className="text-xs text-muted">
                      <th className="text-left p-2.5 border-b border-[var(--border-subtle)]">Form</th>
                      <th className="text-left p-2.5 border-b border-[var(--border-subtle)]">Rule</th>
                      <th className="text-left p-2.5 border-b border-[var(--border-subtle)]">Example</th>
                    </tr>
                  </thead>
                  <tbody>
                    {t.formation.map((row) => (
                      <tr key={row.form}>
                        <td className="p-2.5 font-bold whitespace-nowrap align-top" style={{ color: 'var(--text-primary)' }}>{row.form}</td>
                        <td className="p-2.5 text-muted align-top">{row.rule}</td>
                        <td className="p-2.5 align-top" style={{ color: 'var(--text-primary)' }}>{row.example}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Key rules */}
          {Array.isArray(t.rules_ar) && (
            <div>
              <p className="text-xs font-bold text-sky-400 mb-1.5">قواعد مهمة</p>
              <ul className="space-y-1.5">
                {t.rules_ar.map((r, i) => (
                  <li key={i} className="text-sm text-muted leading-7">• {r}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Signal words */}
          {t.signal_words && (
            <p className="text-xs text-muted">
              <span className="font-bold text-gold-400">كلمات دالة: </span>
              <span dir="ltr">{t.signal_words}</span>
            </p>
          )}

          {/* Worked example */}
          {t.worked && (
            <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <p className="text-xs font-bold text-emerald-400 mb-2">مثال محلول (Worked Example)</p>
              <p className="text-sm font-bold mb-2" dir="ltr" style={{ color: 'var(--text-primary)', textAlign: 'left' }}>{t.worked.seed}</p>
              <div className="space-y-1.5">
                {(t.worked.steps || []).map((s) => (
                  <div key={s.label} className="text-sm leading-6">
                    <span className="text-xs font-bold text-emerald-400" dir="ltr">{s.label}</span>
                    <span className="mx-1.5 text-muted">←</span>
                    <span dir="ltr" style={{ color: 'var(--text-primary)' }}>{s.answer}</span>
                    {s.note_ar && <span className="text-xs text-muted mr-1.5">{s.note_ar}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
