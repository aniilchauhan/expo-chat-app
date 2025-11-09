import { useState, useEffect } from 'react'
import i18n, { changeLanguage as changeI18nLanguage, getCurrentLanguage } from '../i18n'

export const useTranslation = () => {
  const [locale, setLocale] = useState(getCurrentLanguage())

  const t = (key: string, params?: Record<string, any>) => {
    return i18n.t(key, params)
  }

  const changeLanguage = async (newLocale: string) => {
    await changeI18nLanguage(newLocale)
    setLocale(newLocale)
  }

  return {
    t,
    locale,
    changeLanguage,
  }
}
