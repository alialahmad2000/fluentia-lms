import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import ar from './ar.json';
import en from './en.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ar: { translation: ar },
      en: { translation: en },
    },
    fallbackLng: 'ar',
    supportedLngs: ['ar', 'en'],
    interpolation: { escapeValue: false },
    detection: {
      // Arabic-first: honor the user's explicit saved choice only.
      // Do NOT fall back to navigator — an English-locale phone must still
      // open طلاقة in Arabic by default. English is an opt-in toggle.
      order: ['localStorage'],
      caches: ['localStorage'],
      lookupLocalStorage: 'fluentia_ui_language',
    },
    react: { useSuspense: false },
  });

// Keep <html dir/lang> in lockstep with the active language so we never get
// the broken "English text on an RTL skeleton" hybrid (flipped ?, mis-anchored
// labels). Runs on init and on every language toggle.
function syncDocumentDirection(lng) {
  const dir = lng === 'en' ? 'ltr' : 'rtl';
  document.documentElement.lang = lng;
  document.documentElement.dir = dir;
}
syncDocumentDirection(i18n.resolvedLanguage || i18n.language || 'ar');
i18n.on('languageChanged', syncDocumentDirection);

export default i18n;
