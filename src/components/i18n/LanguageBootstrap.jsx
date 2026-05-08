import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../stores/authStore'

export default function LanguageBootstrap({ children }) {
  const { i18n } = useTranslation()
  const profile = useAuthStore((s) => s.profile)

  // Sync DB language preference → i18n on profile load / change
  useEffect(() => {
    const dbLang = profile?.ui_language
    if (dbLang && dbLang !== i18n.language) {
      i18n.changeLanguage(dbLang)
    }
  }, [profile?.ui_language, i18n])

  // Apply dir + font class to <html> on language change
  useEffect(() => {
    const apply = (lng) => {
      const isRTL = lng === 'ar'
      document.documentElement.lang = lng
      document.documentElement.dir = isRTL ? 'rtl' : 'ltr'
      document.documentElement.classList.toggle('font-arabic', isRTL)
      document.documentElement.classList.toggle('font-english', !isRTL)
    }
    apply(i18n.language)
    i18n.on('languageChanged', apply)
    return () => i18n.off('languageChanged', apply)
  }, [i18n])

  return children
}
