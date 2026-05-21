import React, { useEffect, useState } from 'react'
import { View, StyleSheet, Platform, DeviceEventEmitter } from 'react-native'
import { Stack, useNavigationContainerRef, usePathname } from 'expo-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'

import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { useFonts } from 'expo-font'
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter'
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native'
import { I18nextProvider } from 'react-i18next'

import { supabase, isSupabaseEnabled } from '@/lib/supabase'
import { track } from '@/lib/analytics'
import { SubscriptionProvider } from '@/contexts/SubscriptionContext'
import { TranscriptionProvider, useTranscription } from '@/contexts/TranscriptionContext'
import { ToastProvider } from '@/contexts/ToastContext'
import i18n, { initI18n } from '@/lib/i18n'
import OfflineBanner from '@/components/OfflineBanner'
import OfflineOverlay from '@/components/OfflineOverlay'
import { Text } from '@/components/ui/Text'
import { BG } from '@/lib/theme'

// ─── Error boundary ───────────────────────────────────────────────────────────
function ErrorFallback() {
  return (
    <View style={eb.container}>
      <Text style={eb.title}>Something went wrong</Text>
      <Text style={eb.subtitle}>Please close and reopen the app.</Text>
    </View>
  )
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, info)
  }

  render() {
    if (this.state.hasError) return <ErrorFallback />
    return this.props.children
  }
}

const eb = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: BG,
    alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  title: { color: '#1E293B', fontSize: 18, fontWeight: '700', marginBottom: 10, textAlign: 'center' },
  subtitle: { color: '#64748B', fontSize: 14, textAlign: 'center', lineHeight: 22 },
})

// ─── Theme ────────────────────────────────────────────────────────────────────
// Using DefaultTheme (light background) with our custom BG
const customTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: BG },
}

// ─── Screen tracking ─────────────────────────────────────────────────────────
function ScreenTracker() {
  const pathname = usePathname()
  useEffect(() => {
    track('screen_viewed', { screen: pathname })
  }, [pathname])
  return null
}

// ─── Inner layout to handle transcription config loading ──────────────────────
function InnerLayout({
  navigationRef,
  isAuthed,
  onboardingCompleted,
}: {
  navigationRef: React.RefObject<any>
  isAuthed: boolean | null
  onboardingCompleted: boolean | null
}) {
  const { loadConfig } = useTranscription()

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  return (
    <Stack ref={navigationRef} screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: BG } }}>
      {/* ── Unauthenticated screens ────────────────────────────────── */}
      <Stack.Protected guard={!isAuthed}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      {/* ── Onboarding screens ─────────────────────────────────────── */}
      <Stack.Protected guard={!!isAuthed && onboardingCompleted === false}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>

      {/* ── Authenticated screens ──────────────────────────────────── */}
      <Stack.Protected guard={!!isAuthed && onboardingCompleted === true}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="session/[id]" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="support" />
      </Stack.Protected>

      {/* ── Always-public screens ── */}
      <Stack.Screen name="privacy" />
      <Stack.Screen name="terms" />
    </Stack>
  )
}

// ─── Root layout ──────────────────────────────────────────────────────────────
export default function RootLayout() {
  const navigationRef = useNavigationContainerRef()
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  })

  // null = still checking; true/false = auth state known
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null)
  // null = loading; false = not completed; true = completed
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null)
  const [i18nReady, setI18nReady] = useState(false)

  useEffect(() => {
    initI18n().then(() => setI18nReady(true))
  }, [])

  useEffect(() => {
    if (!isSupabaseEnabled) {
      // No credentials — stay on landing page, no errors thrown
      setIsAuthed(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthed(!!session)
      if (session?.user) {
        setOnboardingCompleted(session.user.user_metadata?.onboarding_completed === true)
      } else {
        setOnboardingCompleted(null)
      }
    }).catch(() => {
      console.warn('[Auth] Could not reach Supabase — defaulting to signed-out state.')
      setIsAuthed(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setIsAuthed(true)
        setOnboardingCompleted(session.user.user_metadata?.onboarding_completed === true)
      }
      if (event === 'SIGNED_OUT') {
        setIsAuthed(false)
        setOnboardingCompleted(null)
      }
      if (event === 'USER_UPDATED' && session?.user) {
        setOnboardingCompleted(session.user.user_metadata?.onboarding_completed === true)
      }
      if (event === 'TOKEN_REFRESHED' && session?.user) {
        setOnboardingCompleted(session.user.user_metadata?.onboarding_completed === true)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!__DEV__) return
    const sub = DeviceEventEmitter.addListener('__dev_skip_auth__', () => {
      setIsAuthed(true)
      setOnboardingCompleted(true)
    })
    return () => sub.remove()
  }, [])

  // Show blank light screen while session + i18n checks complete.
  if (!fontsLoaded || isAuthed === null || !i18nReady || (isAuthed === true && onboardingCompleted === null)) {
    return <View style={{ flex: 1, backgroundColor: BG }} />
  }

  return (
    <ErrorBoundary>
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={queryClient}>
          <SubscriptionProvider>
            <ToastProvider>
              <SafeAreaProvider>
                <TranscriptionProvider>
                  <GestureHandlerRootView style={{ flex: 1, backgroundColor: BG }}>
                    <BottomSheetModalProvider>
                      <StatusBar
                        style="dark"
                        translucent={Platform.OS === 'android'}
                        backgroundColor={Platform.OS === 'android' ? BG : undefined}
                      />
                      <ThemeProvider value={customTheme}>
                        <View style={{ flex: 1, backgroundColor: BG }}>
                          <InnerLayout navigationRef={navigationRef} isAuthed={isAuthed} onboardingCompleted={onboardingCompleted} />
                          <ScreenTracker />
                          <OfflineBanner />
                          <OfflineOverlay />
                        </View>
                      </ThemeProvider>
                    </BottomSheetModalProvider>
                  </GestureHandlerRootView>
                </TranscriptionProvider>
              </SafeAreaProvider>
            </ToastProvider>
          </SubscriptionProvider>
        </QueryClientProvider>
      </I18nextProvider>
    </ErrorBoundary>
  )
}
