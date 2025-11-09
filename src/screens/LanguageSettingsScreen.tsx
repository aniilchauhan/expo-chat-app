import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from '../hooks/useTranslation'
import { useTheme } from '../contexts/ThemeContext'
import { languages } from '../i18n'

export default function LanguageSettingsScreen({ navigation }: any) {
  const { t, locale, changeLanguage } = useTranslation()
  const { colors } = useTheme()

  const handleLanguageChange = async (languageCode: string) => {
    await changeLanguage(languageCode)
    // Navigate back after changing language
    setTimeout(() => {
      navigation.goBack()
    }, 300)
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('settings.language')}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={[styles.description, { color: colors.textSecondary }]}>{t('settings.selectLanguage')}</Text>

        {languages.map((language) => (
          <TouchableOpacity
            key={language.code}
            style={[styles.languageItem, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
            onPress={() => handleLanguageChange(language.code)}
          >
            <View style={styles.languageInfo}>
              <Text style={[styles.languageName, { color: colors.text }]}>{language.nativeName}</Text>
              <Text style={[styles.languageCode, { color: colors.textSecondary }]}>{language.name}</Text>
            </View>
            {locale === language.code && (
              <Ionicons name="checkmark" size={24} color={colors.primary} />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  description: {
    fontSize: 14,
    padding: 16,
    paddingBottom: 8,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 17,
    marginBottom: 2,
  },
  languageCode: {
    fontSize: 14,
  },
})
