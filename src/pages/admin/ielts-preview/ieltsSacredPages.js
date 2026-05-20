import {
  Compass, Sparkles, BookOpen, Headphones, PenLine, Mic,
  Map, Library, Timer, UserRound, ShieldCheck,
} from 'lucide-react';

// Renamed 2026-05-20: components live under ielts-atelier/ in HEAD.
import Home       from '@/pages/student/ielts-atelier/Home';
import Diagnostic from '@/pages/student/ielts-atelier/Diagnostic';
import Reading    from '@/pages/student/ielts-atelier/Reading';
import Listening  from '@/pages/student/ielts-atelier/Listening';
import Writing    from '@/pages/student/ielts-atelier/Writing';
import Speaking   from '@/pages/student/ielts-atelier/Speaking';
import Journey    from '@/pages/student/ielts-atelier/Journey';
import Errors     from '@/pages/student/ielts-atelier/Errors';
import Mock       from '@/pages/student/ielts-atelier/Mock';
import Trainer    from '@/pages/student/ielts-atelier/Trainer';
import Readiness  from '@/pages/student/ielts-atelier/Readiness';

export const PHASES = [
  { id: '0b', label: 'Phase 0B', title: 'الأساسات',          subtitle: 'Scaffold',         color: '#38bdf8' },
  { id: '1',  label: 'Phase 1',  title: 'الرحلة + الرئيسية', subtitle: 'Home + Journey',   color: '#38bdf8' },
  { id: '2',  label: 'Phase 2',  title: 'التشخيص',            subtitle: 'Diagnostic',       color: '#a78bfa' },
  { id: '3',  label: 'Phase 3',  title: 'المهارات الأربع',    subtitle: 'Skill Labs',       color: '#fbbf24' },
  { id: '4',  label: 'Phase 4',  title: 'الاختبار التجريبي',  subtitle: 'The Mock',         color: '#f97316' },
  { id: '5',  label: 'Phase 5',  title: 'الدروس + المدرب',   subtitle: 'Errors + Trainer',  color: '#10b981' },
  { id: '6',  label: 'Phase 6',  title: 'الجاهزية',           subtitle: 'Exam Readiness',   color: '#f43f5e' },
];

export const SACRED_PAGES = [
  { id: 'home',       phase: '0b', icon: Compass,     title: 'الرئيسية',           english: 'The Home',           desc: 'بوابة المتعلّم',              Component: Home },
  { id: 'journey',    phase: '1',  icon: Map,         title: 'الرحلة الكاملة',     english: 'The Journey',        desc: '١٢ أسبوعاً — إيقاع ثابت',     Component: Journey },
  { id: 'diagnostic', phase: '2',  icon: Sparkles,    title: 'الاختبار التشخيصي',  english: 'The Diagnostic',     desc: 'طقس عبور — لا حكم',           Component: Diagnostic },
  { id: 'reading',    phase: '3',  icon: BookOpen,    title: 'القراءة',             english: 'The Study',          desc: 'غرفة الدراسة',                Component: Reading },
  { id: 'listening',  phase: '3',  icon: Headphones,  title: 'الاستماع',            english: 'The Theater',        desc: 'المسرح',                      Component: Listening },
  { id: 'writing',    phase: '3',  icon: PenLine,     title: 'الكتابة',             english: 'The Workshop',       desc: 'الورشة',                      Component: Writing },
  { id: 'speaking',   phase: '3',  icon: Mic,         title: 'المحادثة',            english: 'The Interview Room', desc: 'غرفة المقابلة',               Component: Speaking },
  { id: 'mock',       phase: '4',  icon: Timer,       title: 'الاختبار التجريبي',  english: 'The Mock',           desc: 'بلا تنازل عن الواقع',         Component: Mock },
  { id: 'errors',     phase: '5',  icon: Library,     title: 'بنك الدروس',          english: 'Bank of Lessons',    desc: 'أخطاؤك معلّموك',              Component: Errors },
  { id: 'trainer',    phase: '5',  icon: UserRound,   title: 'مدربك',               english: 'Your Trainer',       desc: 'الطبقة الإنسانية',            Component: Trainer },
  { id: 'readiness',  phase: '6',  icon: ShieldCheck, title: 'أسبوع الجاهزية',      english: 'Exam Week',          desc: 'الأسبوع ١٢',                  Component: Readiness },
];

export const getPageById = (id) => SACRED_PAGES.find((p) => p.id === id);
export const getPhaseById = (id) => PHASES.find((p) => p.id === id);
export const getPagesForPhase = (phaseId) => SACRED_PAGES.filter((p) => p.phase === phaseId);
