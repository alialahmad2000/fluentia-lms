import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GraduationCap, LayoutDashboard, BookOpen, PenLine,
  Trophy, Rocket, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'

const PAGES = [
  {
    icon: GraduationCap,
    color: '#38bdf8',
    title: 'مرحباً بك في أكاديمية طلاقة!',
    subtitle: 'نظام إدارة التعلم الخاص بالأكاديمية يساعدك في متابعة طلابك وتقييم أدائهم',
    detail: 'كل شيء تحتاجه لإدارة مجموعاتك موجود في مكان واحد',
  },
  {
    icon: LayoutDashboard,
    color: '#4ade80',
    title: 'لوحة التحكم',
    subtitle: 'هنا تشوف نظرة شاملة على مجموعاتك وطلابك',
    detail: 'إحصائيات الحضور، نقاط XP، آخر النشاطات — كلها في صفحة واحدة',
  },
  {
    icon: BookOpen,
    color: '#a78bfa',
    title: 'المنهج',
    subtitle: 'تقدر تتصفح منهج طلابك وتشوف إجاباتهم وتقدمهم',
    detail: 'كل وحدة فيها أقسام: القراءة، القواعد، المفردات، الاستماع، والكتابة',
  },
  {
    icon: PenLine,
    color: '#fbbf24',
    title: 'التدريس',
    subtitle: 'أنشئ واجبات وصحح أعمال طلابك بسهولة',
    detail: 'الواجبات الأسبوعية، تصحيح الكتابة، والاختبارات — كلها من هنا',
  },
  {
    icon: Trophy,
    color: '#f472b6',
    title: 'النقاط والحضور',
    subtitle: 'وزّع نقاط أثناء الكلاس وسجّل الحضور بضغطة',
    detail: 'النقاط السريعة تحفّز الطلاب وتشجعهم على المشاركة',
  },
  {
    icon: Rocket,
    color: '#38bdf8',
    title: 'جاهز!',
    subtitle: 'كل شيء جاهز — يلا نبدأ الرحلة!',
    detail: '',
    isFinal: true,
  },
]

export default function TrainerOnboarding() {
  const navigate = useNavigate()
  const { user, trainerData } = useAuthStore()
  const [currentPage, setCurrentPage] = useState(0)
  const [direction, setDirection] = useState(1)

  const page = PAGES[currentPage]
  const Icon = page.icon
  const isFirst = currentPage === 0
  const isLast = currentPage === PAGES.length - 1

  const goNext = () => {
    if (isLast) return handleComplete()
    setDirection(1)
    setCurrentPage(p => p + 1)
  }

  const goPrev = () => {
    if (isFirst) return
    setDirection(-1)
    setCurrentPage(p => p - 1)
  }

  const handleComplete = async () => {
    const { error } = await supabase
      .from('trainers')
      .update({ onboarding_completed: true })
      .eq('id', user?.id)
    if (error) console.error('Failed to save onboarding:', error)
    navigate('/trainer', { replace: true })
  }

  const handleSkip = async () => {
    await handleComplete()
  }

  const variants = {
    enter: (dir) => ({ x: dir > 0 ? 200 : -200, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir > 0 ? -200 : 200, opacity: 0 }),
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
      dir="rtl"
      style={{ background: 'var(--surface-base, #0c0e14)' }}
    >
      {/* Skip button */}
      {!isLast && (
        <button
          onClick={handleSkip}
          className="absolute top-6 left-6 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors font-['Tajawal']"
        >
          تخطي
        </button>
      )}

      {/* Content */}
      <div className="w-full max-w-md flex flex-col items-center text-center flex-1 justify-center">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentPage}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="flex flex-col items-center text-center w-full"
          >
            {/* Icon */}
            <div
              className="w-24 h-24 rounded-3xl flex items-center justify-center mb-8"
              style={{ background: `${page.color}15`, boxShadow: `0 0 40px ${page.color}20` }}
            >
              <Icon size={44} style={{ color: page.color }} />
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-[var(--text-primary)] font-['Tajawal'] mb-4 leading-relaxed">
              {page.title}
            </h1>

            {/* Subtitle */}
            <p className="text-base text-[var(--text-secondary)] font-['Tajawal'] leading-relaxed mb-3 max-w-sm">
              {page.subtitle}
            </p>

            {/* Detail */}
            {page.detail && (
              <p className="text-sm text-[var(--text-muted)] font-['Tajawal'] leading-relaxed max-w-xs">
                {page.detail}
              </p>
            )}

            {/* Final page CTA */}
            {page.isFinal && (
              <motion.button
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                onClick={handleComplete}
                className="mt-8 px-8 py-3 rounded-2xl text-base font-bold text-white font-['Tajawal'] transition-all hover:scale-105"
                style={{ background: `linear-gradient(135deg, ${page.color}, #a78bfa)`, boxShadow: `0 4px 20px ${page.color}40` }}
              >
                يلا نبدأ!
              </motion.button>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom navigation */}
      <div className="w-full max-w-md flex flex-col items-center gap-6 mt-8">
        {/* Progress dots */}
        <div className="flex items-center gap-2">
          {PAGES.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === currentPage ? 24 : 8,
                height: 8,
                background: i === currentPage ? page.color : 'rgba(255,255,255,0.1)',
              }}
            />
          ))}
        </div>

        {/* Nav buttons */}
        {!page.isFinal && (
          <div className="flex items-center justify-between w-full">
            <button
              onClick={goPrev}
              disabled={isFirst}
              className={`flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-medium font-['Tajawal'] transition-colors ${
                isFirst ? 'opacity-0 pointer-events-none' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.04)]'
              }`}
            >
              <ChevronRight size={16} />
              السابق
            </button>

            <button
              onClick={goNext}
              className="flex items-center gap-1 px-6 py-2.5 rounded-xl text-sm font-bold font-['Tajawal'] text-white transition-all hover:scale-105"
              style={{ background: page.color }}
            >
              التالي
              <ChevronLeft size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
