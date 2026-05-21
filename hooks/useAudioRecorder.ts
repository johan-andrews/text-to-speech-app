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
