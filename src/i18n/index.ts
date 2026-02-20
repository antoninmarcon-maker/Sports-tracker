import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import fr from './locales/fr.json';
import en from './locales/en.json';

// French-speaking countries / regions
const FRENCH_LOCALES = ['fr', 'fr-FR', 'fr-BE', 'fr-CA', 'fr-CH', 'fr-LU', 'fr-MC',
  'fr-SN', 'fr-CI', 'fr-ML', 'fr-BF', 'fr-NE', 'fr-TG', 'fr-BJ', 'fr-MG',
  'fr-CM', 'fr-CD', 'fr-CG', 'fr-GA', 'fr-GN', 'fr-TD', 'fr-RW', 'fr-BI',
  'fr-DJ', 'fr-KM', 'fr-HT', 'fr-MU', 'fr-SC'];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
    },
    fallbackLng: 'en',
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
    // Custom language detection: if browser language starts with 'fr', use French
    // otherwise use English
  });

// Override detected language if it's a French locale but was detected as something else
const detectedLng = i18n.language;
if (detectedLng && !['fr', 'en'].includes(detectedLng)) {
  const browserLang = navigator.language || '';
  if (browserLang.startsWith('fr') || FRENCH_LOCALES.includes(browserLang)) {
    i18n.changeLanguage('fr');
  } else {
    i18n.changeLanguage('en');
  }
}

export default i18n;
