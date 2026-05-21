# VoiceFlow AI — Build Instructions
### AI Voice Dictation App (Wispr Flow Clone)
> Structured build instructions for the 8x React Native Expo template

---

## 0. Overview & Architecture Decisions

### What You're Building
A mobile AI voice dictation app where users speak naturally and receive clean, punctuated, formatted text — with voice commands, dictation history, custom vocabulary, and clipboard/share integration. Built on the **8x-rn-template** (Supabase auth, TanStack Query, i18next).

### Expo SDK
**Use Expo SDK 54** throughout. Do not upgrade to 55 even if prompted.

### Phase Structure
- **Phase 1 (Expo Go compatible):** Standalone dictation app — record → transcribe → clean → copy/share
- **Phase 2 (Native build only):** iOS/Android keyboard extension — document but do not implement in Phase 1

### Remove from Template
Strip out all of the following before writing any feature code:
- **Sentry** (`@sentry/react-native`) — remove package, remove from `app.json` plugins, remove all imports
- **PostHog** (`posthog-react-native`) — remove package, remove all imports, remove `lib/analytics.ts` usage (keep the file but stub it as a no-op)
- **RevenueCat** (`react-native-purchases`) — remove package, remove `SubscriptionContext`, remove `/upgrade` screen, remove paywall references. Keep the subscription-gating pattern documented so it can be re-added later.

### Color Scheme
- **Primary:** Light blue — `#60A5FA` (Tailwind `blue-400`)
- **Background:** White — `#FFFFFF`
- **Accent (theme.ts ACCENT):** `#60A5FA`
- **Secondary surfaces:** `#EFF6FF` (Tailwind `blue-50`)
- **Text primary:** `#1E293B`
- **Text secondary:** `#64748B`
- Update `lib/theme.ts` and `tailwind.config.js` to reflect these values

---

## 1. Repository Setup

### 1.1 Clone & Initialize
```bash
git clone https://github.com/8xsocial/template-mobile.git voiceflow-ai
cd voiceflow-ai
rm -rf .git
git init
git add .
git commit -m "feat: init from 8x-rn-template"
```

### 1.2 Set Expo SDK 54
In `package.json`, ensure:
```json
{
  "dependencies": {
    "expo": "~54.0.0",
    "react-native": "0.76.7",
    "expo-router": "~4.0.0"
  }
}
```
Run `npm install` after changes.

### 1.3 Remove Unwanted Packages
```bash
npm uninstall @sentry/react-native posthog-react-native react-native-purchases
```

Remove Sentry from `app.json` plugins array. Remove all `import` statements for these three packages across the codebase. Replace `track()` calls in `lib/analytics.ts` with a no-op stub:
```typescript
// lib/analytics.ts — stub, no PostHog
export const track = (_event: string, _props?: Record<string, unknown>) => {}
export const identify = (_userId: string) => {}
export const screen = (_name: string) => {}
```

### 1.4 App Identity (app.json)
```json
{
  "expo": {
    "name": "VoiceFlow AI",
    "slug": "voiceflow-ai",
    "scheme": "voiceflow",
    "version": "1.0.0",
    "sdkVersion": "54.0.0",
    "ios": {
      "bundleIdentifier": "com.yourcompany.voiceflowai",
      "infoPlist": {
        "NSMicrophoneUsageDescription": "VoiceFlow needs microphone access to transcribe your voice.",
        "NSSpeechRecognitionUsageDescription": "VoiceFlow uses speech recognition to convert your voice to text."
      }
    },
    "android": {
      "package": "com.yourcompany.voiceflowai",
      "permissions": ["RECORD_AUDIO", "INTERNET"]
    },
    "plugins": [
      "expo-router",
      "expo-av",
      ["expo-speech-recognition", {
        "microphonePermission": "Allow VoiceFlow to use the microphone.",
        "speechRecognitionPermission": "Allow VoiceFlow to use speech recognition."
      }]
    ]
  }
}
```

### 1.5 lib/constants.ts
```typescript
export const APP_NAME          = 'VoiceFlow AI'
export const APP_TAGLINE       = 'Speak. Think. Create.'
export const APP_SCHEME        = 'voiceflow'
export const APP_SUPPORT_EMAIL = 'support@voiceflowai.com'
export const APP_DOCS_URL      = 'https://voiceflowai.com/docs'
```

---

## 2. Additional Dependencies to Install

```bash
# Audio recording
npx expo install expo-av

# Native speech recognition (on-device, free — iOS & Android fallback)
npx expo install expo-speech-recognition

# Clipboard
npx expo install expo-clipboard

# Share sheet
npx expo install expo-sharing

# Haptics for recording feedback
npx expo install expo-haptics

# Secure storage for API keys entered by user
npx expo install expo-secure-store

# File system (for saving audio blobs before upload)
npx expo install expo-file-system

# Network state (for offline detection — already wired in template)
npx expo install @react-native-community/netinfo

# Animated microphone/waveform SVG
npm install react-native-svg

# Markdown-style text rendering (for formatted transcription output)
npm install react-native-markdown-display
```

---

## 3. Transcription API Strategy

### Priority Order
| Priority | Provider | Why |
|---|---|---|
| 1 | **Groq Cloud (Whisper)** | Free tier, ultra-low latency (~0.5–1s), high quality, simple REST API |
| 2 | **Deepgram** | Free tier ($200 credit), streaming support, very accurate |
| 3 | **OpenAI Whisper API** | Reliable, $0.006/min — last paid resort |
| 4 | **expo-speech-recognition** | On-device, no internet, limited quality — emergency fallback only |

### 3.1 API Configuration File

Create `lib/transcription/config.ts`:
```typescript
export type TranscriptionProvider = 'groq' | 'deepgram' | 'openai' | 'native'

export interface TranscriptionConfig {
  primary: TranscriptionProvider
  fallbackOrder: TranscriptionProvider[]
  groqApiKey?: string
  deepgramApiKey?: string
  openaiApiKey?: string
}

export const DEFAULT_CONFIG: TranscriptionConfig = {
  primary: 'groq',
  fallbackOrder: ['deepgram', 'openai', 'native'],
}

// Error messages shown to users — keep these friendly
export const PROVIDER_ERROR_MESSAGES: Record<TranscriptionProvider, string> = {
  groq:     'Groq transcription unavailable. Trying next provider…',
  deepgram: 'Deepgram transcription unavailable. Trying next provider…',
  openai:   'OpenAI transcription unavailable. Trying on-device fallback…',
  native:   'On-device transcription failed. Please check your microphone and try again.',
}

export const GENERIC_TRANSCRIPTION_ERROR =
  'Transcription failed across all providers. Please check your internet connection and API keys in Settings.'
```

### 3.2 Groq Transcription Client

Create `lib/transcription/groq.ts`:
```typescript
import * as FileSystem from 'expo-file-system'

export interface TranscriptionResult {
  text: string
  provider: string
  durationMs: number
}

export async function transcribeWithGroq(
  audioUri: string,
  apiKey: string,
  language = 'en'
): Promise<TranscriptionResult> {
  const start = Date.now()

  if (!apiKey) throw new Error('GROQ_KEY_MISSING: No Groq API key configured.')

  // Read audio file as base64, then create a blob for multipart upload
  const fileInfo = await FileSystem.getInfoAsync(audioUri)
  if (!fileInfo.exists) throw new Error('AUDIO_FILE_MISSING: Audio file not found.')

  const formData = new FormData()
  formData.append('file', {
    uri: audioUri,
    type: 'audio/m4a',
    name: 'recording.m4a',
  } as unknown as Blob)
  formData.append('model', 'whisper-large-v3')
  formData.append('language', language)
  formData.append('response_format', 'json')

  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  })

  if (response.status === 401) throw new Error('GROQ_AUTH: Invalid Groq API key.')
  if (response.status === 429) throw new Error('GROQ_RATE: Groq rate limit exceeded.')
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`GROQ_ERROR: ${response.status} — ${body}`)
  }

  const data = await response.json()
  return {
    text: data.text ?? '',
    provider: 'Groq (Whisper)',
    durationMs: Date.now() - start,
  }
}
```

### 3.3 Deepgram Transcription Client

Create `lib/transcription/deepgram.ts`:
```typescript
import * as FileSystem from 'expo-file-system'

export async function transcribeWithDeeepgram(
  audioUri: string,
  apiKey: string,
  language = 'en'
): Promise<{ text: string; provider: string; durationMs: number }> {
  const start = Date.now()

  if (!apiKey) throw new Error('DEEPGRAM_KEY_MISSING: No Deepgram API key configured.')

  const audioData = await FileSystem.readAsStringAsync(audioUri, {
    encoding: FileSystem.EncodingType.Base64,
  })
  const binaryData = Uint8Array.from(atob(audioData), c => c.charCodeAt(0))

  const response = await fetch(
    `https://api.deepgram.com/v1/listen?model=nova-2&language=${language}&punctuate=true&smart_format=true`,
    {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': 'audio/m4a',
      },
      body: binaryData,
    }
  )

  if (response.status === 401) throw new Error('DEEPGRAM_AUTH: Invalid Deepgram API key.')
  if (response.status === 429) throw new Error('DEEPGRAM_RATE: Deepgram rate limit exceeded.')
  if (!response.ok) throw new Error(`DEEPGRAM_ERROR: ${response.status}`)

  const data = await response.json()
  const text = data?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? ''
  return { text, provider: 'Deepgram Nova-2', durationMs: Date.now() - start }
}
```

### 3.4 OpenAI Whisper Client

Create `lib/transcription/openai.ts`:
```typescript
export async function transcribeWithOpenAI(
  audioUri: string,
  apiKey: string,
  language = 'en'
): Promise<{ text: string; provider: string; durationMs: number }> {
  const start = Date.now()

  if (!apiKey) throw new Error('OPENAI_KEY_MISSING: No OpenAI API key configured.')

  const formData = new FormData()
  formData.append('file', {
    uri: audioUri,
    type: 'audio/m4a',
    name: 'recording.m4a',
  } as unknown as Blob)
  formData.append('model', 'whisper-1')
  formData.append('language', language)

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  })

  if (response.status === 401) throw new Error('OPENAI_AUTH: Invalid OpenAI API key.')
  if (response.status === 429) throw new Error('OPENAI_RATE: OpenAI rate limit exceeded.')
  if (!response.ok) throw new Error(`OPENAI_ERROR: ${response.status}`)

  const data = await response.json()
  return { text: data.text ?? '', provider: 'OpenAI Whisper', durationMs: Date.now() - start }
}
```

### 3.5 Native Fallback Client

Create `lib/transcription/native.ts`:
```typescript
import * as SpeechRecognition from 'expo-speech-recognition'

export async function transcribeWithNative(
  audioUri: string
): Promise<{ text: string; provider: string; durationMs: number }> {
  const start = Date.now()

  const { granted } = await SpeechRecognition.requestPermissionsAsync()
  if (!granted) throw new Error('NATIVE_PERMISSION: Microphone permission denied.')

  return new Promise((resolve, reject) => {
    const sub = SpeechRecognition.addSpeechResultListener((event) => {
      sub.remove()
      resolve({
        text: event.results?.[0]?.transcript ?? '',
        provider: 'On-device (Native)',
        durationMs: Date.now() - start,
      })
    })

    SpeechRecognition.addSpeechErrorListener((error) => {
      sub.remove()
      reject(new Error(`NATIVE_ERROR: ${error.error?.message ?? 'Unknown speech recognition error'}`))
    })

    SpeechRecognition.startAsync({ lang: 'en-US', audioSource: { uri: audioUri } }).catch(reject)
  })
}
```

### 3.6 Transcription Orchestrator (Fallback Chain)

Create `lib/transcription/index.ts`:
```typescript
import { TranscriptionConfig, TranscriptionProvider, PROVIDER_ERROR_MESSAGES, GENERIC_TRANSCRIPTION_ERROR } from './config'
import { transcribeWithGroq } from './groq'
import { transcribeWithDeeepgram } from './deepgram'
import { transcribeWithOpenAI } from './openai'
import { transcribeWithNative } from './native'

export interface TranscriptionOutput {
  text: string
  provider: string
  durationMs: number
  attemptedProviders: string[]
  warnings: string[]
}

async function callProvider(
  provider: TranscriptionProvider,
  audioUri: string,
  config: TranscriptionConfig,
  language: string
): Promise<{ text: string; provider: string; durationMs: number }> {
  switch (provider) {
    case 'groq':
      return transcribeWithGroq(audioUri, config.groqApiKey ?? '', language)
    case 'deepgram':
      return transcribeWithDeeepgram(audioUri, config.deepgramApiKey ?? '', language)
    case 'openai':
      return transcribeWithOpenAI(audioUri, config.openaiApiKey ?? '', language)
    case 'native':
      return transcribeWithNative(audioUri)
  }
}

export async function transcribeAudio(
  audioUri: string,
  config: TranscriptionConfig,
  language = 'en'
): Promise<TranscriptionOutput> {
  const chain: TranscriptionProvider[] = [config.primary, ...config.fallbackOrder]
  const warnings: string[] = []
  const attempted: string[] = []

  for (const provider of chain) {
    attempted.push(provider)
    try {
      const result = await callProvider(provider, audioUri, config, language)
      return {
        ...result,
        attemptedProviders: attempted,
        warnings,
      }
    } catch (err) {
      const msg = PROVIDER_ERROR_MESSAGES[provider] ?? `${provider} failed.`
      warnings.push(msg)
      console.warn(`[Transcription] ${provider} failed:`, err)
    }
  }

  throw new Error(GENERIC_TRANSCRIPTION_ERROR)
}
```

---

## 4. AI Text Cleanup (Post-Processing)

After raw transcription, run an AI cleanup pass for grammar, punctuation, and formatting.

### 4.1 Create `lib/aiCleanup.ts`
```typescript
// Uses Groq (fast, free) to clean up raw transcription text
// Falls back to returning raw text if cleanup fails — never blocks the user

export interface CleanupOptions {
  customVocabulary?: string[]    // domain-specific words to preserve
  outputFormat?: 'plain' | 'markdown'
  applyCommands?: boolean        // process voice commands like "new paragraph"
}

export async function cleanTranscription(
  rawText: string,
  groqApiKey: string,
  options: CleanupOptions = {}
): Promise<string> {
  if (!rawText.trim()) return rawText
  if (!groqApiKey) return rawText  // silently skip if no key

  const vocabHint = options.customVocabulary?.length
    ? `Preserve these domain-specific words exactly as-is: ${options.customVocabulary.join(', ')}.`
    : ''

  const commandHint = options.applyCommands
    ? `Also, convert spoken commands to text formatting: "new paragraph" → paragraph break, "new line" → line break, "period" → ., "comma" → ,, "delete last sentence" → remove the last sentence, "bold that" → **wrap last phrase in bold**.`
    : ''

  const systemPrompt = `You are an expert transcription editor. Fix grammar, add punctuation, and improve readability of dictated text. Do not add or invent content. Do not add explanations. Return only the corrected text. ${vocabHint} ${commandHint}`

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: 2048,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: rawText },
        ],
      }),
    })

    if (!response.ok) return rawText  // graceful fallback

    const data = await response.json()
    return data.choices?.[0]?.message?.content?.trim() ?? rawText
  } catch {
    return rawText  // never block on cleanup failure
  }
}

// Parse voice commands from raw text BEFORE sending to cleanup
export function parseVoiceCommands(text: string): { processedText: string; commandsFound: string[] } {
  const commands: string[] = []
  let processed = text

  const commandMap: Array<{ pattern: RegExp; replacement: string; name: string }> = [
    { pattern: /\bnew paragraph\b/gi, replacement: '\n\n', name: 'new_paragraph' },
    { pattern: /\bnew line\b/gi, replacement: '\n', name: 'new_line' },
    { pattern: /\bperiod\b/gi, replacement: '.', name: 'period' },
    { pattern: /\bcomma\b/gi, replacement: ',', name: 'comma' },
    { pattern: /\bquestion mark\b/gi, replacement: '?', name: 'question_mark' },
    { pattern: /\bexclamation mark\b/gi, replacement: '!', name: 'exclamation_mark' },
    { pattern: /\bopen quote\b/gi, replacement: '"', name: 'open_quote' },
    { pattern: /\bclose quote\b/gi, replacement: '"', name: 'close_quote' },
    { pattern: /\ball caps\s+(\w+)/gi, replacement: (_, w) => w.toUpperCase(), name: 'all_caps' },
  ]

  for (const cmd of commandMap) {
    if (cmd.pattern.test(processed)) {
      commands.push(cmd.name)
      processed = processed.replace(cmd.pattern, cmd.replacement)
    }
  }

  return { processedText: processed, commandsFound: commands }
}
```

---

## 5. Data Layer — Supabase Schema

### 5.1 Migration: `supabase/migrations/20240101_voiceflow_schema.sql`
```sql
-- Dictation sessions
create table if not exists dictation_sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade,
  raw_text      text,
  cleaned_text  text,
  provider      text,               -- which API was used
  duration_ms   integer,            -- transcription latency
  audio_uri     text,               -- local URI (not stored remotely in v1)
  language      text default 'en',
  title         text,               -- auto-generated from first sentence
  is_starred    boolean default false,
  is_deleted    boolean default false,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Custom vocabulary per user
create table if not exists custom_vocabulary (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,
  word       text not null,
  category   text,                  -- e.g. 'medical', 'legal', 'tech'
  created_at timestamptz default now()
);

-- RLS
alter table dictation_sessions enable row level security;
alter table custom_vocabulary enable row level security;

create policy "Users manage own sessions"
  on dictation_sessions for all using (auth.uid() = user_id);

create policy "Users manage own vocabulary"
  on custom_vocabulary for all using (auth.uid() = user_id);

-- Index for history feed
create index dictation_sessions_user_created
  on dictation_sessions(user_id, created_at desc)
  where is_deleted = false;
```

### 5.2 TanStack Query Hooks

Create `hooks/useDictationHistory.ts`:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface DictationSession {
  id: string
  raw_text: string
  cleaned_text: string
  provider: string
  duration_ms: number
  language: string
  title: string
  is_starred: boolean
  created_at: string
}

export function useDictationHistory() {
  return useQuery({
    queryKey: ['dictation_history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dictation_sessions')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return (data ?? []) as DictationSession[]
    },
    placeholderData: [],
    staleTime: 30_000,
  })
}

export function useSaveSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (session: Partial<DictationSession> & { user_id: string }) => {
      const { data, error } = await supabase
        .from('dictation_sessions')
        .insert(session)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dictation_history'] }),
  })
}

export function useDeleteSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('dictation_sessions').update({ is_deleted: true }).eq('id', id)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dictation_history'] }),
  })
}

export function useToggleStar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, is_starred }: { id: string; is_starred: boolean }) => {
      await supabase.from('dictation_sessions').update({ is_starred }).eq('id', id)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dictation_history'] }),
  })
}
```

Create `hooks/useCustomVocabulary.ts`:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useCustomVocabulary() {
  return useQuery({
    queryKey: ['custom_vocabulary'],
    queryFn: async () => {
      const { data, error } = await supabase.from('custom_vocabulary').select('*').order('word')
      if (error) throw error
      return data ?? []
    },
    placeholderData: [],
  })
}

export function useAddVocabWord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ word, category, user_id }: { word: string; category?: string; user_id: string }) => {
      const { error } = await supabase.from('custom_vocabulary').insert({ word, category, user_id })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['custom_vocabulary'] }),
  })
}

export function useDeleteVocabWord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('custom_vocabulary').delete().eq('id', id)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['custom_vocabulary'] }),
  })
}
```

---

## 6. Core Recording Hook

Create `hooks/useAudioRecorder.ts`:
```typescript
import { useState, useRef, useCallback } from 'react'
import { Audio } from 'expo-av'
import * as Haptics from 'expo-haptics'

export type RecordingState = 'idle' | 'requesting' | 'recording' | 'stopping' | 'error'

export interface RecordingResult {
  uri: string
  durationMs: number
}

export function useAudioRecorder() {
  const [state, setState] = useState<RecordingState>('idle')
  const [durationMs, setDurationMs] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const recordingRef = useRef<Audio.Recording | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)

  const startRecording = useCallback(async () => {
    setErrorMessage(null)
    setState('requesting')

    try {
      const { granted } = await Audio.requestPermissionsAsync()
      if (!granted) {
        setErrorMessage('Microphone permission is required to record audio. Please enable it in Settings.')
        setState('error')
        return
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      })

      const recording = new Audio.Recording()
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY)
      await recording.startAsync()

      recordingRef.current = recording
      startTimeRef.current = Date.now()
      setState('recording')

      // Haptic feedback: recording started
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

      // Update duration every 100ms
      timerRef.current = setInterval(() => {
        setDurationMs(Date.now() - startTimeRef.current)
      }, 100)
    } catch (err) {
      console.error('[AudioRecorder] startRecording failed:', err)
      setErrorMessage('Failed to start recording. Please try again.')
      setState('error')
    }
  }, [])

  const stopRecording = useCallback(async (): Promise<RecordingResult | null> => {
    if (!recordingRef.current) return null

    setState('stopping')

    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    try {
      await recordingRef.current.stopAndUnloadAsync()
      const uri = recordingRef.current.getURI()
      const duration = Date.now() - startTimeRef.current

      recordingRef.current = null
      setState('idle')
      setDurationMs(0)

      // Haptic feedback: recording stopped
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

      if (!uri) throw new Error('No audio URI returned from recording.')

      return { uri, durationMs: duration }
    } catch (err) {
      console.error('[AudioRecorder] stopRecording failed:', err)
      setErrorMessage('Failed to stop recording properly. Please try again.')
      setState('error')
      return null
    }
  }, [])

  const cancelRecording = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync()
      } catch { /* ignore */ }
      recordingRef.current = null
    }
    setState('idle')
    setDurationMs(0)
    setErrorMessage(null)
  }, [])

  return {
    state,
    durationMs,
    errorMessage,
    startRecording,
    stopRecording,
    cancelRecording,
    isRecording: state === 'recording',
  }
}
```

---

## 7. Transcription Context

Create `contexts/TranscriptionContext.tsx`:
```typescript
import React, { createContext, useContext, useState, useCallback } from 'react'
import * as SecureStore from 'expo-secure-store'
import { TranscriptionConfig, DEFAULT_CONFIG } from '@/lib/transcription/config'
import { transcribeAudio, TranscriptionOutput } from '@/lib/transcription'
import { cleanTranscription, parseVoiceCommands } from '@/lib/aiCleanup'

interface TranscriptionState {
  isTranscribing: boolean
  lastResult: TranscriptionOutput | null
  error: string | null
  config: TranscriptionConfig
}

interface TranscriptionContextValue extends TranscriptionState {
  transcribe: (audioUri: string, customVocab?: string[]) => Promise<TranscriptionOutput | null>
  clearError: () => void
  updateConfig: (updates: Partial<TranscriptionConfig>) => Promise<void>
  loadConfig: () => Promise<void>
}

const TranscriptionContext = createContext<TranscriptionContextValue | null>(null)

const SECURE_STORE_KEY = 'voiceflow_transcription_config'

export function TranscriptionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TranscriptionState>({
    isTranscribing: false,
    lastResult: null,
    error: null,
    config: DEFAULT_CONFIG,
  })

  const loadConfig = useCallback(async () => {
    try {
      const stored = await SecureStore.getItemAsync(SECURE_STORE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<TranscriptionConfig>
        setState(s => ({ ...s, config: { ...DEFAULT_CONFIG, ...parsed } }))
      }
    } catch {
      // Use defaults if loading fails
    }
  }, [])

  const updateConfig = useCallback(async (updates: Partial<TranscriptionConfig>) => {
    setState(s => {
      const newConfig = { ...s.config, ...updates }
      SecureStore.setItemAsync(SECURE_STORE_KEY, JSON.stringify(newConfig)).catch(console.warn)
      return { ...s, config: newConfig }
    })
  }, [])

  const transcribe = useCallback(async (
    audioUri: string,
    customVocab: string[] = []
  ): Promise<TranscriptionOutput | null> => {
    setState(s => ({ ...s, isTranscribing: true, error: null }))

    try {
      // Step 1: Transcribe audio
      const raw = await transcribeAudio(audioUri, state.config)

      // Step 2: Parse voice commands
      const { processedText } = parseVoiceCommands(raw.text)

      // Step 3: AI cleanup
      const cleanedText = await cleanTranscription(
        processedText,
        state.config.groqApiKey ?? '',
        { customVocabulary: customVocab, applyCommands: true }
      )

      const result: TranscriptionOutput = {
        ...raw,
        text: cleanedText,
      }

      setState(s => ({ ...s, isTranscribing: false, lastResult: result }))
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred during transcription.'
      setState(s => ({ ...s, isTranscribing: false, error: message }))
      return null
    }
  }, [state.config])

  const clearError = useCallback(() => setState(s => ({ ...s, error: null })), [])

  return (
    <TranscriptionContext.Provider value={{ ...state, transcribe, clearError, updateConfig, loadConfig }}>
      {children}
    </TranscriptionContext.Provider>
  )
}

export function useTranscription() {
  const ctx = useContext(TranscriptionContext)
  if (!ctx) throw new Error('useTranscription must be used inside <TranscriptionProvider>')
  return ctx
}
```

---

## 8. Screen Architecture

### 8.1 App Directory Structure
```
app/
  _layout.tsx                    ← Add TranscriptionProvider here
  index.tsx                      ← Landing / redirect to tabs
  privacy.tsx                    ← Keep from template
  terms.tsx                      ← Keep from template
  (auth)/
    login.tsx                    ← Keep from template (OTP + Google/Apple)
  (onboarding)/
    index.tsx                    ← Modified: Add API key setup step
  (tabs)/
    _layout.tsx                  ← Modified tab bar (4 tabs)
    index.tsx                    ← DICTATE tab (main screen)
    history.tsx                  ← HISTORY tab
    vocabulary.tsx               ← VOCABULARY tab
    settings.tsx                 ← SETTINGS tab
  session/
    [id].tsx                     ← Session detail + edit screen
```

### 8.2 Root Layout Modification (`app/_layout.tsx`)
Wrap existing providers with `TranscriptionProvider`:
```tsx
import { TranscriptionProvider } from '@/contexts/TranscriptionContext'

// Inside return, add around the existing Stack:
<TranscriptionProvider>
  <Stack>
    {/* existing screens */}
  </Stack>
</TranscriptionProvider>
```
Also call `loadConfig()` from `useTranscription()` in a `useEffect` at the root.

### 8.3 Tabs Configuration (`app/(tabs)/_layout.tsx`)
```tsx
// 4 tabs:
// 1. index      → "Dictate"   icon: Mic
// 2. history    → "History"   icon: Clock
// 3. vocabulary → "Vocab"     icon: BookOpen
// 4. settings   → "Settings"  icon: Settings
```

---

## 9. Screen Specifications

### 9.1 Dictate Tab (`app/(tabs)/index.tsx`)

**UI Regions (top to bottom):**
1. **Header** — App name + language selector dropdown (EN/ES/FR/DE/PT)
2. **Waveform area** — Animated SVG waveform (bars) that pulse while recording; flat when idle. Use `react-native-reanimated` for smooth 60fps animation. Bars should be light blue (`#60A5FA`) on white background.
3. **Timer** — Large mono-font elapsed time display (MM:SS.ms format) — only visible while recording
4. **Transcription preview** — Scrollable text area showing the cleaned transcription result. Placeholder text when empty: *"Tap the mic and start speaking…"*
5. **Provider badge** — Small pill showing which API was used (e.g. "Groq Whisper") + latency in ms. Tap to open provider details.
6. **Action buttons row** (visible after transcription):
   - Copy to clipboard
   - Share
   - Save to history
   - Clear / new recording
7. **Mic button** — Large circular button at the bottom center. States:
   - Idle: solid light blue, mic icon
   - Recording: pulsing red with stop icon
   - Processing: spinning indicator
8. **Error banner** — Slides down from top when transcription fails (show exact provider error message + which providers were tried)

**Behavior:**
- Tap mic → `startRecording()` + start waveform animation
- Tap stop → `stopRecording()` → `transcribe(uri, customVocab)` → show result
- Long-press mic = hold-to-record mode (release to stop)
- Auto-save to local state (unsaved badge until user taps Save)
- If offline: show toast "No internet — on-device transcription only"

**Animations (use react-native-reanimated):**
- Waveform bars: `withRepeat(withSequence(withTiming(...)))` — 8–12 bars with staggered delays
- Mic button: pulse ring animation while recording (`withRepeat(withTiming({ scale: 1.3, opacity: 0 }))`)
- Transcription text: fade-in with slight upward slide when result appears
- Error banner: slide down from top

### 9.2 History Tab (`app/(tabs)/history.tsx`)

**Features:**
- FlatList of past dictation sessions from `useDictationHistory()`
- Each card shows: title (first 60 chars of cleaned text), date, duration, provider badge, star icon
- Pull-to-refresh
- Swipe left on card: delete (soft delete)
- Swipe right on card: star/unstar
- Search bar at top — filters by title/text client-side
- Filter chips: All / Starred / By provider
- Tap card → navigate to `app/session/[id].tsx`
- Empty state: illustration + "No dictations yet. Tap the mic to start."

### 9.3 Session Detail (`app/session/[id].tsx`)

**Features:**
- Full cleaned text, scrollable
- Edit mode: tap pencil icon → `TextInput` becomes editable (update `cleaned_text` in Supabase)
- Raw text toggle: show/hide raw transcription for comparison
- Provider info: provider name, latency, language, date/time
- Action bar: Copy / Share / Star / Delete
- Word count display

### 9.4 Vocabulary Tab (`app/(tabs)/vocabulary.tsx`)

**Features:**
- List of custom vocabulary words from `useCustomVocabulary()`
- Add word: inline form — word + optional category (medical / legal / tech / custom)
- Delete word: swipe or trash icon
- Categories shown as colored tags
- Instructions card at top: "These words will be preserved exactly during transcription"
- Empty state with guidance

### 9.5 Settings Tab (`app/(tabs)/settings.tsx`)

**Sections:**

**Transcription APIs** (most important section):
- Groq API Key: masked text input + test button
- Deepgram API Key: masked text input + test button  
- OpenAI API Key: masked text input + test button
- Primary provider selector (radio group)
- Fallback order display (read-only, based on priority)
- "Test Connection" button — sends a 1-second silent audio clip to verify the key works, shows ✓ or ✗ with the error message

When any "Test" button is tapped:
  - If test passes: green checkmark toast "Groq API key is working ✓"
  - If test fails: red toast with exact error (invalid key / rate limit / network)
  - Keys are saved to SecureStore via `updateConfig()`

**Dictation Preferences:**
- Default language selector
- AI cleanup toggle (on/off)
- Voice commands toggle (on/off)
- Auto-save to history toggle

**Account:**
- Profile name display
- Sign out button

**About:**
- Version number
- Privacy Policy link
- Terms link
- Support email link

### 9.6 Modified Onboarding (`app/(onboarding)/index.tsx`)

Add a step after display name capture:
- "Set up your transcription API" screen
- Shows Groq as recommended (free, fast)
- Groq API key input with link to https://console.groq.com
- Skip button ("Set up later in Settings")
- Saves key via `updateConfig()` if entered

---

## 10. Component Specifications

### 10.1 WaveformVisualizer Component
Create `components/WaveformVisualizer.tsx`:
- Props: `isRecording: boolean`, `barCount?: number` (default 12), `color?: string`
- Use `react-native-reanimated` shared values for each bar height
- When `isRecording = true`: animate bars with staggered sine-wave pattern
- When `isRecording = false`: animate bars back to flat (height = 4px)
- Use `react-native-svg` for rendering the bars
- Bars should be rounded rectangles (`rx="2"`)

### 10.2 MicButton Component
Create `components/MicButton.tsx`:
- Props: `state: 'idle' | 'recording' | 'processing'`, `onPress: () => void`, `onLongPress?: () => void`
- Idle: `#60A5FA` background, white mic icon (lucide)
- Recording: `#EF4444` background, white stop icon + outer pulsing ring animation
- Processing: white background with `ActivityIndicator` in `#60A5FA`
- Size: 80px diameter
- Shadow/elevation for depth

### 10.3 ProviderBadge Component
Create `components/ProviderBadge.tsx`:
- Props: `provider: string`, `durationMs?: number`, `warnings?: string[]`
- Small pill: `#EFF6FF` background, `#3B82F6` text
- Shows: "{provider} · {durationMs}ms"
- If warnings exist, show orange ⚠ icon — tap to expand warning list

### 10.4 TranscriptionCard (History item)
Create `components/TranscriptionCard.tsx`:
- Props: `session: DictationSession`, `onPress`, `onStar`, `onDelete`
- Use template's `Card` component as base
- Title in bold, preview text in secondary color
- Bottom row: date, provider badge, star icon
- Subtle left border in accent color

### 10.5 ApiKeyInput Component
Create `components/ApiKeyInput.tsx`:
- Props: `label`, `value`, `onChangeText`, `onTest`, `testState: 'idle' | 'testing' | 'pass' | 'fail'`
- Masked input (password type) with show/hide toggle
- Inline test button with loading state
- Status indicator: green ✓ or red ✗ after test

---

## 11. Error Handling Rules (Enforce Throughout)

1. **Every API call must be wrapped in try/catch**
2. **Never show raw error codes to users** — translate to friendly messages using the `PROVIDER_ERROR_MESSAGES` map
3. **Transcription errors must show**:
   - Which providers were tried (e.g. "Tried: Groq, Deepgram")
   - The final error message
   - A "Retry" button
   - A "Check Settings" button that navigates to the API settings screen
4. **Network errors**: check `@react-native-community/netinfo` before transcribing; if offline show specific offline message
5. **Permission errors**: show system settings deep-link button
6. **Empty transcription**: if result text is empty string, show "No speech detected — please try again" instead of saving a blank session

---

## 12. Styling & Animation Guidelines

### Colors (from `lib/theme.ts`)
```typescript
export const ACCENT         = '#60A5FA'    // blue-400
export const ACCENT_DIM     = 'rgba(96,165,250,0.12)'
export const ACCENT_BORDER  = 'rgba(96,165,250,0.30)'
export const ACCENT_GLOW    = 'rgba(96,165,250,0.20)'
export const ACCENT_LIGHT   = '#DBEAFE'    // blue-100
export const BACKGROUND     = '#FFFFFF'
export const SURFACE        = '#F8FAFC'
export const SURFACE_2      = '#EFF6FF'    // blue-50
export const TEXT_PRIMARY   = '#1E293B'
export const TEXT_SECONDARY = '#64748B'
export const ERROR          = '#EF4444'
export const SUCCESS        = '#22C55E'
export const WARNING        = '#F59E0B'
```

### Animation Principles
- Use `react-native-reanimated` (already in template) for all animations — not `Animated` API
- Recording pulse: 1.5s cycle, ease-in-out
- Screen transitions: use Expo Router's default fade — do not override
- Waveform: 60fps, staggered bar animations with 50ms offset between bars
- Button press: `withSpring` scale to 0.95 on press, back to 1.0 on release
- Result appearance: `withTiming` opacity 0→1 over 300ms + translateY 20→0

### Tailwind Classes (match theme)
```
bg-blue-400       → ACCENT
bg-blue-50        → SURFACE_2
text-slate-800    → TEXT_PRIMARY
text-slate-500    → TEXT_SECONDARY
border-blue-200   → ACCENT_BORDER (approx)
```

---

## 13. Offline Behavior

The template includes `OfflineBanner` and `OfflineOverlay`. Extend behavior:

1. When offline + Dictate tab is open: show `OfflineBanner` with message "No internet — on-device transcription only (reduced quality)"
2. When offline and user taps mic: automatically route to `native` provider — skip Groq/Deepgram/OpenAI
3. If native provider is unavailable (Android without speech recognition): show "Transcription requires an internet connection on this device."

---

## 14. i18n Setup

The template includes i18next. Create `lib/i18n/locales/en.json` with all app strings:
```json
{
  "dictate": {
    "placeholder": "Tap the mic and start speaking…",
    "recording": "Recording…",
    "processing": "Transcribing…",
    "copy": "Copy",
    "share": "Share",
    "save": "Save",
    "clear": "Clear",
    "noSpeechDetected": "No speech detected — please try again.",
    "transcriptionFailed": "Transcription failed. {{providers}} were tried.",
    "retry": "Retry",
    "checkSettings": "Check Settings"
  },
  "history": {
    "title": "History",
    "empty": "No dictations yet.",
    "emptySubtitle": "Tap the mic to start.",
    "search": "Search dictations…",
    "filterAll": "All",
    "filterStarred": "Starred"
  },
  "settings": {
    "apiKeys": "API Keys",
    "groqKey": "Groq API Key",
    "deepgramKey": "Deepgram API Key",
    "openaiKey": "OpenAI API Key",
    "testKey": "Test",
    "keyValid": "API key is working ✓",
    "keyInvalid": "API key is invalid or inactive.",
    "primaryProvider": "Primary Provider",
    "aiCleanup": "AI Grammar Cleanup",
    "voiceCommands": "Voice Commands",
    "autoSave": "Auto-save to History",
    "defaultLanguage": "Default Language"
  }
}
```

---

## 15. CI/CD

Keep the existing `.github/workflows/ci.yml`. Add a typecheck step for new files. No changes needed to the workflow — it runs `npm run typecheck` and `npm test` on every push.

Add tests in `__tests__/`:
- `transcription.test.ts` — test `parseVoiceCommands()` with known inputs/outputs
- `aiCleanup.test.ts` — test that cleanup returns raw text when API key is empty (no network calls in tests)
- `utils.test.ts` — extend existing 14 tests with any new utility functions

---

## 16. Pre-Launch Checklist

### Functional
- [ ] Groq transcription works end-to-end with a real API key
- [ ] Fallback to Deepgram when Groq key is missing/invalid
- [ ] Fallback to OpenAI when Deepgram key is missing/invalid
- [ ] Fallback to native when all cloud providers fail
- [ ] Error messages are friendly and informative at each fallback step
- [ ] Voice commands (new paragraph, period, etc.) are parsed correctly
- [ ] AI cleanup improves punctuation and grammar
- [ ] Sessions save to Supabase and appear in History
- [ ] Custom vocabulary words are passed to cleanup function
- [ ] Copy to clipboard works on iOS and Android
- [ ] Share sheet opens correctly
- [ ] Offline state detected and on-device fallback triggered

### Settings
- [ ] API keys saved securely in SecureStore
- [ ] Test button shows correct pass/fail state
- [ ] Config persists across app restarts

### Auth
- [ ] OTP email login works
- [ ] Onboarding API key step can be skipped
- [ ] History is scoped to logged-in user via RLS

### Quality
- [ ] `npm run typecheck` — 0 errors
- [ ] `npm test` — all tests passing
- [ ] No Sentry/PostHog/RevenueCat imports anywhere in the codebase

---

## 17. Phase 2 — Keyboard Extension (Future, Native Build Only)

> Do NOT implement in Phase 1. Document here for reference.

A keyboard extension requires:
- **iOS**: Custom Keyboard Extension target in Xcode (`UIInputViewController`) — not supported in Expo Go, requires bare workflow or custom dev client
- **Android**: Input Method Service (`InputMethodService`) — same constraint

Approach for Phase 2:
1. Eject to bare workflow (`npx expo eject`) or use `expo-dev-client`
2. Add `react-native-keyboard-controller` or build a native module
3. The keyboard extension would communicate with the main app via App Groups (iOS shared storage)
4. The dictation hook and transcription logic from Phase 1 can be reused inside the extension

Until Phase 2, expose a **"Share to VoiceFlow"** share extension (simpler, Expo-compatible) that lets users dictate and send text back to any app via the clipboard.

---

## 18. Environment Variables (`.env.local`)

```env
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_anon_key_here

# Transcription APIs — all optional, set at least one
# These are entered by the USER in Settings and stored in SecureStore
# DO NOT commit real API keys here
EXPO_PUBLIC_GROQ_API_KEY=
EXPO_PUBLIC_DEEPGRAM_API_KEY=
EXPO_PUBLIC_OPENAI_API_KEY=

# Removed — do not add:
# EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY
# EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
# EXPO_PUBLIC_SENTRY_DSN
# EXPO_PUBLIC_POSTHOG_KEY
```

> **Security note:** API keys entered in Settings are stored in `expo-secure-store` (device keychain), NOT in env vars or AsyncStorage. The env vars above are only for development convenience and are empty by default.

---

## 19. Getting API Keys (Free Tiers)

| Provider | Free Tier | Sign-up URL |
|---|---|---|
| **Groq** | 14,400 seconds/day of Whisper transcription free | https://console.groq.com |
| **Deepgram** | $200 free credit (~27 hours of audio) | https://console.deepgram.com |
| **OpenAI** | $5 free credit (new accounts) | https://platform.openai.com |

Include these URLs in the Settings screen under each API key field as a "Get free API key →" link.

---

*End of build instructions. This document covers all functional requirements for Phase 1 of VoiceFlow AI.*
