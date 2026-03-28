import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { tracker } from '../services/activityTracker'

// Maps route paths to Arabic page names
const PAGE_NAMES = {
  '/student': 'الرئيسية',
  '/student/curriculum': 'المنهج',
  '/student/vocabulary': 'المفردات',
  '/student/flashcards': 'المفردات',
  '/student/irregular-verbs': 'الأفعال الشاذة',
  '/student/verbs': 'الأفعال الشاذة',
  '/student/weekly-tasks': 'المهام الأسبوعية',
  '/student/schedule': 'الجدول',
  '/student/study-plan': 'خطة الدراسة',
  '/student/recordings': 'التسجيلات',
  '/student/assignments': 'الواجبات',
  '/student/grades': 'الدرجات',
  '/student/conversation': 'المحادثة',
  '/student/ai-chat': 'المساعد الذكي',
  '/student/group-activity': 'نشاط المجموعة',
  '/student/spelling': 'الإملاء',
  '/student/profile': 'الملف الشخصي',
  '/student/settings': 'الإعدادات',
  '/admin': 'لوحة التحكم',
  '/admin/students': 'إدارة الطلاب',
  '/admin/analytics': 'التحليلات',
  '/trainer': 'لوحة المدرب',
  '/change-password': 'تغيير كلمة المرور',
}

export function usePageTracking() {
  const location = useLocation()

  useEffect(() => {
    const path = location.pathname
    let pageName = PAGE_NAMES[path]

    if (!pageName) {
      // Try partial match for dynamic routes
      const matchingKey = Object.keys(PAGE_NAMES).find(key => path.startsWith(key))
      pageName = matchingKey ? PAGE_NAMES[matchingKey] : path
    }

    tracker.pageView(path, pageName)
  }, [location.pathname])
}
