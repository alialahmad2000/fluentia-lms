import { useEffect, useRef } from 'react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { supabase } from '@/lib/supabase'
import { useTranslation } from 'react-i18next'
import './TrainerTour.css'

export default function TrainerTour({ autoStart = false, onComplete }) {
  const { t } = useTranslation()
  const driverRef = useRef(null)

  const TOUR_STEPS = [
    {
      element: '[data-tour-id="cockpit-header"]',
      popover: {
        title: t('trainer.onboarding.page_1_title'),
        description: t('trainer.tour.cockpit_desc', 'هنا تبدأ يومك. كل ما تحتاجه عن طلابك ومجموعاتك، في نظرة واحدة. إذا كنت متحيّر، ابدأ دائماً من هنا.'),
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tour-id="intervention-preview"]',
      popover: {
        title: t('trainer.cockpit.interventions'),
        description: t('trainer.tour.interventions_desc', 'الطلاب اللي يحتاجونك اليوم — مرتبين حسب الأولوية تلقائياً. اضغط أي واحد لترى التفاصيل واقتراح AI لكيفية التواصل معه.'),
        side: 'left',
      },
    },
    {
      element: '[data-tour-id="agenda-strip"]',
      popover: {
        title: t('trainer.tour.class_prep_title', 'تحضير وإلقاء الحصة'),
        description: t('trainer.tour.class_prep_desc', 'قبل كل حصة بـ ٣٠ دقيقة، يطلع لك اقتراح "تحضير". يأخذك لصفحة فيها نقاط حوار جاهزة + طلاب تستحق الإشادة بهم. في الحصة نفسها، وضع "الحصة المباشرة" يخفي كل شيء عدا المحتوى + أدوات سريعة.'),
        side: 'bottom',
      },
    },
    {
      element: '[data-tour-id="grading-badge"]',
      popover: {
        title: t('trainer.grading.title'),
        description: t('trainer.tour.grading_desc', 'AI يقيّم كل واجب تلقائياً قبل ما تشوفه. أنت تراجع فقط وتوافق — أو تعدّل. تصحّح أسرع بـ ٥ أضعاف. صحّح خلال ٢٤ ساعة = +٥ XP.'),
        side: 'left',
      },
    },
    {
      element: '[data-tour-id="nabih-briefing"]',
      popover: {
        title: t('trainer.cockpit.nabih'),
        description: t('trainer.tour.nabih_desc', 'اسأله أي سؤال عن طلابك بلغتك العادية: "وش وضع منار؟" / "اقترح رسالة لنورة" / "مين غاب كثير؟". يعرف كل بياناتك ويجاوب بأرقام حقيقية.'),
        side: 'left',
      },
    },
    {
      element: '[data-tour-id="my-growth-link"]',
      popover: {
        title: t('trainer.tour.growth_title', 'نموّي'),
        description: t('trainer.tour.growth_desc', 'شفافية كاملة: XP اليومي، streak، KPIs، وتقدير العمولة الشهرية. كل ما تتحرك أكثر، يرتفع رقمك. افتحها كل أسبوع لتشوف تقدمك.'),
        side: 'left',
      },
    },
  ]

  useEffect(() => {
    if (!autoStart) return

    const d = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      overlayOpacity: 0.65,
      nextBtnText: `${t('trainer.onboarding.next_button')} ←`,
      prevBtnText: `→ ${t('trainer.onboarding.prev_button')}`,
      doneBtnText: `${t('trainer.onboarding.start_button')} ✓`,
      progressText: '{{current}} / {{total}}',
      steps: TOUR_STEPS,
      onDestroyStarted: () => {
        const state = d.getState()
        const isLastStep = state?.activeIndex >= TOUR_STEPS.length - 1
        if (isLastStep) {
          supabase.rpc('mark_tour_event', { p_event: 'completed' })
        } else {
          supabase.rpc('mark_tour_event', { p_event: 'skipped' })
        }
        d.destroy()
        onComplete?.()
      },
      onHighlightStarted: (element, step, { state }) => {
        supabase.rpc('mark_tour_event', { p_event: 'step', p_step: (state?.activeIndex || 0) + 1 })
      },
    })

    driverRef.current = d
    supabase.rpc('mark_tour_event', { p_event: 'started' })

    // Small delay to allow DOM to settle
    const timer = setTimeout(() => { d.drive() }, 100)
    return () => {
      clearTimeout(timer)
      try { d.destroy() } catch {}
    }
  }, [autoStart])

  return null
}
