import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { AppState } from 'react-native'

let SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''
if (SUPABASE_URL.endsWith('/rest/v1/')) {
  SUPABASE_URL = SUPABASE_URL.replace('/rest/v1/', '')
} else if (SUPABASE_URL.endsWith('/rest/v1')) {
  SUPABASE_URL = SUPABASE_URL.replace('/rest/v1', '')
}
// Remove trailing slashes
if (SUPABASE_URL.endsWith('/')) {
  SUPABASE_URL = SUPABASE_URL.slice(0, -1)
}

const SUPABASE_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  ''

/** True when Supabase credentials are present. Auth/DB calls are no-ops when false. */
export const isSupabaseEnabled = !!SUPABASE_URL && !!SUPABASE_KEY

if (!isSupabaseEnabled) {
  console.warn(
    '[Supabase] Missing EXPO_PUBLIC_SUPABASE_URL or key — running without backend. ' +
    'Set values in .env.local to enable auth and database.'
  )
}

export const supabase = createClient(
  SUPABASE_URL  || 'https://placeholder.supabase.co',
  SUPABASE_KEY  || 'placeholder',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: isSupabaseEnabled,
      persistSession: isSupabaseEnabled,
      detectSessionInUrl: false,
    },
    // Disable realtime entirely when unconfigured — prevents WebSocket errors
    realtime: isSupabaseEnabled ? undefined : { params: { eventsPerSecond: 0 } },
    global: {
      // Suppress fetch errors when Supabase is not configured
      fetch: isSupabaseEnabled ? undefined : () => Promise.resolve(new Response('null', { status: 200 })),
    },
  }
)

// Restart token auto-refresh when app comes to foreground
if (isSupabaseEnabled) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh()
    } else {
      supabase.auth.stopAutoRefresh()
    }
  })
}
