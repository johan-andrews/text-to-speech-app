import React, { useState, useEffect } from 'react'
import { View, StyleSheet, ScrollView, Switch, Pressable, Alert } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'

import { Text } from '@/components/ui/Text'
import { Card } from '@/components/ui/Card'

import { useTranscription } from '@/contexts/TranscriptionContext'
import { supabase } from '@/lib/supabase'
import { ACCENT, BACKGROUND, TEXT_PRIMARY, TEXT_SECONDARY, BORDER, ERROR } from '@/lib/theme'
import { TAB_BAR_CLEARANCE } from '@/components/TabBar'

const SETTINGS_COLOR = '#F59E0B' // Amber accent for settings tab

export default function SettingsScreen() {
  const insets = useSafeAreaInsets()
  const { config, updateConfig } = useTranscription()

  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserEmail(user.email ?? null)
      }
    })
  }, [])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
    } catch {
      Alert.alert('Error', 'Failed to log out.')
    }
  }

  const LANGUAGES = [
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
    { code: 'pt', label: 'Português', flag: '🇧🇷' },
    { code: 'it', label: 'Italiano', flag: '🇮🇹' },
    { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
    { code: 'ru', label: 'Русский', flag: '🇷🇺' },
    { code: 'zh', label: '中文', flag: '🇨🇳' },
    { code: 'ja', label: '日本語', flag: '🇯🇵' },
    { code: 'ko', label: '한국어', flag: '🇰🇷' },
    { code: 'ar', label: 'العربية', flag: '🇸🇦' },
    { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
    { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
    { code: 'pl', label: 'Polski', flag: '🇵🇱' },
    { code: 'sv', label: 'Svenska', flag: '🇸🇪' },
    { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
    { code: 'id', label: 'Bahasa Indonesia', flag: '🇮🇩' },
  ]

  const PREFERENCE_ITEMS = [
    {
      key: 'aiCleanup',
      icon: 'sparkles-outline',
      iconColor: '#8B5CF6',
      title: 'AI Grammar Cleanup',
      sub: 'Automatically fixes voice pauses, stutters, and structure using Llama-3.',
      value: config.aiCleanup !== false,
    },
    {
      key: 'voiceCommands',
      icon: 'chatbubble-ellipses-outline',
      iconColor: '#3B82F6',
      title: 'Process Voice Commands',
      sub: 'Converts commands like "new paragraph" and "comma" into punctuation.',
      value: config.voiceCommands !== false,
    },
    {
      key: 'autoSave',
      icon: 'cloud-upload-outline',
      iconColor: '#10B981',
      title: 'Auto-save to History',
      sub: 'Saves transcriptions directly to database logs once completed.',
      value: config.autoSave !== false,
    },
  ]

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Settings</Text>
        <View style={s.headerAccent} />
      </View>

      <ScrollView contentContainerStyle={[s.scrollContent, { paddingBottom: TAB_BAR_CLEARANCE + 40 }]} showsVerticalScrollIndicator={false}>
        {/* AI & Gating settings */}
        <Text style={s.sectionTitle}>Dictation Preferences</Text>
        <Card style={s.preferenceCard}>
          {PREFERENCE_ITEMS.map((item, idx) => (
            <View key={item.key} style={[s.preferenceRow, idx > 0 && s.rowDivider]}>
              <View style={[s.preferenceIconWrap, { backgroundColor: `${item.iconColor}12` }]}>
                <Ionicons name={item.icon as any} size={18} color={item.iconColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.preferenceTitle}>{item.title}</Text>
                <Text style={s.preferenceSub}>{item.sub}</Text>
              </View>
              <Switch
                value={item.value}
                onValueChange={(val) => updateConfig({ [item.key]: val })}
                trackColor={{ true: item.iconColor, false: '#E2E8F0' }}
                thumbColor="#FFFFFF"
                style={{ transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] }}
                ios_backgroundColor="#CBD5E1"
              />
            </View>
          ))}
        </Card>

        {/* Language Preference */}
        <Text style={s.sectionTitle}>Language Preference</Text>
        <Card style={s.preferenceCard}>
          <Text style={s.preferenceTitle}>Expected Language</Text>
          <Text style={s.preferenceSub}>Select the primary language the speech-to-text models should expect.</Text>
          
          <View style={s.langContainer}>
            {LANGUAGES.map((lang) => {
              const isSelected = (config.language || 'en') === lang.code
              return (
                <Pressable
                  key={lang.code}
                  onPress={() => updateConfig({ language: lang.code })}
                  style={[
                    s.langOptionBtn,
                    isSelected && { borderColor: SETTINGS_COLOR, backgroundColor: `${SETTINGS_COLOR}0D` }
                  ]}
                >
                  <Text style={s.langFlag}>{lang.flag}</Text>
                  <Text style={[s.langOptionText, isSelected && { color: SETTINGS_COLOR, fontWeight: '700' }]}>
                    {lang.label}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={16} color={SETTINGS_COLOR} style={{ marginLeft: 'auto' }} />
                  )}
                </Pressable>
              )
            })}
          </View>
        </Card>

      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
  },
  headerAccent: {
    height: 3,
    borderRadius: 2,
    marginTop: 8,
    width: 40,
    backgroundColor: '#F59E0B',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    letterSpacing: -0.5,
  },
  saveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12.5,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: TEXT_SECONDARY,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 8,
  },
  card: {
    padding: 16,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
    borderColor: BORDER,
    borderWidth: 1,
  },
  preferenceCard: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderColor: BORDER,
    borderWidth: 1,
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    gap: 10,
  },
  preferenceIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
    paddingTop: 16,
    marginTop: 8,
  },
  preferenceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  preferenceSub: {
    fontSize: 11.5,
    color: TEXT_SECONDARY,
    marginTop: 2,
    paddingRight: 16,
    lineHeight: 16,
  },
  langContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  langOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#F8FAFC',
    minWidth: '47%',
    gap: 6,
  },
  langFlag: {
    fontSize: 16,
  },
  langOptionText: {
    fontSize: 12.5,
    color: TEXT_SECONDARY,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  providerList: {
    gap: 8,
    marginBottom: 10,
  },
  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#FFFFFF',
  },
  providerCardActive: {
    borderColor: ACCENT,
  },
  providerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  providerSub: {
    fontSize: 11.5,
    color: TEXT_SECONDARY,
    marginTop: 2,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  accountEmailLabel: {
    fontSize: 11.5,
    color: TEXT_SECONDARY,
  },
  accountEmailValue: {
    fontSize: 14.5,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginTop: 2,
  },
  logoutSettingsBtn: {
    borderColor: ERROR,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FEF2F2',
  },
  logoutSettingsBtnText: {
    color: ERROR,
    fontWeight: '700',
    fontSize: 13,
  },
})
