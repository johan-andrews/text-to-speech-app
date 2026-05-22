import React, { useState, useEffect } from 'react'
import { View, StyleSheet, ScrollView, Switch, Pressable, Alert } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Text } from '@/components/ui/Text'
import { Card } from '@/components/ui/Card'

import { useTranscription } from '@/contexts/TranscriptionContext'
import { supabase } from '@/lib/supabase'
import { ACCENT, BACKGROUND, TEXT_PRIMARY, TEXT_SECONDARY, BORDER, ERROR } from '@/lib/theme'
import { TAB_BAR_CLEARANCE } from '@/components/TabBar'

export default function SettingsScreen() {
  const insets = useSafeAreaInsets()
  const { config, updateConfig } = useTranscription()

  // Toggle settings
  const [aiCleanup, setAiCleanup] = useState(true)
  const [voiceCommands, setVoiceCommands] = useState(true)
  const [autoSave, setAutoSave] = useState(true)

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
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Español' },
    { code: 'fr', label: 'Français' },
    { code: 'de', label: 'Deutsch' },
    { code: 'pt', label: 'Português' },
    { code: 'it', label: 'Italiano' },
    { code: 'nl', label: 'Nederlands' },
    { code: 'ru', label: 'Русский' },
    { code: 'zh', label: '中文' },
    { code: 'ja', label: '日本語' },
    { code: 'ko', label: '한국어' },
    { code: 'ar', label: 'العربية' },
    { code: 'hi', label: 'हिन्दी' },
    { code: 'tr', label: 'Türkçe' },
    { code: 'pl', label: 'Polski' },
    { code: 'sv', label: 'Svenska' },
    { code: 'vi', label: 'Tiếng Việt' },
    { code: 'id', label: 'Bahasa Indonesia' },
  ]

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={[s.scrollContent, { paddingBottom: TAB_BAR_CLEARANCE + 40 }]} showsVerticalScrollIndicator={false}>
        {/* AI & Gating settings */}
        <Text style={s.sectionTitle}>Dictation Preferences</Text>
        <Card style={s.preferenceCard}>
          <View style={s.preferenceRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.preferenceTitle}>AI Grammar Cleanup</Text>
              <Text style={s.preferenceSub}>Automatically fixes voice pauses, stutters, and structure using Llama-3.</Text>
            </View>
            <Switch
              value={config.aiCleanup !== false}
              onValueChange={(val) => updateConfig({ aiCleanup: val })}
              trackColor={{ true: ACCENT }}
              style={{ transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] }}
              ios_backgroundColor="#CBD5E1"
            />
          </View>

          <View style={[s.preferenceRow, s.rowDivider]}>
            <View style={{ flex: 1 }}>
              <Text style={s.preferenceTitle}>Process Voice Commands</Text>
              <Text style={s.preferenceSub}>Converts commands like "new paragraph" and "comma" into punctuation.</Text>
            </View>
            <Switch
              value={voiceCommands}
              onValueChange={setVoiceCommands}
              trackColor={{ true: ACCENT }}
              style={{ transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] }}
              ios_backgroundColor="#CBD5E1"
            />
          </View>

          <View style={[s.preferenceRow, s.rowDivider]}>
            <View style={{ flex: 1 }}>
              <Text style={s.preferenceTitle}>Auto-save to History</Text>
              <Text style={s.preferenceSub}>Saves transcriptions directly to database logs once completed.</Text>
            </View>
            <Switch
              value={autoSave}
              onValueChange={setAutoSave}
              trackColor={{ true: ACCENT }}
              style={{ transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] }}
              ios_backgroundColor="#CBD5E1"
            />
          </View>
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
                    isSelected && { borderColor: ACCENT, backgroundColor: 'rgba(96,165,250,0.06)' }
                  ]}
                >
                  <View style={[s.radioCircle, isSelected && { borderColor: ACCENT }]}>
                    {isSelected && <View style={[s.radioInner, { backgroundColor: ACCENT }]} />}
                  </View>
                  <Text style={[s.langOptionText, isSelected && { color: ACCENT, fontWeight: '700' }]}>
                    {lang.label}
                  </Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: BORDER,
  },
  title: {
    fontSize: 22,
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
    paddingTop: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: TEXT_SECONDARY,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 8,
  },
  card: {
    padding: 16,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
    borderColor: BORDER,
    borderWidth: 1,
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
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#F8FAFC',
    minWidth: '47%',
  },
  langOptionText: {
    fontSize: 12.5,
    color: TEXT_SECONDARY,
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
