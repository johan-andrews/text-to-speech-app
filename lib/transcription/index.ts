import { TranscriptionConfig, TranscriptionProvider, PROVIDER_ERROR_MESSAGES, GENERIC_TRANSCRIPTION_ERROR } from './config'
import { transcribeWithGroq } from './groq'
import { transcribeWithDeepgram } from './deepgram'
import { transcribeWithOpenAI } from './openai'
import { transcribeWithNative } from './native'

export interface TranscriptionOutput {
  text: string
  provider: string
  durationMs: number
  attemptedProviders: string[]
  warnings: string[]
}

function isProviderConfigured(provider: TranscriptionProvider, config: TranscriptionConfig): boolean {
  switch (provider) {
    case 'groq': {
      const key = (config.groqApiKey ?? '').trim()
      return key.length > 0 && !key.includes('YOUR_') && !key.includes('API_KEY')
    }
    case 'deepgram': {
      const key = (config.deepgramApiKey ?? '').trim()
      return key.length > 0 && !key.includes('YOUR_') && !key.includes('API_KEY')
    }
    case 'openai': {
      const key = (config.openaiApiKey ?? '').trim()
      return key.length > 0 && !key.includes('YOUR_') && !key.includes('API_KEY')
    }
    case 'native':
      return true
    default:
      return false
  }
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
      return transcribeWithDeepgram(audioUri, config.deepgramApiKey ?? '', language)
    case 'openai':
      return transcribeWithOpenAI(audioUri, config.openaiApiKey ?? '', language)
    case 'native':
      return transcribeWithNative(audioUri)
    default:
      throw new Error(`Unknown provider: ${provider}`)
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
    // Only attempt if provider is properly configured
    if (!isProviderConfigured(provider, config)) {
      continue
    }

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
