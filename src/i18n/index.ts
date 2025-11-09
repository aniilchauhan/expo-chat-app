import { I18n } from 'i18n-js'
import { getLocales } from 'expo-localization'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Import translations
import en from './locales/en.json'
import es from './locales/es.json'
import fr from './locales/fr.json'
import de from './locales/de.json'
import zh from './locales/zh.json'
import ja from './locales/ja.json'
import ar from './locales/ar.json'

const i18n = new I18n({
  en,
  es,
  fr,
  de,
  zh,
  ja,
  ar,
})

// Set the locale once at the beginning of your app
const deviceLocale = getLocales()[0]?.languageCode || 'en'
i18n.locale = deviceLocale
i18n.enableFallback = true
i18n.defaultLocale = 'en'

export const initI18n = async () => {
  try {
    const savedLocale = await AsyncStorage.getItem('userLocale')
    if (savedLocale) {
      i18n.locale = savedLocale
    } else {
      const deviceLocale = getLocales()[0]?.languageCode || 'en'
      i18n.locale = deviceLocale
    }
  } catch (error) {
    console.error('Error loading locale:', error)
    const deviceLocale = getLocales()[0]?.languageCode || 'en'
    i18n.locale = deviceLocale
  }
}

export const changeLanguage = async (locale: string) => {
  try {
    i18n.locale = locale
    await AsyncStorage.setItem('userLocale', locale)
  } catch (error) {
    console.error('Error saving locale:', error)
  }
}

export const getCurrentLanguage = () => {
  return i18n.locale
}

export const languages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
]

export default i18n
