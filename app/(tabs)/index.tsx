import React, { useState, useEffect, useRef } from 'react'
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, Platform, Modal, Share, TextInput as RNTextInput } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as Clipboard from 'expo-clipboard'
import * as Sharing from 'expo-sharing'
import * as FileSystem from 'expo-file-system/legacy'
import Animated, { FadeInUp, SlideInDown, SlideOutUp } from 'react-native-reanimated'

import { Text } from '@/components/ui/Text'
import { Card } from '@/components/ui/Card'
import WaveformVisualizer from '@/components/WaveformVisualizer'
import MicButton from '@/components/MicButton'
import ProviderBadge from '@/components/ProviderBadge'

import { useTranscription } from '@/contexts/TranscriptionContext'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'
import { useSaveSession, useUpdateSession } from '@/hooks/useDictationHistory'
import { useCustomVocabulary } from '@/hooks/useCustomVocabulary'
import { useNetworkStatus } from '@/lib/useNetworkStatus'
import { supabase } from '@/lib/supabase'
import { ACCENT, ACCENT_DIM, BACKGROUND, TEXT_PRIMARY, TEXT_SECONDARY, ERROR, SUCCESS, BORDER } from '@/lib/theme'
import { TAB_BAR_CLEARANCE } from '@/components/TabBar'

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'pt', label: 'Português' },
  { code: 'it', label: 'Italiano' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'ru', label: 'Русский' },
  { code: 'zh', label: '中文' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'ar', label: 'العربية' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'pl', label: 'Polski' },
  { code: 'sv', label: 'Svenska' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'id', label: 'Bahasa Indonesia' },
]

export default function DictateScreen() {
  const insets = useSafeAreaInsets()
  const isOnline = useNetworkStatus()
  const { transcribe, config, error: transcriptionError, clearError, updateConfig, isTranscribing } = useTranscription()
  const { state: recordingState, durationMs, startRecording, stopRecording, cancelRecording, isRecording } = useAudioRecorder()
  const { mutateAsync: saveSession, isPending: isSaving } = useSaveSession()
  const { mutateAsync: updateSession } = useUpdateSession()
  const { data: vocabList = [] } = useCustomVocabulary()

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const selectionRef = useRef({ start: 0, end: 0 })
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<RNTextInput>(null)

  const [showLangDropdown, setShowLangDropdown] = useState(false)
  const [accountModalVisible, setAccountModalVisible] = useState(false)
  const [copied, setCopied] = useState(false)
  
  // Local state for last transcribed result metadata (provider, warnings, etc.)
  const [localResult, setLocalResult] = useState<{
    rawText: string
    cleanedText: string
    provider: string
    durationMs: number
    warnings: string[]
  } | null>(null)
  
  // Editable text box value state
  const [transcriptionValue, setTranscriptionValue] = useState('')

  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isSavedLocally, setIsSavedLocally] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id)
        setUserEmail(user.email ?? null)
      }
    })
  }, [])

  // Format recording timer: MM:SS.d
  const formatTimer = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSecs / 60)
    const seconds = totalSecs % 60
    const tenths = Math.floor((ms % 1000) / 100)
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${tenths}`
  }

  const handleTextChange = (text: string) => {
    setTranscriptionValue(text)

    // Reset session ID if the user manually clears the text box to empty
    if (!text.trim()) {
      setActiveSessionId(null)
      return
    }

    // Only update in history if in AI Transcriber mode AND autoSave is active!
    if (config.mode !== 'agent' && config.autoSave !== false && userId) {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
      updateTimeoutRef.current = setTimeout(async () => {
        try {
          if (activeSessionId) {
            await updateSession({
              id: activeSessionId,
              raw_text: text,
              cleaned_text: text,
              title: text.slice(0, 60) || 'Edited Dictation',
            })
          } else {
            // Create new session if none exists
            const title = text.slice(0, 60) || 'New Dictation'
            const newSession = await saveSession({
              user_id: userId,
              raw_text: text,
              cleaned_text: text,
              provider: 'Manual Edit',
              duration_ms: 0,
              language: config.language || 'en',
              title: title,
              is_starred: false,
            })
            if (newSession?.id) {
              setActiveSessionId(newSession.id)
            }
          }
        } catch (e) {
          console.warn('Failed to auto-update manual edit to history:', e)
        }
      }, 800)
    }
  }

  const handleMicPress = async () => {
    if (isRecording) {
      const result = await stopRecording()
      if (result) {
        // Build vocabulary hint array
        const customVocab = vocabList.map((item: any) => item.word)
        
        // Trigger transcription
        // Automatically enforce native provider if offline
        const activeConfig = !isOnline ? { ...config, primary: 'native' as const } : config
        
        const output = await transcribe(result.uri, customVocab)
        if (output && output.text.trim()) {
          setLocalResult({
            rawText: output.text,
            cleanedText: output.text,
            provider: output.provider,
            durationMs: output.durationMs,
            warnings: output.warnings,
          })
          setIsSavedLocally(true)

          // Insert transcribed text segment at the current cursor selection!
          const { start, end } = selectionRef.current
          const before = transcriptionValue.substring(0, start)
          const after = transcriptionValue.substring(end)
          const spaceBefore = before && !before.endsWith('\n') && !before.endsWith(' ') ? ' ' : ''
          const spaceAfter = after && !after.startsWith('\n') && !after.startsWith(' ') ? ' ' : ''
          const insertedText = `${spaceBefore}${output.text}${spaceAfter}`
          const newText = before + insertedText + after
          setTranscriptionValue(newText)

          // Update cursor to end of new text segment
          const newPos = start + insertedText.length
          selectionRef.current = { start: newPos, end: newPos }

          // Auto-save to history (Only if in AI Transcriber mode AND autoSave is enabled)
          if (config.mode !== 'agent' && config.autoSave !== false && userId) {
            try {
              if (activeSessionId) {
                // Update existing active session in history!
                await updateSession({
                  id: activeSessionId,
                  raw_text: newText,
                  cleaned_text: newText,
                  title: newText.slice(0, 60) || 'New Dictation',
                })
              } else {
                // Create a brand new session in history!
                const title = newText.slice(0, 60) || 'New Dictation'
                const newSession = await saveSession({
                  user_id: userId,
                  raw_text: newText,
                  cleaned_text: newText,
                  provider: output.provider,
                  duration_ms: output.durationMs,
                  language: config.language || 'en',
                  title: title,
                  is_starred: false,
                })
                if (newSession?.id) {
                  setActiveSessionId(newSession.id)
                }
              }
            } catch (e) {
              console.warn('Failed to save session in history:', e)
            }
          }
        }
      }
    } else {
      clearError()
      startRecording()
      // programmatically focus text input so cursor is visible during recording!
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }

  const handleCopy = async () => {
    if (!transcriptionValue) return
    await Clipboard.setStringAsync(transcriptionValue)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  const handleShare = async () => {
    if (!transcriptionValue) return
    try {
      await Share.share({
        message: transcriptionValue,
      })
    } catch (e) {
      console.warn('Failed to share:', e)
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
    } catch {
      Alert.alert('Error', 'Failed to log out.')
    }
  }

  const handleClear = () => {
    setTranscriptionValue('')
    setLocalResult(null)
    setIsSavedLocally(false)
    setActiveSessionId(null) // Reset session ID for a fresh box!
    clearError()
  }

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Error banner */}
      {transcriptionError && (
        <View style={s.errorBanner}>
          <Ionicons name="alert-circle" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <View style={{ flex: 1 }}>
            <Text style={s.errorTitle}>Transcription Failed</Text>
            <Text style={s.errorSub}>{transcriptionError}</Text>
          </View>
          <Pressable onPress={clearError} style={s.closeErrorBtn}>
            <Ionicons name="close" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      )}

      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.brandTitle}>VoiceFlow AI</Text>
          <Text style={s.brandTagline}>Speak. Think. Create.</Text>
          <View style={[s.headerAccent, config.mode === 'agent' && { backgroundColor: '#8B5CF6' }]} />
        </View>

        <View style={s.headerRight}>
          {/* Language selector */}
          <View style={s.langWrapper}>
            <Pressable onPress={() => setShowLangDropdown(!showLangDropdown)} style={s.langSelector}>
              <Text style={s.langLabel}>
                {LANGUAGES.find(l => l.code === (config.language || 'en'))?.label}
              </Text>
              <Ionicons name="chevron-down" size={14} color={TEXT_SECONDARY} />
            </Pressable>
            
            {showLangDropdown && (
              <View style={s.langDropdown}>
                {LANGUAGES.map((l) => (
                  <Pressable
                    key={l.code}
                    onPress={() => {
                      updateConfig({ language: l.code })
                      setShowLangDropdown(false)
                    }}
                    style={s.langItem}
                  >
                    <Text style={[s.langItemText, (config.language || 'en') === l.code && s.activeLangText]}>
                      {l.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* Account Icon */}
          <Pressable onPress={() => setAccountModalVisible(true)} style={s.accountIconBtn}>
            <Ionicons name="person-circle-outline" size={28} color={config.mode === 'agent' ? '#8B5CF6' : ACCENT} />
          </Pressable>
        </View>
      </View>

      {/* Main Single Frame View */}
      <View style={[
        s.mainFrame, 
        { paddingBottom: TAB_BAR_CLEARANCE + 12 },
        Platform.OS === 'web' ? ({ overflowY: 'auto' } as any) : null
      ]}>
        {/* Offline notice */}
        {!isOnline && (
          <Card style={s.offlineCard}>
            <Ionicons name="cloud-offline-outline" size={16} color="#78350F" />
            <Text style={s.offlineText}>
              No internet connection. On-device transcription fallback active.
            </Text>
          </Card>
        )}

        {/* Mode Switch Toolbar */}
        <View style={s.modeToolbar}>
          <Pressable
            onPress={() => updateConfig({ mode: 'transcriber' })}
            style={[s.modeBtn, (config.mode || 'transcriber') === 'transcriber' && s.modeBtnActive]}
          >
            <Ionicons 
              name="document-text-outline" 
              size={15} 
              color={(config.mode || 'transcriber') === 'transcriber' ? '#FFFFFF' : '#64748B'} 
            />
            <Text style={[s.modeBtnText, (config.mode || 'transcriber') === 'transcriber' && s.modeBtnTextActive]}>
              AI Transcriber
            </Text>
          </Pressable>

          <Pressable
            onPress={() => updateConfig({ mode: 'agent' })}
            style={[s.modeBtn, config.mode === 'agent' && s.modeBtnActiveAgent]}
          >
            <Ionicons 
              name="sparkles-outline" 
              size={15} 
              color={config.mode === 'agent' ? '#FFFFFF' : '#64748B'} 
            />
            <Text style={[s.modeBtnText, config.mode === 'agent' && s.modeBtnTextActive]}>
              AI Agent
            </Text>
          </Pressable>
        </View>

        {/* Mic Button Row (Static, Flow layout below tools!) */}
        <View style={s.micButtonRowStatic}>
          <MicButton
            state={isRecording ? 'recording' : recordingState === 'stopping' || isTranscribing ? 'processing' : 'idle'}
            onPress={handleMicPress}
            color={config.mode === 'agent' ? '#8B5CF6' : undefined}
          />
        </View>

        {/* Waveform / Visualizer */}
        <View style={s.visualizerSection}>
          <WaveformVisualizer isRecording={isRecording} color={config.mode === 'agent' ? '#8B5CF6' : undefined} />
          {isRecording && (
            <Text style={[s.timerText, config.mode === 'agent' && { color: '#8B5CF6' }]}>{formatTimer(durationMs)}</Text>
          )}
        </View>

        {/* Transcription preview container (Text Box) */}
        <Card style={[
          s.previewCard,
          config.mode === 'agent' && s.previewCardAgent
        ]}>
          <ScrollView nestedScrollEnabled style={s.previewScroll} showsVerticalScrollIndicator={true}>
            {isTranscribing ? (
              <View style={s.loadingContainer}>
                <ActivityIndicator size="small" color={config.mode === 'agent' ? '#8B5CF6' : ACCENT} />
                <Text style={s.loadingText}>
                  {config.mode === 'agent' ? "AI Agent is thinking..." : "Transcribing audio..."}
                </Text>
              </View>
            ) : recordingState === 'requesting' || recordingState === 'stopping' ? (
              <View style={s.loadingContainer}>
                <ActivityIndicator size="small" color={config.mode === 'agent' ? '#8B5CF6' : ACCENT} />
                <Text style={s.loadingText}>Initializing recording...</Text>
              </View>
            ) : (
              <RNTextInput
                ref={inputRef}
                multiline
                value={transcriptionValue}
                onChangeText={handleTextChange}
                onSelectionChange={(e) => {
                  selectionRef.current = e.nativeEvent.selection
                }}
                placeholder={config.mode === 'agent' 
                  ? "Tap the microphone and ask me anything..." 
                  : "Tap the microphone and start speaking…"}
                placeholderTextColor="#94A3B8"
                style={s.transcriptionInput}
                editable={!isTranscribing}
                selectionColor={config.mode === 'agent' ? '#8B5CF6' : ACCENT}
              />
            )}
          </ScrollView>
        </Card>

        {/* Provider badge */}
        {localResult && !isTranscribing && recordingState !== 'recording' && (
          <ProviderBadge
            provider={localResult.provider}
            durationMs={localResult.durationMs}
            warnings={localResult.warnings}
          />
        )}

        {/* Action Row */}
        {transcriptionValue.trim() !== '' && !isTranscribing && recordingState !== 'recording' && (
          <View style={s.actionRow}>
            <Pressable onPress={handleCopy} style={s.actionBtn}>
              <Ionicons 
                name={copied ? "checkmark-sharp" : "copy-outline"} 
                size={20} 
                color={copied ? "#16A34A" : config.mode === 'agent' ? '#8B5CF6' : '#1D4ED8'} 
              />
              <Text style={[s.actionBtnText, { color: copied ? '#16A34A' : config.mode === 'agent' ? '#8B5CF6' : '#1D4ED8' }]}>
                {copied ? "Copied!" : "Copy"}
              </Text>
            </Pressable>

            <Pressable onPress={handleShare} style={s.actionBtn}>
              <Ionicons name="share-social-outline" size={20} color={config.mode === 'agent' ? '#8B5CF6' : '#1D4ED8'} />
              <Text style={[s.actionBtnText, { color: config.mode === 'agent' ? '#8B5CF6' : '#1D4ED8' }]}>Share</Text>
            </Pressable>

            <Pressable onPress={handleClear} style={s.actionBtn}>
              <Ionicons name="trash-outline" size={20} color="#DC2626" />
              <Text style={[s.actionBtnText, { color: '#DC2626' }]}>Clear</Text>
            </Pressable>
          </View>
        )}

      </View>

      {/* Account Modal */}
      <Modal
        visible={accountModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAccountModalVisible(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Current Account</Text>
              <Pressable onPress={() => setAccountModalVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={20} color={TEXT_PRIMARY} />
              </Pressable>
            </View>

            <View style={s.modalBody}>
              <Text style={s.accountLabel}>Signed in as:</Text>
              <Text style={s.accountEmail}>{userEmail || 'Not signed in'}</Text>
            </View>

            <View style={s.modalFooter}>
              <Pressable
                onPress={() => {
                  setAccountModalVisible(false)
                  handleLogout()
                }}
                style={s.logoutModalBtn}
              >
                <Text style={s.logoutModalBtnText}>Logout</Text>
              </Pressable>
              <Pressable
                onPress={() => setAccountModalVisible(false)}
                style={s.dismissModalBtn}
              >
                <Text style={s.dismissModalBtnText}>Dismiss</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  errorBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: ERROR,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    zIndex: 99,
  },
  errorTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  errorSub: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    marginTop: 2,
  },
  closeErrorBtn: {
    padding: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
  },
  headerAccent: {
    height: 3,
    borderRadius: 2,
    marginTop: 6,
    width: 40,
    backgroundColor: '#3B82F6',
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    letterSpacing: -0.4,
  },
  brandTagline: {
    fontSize: 11,
    color: TEXT_SECONDARY,
    marginTop: 1,
  },
  langWrapper: {
    position: 'relative',
    zIndex: 10,
  },
  langSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  langLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginRight: 4,
  },
  langDropdown: {
    position: 'absolute',
    top: 36,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    width: 110,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  langItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
  },
  langItemText: {
    fontSize: 12.5,
    color: TEXT_SECONDARY,
  },
  activeLangText: {
    color: ACCENT,
    fontWeight: '700',
  },
  mainFrame: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  offlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 1,
    padding: 10,
    borderRadius: 10,
    marginBottom: 16,
  },
  offlineText: {
    fontSize: 11.5,
    color: '#78350F',
    marginLeft: 6,
    flex: 1,
  },
  visualizerSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
  },
  timerText: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    color: ERROR,
    marginTop: -10,
  },
  previewCard: {
    flex: 1,
    minHeight: 150,
    backgroundColor: '#F8FAFC',
    borderColor: BORDER,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  previewCardAgent: {
    borderColor: '#C084FC',
    borderWidth: 1.5,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  previewScroll: {
    flex: 1,
  },
  transcriptionInput: {
    flex: 1,
    color: TEXT_PRIMARY,
    fontSize: 14.5,
    lineHeight: 22,
    textAlignVertical: 'top',
    padding: 0,
    margin: 0,
  },
  placeholder: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    marginTop: 40,
    fontStyle: 'italic',
  },
  recordingPlaceholder: {
    fontSize: 14,
    color: '#B91C1C',
    textAlign: 'center',
    marginTop: 40,
    fontWeight: '600',
  },
  transcriptionText: {
    fontSize: 14.5,
    color: TEXT_PRIMARY,
    lineHeight: 22,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  loadingText: {
    fontSize: 13.5,
    color: '#334155',
    marginLeft: 8,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 10,
    marginTop: 16,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  actionBtnDisabled: {
    opacity: 0.6,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1D4ED8',
    marginTop: 4,
  },
  micButtonRowStatic: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  modeToolbar: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    padding: 4,
    marginHorizontal: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  modeBtnActive: {
    backgroundColor: ACCENT,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  modeBtnActiveAgent: {
    backgroundColor: '#8B5CF6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  modeBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
  },
  modeBtnTextActive: {
    color: '#FFFFFF',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accountIconBtn: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 320,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: BORDER,
    paddingBottom: 10,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: TEXT_PRIMARY,
  },
  modalBody: {
    marginBottom: 20,
  },
  accountLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_SECONDARY,
    marginBottom: 4,
  },
  accountEmail: {
    fontSize: 14.5,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
  },
  logoutModalBtn: {
    flex: 1,
    backgroundColor: ERROR,
    borderRadius: 10,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutModalBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  dismissModalBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissModalBtnText: {
    color: TEXT_PRIMARY,
    fontSize: 13.5,
    fontWeight: '700',
  },
})
