import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  View, Pressable, StyleSheet, Dimensions,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  TextInput as RNTextInput, ScrollView, DeviceEventEmitter
} from 'react-native'
import Animated, {
  FadeIn, FadeInDown, useSharedValue, useAnimatedStyle,
  withSpring, withTiming, withDelay, withRepeat, withSequence, Easing
} from 'react-native-reanimated'
import { router } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { Text } from '@/components/ui/Text'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { ACCENT, ACCENT_DIM, BORDER, ERROR } from '@/lib/theme'
import { APP_NAME, APP_TAGLINE, APP_DESCRIPTION } from '@/lib/constants'

WebBrowser.maybeCompleteAuthSession()

const { width: SW, height: SH } = Dimensions.get('window')
const DEV_ALLOW_SKIP = __DEV__

const FEATURES = [
  { icon: 'shield-checkmark-outline' as const, title: 'Secure Access', desc: 'Protected email and password login' },
  { icon: 'flash-outline' as const, title: 'Blazing Fast', desc: 'High-speed AI transcription' },
  { icon: 'cloud-done-outline' as const, title: 'Always in Sync', desc: 'Secure cloud voice history' },
]

export default function LoginAndWelcomeScreen() {
  const insets = useSafeAreaInsets()

  // ── Authentication flow state ──
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const emailRef = useRef<RNTextInput>(null)
  const passwordRef = useRef<RNTextInput>(null)

  // ── Floating orbs animations ──
  const orbOneY = useSharedValue(0)
  const orbTwoY = useSharedValue(0)

  useEffect(() => {
    // Check if the user is already authenticated
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/(tabs)')
      }
    })

    // Listen to dev bypass triggers
    const sub = DeviceEventEmitter.addListener('__dev_skip_auth__', () => {
      router.replace('/(tabs)')
    })

    // Float decorative orbs
    orbOneY.value = withRepeat(
      withSequence(
        withTiming(-16, { duration: 3400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 3400, easing: Easing.inOut(Easing.sin) })
      ), -1, true
    )
    orbTwoY.value = withRepeat(
      withSequence(
        withTiming(14, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2800, easing: Easing.inOut(Easing.sin) })
      ), -1, true
    )

    return () => sub.remove()
  }, [])

  const orbOneStyle = useAnimatedStyle(() => ({ transform: [{ translateY: orbOneY.value }] }))
  const orbTwoStyle = useAnimatedStyle(() => ({ transform: [{ translateY: orbTwoY.value }] }))

  // ── Authentication logic handlers ──
  const handleSignIn = async () => {
    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail || !trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      setError('Enter a valid email address')
      return
    }
    if (!password) {
      setError('Enter your password')
      return
    }
    setLoading(true)
    setError(null)
    const { error: err } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password: password,
    })
    setLoading(false)
    if (err) {
      setError(err.message)
      return
    }
    router.replace('/(tabs)')
  }

  const handleDevSkip = () => {
    DeviceEventEmitter.emit('__dev_skip_auth__')
  }

  async function handleOAuthLogin(provider: 'google' | 'apple') {
    setLoading(true)
    setError(null)
    try {
      const redirectTo = `voiceflow://auth/callback`
      const { data, error: err } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo, skipBrowserRedirect: true },
      })
      if (err) throw err
      if (!data.url) throw new Error('No OAuth URL returned.')

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)
      if (result.type === 'success') {
        const { error: sessionErr } = await supabase.auth.exchangeCodeForSession(result.url)
        if (sessionErr) throw sessionErr
        router.replace('/(tabs)')
      }
    } catch (e: any) {
      setError(e?.message ?? `${provider === 'google' ? 'Google' : 'Apple'} sign-in failed.`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={s.root}>
      {/* Dynamic decorative light blue orbs */}
      <Animated.View pointerEvents="none" style={[s.orbOne, orbOneStyle]} />
      <Animated.View pointerEvents="none" style={[s.orbTwo, orbTwoStyle]} />

      <KeyboardAvoidingView
        style={s.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Bar */}
          <View style={s.header}>
            <View style={s.logoBadge}>
              <View style={s.logoDot} />
              <Text style={s.logoText}>{APP_NAME}</Text>
            </View>
          </View>

          {/* Welcome and App Features Grid */}
          <View style={s.welcomeWrap}>
            <Text style={s.appName}>{APP_NAME}</Text>
            <Text style={s.appTagline}>{APP_TAGLINE}</Text>
            <Text style={s.appDesc}>{APP_DESCRIPTION}</Text>
          </View>

          <View style={s.featuresGrid}>
            {FEATURES.map((feat, i) => (
              <View key={i} style={s.featureBox}>
                <View style={s.featureIconCircle}>
                  <Ionicons name={feat.icon} size={15} color={ACCENT} />
                </View>
                <View style={s.featureTextWrap}>
                  <Text style={s.featureTitle}>{feat.title}</Text>
                  <Text style={s.featureDesc}>{feat.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Combined Login Forms Input Card */}
          <Animated.View entering={FadeInDown.delay(100).duration(450)} style={s.card}>
            <View style={s.stepWrap}>
              <View style={s.titleBlock}>
                <Text style={s.cardTitle}>Sign in to start</Text>
                <Text style={s.cardSub}>Enter your email and password to access your VoiceFlow account.</Text>
              </View>

              <View style={s.fieldGroup}>
                <Text style={s.label}>EMAIL ADDRESS</Text>
                <RNTextInput
                  ref={emailRef}
                  value={email}
                  onChangeText={(v) => { setEmail(v); setError(null) }}
                  placeholder="name@company.com"
                  placeholderTextColor="#94A3B8"
                  style={s.input}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
              </View>

              <View style={s.fieldGroup}>
                <Text style={s.label}>PASSWORD</Text>
                <RNTextInput
                  ref={passwordRef}
                  value={password}
                  onChangeText={(v) => { setPassword(v); setError(null) }}
                  placeholder="••••••••"
                  placeholderTextColor="#94A3B8"
                  style={s.input}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleSignIn}
                />
              </View>

              {error ? (
                <View style={s.errorBox}>
                  <Ionicons name="alert-circle" size={16} color={ERROR} style={{ marginRight: 6 }} />
                  <Text style={{ color: ERROR, fontSize: 13, fontWeight: '500', flex: 1 }}>{error}</Text>
                </View>
              ) : null}

              <Pressable
                onPress={handleSignIn}
                disabled={loading || !email.trim() || !password}
                style={({ pressed }) => ({
                  opacity: (loading || !email.trim() || !password) ? 0.45 : pressed ? 0.88 : 1,
                  borderRadius: 14, overflow: 'hidden',
                })}
              >
                <LinearGradient
                  colors={[ACCENT, '#1D4ED8']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={s.btn}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={s.btnText}>Sign In</Text>
                  )}
                </LinearGradient>
              </Pressable>

              {/* Social Login Separator */}
              <View style={s.dividerRow}>
                <View style={s.dividerLine} />
                <Text style={s.dividerText}>or sign in with</Text>
                <View style={s.dividerLine} />
              </View>

              <View style={s.socialRow}>
                <Pressable
                  onPress={() => handleOAuthLogin('google')}
                  style={({ pressed }) => [s.socialBtn, pressed && { opacity: 0.78 }]}
                >
                  <Ionicons name="logo-google" size={17} color="#EA4335" />
                  <Text style={s.socialBtnText}>Google</Text>
                </Pressable>

                <Pressable
                  onPress={() => handleOAuthLogin('apple')}
                  style={({ pressed }) => [s.socialBtn, pressed && { opacity: 0.78 }]}
                >
                  <Ionicons name="logo-apple" size={18} color="#0F172A" />
                  <Text style={s.socialBtnText}>Apple</Text>
                </Pressable>
              </View>

              <View style={s.footerMeta}>
                <Text style={s.footerMetaText}>New to VoiceFlow? </Text>
                <Pressable onPress={() => router.push('/(auth)/register')}>
                  <Text style={s.footerMetaLink}>Register</Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>

          {/* Legal / Terms footer */}
          <Text style={s.legalText}>
            By continuing, you agree to our{' '}
            <Text onPress={() => router.push('/terms')} style={s.legalLink}>Terms</Text>
            {' '}and{' '}
            <Text onPress={() => router.push('/privacy')} style={s.legalLink}>Privacy Policy</Text>.
          </Text>

          {/* Dev skip bypass */}
          {DEV_ALLOW_SKIP && (
            <Pressable
              onPress={handleDevSkip}
              style={({ pressed }) => [s.devSkipBtn, pressed && { opacity: 0.6 }]}
            >
              <Ionicons name="play-skip-forward-outline" size={13} color="#64748B" />
              <Text style={s.devSkipText}>Skip Auth (development bypass)</Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  kav: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 20 },

  // Floating background decorative orbs
  orbOne: {
    position: 'absolute',
    right: -SW * 0.2,
    top: SH * 0.05,
    width: SW * 0.68,
    height: SW * 0.68,
    borderRadius: 999,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  orbTwo: {
    position: 'absolute',
    left: -SW * 0.25,
    bottom: SH * 0.12,
    width: SW * 0.6,
    height: SW * 0.6,
    borderRadius: 999,
    backgroundColor: 'rgba(96, 165, 250, 0.04)',
  },

  // Header Bar
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  logoDot: { width: 6, height: 6, borderRadius: 999, backgroundColor: ACCENT },
  logoText: { fontSize: 11.5, fontWeight: '700', color: '#64748B', letterSpacing: 0.2 },

  // Welcome Hero Text
  welcomeWrap: {
    gap: 6,
    marginBottom: 16,
  },
  appName: {
    fontSize: 34,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -1,
  },
  appTagline: {
    fontSize: 14.5,
    fontWeight: '600',
    color: ACCENT,
    letterSpacing: 0.1,
  },
  appDesc: {
    fontSize: 13.5,
    color: '#64748B',
    lineHeight: 19,
    maxWidth: '90%',
  },

  // Landing Features Grid
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 22,
  },
  featureBox: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  featureIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(96,165,250,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTextWrap: { flex: 1, gap: 1 },
  featureTitle: { fontSize: 11.5, fontWeight: '700', color: '#1E293B' },
  featureDesc: { fontSize: 9.5, color: '#64748B' },

  // Login Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
    marginBottom: 16,
  },
  stepWrap: { gap: 16 },
  titleBlock: { gap: 8 },
  cardTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', letterSpacing: -0.3 },
  cardSub: { fontSize: 13, color: '#64748B', lineHeight: 18 },

  emailPill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(59,130,246,0.06)',
    borderColor: 'rgba(59,130,246,0.2)',
    marginTop: 2,
  },
  emailPillText: { fontSize: 12.5, fontWeight: '600', color: ACCENT },

  fieldGroup: { gap: 8 },
  label: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.8, color: '#64748B' },
  input: {
    height: 48,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    color: '#0F172A',
    fontSize: 15,
  },

  btn: { height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 14.5, fontWeight: '700' },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: BORDER },
  dividerText: { color: '#94A3B8', fontSize: 11 },

  socialRow: { flexDirection: 'row', gap: 10 },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  socialBtnText: { color: '#0F172A', fontSize: 13.5, fontWeight: '600' },

  footerMeta: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  footerMetaText: { color: '#64748B', fontSize: 13 },
  footerMetaLink: { color: ACCENT, fontSize: 13, fontWeight: '700' },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${ERROR}33`,
    padding: 10,
    backgroundColor: '#FEF2F2',
  },

  otpRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  otpBox: {
    flex: 1,
    height: 48,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    color: '#0F172A',
    fontSize: 20,
    textAlign: 'center',
  },
  otpMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 4 },
  resendText: { color: ACCENT, fontSize: 13, fontWeight: '600' },

  legalText: {
    fontSize: 11.5,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 16,
  },
  legalLink: { color: '#64748B', textDecorationLine: 'underline', fontWeight: '500' },

  devSkipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
  },
  devSkipText: { fontSize: 11, color: '#64748B', fontWeight: '600' },
})
