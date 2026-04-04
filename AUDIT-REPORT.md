# ملخص المشروع — 2026-04-04

## الأرقام:
- عدد ملفات المصدر الكلي: **233** (207 `.jsx` + 26 `.js`)
- عدد الصفحات الكلي: **144** ملف
  - طالب: **62** | معلم: **22** | أدمن: **53** | عام: **7**
- عدد المسارات (Routes): **108**
  - طالب: 46 | معلم: 25 | أدمن: 27 | عام: 10
- عدد جداول قاعدة البيانات: **98** (مستخدم: **85** | غير مستخدم: **13**)
- عدد Edge Functions: **38** (مستخدم من الواجهة: **27** | سيرفر/cron فقط: **11**)
- عدد المكونات المشتركة: **60** (مستخدم: **49** | غير مستخدم: **11**)

## ✅ يشتغل:
- المنهج الكامل (تصفح، وحدات، أقسام بـ5 تبويبات: قراءة، قواعد، استماع، مفردات، كتابة)
- لوحات التحكم (طالب، معلم، أدمن)
- الواجبات (إنشاء، تسليم، تصحيح)
- المهام الأسبوعية (إنشاء، حل، تصحيح AI)
- الألعاب (مطابقة، ترتيب، ملء فراغات)
- الإملاء والأفعال الشاذة
- الاختبارات التكيفية (Adaptive Test)
- تقارير التقدم بالذكاء الاصطناعي
- ماتركس التقدم
- ملف الطالب التفصيلي (6 تبويبات)
- المحادثة الجماعية (Group Chat)
- الرسائل المباشرة
- المساعد الذكي (AI Assistant)
- الحضور والجدول
- الفرق والتحديات
- لوحة المتصدرين
- الفواتير والمدفوعات
- الشهادات والإحالات
- بنك المحتوى وإدارة المنهج (admin)
- التسجيلات الصوتية
- معمل الكتابة (Writing Lab)
- لوحة الوالدين (Parent Dashboard)

## 🔴 مكسور:
- **StudentQuiz.jsx** — crash محتمل عند عرض النتائج (`quiz.id` بدون optional chaining)
- **StudentGroupChat.jsx** — فقاعات المحادثة بيضاء على أبيض في Light Mode (لون النص غير محدد لرسائل المستخدم)

## 🟡 موجود بس فاضي (ComingSoon):
- `/student/speaking` — معمل التحدث
- `/student/speaking-lab` — معمل التحدث
- `/student/assessments` — الاختبارات
- `/student/writing-lab` — معمل الكتابة (الملف موجود لكن المسار يعرض ComingSoon)

## ⚪ كود ميت (ما أحد يستخدمه):
- `AIContentRecommendations.jsx` — 0 imports
- `AIGrammarChecker.jsx` — 0 imports
- `AISpeakingAnalysis.jsx` — 0 imports
- `AIWritingFeedback.jsx` — 0 imports
- `StreakFire.jsx` — 0 imports
- `XPCounter.jsx` — 0 imports
- `EmptyStateIllustration.jsx` — 0 imports
- `ShareCard.jsx` — 0 imports
- `SplashScreen.jsx` — 0 imports
- `ErrorState.jsx` — 0 imports
- `ShimmerProgress.jsx` — 0 imports

---

# STEP 1: مسح الملفات والمجلدات

## هيكل المشروع

| المجلد | عدد الملفات |
|--------|----------:|
| `src/` (root: App.jsx, main.jsx, index.css) | 3 |
| `src/components/` | 13 |
| `src/components/ai/` | 9 |
| `src/components/assignments/` | 5 |
| `src/components/backgrounds/` | 2 |
| `src/components/common/` | 2 |
| `src/components/dashboard/` | 1 |
| `src/components/games/` | 6 |
| `src/components/gamification/` | 8 |
| `src/components/illustrations/` | 3 |
| `src/components/layout/` | 5 |
| `src/components/onboarding/` | 2 |
| `src/components/ui/` | 5 |
| `src/hooks/` | 6 |
| `src/lib/` | 3 |
| `src/pages/admin/` | 23 |
| `src/pages/admin/curriculum/` | 5 |
| `src/pages/admin/curriculum/components/` | 25 |
| `src/pages/public/` | 7 |
| `src/pages/student/` | 41 |
| `src/pages/student/curriculum/` | 4 |
| `src/pages/student/curriculum/components/` | 2 |
| `src/pages/student/curriculum/tabs/` | 7 |
| `src/pages/student/verbs/` | 1 |
| `src/pages/student/verbs/components/` | 3 |
| `src/pages/student/vocabulary/` | 1 |
| `src/pages/student/vocabulary/components/` | 3 |
| `src/pages/trainer/` | 22 |
| `src/services/` | 1 |
| `src/stores/` | 3 |
| `src/styles/` | 4 |
| `src/utils/` | 13 |

---

# STEP 2: كل الصفحات والمسارات

## Public Routes (10)

| Route Path | Component | Status |
|-----------|-----------|--------|
| `/` | RoleRedirect (inline) | ✅ |
| `/login` | LoginPage | ✅ |
| `/forgot-password` | ForgotPassword | ✅ |
| `/reset-password` | ResetPassword | ✅ |
| `/parent` | ParentDashboard | ✅ |
| `/test` | PlacementTest | ✅ |
| `/testimonials` | Testimonials | ✅ |
| `/verify/:certId` | CertificateVerification | ✅ |
| `*` | Navigate to / | ✅ |

## Student Routes (46)

| Route Path | Component | Status |
|-----------|-----------|--------|
| `/student` | StudentDashboard | ✅ |
| `/student/assignments` | StudentAssignments | ✅ |
| `/student/schedule` | StudentSchedule | ✅ |
| `/student/study-plan` | StudentStudyPlan | ✅ |
| `/student/grades` | StudentGrades (PackageRoute: talaqa) | ✅ |
| `/student/speaking` | ComingSoon | 🟡 Placeholder |
| `/student/speaking-lab` | ComingSoon | 🟡 Placeholder |
| `/student/library` | StudentLibrary | ✅ |
| `/student/leaderboard` | StudentLeaderboard | ✅ |
| `/student/recognition` | StudentPeerRecognition | ✅ |
| `/student/activity` | StudentActivityFeed | ✅ |
| `/student/challenges` | StudentChallenges | ✅ |
| `/student/chat` | StudentGroupChat | ✅ |
| `/student/messages` | StudentMessages | ✅ |
| `/student/ai-chat` | StudentChatbot (PackageRoute: talaqa) | ✅ |
| `/student/vocabulary` | StudentVocabulary | ✅ |
| `/student/flashcards` | VocabularyFlashcards | ✅ |
| `/student/billing` | StudentBilling | ✅ |
| `/student/exercises` | StudentExercises | ✅ |
| `/student/my-patterns` | StudentErrorPatterns | ✅ |
| `/student/voice-journal` | StudentVoiceJournal | ✅ |
| `/student/pronunciation` | StudentPronunciation | ✅ |
| `/student/conversation` | StudentConversation | ✅ |
| `/student/battles` | StudentStreakBattles | ✅ |
| `/student/success` | StudentSuccessStories | ✅ |
| `/student/events` | StudentEvents | ✅ |
| `/student/avatar` | StudentAvatar | ✅ |
| `/student/assessments` | ComingSoon | 🟡 Placeholder |
| `/student/quiz` | StudentQuiz | 🔴 Crash risk |
| `/student/profile` | StudentProfile | ✅ |
| `/student/certificates` | StudentCertificate | ✅ |
| `/student/referral` | StudentReferral | ✅ |
| `/student/weekly-tasks` | StudentWeeklyTasks | ✅ |
| `/student/weekly-tasks/:id` | StudentWeeklyTaskDetail | ✅ |
| `/student/spelling` | StudentSpelling | ✅ |
| `/student/verbs` | IrregularVerbsPractice | ✅ |
| `/student/recordings` | StudentRecordings | ✅ |
| `/student/writing-lab` | ComingSoon | 🟡 Placeholder |
| `/student/group-activity` | StudentGroupActivity (PackageRoute: talaqa) | ✅ |
| `/student/adaptive-test` | StudentAdaptiveTest (PackageRoute: talaqa) | ✅ |
| `/student/ai-insights` | StudentAIInsights (PackageRoute: talaqa) | ✅ |
| `/student/curriculum` | CurriculumBrowser | ✅ |
| `/student/curriculum/level/:levelNumber` | LevelUnits | ✅ |
| `/student/curriculum/unit/:unitId` | UnitContent | ✅ |
| `/student/curriculum-old` | StudentCurriculum | ⚪ Legacy |
| `/student/style-preview` | StylePreview | ⚪ Dev tool |

## Trainer Routes (25) — accessible by trainer + admin

| Route Path | Component | Status |
|-----------|-----------|--------|
| `/trainer/onboarding` | TrainerOnboarding | ✅ |
| `/trainer` | TrainerDashboard | ✅ |
| `/trainer/assignments` | TrainerAssignments | ✅ |
| `/trainer/writing` | TrainerGrading | ✅ |
| `/trainer/schedule` | TrainerSchedule | ✅ |
| `/trainer/notes` | TrainerNotes | ✅ |
| `/trainer/library` | TrainerLibrary | ✅ |
| `/trainer/points` | TrainerQuickPoints | ✅ |
| `/trainer/attendance` | TrainerAttendance | ✅ |
| `/trainer/student-notes` | TrainerQuickNotes | ✅ |
| `/trainer/students` | TrainerStudentView | ✅ |
| `/trainer/challenges` | TrainerChallenges | ✅ |
| `/trainer/teams` | TrainerTeams | ✅ |
| `/trainer/chat` | TrainerGroupChat | ✅ |
| `/trainer/messages` | StudentMessages (reused) | ✅ |
| `/trainer/ai-assistant` | TrainerAIAssistant | ✅ |
| `/trainer/reports` | TrainerProgressReports | ✅ |
| `/trainer/lesson-planner` | TrainerLessonPlanner | ✅ |
| `/trainer/quiz` | TrainerQuizGenerator | ✅ |
| `/trainer/weekly-grading` | TrainerWeeklyGrading | ✅ |
| `/trainer/recordings` | AdminRecordings (reused) | ✅ |
| `/trainer/conversation` | TrainerGroupChat (duplicate of /chat) | ✅ |
| `/trainer/curriculum` | TrainerCurriculum | ✅ |
| `/trainer/progress-matrix` | TrainerProgressMatrix | ✅ |
| `/trainer/student/:studentId/progress` | StudentProgressDetail | ✅ |

## Admin Routes (27)

| Route Path | Component | Status |
|-----------|-----------|--------|
| `/admin` | AdminDashboard | ✅ |
| `/admin/users` | AdminStudents | ✅ |
| `/admin/groups` | AdminGroups | ✅ |
| `/admin/trainers` | AdminTrainers | ✅ |
| `/admin/packages` | AdminPayments | ✅ |
| `/admin/reports` | AdminReports | ✅ |
| `/admin/churn` | AdminChurnPrediction | ✅ |
| `/admin/scheduling` | AdminSmartScheduling | ✅ |
| `/admin/content` | AdminContent | ✅ |
| `/admin/settings` | AdminSettings | ✅ |
| `/admin/weekly-tasks` | AdminWeeklyTasks | ✅ |
| `/admin/holidays` | AdminHolidays | ✅ |
| `/admin/audit-log` | AdminAuditLog | ✅ |
| `/admin/testimonials` | AdminTestimonials | ✅ |
| `/admin/today` | AdminActionCenter | ✅ |
| `/admin/export` | AdminDataExport | ✅ |
| `/admin/recordings` | AdminRecordings | ✅ |
| `/admin/curriculum` | CurriculumOverview | ✅ |
| `/admin/curriculum/level/:levelId` | LevelDetail | ✅ |
| `/admin/curriculum/unit/:unitId` | UnitEditor | ✅ |
| `/admin/curriculum/ielts` | IELTSManagement | ✅ |
| `/admin/curriculum/progress` | CurriculumProgress | ✅ |
| `/admin/test-bank` | AdminTestBank | ✅ |
| `/admin/ai-dashboard` | AdminAIDashboard | ✅ |
| `/admin/content-bank` | AdminContentBank | ✅ |
| `/admin/daily-reports` | AdminDailyReports | ✅ |
| `/admin/analytics` | AdminAnalytics | ✅ |
| `/admin/student/:studentId/progress` | StudentProgressDetail | ✅ |

---

# STEP 3: السايدبار

## 3A: Student Sidebar

| القسم | الرابط | Route | أيقونة | ملاحظات |
|-------|--------|-------|--------|---------|
| أساسي | الرئيسية | `/student` | House | |
| أساسي | المنهج | `/student/curriculum` | BookOpen | |
| أساسي | الواجبات | `/student/assignments` | FileText | |
| أساسي | المهام الأسبوعية | `/student/weekly-tasks` | CalendarDays | |
| أساسي | الجدول | `/student/schedule` | Calendar | |
| أساسي | خطة الدراسة | `/student/study-plan` | Map | |
| أساسي | التسجيلات | `/student/recordings` | Video | |
| أساسي | المفردات | `/student/flashcards` | Languages | |
| أساسي | الأفعال الشاذة | `/student/verbs` | Shuffle | |
| معامل | معمل التحدث | `/student/speaking-lab` | Mic | comingSoon, tamayuz |
| معامل | معمل الكتابة | `/student/writing-lab` | PenLine | comingSoon, tamayuz |
| التقييم | اختبار المستوى | `/student/adaptive-test` | Brain | talaqa |
| التقييم | التقييمات | `/student/assessments` | ClipboardCheck | comingSoon, talaqa |
| التقييم | الدرجات والنتائج | `/student/grades` | BarChart3 | talaqa |
| تواصل | المحادثة | `/student/conversation` | MessageSquare | |
| تواصل | المساعد الذكي | `/student/ai-chat` | Bot | talaqa |
| تواصل | رؤى ذكية | `/student/ai-insights` | Sparkles | talaqa |
| تواصل | نشاط المجموعة | `/student/group-activity` | UsersRound | talaqa |

## 3B: Trainer Sidebar

| القسم | الرابط | Route | أيقونة |
|-------|--------|-------|--------|
| أساسي | لوحة التحكم | `/trainer` | House |
| أساسي | التدريس | `/trainer/assignments` | FileText |
| أساسي | الجدول | `/trainer/schedule` | CalendarDays |
| أساسي | التسجيلات | `/trainer/recordings` | Video |
| إدارة | الطلاب | `/trainer/students` | GraduationCap |
| إدارة | المنهج | `/trainer/curriculum` | BookOpen |
| إدارة | تقدم الطلاب | `/trainer/progress-matrix` | BarChart3 |
| إدارة | الاختبارات | `/trainer/quiz` | ClipboardCheck |
| إدارة | المهام الأسبوعية | `/trainer/weekly-grading` | ListChecks |
| تواصل | المحادثة | `/trainer/conversation` | MessageSquare |
| تواصل | المساعد الذكي | `/trainer/ai-assistant` | Bot |

## 3C: Admin Sidebar

| القسم | الرابط | Route | أيقونة | ملاحظات |
|-------|--------|-------|--------|---------|
| أساسي | لوحة التحكم | `/admin` | LayoutDashboard | |
| أساسي | التدريس | `/trainer/assignments` | FileText | مسار مشترك |
| أساسي | الجدول | `/trainer/schedule` | CalendarDays | مسار مشترك |
| أساسي | التسجيلات | `/trainer/recordings` | Video | مسار مشترك |
| إدارة | الطلاب | `/admin/users` | Users | |
| إدارة | المالية | `/admin/packages` | CreditCard | |
| إدارة | المحتوى | `/admin/content` | FolderOpen | |
| إدارة | الاختبارات | `/trainer/quiz` | ClipboardCheck | مسار مشترك |
| إدارة | المهام الأسبوعية | `/admin/weekly-tasks` | ListChecks | |
| إدارة | المنهج الدراسي | `/admin/curriculum` | GraduationCap | |
| إدارة | ماتركس التقدم | `/trainer/progress-matrix` | BarChart3 | مسار مشترك |
| إدارة | بنك الأسئلة | `/admin/test-bank` | Database | |
| إدارة | بنك المحتوى | `/admin/content-bank` | BookOpen | |
| إدارة | لوحة الذكاء | `/admin/ai-dashboard` | Brain | |
| أدوات | التقارير | `/admin/reports` | BarChart3 | |
| أدوات | تحليلات المنصة | `/admin/analytics` | Activity | |
| أدوات | التقرير اليومي | `/admin/daily-reports` | CalendarDays | |
| أدوات | المساعد الذكي | `/trainer/ai-assistant` | Bot | مسار مشترك |
| أدوات | الإعدادات | `/admin/settings` | Settings | |

---

# STEP 4: جداول قاعدة البيانات

## Core User & Group Tables

| Table | Migration | Used? | أين تُستخدم؟ |
|-------|-----------|-------|-------------|
| `profiles` | 001 | ✅ | 70+ files — authStore, dashboards, admin, trainer |
| `trainers` | 001 | ✅ | AdminTrainers, TrainerDashboard, AdminAIDashboard |
| `groups` | 001 | ✅ | AdminGroups, dashboards, TrainerTeams, scheduler |
| `teams` | 001 | ✅ | TrainerTeams, StudentLeaderboard, AdminGroups |
| `students` | 001 | ✅ | 60+ files — dashboards, grading, admin, trainer |
| `team_members` | 001 | ✅ | TrainerTeams, StudentLeaderboard |

## Assignments & Submissions

| Table | Migration | Used? | أين تُستخدم؟ |
|-------|-----------|-------|-------------|
| `assignments` | 001 | ✅ | TrainerAssignments, StudentAssignments, grading |
| `submissions` | 001 | ✅ | SubmissionForm, grading, daily reports |

## Messaging

| Table | Migration | Used? | أين تُستخدم؟ |
|-------|-----------|-------|-------------|
| `direct_messages` | 001 | ✅ | StudentMessages |
| `group_messages` | 001 | 🟡 | autoMessages.js only (likely used via realtime) |
| `message_reactions` | 001 | 🟡 | لا يوجد استخدام |

## Gamification

| Table | Migration | Used? | أين تُستخدم؟ |
|-------|-----------|-------|-------------|
| `xp_transactions` | 001 | ✅ | GamificationProvider, TrainerQuickPoints, xpManager |
| `achievements` | 001 | ✅ | GamificationProvider, StudentProfile, Leaderboard |
| `student_achievements` | 001 | ✅ | GamificationProvider, Leaderboard, Profile |
| `challenges` | 001 | ✅ | StudentChallenges, TrainerChallenges |
| `challenge_participants` | 001 | ✅ | StudentChallenges, TrainerChallenges |
| `peer_recognitions` | 001 | ✅ | StudentPeerRecognition, GroupActivity |
| `daily_challenges` | 037 | ✅ | DailyChallenge, StudentStreakBattles |
| `student_streaks` | 037 | ✅ | StudentStreakBattles, StudentProfile |
| `student_daily_completions` | 037 | ✅ | StudentStreakBattles, StudentConversation |
| `student_error_bank` | 037 | ✅ | StudentExercises, StudentErrorPatterns |

## Curriculum

| Table | Migration | Used? | أين تُستخدم؟ |
|-------|-----------|-------|-------------|
| `curriculum_levels` | 039 | ✅ | CurriculumBrowser, LevelUnits, CurriculumOverview |
| `curriculum_units` | 039 | ✅ | UnitContent, TrainerCurriculum, UnitEditor, 15+ |
| `curriculum_readings` | 039 | ✅ | ReadingTab, ReadingEditor, UnitEditor |
| `curriculum_comprehension_questions` | 039 | ✅ | ReadingTab, ReadingEditor |
| `curriculum_vocabulary` | 039 | ✅ | VocabularyTab, VocabularyFlashcards, UnitEditor |
| `curriculum_vocabulary_exercises` | 039 | ✅ | VocabularyTab, UnitEditor |
| `curriculum_grammar` | 039 | ✅ | GrammarTab, GrammarEditor, UnitEditor |
| `curriculum_grammar_exercises` | 039 | ✅ | GrammarTab, GrammarEditor |
| `curriculum_writing` | 039 | ✅ | WritingTab, WritingEditor, UnitEditor |
| `curriculum_listening` | 039 | ✅ | ListeningTab, ListeningEditor, UnitEditor |
| `curriculum_speaking` | 039 | ✅ | SpeakingTab, SpeakingEditor, UnitEditor |
| `curriculum_irregular_verbs` | 039 | ✅ | IrregularVerbsPractice, IrregularVerbsEditor |
| `curriculum_irregular_verb_exercises` | 039 | ✅ | IrregularVerbsPractice, IrregularVerbsEditor |
| `curriculum_pronunciation` | 039 | ✅ | StudentPronunciation, UnitEditor |
| `curriculum_video_sections` | 039 | ✅ | VideoEditor, UnitEditor |
| `curriculum_assessments` | 039 | ✅ | AssessmentEditor, UnitEditor |
| `curriculum_vocabulary_srs` | 039 | ✅ | VocabularyFlashcards, VocabularyTab |
| `student_curriculum_progress` | 039 | ✅ | UnitContent, TrainerCurriculum, CurriculumProgress |

## Spelling & Verbs

| Table | Migration | Used? | أين تُستخدم؟ |
|-------|-----------|-------|-------------|
| `irregular_verbs` | 017 | ✅ | IrregularVerbsPractice, AdminContentBank |
| `student_verb_progress` | 017 | ✅ | IrregularVerbsPractice, CurriculumProgress |
| `spelling_words` | 017 | ✅ | StudentSpelling, AdminContentBank |
| `student_spelling_progress` | 017 | ✅ | StudentSpelling, CurriculumProgress |
| `spelling_sessions` | 017 | ✅ | StudentSpelling, AdminContentBank |

## Quiz & Testing

| Table | Migration | Used? | أين تُستخدم؟ |
|-------|-----------|-------|-------------|
| `quizzes` | 001 | ✅ | StudentQuiz, TrainerQuizGenerator |
| `quiz_questions` | 001 | ✅ | StudentQuiz, TrainerQuizGenerator |
| `quiz_attempts` | 001 | ✅ | StudentQuiz, TrainerQuizGenerator |
| `quiz_answers` | 001 | ✅ | StudentQuiz, TrainerQuizGenerator |
| `test_questions` | 027 | ✅ | StudentAdaptiveTest, AdminTestBank |
| `test_sessions` | 027 | ✅ | StudentAdaptiveTest, AdminTestBank |
| `test_responses` | 027 | ✅ | StudentAdaptiveTest |
| `adaptive_question_bank` | 031 | ✅ | StudentAdaptiveTest, AdminAIDashboard |

## IELTS

| Table | Migration | Used? | أين تُستخدم؟ |
|-------|-----------|-------|-------------|
| `ielts_diagnostic` | 036 | ✅ | IELTSManagement |
| `ielts_reading_passages` | 036 | ✅ | IELTSReadingManager |
| `ielts_reading_skills` | 036 | ✅ | IELTSReadingManager |
| `ielts_writing_tasks` | 036 | ✅ | IELTSWritingManager |
| `ielts_listening_sections` | 036 | ✅ | IELTSListeningManager |
| `ielts_speaking_questions` | 036 | ✅ | IELTSSpeakingManager |
| `ielts_mock_tests` | 036 | ✅ | IELTSMockTestManager |
| `ielts_student_results` | 036 | ✅ | IELTSManagement |

## Other Active Tables

| Table | Migration | Used? | أين تُستخدم؟ |
|-------|-----------|-------|-------------|
| `classes` | 001 | ✅ | TrainerAttendance, TrainerSchedule, AdminScheduling |
| `attendance` | 001 | ✅ | TrainerAttendance, TrainerStudentView |
| `private_sessions` | 001 | ✅ | TrainerSchedule, AdminScheduling, StudentBilling |
| `notifications` | 001 | ✅ | NotificationCenter, Header, 10+ files |
| `payments` | 001 | ✅ | AdminPayments, StudentBilling, AdminReports |
| `assessments` | 001 | ✅ | StudentAssessments, StudentGrades |
| `skill_snapshots` | 001 | ✅ | StudentAIInsights, TrainerStudentView |
| `activity_feed` | 001 | ✅ | StudentActivityFeed, StudentGroupActivity |
| `vocabulary_bank` | 001 | ✅ | StudentVocabulary, AdminStudents |
| `class_notes` | 001 | ✅ | TrainerNotes, TrainerStudentView |
| `progress_reports` | 029 | ✅ | TrainerProgressReports, AdminReports |
| `holidays` | 001 | ✅ | AdminHolidays, TrainerSchedule |
| `referrals` | 001 | ✅ | StudentReferral |
| `settings` | 001 | ✅ | AdminSettings |
| `analytics_events` | 001 | ✅ | AdminAnalytics, analytics.js |
| `audit_log` | 001 | ✅ | AdminAuditLog |
| `error_patterns` | 010 | ✅ | StudentExercises, StudentErrorPatterns |
| `targeted_exercises` | 010 | ✅ | StudentExercises |
| `churn_predictions` | 011 | ✅ | AdminChurnPrediction |
| `parent_links` | 012 | ✅ | ParentDashboard |
| `voice_journals` | 013 | ✅ | StudentVoiceJournal |
| `seasonal_events` | 014 | ✅ | StudentEvents |
| `event_participants` | 014 | ✅ | StudentEvents |
| `testimonials` | 016 | ✅ | AdminTestimonials, Testimonials |
| `content_library` | 016 | ✅ | AdminContent, TrainerLibrary |
| `weekly_task_sets` | 017 | ✅ | StudentWeeklyTasks, AdminWeeklyTasks |
| `weekly_tasks` | 017 | ✅ | StudentWeeklyTasks, AdminWeeklyTasks, grading |
| `ai_student_profiles` | 022 | ✅ | StudentAIInsights, AdminAIDashboard |
| `class_recordings` | 023 | ✅ | AdminRecordings, StudentRecordings |
| `weekly_schedule_config` | 023 | ✅ | StudentSchedule, dashboards |
| `student_planned_tasks` | 023 | ✅ | StudentSchedule |
| `writing_history` | 026 | ✅ | StudentWritingLab, AdminAIDashboard |
| `smart_nudges` | 027 | ✅ | StudentDashboard, StudentAIInsights |
| `notification_preferences` | 034 | ✅ | NotificationSettings |
| `study_plan_overrides` | 048 | ✅ | StudentStudyPlan |
| `user_sessions` | 049 | ✅ | activityTracker, AdminAnalytics |
| `page_visits` | 049 | ✅ | usePageTracking, AdminAnalytics |
| `activity_events` | 049 | ✅ | activityTracker, AdminAnalytics |
| `daily_reports` | 052 | ✅ | AdminDailyReports |
| `game_sessions` | 062 | ✅ | VocabularyFlashcards, IrregularVerbsPractice |
| `speaking_topic_banks` | 001 | ✅ | StudentSpeaking, AdminContent |
| `student_speaking_progress` | 001 | ✅ | StudentSpeaking, AdminContent |
| `social_shares` | 001 | ✅ | socialShare.js, StudentSuccessStories |
| `system_errors` | 001 | ✅ | errors.js, AdminAIDashboard |
| `ai_usage` | 001 | ✅ | AdminAIDashboard |

## 🟡 جداول غير مستخدمة في الواجهة

| Table | Migration | ملاحظات |
|-------|-----------|---------|
| `group_messages` | 001 | قد يُستخدم عبر Realtime — يحتاج تحقق |
| `message_reactions` | 001 | لا يوجد UI لردود الفعل |
| `trainer_payroll` | 001 | لا يوجد صفحة رواتب |
| `ai_chat_messages` | 016 | يُستخدم من edge functions فقط |
| `data_reset_log` | 022 | سيرفر فقط |
| `iot_collections` | 045 | محتوى IELTS مستورد — لا UI |
| `iot_volumes` | 045 | محتوى IELTS مستورد — لا UI |
| `iot_tests` | 045 | محتوى IELTS مستورد — لا UI |
| `iot_reading_passages` | 045 | محتوى IELTS مستورد — لا UI |
| `iot_answers` | 045 | محتوى IELTS مستورد — لا UI |
| `iot_images` | 045 | محتوى IELTS مستورد — لا UI |
| `iot_student_attempts` | 045 | محتوى IELTS مستورد — لا UI |

---

# STEP 5: الدوال الخارجية (Edge Functions)

## ✅ تُستدعى من الواجهة (27)

| Function | الوظيفة | تُستدعى من |
|----------|---------|-----------|
| `adaptive-test` | اختبار تكيفي (IRT) | PlacementTest, StudentAdaptiveTest |
| `ai-chatbot` | مساعد تعلم ذكي | StudentChatbot, StudentVocabulary |
| `ai-form-filler` | ملء نماذج بالذكاء الاصطناعي | useAIFormFiller, AdminRecordings |
| `ai-lesson-planner` | مخطط دروس ذكي | TrainerLessonPlanner |
| `ai-student-chatbot` | محادثة إنجليزية تفاعلية | AIFloatingHelper, StudentConversation |
| `ai-submission-feedback` | تغذية راجعة للواجبات | AISubmissionFeedback |
| `ai-trainer-assistant` | مساعد المعلم الشامل | TrainerAIAssistant, TrainerQuizGenerator |
| `ai-writing-feedback` | تحليل كتابة الطالب | AIWritingFeedback |
| `analyze-error-patterns` | كشف أنماط الأخطاء | StudentExercises |
| `analyze-speaking` | تحليل تسجيلات التحدث | StudentSpeaking |
| `correct-writing` | تصحيح كتابة مفصل | StudentWritingLab |
| `evaluate-writing` | تقييم كتابة + IELTS bands | StudentWritingLab |
| `generate-ai-student-profile` | ملف ذكاء اصطناعي للطالب | StudentAIProfile |
| `generate-daily-report` | تقرير يومي شامل | AdminDailyReports |
| `generate-progress-report` | تقارير تقدم بالذكاء الاصطناعي | TrainerProgressReports |
| `generate-targeted-exercises` | تمارين مخصصة | StudentExercises |
| `generate-test-questions` | توليد أسئلة اختبار | AdminTestBank |
| `generate-weekly-tasks` | توليد مهام أسبوعية | AdminWeeklyTasks |
| `grade-weekly-task` | تصحيح مهام أسبوعية بالذكاء | StudentWeeklyTaskDetail |
| `parent-dashboard` | بيانات لوحة الوالدين | ParentDashboard |
| `predict-churn` | توقع انسحاب الطلاب | AdminChurnPrediction |
| `process-voice-journal` | تحليل يوميات صوتية | StudentVoiceJournal |
| `reset-all-data` | حذف جميع البيانات | AdminSettings |
| `seed-curriculum` | توليد محتوى منهج | AdminContentBank |
| `smart-nudges` | تنبيهات ذكية | StudentAIInsights |
| `update-student-email` | تحديث إيميل طالب | AdminStudents |
| `whisper-transcribe` | تحويل صوت لنص | AISpeakingAnalysis, StudentPronunciation |

## 🔄 سيرفر / Cron فقط (11)

| Function | الوظيفة |
|----------|---------|
| `ai-quiz-generator` | توليد أسئلة (يُستدعى عبر ai-trainer-assistant) |
| `auto-nudge-scheduler` | جدولة تنبيهات تلقائية |
| `check-inactive-students` | كشف طلاب غير نشطين |
| `cron-streak-check` | فحص يومي للمتابعات |
| `generate-report` | تقرير قديم (بديل: generate-progress-report) |
| `generate-trainer-insights` | تحليلات مجموعة المعلم |
| `payment-reminder` | تذكيرات دفع |
| `reset-student-passwords` | إعادة تعيين كلمات مرور |
| `seed-adaptive-questions` | بذر أسئلة تكيفية |
| `send-email` | إرسال إيميلات (داخلي) |
| `weekly-skill-snapshot` | لقطة مهارات أسبوعية |
| `weekly-tasks-reminder` | تذكير مهام أسبوعية |

---

# STEP 6: المكونات المشتركة

## الأكثر استخداماً

| Component | عدد الاستخدامات |
|-----------|:--------------:|
| Header | 73 |
| Skeleton | 34 |
| Toast | 19 |
| EmptyState | 17 |
| PageSkeleton | 17 |
| SubTabs | 11 |
| UserAvatar | 10 |
| FluentiaToast | 5 |
| Sidebar | 4 |
| PackageGate | 3 |
| AIFillButton | 3 |
| ImpersonateButton | 3 |

## غير مستخدمة (0 imports)

| Component | الملف |
|-----------|------|
| AIContentRecommendations | `src/components/ai/AIContentRecommendations.jsx` |
| AIGrammarChecker | `src/components/ai/AIGrammarChecker.jsx` |
| AISpeakingAnalysis | `src/components/ai/AISpeakingAnalysis.jsx` |
| AIWritingFeedback | `src/components/ai/AIWritingFeedback.jsx` |
| EmptyStateIllustration | `src/components/illustrations/EmptyStateIllustration.jsx` |
| ErrorState | `src/components/ui/ErrorState.jsx` |
| ShareCard | `src/components/ShareCard.jsx` |
| ShimmerProgress | `src/components/ui/ShimmerProgress.jsx` |
| SplashScreen | `src/components/SplashScreen.jsx` |
| StreakFire | `src/components/gamification/StreakFire.jsx` |
| XPCounter | `src/components/gamification/XPCounter.jsx` |

---

# STEP 7: الميزات المبنية فعلياً

## للطلاب — الميزات الأساسية:
- ✅ المنهج الكامل (5 أقسام × وحدات متعددة، حفظ تقدم، إعادة محاولة)
- ✅ الواجبات (عرض، تسليم ملفات/نصوص/صوت، تتبع حالة)
- ✅ المهام الأسبوعية (حل، تصحيح AI، تتبع)
- ✅ الألعاب (مطابقة، ترتيب حروف، ملء فراغات، بطاقات)
- ✅ الإملاء (تمرين، تتبع إتقان)
- ✅ الأفعال الشاذة (تمرين، تتبع إتقان)
- ✅ المفردات والبطاقات التعليمية (SRS)
- ✅ الاختبارات التكيفية (IRT-based)
- ✅ المحادثة الذكية (AI chatbot)
- ✅ معمل الكتابة (تصحيح AI)
- ✅ اليوميات الصوتية (Whisper + Claude)
- ✅ لوحة المتصدرين والتحديات
- ✅ الشهادات والإحالات
- ✅ الجدول وخطة الدراسة
- 🟡 معمل التحدث (ComingSoon)
- 🟡 التقييمات (ComingSoon)

## للمعلمين — الميزات الأساسية:
- ✅ لوحة تحكم شاملة مع بطاقة نشاط المنهج
- ✅ إنشاء وتصحيح الواجبات
- ✅ ماتركس تقدم (كل الطلاب × كل الوحدات)
- ✅ ملف طالب تفصيلي (إجابات، ألعاب، إملاء، كتابة، جدول زمني)
- ✅ المنهج (عرض تفصيلي لكل وحدة وقسم مع إجابات الطلاب)
- ✅ الحضور والجدول
- ✅ الفرق والتحديات
- ✅ مخطط الدروس (AI)
- ✅ تقارير التقدم (AI)
- ✅ مساعد ذكي شامل (إنشاء واجبات، منح نقاط، تصحيح)
- ✅ الاختبارات السريعة (AI Quiz Generator)

## للأدمن — الميزات الأساسية:
- ✅ لوحة تحكم شاملة
- ✅ إدارة الطلاب والمعلمين والمجموعات
- ✅ إدارة المنهج (محرر وحدات كامل مع 25 مكون فرعي)
- ✅ بنك المحتوى وبنك الأسئلة
- ✅ المدفوعات والفواتير
- ✅ التقارير والتحليلات
- ✅ التقرير اليومي (AI-generated)
- ✅ توقع انسحاب الطلاب (Churn prediction)
- ✅ الجدول الذكي
- ✅ إدارة العطل
- ✅ سجل المراجعة (Audit log)
- ✅ تصدير البيانات
- ✅ إدارة IELTS (قراءة، كتابة، استماع، تحدث، اختبارات)

---

# STEP 8: الباقات والصلاحيات

## Package Gating

الباقات المتوفرة: `asas` (أساس), `talaqa` (طلاقة), `tamayuz` (تميّز), `ielts`

### كيف يتم التحقق؟

1. **PackageRoute component** in App.jsx — wraps routes that require specific packages:
   - `/student/grades` → requires `talaqa`
   - `/student/ai-chat` → requires `talaqa`
   - `/student/group-activity` → requires `talaqa`
   - `/student/adaptive-test` → requires `talaqa`
   - `/student/ai-insights` → requires `talaqa`

2. **Sidebar `comingSoon` flag** — marks features as coming soon:
   - معمل التحدث → requires `tamayuz`
   - معمل الكتابة → requires `tamayuz`
   - التقييمات → requires `talaqa`

3. **Edge function rate limits** — `ai-chatbot` and `correct-writing` check package for daily limits

4. **PackageGate component** — used inline in 3 places to conditionally show/hide features

---

# STEP 9: الأخطاء المعروفة

## Bug 1: StudentQuiz.jsx — Crash Risk

**الملف:** `src/pages/student/StudentQuiz.jsx`

**المشكلة:** في `QuizResults` component, السطر ~814:
```js
.eq('quiz_id', quiz.id)  // quiz can be null → TypeError
```
إذا كان `selectedQuiz === null` عند عرض النتائج (مثلاً عبر navigation مباشر)، يحصل crash.

**مشكلة ثانوية:** Timer يمكن أن يفعّل `handleSubmit(true)` قبل ما يتم إنشاء `attemptId` — النتيجة: فقدان البيانات بصمت.

## Bug 2: Chat Bubbles — White on White

**الملف:** `src/pages/student/StudentGroupChat.jsx`, السطر ~158-160

**المشكلة:** فقاعات رسائل المستخدم (`isMe = true`) تستخدم `bg-sky-500/20` بدون تحديد لون النص:
```jsx
isMe ? 'bg-sky-500/20' : ''
```
في Light Mode، لون النص يعتمد على الوراثة من العناصر الأب، وإذا كان أي عنصر أب يحدد لون فاتح → النص يختفي.

**الحل:** إضافة `text-[var(--text-primary)]` لفرع `isMe`.

## Bug 3: Admin Schedule Tabs — "Random Order"

**الملف:** `src/pages/admin/AdminSmartScheduling.jsx` و `src/components/common/SubTabs.jsx`

**المشكلة:** الترتيب ليس عشوائي فعلياً — المصفوفة ثابتة. المشكلة البصرية من:
1. `layoutId="subtab-indicator"` مشترك بين كل instances من SubTabs → Framer Motion conflict
2. في الشاشات الصغيرة، `overflow-x-auto` يخفي بعض التبويبات بدون scroll indicator واضح

---

# STEP 10: الملفات والمجلدات الميتة

## مكونات غير مستوردة (11 ملف)

| الملف | ملاحظات |
|------|---------|
| `src/components/ai/AIContentRecommendations.jsx` | توصيات محتوى — لم يُربط بأي صفحة |
| `src/components/ai/AIGrammarChecker.jsx` | مدقق قواعد — لم يُربط |
| `src/components/ai/AISpeakingAnalysis.jsx` | تحليل تحدث — لم يُربط |
| `src/components/ai/AIWritingFeedback.jsx` | ملاحظات كتابة — لم يُربط |
| `src/components/gamification/StreakFire.jsx` | أنيميشن نار — لم يُستخدم |
| `src/components/gamification/XPCounter.jsx` | عداد XP — لم يُستخدم |
| `src/components/illustrations/EmptyStateIllustration.jsx` | رسم توضيحي — لم يُستخدم |
| `src/components/ShareCard.jsx` | بطاقة مشاركة — لم يُستخدم |
| `src/components/SplashScreen.jsx` | شاشة تحميل — لم يُستخدم |
| `src/components/ui/ErrorState.jsx` | حالة خطأ — لم يُستخدم |
| `src/components/ui/ShimmerProgress.jsx` | شريط تقدم — لم يُستخدم |

## مسارات وملفات legacy

| الملف | ملاحظات |
|------|---------|
| `/student/curriculum-old` → `StudentCurriculum.jsx` | نسخة قديمة من المنهج |
| `/student/style-preview` → `StylePreview.jsx` | أداة تطوير — ليست للإنتاج |
| `AdminCurriculum.jsx` (في جذر admin) | غير مستخدم — App.jsx يستورد `CurriculumOverview` بدلاً منه |

## ملفات موجودة لكن المسار يعرض ComingSoon بدلاً منها

| الملف | المسار |
|------|--------|
| `StudentSpeaking.jsx` | `/student/speaking` → ComingSoon |
| `StudentAssessments.jsx` | `/student/assessments` → ComingSoon |
| `StudentWritingLab.jsx` | `/student/writing-lab` → ComingSoon |

---

# STEP 11: ملاحظات إضافية

## Cross-Role Route Sharing
- الأدمن يستخدم 6 مسارات من المعلم مباشرة (assignments, schedule, recordings, quiz, progress-matrix, ai-assistant)
- `StudentMessages` يُستخدم في مسار المعلم أيضاً
- `AdminRecordings` يُستخدم في مسار المعلم

## TODO/FIXME/HACK Comments
لا يوجد أي تعليقات TODO أو FIXME أو HACK في الكود.
