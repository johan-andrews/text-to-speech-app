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

const CATEGORY_COLORS: Record<string, string> = {
  Technical: '#3B82F6',
  Names: '#EC4899',
  Medical: '#EF4444',
  Legal: '#F59E0B',
  Product: '#8B5CF6',
  Acronyms: '#10B981',
}

const CATEGORY_ICONS: Record<string, string> = {
  Technical: 'code-slash-outline',
  Names: 'person-outline',
  Medical: 'medkit-outline',
  Legal: 'shield-checkmark-outline',
  Product: 'cube-outline',
  Acronyms: 'text-outline',
}

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
        <View>
          <Text style={s.title}>Vocabulary</Text>
          <View style={s.headerAccent} />
        </View>
        <Pressable onPress={() => setModalVisible(true)} style={s.addBtn}>
          <Ionicons name="add-circle" size={20} color="#10B981" />
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
        renderItem={({ item }) => {
          const catColor = CATEGORY_COLORS[item.category || 'Technical'] || ACCENT
          const catIcon = CATEGORY_ICONS[item.category || 'Technical'] || 'text-outline'
          return (
            <Card style={s.card}>
              <View style={[s.cardAccent, { backgroundColor: catColor }]} />
              <View style={s.cardContent}>
                <View style={s.cardLeft}>
                  <Text style={s.wordText}>{item.word}</Text>
                  {item.category && (
                    <View style={[s.categoryBadge, { backgroundColor: `${catColor}15` }]}>
                      <Ionicons name={catIcon as any} size={10} color={catColor} style={{ marginRight: 3 }} />
                      <Text style={[s.categoryBadgeText, { color: catColor }]}>{item.category}</Text>
                    </View>
                  )}
                </View>
                <Pressable onPress={() => handleDeleteWord(item.id, item.word)} style={s.deleteBtn} hitSlop={8}>
                  <Ionicons name="trash-outline" size={18} color={ERROR} />
                </Pressable>
              </View>
            </Card>
          )
        }}
        contentContainerStyle={[s.listContent, { paddingBottom: TAB_BAR_CLEARANCE + 20 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#10B981" />
        }
        ListEmptyComponent={
          <View style={s.emptyContainer}>
            <View style={s.emptyIconCircle}>
              <Ionicons name="book-outline" size={36} color="#10B981" />
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
                selectionColor="#10B981"
              />

              <Text style={s.label}>Category</Text>
              <View style={s.categoriesGrid}>
                {CATEGORIES.map((cat) => {
                  const isCatSelected = selectedCategory === cat
                  const catColor = CATEGORY_COLORS[cat]
                  const catIcon = CATEGORY_ICONS[cat]
                  return (
                    <Pressable
                      key={cat}
                      onPress={() => setSelectedCategory(cat)}
                      style={[
                        s.categoryItem,
                        isCatSelected && { borderColor: catColor, backgroundColor: `${catColor}12` },
                      ]}
                    >
                      <Ionicons
                        name={catIcon as any}
                        size={12}
                        color={isCatSelected ? catColor : TEXT_SECONDARY}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={[s.categoryItemText, isCatSelected && { color: catColor, fontWeight: '700' }]}>
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
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    letterSpacing: -0.5,
  },
  headerAccent: {
    height: 3,
    borderRadius: 2,
    marginTop: 8,
    width: 40,
    backgroundColor: '#10B981',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(16,185,129,0.08)',
    gap: 5,
    marginTop: 2,
  },
  addBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#10B981',
  },
  sectionDescription: {
    fontSize: 12.5,
    color: TEXT_SECONDARY,
    lineHeight: 18,
    marginHorizontal: 20,
    marginBottom: 10,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'stretch',
    padding: 0,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
    borderColor: BORDER,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardAccent: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 10.5,
    fontWeight: '600',
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
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    backgroundColor: 'rgba(16,185,129,0.08)',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13.5,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 19,
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
    flexDirection: 'row',
    alignItems: 'center',
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
