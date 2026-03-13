import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Target, CheckCircle2, Clock, Zap, ArrowLeft, AlertCircle,
  Loader2, BookOpen, RefreshCw, Trophy,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'

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
  grammar: 'القرامر',
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
  const { profile, studentData } = useAuthStore()
  const queryClient = useQueryClient()
  const [activeExercise, setActiveExercise] = useState(null)
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState(null)
  const [isGeneralExercise, setIsGeneralExercise] = useState(false)
  const [completedGeneral, setCompletedGeneral] = useState(() => getCompletedGeneralExercises())

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

  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      // First analyze patterns
      await supabase.functions.invoke('analyze-error-patterns', {
        body: { student_id: profile?.id, analyze_all: true },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      // Then generate exercises
      const res = await supabase.functions.invoke('generate-targeted-exercises', {
        body: { student_id: profile?.id },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-exercises'] })
    },
    onError: (err) => {
      console.error('[StudentExercises] generate error:', err)
    },
  })

  const submitMutation = useMutation({
    mutationFn: async ({ exerciseId, answers: studentAnswers }) => {
      const exercise = exercises.find(e => e.id === exerciseId)
      if (!exercise) throw new Error('Exercise not found')

      const questions = exercise.content?.questions || []
      if (questions.length === 0) throw new Error('No questions in exercise')
      let correct = 0
      for (const q of questions) {
        if (studentAnswers[q.id] === q.correct_answer) correct++
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

      // Update student XP
      const { error: rpcErr } = await supabase.rpc('increment_xp', { student_id: profile?.id, amount: xp })
      if (rpcErr) {
        // Fallback if RPC doesn't exist
        const { error: fallbackErr } = await supabase
          .from('students')
          .update({ xp_total: (studentData?.xp_total || 0) + xp })
          .eq('id', profile?.id)
        if (fallbackErr) console.error('[StudentExercises] XP fallback error:', fallbackErr)
      }

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
        if (studentAnswers[q.id] === q.correct_answer) correct++
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

      const { error: rpcErr } = await supabase.rpc('increment_xp', { student_id: profile?.id, amount: xp })
      if (rpcErr) {
        const { error: fallbackErr } = await supabase
          .from('students')
          .update({ xp_total: (studentData?.xp_total || 0) + xp })
          .eq('id', profile?.id)
        if (fallbackErr) console.error('[StudentExercises] General XP fallback error:', fallbackErr)
      }

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Target size={24} className="text-violet-400" />
            تمارين مخصصة
          </h1>
          <p className="text-muted text-sm mt-1">تمارين ذكية مصممة لتحسين نقاط ضعفك</p>
        </div>
        <button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          {generateMutation.isPending ? (
            <><Loader2 size={14} className="animate-spin" /> جاري التحليل...</>
          ) : (
            <><RefreshCw size={14} /> تحليل وإنشاء تمارين</>
          )}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'متاحة', value: pendingExercises.length, icon: Clock, color: 'sky' },
          { label: 'مكتملة', value: stats?.completed || 0, icon: CheckCircle2, color: 'emerald' },
          { label: 'متوسط الدرجة', value: `${Math.round(stats?.avgScore || 0)}%`, icon: Trophy, color: 'gold' },
          { label: 'XP مكتسبة', value: stats?.totalXp || 0, icon: Zap, color: 'violet' },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass-card p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-muted text-xs">{card.label}</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${SKILL_COLOR_CLASSES[card.color]?.iconBox || 'bg-sky-500/10 text-sky-400'}`}>
                <card.icon size={16} />
              </div>
            </div>
            <p className="text-xl font-bold text-white">{card.value}</p>
          </motion.div>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-sky-400" />
        </div>
      ) : hasNoTargetedExercises ? (
        <>
          {/* Friendly message about no targeted exercises */}
          <div className="glass-card p-8 text-center">
            <Target size={48} className="mx-auto text-muted mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">لم يتم تحليل أخطائك بعد</h3>
            <p className="text-muted text-sm mb-4">
              سيتم إنشاء تمارين مخصصة لك بعد تقييم واجباتك الأولى
            </p>
            <p className="text-muted text-xs">
              في الوقت الحالي، يمكنك التدرب على التمارين العامة أدناه لتحسين مهاراتك
            </p>
          </div>

          {/* General Exercises Section */}
          <div>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <BookOpen size={18} className="text-emerald-400" />
              تمارين عامة
            </h2>
            <div className="grid gap-3">
              {GENERAL_EXERCISES.map((exercise, i) => {
                const color = SKILL_COLORS[exercise.skill] || 'sky'
                const isCompleted = !!completedGeneral[exercise.id]
                const completedData = completedGeneral[exercise.id]
                return (
                  <motion.div
                    key={exercise.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`glass-card p-4 transition-all cursor-pointer ${isCompleted ? 'opacity-70 hover:opacity-90' : 'hover:border-sky-500/30'}`}
                    onClick={() => openGeneralExercise(exercise)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${SKILL_COLOR_CLASSES[color]?.badge || 'bg-sky-500/10 text-sky-400 border-sky-500/20'}`}>
                            {SKILL_LABELS[exercise.skill]}
                          </span>
                          <span className="text-[10px] text-muted">
                            {DIFFICULTY_LABELS[exercise.difficulty]}
                          </span>
                          <span className="text-[10px] text-violet-400 flex items-center gap-0.5">
                            <Zap size={10} /> {exercise.xp_reward} XP
                          </span>
                          {isCompleted && (
                            <span className="text-[10px] text-emerald-400 flex items-center gap-0.5">
                              <CheckCircle2 size={10} /> {completedData.score}%
                            </span>
                          )}
                        </div>
                        <h3 className="font-medium text-white text-sm">{exercise.title_ar}</h3>
                        <p className="text-xs text-muted mt-0.5">{exercise.title}</p>
                      </div>
                      {isCompleted ? (
                        <CheckCircle2 size={16} className="text-emerald-400" />
                      ) : (
                        <ArrowLeft size={16} className="text-muted" />
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Pending exercises */}
          {pendingExercises.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <Clock size={18} className="text-sky-400" />
                تمارين متاحة ({pendingExercises.length})
              </h2>
              <div className="grid gap-3">
                {pendingExercises.map((exercise, i) => {
                  const color = SKILL_COLORS[exercise.skill] || 'sky'
                  return (
                    <motion.div
                      key={exercise.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="glass-card p-4 hover:border-sky-500/30 transition-all cursor-pointer"
                      onClick={() => { setActiveExercise(exercise); setAnswers({}); setSubmitted(false); setResult(null) }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${SKILL_COLOR_CLASSES[color]?.badge || 'bg-sky-500/10 text-sky-400 border-sky-500/20'}`}>
                              {SKILL_LABELS[exercise.skill]}
                            </span>
                            <span className="text-[10px] text-muted">
                              {DIFFICULTY_LABELS[exercise.difficulty]}
                            </span>
                          </div>
                          <h3 className="font-medium text-white text-sm">{exercise.title}</h3>
                          {exercise.error_patterns && (
                            <p className="text-xs text-muted mt-1">{exercise.error_patterns.description}</p>
                          )}
                        </div>
                        <ArrowLeft size={16} className="text-muted" />
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Completed exercises */}
          {completedExercises.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-400" />
                مكتملة ({completedExercises.length})
              </h2>
              <div className="grid gap-2">
                {completedExercises.slice(0, 10).map((exercise) => (
                  <div key={exercise.id} className="glass-card p-3 opacity-70">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-emerald-400" />
                        <span className="text-sm text-white">{exercise.title}</span>
                        <span className="text-[10px] text-muted">{SKILL_LABELS[exercise.skill]}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-bold ${exercise.score >= 80 ? 'text-emerald-400' : exercise.score >= 60 ? 'text-gold-400' : 'text-red-400'}`}>
                          {exercise.score}%
                        </span>
                        <span className="text-[10px] text-violet-400">+{exercise.xp_awarded} XP</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Exercise View ──────────────────────────────────────

function ExerciseView({ exercise, answers, setAnswers, submitted, result, onSubmit, onBack, submitting }) {
  const questions = exercise.content?.questions || []
  const type = exercise.content?.type || 'multiple_choice'
  const allAnswered = questions.every(q => answers[q.id] !== undefined && answers[q.id] !== '')

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-muted hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">{exercise.title_ar || exercise.title}</h1>
          <p className="text-muted text-sm">{exercise.instructions}</p>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full ${SKILL_COLOR_CLASSES[SKILL_COLORS[exercise.skill]]?.iconBox || 'bg-sky-500/10 text-sky-400'}`}>
          {SKILL_LABELS[exercise.skill]}
        </span>
      </div>

      {/* Result banner */}
      {submitted && result && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`glass-card p-6 text-center ${result.score >= 80 ? 'border-emerald-500/30' : result.score >= 60 ? 'border-gold-500/30' : 'border-red-500/30'}`}
        >
          <div className={`text-4xl font-bold mb-2 ${result.score >= 80 ? 'text-emerald-400' : result.score >= 60 ? 'text-gold-400' : 'text-red-400'}`}>
            {result.score}%
          </div>
          <p className="text-white font-medium">
            {result.correct} من {result.total} صحيحة
          </p>
          <div className="flex items-center justify-center gap-1 mt-2 text-violet-400">
            <Zap size={14} />
            <span className="text-sm font-bold">+{result.xp} XP</span>
          </div>
          <button onClick={onBack} className="btn-primary mt-4 text-sm">
            العودة للتمارين
          </button>
        </motion.div>
      )}

      {/* Questions */}
      <div className="space-y-4">
        {questions.map((q, i) => {
          const userAnswer = answers[q.id]
          const isCorrect = submitted && userAnswer === q.correct_answer
          const isWrong = submitted && userAnswer && userAnswer !== q.correct_answer

          return (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`glass-card p-4 ${isCorrect ? 'border-emerald-500/30' : isWrong ? 'border-red-500/30' : ''}`}
            >
              <div className="flex items-start gap-2 mb-3">
                <span className="text-xs bg-white/10 text-white w-6 h-6 rounded-full flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <p className="text-sm text-white font-medium">{q.question}</p>
              </div>

              {type === 'multiple_choice' || q.options ? (
                <div className="grid gap-2 mr-8">
                  {(q.options || []).map((opt, oi) => {
                    const selected = userAnswer === opt
                    const correctOpt = submitted && opt === q.correct_answer
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
                                : 'bg-white/5 border-border-subtle text-muted hover:border-white/20 hover:text-white'
                        }`}
                      >
                        {opt}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="mr-8">
                  <input
                    type="text"
                    value={userAnswer || ''}
                    onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                    disabled={submitted}
                    className={`input-field text-sm w-full ${isCorrect ? 'border-emerald-500/30' : isWrong ? 'border-red-500/30' : ''}`}
                    placeholder="اكتب إجابتك..."
                  />
                </div>
              )}

              {/* Explanation after submit */}
              {submitted && q.explanation && (
                <div className={`mt-2 mr-8 text-xs p-2 rounded-lg ${isCorrect ? 'bg-emerald-500/5 text-emerald-400' : 'bg-red-500/5 text-red-400'}`}>
                  {isWrong && <p className="mb-1">الإجابة الصحيحة: <strong>{q.correct_answer}</strong></p>}
                  <p>{q.explanation}</p>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Submit button */}
      {!submitted && (
        <button
          onClick={onSubmit}
          disabled={!allAnswered || submitting}
          className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2"
        >
          {submitting ? (
            <><Loader2 size={14} className="animate-spin" /> جاري التقييم...</>
          ) : (
            <><CheckCircle2 size={14} /> تسليم الإجابات</>
          )}
        </button>
      )}
    </div>
  )
}
