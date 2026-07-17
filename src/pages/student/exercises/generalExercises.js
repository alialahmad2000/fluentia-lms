// Extra-practice bank shown only in the empty state (student has no assigned worksheets yet).
// Locally graded (validateAnswer), XP-only. Kept out of StudentExercises.jsx for readability.

export const SKILL_LABELS = {
  grammar: 'القواعد', vocabulary: 'المفردات', speaking: 'المحادثة',
  listening: 'الاستماع', reading: 'القراءة', writing: 'الكتابة',
}
export const DIFFICULTY_LABELS = { easy: 'سهل', medium: 'متوسط', hard: 'صعب' }

export const GENERAL_EXERCISES = [
  // ── Grammar (5) ──
  {
    id: 'general-grammar-1', title: 'Present Simple vs Present Continuous', title_ar: 'المضارع البسيط والمستمر',
    skill: 'grammar', difficulty: 'easy', xp_reward: 10,
    instructions: 'Choose the correct verb form to complete each sentence.',
    content: { type: 'multiple_choice', questions: [
      { id: 'q1', question: 'She ___ to school every day.', options: ['go', 'goes', 'going', 'is going'], correct_answer: 'goes', explanation: 'Use "goes" for third person singular (he/she/it) in Present Simple.' },
      { id: 'q2', question: 'Look! The children ___ in the park right now.', options: ['play', 'plays', 'are playing', 'is playing'], correct_answer: 'are playing', explanation: 'Use Present Continuous (are + -ing) for actions happening right now.' },
      { id: 'q3', question: 'I usually ___ coffee in the morning.', options: ['drink', 'drinks', 'am drinking', 'drinking'], correct_answer: 'drink', explanation: 'Use the base form "drink" with "I" in Present Simple for habits.' },
      { id: 'q4', question: 'Be quiet! The baby ___.', options: ['sleeps', 'sleep', 'is sleeping', 'are sleeping'], correct_answer: 'is sleeping', explanation: 'Use Present Continuous (is + -ing) for an action happening at this moment.' },
      { id: 'q5', question: 'Water ___ at 100 degrees Celsius.', options: ['boils', 'is boiling', 'boil', 'are boiling'], correct_answer: 'boils', explanation: 'Use Present Simple for scientific facts and general truths.' },
    ] },
  },
  {
    id: 'general-grammar-2', title: 'Articles: a / an / the', title_ar: 'أدوات التعريف والتنكير: a / an / the',
    skill: 'grammar', difficulty: 'easy', xp_reward: 10,
    instructions: 'Choose the correct article to complete the sentence.',
    content: { type: 'multiple_choice', questions: [
      { id: 'q1', question: 'I saw ___ elephant at the zoo yesterday.', options: ['a', 'an', 'the', '(no article)'], correct_answer: 'an', explanation: 'Use "an" before words that start with a vowel sound. "Elephant" starts with /e/.' },
      { id: 'q2', question: '___ sun rises in the east.', options: ['A', 'An', 'The', '(no article)'], correct_answer: 'The', explanation: 'Use "the" for unique things — there is only one sun.' },
      { id: 'q3', question: 'She is ___ honest person.', options: ['a', 'an', 'the', '(no article)'], correct_answer: 'an', explanation: 'Use "an" because "honest" starts with a silent "h" — the first sound is the vowel /ɒ/.' },
      { id: 'q4', question: 'Can you pass me ___ salt, please?', options: ['a', 'an', 'the', '(no article)'], correct_answer: 'the', explanation: 'Use "the" when both speaker and listener know which specific thing is meant.' },
      { id: 'q5', question: 'He wants to be ___ doctor when he grows up.', options: ['a', 'an', 'the', '(no article)'], correct_answer: 'a', explanation: 'Use "a" before consonant sounds when mentioning something for the first time or a profession in general.' },
    ] },
  },
  {
    id: 'general-grammar-3', title: 'Prepositions: in / on / at', title_ar: 'حروف الجر: in / on / at',
    skill: 'grammar', difficulty: 'easy', xp_reward: 10,
    instructions: 'Choose the correct preposition to complete each sentence.',
    content: { type: 'multiple_choice', questions: [
      { id: 'q1', question: 'The meeting is ___ Monday.', options: ['in', 'on', 'at', 'to'], correct_answer: 'on', explanation: 'Use "on" with days of the week (on Monday, on Friday).' },
      { id: 'q2', question: 'She was born ___ 1999.', options: ['in', 'on', 'at', 'to'], correct_answer: 'in', explanation: 'Use "in" with years, months, and long periods (in 1999, in July).' },
      { id: 'q3', question: 'The class starts ___ 9 o\'clock.', options: ['in', 'on', 'at', 'to'], correct_answer: 'at', explanation: 'Use "at" with specific times (at 9 o\'clock, at noon).' },
      { id: 'q4', question: 'We go on holiday ___ summer.', options: ['in', 'on', 'at', 'to'], correct_answer: 'in', explanation: 'Use "in" with seasons (in summer, in winter).' },
      { id: 'q5', question: 'I\'ll see you ___ the weekend.', options: ['in', 'on', 'at', 'to'], correct_answer: 'at', explanation: 'Use "at" with the weekend (British English). "On the weekend" is also accepted in American English.' },
    ] },
  },
  {
    id: 'general-grammar-4', title: 'Past Simple: Regular Verbs', title_ar: 'الماضي البسيط: الأفعال المنتظمة',
    skill: 'grammar', difficulty: 'easy', xp_reward: 10,
    instructions: 'Choose the correct past simple form of the verb.',
    content: { type: 'multiple_choice', questions: [
      { id: 'q1', question: 'Yesterday, I ___ (walk) to the park.', options: ['walk', 'walked', 'walking', 'walks'], correct_answer: 'walked', explanation: 'Add "-ed" to regular verbs to form the Past Simple: walk → walked.' },
      { id: 'q2', question: 'She ___ (study) English last night.', options: ['study', 'studyed', 'studied', 'studying'], correct_answer: 'studied', explanation: 'Consonant + y → change "y" to "i" and add "-ed": study → studied.' },
      { id: 'q3', question: 'They ___ (stop) the car suddenly.', options: ['stoped', 'stopped', 'stop', 'stopping'], correct_answer: 'stopped', explanation: 'Short verb ending consonant-vowel-consonant → double the last consonant: stop → stopped.' },
      { id: 'q4', question: 'We ___ (play) football last weekend.', options: ['plaied', 'plaid', 'played', 'playing'], correct_answer: 'played', explanation: 'Vowel + y → just add "-ed": play → played.' },
      { id: 'q5', question: 'He ___ (not/like) the movie.', options: ['didn\'t like', 'didn\'t liked', 'not liked', 'doesn\'t like'], correct_answer: 'didn\'t like', explanation: 'Negative Past Simple → "didn\'t" + base form: didn\'t like (NOT didn\'t liked).' },
    ] },
  },
  {
    id: 'general-grammar-5', title: 'Subject-Verb Agreement', title_ar: 'التوافق بين الفاعل والفعل',
    skill: 'grammar', difficulty: 'medium', xp_reward: 10,
    instructions: 'Choose the correct verb form that agrees with the subject.',
    content: { type: 'multiple_choice', questions: [
      { id: 'q1', question: 'Everyone in the class ___ ready for the test.', options: ['is', 'are', 'were', 'be'], correct_answer: 'is', explanation: '"Everyone" is singular, so it takes a singular verb: "is".' },
      { id: 'q2', question: 'The news ___ very surprising.', options: ['is', 'are', 'were', 'have been'], correct_answer: 'is', explanation: '"News" is uncountable — it looks plural but takes a singular verb.' },
      { id: 'q3', question: 'Neither the teacher nor the students ___ happy about the change.', options: ['is', 'are', 'was', 'has been'], correct_answer: 'are', explanation: 'With "neither…nor", the verb agrees with the nearest subject: "students" → "are".' },
      { id: 'q4', question: 'The team ___ playing very well this season.', options: ['is', 'are', 'have', 'were'], correct_answer: 'is', explanation: 'Collective nouns like "team" usually take a singular verb when acting as one unit.' },
      { id: 'q5', question: 'Mathematics ___ my favourite subject.', options: ['is', 'are', 'were', 'have been'], correct_answer: 'is', explanation: 'Fields of study ending in "-s" (mathematics, physics) are singular.' },
    ] },
  },
  // ── Vocabulary (5) ──
  {
    id: 'general-vocab-1', title: 'Common Daily Vocabulary', title_ar: 'مفردات يومية شائعة',
    skill: 'vocabulary', difficulty: 'easy', xp_reward: 10,
    instructions: 'Choose the correct word to complete each sentence.',
    content: { type: 'multiple_choice', questions: [
      { id: 'q1', question: 'I need to ___ my teeth before I go to bed.', options: ['wash', 'brush', 'clean', 'sweep'], correct_answer: 'brush', explanation: 'The correct collocation is "brush your teeth".' },
      { id: 'q2', question: 'Please ___ the door when you leave.', options: ['shut', 'close', 'lock', 'All of these are correct'], correct_answer: 'All of these are correct', explanation: 'You can "shut", "close", or "lock" a door — all natural.' },
      { id: 'q3', question: 'She ___ the bus to work every morning.', options: ['rides', 'drives', 'takes', 'goes'], correct_answer: 'takes', explanation: 'We say "take the bus" for public transport.' },
      { id: 'q4', question: 'Can I ___ a photo of you?', options: ['make', 'do', 'take', 'get'], correct_answer: 'take', explanation: 'The correct collocation is "take a photo".' },
      { id: 'q5', question: 'He ___ a shower and then had breakfast.', options: ['made', 'took', 'did', 'got'], correct_answer: 'took', explanation: 'We say "take a shower" (or "have a shower").' },
    ] },
  },
  {
    id: 'general-vocab-2', title: 'Opposites (Antonyms)', title_ar: 'المتضادات',
    skill: 'vocabulary', difficulty: 'easy', xp_reward: 10,
    instructions: 'Choose the word that is the opposite (antonym) of the given word.',
    content: { type: 'multiple_choice', questions: [
      { id: 'q1', question: 'What is the opposite of "brave"?', options: ['strong', 'cowardly', 'kind', 'angry'], correct_answer: 'cowardly', explanation: '"Brave" ↔ "cowardly".' },
      { id: 'q2', question: 'What is the opposite of "ancient"?', options: ['old', 'modern', 'broken', 'large'], correct_answer: 'modern', explanation: '"Ancient" ↔ "modern".' },
      { id: 'q3', question: 'What is the opposite of "generous"?', options: ['kind', 'wealthy', 'selfish', 'gentle'], correct_answer: 'selfish', explanation: '"Generous" ↔ "selfish".' },
      { id: 'q4', question: 'What is the opposite of "shallow"?', options: ['wide', 'narrow', 'deep', 'tall'], correct_answer: 'deep', explanation: '"Shallow" ↔ "deep".' },
      { id: 'q5', question: 'What is the opposite of "temporary"?', options: ['permanent', 'short', 'quick', 'sudden'], correct_answer: 'permanent', explanation: '"Temporary" ↔ "permanent".' },
    ] },
  },
  {
    id: 'general-vocab-3', title: 'Family & Relationships', title_ar: 'العائلة والعلاقات',
    skill: 'vocabulary', difficulty: 'easy', xp_reward: 10,
    instructions: 'Choose the correct family or relationship word.',
    content: { type: 'multiple_choice', questions: [
      { id: 'q1', question: 'My mother\'s sister is my ___.', options: ['cousin', 'aunt', 'niece', 'grandmother'], correct_answer: 'aunt', explanation: 'Your parent\'s sister is your aunt.' },
      { id: 'q2', question: 'My brother\'s daughter is my ___.', options: ['cousin', 'niece', 'nephew', 'sister'], correct_answer: 'niece', explanation: 'Your sibling\'s daughter is your niece.' },
      { id: 'q3', question: 'My father\'s father is my ___.', options: ['uncle', 'grandfather', 'father-in-law', 'stepfather'], correct_answer: 'grandfather', explanation: 'Your parent\'s father is your grandfather.' },
      { id: 'q4', question: 'My uncle\'s children are my ___.', options: ['nephews', 'siblings', 'cousins', 'nieces'], correct_answer: 'cousins', explanation: 'The children of your uncle/aunt are your cousins.' },
      { id: 'q5', question: 'My wife\'s mother is my ___.', options: ['grandmother', 'stepmother', 'mother-in-law', 'aunt'], correct_answer: 'mother-in-law', explanation: 'Your spouse\'s mother is your mother-in-law.' },
    ] },
  },
  {
    id: 'general-vocab-4', title: 'Food & Restaurant Vocabulary', title_ar: 'مفردات الطعام والمطاعم',
    skill: 'vocabulary', difficulty: 'easy', xp_reward: 10,
    instructions: 'Choose the correct word about food or restaurants.',
    content: { type: 'multiple_choice', questions: [
      { id: 'q1', question: 'Can I see the ___, please? I\'d like to order.', options: ['recipe', 'menu', 'bill', 'plate'], correct_answer: 'menu', explanation: 'A "menu" lists the food available.' },
      { id: 'q2', question: 'The steak was ___. It was cooked perfectly!', options: ['delicious', 'disgusting', 'raw', 'spicy'], correct_answer: 'delicious', explanation: '"Delicious" = tastes extremely good.' },
      { id: 'q3', question: 'I\'m allergic to nuts, so I always check the ___.', options: ['ingredients', 'portions', 'courses', 'dishes'], correct_answer: 'ingredients', explanation: '"Ingredients" are the items that make up a dish.' },
      { id: 'q4', question: 'Could we have the ___, please? We\'re ready to pay.', options: ['menu', 'tip', 'bill', 'order'], correct_answer: 'bill', explanation: 'The "bill" (or "check") is what you pay.' },
      { id: 'q5', question: 'For ___, I\'ll have the chocolate cake.', options: ['starter', 'main course', 'dessert', 'appetizer'], correct_answer: 'dessert', explanation: '"Dessert" is the sweet course at the end.' },
    ] },
  },
  {
    id: 'general-vocab-5', title: 'Feelings & Emotions', title_ar: 'المشاعر والعواطف',
    skill: 'vocabulary', difficulty: 'easy', xp_reward: 10,
    instructions: 'Choose the word that best describes the feeling.',
    content: { type: 'multiple_choice', questions: [
      { id: 'q1', question: 'She got the highest grade in the exam. She feels very ___.', options: ['proud', 'jealous', 'embarrassed', 'anxious'], correct_answer: 'proud', explanation: '"Proud" = pleased about an achievement.' },
      { id: 'q2', question: 'He has a job interview tomorrow. He feels ___.', options: ['bored', 'nervous', 'relieved', 'disappointed'], correct_answer: 'nervous', explanation: '"Nervous" = worried about something upcoming.' },
      { id: 'q3', question: 'The movie was three hours long with no action. I felt ___.', options: ['excited', 'terrified', 'bored', 'confused'], correct_answer: 'bored', explanation: '"Bored" = uninterested because something is dull.' },
      { id: 'q4', question: 'She finally finished her exams. She feels ___.', options: ['anxious', 'exhausted', 'relieved', 'furious'], correct_answer: 'relieved', explanation: '"Relieved" = happy that something stressful is over.' },
      { id: 'q5', question: 'He said something rude to his friend and now feels ___.', options: ['proud', 'guilty', 'delighted', 'curious'], correct_answer: 'guilty', explanation: '"Guilty" = feeling bad about doing something wrong.' },
    ] },
  },
]
