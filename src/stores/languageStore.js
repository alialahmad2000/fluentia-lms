import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useLanguageStore = create(
  persist(
    (set) => ({
      immersionMode: false,
      immersionLevel: 'mix', // 'ar' | 'mix' | 'en'
      toggleImmersion: () => set((state) => ({ immersionMode: !state.immersionMode })),
      setImmersionLevel: (level) => set({ immersionLevel: level }),
    }),
    {
      name: 'fluentia-language',
    }
  )
)

// Translation dictionary — key labels used across the app
const translations = {
  ar: {
    dashboard: 'الرئيسية',
    assignments: 'الواجبات',
    grades: 'الدرجات',
    schedule: 'الجدول',
    profile: 'الملف الشخصي',
    leaderboard: 'المتصدرين',
    challenges: 'التحديات',
    messages: 'الرسائل',
    settings: 'الإعدادات',
    submit: 'إرسال',
    cancel: 'إلغاء',
    save: 'حفظ',
    loading: 'جاري التحميل...',
    no_data: 'لا توجد بيانات',
    xp: 'نقاط الخبرة',
    streak: 'سلسلة',
    level: 'المستوى',
    welcome: 'أهلاً',
    good_morning: 'صباح الخير',
    good_afternoon: 'مساء الخير',
    good_evening: 'مساء الخير',
    immersion_mode: 'وضع الانغماس',
    immersion_on: 'الانغماس مفعّل',
    immersion_off: 'الانغماس معطّل',
  },
  en: {
    dashboard: 'Dashboard',
    assignments: 'Assignments',
    grades: 'Grades',
    schedule: 'Schedule',
    profile: 'Profile',
    leaderboard: 'Leaderboard',
    challenges: 'Challenges',
    messages: 'Messages',
    settings: 'Settings',
    submit: 'Submit',
    cancel: 'Cancel',
    save: 'Save',
    loading: 'Loading...',
    no_data: 'No data',
    xp: 'Experience Points',
    streak: 'Streak',
    level: 'Level',
    welcome: 'Welcome',
    good_morning: 'Good morning',
    good_afternoon: 'Good afternoon',
    good_evening: 'Good evening',
    immersion_mode: 'Immersion Mode',
    immersion_on: 'Immersion ON',
    immersion_off: 'Immersion OFF',
  },
  mix: {
    dashboard: 'Dashboard الرئيسية',
    assignments: 'Assignments الواجبات',
    grades: 'Grades الدرجات',
    schedule: 'Schedule الجدول',
    profile: 'Profile الملف',
    leaderboard: 'Leaderboard المتصدرين',
    challenges: 'Challenges التحديات',
    messages: 'Messages الرسائل',
    settings: 'Settings الإعدادات',
    submit: 'Submit إرسال',
    cancel: 'Cancel إلغاء',
    save: 'Save حفظ',
    loading: 'Loading... جاري التحميل',
    no_data: 'No data لا توجد بيانات',
    xp: 'XP نقاط',
    streak: 'Streak سلسلة',
    level: 'Level مستوى',
    welcome: 'Welcome أهلاً',
    good_morning: 'Good morning صباح الخير',
    good_afternoon: 'Good afternoon مساء الخير',
    good_evening: 'Good evening مساء الخير',
    immersion_mode: 'Immersion Mode وضع الانغماس',
    immersion_on: 'Immersion ON الانغماس مفعّل',
    immersion_off: 'Immersion OFF الانغماس معطّل',
  },
}

export function useTranslation() {
  const { immersionMode, immersionLevel } = useLanguageStore()

  function t(key) {
    if (!immersionMode) return translations.ar[key] || key
    const dict = translations[immersionLevel] || translations.mix
    return dict[key] || translations.ar[key] || key
  }

  return { t, immersionMode, immersionLevel }
}
