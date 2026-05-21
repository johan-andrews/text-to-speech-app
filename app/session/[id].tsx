import React, { useState, useEffect } from 'react'
import { View, StyleSheet, ScrollView, TextInput, Pressable, Alert, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as Clipboard from 'expo-clipboard'
import * as Sharing from 'expo-sharing'
import * as FileSystem from 'expo-file-system/legacy'

import { Text } from '@/components/ui/Text'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { AlertModal } from '@/components/ui/AppModal'

import { useDictationHistory, useToggleStar, useDeleteSession } from '@/hooks/useDictationHistory'
import { supabase } from '@/lib/supabase'
import { BACKGROUND, TEXT_PRIMARY, TEXT_SECONDARY, ACCENT, BORDER, ERROR, SUCCESS, WARNING } from '@/lib/theme'

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const { data: history = [], refetch } = useDictationHistory()
  const { mutateAsync: toggleStar } = useToggleStar()
  const { mutateAsync: deleteSession } = useDeleteSession()

  const session = history.find((s) => s.id === id)

  const [text, setText] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteModalVisible, setDeleteModalVisible] = useState(false)

  // Sync state with session data
  useEffect(() => {
    if (session) {
      setText(session.cleaned_text || session.raw_text || '')
    }
  }, [session])

  if (!session) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    )
  }

  const dateStr = new Date(session.created_at).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const handleCopy = async () => {
    await Clipboard.setStringAsync(text)
    Alert.alert('Copied!', 'Text copied to clipboard.')
  }

  const handleShare = async () => {
    const isAvailable = await Sharing.isAvailableAsync()
    if (!isAvailable) {
      Alert.alert('Error', 'Sharing is not available on this device.')
      return
    }
    const fileUri = `${FileSystem.documentDirectory}transcription_${id}.txt`
    await FileSystem.writeAsStringAsync(fileUri, text)
    await Sharing.shareAsync(fileUri)
  }

  const handleToggleStar = async () => {
    try {
      await toggleStar({ id: session.id, is_starred: !session.is_starred })
      await refetch()
    } catch {
      Alert.alert('Error', 'Failed to toggle star.')
    }
  }

  const handleSaveChanges = async () => {
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('dictation_sessions')
        .update({ cleaned_text: text, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error

      await refetch()
      setIsEditing(false)
      Alert.alert('Saved!', 'Changes saved successfully.')
    } catch (e) {
      Alert.alert('Error', 'Failed to save changes.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleteModalVisible(false)
    try {
      await deleteSession(id)
      router.back()
      Alert.alert('Deleted', 'Dictation deleted successfully.')
    } catch {
      Alert.alert('Error', 'Failed to delete dictation.')
    }
  }

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.headerBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={TEXT_PRIMARY} />
        </Pressable>
        <Text style={s.headerTitle} numberOfLines={1}>
          {session.title || 'Dictation Detail'}
        </Text>
        <Pressable onPress={handleToggleStar} style={s.headerBtn} hitSlop={8}>
          <Ionicons
            name={session.is_starred ? 'star' : 'star-outline'}
            size={22}
            color={session.is_starred ? WARNING : TEXT_PRIMARY}
          />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Meta Stats card */}
        <Card style={s.metaCard}>
          <View style={s.metaRow}>
            <View>
              <Text style={s.metaLabel}>Date</Text>
              <Text style={s.metaValue}>{dateStr}</Text>
            </View>
            <View style={s.badge}>
              <Text style={s.badgeText}>{session.provider || 'On-device'}</Text>
            </View>
          </View>

          <View style={s.metaDivider} />

          <View style={s.statsRow}>
            <View style={s.statBox}>
              <Text style={s.statLabel}>Duration</Text>
              <Text style={s.statValue}>{((session.duration_ms || 0) / 1000).toFixed(1)}s</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statBox}>
              <Text style={s.statLabel}>Language</Text>
              <Text style={s.statValue}>{session.language?.toUpperCase() || 'EN'}</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statBox}>
              <Text style={s.statLabel}>Words</Text>
              <Text style={s.statValue}>{text.split(/\s+/).filter(Boolean).length}</Text>
            </View>
          </View>
        </Card>

        {/* Text Area */}
        <View style={s.textContainer}>
          <View style={s.textHeader}>
            <Text style={s.sectionLabel}>Transcription</Text>
            <Pressable
              onPress={() => (isEditing ? handleSaveChanges() : setIsEditing(true))}
              disabled={isSaving}
              style={[s.editBtn, { backgroundColor: isEditing ? 'rgba(34,197,94,0.1)' : 'rgba(96,165,250,0.1)' }]}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={SUCCESS} />
              ) : (
                <>
                  <Ionicons name={isEditing ? 'checkmark' : 'create-outline'} size={14} color={isEditing ? SUCCESS : ACCENT} />
                  <Text style={[s.editBtnText, { color: isEditing ? SUCCESS : ACCENT }]}>
                    {isEditing ? 'Save' : 'Edit'}
                  </Text>
                </>
              )}
            </Pressable>
          </View>

          <Card style={s.textCard}>
            {isEditing ? (
              <TextInput
                value={text}
                onChangeText={setText}
                multiline
                style={s.textInput}
                autoFocus
              />
            ) : (
              <Text style={s.transcriptionText}>{text}</Text>
            )}
          </Card>
        </View>

        {/* Action Buttons */}
        <View style={s.actionGrid}>
          <Pressable onPress={handleCopy} style={s.actionItem}>
            <Ionicons name="copy-outline" size={20} color={ACCENT} />
            <Text style={s.actionText}>Copy Text</Text>
          </Pressable>

          <Pressable onPress={handleShare} style={s.actionItem}>
            <Ionicons name="share-social-outline" size={20} color={ACCENT} />
            <Text style={s.actionText}>Share</Text>
          </Pressable>

          <Pressable onPress={() => setDeleteModalVisible(true)} style={[s.actionItem, s.actionDelete]}>
            <Ionicons name="trash-outline" size={20} color={ERROR} />
            <Text style={[s.actionText, { color: ERROR }]}>Delete Log</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <AlertModal
        visible={deleteModalVisible}
        title="Delete Dictation"
        message="This will permanently delete this dictation log from your history. This action cannot be undone."
        buttons={[
          { text: 'Cancel', style: 'cancel', onPress: () => setDeleteModalVisible(false) },
          { text: 'Delete', style: 'destructive', onPress: handleDelete },
        ]}
        onDismiss={() => setDeleteModalVisible(false)}
      />
    </View>
  )
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BACKGROUND,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: BORDER,
  },
  headerBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 40,
  },
  metaCard: {
    padding: 14,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderColor: BORDER,
    borderWidth: 1,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  metaLabel: {
    fontSize: 11,
    color: TEXT_SECONDARY,
    fontWeight: '600',
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 13.5,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  badge: {
    backgroundColor: 'rgba(96,165,250,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: ACCENT,
  },
  metaDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: BORDER,
    marginVertical: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statBox: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: TEXT_SECONDARY,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
    color: TEXT_PRIMARY,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 24,
    backgroundColor: BORDER,
  },
  textContainer: {
    marginBottom: 20,
  },
  textHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: TEXT_SECONDARY,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  editBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    marginLeft: 4,
  },
  textCard: {
    minHeight: 180,
    backgroundColor: '#F8FAFC',
    borderColor: BORDER,
    borderWidth: 1,
    padding: 14,
  },
  transcriptionText: {
    fontSize: 14,
    color: TEXT_PRIMARY,
    lineHeight: 22,
  },
  textInput: {
    fontSize: 14,
    color: TEXT_PRIMARY,
    lineHeight: 22,
    flex: 1,
    textAlignVertical: 'top',
    padding: 0,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionItem: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingVertical: 12,
    gap: 8,
  },
  actionDelete: {
    borderColor: 'rgba(239,68,68,0.2)',
  },
  actionText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: ACCENT,
  },
})
