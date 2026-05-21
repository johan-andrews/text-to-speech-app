import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  View, Pressable, StyleSheet, Dimensions,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  TextInput as RNTextInput, ScrollView, DeviceEventEmitter
} from 'react-native'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { router } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { Text } from '@/components/ui/Text'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { ACCENT, ACCENT_DIM, BORDER, ERROR } from '@/lib/theme'
import { APP_NAME, APP_SCHEME } from '@/lib/constants'

WebBrowser.maybeCompleteAuthSession()

const DEV_ALLOW_SKIP = __DEV__

export default function LoginScreen() {
  const insets = useSafeAreaInsets()

  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)

  const otpRefs = useRef<(RNTextInput | null)[]>([])
  const emailRef = useRef<RNTextInput>(null)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const handleSendOtp = async () => {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed || !trimmed.includes('@') || !trimmed.includes('.')) {
      setError('Enter a valid email address')
      return
    }
    setLoading(true)
    setError(null)
    const { error: err } = await supabase.auth.signInWithOtp({ email: trimmed })
    setLoading(false)
    if (err) {
      setError(err.message)
      return
    }
    setStep('otp')
    setCooldown(60)
    setTimeout(() => otpRefs.current[0]?.focus(), 300)
  }

  const handleVerifyOtp = useCallback(async (code: string) => {
    if (code.length < 6) return
    setLoading(true)
    setError(null)
    const { error: err } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code,
      type: 'email',
    })
    setLoading(false)
    if (err) {
      setError('Invalid code or session expired.')
      setOtp(['', '', '', '', '', ''])
      setTimeout(() => otpRefs.current[0]?.focus(), 50)
      return
    }
  }, [email])

  const handleOtpChange = (val: string, index: number) => {
    const digit = val.replace(/\D/g, '').slice(-1)
    const next = [...otp]
    next[index] = digit
    setOtp(next)
    if (digit && index < 5) otpRefs.current[index + 1]?.focus()
    const code = next.join('')
    if (code.length === 6 && !next.includes('')) handleVerifyOtp(code)
  }

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      const next = [...otp]
      next[index - 1] = ''
      setOtp(next)
      otpRefs.current[index - 1]?.focus()
    }
  }

  const handleResend = async () => {
    if (cooldown > 0) return
    setLoading(true)
    setError(null)
    const { error: err } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase() })
    setLoading(false)
    if (err) {
      setError(err.message)
      return
    }
    setCooldown(60)
    setOtp(['', '', '', '', '', ''])
    setTimeout(() => otpRefs.current[0]?.focus(), 50)
  }

  const goBack = () => {
    setStep('email')
    setOtp(['', '', '', '', '', ''])
    setError(null)
    setTimeout(() => emailRef.current?.focus(), 150)
  }

  const handleDevSkip = () => {
    DeviceEventEmitter.emit('__dev_skip_auth__')
  }

  async function handleOAuthLogin(provider: 'google' | 'apple') {
    setLoading(true)
    setError(null)
    try {
      const redirectTo = `${APP_SCHEME}://auth/callback`
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
      }
    } catch (e: any) {
      setError(e?.message ?? `${provider === 'google' ? 'Google' : 'Apple'} sign-in failed.`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={s.root}>
      <KeyboardAvoidingView
        style={s.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[s.form, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.delay(80).duration(400)} style={s.content}>
            {/* App badge */}
            <View style={s.appBadge}>
              <View style={s.appBadgeDot} />
              <Text style={s.appBadgeText}>{APP_NAME}</Text>
            </View>

            {/* Heading */}
            {step === 'email' ? (
              <View style={s.titleBlock}>
                <Text style={s.titleBold}>Welcome back</Text>
                <Text style={s.sub}>Enter your email — we'll send a one-time code.</Text>
              </View>
            ) : (
              <View style={s.titleBlock}>
                <Text style={s.titleBold}>Check your inbox</Text>
                <View style={s.emailPill}>
                  <Text style={s.emailPillText} numberOfLines={1}>{email}</Text>
                </View>
                <Text style={s.sub}>Enter the 6-digit code we sent. Check spam if needed.</Text>
              </View>
            )}

            {/* ── Email step ── */}
            {step === 'email' && (
              <View style={s.stepWrap}>
                <View style={s.fieldGroup}>
                  <Text style={s.label}>EMAIL ADDRESS</Text>
                  <RNTextInput
                    ref={emailRef}
                    value={email}
                    onChangeText={(v) => { setEmail(v); setError(null) }}
                    placeholder="you@example.com"
                    placeholderTextColor="#94A3B8"
                    style={s.input}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleSendOtp}
                    autoFocus
                  />
                </View>

                {error ? (
                  <View style={s.errorBox}>
                    <Text style={{ color: ERROR, fontSize: 13 }}>{error}</Text>
                  </View>
                ) : null}

                <Pressable
                  onPress={handleSendOtp}
                  disabled={loading || !email.trim()}
                  style={({ pressed }) => ({
                    opacity: (loading || !email.trim()) ? 0.4 : pressed ? 0.85 : 1,
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
                      <Text style={s.btnText}>Continue</Text>
                    )}
                  </LinearGradient>
                </Pressable>

                {/* ─── Social logins ────────────────────── */}
                <View style={s.dividerRow}>
                  <View style={s.dividerLine} />
                  <Text style={s.dividerText}>or continue with</Text>
                  <View style={s.dividerLine} />
                </View>

                <View style={s.socialRow}>
                  {/* Google */}
                  <Pressable
                    onPress={() => handleOAuthLogin('google')}
                    style={({ pressed }) => [s.socialBtn, pressed && { opacity: 0.75 }]}
                  >
                    <View style={s.socialIcon}>
                      <Ionicons name="logo-google" size={17} color="#EA4335" />
                    </View>
                    <Text style={s.socialBtnText}>Google</Text>
                  </Pressable>

                  {/* Apple */}
                  <Pressable
                    onPress={() => handleOAuthLogin('apple')}
                    style={({ pressed }) => [s.socialBtn, pressed && { opacity: 0.75 }]}
                  >
                    <Ionicons name="logo-apple" size={18} color="#0F172A" />
                    <Text style={s.socialBtnText}>Apple</Text>
                  </Pressable>
                </View>

                {/* Footer link to Register */}
                <View style={s.footerMeta}>
                  <Text style={s.footerMetaText}>Don't have an account? </Text>
                  <Pressable onPress={() => router.push('/(auth)/register')}>
                    <Text style={s.footerMetaLink}>Register</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* ── OTP step ── */}
            {step === 'otp' && (
              <View style={s.stepWrap}>
                <View style={s.otpRow}>
                  {otp.map((digit, i) => (
                    <RNTextInput
                      key={i}
                      ref={(r) => { otpRefs.current[i] = r }}
                      value={digit}
                      onChangeText={(v) => handleOtpChange(v, i)}
                      onKeyPress={(e) => handleOtpKeyPress(e, i)}
                      style={[s.otpBox, digit ? [s.otpBoxOn, { borderColor: ACCENT, backgroundColor: ACCENT_DIM }] : null]}
                      keyboardType="number-pad"
                      maxLength={1}
                      selectTextOnFocus
                      caretHidden
                      editable={!loading}
                    />
                  ))}
                </View>

                {error ? (
                  <View style={s.errorBox}>
                    <Text style={{ color: ERROR, fontSize: 13 }}>{error}</Text>
                  </View>
                ) : null}

                <Pressable
                  onPress={() => handleVerifyOtp(otp.join(''))}
                  disabled={loading || otp.includes('')}
                  style={({ pressed }) => ({
                    opacity: (loading || otp.includes('')) ? 0.4 : pressed ? 0.85 : 1,
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
                      <Text style={s.btnText}>Verify Code</Text>
                    )}
                  </LinearGradient>
                </Pressable>

                <View style={s.otpMeta}>
                  <Pressable onPress={handleResend} disabled={cooldown > 0} hitSlop={10}>
                    <Text style={[s.resendText, cooldown > 0 && { color: '#94A3B8' }]}>
                      {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                    </Text>
                  </Pressable>
                  <Text style={{ color: '#CBD5E1' }}>·</Text>
                  <Pressable onPress={goBack} hitSlop={10}>
                    <Text style={{ color: '#64748B', fontSize: 13 }}>Change email</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* Dev skip */}
            {DEV_ALLOW_SKIP && (
              <Pressable
                onPress={handleDevSkip}
                style={({ pressed }) => [s.devSkipBtn, pressed && { opacity: 0.6 }]}
              >
                <Ionicons name="play-skip-forward-outline" size={14} color="#64748B" />
                <Text style={s.devSkipText}>Skip to Home (dev only)</Text>
              </Pressable>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  kav: { flex: 1 },
  form: { flexGrow: 1, paddingHorizontal: 24 },
  content: { flex: 1 },
  appBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 11,
    paddingVertical: 5,
    marginBottom: 28,
  },
  appBadgeDot: { width: 6, height: 6, borderRadius: 999, backgroundColor: ACCENT },
  appBadgeText: { fontSize: 11, fontWeight: '600', color: '#64748B', letterSpacing: 0.2 },
  titleBlock: { gap: 10, marginBottom: 28 },
  titleBold: { fontSize: 30, fontWeight: '800', color: '#0F172A', letterSpacing: -0.8, lineHeight: 36 },
  sub: { fontSize: 14, color: '#475569', lineHeight: 20 },
  emailPill: {
    alignSelf: 'flex-start', borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: 'rgba(59,130,246,0.06)', borderColor: 'rgba(59,130,246,0.2)',
  },
  emailPillText: { fontSize: 13, fontWeight: '500', color: ACCENT },
  stepWrap: { gap: 16 },
  fieldGroup: { gap: 8 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: '#64748B' },
  input: {
    height: 52, backgroundColor: '#F8FAFC',
    borderWidth: 1, borderColor: BORDER, borderRadius: 14,
    paddingHorizontal: 16, color: '#0F172A', fontSize: 16,
  },
  btn: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 8 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: BORDER },
  dividerText: { color: '#94A3B8', fontSize: 12 },
  socialRow: { flexDirection: 'row', gap: 12 },
  socialBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 50, backgroundColor: '#F8FAFC', borderRadius: 14,
    borderWidth: 1, borderColor: BORDER,
  },
  socialIcon: {
    width: 22, height: 22, borderRadius: 5,
    alignItems: 'center', justifyContent: 'center',
  },
  socialBtnText: { color: '#0F172A', fontSize: 14, fontWeight: '600' },
  errorBox: { borderRadius: 10, borderWidth: 1, borderColor: `${ERROR}33`, padding: 12, backgroundColor: '#FEF2F2' },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  otpBox: {
    flex: 1,
    height: 56, backgroundColor: '#F8FAFC',
    borderWidth: 1, borderColor: BORDER, borderRadius: 12,
    color: '#0F172A', fontSize: 22, textAlign: 'center',
  },
  otpBoxOn: { color: ACCENT },
  otpMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 10 },
  resendText: { color: ACCENT, fontSize: 13, fontWeight: '500' },
  devSkipBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    alignSelf: 'center',
    marginTop: 24,
    borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed',
    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#F8FAFC',
  },
  devSkipText: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  footerMeta: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 14 },
  footerMetaText: { color: '#64748B', fontSize: 14 },
  footerMetaLink: { color: ACCENT, fontSize: 14, fontWeight: '700' },
})
