import { ExpoSpeechRecognitionModule, ExpoSpeechRecognitionResultEvent, ExpoSpeechRecognitionErrorEvent } from 'expo-speech-recognition'

export async function transcribeWithNative(
  audioUri: string
): Promise<{ text: string; provider: string; durationMs: number }> {
  const start = Date.now()

  const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync()
  if (!granted) throw new Error('NATIVE_PERMISSION: Microphone permission denied.')

  return new Promise((resolve, reject) => {
    const sub = ExpoSpeechRecognitionModule.addListener('result', (event: ExpoSpeechRecognitionResultEvent) => {
      if (event.isFinal) {
        sub.remove()
        resolve({
          text: event.results?.[0]?.transcript ?? '',
          provider: 'On-device (Native)',
          durationMs: Date.now() - start,
        })
      }
    })

    const errSub = ExpoSpeechRecognitionModule.addListener('error', (error: ExpoSpeechRecognitionErrorEvent) => {
      sub.remove()
      errSub.remove()
      reject(new Error(`NATIVE_ERROR: ${error.message ?? 'Unknown speech recognition error'}`))
    })

    try {
      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        audioSource: { uri: audioUri },
        interimResults: false,
      })
    } catch (err) {
      sub.remove()
      errSub.remove()
      reject(err)
    }
  })
}
