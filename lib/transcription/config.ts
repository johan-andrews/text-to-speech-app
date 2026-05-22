export type TranscriptionProvider = 'groq' | 'deepgram' | 'openai' | 'native'

export interface TranscriptionConfig {
  primary: TranscriptionProvider
  fallbackOrder: TranscriptionProvider[]
  groqApiKey?: string
  deepgramApiKey?: string
  openaiApiKey?: string
  language?: string
  aiCleanup?: boolean
  voiceCommands?: boolean
  autoSave?: boolean
  mode?: 'transcriber' | 'agent'
}

export const DEFAULT_CONFIG: TranscriptionConfig = {
  primary: 'groq',
  fallbackOrder: ['deepgram', 'openai', 'native'],
  
  // ─── API Keys configured directly in code ─────────────────────────────────
  // Ready-to-use Groq API Key:
  groqApiKey: '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',
  
  // Slots for remaining transcription providers (Deepgram, OpenAI, etc.):
  deepgramApiKey: 'YOUR_DEEPGRAM_API_KEY_HERE', 
  openaiApiKey: 'YOUR_OPENAI_API_KEY_HERE',
  language: 'en',
  aiCleanup: true,
  voiceCommands: true,
  autoSave: true,
  mode: 'transcriber',
}

// Error messages shown to users — keep these friendly
export const PROVIDER_ERROR_MESSAGES: Record<TranscriptionProvider, string> = {
  groq:     'Groq transcription unavailable. Trying next provider…',
  deepgram: 'Deepgram transcription unavailable. Trying next provider…',
  openai:   'OpenAI transcription unavailable. Trying on-device fallback…',
  native:   'On-device transcription failed. Please check your microphone and try again.',
}

export const GENERIC_TRANSCRIPTION_ERROR =
  'Transcription failed across all providers. Please check your internet connection and verify your API keys in the code configuration.'
