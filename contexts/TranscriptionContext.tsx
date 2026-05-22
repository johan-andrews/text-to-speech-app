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
        setState(s => ({
          ...s,
          config: {
            ...DEFAULT_CONFIG,
            ...parsed,
            // Enforce that API keys are always taken from the code configuration, not from stored settings
            groqApiKey: DEFAULT_CONFIG.groqApiKey,
            deepgramApiKey: DEFAULT_CONFIG.deepgramApiKey,
            openaiApiKey: DEFAULT_CONFIG.openaiApiKey,
          }
        }))
      } else {
        setState(s => ({
          ...s,
          config: DEFAULT_CONFIG,
        }))
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
      const raw = await transcribeAudio(audioUri, state.config, state.config.language || 'en')

      // Step 2: Parse voice commands
      const processedText = state.config.voiceCommands !== false
        ? parseVoiceCommands(raw.text).processedText
        : raw.text

      // Step 3: AI cleanup
      let cleanedText = processedText
      if (state.config.aiCleanup !== false) {
        cleanedText = await cleanTranscription(
          processedText,
          state.config.groqApiKey ?? '',
          { 
            customVocabulary: customVocab, 
            applyCommands: state.config.voiceCommands !== false,
            mode: state.config.mode || 'transcriber'
          }
        )
      }

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
