import { useEffect, useRef, useState, Suspense } from 'react'
import LanguageBootstrap from './components/i18n/LanguageBootstrap'
import { useQuery } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { supabase } from './lib/supabase'
import { queryClient } from './lib/queryClient'
import LoginPage from './pages/public/LoginPage'
import LayoutShell from './components/layout/LayoutShell'
// Pro Desk shell + guard are layout elements (like LayoutShell) → eager; its pages are lazy below.
import DeskShell from './components/desk/DeskShell'
import DeskGuard from './components/desk/DeskGuard'
import TeacherLayout from './layouts/TeacherLayout'
import OnboardingModal from './components/onboarding/OnboardingModal'
import ForcePasswordChange from './components/onboarding/ForcePasswordChange'
import GamificationProvider from './components/gamification/GamificationProvider'
import ErrorBoundary, { PageErrorFallback } from './components/ErrorBoundary'
import GlobalSearch from './components/GlobalSearch'
import lazyRetry from './utils/lazyRetry'
import OfflineBanner from './components/OfflineBanner'
import ImpersonationBanner from './components/ImpersonationBanner'
import { ToastProvider } from './components/Toast'

import ComingSoon from './pages/student/ComingSoon'
import LockedFeature from './pages/student/LockedFeature'
import { hasPackageAccess } from './components/PackageGate'

// ─── Design System (Phase 0) ────────────────────────────────
import ThemeProvider from './design-system/ThemeProvider'
import { AuroraBackground } from './design-system/components'

// ─── MEGA-FIX V2 Phase D — Popup contract foundation ─────────
import SidebarMetricsObserver from './lib/ui/SidebarMetricsObserver'

// ─── CS Ops — /team workspace (agent + admin) ────────────────
const CoordinatorWorkspace = lazyRetry(() => import('./pages/coordinator/CoordinatorWorkspace'))
const CoordinatorWeek = lazyRetry(() => import('./pages/coordinator/CoordinatorWeek'))
const SchedulesList = lazyRetry(() => import('./pages/coordinator/SchedulesList'))
const TeacherSchedule = lazyRetry(() => import('./pages/teacher/schedule/TeacherSchedule'))
const TeamWorkspace = lazyRetry(() => import('./pages/team/TeamWorkspace'))
const TeamPipeline  = lazyRetry(() => import('./pages/team/TeamPipeline'))
const TeamFollowups = lazyRetry(() => import('./pages/team/TeamFollowups'))
const TeamSchedule  = lazyRetry(() => import('./pages/team/TeamSchedule'))
const CsPerformance = lazyRetry(() => import('./pages/admin/CsPerformance'))
const CsIntegrations = lazyRetry(() => import('./pages/admin/CsIntegrations'))
const AdminTeam = lazyRetry(() => import('./pages/admin/AdminTeam'))

// ─── Lazy-loaded Pages (with chunk retry on stale deploys) ───
const StudentDashboard = lazyRetry(() => import('./pages/student/StudentDashboard'))
// Pro Desk pages (gated /desk/* surface)
const DeskToday = lazyRetry(() => import('./pages/desk/DeskToday'))
const DeskScenarios = lazyRetry(() => import('./pages/desk/DeskScenarios'))
const DeskScenarioPlayer = lazyRetry(() => import('./pages/desk/DeskScenarioPlayer'))
const DeskTrack = lazyRetry(() => import('./pages/desk/DeskTrack'))
const DeskLesson = lazyRetry(() => import('./pages/desk/DeskLesson'))
const DeskClasses = lazyRetry(() => import('./pages/desk/DeskClasses'))
const DeskClass = lazyRetry(() => import('./pages/desk/DeskClass'))
const DeskClassChapter = lazyRetry(() => import('./pages/desk/DeskClassChapter'))
const DeskDaily = lazyRetry(() => import('./pages/desk/DeskDaily'))
const DeskReading = lazyRetry(() => import('./pages/desk/DeskReading'))
const DeskReadingPassage = lazyRetry(() => import('./pages/desk/DeskReadingPassage'))
const DeskVocab = lazyRetry(() => import('./pages/desk/DeskVocab'))
const DeskGrammar = lazyRetry(() => import('./pages/desk/DeskGrammar'))
const DeskGrammarPoint = lazyRetry(() => import('./pages/desk/DeskGrammarPoint'))
const DeskPhrasebook = lazyRetry(() => import('./pages/desk/DeskPhrasebook'))
const DeskGrowth = lazyRetry(() => import('./pages/desk/DeskGrowth'))
const IndividualTrackHome = lazyRetry(() => import('./pages/student/individual/TrackHome'))
const IndividualModulePage = lazyRetry(() => import('./pages/student/individual/ModulePage'))
const StudentAssignments = lazyRetry(() => import('./pages/student/StudentAssignments'))
const StudentGrades = lazyRetry(() => import('./pages/student/StudentGrades'))
const StudentProfile = lazyRetry(() => import('./pages/student/StudentProfile'))
const MyBugReports = lazyRetry(() => import('./pages/student/MyReports'))
const StudentSpeaking = lazyRetry(() => import('./pages/student/StudentSpeaking'))
const StudentLibrary = lazyRetry(() => import('./pages/student/StudentLibrary'))
const StudentEverydayEnglish = lazyRetry(() => import('./pages/student/EverydayEnglish'))
const StudentSentenceBuilder = lazyRetry(() => import('./pages/student/SentenceBuilder'))
const StudentLeaderboard = lazyRetry(() => import('./pages/student/StudentLeaderboard'))
const StudentPeerRecognition = lazyRetry(() => import('./pages/student/StudentPeerRecognition'))
const StudentActivityFeed = lazyRetry(() => import('./pages/student/StudentActivityFeed'))
const StudentGroupChat = lazyRetry(() => import('./pages/student/StudentGroupChat'))
const StudentMessages = lazyRetry(() => import('./pages/student/StudentMessages'))
const ChatHome = lazyRetry(() => import('./features/chat/pages/ChatHome'))
const DMChatPage = lazyRetry(() => import('./features/chat/pages/DMChatPage'))
const GroupChatPage = lazyRetry(() => import('./features/chat/pages/GroupChatPage'))
const LibraryHome = lazyRetry(() => import('./features/library/pages/LibraryHome'))
const LibraryBook = lazyRetry(() => import('./features/library/pages/LibraryBook'))
const LibraryReader = lazyRetry(() => import('./features/library/pages/LibraryReader'))
const StudentChatbot = lazyRetry(() => import('./pages/student/StudentChatbot'))
const StudentVocabulary = lazyRetry(() => import('./pages/student/StudentVocabulary'))
const StudentBilling = lazyRetry(() => import('./pages/student/StudentBilling'))
const StudentExercises = lazyRetry(() => import('./pages/student/StudentExercises'))
const StudentErrorPatterns = lazyRetry(() => import('./pages/student/StudentErrorPatterns'))
const StudentVoiceJournal = lazyRetry(() => import('./pages/student/StudentVoiceJournal'))
const SpellingLab = lazyRetry(() => import('./pages/student/SpellingLab'))
// Retention system (Module 2 — Smart Homework)
const HomeworkLanding = lazyRetry(() => import('./pages/student/retention/HomeworkLanding'))
const HomeworkPlay = lazyRetry(() => import('./pages/student/retention/HomeworkPlay'))
const HomeworkResult = lazyRetry(() => import('./pages/student/retention/HomeworkResult'))
// Retention system (Module 5 — Lesson Briefs)
const BriefView = lazyRetry(() => import('./pages/student/retention/BriefView'))
// Retention system (Module 1 — Daily Practice Partner)
const DailyPartnerLanding = lazyRetry(() => import('./pages/student/retention/DailyPartnerLanding'))
const DailyPartnerPlay = lazyRetry(() => import('./pages/student/retention/DailyPartnerPlay'))
const DailyPartnerResult = lazyRetry(() => import('./pages/student/retention/DailyPartnerResult'))
// Retention system (Module 3 — Weekly Reports)
const MyReports = lazyRetry(() => import('./pages/student/retention/MyReports'))
const ReportDetail = lazyRetry(() => import('./pages/student/retention/ReportDetail'))
const AdminRetentionReports = lazyRetry(() => import('./pages/admin/retention/ReportsQueue'))
const AdminRetentionMasterSwitch = lazyRetry(() => import('./pages/admin/retention/RetentionMasterSwitch'))
// PRONUNCIATION-HIDDEN 2026-05-19: feature shelved due to UX issues.
// Files preserved for future revival. To re-enable: uncomment + restore the route below.
// const StudentPronunciation = lazyRetry(() => import('./pages/student/StudentPronunciation'))
const StudentStreakBattles = lazyRetry(() => import('./pages/student/StudentStreakBattles'))
const StudentSuccessStories = lazyRetry(() => import('./pages/student/StudentSuccessStories'))
const StudentEvents = lazyRetry(() => import('./pages/student/StudentEvents'))
const StudentAvatar = lazyRetry(() => import('./pages/student/StudentAvatar'))
const StudentAssessments = lazyRetry(() => import('./pages/student/StudentAssessments'))
const StudentQuiz = lazyRetry(() => import('./pages/student/StudentQuiz'))
const StudentCertificate = lazyRetry(() => import('./pages/student/StudentCertificate'))
const StudentReferral = lazyRetry(() => import('./pages/student/StudentReferral'))
const StudentStudyPlan = lazyRetry(() => import('./pages/student/StudentStudyPlan'))
const StudentWeeklyTasks = lazyRetry(() => import('./pages/student/StudentWeeklyTasks'))
const StudentWeeklyTaskDetail = lazyRetry(() => import('./pages/student/StudentWeeklyTaskDetail'))
const StudentSpelling = lazyRetry(() => import('./pages/student/StudentSpelling'))
const IrregularVerbsPractice = lazyRetry(() => import('./pages/student/verbs/IrregularVerbsPractice'))
const StudentWritingLab = lazyRetry(() => import('./pages/student/StudentWritingLab'))
const StudentGroupActivity = lazyRetry(() => import('./pages/student/StudentGroupActivity'))
const StudentAdaptiveTest = lazyRetry(() => import('./pages/student/StudentAdaptiveTest'))
const StudentAIInsights = lazyRetry(() => import('./pages/student/StudentAIInsights'))
const DailyReview = lazyRetry(() => import('./pages/student/DailyReview'))
const SrsHome = lazyRetry(() => import('./pages/student/SrsHome'))
const HardWordsHome = lazyRetry(() => import('./pages/student/HardWordsHome'))
const LevelExitTest = lazyRetry(() => import('./pages/student/LevelExitTest'))
const LevelJourneyMap = lazyRetry(() => import('./pages/student/LevelJourneyMap'))
const AccountPausedPage = lazyRetry(() => import('./pages/student/AccountPausedPage'))
const StudentDuels = lazyRetry(() => import('./pages/student/StudentDuels'))
const CompetitionHub   = lazyRetry(() => import('./pages/student/CompetitionHub'))
const CompetitionRules = lazyRetry(() => import('./pages/student/CompetitionRules'))
const HowToEarnPage = lazyRetry(() => import('./pages/student/HowToEarnPage'))
const ProgressDashboard = lazyRetry(() => import('./pages/student/ProgressDashboard'))
const StudentCurriculum = lazyRetry(() => import('./pages/student/StudentCurriculum'))
const VocabularyFlashcards = lazyRetry(() => import('./pages/student/vocabulary/VocabularyFlashcards'))
const CourseVocabulary = lazyRetry(() => import('./pages/student/CourseVocabulary'))
const VocabJourney = lazyRetry(() => import('./pages/student/vocabulary/VocabJourney'))
const CurriculumBrowser = lazyRetry(() => import('./pages/student/curriculum/CurriculumBrowser'))
const StylePreview = lazyRetry(() => import('./pages/student/curriculum/StylePreview'))
const LevelUnits = lazyRetry(() => import('./pages/student/curriculum/LevelUnits'))
const UnitContent = lazyRetry(() => import('./pages/student/curriculum/UnitContent'))
// Unit Movements V3 — feature-flagged route handler (default v2)
const UnitContentRouter = lazyRetry(() => import('./pages/student/curriculum/UnitContentRouter'))
const PlacementTestPage = lazyRetry(() => import('./pages/student/placement/PlacementTestPage'))
const PlacementResultsPage = lazyRetry(() => import('./pages/student/placement/PlacementResultsPage'))
const StudentProgressReports = lazyRetry(() => import('./pages/student/ProgressReports'))
const StudentReportView = lazyRetry(() => import('./pages/student/ReportView'))
// V1 IELTS page imports — preserved from 8acc522 emergency deploy-fix (2026-05-20).
// All V1 routes are now <Navigate> redirects to the Atelier (no V1 component is rendered),
// but the lazyRetry consts stay so the .legacy chunks remain reachable for any direct deep-link traffic
// and so the file structure is documented at the import site. Tree-shaken if unreferenced.
const StudentIELTSHub = lazyRetry(() => import('./pages/student/ielts/StudentIELTSHub.legacy'))
const IELTSComingSoon = lazyRetry(() => import('./pages/student/ielts/IELTSComingSoon.legacy'))
const DiagnosticFlow = lazyRetry(() => import('./pages/student/ielts/diagnostic/DiagnosticFlow.legacy'))
const ReadingLab = lazyRetry(() => import('./pages/student/ielts/reading/ReadingLab.legacy'))
const ReadingSkillModule = lazyRetry(() => import('./pages/student/ielts/reading/ReadingSkillModule.legacy'))
const ReadingPassagePractice = lazyRetry(() => import('./pages/student/ielts/reading/ReadingPassagePractice.legacy'))
const ListeningLab = lazyRetry(() => import('./pages/student/ielts/listening/ListeningLab.legacy'))
const ListeningSectionModule = lazyRetry(() => import('./pages/student/ielts/listening/ListeningSectionModule.legacy'))
const ListeningPractice = lazyRetry(() => import('./pages/student/ielts/listening/ListeningPractice.legacy'))
const WritingLab = lazyRetry(() => import('./pages/student/ielts/writing/WritingLab.legacy'))
const WritingTaskPicker = lazyRetry(() => import('./pages/student/ielts/writing/WritingTaskPicker.legacy'))
const WritingWorkspace = lazyRetry(() => import('./pages/student/ielts/writing/WritingWorkspace.legacy'))
const WritingFeedback = lazyRetry(() => import('./pages/student/ielts/writing/WritingFeedback.legacy'))
const WritingHistory = lazyRetry(() => import('./pages/student/ielts/writing/WritingHistory.legacy'))
const SpeakingLab = lazyRetry(() => import('./pages/student/ielts/speaking/SpeakingLab.legacy'))
const SpeakingPartPicker = lazyRetry(() => import('./pages/student/ielts/speaking/SpeakingPartPicker.legacy'))
const SpeakingSession = lazyRetry(() => import('./pages/student/ielts/speaking/SpeakingSession.legacy'))
const SpeakingFeedback = lazyRetry(() => import('./pages/student/ielts/speaking/SpeakingFeedback.legacy'))
const SpeakingHistory = lazyRetry(() => import('./pages/student/ielts/speaking/SpeakingHistory.legacy'))
const MockCenter = lazyRetry(() => import('./pages/student/ielts/mock/MockCenter.legacy'))
const MockPreFlight = lazyRetry(() => import('./pages/student/ielts/mock/MockPreFlight.legacy'))
const MockFlow = lazyRetry(() => import('./pages/student/ielts/mock/MockFlow.legacy'))
const MockResult = lazyRetry(() => import('./pages/student/ielts/mock/MockResult.legacy'))
const MockHistory = lazyRetry(() => import('./pages/student/ielts/mock/MockHistory.legacy'))
const IELTSPlanView = lazyRetry(() => import('./pages/student/ielts/plan/IELTSPlanView.legacy'))
const IELTSPlanEdit = lazyRetry(() => import('./pages/student/ielts/plan/IELTSPlanEdit.legacy'))
const ErrorBankHome = lazyRetry(() => import('./pages/student/ielts/errors/ErrorBankHome.legacy'))
const ErrorBankReview = lazyRetry(() => import('./pages/student/ielts/errors/ErrorBankReview.legacy'))
const IELTSGuard = lazyRetry(() => import('./components/ielts/IELTSGuard'))

// IELTS Atelier — production release 2026-05-20 (feature flag removed; routes mounted at /student/ielts-atelier).
const IELTSMasterclassLayout = lazyRetry(() => import('./pages/student/ielts-atelier/_layout/IELTSMasterclassLayout'))
const IELTSAtelierHome           = lazyRetry(() => import('./pages/student/ielts-atelier/Home'))
const IELTSAtelierDiagnostic        = lazyRetry(() => import('./pages/student/ielts-atelier/Diagnostic'))
const IELTSAtelierDiagnosticSession = lazyRetry(() => import('./pages/student/ielts-atelier/DiagnosticSession'))
const IELTSAtelierDiagnosticResults = lazyRetry(() => import('./pages/student/ielts-atelier/DiagnosticResults'))
const IELTSAtelierReading           = lazyRetry(() => import('./pages/student/ielts-atelier/Reading'))
const IELTSAtelierListening      = lazyRetry(() => import('./pages/student/ielts-atelier/Listening'))
const IELTSAtelierWriting        = lazyRetry(() => import('./pages/student/ielts-atelier/Writing'))
const IELTSAtelierSpeaking       = lazyRetry(() => import('./pages/student/ielts-atelier/Speaking'))
const IELTSAtelierJourney        = lazyRetry(() => import('./pages/student/ielts-atelier/Journey'))
const IELTSAtelierErrorsHub      = lazyRetry(() => import('./pages/student/ielts-atelier/Errors/index'))
const IELTSAtelierErrorsReview   = lazyRetry(() => import('./pages/student/ielts-atelier/Errors/ReviewSession'))
const IELTSAtelierErrorsInsights = lazyRetry(() => import('./pages/student/ielts-atelier/Errors/Insights'))
const IELTSAtelierMockHub        = lazyRetry(() => import('./pages/student/ielts-atelier/Mock/index'))
const IELTSAtelierMockSession    = lazyRetry(() => import('./pages/student/ielts-atelier/Mock/MockSession'))
const IELTSAtelierMockResults    = lazyRetry(() => import('./pages/student/ielts-atelier/Mock/MockResults'))
const IELTSAtelierTrainer        = lazyRetry(() => import('./pages/student/ielts-atelier/Trainer'))
const IELTSAtelierReadiness      = lazyRetry(() => import('./pages/student/ielts-atelier/Readiness'))

const TrainerOnboarding = lazyRetry(() => import('./pages/trainer/TrainerOnboarding'))
const TrainerStudentView = lazyRetry(() => import('./pages/trainer/TrainerStudentView.legacy'))
// TrainerCurriculum removed — /trainer/curriculum now redirects to /trainer/interactive-curriculum
const ReportReview = lazyRetry(() => import('./pages/trainer/ReportReview'))
const StudentProgressDetail = lazyRetry(() => import('./pages/trainer/StudentProgressDetail'))
const CockpitPage = lazyRetry(() => import('./pages/trainer/v2/CockpitPage'))
// Trainer V2 pages
const GradingStationPage = lazyRetry(() => import('./pages/trainer/v2/GradingStationPage'))
const ClassDebriefPage = lazyRetry(() => import('./pages/trainer/v2/ClassDebriefPage'))

const HelpPage = lazyRetry(() => import('./pages/trainer/v2/HelpPage'))
const TrainerSettings = lazyRetry(() => import('./pages/trainer/TrainerSettings'))
const AdminSpeakingHubs = lazyRetry(() => import('./pages/admin/AdminSpeakingHubs'))
const AdminSpeakingHubNew = lazyRetry(() => import('./pages/admin/AdminSpeakingHubNew'))
const AdminSpeakingHubDetail = lazyRetry(() => import('./pages/admin/AdminSpeakingHubDetail'))
const StudentSpeakingHubs = lazyRetry(() => import('./pages/student/StudentSpeakingHubs'))
const StudentSpeakingHubDetail = lazyRetry(() => import('./pages/student/StudentSpeakingHubDetail'))
const Student360Page = lazyRetry(() => import('./pages/trainer/v2/Student360Page'))
const StudentActivityReport = lazyRetry(() => import('./pages/shared/StudentActivityReport'))
const IELTSOverview = lazyRetry(() => import('./pages/trainer/IELTSOverview'))
const IELTSStudentDetail = lazyRetry(() => import('./pages/trainer/IELTSStudentDetail'))

// ── Teacher app (ground-up rebuild — replaces the legacy trainer surface) ──
const TeacherHome = lazyRetry(() => import('./pages/teacher/TeacherHome'))
const TeacherStudentsList = lazyRetry(() => import('./pages/teacher/students/StudentsList'))
const TeacherStudentProfile = lazyRetry(() => import('./pages/teacher/students/StudentProfile'))
const TeacherStudentAnswers = lazyRetry(() => import('./pages/teacher/students/StudentAnswers'))
const TeacherWorkReview = lazyRetry(() => import('./pages/teacher/work/WorkReview'))
const TeacherSettings = lazyRetry(() => import('./pages/teacher/TeacherSettings'))
const TeacherCurriculumPreview = lazyRetry(() => import('./pages/teacher/curriculum/TeacherCurriculumPreview'))
const TeacherClassHub = lazyRetry(() => import('./pages/teacher/class/ClassHub'))

const AdminDashboard = lazyRetry(() => import('./pages/admin/AdminDashboard'))
const EvaluationHealthPage = lazyRetry(() => import('./pages/admin/EvaluationHealthPage'))
const StudentProgressDiagnostic = lazyRetry(() => import('./pages/admin/StudentProgressDiagnostic'))
const AdminStudents = lazyRetry(() => import('./pages/admin/AdminStudents'))
const AdminBugReports = lazyRetry(() => import('./pages/admin/AdminBugReports'))
const AdminMonthlyRewards = lazyRetry(() => import('./pages/admin/AdminMonthlyRewards'))
const AdminLibraryFeedback = lazyRetry(() => import('./pages/admin/AdminLibraryFeedback'))
const AdminSubscriptions = lazyRetry(() => import('./pages/admin/AdminSubscriptions'))
const AdminGroups = lazyRetry(() => import('./pages/admin/AdminGroups'))
const AdminTrainers = lazyRetry(() => import('./pages/admin/AdminTrainers'))
const AdminPayments = lazyRetry(() => import('./pages/admin/AdminPayments'))
const AdminReports = lazyRetry(() => import('./pages/admin/AdminReports'))
const AdminReportsHub = lazyRetry(() => import('./pages/admin/reports/AdminReportsHub'))
const AdminReportStudentDetail = lazyRetry(() => import('./pages/admin/reports/StudentReportDetail'))
const AdminSettings = lazyRetry(() => import('./pages/admin/AdminSettings'))
const SystemDiagnostics = lazyRetry(() => import('./pages/admin/SystemDiagnostics'))
const AdminChurnPrediction = lazyRetry(() => import('./pages/admin/AdminChurnPrediction'))
const AdminSmartScheduling = lazyRetry(() => import('./pages/admin/AdminSmartScheduling'))
const AdminContent = lazyRetry(() => import('./pages/admin/AdminContent'))
const AdminWeeklyTasks = lazyRetry(() => import('./pages/admin/AdminWeeklyTasks'))
const AdminHolidays = lazyRetry(() => import('./pages/admin/AdminHolidays'))
const AdminAuditLog = lazyRetry(() => import('./pages/admin/AdminAuditLog'))
const AdminAudioTelemetry = lazyRetry(() => import('./pages/admin/AdminAudioTelemetry'))
const AdminCurriculumQuality = lazyRetry(() => import('./pages/admin/AdminCurriculumQuality'))
const StudentPhrasebook = lazyRetry(() => import('./pages/student/StudentPhrasebook'))
const AdminTestimonials = lazyRetry(() => import('./pages/admin/AdminTestimonials'))
const AdminActionCenter = lazyRetry(() => import('./pages/admin/AdminActionCenter'))
const AdminDataExport = lazyRetry(() => import('./pages/admin/AdminDataExport'))
const AdminCurriculum = lazyRetry(() => import('./pages/admin/curriculum/CurriculumOverview'))
const LevelDetail = lazyRetry(() => import('./pages/admin/curriculum/LevelDetail'))
const UnitEditor = lazyRetry(() => import('./pages/admin/curriculum/UnitEditor'))
const IELTSManagement = lazyRetry(() => import('./pages/admin/curriculum/IELTSManagement'))
const CurriculumProgress = lazyRetry(() => import('./pages/admin/curriculum/CurriculumProgress'))
const CurriculumMap = lazyRetry(() => import('./pages/admin/curriculum/CurriculumMap'))
const ComposeAnnouncement = lazyRetry(() => import('./pages/admin/announcements/ComposeAnnouncement'))
const AdminTestBank = lazyRetry(() => import('./pages/admin/AdminTestBank'))
const AdminAIDashboard = lazyRetry(() => import('./pages/admin/AdminAIDashboard'))
const AdminContentBank = lazyRetry(() => import('./pages/admin/AdminContentBank'))
const AdminDailyReports = lazyRetry(() => import('./pages/admin/AdminDailyReports'))
const AdminAnalytics = lazyRetry(() => import('./pages/admin/AdminAnalytics'))
const CompetitionAdmin = lazyRetry(() => import('./pages/admin/CompetitionAdmin'))
const PlacementQueuePage = lazyRetry(() => import('./pages/admin/PlacementQueuePage'))
const UnitMasteryPage = lazyRetry(() => import('./pages/student/assessment/UnitMasteryPage'))
const UnitMasteryResultPage = lazyRetry(() => import('./pages/student/assessment/UnitMasteryResultPage'))
const UnitMasteryManagerPage = lazyRetry(() => import('./pages/admin/UnitMasteryManagerPage'))

const AdminCurriculumPreview = lazyRetry(() => import('./pages/admin/AdminCurriculumPreview'))
const IELTSAtelierPreview = lazyRetry(() => import('./pages/admin/IELTSAtelierPreview'))
const TrainerCurriculumPreview = lazyRetry(() => import('./pages/trainer/TrainerCurriculumPreview'))
const InteractiveCurriculumLevels = lazyRetry(() => import('./pages/shared/InteractiveCurriculumLevels'))
const InteractiveCurriculumUnits = lazyRetry(() => import('./pages/shared/InteractiveCurriculumUnits'))
const InteractiveCurriculumPage = lazyRetry(() => import('./pages/shared/InteractiveCurriculumPage'))

const SharedReport = lazyRetry(() => import('./pages/public/SharedReport'))
const PublicActivityReport = lazyRetry(() => import('./pages/public/PublicActivityReport'))

const PartnersLanding = lazyRetry(() => import('./pages/partners/PartnersLanding'))
const PartnersSubmitted = lazyRetry(() => import('./pages/partners/PartnersSubmitted'))
const PartnersTerms = lazyRetry(() => import('./pages/partners/PartnersTerms'))
const AffiliatesList = lazyRetry(() => import('./pages/admin/AffiliatesList'))
const AffiliateDetail = lazyRetry(() => import('./pages/admin/AffiliateDetail'))
const AffiliatesDashboard = lazyRetry(() => import('./pages/admin/AffiliatesDashboard'))
const AffiliatePayouts = lazyRetry(() => import('./pages/admin/AffiliatePayouts'))
const AffiliateMaterialsAdmin = lazyRetry(() => import('./pages/admin/AffiliateMaterialsAdmin'))
const MasterclassDesignShowcase = lazyRetry(() => import('./pages/admin/MasterclassDesignShowcase'))
const AtelierStudentPreview = lazyRetry(() => import('./pages/admin/atelier-preview/AtelierStudentPreview'))
const AtelierTrainerPreview = lazyRetry(() => import('./pages/admin/atelier-preview/AtelierTrainerPreview'))
const AtelierAdminPreview   = lazyRetry(() => import('./pages/admin/atelier-preview/AtelierAdminPreview'))
const AudioPlayerTest = lazyRetry(() => import('./pages/dev/AudioPlayerTest'))

// Mock exam (cumulative midterm for A1 + B1)
const MockExamGate = lazyRetry(() => import('./pages/student/mock-exam/MockExamGate'))
const MockExamHub = lazyRetry(() => import('./pages/student/mock-exam/MockExamHub'))
const MockExamAttempt = lazyRetry(() => import('./pages/student/mock-exam/MockExamAttempt'))
const MockExamResult = lazyRetry(() => import('./pages/student/mock-exam/MockExamResult'))
const MockExamResults = lazyRetry(() => import('./pages/trainer/MockExamResults'))

const PartnerLayout = lazyRetry(() => import('./layouts/PartnerLayout'))
const PartnerRoute = lazyRetry(() => import('./components/PartnerRoute'))
const PartnerDashboard = lazyRetry(() => import('./pages/partner/PartnerDashboard'))
const PartnerConversions = lazyRetry(() => import('./pages/partner/PartnerConversions'))
const PartnerPayouts = lazyRetry(() => import('./pages/partner/PartnerPayouts'))
const PartnerMaterials = lazyRetry(() => import('./pages/partner/PartnerMaterials'))
const PartnerSettings = lazyRetry(() => import('./pages/partner/PartnerSettings'))
const PartnerSuspended = lazyRetry(() => import('./pages/partner/PartnerSuspended'))
const PartnerLogin = lazyRetry(() => import('./pages/partner/PartnerLogin'))
const PartnerSetPassword = lazyRetry(() => import('./pages/partner/PartnerSetPassword'))

const ForgotPassword = lazyRetry(() => import('./pages/public/ForgotPassword'))
const ResetPassword = lazyRetry(() => import('./pages/public/ResetPassword'))
const ParentDashboard = lazyRetry(() => import('./pages/public/ParentDashboard'))
const PlacementTest = lazyRetry(() => import('./pages/public/PlacementTest'))
const Testimonials = lazyRetry(() => import('./pages/public/Testimonials'))
const CertificateVerification = lazyRetry(() => import('./pages/public/CertificateVerification'))

// ─── Page wrapper: ErrorBoundary + Suspense ──────────────────
function Page({ children }) {
  return (
    <ErrorBoundary fallback={(error) => <PageErrorFallback error={error} />}>
      <Suspense fallback={<PageSkeleton />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  )
}

// ─── Package-Gated Route Wrapper ─────────────────────────────
// Checks package access at the route level. If locked, shows LockedFeature page.
// ComingSoon pages are handled directly in routes and take priority.
function PackageRoute({ requiredPackage, featureName, children }) {
  const profile = useAuthStore((s) => s.profile)
  const studentData = useAuthStore((s) => s.studentData)
  // Non-students always pass
  if (profile?.role !== 'student') return children
  const pkg = studentData?.package || 'asas'
  if (hasPackageAccess(pkg, requiredPackage)) return children
  return <LockedFeature requiredPackage={requiredPackage} featureName={featureName} />
}

// ─── Page Loading Skeleton ───────────────────────────────────
function PageSkeleton() {
  return (
    <div role="status" aria-busy="true" className="space-y-6 p-2">
      <div className="skeleton h-8 w-48" />
      <div className="skeleton h-4 w-64" />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="skeleton h-24" />
        <div className="skeleton h-24" />
        <div className="skeleton h-24" />
      </div>
      <div className="skeleton h-64 w-full" />
    </div>
  )
}

// ─── Full-screen Boot Screen ─────────────────────────────────
// Shown while authStore.initialize() is running. Must be *visibly* something
// on every device, because the previous skeleton-only version rendered as a
// near-invisible dark page on mobile (skeleton CSS vars are ~2-6% opacity
// white on a dark bg) — users perceived it as "nothing loaded."
//
// After 6 seconds of loading, a reload escape-hatch appears so users aren't
// permanently stuck if the app fails to boot (e.g. stale SW, corrupt token).
function LoadingSkeleton() {
  const [showReload, setShowReload] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setShowReload(true), 6000)
    return () => clearTimeout(t)
  }, [])

  const handleReload = () => {
    // Clear local auth + SW caches to recover from a corrupted boot state,
    // then hard-reload. Wrapped in try/catch so storage errors don't block.
    try { localStorage.removeItem('sw_purge_v3') } catch {}
    try {
      if ('caches' in window) {
        caches.keys().then((names) => Promise.all(names.map((n) => caches.delete(n))))
      }
    } catch {}
    try {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()))
      }
    } catch {}
    window.location.reload()
  }

  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className="min-h-dvh flex items-center justify-center p-8"
      style={{ background: 'var(--surface-base, #060e1c)' }}
    >
      <div className="flex flex-col items-center gap-6 text-center max-w-sm">
        {/* Logo — always visible, independent of CSS vars */}
        <img
          src="/logo-icon-dark.png"
          alt="Fluentia Academy"
          className="h-16 w-16 rounded-2xl"
          style={{ filter: 'drop-shadow(0 0 24px rgba(56,189,248,0.35))' }}
          onError={(e) => { e.currentTarget.style.display = 'none' }}
        />

        {/* Spinner — uses inline styles so it shows even if Tailwind fails to load */}
        <div
          aria-hidden="true"
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: '3px solid rgba(255,255,255,0.12)',
            borderTopColor: '#38bdf8',
            animation: 'fluentia-boot-spin 0.9s linear infinite',
          }}
        />

        {/* Arabic loading text — bright enough to be readable on every screen */}
        <div style={{ color: '#e2e8f0', fontFamily: 'Tajawal, sans-serif' }}>
          <p style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>جاري تحميل أكاديمية طلاقة...</p>
          <p style={{ fontSize: 13, marginTop: 6, color: '#94a3b8' }}>
            لحظات من فضلك
          </p>
        </div>

        {/* Escape hatch — appears after 6s if boot is taking too long */}
        {showReload && (
          <button
            type="button"
            onClick={handleReload}
            style={{
              marginTop: 8,
              padding: '12px 24px',
              borderRadius: 12,
              border: '1px solid rgba(56,189,248,0.35)',
              background: 'rgba(56,189,248,0.12)',
              color: '#7dd3fc',
              fontFamily: 'Tajawal, sans-serif',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              minHeight: 44,
            }}
          >
            التحميل يأخذ وقتاً أطول من المعتاد — اضغط لإعادة المحاولة
          </button>
        )}
      </div>

      {/* Inline keyframes so spinner works even if external CSS is broken */}
      <style>{`
        @keyframes fluentia-boot-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

// ─── Protected Route ─────────────────────────────────────────
function ProtectedRoute({ allowedRoles }) {
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)
  const loading = useAuthStore((s) => s.loading)
  const impersonation = useAuthStore((s) => s.impersonation)
  const _realProfile = useAuthStore((s) => s._realProfile)

  if (loading) return <LoadingSkeleton />
  if (!user) return <Navigate to="/login" replace />

  // Allow admin through when impersonating as another role
  const realRole = impersonation ? _realProfile?.role : profile?.role
  const effectiveRole = profile?.role
  const hasAccess = !allowedRoles
    || allowedRoles.includes(effectiveRole)
    || (realRole === 'admin' && impersonation && allowedRoles.includes(impersonation.role))

  if (!hasAccess) return <Navigate to="/" replace />

  return <Outlet />
}

// ─── Student Status Guard — redirects paused students ─────────
function StudentStatusGuard() {
  const profile = useAuthStore((s) => s.profile)
  const isImpersonating = useAuthStore((s) => s.isImpersonating)
  const navigate = useNavigate()
  const location = useLocation()

  const { data: student } = useQuery({
    queryKey: ['student-status-guard', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('students')
        .select('status')
        .eq('id', profile.id)
        .single()
      return data
    },
    enabled: !!profile?.id && profile?.role === 'student',
    staleTime: 60_000,
  })

  useEffect(() => {
    if (isImpersonating) return
    if (student?.status === 'paused' && location.pathname !== '/account/paused') {
      navigate('/account/paused', { replace: true })
    }
  }, [student, location.pathname, navigate, isImpersonating])

  return <Outlet />
}

// ─── Trainer Onboarding Guard ─────────────────────────────────
function TrainerOnboardingGuard({ children }) {
  const profile = useAuthStore((s) => s.profile)
  const trainerData = useAuthStore((s) => s.trainerData)
  const impersonation = useAuthStore((s) => s.impersonation)
  const _realProfile = useAuthStore((s) => s._realProfile)
  // Admin never needs trainer onboarding (even when impersonating as trainer)
  if (_realProfile?.role === 'admin' || profile?.role === 'admin') {
    return children
  }
  // Only redirect real trainers who haven't completed onboarding
  if (profile?.role === 'trainer' && trainerData && trainerData.onboarding_completed === false) {
    return <Navigate to="/trainer/onboarding" replace />
  }
  return children
}

// ─── Pro Desk home guard — a uses_pro_desk student NEVER sees the normal /student home.
//     Bounces to /desk no matter how they arrived (impersonation, bookmark, nav). ─────────
function StudentHome() {
  const studentData = useAuthStore((s) => s.studentData)
  if (studentData?.uses_pro_desk === true) return <Navigate to="/desk" replace />
  return <StudentDashboard />
}

// ─── Role-Based Redirect ─────────────────────────────────────
function RoleRedirect() {
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)
  const studentData = useAuthStore((s) => s.studentData)
  const loading = useAuthStore((s) => s.loading)

  if (loading) return <LoadingSkeleton />
  if (!user) return <Navigate to="/login" replace />

  switch (profile?.role) {
    case 'student':
      // Pro Desk students → their pro surface; IELTS-first students → the IELTS world
      // is their whole account; everyone else → the normal student home.
      if (studentData?.uses_pro_desk === true) return <Navigate to="/desk" replace />
      if (studentData?.uses_ielts_home === true) return <Navigate to="/student/ielts-atelier" replace />
      return <Navigate to="/student" replace />
    case 'trainer':
      return <Navigate to="/trainer" replace />
    case 'admin':
      return <Navigate to="/admin" replace />
    case 'affiliate':
      return <Navigate to="/partner" replace />
    case 'agent':
      return <Navigate to="/team" replace />
    case 'coordinator':
      return <Navigate to="/coordinator" replace />
    default:
      return <Navigate to="/login" replace />
  }
}

// ─── IELTS-first account bounce ──────────────────────────────
// For students whose whole account is the IELTS world (students.uses_ielts_home),
// the general student home is not their surface — send them into the Atelier.
// EXCEPTION: returning students with students.keep_academy_access keep BOTH —
// IELTS is their landing (RoleRedirect), but their old curriculum/level stays
// reachable at /student (a nav item in the Atelier links back). Nothing hidden.
// Staff (incl. admins viewing directly) keep normal /student access.
function IELTSHomeBounce({ children }) {
  const studentData = useAuthStore((s) => s.studentData)
  const profile = useAuthStore((s) => s.profile)
  const loading = useAuthStore((s) => s.loading)
  if (loading) return null
  const isStaff = profile?.role === 'admin' || profile?.role === 'trainer'
  if (!isStaff && studentData?.uses_ielts_home === true && studentData?.keep_academy_access !== true) {
    return <Navigate to="/student/ielts-atelier" replace />
  }
  return children
}

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  const initialize = useAuthStore((s) => s.initialize)
  const profile = useAuthStore((s) => s.profile)

  useEffect(() => {
    initialize()
  }, [initialize])

  // Report device presence for install tracking (runs once per session after auth)
  useEffect(() => {
    if (!profile?.id) return
    import('./utils/reportDevicePresence').then(({ reportDevicePresence }) => {
      reportDevicePresence(profile.id)
    }).catch(() => {})
  }, [profile?.id])

  // Idle-return handler: check session validity on tab focus, redirect if dead,
  // invalidate only stale queries (not all active ones) if session is alive.
  // TOKEN_REFRESHED no longer triggers invalidation, so this is the sole recovery path.
  const lastVisibleCheck = useRef(0)

  useEffect(() => {
    const publicPaths = ['/login', '/forgot-password', '/reset-password', '/test', '/testimonials', '/parent']
    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return
      if (publicPaths.some(p => window.location.pathname.startsWith(p))) return

      const now = Date.now()
      if (now - lastVisibleCheck.current < 10_000) return // throttle 10s
      lastVisibleCheck.current = now

      try {
        const { data, error } = await supabase.auth.getSession()
        if (error || !data?.session) {
          if (window.location.pathname !== '/login') window.location.href = '/login'
          return
        }
        // Session alive — only refetch queries already marked stale (per staleTime=60s).
        // refetchType: 'inactive' targets stale queries in cache without firing
        // all currently-mounted queries at once.
        queryClient.invalidateQueries({ refetchType: 'inactive' })
      } catch (e) {
        console.warn('[visibility]', e)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  // Keepalive: ping session every 4 min to prevent silent expiry during long idle.
  // Guard via window.__fluentiaKeepalive to survive HMR without duplicate timers.
  useEffect(() => {
    if (window.__fluentiaKeepalive) clearInterval(window.__fluentiaKeepalive)
    window.__fluentiaKeepalive = setInterval(() => {
      supabase.auth.getSession().catch(() => {})
    }, 4 * 60 * 1000)
    return () => {
      if (window.__fluentiaKeepalive) {
        clearInterval(window.__fluentiaKeepalive)
        window.__fluentiaKeepalive = null
      }
    }
  }, [])

  return (
    <ErrorBoundary>
      <LanguageBootstrap>
      <BrowserRouter>
        <ToastProvider>
        <ThemeProvider />
        <SidebarMetricsObserver />
        <AuroraBackground />
        <OfflineBanner />
        <ImpersonationBanner />
        <ForcePasswordChange />
        <OnboardingModal />
        <GamificationProvider />
        <GlobalSearch />

        <Routes>
          <Route path="/" element={<RoleRedirect />} />

          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/r/:token" element={<Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full" /></div>}><SharedReport /></Suspense>} />
          <Route path="/report/:token" element={<Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full" /></div>}><PublicActivityReport /></Suspense>} />
          <Route path="/forgot-password" element={
            <ErrorBoundary fallback={<PageErrorFallback />}>
              <Suspense fallback={<LoadingSkeleton />}><ForgotPassword /></Suspense>
            </ErrorBoundary>
          } />
          <Route path="/reset-password" element={
            <ErrorBoundary fallback={<PageErrorFallback />}>
              <Suspense fallback={<LoadingSkeleton />}><ResetPassword /></Suspense>
            </ErrorBoundary>
          } />
          <Route path="/parent" element={
            <ErrorBoundary fallback={<PageErrorFallback />}>
              <Suspense fallback={<LoadingSkeleton />}><ParentDashboard /></Suspense>
            </ErrorBoundary>
          } />
          <Route path="/test" element={
            <ErrorBoundary fallback={<PageErrorFallback />}>
              <Suspense fallback={<LoadingSkeleton />}><PlacementTest /></Suspense>
            </ErrorBoundary>
          } />
          <Route path="/testimonials" element={
            <ErrorBoundary fallback={<PageErrorFallback />}>
              <Suspense fallback={<LoadingSkeleton />}><Testimonials /></Suspense>
            </ErrorBoundary>
          } />
          <Route path="/verify/:certId" element={
            <ErrorBoundary fallback={<PageErrorFallback />}>
              <Suspense fallback={<LoadingSkeleton />}><CertificateVerification /></Suspense>
            </ErrorBoundary>
          } />
          <Route path="/partners" element={
            <ErrorBoundary fallback={<PageErrorFallback />}>
              <Suspense fallback={<LoadingSkeleton />}><PartnersLanding /></Suspense>
            </ErrorBoundary>
          } />
          <Route path="/partners/submitted" element={
            <ErrorBoundary fallback={<PageErrorFallback />}>
              <Suspense fallback={<LoadingSkeleton />}><PartnersSubmitted /></Suspense>
            </ErrorBoundary>
          } />
          <Route path="/partners/terms" element={
            <ErrorBoundary fallback={<PageErrorFallback />}>
              <Suspense fallback={<LoadingSkeleton />}><PartnersTerms /></Suspense>
            </ErrorBoundary>
          } />

          {/* Account paused — outside student layout, no sidebar */}
          <Route path="/account/paused" element={
            <Suspense fallback={<LoadingSkeleton />}><AccountPausedPage /></Suspense>
          } />

          {/* Chat routes — accessible to all authenticated roles.
              StudentStatusGuard redirects paused students; trainers/admins pass through. */}
          <Route element={<ProtectedRoute allowedRoles={['student','trainer','admin']} />}>
            <Route element={<StudentStatusGuard />}>
              <Route element={<ErrorBoundary><LayoutShell /></ErrorBoundary>}>
                <Route path="/chat" element={<Page><ChatHome /></Page>} />
                <Route path="/chat/dm/:threadId" element={<Page><DMChatPage /></Page>} />
                <Route path="/chat/:groupId" element={<Page><GroupChatPage /></Page>} />
                <Route path="/chat/:groupId/:channelSlug" element={<Page><GroupChatPage /></Page>} />
                <Route path="/chat/:groupId/:channelSlug/m/:messageId" element={<Page><GroupChatPage /></Page>} />
                {/* مكتبة طلاقة — Fluentia Library (novels). Shared route; admin reviews here. */}
                <Route path="/library" element={<Page><LibraryHome /></Page>} />
                <Route path="/library/:bookId" element={<Page><LibraryBook /></Page>} />
                <Route path="/library/:bookId/read/:chapterId" element={<Page><LibraryReader /></Page>} />
              </Route>
            </Route>
          </Route>

          {/* Student routes */}
          <Route element={<ProtectedRoute allowedRoles={['student']} />}>
            <Route element={<StudentStatusGuard />}>
            <Route element={<ErrorBoundary><LayoutShell /></ErrorBoundary>}>
              <Route path="/student" element={<IELTSHomeBounce><Page><StudentHome /></Page></IELTSHomeBounce>} />
              {/* Individual (1-on-1) professional track */}
              <Route path="/student/track" element={<Page><IndividualTrackHome /></Page>} />
              <Route path="/student/track/:moduleId" element={<Page><IndividualModulePage /></Page>} />
              <Route path="/student/assignments" element={<Page><StudentAssignments /></Page>} />
              <Route path="/student/study-plan" element={<Page><StudentStudyPlan /></Page>} />
              <Route path="/student/grades" element={<Page><PackageRoute requiredPackage="talaqa" featureName="الدرجات والنتائج"><StudentGrades /></PackageRoute></Page>} />
              <Route path="/student/speaking" element={<Page><ComingSoon featureName="معمل التحدث" /></Page>} />
              <Route path="/student/speaking-lab" element={<Page><ComingSoon featureName="معمل التحدث" /></Page>} />
              <Route path="/student/library" element={<Page><StudentLibrary /></Page>} />
              <Route path="/student/everyday-english" element={<Page><StudentEverydayEnglish /></Page>} />
              <Route path="/student/sentence-builder" element={<Page><StudentSentenceBuilder /></Page>} />
              <Route path="/student/leaderboard" element={<Page><StudentLeaderboard /></Page>} />
              <Route path="/student/recognition" element={<Page><StudentPeerRecognition /></Page>} />
              <Route path="/student/activity" element={<Page><StudentActivityFeed /></Page>} />
              <Route path="/student/duels" element={<Page><StudentDuels /></Page>} />
              <Route path="/student/competition" element={<Page><CompetitionHub /></Page>} />
              <Route path="/student/competition/rules" element={<Page><CompetitionRules /></Page>} />
              <Route path="/student/how-to-earn" element={<Page><HowToEarnPage /></Page>} />
              <Route path="/student/chat" element={<Page><StudentGroupChat /></Page>} />
              <Route path="/student/messages" element={<Page><StudentMessages /></Page>} />
              <Route path="/student/ai-chat" element={<Page><PackageRoute requiredPackage="talaqa" featureName="المساعد الذكي"><StudentChatbot /></PackageRoute></Page>} />
              {/* Legacy vocab bank (vocabulary_bank table) retired → live "المفردات" page is /student/flashcards */}
              <Route path="/student/vocabulary" element={<Navigate to="/student/flashcards" replace />} />
              {/* Duplicate of the unified review surface → redirect to /student/srs */}
              <Route path="/student/daily-review" element={<Navigate to="/student/srs" replace />} />
              <Route path="/student/srs" element={<Page><SrsHome /></Page>} />
              <Route path="/student/hard-words" element={<Page><HardWordsHome /></Page>} />
              <Route path="/student/level-exit-test/:levelId" element={<Page><LevelExitTest /></Page>} />
              <Route path="/student/level-journey" element={<Page><LevelJourneyMap /></Page>} />
              {/* "المفردات" is now the Path of Light journey; the old flashcard browse stays reachable */}
              <Route path="/student/vocab-journey" element={<Page><VocabJourney /></Page>} />
              <Route path="/student/flashcards" element={<Page><VocabularyFlashcards /></Page>} />
              <Route path="/student/course-vocab" element={<Page><CourseVocabulary /></Page>} />
              <Route path="/student/billing" element={<Page><StudentBilling /></Page>} />
              <Route path="/student/exercises" element={<Page><StudentExercises /></Page>} />
              <Route path="/student/my-patterns" element={<Page><StudentErrorPatterns /></Page>} />
              <Route path="/student/voice-journal" element={<Page><StudentVoiceJournal /></Page>} />
              {/* Retention — Module 2 (Smart Homework) — gated per-student via retention_modules */}
              <Route path="/student/retention/homework" element={<Page><HomeworkLanding /></Page>} />
              <Route path="/student/retention/homework/play/:setId" element={<Page><HomeworkPlay /></Page>} />
              <Route path="/student/retention/homework/result/:setId" element={<Page><HomeworkResult /></Page>} />
              {/* Retention — Module 5 (Lesson Briefs) */}
              <Route path="/student/retention/brief/:deliveryId" element={<Page><BriefView /></Page>} />
              {/* Retention — Module 1 (Daily Practice Partner) */}
              <Route path="/student/retention/daily-partner" element={<Page><DailyPartnerLanding /></Page>} />
              <Route path="/student/retention/daily-partner/play/:attemptId" element={<Page><DailyPartnerPlay /></Page>} />
              <Route path="/student/retention/daily-partner/result/:attemptId" element={<Page><DailyPartnerResult /></Page>} />
              {/* Retention — Module 3 (Weekly Reports) */}
              <Route path="/student/retention/reports" element={<Page><MyReports /></Page>} />
              <Route path="/student/retention/reports/:id" element={<Page><ReportDetail /></Page>} />
              {/* PRONUNCIATION-HIDDEN 2026-05-19 — route + element retired. */}
              {/* <Route path="/student/pronunciation" element={<Page><StudentPronunciation /></Page>} /> */}
              <Route path="/student/battles" element={<Page><StudentStreakBattles /></Page>} />
              <Route path="/student/success" element={<Page><StudentSuccessStories /></Page>} />
              <Route path="/student/events" element={<Page><StudentEvents /></Page>} />
              <Route path="/student/avatar" element={<Page><StudentAvatar /></Page>} />
              <Route path="/student/assessments" element={<Page><ComingSoon featureName="الاختبارات" /></Page>} />
              <Route path="/student/quiz" element={<Page><StudentQuiz /></Page>} />
              <Route path="/student/profile" element={<Page><StudentProfile /></Page>} />
              <Route path="/student/my-reports" element={<Page><MyBugReports /></Page>} />
              <Route path="/student/speaking-hub" element={<Page><StudentSpeakingHubs /></Page>} />
              <Route path="/student/speaking-hub/:id" element={<Page><StudentSpeakingHubDetail /></Page>} />
              <Route path="/student/certificates" element={<Page><StudentCertificate /></Page>} />
              <Route path="/student/referral" element={<Page><StudentReferral /></Page>} />
              <Route path="/student/weekly-tasks" element={<Page><StudentWeeklyTasks /></Page>} />
              <Route path="/student/weekly-tasks/:id" element={<Page><StudentWeeklyTaskDetail /></Page>} />
              {/* Legacy StudentSpelling (spelling_words table) retired → /student/spelling-lab */}
              <Route path="/student/spelling" element={<Navigate to="/student/spelling-lab" replace />} />
              <Route path="/student/spelling-lab" element={<Page><SpellingLab /></Page>} />
              <Route path="/student/phrasebook" element={<Page><StudentPhrasebook /></Page>} />
              <Route path="/student/verbs" element={<Page><IrregularVerbsPractice /></Page>} />
              <Route path="/student/writing-lab" element={<Page><ComingSoon featureName="معمل الكتابة" /></Page>} />
              <Route path="/student/group-activity" element={<Page><PackageRoute requiredPackage="talaqa" featureName="نشاط المجموعة"><StudentGroupActivity /></PackageRoute></Page>} />
              <Route path="/student/adaptive-test" element={<Page><PackageRoute requiredPackage="talaqa" featureName="اختبار المستوى"><StudentAdaptiveTest /></PackageRoute></Page>} />
              <Route path="/student/ai-insights" element={<Page><PackageRoute requiredPackage="talaqa" featureName="رؤى ذكية"><StudentAIInsights /></PackageRoute></Page>} />
              <Route path="/student/progress" element={<Page><ProgressDashboard /></Page>} />
              <Route path="/student/progress-reports" element={<Page><StudentProgressReports /></Page>} />
              <Route path="/student/progress-reports/:id" element={<Page><StudentReportView /></Page>} />
              <Route path="/student/curriculum" element={<Page><CurriculumBrowser /></Page>} />
              <Route path="/student/curriculum/level/:levelNumber" element={<Page><LevelUnits /></Page>} />
              <Route path="/student/curriculum/unit/:unitId" element={<Page><UnitContentRouter /></Page>} />
              <Route path="/student/curriculum-old" element={<Page><StudentCurriculum /></Page>} />
              {/* Mock exam (cumulative midterm — preview-gated server-side) */}
              <Route path="/student/mock-exam" element={<Page><MockExamGate /></Page>}>
                <Route index element={<MockExamHub />} />
                <Route path="attempt" element={<MockExamAttempt />} />
                <Route path="result" element={<MockExamResult />} />
              </Route>
              <Route path="/student/style-preview" element={<Page><StylePreview /></Page>} />
              <Route path="/student/placement-test" element={<Suspense fallback={null}><PlacementTestPage /></Suspense>} />
              <Route path="/student/placement-test/results/:sessionId" element={<Suspense fallback={null}><PlacementResultsPage /></Suspense>} />
              <Route path="/student/unit-mastery/:assessmentId" element={<Suspense fallback={null}><UnitMasteryPage /></Suspense>} />
              <Route path="/student/unit-mastery-result/:attemptId" element={<Suspense fallback={null}><UnitMasteryResultPage /></Suspense>} />
              {/* V1 IELTS retired 2026-05-20 — every path redirects to the IELTS Atelier.
                  Original V1 page components live as .legacy.jsx archives under src/pages/student/ielts/.
                  Deep V1 sub-routes (per-skill, per-passage, per-task, per-attempt) fan in to the
                  closest Atelier surface; the Atelier collapses those sub-routes into the parent skill page. */}
              <Route path="/student/ielts" element={<Navigate to="/student/ielts-atelier" replace />} />
              <Route path="/student/ielts/diagnostic" element={<Navigate to="/student/ielts-atelier/diagnostic" replace />} />
              <Route path="/student/ielts/reading" element={<Navigate to="/student/ielts-atelier/reading" replace />} />
              <Route path="/student/ielts/reading/skill/:questionType" element={<Navigate to="/student/ielts-atelier/reading" replace />} />
              <Route path="/student/ielts/reading/passage/:passageId" element={<Navigate to="/student/ielts-atelier/reading" replace />} />
              <Route path="/student/ielts/listening" element={<Navigate to="/student/ielts-atelier/listening" replace />} />
              <Route path="/student/ielts/listening/section/:sectionNumber" element={<Navigate to="/student/ielts-atelier/listening" replace />} />
              <Route path="/student/ielts/listening/section/:sectionNumber/practice/:sectionId" element={<Navigate to="/student/ielts-atelier/listening" replace />} />
              <Route path="/student/ielts/writing" element={<Navigate to="/student/ielts-atelier/writing" replace />} />
              <Route path="/student/ielts/writing/history" element={<Navigate to="/student/ielts-atelier/writing" replace />} />
              <Route path="/student/ielts/writing/feedback/:submissionId" element={<Navigate to="/student/ielts-atelier/writing" replace />} />
              <Route path="/student/ielts/writing/:category" element={<Navigate to="/student/ielts-atelier/writing" replace />} />
              <Route path="/student/ielts/writing/:category/task/:taskId" element={<Navigate to="/student/ielts-atelier/writing" replace />} />
              <Route path="/student/ielts/speaking" element={<Navigate to="/student/ielts-atelier/speaking" replace />} />
              <Route path="/student/ielts/speaking/history" element={<Navigate to="/student/ielts-atelier/speaking" replace />} />
              <Route path="/student/ielts/speaking/feedback/:sessionId" element={<Navigate to="/student/ielts-atelier/speaking" replace />} />
              <Route path="/student/ielts/speaking/part/:partNum" element={<Navigate to="/student/ielts-atelier/speaking" replace />} />
              <Route path="/student/ielts/speaking/session/:questionId" element={<Navigate to="/student/ielts-atelier/speaking" replace />} />
              <Route path="/student/ielts/mock" element={<Navigate to="/student/ielts-atelier/mock" replace />} />
              <Route path="/student/ielts/mock/history" element={<Navigate to="/student/ielts-atelier/mock" replace />} />
              <Route path="/student/ielts/mock/brief/:mockId" element={<Navigate to="/student/ielts-atelier/mock" replace />} />
              <Route path="/student/ielts/mock/attempt/:attemptId" element={<Navigate to="/student/ielts-atelier/mock" replace />} />
              <Route path="/student/ielts/mock/result/:resultId" element={<Navigate to="/student/ielts-atelier/mock" replace />} />
              <Route path="/student/ielts/plan" element={<Navigate to="/student/ielts-atelier/journey" replace />} />
              <Route path="/student/ielts/plan/edit" element={<Navigate to="/student/ielts-atelier/journey" replace />} />
              <Route path="/student/ielts/errors" element={<Navigate to="/student/ielts-atelier/errors" replace />} />
              <Route path="/student/ielts/errors/review" element={<Navigate to="/student/ielts-atelier/errors/review" replace />} />
              <Route path="/student/ielts/:section" element={<Navigate to="/student/ielts-atelier" replace />} />

              {/* IELTS Atelier — production release 2026-05-20.
                  Package gating handled by IELTSGuard via hasIELTSAccess (ielts + tamayuz + custom_access). */}
              <Route path="/student/ielts-atelier" element={<Suspense fallback={<PageSkeleton />}><IELTSGuard /></Suspense>}>
                <Route element={<IELTSMasterclassLayout />}>
                  <Route index element={<IELTSAtelierHome />} />
                  <Route path="diagnostic" element={<IELTSAtelierDiagnostic />} />
                  <Route path="diagnostic/session/:attemptId" element={<IELTSAtelierDiagnosticSession />} />
                  <Route path="diagnostic/results" element={<IELTSAtelierDiagnosticResults />} />
                  <Route path="reading"    element={<IELTSAtelierReading />} />
                  <Route path="listening"  element={<IELTSAtelierListening />} />
                  <Route path="writing"    element={<IELTSAtelierWriting />} />
                  <Route path="speaking"   element={<IELTSAtelierSpeaking />} />
                  <Route path="journey"    element={<IELTSAtelierJourney />} />
                  <Route path="errors"          element={<IELTSAtelierErrorsHub />} />
                  <Route path="errors/review"  element={<IELTSAtelierErrorsReview />} />
                  <Route path="errors/insights" element={<IELTSAtelierErrorsInsights />} />
                  <Route path="mock"                    element={<IELTSAtelierMockHub />} />
                  <Route path="mock/:attemptId"         element={<IELTSAtelierMockSession />} />
                  <Route path="mock/:attemptId/results" element={<IELTSAtelierMockResults />} />
                  <Route path="trainer"    element={<IELTSAtelierTrainer />} />
                  <Route path="readiness"  element={<IELTSAtelierReadiness />} />
                </Route>
              </Route>

              {/* Legacy V3 path redirects — safe to remove after 90 days (2026-08-18). */}
              <Route path="/student/ielts-v2" element={<Navigate to="/student/ielts-atelier" replace />} />
              <Route path="/student/ielts-v2/*" element={<Navigate to="/student/ielts-atelier" replace />} />
            </Route>
            </Route>
          </Route>

          {/* Pro Desk — gated professional-English surface (/desk/*). Its own shell + guard;
              never opens the shared student pages, so it can't regress any other student. */}
          <Route element={<ProtectedRoute allowedRoles={['student','trainer','admin']} />}>
            <Route element={<StudentStatusGuard />}>
              <Route element={<DeskGuard />}>
                <Route element={<ErrorBoundary><DeskShell /></ErrorBoundary>}>
                  <Route path="/desk" element={<Page><DeskToday /></Page>} />
                  <Route path="/desk/daily" element={<Page><DeskDaily /></Page>} />
                  <Route path="/desk/reading" element={<Page><DeskReading /></Page>} />
                  <Route path="/desk/reading/:readingId" element={<Page><DeskReadingPassage /></Page>} />
                  <Route path="/desk/daily/vocab" element={<Page><DeskVocab /></Page>} />
                  <Route path="/desk/daily/grammar" element={<Page><DeskGrammar /></Page>} />
                  <Route path="/desk/daily/grammar/:pointId" element={<Page><DeskGrammarPoint /></Page>} />
                  <Route path="/desk/classes" element={<Page><DeskClasses /></Page>} />
                  <Route path="/desk/classes/:classId" element={<Page><DeskClass /></Page>} />
                  <Route path="/desk/classes/:classId/:chapterId" element={<Page><DeskClassChapter /></Page>} />
                  <Route path="/desk/track" element={<Page><DeskTrack /></Page>} />
                  <Route path="/desk/track/:lessonId" element={<Page><DeskLesson /></Page>} />
                  <Route path="/desk/scenarios" element={<Page><DeskScenarios /></Page>} />
                  <Route path="/desk/scenarios/:moduleId" element={<Page><DeskScenarioPlayer /></Page>} />
                  <Route path="/desk/phrasebank" element={<Page><DeskPhrasebook /></Page>} />
                  <Route path="/desk/growth" element={<Page><DeskGrowth /></Page>} />
                </Route>
              </Route>
            </Route>
          </Route>

          {/* Trainer routes */}
          <Route element={<ProtectedRoute allowedRoles={['trainer', 'admin']} />}>
            {/* Onboarding retired — teachers land directly on the new home */}
            <Route path="/trainer/onboarding" element={<Navigate to="/trainer" replace />} />
            <Route element={<ErrorBoundary><TeacherLayout /></ErrorBoundary>}>
              {/* ── New teacher app ── */}
              <Route path="/trainer" element={<Page><TeacherHome /></Page>} />
              <Route path="/trainer/students" element={<Page><TeacherStudentsList /></Page>} />
              <Route path="/trainer/students/:studentId" element={<Page><TeacherStudentProfile /></Page>} />
              <Route path="/trainer/students/:studentId/answers" element={<Page><TeacherStudentAnswers /></Page>} />
              <Route path="/trainer/students/:studentId/report" element={<Page><StudentActivityReport /></Page>} />
              <Route path="/trainer/work" element={<Page><TeacherWorkReview /></Page>} />
              <Route path="/trainer/class" element={<Page><TeacherClassHub /></Page>} />
              <Route path="/trainer/schedule" element={<Page><TeacherSchedule /></Page>} />
              <Route path="/trainer/curriculum" element={<Page><TeacherCurriculumPreview><CurriculumBrowser /></TeacherCurriculumPreview></Page>} />
              <Route path="/trainer/curriculum/level/:levelNumber" element={<Page><TeacherCurriculumPreview><LevelUnits /></TeacherCurriculumPreview></Page>} />
              <Route path="/trainer/curriculum/unit/:unitId" element={<Page><TeacherCurriculumPreview><UnitContentRouter /></TeacherCurriculumPreview></Page>} />
              <Route path="/trainer/settings" element={<Page><TeacherSettings /></Page>} />

              {/* IELTS trainer surface — roster of IELTS students + per-student detail (mocks/plan/errors/sessions) */}
              <Route path="/trainer/ielts" element={<Page><IELTSOverview /></Page>} />
              <Route path="/trainer/ielts/:studentId" element={<Page><IELTSStudentDetail /></Page>} />

              {/* ── Back-compat: old singular /trainer/student/:id deep links ── */}
              <Route path="/trainer/student/:studentId" element={<Page><TeacherStudentProfile /></Page>} />
              <Route path="/trainer/student/:studentId/answers" element={<Page><TeacherStudentAnswers /></Page>} />
              <Route path="/trainer/student/:studentId/report" element={<Page><StudentActivityReport /></Page>} />
              <Route path="/trainer/student/:studentId/progress" element={<Page><TeacherStudentProfile /></Page>} />

              {/* ── Retired surfaces → nearest new home ── */}
              <Route path="/trainer/grading" element={<Navigate to="/trainer/work" replace />} />
              <Route path="/trainer/mock-exam-results" element={<Navigate to="/trainer/work" replace />} />
              <Route path="/trainer/student-curriculum" element={<Navigate to="/trainer/curriculum" replace />} />
              <Route path="/trainer/student-curriculum/level/:levelNumber" element={<Navigate to="/trainer/curriculum" replace />} />
              <Route path="/trainer/student-curriculum/unit/:unitId" element={<Navigate to="/trainer/curriculum" replace />} />
              <Route path="/trainer/interactive-curriculum" element={<Navigate to="/trainer/curriculum" replace />} />
              <Route path="/trainer/debrief/:summaryId" element={<Navigate to="/trainer" replace />} />
              <Route path="/trainer/progress-reports/:id/review" element={<Navigate to="/trainer" replace />} />
              <Route path="/trainer/nabih/:conversationId" element={<Navigate to="/trainer" replace />} />
              {['/trainer/help', '/trainer/prep', '/trainer/live', '/trainer/competition',
                '/trainer/my-growth', '/trainer/nabih', '/trainer/ai-assistant', '/trainer/notes', '/trainer/library',
                '/trainer/points', '/trainer/chat', '/trainer/messages', '/trainer/my-notes', '/trainer/weekly-report',
                '/trainer/attendance', '/trainer/lesson-planner', '/trainer/quiz', '/trainer/teams', '/trainer/reports',
                '/trainer/progress-matrix'].map(p => (
                <Route key={p} path={p} element={<Navigate to="/trainer" replace />} />
              ))}
              {['/trainer/assignments', '/trainer/writing', '/trainer/weekly-grading'].map(p => (
                <Route key={p} path={p} element={<Navigate to="/trainer/work" replace />} />
              ))}
              {['/trainer/interventions', '/trainer/student-notes', '/trainer/my-students'].map(p => (
                <Route key={p} path={p} element={<Navigate to="/trainer/students" replace />} />
              ))}
            </Route>
          </Route>

          {/* CS Team workspace (agent + admin) */}
          <Route element={<ProtectedRoute allowedRoles={['agent', 'admin']} />}>
            <Route element={<ErrorBoundary><LayoutShell /></ErrorBoundary>}>
              <Route path="/team" element={<Page><TeamWorkspace /></Page>}>
                <Route index element={<Navigate to="/team/pipeline" replace />} />
                <Route path="pipeline" element={<Page><TeamPipeline /></Page>} />
                <Route path="followups" element={<Page><TeamFollowups /></Page>} />
                <Route path="schedule" element={<Page><TeamSchedule /></Page>} />
              </Route>
            </Route>
          </Route>

          {/* Class-coordinator workspace (coordinator + admin) */}
          <Route element={<ProtectedRoute allowedRoles={['coordinator', 'admin']} />}>
            <Route element={<ErrorBoundary><LayoutShell /></ErrorBoundary>}>
              <Route path="/coordinator" element={<Page><CoordinatorWorkspace /></Page>}>
                <Route index element={<Page><CoordinatorWeek /></Page>} />
                <Route path="schedules" element={<Page><SchedulesList /></Page>} />
              </Route>
            </Route>
          </Route>

          {/* Admin routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route element={<ErrorBoundary><LayoutShell /></ErrorBoundary>}>
              <Route path="/admin" element={<Page><AdminDashboard /></Page>} />
              <Route path="/admin/users" element={<Page><AdminStudents /></Page>} />
              <Route path="/admin/groups" element={<Page><AdminGroups /></Page>} />
              <Route path="/admin/trainers" element={<Page><AdminTrainers /></Page>} />
              <Route path="/admin/packages" element={<Page><AdminPayments /></Page>} />
              <Route path="/admin/reports" element={<Page><AdminReportsHub /></Page>} />
              <Route path="/admin/reports/student/:studentId" element={<Page><AdminReportStudentDetail /></Page>} />
              {/* legacy reports page — archived, reachable, never deleted (hide-don't-delete rule) */}
              <Route path="/admin/reports-legacy" element={<Page><AdminReports /></Page>} />
              <Route path="/admin/cs-performance" element={<Page><CsPerformance /></Page>} />
              <Route path="/admin/integrations" element={<Page><CsIntegrations /></Page>} />
              <Route path="/admin/team" element={<Page><AdminTeam /></Page>} />
              <Route path="/admin/bug-reports" element={<Page><AdminBugReports /></Page>} />
              <Route path="/admin/monthly-rewards" element={<Page><AdminMonthlyRewards /></Page>} />
              <Route path="/admin/library-feedback" element={<Page><AdminLibraryFeedback /></Page>} />
              <Route path="/admin/subscriptions" element={<Page><AdminSubscriptions /></Page>} />
              {/* Retention — admin */}
              <Route path="/admin/retention" element={<Page><AdminRetentionMasterSwitch /></Page>} />
              <Route path="/admin/retention/reports" element={<Page><AdminRetentionReports /></Page>} />
              <Route path="/admin/mock-exam-results" element={<Page><MockExamResults /></Page>} />
              <Route path="/admin/churn" element={<Page><AdminChurnPrediction /></Page>} />
              <Route path="/admin/scheduling" element={<Page><AdminSmartScheduling /></Page>} />
              <Route path="/admin/content" element={<Page><AdminContent /></Page>} />
              <Route path="/admin/settings" element={<Page><AdminSettings /></Page>} />
              <Route path="/admin/system" element={<Page><SystemDiagnostics /></Page>} />
              <Route path="/admin/weekly-tasks" element={<Page><AdminWeeklyTasks /></Page>} />
              <Route path="/admin/holidays" element={<Page><AdminHolidays /></Page>} />
              <Route path="/admin/progress-diagnostic" element={<Page><StudentProgressDiagnostic /></Page>} />
              <Route path="/admin/audit-log" element={<Page><AdminAuditLog /></Page>} />
              <Route path="/admin/audio-telemetry" element={<Page><AdminAudioTelemetry /></Page>} />
              <Route path="/admin/curriculum-quality" element={<Page><AdminCurriculumQuality /></Page>} />
              <Route path="/admin/testimonials" element={<Page><AdminTestimonials /></Page>} />
              <Route path="/admin/today" element={<Page><AdminActionCenter /></Page>} />
              <Route path="/admin/export" element={<Page><AdminDataExport /></Page>} />
              <Route path="/admin/curriculum" element={<Page><AdminCurriculum /></Page>} />
              <Route path="/admin/curriculum/level/:levelId" element={<Page><LevelDetail /></Page>} />
              <Route path="/admin/curriculum/unit/:unitId" element={<Page><UnitEditor /></Page>} />
              <Route path="/admin/curriculum/ielts" element={<Page><IELTSManagement /></Page>} />
              <Route path="/admin/curriculum/progress" element={<Page><CurriculumProgress /></Page>} />
              <Route path="/admin/curriculum/map" element={<Page><CurriculumMap /></Page>} />
              <Route path="/admin/test-bank" element={<Page><AdminTestBank /></Page>} />
              <Route path="/admin/ai-dashboard" element={<Page><AdminAIDashboard /></Page>} />
              <Route path="/admin/content-bank" element={<Page><AdminContentBank /></Page>} />
              <Route path="/admin/daily-reports" element={<Page><AdminDailyReports /></Page>} />
              <Route path="/admin/evaluation-health" element={<Page><EvaluationHealthPage /></Page>} />
              <Route path="/admin/announcements" element={<Page><ComposeAnnouncement /></Page>} />
              <Route path="/admin/analytics" element={<Page><AdminAnalytics /></Page>} />
              <Route path="/admin/placement-queue" element={<Page><PlacementQueuePage /></Page>} />
              <Route path="/admin/unit-mastery" element={<Page><UnitMasteryManagerPage /></Page>} />
              <Route path="/admin/competition" element={<Page><CompetitionAdmin /></Page>} />
              <Route path="/admin/affiliates" element={<Page><AffiliatesList /></Page>} />
              <Route path="/admin/affiliates/dashboard" element={<Page><AffiliatesDashboard /></Page>} />
              <Route path="/admin/affiliates/payouts" element={<Page><AffiliatePayouts /></Page>} />
              <Route path="/admin/affiliates/materials" element={<Page><AffiliateMaterialsAdmin /></Page>} />
              <Route path="/admin/affiliates/:id" element={<Page><AffiliateDetail /></Page>} />
              <Route path="/admin/ielts-atelier-preview" element={<Page><IELTSAtelierPreview /></Page>} />
              <Route path="/admin/ielts-v2-preview" element={<Navigate to="/admin/ielts-atelier-preview" replace />} />
              <Route path="/admin/speaking-hubs" element={<Page><AdminSpeakingHubs /></Page>} />
              <Route path="/admin/speaking-hubs/new" element={<Page><AdminSpeakingHubNew /></Page>} />
              <Route path="/admin/speaking-hubs/:id" element={<Page><AdminSpeakingHubDetail /></Page>} />
              <Route path="/admin/student-curriculum" element={<Page><AdminCurriculumPreview><CurriculumBrowser /></AdminCurriculumPreview></Page>} />
              <Route path="/admin/student-curriculum/level/:levelNumber" element={<Page><AdminCurriculumPreview><LevelUnits /></AdminCurriculumPreview></Page>} />
              <Route path="/admin/student-curriculum/unit/:unitId" element={<Page><AdminCurriculumPreview><UnitContentRouter /></AdminCurriculumPreview></Page>} />
              <Route path="/admin/interactive-curriculum" element={<Page><InteractiveCurriculumLevels /></Page>} />
              <Route path="/admin/interactive-curriculum/:levelId" element={<Page><InteractiveCurriculumUnits /></Page>} />
              <Route path="/admin/interactive-curriculum/:levelId/:unitId" element={<Page><InteractiveCurriculumPage /></Page>} />
              <Route path="/admin/student/:studentId/progress" element={<Page><StudentProgressDetail /></Page>} />
              <Route path="/admin/student/:studentId/report" element={<Page><StudentActivityReport /></Page>} />
              <Route path="/admin/design-showcase-masterclass" element={<Page><MasterclassDesignShowcase /></Page>} />
              <Route path="/admin/atelier-preview/student" element={<AtelierStudentPreview />} />
              <Route path="/admin/atelier-preview/trainer" element={<AtelierTrainerPreview />} />
              <Route path="/admin/atelier-preview/admin"   element={<AtelierAdminPreview />} />
              <Route path="/dev/audio-player-test" element={<Page><AudioPlayerTest /></Page>} />
            </Route>
          </Route>

          {/* Partner public routes — no auth required */}
          <Route path="/partner/login" element={
            <ErrorBoundary fallback={<PageErrorFallback />}>
              <Suspense fallback={<LoadingSkeleton />}><PartnerLogin /></Suspense>
            </ErrorBoundary>
          } />
          <Route path="/partner/set-password" element={
            <ErrorBoundary fallback={<PageErrorFallback />}>
              <Suspense fallback={<LoadingSkeleton />}><PartnerSetPassword /></Suspense>
            </ErrorBoundary>
          } />

          {/* Partner suspended (accessible without full partner auth) */}
          <Route path="/partner/suspended" element={
            <ErrorBoundary fallback={<PageErrorFallback />}>
              <Suspense fallback={<LoadingSkeleton />}><PartnerSuspended /></Suspense>
            </ErrorBoundary>
          } />

          {/* Partner portal routes */}
          <Route element={
            <ErrorBoundary fallback={<PageErrorFallback />}>
              <Suspense fallback={<LoadingSkeleton />}>
                <PartnerRoute />
              </Suspense>
            </ErrorBoundary>
          }>
            <Route element={
              <Suspense fallback={<LoadingSkeleton />}>
                <PartnerLayout />
              </Suspense>
            }>
              <Route path="/partner" element={<Page><PartnerDashboard /></Page>} />
              <Route path="/partner/conversions" element={<Page><PartnerConversions /></Page>} />
              <Route path="/partner/payouts" element={<Page><PartnerPayouts /></Page>} />
              <Route path="/partner/materials" element={<Page><PartnerMaterials /></Page>} />
              <Route path="/partner/settings" element={<Page><PartnerSettings /></Page>} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </ToastProvider>
      </BrowserRouter>
      </LanguageBootstrap>
    </ErrorBoundary>
  )

}
