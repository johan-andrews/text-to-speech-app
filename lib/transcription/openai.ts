import { Platform } from 'react-native'

export async function transcribeWithOpenAI(
  audioUri: string,
  apiKey: string,
  language = 'en'
): Promise<{ text: string; provider: string; durationMs: number }> {
  const start = Date.now()

  if (!apiKey) throw new Error('OPENAI_KEY_MISSING: No OpenAI API key configured.')

  let fileObj: any;
  if (Platform.OS === 'web') {
    const res = await fetch(audioUri);
    fileObj = await res.blob();
  } else {
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
