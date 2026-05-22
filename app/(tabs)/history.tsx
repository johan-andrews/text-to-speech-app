import React, { useState, useMemo } from 'react'
import { View, StyleSheet, FlatList, TextInput, Pressable, ScrollView, RefreshControl } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'

import { Text } from '@/components/ui/Text'
import { Card } from '@/components/ui/Card'
import TranscriptionCard from '@/components/TranscriptionCard'

import { useDictationHistory, useToggleStar, useDeleteSession, DictationSession } from '@/hooks/useDictationHistory'
import { BACKGROUND, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, ACCENT, BORDER } from '@/lib/theme'
import { TAB_BAR_CLEARANCE } from '@/components/TabBar'

type FilterType = 'all' | 'starred' | 'groq' | 'deepgram' | 'openai' | 'native'

export default function HistoryScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { data: history = [], refetch, isRefetching } = useDictationHistory()
  const { mutate: toggleStar } = useToggleStar()
  const { mutate: deleteSession } = useDeleteSession()

  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')

  const handleToggleStar = (session: DictationSession) => {
    toggleStar({ id: session.id, is_starred: !session.is_starred })
  }

  const handleCardPress = (session: DictationSession) => {
    router.push(`/session/${session.id}`)
  }

  // Filter and search history
  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      // 1. Search Query filter
      const matchesSearch =
        (item.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (item.cleaned_text?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (item.raw_text?.toLowerCase() || '').includes(searchQuery.toLowerCase())

      if (!matchesSearch) return false

      // 2. Tab Filter
      if (activeFilter === 'starred') return item.is_starred
      if (activeFilter === 'groq') return item.provider?.toLowerCase().includes('groq')
      if (activeFilter === 'deepgram') return item.provider?.toLowerCase().includes('deepgram')
      if (activeFilter === 'openai') return item.provider?.toLowerCase().includes('openai')
      if (activeFilter === 'native') return item.provider?.toLowerCase().includes('native')

      return true
    })
  }, [history, searchQuery, activeFilter])

  const renderFilterChip = (filter: FilterType, label: string) => {
    const isActive = activeFilter === filter
    return (
      <Pressable
        key={filter}
        onPress={() => setActiveFilter(filter)}
        style={[
          s.chip,
          isActive && [s.chipActive, { backgroundColor: 'rgba(96,165,250,0.15)', borderColor: ACCENT }],
        ]}
      >
        <Text style={[s.chipText, isActive && { color: ACCENT, fontWeight: '700' }]}>{label}</Text>
      </Pressable>
    )
  }

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>History</Text>
      </View>

      {/* Search Bar */}
      <View style={s.searchContainer}>
        <Ionicons name="search" size={18} color={TEXT_SECONDARY} style={s.searchIcon} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search dictations…"
          placeholderTextColor="#94A3B8"
          style={s.searchInput}
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={TEXT_SECONDARY} />
          </Pressable>
        )}
      </View>

      {/* Filter Row */}
      <View style={s.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterScroll}>
          {renderFilterChip('all', 'All')}
          {renderFilterChip('starred', 'Starred')}
          {renderFilterChip('groq', 'Groq')}
          {renderFilterChip('deepgram', 'Deepgram')}
          {renderFilterChip('openai', 'OpenAI')}
          {renderFilterChip('native', 'Native')}
        </ScrollView>
      </View>

      {/* List */}
      <FlatList
        data={filteredHistory}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TranscriptionCard
            session={item}
            onPress={() => handleCardPress(item)}
            onStar={() => handleToggleStar(item)}
            onDelete={() => deleteSession(item.id)}
          />
        )}
        contentContainerStyle={[s.listContent, { paddingBottom: TAB_BAR_CLEARANCE + 20 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={ACCENT} />
        }
        ListEmptyComponent={
          <View style={s.emptyContainer}>
            <View style={[s.emptyIconCircle, { backgroundColor: 'rgba(96,165,250,0.08)' }]}>
              <Ionicons name="mic-outline" size={32} color={ACCENT} />
            </View>
            <Text style={s.emptyTitle}>No dictations yet</Text>
            <Text style={s.emptySubtitle}>Tap the mic tab to record and transcribe your voice.</Text>
          </View>
        }
      />
    </View>
  )
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  header: {
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    marginHorizontal: 20,
    marginTop: 14,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    color: TEXT_PRIMARY,
    fontSize: 13.5,
  },
  filterContainer: {
    marginVertical: 12,
  },
  filterScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: BORDER,
  },
  chipActive: {
    backgroundColor: 'rgba(96,165,250,0.15)',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
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
})
