import * as FileSystem from 'expo-file-system/legacy'
import { Platform } from 'react-native'

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

  let fileObj: any;
  if (Platform.OS === 'web') {
    const res = await fetch(audioUri);
    fileObj = await res.blob();
  } else {
    // Read audio file info
    const fileInfo = await FileSystem.getInfoAsync(audioUri)
    if (!fileInfo.exists) throw new Error('AUDIO_FILE_MISSING: Audio file not found.')
    fileObj = {
      uri: audioUri,
      type: 'audio/m4a',
      name: 'recording.m4a',
    } as unknown as Blob;
  }

  const formData = new FormData()
  if (Platform.OS === 'web') {
    formData.append('file', fileObj, 'recording.webm')
  } else {
    formData.append('file', fileObj)
  }
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
