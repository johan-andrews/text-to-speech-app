import React, { useState, useRef } from 'react'
import {
  View, Pressable, StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, TextInput as RNTextInput, ScrollView, Alert
} from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { router } from 'expo-router'
import { Text } from '@/components/ui/Text'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { ACCENT, ERROR, BORDER } from '@/lib/theme'
import { APP_NAME } from '@/lib/constants'

export default function RegisterScreen() {
  const insets = useSafeAreaInsets()
  const [step, setStep] = useState<'form' | 'verify'>('form')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', '', '', '']) // 8-digit OTP
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const otpRefs = useRef<(RNTextInput | null)[]>([])

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all fields.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            full_name: fullName.trim(),
          }
        }
      })

      if (signUpError) throw signUpError

      if (data.session) {
        // Email confirmation is disabled, logged in immediately!
        Alert.alert('Success!', 'Registration successful! Welcome to VoiceFlow.', [
          { text: 'Let\'s Go!', onPress: () => router.replace('/(tabs)') }
        ])
      } else {
        // Email confirmation is enabled, proceed to verify step!
        setStep('verify')
        setTimeout(() => otpRefs.current[0]?.focus(), 300)
      }
    } catch (e: any) {
      setError(e?.message ?? 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (code: string) => {
    if (code.length < 8) return
    setLoading(true)
    setError(null)
    
    try {
      const { data, error: err } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: code,
        type: 'signup',
      })
      if (err) throw err

      Alert.alert('Success!', 'Your account has been verified! Welcome to VoiceFlow.', [
        { text: 'Let\'s Go!', onPress: () => router.replace('/(tabs)') }
      ])
    } catch (e: any) {
      setError(e?.message ?? 'Invalid code or session expired.')
      setOtp(['', '', '', '', '', '', '', ''])
      setTimeout(() => otpRefs.current[0]?.focus(), 50)
    } finally {
      setLoading(false)
    }
  }

  const handleOtpChange = (val: string, index: number) => {
    const digit = val.replace(/\D/g, '').slice(-1)
    const next = [...otp]
    next[index] = digit
    setOtp(next)
    if (digit && index < 7) otpRefs.current[index + 1]?.focus()
    const code = next.join('')
    if (code.length === 8 && !next.includes('')) handleVerifyOtp(code)
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
    setLoading(true)
    setError(null)
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            full_name: fullName.trim(),
          }
        }
      })
      if (signUpError) throw signUpError
      setOtp(['', '', '', '', '', '', '', ''])
      Alert.alert('Code Resent', 'A new 8-digit verification code has been sent to your email.')
      setTimeout(() => otpRefs.current[0]?.focus(), 50)
    } catch (e: any) {
      setError(e?.message ?? 'Resend failed.')
    } finally {
      setLoading(false)
    }
  }

  const goBackToForm = () => {
    setStep('form')
    setOtp(['', '', '', '', '', '', '', ''])
    setError(null)
  }

  return (
    <View style={s.root}>
      {/* Back button */}
      <Pressable onPress={() => {
        if (step === 'verify') {
          goBackToForm()
        } else {
          router.back()
        }
      }} style={[s.backBtn, { top: insets.top + 14 }]} hitSlop={14}>
        <Ionicons name="chevron-back" size={24} color="#0F172A" />
      </Pressable>

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

            {step === 'form' ? (
              <>
                {/* Heading */}
                <View style={s.titleBlock}>
                  <Text style={s.titleBold}>Create account</Text>
                  <Text style={s.sub}>Get started for free. Speak, think, and create.</Text>
                </View>

                <View style={s.stepWrap}>
                  {/* Name */}
                  <View style={s.fieldGroup}>
                    <Text style={s.label}>FULL NAME</Text>
                    <RNTextInput
                      value={fullName}
                      onChangeText={(v) => { setFullName(v); setError(null) }}
                      style={s.input}
                      autoCapitalize="words"
                      autoCorrect={false}
                    />
                  </View>

                  {/* Email */}
                  <View style={s.fieldGroup}>
                    <Text style={s.label}>EMAIL ADDRESS</Text>
                    <RNTextInput
                      value={email}
                      onChangeText={(v) => { setEmail(v); setError(null) }}
                      style={s.input}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>

                  {/* Password */}
                  <View style={s.fieldGroup}>
                    <Text style={s.label}>PASSWORD</Text>
                    <RNTextInput
                      value={password}
                      onChangeText={(v) => { setPassword(v); setError(null) }}
                      style={s.input}
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>

                  {error ? (
                    <View style={s.errorBox}>
                      <Text style={{ color: ERROR, fontSize: 13 }}>{error}</Text>
                    </View>
                  ) : null}

                  <Pressable
                    onPress={handleRegister}
                    disabled={loading}
                    style={({ pressed }) => ({
                      opacity: loading ? 0.6 : pressed ? 0.85 : 1,
                      borderRadius: 14, overflow: 'hidden',
                      marginTop: 10,
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
                        <Text style={s.btnText}>Register</Text>
                      )}
                    </LinearGradient>
                  </Pressable>

                  <View style={s.footerMeta}>
                    <Text style={s.footerMetaText}>Already have an account? </Text>
                    <Pressable onPress={() => router.push('/')}>
                      <Text style={s.footerMetaLink}>Sign In</Text>
                    </Pressable>
                  </View>
                </View>
              </>
            ) : (
              <>
                {/* Heading */}
                <View style={s.titleBlock}>
                  <Text style={s.titleBold}>Verify Account</Text>
                  <Text style={s.sub}>We sent an 8-digit verification code to your email. Enter it below to complete registration.</Text>
                </View>

                <View style={s.stepWrap}>
                  <View style={s.otpRow}>
                    {otp.map((digit, i) => (
                      <RNTextInput
                        key={i}
                        ref={(r) => { otpRefs.current[i] = r }}
                        value={digit}
                        onChangeText={(v) => handleOtpChange(v, i)}
                        onKeyPress={(e) => handleOtpKeyPress(e, i)}
                        style={[
                          s.otpBox,
                          digit ? { borderColor: ACCENT, backgroundColor: '#EFF6FF', color: '#1E3A8A', fontWeight: '800' } : null
                        ]}
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
                      opacity: (loading || otp.includes('')) ? 0.45 : pressed ? 0.88 : 1,
                      borderRadius: 14, overflow: 'hidden',
                      marginTop: 10,
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

                  <View style={s.footerMeta}>
                    <Pressable onPress={handleResend} disabled={loading} hitSlop={10}>
                      <Text style={s.footerMetaLink}>Resend code</Text>
                    </Pressable>
                    <Text style={{ color: '#E2E8F0', marginHorizontal: 8 }}>·</Text>
                    <Pressable onPress={goBackToForm} hitSlop={10}>
                      <Text style={{ color: '#64748B', fontSize: 14, fontWeight: '600' }}>Change details</Text>
                    </Pressable>
                  </View>
                </View>
              </>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  backBtn: { position: 'absolute', left: 16, zIndex: 20 },
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
  errorBox: { borderRadius: 10, borderWidth: 1, borderColor: `${ERROR}33`, padding: 12, backgroundColor: '#FEF2F2' },
  footerMeta: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 14 },
  footerMetaText: { color: '#64748B', fontSize: 14 },
  footerMetaLink: { color: ACCENT, fontSize: 14, fontWeight: '700' },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 4, marginTop: 10 },
  otpBox: {
    flex: 1,
    height: 48,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    color: '#0F172A',
    fontSize: 18,
    textAlign: 'center',
  },
})
