import { useState } from 'react'
import {
  View, Pressable, TextInput, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Text } from '@/components/ui/Text'
import { supabase } from '@/lib/supabase'
import { track } from '@/lib/analytics'
import { useTranscription } from '@/contexts/TranscriptionContext'
import { ACCENT, BG, SURFACE, BORDER, TEXT_PRIMARY, TEXT_SECONDARY } from '@/lib/theme'
import { LinearGradient } from 'expo-linear-gradient'
import { adjustBrightness } from '@/lib/utils'

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets()
  const { updateConfig } = useTranscription()

  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  track('onboarding_started')

  async function complete() {
    setLoading(true)
    setError(null)

    const { error: err } = await supabase.auth.updateUser({
      data: {
        onboarding_completed: true,
        full_name: displayName.trim() || undefined,
      },
    })

    if (err) {
      setLoading(false)
      setError('Could not save profile metadata. Please try again.')
      return
    }

    // Best effort profile upsert (non-blocking)
    if (displayName.trim()) {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase
            .from('profiles')
            .upsert({ id: user.id, display_name: displayName.trim() })
        }
      } catch { /* profile upsert failure is non-fatal */ }
    }

    track('onboarding_completed', {
      skipped: !displayName.trim(),
    })
    setLoading(false)
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: BG }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[s.root, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 }]}>
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={s.content}>
          {/* Header */}
          <View style={s.header}>
            <View style={[s.iconBadge, { backgroundColor: 'rgba(96,165,250,0.1)' }]}>
              <Text style={{ fontSize: 28 }}>🎙️</Text>
            </View>
            <Text style={s.title}>Welcome to VoiceFlow AI</Text>
            <Text style={s.subtitle}>
              Configure your display name to start transcribing speech-to-text immediately.
            </Text>
          </View>

          {/* Form fields */}
          <View style={s.form}>
            <View style={s.fieldGroup}>
              <Text style={s.label}>What should we call you?</Text>
              <TextInput
                value={displayName}
                onChangeText={(v) => { setDisplayName(v); setError(null) }}
                placeholder="Enter your name (optional)"
                placeholderTextColor="#94A3B8"
                style={s.input}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={complete}
              />
            </View>
          </View>

          {error ? (
            <Animated.View entering={FadeIn.duration(180)} style={s.errorBox}>
              <Text style={{ color: '#ef4444', fontSize: 13 }}>{error}</Text>
            </Animated.View>
          ) : null}
        </Animated.View>

        {/* Bottom buttons */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)} style={s.buttons}>
          <Pressable
            onPress={complete}
            disabled={loading}
            style={({ pressed }) => ({
              opacity: loading ? 0.5 : pressed ? 0.85 : 1,
              borderRadius: 16, overflow: 'hidden',
            })}
          >
            <LinearGradient
              colors={[ACCENT, adjustBrightness(ACCENT, -15)]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={s.primaryBtn}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#fff' }}>
                  {displayName.trim() ? 'Save and Continue  →' : 'Get Started  →'}
                </Text>
              )}
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 24 },
  content: { flex: 1, gap: 24, justifyContent: 'center' },
  header: { gap: 10, alignItems: 'center', paddingBottom: 8 },
  iconBadge: {
    width: 72, height: 72, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  title:    { fontSize: 24, fontWeight: '800', color: TEXT_PRIMARY, letterSpacing: -0.5, textAlign: 'center' },
  subtitle: { fontSize: 13, color: TEXT_SECONDARY, textAlign: 'center', lineHeight: 18, maxWidth: 300 },
  form: { gap: 14 },
  fieldGroup: { gap: 6 },
  label: { fontSize: 11.5, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase', color: TEXT_SECONDARY },
  input: {
    height: 48, backgroundColor: '#F8FAFC',
    borderWidth: 1, borderColor: BORDER, borderRadius: 10,
    paddingHorizontal: 16, color: TEXT_PRIMARY, fontSize: 14,
  },
  getKeyLink: {
    alignSelf: 'flex-end',
    paddingVertical: 2,
  },
  getKeyText: {
    fontSize: 11,
    fontWeight: '700',
    color: ACCENT,
  },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.06)', borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
    paddingHorizontal: 14, paddingVertical: 10,
  },
  buttons:    { gap: 12 },
  primaryBtn: { height: 50, alignItems: 'center', justifyContent: 'center' },
})
