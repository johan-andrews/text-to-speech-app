import * as FileSystem from 'expo-file-system/legacy'
import { Platform } from 'react-native'

export async function transcribeWithDeepgram(
  audioUri: string,
  apiKey: string,
  language = 'en'
): Promise<{ text: string; provider: string; durationMs: number }> {
  const start = Date.now()

  if (!apiKey) throw new Error('DEEPGRAM_KEY_MISSING: No Deepgram API key configured.')

  let binaryData: Uint8Array | Blob;
  if (Platform.OS === 'web') {
    const res = await fetch(audioUri);
    binaryData = await res.blob();
  } else {
    const audioData = await FileSystem.readAsStringAsync(audioUri, {
      encoding: 'base64',
    })
    binaryData = Uint8Array.from(atob(audioData), c => c.charCodeAt(0))
  }

  const response = await fetch(
    `https://api.deepgram.com/v1/listen?model=nova-2&language=${language}&punctuate=true&smart_format=true`,
    {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': Platform.OS === 'web' ? 'audio/webm' : 'audio/m4a',
      },
      body: binaryData as any,
    }
  )

  if (response.status === 401) throw new Error('DEEPGRAM_AUTH: Invalid Deepgram API key.')
  if (response.status === 429) throw new Error('DEEPGRAM_RATE: Deepgram rate limit exceeded.')
  if (!response.ok) throw new Error(`DEEPGRAM_ERROR: ${response.status}`)

  const data = await response.json()
  const text = data?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? ''
  return { text, provider: 'Deepgram Nova-2', durationMs: Date.now() - start }
}
