import React, { useState, useEffect } from 'react'
import { View, StyleSheet, FlatList, Pressable, Modal, TextInput, ActivityIndicator, Alert, RefreshControl } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'

import { Text } from '@/components/ui/Text'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

import { useCustomVocabulary, useAddVocabWord, useDeleteVocabWord } from '@/hooks/useCustomVocabulary'
import { supabase } from '@/lib/supabase'
import { BACKGROUND, TEXT_PRIMARY, TEXT_SECONDARY, ACCENT, BORDER, ERROR, SURFACE } from '@/lib/theme'
import { TAB_BAR_CLEARANCE } from '@/components/TabBar'

const CATEGORIES = ['Technical', 'Names', 'Medical', 'Legal', 'Product', 'Acronyms']

export default function VocabularyScreen() {
  const insets = useSafeAreaInsets()
  
  const { data: vocabList = [], refetch, isRefetching } = useCustomVocabulary()
  const { mutateAsync: addWord, isPending: isAdding } = useAddVocabWord()
  const { mutateAsync: deleteWord } = useDeleteVocabWord()

  const [userId, setUserId] = useState<string | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [newWord, setNewWord] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Technical')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  const handleAddWord = async () => {
    if (!newWord.trim()) return
    if (!userId) {
      Alert.alert('Authentication Error', 'You must be signed in to add words to custom vocabulary.')
      return
    }

    try {
      await addWord({
        word: newWord.trim(),
        category: selectedCategory,
        user_id: userId,
      })
      setNewWord('')
      setModalVisible(false)
      Alert.alert('Added!', `"${newWord.trim()}" added to your custom vocabulary.`)
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'Unknown database error'
      Alert.alert('Error', `Failed to add custom vocabulary word. Details: ${errMsg}`)
    }
  }

  const handleDeleteWord = async (id: string, word: string) => {
    Alert.alert(
      'Delete Word',
      `Are you sure you want to delete "${word}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteWord(id)
            } catch {
              Alert.alert('Error', 'Failed to delete word.')
            }
          },
        },
      ]
    )
  }

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Vocabulary</Text>
        <Pressable onPress={() => setModalVisible(true)} style={[s.addBtn, { backgroundColor: 'rgba(96,165,250,0.1)' }]}>
          <Ionicons name="add" size={20} color={ACCENT} />
          <Text style={s.addBtnText}>Add Word</Text>
        </Pressable>
      </View>

      <Text style={s.sectionDescription}>
        Custom words are passed to the AI models to guarantee correct spelling of names, acronyms, technical terms, and jargon.
      </Text>

      {/* Vocabulary List */}
      <FlatList
        data={vocabList}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card style={s.card}>
            <View style={s.cardLeft}>
              <Text style={s.wordText}>{item.word}</Text>
              {item.category && (
                <View style={s.categoryBadge}>
                  <Text style={s.categoryBadgeText}>{item.category}</Text>
                </View>
              )}
            </View>
            <Pressable onPress={() => handleDeleteWord(item.id, item.word)} style={s.deleteBtn} hitSlop={8}>
              <Ionicons name="trash-outline" size={18} color={ERROR} />
            </Pressable>
          </Card>
        )}
        contentContainerStyle={[s.listContent, { paddingBottom: TAB_BAR_CLEARANCE + 20 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={ACCENT} />
        }
        ListEmptyComponent={
          <View style={s.emptyContainer}>
            <View style={[s.emptyIconCircle, { backgroundColor: 'rgba(96,165,250,0.08)' }]}>
              <Ionicons name="book-outline" size={32} color={ACCENT} />
            </View>
            <Text style={s.emptyTitle}>Custom vocabulary is empty</Text>
            <Text style={s.emptySubtitle}>Add technical terms, special names, or phrases you use often.</Text>
          </View>
        }
      />

      {/* Add Word Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Add Word</Text>
              <Pressable onPress={() => setModalVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={20} color={TEXT_PRIMARY} />
              </Pressable>
            </View>

            <View style={s.modalBody}>
              <Text style={s.label}>Word / Phrase</Text>
              <TextInput
                value={newWord}
                onChangeText={setNewWord}
                placeholder="e.g. Supabase, Deepgram, ChatGPT"
                placeholderTextColor="#94A3B8"
                style={s.input}
                autoFocus
              />

              <Text style={s.label}>Category</Text>
              <View style={s.categoriesGrid}>
                {CATEGORIES.map((cat) => {
                  const isCatSelected = selectedCategory === cat
                  return (
                    <Pressable
                      key={cat}
                      onPress={() => setSelectedCategory(cat)}
                      style={[
                        s.categoryItem,
                        isCatSelected && [s.categoryItemSelected, { borderColor: ACCENT, backgroundColor: 'rgba(96,165,250,0.1)' }],
                      ]}
                    >
                      <Text style={[s.categoryItemText, isCatSelected && { color: ACCENT, fontWeight: '700' }]}>
                        {cat}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </View>

            <View style={s.modalFooter}>
              <Button
                variant="secondary"
                label="Cancel"
                onPress={() => setModalVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                variant="primary"
                label={isAdding ? "Adding..." : "Add Word"}
                onPress={handleAddWord}
                disabled={!newWord.trim() || isAdding}
                style={{ flex: 1 }}
              />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: BORDER,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    letterSpacing: -0.5,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: ACCENT,
    marginLeft: 4,
  },
  sectionDescription: {
    fontSize: 12.5,
    color: TEXT_SECONDARY,
    lineHeight: 18,
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 8,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    marginBottom: 10,
    backgroundColor: SURFACE,
    borderColor: BORDER,
    borderWidth: 1,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
    gap: 8,
  },
  wordText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  categoryBadge: {
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  deleteBtn: {
    padding: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 18,
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
    maxWidth: 340,
    padding: 16,
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
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: TEXT_PRIMARY,
  },
  modalBody: {
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginTop: 4,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    height: 42,
    color: TEXT_PRIMARY,
    fontSize: 13.5,
    marginBottom: 8,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  categoryItem: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#F8FAFC',
  },
  categoryItemSelected: {
    backgroundColor: 'rgba(96,165,250,0.1)',
  },
  categoryItemText: {
    fontSize: 11,
    color: TEXT_SECONDARY,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
})
